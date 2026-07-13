import { adminDb } from "@/lib/firebaseAdmin";

export async function isUserTeamMember(teamId: string, userId: string): Promise<boolean> {
  if (!teamId || !userId) return false;
  const snap = await adminDb.collection("team_memberships").doc(`${userId}_${teamId}`).get();
  return snap.exists;
}
