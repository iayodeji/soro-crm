const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface KeyStatus {
  apiKey: string;
  exhausted: boolean;
  cooldownUntil: number;
}

class SlidingWindowRateLimiter {
  private requests: number[] = [];
  private lock = false;

  constructor(private maxRequests: number, private windowMs: number) {}

  async acquire(): Promise<void> {
    while (this.lock) {
      await new Promise((r) => setTimeout(r, 100));
    }
    this.lock = true;
    try {
      const now = Date.now();
      this.requests = this.requests.filter((t) => now - t < this.windowMs);
      if (this.requests.length >= this.maxRequests) {
        const oldest = this.requests[0];
        const waitMs = this.windowMs - (now - oldest);
        this.lock = false;
        await new Promise((r) => setTimeout(r, Math.max(waitMs, 100)));
        return this.acquire();
      }
      this.requests.push(now);
    } finally {
      this.lock = false;
    }
  }
}

let keys: KeyStatus[] = [];
let rateLimiter: SlidingWindowRateLimiter | null = null;
let initialized = false;

function parseKeys(): string[] {
  const envKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY;
  if (!envKeys) return [];
  return envKeys.split(",").map((k) => k.trim()).filter(Boolean);
}

function ensureInitialized() {
  if (initialized) return;
  const rawKeys = parseKeys();
  if (rawKeys.length === 0) {
    throw new Error("GROQ_API_KEY or GROQ_API_KEYS is not set.");
  }
  keys = rawKeys.map((apiKey) => ({
    apiKey,
    exhausted: false,
    cooldownUntil: 0,
  }));
  rateLimiter = new SlidingWindowRateLimiter(5, 60_000);
  initialized = true;
}

function getNextKey(): KeyStatus | null {
  const now = Date.now();
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key.exhausted || now > key.cooldownUntil) {
      return key;
    }
  }
  return null;
}

function markExhausted(key: KeyStatus) {
  key.exhausted = true;
  key.cooldownUntil = Date.now() + 30_000;
}

export async function callGroq({
  systemInstruction,
  userPrompt,
  model,
  responseFormat = "json_object",
  temperature = 0.2,
}: {
  systemInstruction: string;
  userPrompt: string;
  model?: string;
  responseFormat?: "json_object" | "text";
  temperature?: number;
}): Promise<string> {
  ensureInitialized();

  const selectedModel = model || "llama-3.3-70b-versatile";
  const lastError: { key: string; error: string }[] = [];

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = getNextKey();
    if (!key) {
      throw new Error(`All ${keys.length} Groq keys are rate-limited. Retry later.`);
    }

    if (Date.now() > key.cooldownUntil) {
      key.exhausted = false;
    }

    await rateLimiter!.acquire();

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt },
          ],
          response_format: responseFormat === "json_object" ? { type: "json_object" } : undefined,
          temperature,
        }),
      });

      if (response.status === 429 || response.status === 403) {
        markExhausted(key);
        lastError.push({ key: key.apiKey.slice(0, 8) + "...", error: `HTTP ${response.status}` });
        continue;
      }

      if (response.status === 401) {
        markExhausted(key);
        lastError.push({ key: key.apiKey.slice(0, 8) + "...", error: "Unauthorized" });
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Groq API error ${response.status}: ${text}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq returned no content");
      return content;
    } catch (err: any) {
      lastError.push({ key: key.apiKey.slice(0, 8) + "...", error: err.message });
      markExhausted(key);
      continue;
    }
  }

  const details = lastError.map((e) => `${e.key}: ${e.error}`).join(" | ");
  throw new Error(`All Groq keys failed. ${details}`);
}
