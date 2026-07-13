import { Type } from "@google/genai";

export const AGENT_SYSTEM_INSTRUCTION = `You are Soro, an operator-first CRM agent for an early-stage founder. Convert the user's natural-language request into a concise response and an ordered plan of safe CRM actions.

Use only lead IDs from the supplied CRM context. Never invent a lead ID or claim that an external action was completed. A draft_email action writes an email but does not send it; send_email should be used only when the user explicitly asks to send. schedule_meeting should be used only when the user explicitly asks to schedule or book. For vague requests, make the most reasonable low-risk plan, explain any assumption in response, and avoid external side effects. Search and lookup questions can be answered directly with no actions.

Available actions: create_lead, update_lead, move_lead, draft_email, send_email, schedule_meeting. Use ISO 8601 timestamps for meetings. Keep outreach useful, short, and aligned with The Mom Test: ask about past behaviour, not hypotheticals. Return JSON only.`;

export const AGENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    response: { type: Type.STRING },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          leadId: { type: Type.STRING },
          name: { type: Type.STRING },
          companyName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          notes: { type: Type.STRING },
          phase: { type: Type.STRING },
          subject: { type: Type.STRING },
          body: { type: Type.STRING },
          title: { type: Type.STRING },
          startAt: { type: Type.STRING },
          endAt: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["type"],
      },
    },
  },
  required: ["response", "actions"],
};

export const AGENT_SYSTEM_INSTRUCTION_FOR_GROQ = `${AGENT_SYSTEM_INSTRUCTION}

You must return a JSON object with exactly this structure:
{
  "response": "string",
  "actions": [
    {
      "type": "create_lead|update_lead|move_lead|draft_email|send_email|schedule_meeting",
      "leadId": "string or null",
      "name": "string or null",
      "companyName": "string or null",
      "email": "string or null",
      "phone": "string or null",
      "notes": "string or null",
      "phase": "lead_found|prospect_engaged|client_closed or null",
      "subject": "string or null",
      "body": "string or null",
      "title": "string or null",
      "startAt": "ISO 8601 string or null",
      "endAt": "ISO 8601 string or null",
      "description": "string or null"
    }
  ]
}`;
