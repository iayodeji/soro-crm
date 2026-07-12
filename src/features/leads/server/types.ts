export interface ParseLeadRequestBody {
  rawText: string;
  useSearchGrounding?: boolean;
  modelPreset?: string;
}

export interface ParsedLead {
  name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ParseLeadResult {
  parsed_lead: ParsedLead;
  market_fit_thesis: string;
  mom_test_questions: string[];
  isFallback?: boolean;
  errorNotice?: string;
}
