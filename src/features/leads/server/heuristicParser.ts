import type { ParseLeadResult } from "./types";

const DEFAULT_NAME = "Sarah Jenkins";
const DEFAULT_COMPANY = "NextFlow Corp";
const DEFAULT_PHONE = "+1 (555) 382-9901";

function extractEmail(text: string): string | null {
  const match = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,6}/);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/\+?\d[\d\s-]{7,15}\d/);
  return match ? match[0] : null;
}

function extractCompany(text: string): string | null {
  const patterns = [
    /(?:at|from|founder of|ceo of|company is)\s+([A-Z][a-zA-Z0-9_]{1,15}(?:\s+[A-Z][a-zA-Z0-9_]{1,15})?)/i,
    /([A-Z][a-zA-Z0-9_]{1,15}(?:\s+[A-Z][a-zA-Z0-9_]{1,15})?)\s+team/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractName(text: string): string | null {
  const patterns = [
    /(?:name is|talk to|with|this is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:from|at|founder|ceo)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractNameAndCompany(text: string): { name: string | null; company: string | null } {
  let name = extractName(text);
  let company = extractCompany(text);

  if (!name) {
    const words = text.match(/\b([A-Z][a-z]+)\b/g);
    if (words && words.length > 0) {
      name = words[0];
      if (words.length > 1 && !company) company = words[1];
    }
  }
  return { name, company };
}

interface ThesisTemplate {
  keywords: string[];
  thesis: string;
  questions: string[];
}

const THESIS_TEMPLATES: ThesisTemplate[] = [
  {
    keywords: ["analytic", "dashboard", "data"],
    thesis: "Focused on solving dashboard and usage attribution bottlenecks for high-growth consumer platforms.",
    questions: [
      "How do you currently track user actions when they first sign up?",
      "Talk me through the last time a dashboard metric behaved unexpectedly—what did you do?",
      "How are you currently sharing these insight reports with your broader team?",
    ],
  },
  {
    keywords: ["market", "sale", "lead"],
    thesis: "Aims to streamline customer acquisition and high-turnover lead management workflows for young creators.",
    questions: [
      "How did you find your last three paying customers?",
      "What is the most frustrating part of your current lead follow-up flow?",
      "How much time did you spend manually updating contact status columns last week?",
    ],
  },
  {
    keywords: ["mobile", "app", "phone"],
    thesis: "Targeting mobile-first product creators needing lightweight, high-frequency user engagement diagnostics.",
    questions: [
      "How do you currently gather feedback from your mobile app store reviews?",
      "Tell me about the last time a user reported a mobile crash—how did you collect the details?",
      "How do you prioritize push notification triggers without annoying your users?",
    ],
  },
  {
    keywords: ["sheet", "excel", "csv"],
    thesis: "Aims to bridge spreadsheet-based planning overheads with proactive, collaborative accountability boards.",
    questions: [
      "How did you build your very first spreadsheet tracker for this pipeline?",
      "What's the most annoying part of manually copy-pasting customer notes into rows?",
      "Talk me through the last time a team member overwrote or broke a shared sheet formula.",
    ],
  },
];

const DEFAULT_THESIS = "Aims to solve discovery tracking and structured user feedback capture for early-stage B2B workflows.";
const DEFAULT_QUESTIONS = [
  "What are you currently using to organize your customer conversation notes?",
  "Tell me about the last time you received critical feedback from a user—how did you capture it?",
  "What is the biggest operational bottleneck you ran into while scaling your workflow this week?",
];

function resolveThesisAndQuestions(text: string): { thesis: string; questions: string[] } {
  const lower = text.toLowerCase();
  const match = THESIS_TEMPLATES.find((t) => t.keywords.some((k) => lower.includes(k)));
  return match ? { thesis: match.thesis, questions: match.questions } : { thesis: DEFAULT_THESIS, questions: DEFAULT_QUESTIONS };
}

export function buildHeuristicFallback(rawText: string, errorNotice?: string): ParseLeadResult {
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const { name, company } = extractNameAndCompany(rawText);

  const finalName = name || DEFAULT_NAME;
  const finalCompany = company || DEFAULT_COMPANY;
  const { thesis, questions } = resolveThesisAndQuestions(rawText);

  return {
    parsed_lead: {
      name: finalName,
      company_name: finalCompany,
      email: email || `${finalName.toLowerCase().replace(/\s+/g, "")}@${finalCompany.toLowerCase().replace(/\s+/g, "")}.co`,
      phone: phone || DEFAULT_PHONE,
    },
    market_fit_thesis: thesis,
    mom_test_questions: questions,
    isFallback: true,
    errorNotice: errorNotice || "Invalid Gemini API Key",
  };
}
