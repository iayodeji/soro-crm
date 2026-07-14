export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { WORKSPACE_ID } from "@/lib/workspace";
import type { Lead } from "@/types";

async function requireLeadBody(body: any) {
  const lead = body?.lead as Lead | undefined;
  if (!lead?.id) {
    return { error: NextResponse.json({ error: "lead.id is required." }, { status: 400 }) };
  }
  return { lead };
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("leads").where("teamId", "==", WORKSPACE_ID).get();
    const leads: Lead[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as Lead));
    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;
  try {
    await adminDb.collection("leads").doc(lead!.id).set({
      ...lead,
      teamId: WORKSPACE_ID,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to save lead:", error);
    return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;
  try {
    const ref = adminDb.collection("leads").doc(lead!.id);
    const existing = await ref.get();
    if (!existing.exists || (existing.data() as any).teamId !== WORKSPACE_ID) {
      return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });
    }
    await ref.set({ ...lead, teamId: WORKSPACE_ID, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }
  try {
    const ref = adminDb.collection("leads").doc(leadId);
    const existing = await ref.get();
    if (!existing.exists || (existing.data() as any).teamId !== WORKSPACE_ID) {
      return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to delete lead:", error);
    return NextResponse.json({ error: "Failed to delete lead." }, { status: 500 });
  }
}
