import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CreateCrmActivityInput } from "@/types";

export async function createCrmActivity(teamId: string, userId: string, input: CreateCrmActivityInput) {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin().from("crm_activities").insert({
    id: `activity-${crypto.randomUUID()}`, teamId, leadId: input.leadId || null, companyId: input.companyId || null,
    type: input.type, outcome: input.outcome || null, summary: input.summary.trim(), notes: input.notes?.trim() || null,
    occurredAt: input.occurredAt || now, nextStep: input.nextStep?.trim() || null, followUpAt: input.followUpAt || null,
    createdBy: userId, updatedBy: userId, createdAt: now, updatedAt: now,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
