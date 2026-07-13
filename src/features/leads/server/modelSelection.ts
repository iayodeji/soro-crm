const GEMINI_MODEL_MAP: Record<string, string> = {
  "low-latency": "gemini-2.5-flash-lite",
  "high-quality": "gemini-3.5-flash",
  "deep-reasoning": "gemini-3.1-pro-preview",
};

const GROQ_MODEL_MAP: Record<string, string> = {
  "low-latency": "llama-3.1-8b-instant",
  "high-quality": "llama-3.3-70b-versatile",
  "deep-reasoning": "llama-3.1-70b-versatile",
};

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function resolveModel(modelPreset?: string, provider: "gemini" | "groq" = "gemini"): string {
  const map = provider === "groq" ? GROQ_MODEL_MAP : GEMINI_MODEL_MAP;
  const fallback = provider === "groq" ? DEFAULT_GROQ_MODEL : DEFAULT_GEMINI_MODEL;
  return map[modelPreset ?? ""] ?? fallback;
}

export function isGroqModel(model: string): boolean {
  return model.startsWith("llama-");
}
