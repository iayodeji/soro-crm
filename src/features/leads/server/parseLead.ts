import { parseLeadWithAI } from "./parseLeadWithAI";
import { buildHeuristicFallback } from "./heuristicParser";
import type { ParseLeadRequestBody, ParseLeadResult } from "./types";

export async function parseLead(input: ParseLeadRequestBody): Promise<ParseLeadResult> {
  try {
    return await parseLeadWithAI(input);
  } catch (error: any) {
    console.error("Gemini API Error, falling back to heuristic parser:", error);
    return buildHeuristicFallback(input.rawText);
  }
}
