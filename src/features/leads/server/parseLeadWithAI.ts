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
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    throw new Error("The AI returned an unreadable lead profile.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("The AI returned an incomplete lead profile.");
  const result = parsed as Record<string, unknown>;
  const lead = result.parsed_lead;
  if (!lead || typeof lead !== "object" || Array.isArray(lead) || typeof result.market_fit_thesis !== "string" || !Array.isArray(result.mom_test_questions)) {
    throw new Error("The AI returned an incomplete lead profile.");
  }
  const leadFields = lead as Record<string, unknown>;
  const nullableString = (value: unknown) => typeof value === "string" ? value.trim() || null : value === null ? null : undefined;
  const name = nullableString(leadFields.name);
  const companyName = nullableString(leadFields.company_name);
  const email = nullableString(leadFields.email);
  const phone = nullableString(leadFields.phone);
  const questions = result.mom_test_questions.filter((question): question is string => typeof question === "string" && Boolean(question.trim())).map((question) => question.trim());
  if ([name, companyName, email, phone].some((value) => value === undefined) || !result.market_fit_thesis.trim() || questions.length < 1) {
    throw new Error("The AI returned an incomplete lead profile.");
  }
  return { parsed_lead: { name: name!, company_name: companyName!, email: email!, phone: phone! }, market_fit_thesis: result.market_fit_thesis.trim(), mom_test_questions: questions.slice(0, 3) };
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
