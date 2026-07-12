import { getGeminiClient } from "./geminiClient";
import { resolveModel } from "./modelSelection";
import { PARSE_LEAD_SYSTEM_INSTRUCTION, PARSE_LEAD_RESPONSE_SCHEMA } from "./parseLeadSchema";
import type { ParseLeadRequestBody, ParseLeadResult } from "./types";

function extractJson(text: string): ParseLeadResult {
  try {
    return JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0].trim());
    throw new Error("Invalid JSON response from model: " + text);
  }
}

export async function parseLeadWithAI(input: ParseLeadRequestBody): Promise<ParseLeadResult> {
  const model = resolveModel(input.modelPreset);
  const ai = getGeminiClient();

  const userPrompt = input.useSearchGrounding
    ? `Please use Google Search to research the person or company mentioned here to find their real name, company, email, or general context, then extract and structure the details following the format. Unstructured text: ${input.rawText}`
    : input.rawText;

  const config: any = {
    systemInstruction: PARSE_LEAD_SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseSchema: PARSE_LEAD_RESPONSE_SCHEMA,
  };
  if (input.useSearchGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({ model, contents: userPrompt, config });

  const text = response.text;
  if (!text) throw new Error("No response text from Gemini API");

  return extractJson(text);
}
