import type { ParseLeadRequestBody } from "./types";

type ValidationResult =
  | { valid: true; data: ParseLeadRequestBody }
  | { valid: false; error: string };

export function isInvalidParseLeadRequest(r: ValidationResult): r is { valid: false; error: string } {
  return !r.valid;
}

export function validateParseLeadRequest(body: any): ValidationResult {
  if (!body || typeof body.rawText !== "string" || body.rawText.trim().length === 0) {
    return { valid: false, error: "rawText parameter is required and must be a string." };
  }
  return {
    valid: true,
    data: {
      rawText: body.rawText,
      useSearchGrounding: Boolean(body.useSearchGrounding),
      modelPreset: typeof body.modelPreset === "string" ? body.modelPreset : undefined,
    },
  };
}
