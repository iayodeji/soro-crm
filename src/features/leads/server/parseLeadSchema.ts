import { Type } from "@google/genai";

export const PARSE_LEAD_SYSTEM_INSTRUCTION = `You are Sorizzy, the core AI intelligence engine for Soro CRM. Your job is to process raw, unstructured text input from a founder and transform it into structured JSON matching our discovery workflow.
When raw lead context or a user profile is passed, perform an immediate lookup simulation and return a JSON object with this exact structure:

{
  "parsed_lead": {
    "name": "String or null",
    "company_name": "String or null",
    "email": "String or null",
    "phone": "String or null"
  },
  "market_fit_thesis": "A concise, 2-sentence breakdown of how this profile relates to Soro's Gen Z target consumer audience.",
  "mom_test_questions": [
    "Non-leading question 1 focusing on past workflow behavior...",
    "Non-leading question 2 focusing on how they currently solve the problem...",
    "Non-leading question 3 focusing on their latest operational bottleneck..."
  ]
}

Constraint: Under no circumstances should the suggested questions pitch Soro or ask speculative future questions ("Would you use...", "How much would you pay for..."). They must strictly adhere to The Mom Test principles (uncover past behaviors, ask about specific events in the past, avoid opinions about the future). Do not include markdown formatting like \`\`\`json wrap blocks in your final API response; output raw JSON only.`;

export const PARSE_LEAD_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    parsed_lead: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Full name of the person" },
        company_name: { type: Type.STRING, description: "Company or startup name" },
        email: { type: Type.STRING, description: "Email address if found, or null" },
        phone: { type: Type.STRING, description: "Phone number if found, or null" },
      },
      required: ["name", "company_name", "email", "phone"],
    },
    market_fit_thesis: { type: Type.STRING, description: "A concise 2-sentence target audience market-fit thesis." },
    mom_test_questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 non-leading discovery questions focusing strictly on past user behavior and bottlenecks.",
    },
  },
  required: ["parsed_lead", "market_fit_thesis", "mom_test_questions"],
};
