import { getGeminiClient } from "./geminiClient";
import { callGroq } from "./groqClient";
import { resolveModel, isGroqModel } from "./modelSelection";
import {
  PARSE_LEAD_SYSTEM_INSTRUCTION,
  PARSE_LEAD_RESPONSE_SCHEMA,
  PARSE_LEAD_SYSTEM_INSTRUCTION_FOR_GROQ,
} from "./parseLeadSchema";
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

async function callGemini(model: string, userPrompt: string, useSearchGrounding: boolean): Promise<string> {
  const ai = getGeminiClient();
  const config: any = {
    systemInstruction: PARSE_LEAD_SYSTEM_INSTRUCTION,
    responseMimeType: "application/json",
    responseSchema: PARSE_LEAD_RESPONSE_SCHEMA,
  };
  if (useSearchGrounding) {
    config.tools = [{ googleSearch: {} }];
  }
  const response = await ai.models.generateContent({ model, contents: userPrompt, config });
  const text = response.text;
  if (!text) throw new Error("No response text from Gemini API");
  return text;
}

async function callGroqWithFallback(model: string, userPrompt: string): Promise<string> {
  const groqModel = resolveModel(model, "groq");
  return callGroq({
    systemInstruction: PARSE_LEAD_SYSTEM_INSTRUCTION_FOR_GROQ,
    userPrompt,
    model: groqModel,
    responseFormat: "json_object",
  });
}

export async function parseLeadWithAI(input: ParseLeadRequestBody): Promise<ParseLeadResult> {
  const model = resolveModel(input.modelPreset);
  const userPrompt = input.useSearchGrounding
    ? `Please use Google Search to research the person or company mentioned here to find their real name, company, email, or general context, then extract and structure the details following the format. Unstructured text: ${input.rawText}`
    : input.rawText;

  try {
    const text = await callGemini(model, userPrompt, input.useSearchGrounding);
    return extractJson(text);
  } catch (geminiError: any) {
    console.warn("Gemini failed, falling back to Groq:", geminiError?.message || geminiError);
    const text = await callGroqWithFallback(model, userPrompt);
    return extractJson(text);
  }
}
