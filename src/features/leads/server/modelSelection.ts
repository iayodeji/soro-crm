const MODEL_MAP: Record<string, string> = {
  "high-quality": "gemini-3.5-flash",
  "deep-reasoning": "gemini-3.1-pro-preview",
};

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

export function resolveModel(modelPreset?: string): string {
  return MODEL_MAP[modelPreset ?? ""] ?? DEFAULT_MODEL;
}
