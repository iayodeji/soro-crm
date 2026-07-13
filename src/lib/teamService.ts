import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  runTransaction
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { Team, TeamMember, TeamInvitation, Lead } from "../types";

// Quick random ID generator with crypto fallback
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(6);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(36)).join("");
  }
  return Math.random().toString(36).substring(2, 11);
};

const generateToken = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return "tok-" + Array.from(array, (byte) => byte.toString(36)).join("");
  }
  return "tok-" + generateId() + generateId();
};

const requireDb = () => {
  if (!isFirebaseConfigured() || !db) {
    throw new Error("Firestore is not configured — team features require a connected database.");
  }
  return db;
};

/**
 * Create a new team workspace and assign the creator as the Owner.
 */
export const createTeam = async (
  name: string,
  ownerId: string,
  ownerDetails: { name: string; email: string; avatarUrl: string }
): Promise<Team> => {
  const db = requireDb();
  const teamId = "team-" + generateId();
  const newTeam: Team = {
    id: teamId,
    name,
    ownerId,
    createdAt: new Date().toISOString()
  };

  const initialMember: TeamMember = {
    id: ownerId,
    name: ownerDetails.name,
    email: ownerDetails.email,
    avatarUrl: ownerDetails.avatarUrl,
    status: "active",
    activity: "viewing",
    role: "owner",
    lastActiveAt: new Date().toISOString()
  };

  await setDoc(doc(db, "teams", teamId), newTeam);
  await setDoc(doc(db, "team_memberships", `${ownerId}_${teamId}`), {
    ...initialMember,
    userId: ownerId,
    teamId: teamId
  });

  return newTeam;
};

/**
 * Fetch all teams that the user is currently a member of.
 */
export const fetchUserTeams = async (userId: string | null): Promise<Team[]> => {
  if (!userId) {
    console.warn("[teamService] fetchUserTeams: no userId provided — returning empty list.");
    return [];
  }
  const db = requireDb();
  console.info("[teamService] fetchUserTeams: querying Firestore for workspaces of user", userId);

  const q = query(collection(db, "team_memberships"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const teamIds: string[] = [];
  querySnapshot.forEach((doc) => {
    teamIds.push(doc.data().teamId);
  });
  console.info(`[teamService] fetchUserTeams: found ${teamIds.length} membership(s) for user.`, teamIds);

  if (teamIds.length === 0) {
    console.info("[teamService] fetchUserTeams: user belongs to no workspaces yet.");
    return [];
  }

  const teams: Team[] = [];
  // Fetch each team by document id (getDoc) rather than a `where("id", "in", [...])`
  // QUERY. The teams read rule uses exists(team_memberships/{uid}_{teamId}), and Firebase
  // rejects queries that can't prove that cross-collection condition from the id filter
  // alone ("Missing or insufficient permissions"). A per-document getDoc evaluates the
  // rule correctly for each team the user is actually a member of.
  await Promise.all(
    teamIds.map(async (teamId) => {
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      if (teamSnap.exists()) teams.push(teamSnap.data() as Team);
    })
  );
  const sorted = teams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  console.info(`[teamService] fetchUserTeams: pulled ${sorted.length} workspace(s) from Firestore.`, sorted.map((t) => ({ id: t.id, name: t.name })));
  return sorted;
};

/**
 * Generate a secure, trackable, time-limited team invitation.
 */
export const createInvitation = async (
  teamId: string,
  teamName: string,
  email: string,
  role: "admin" | "editor" | "viewer" | "member"
): Promise<TeamInvitation> => {
  const db = requireDb();
  const inviteId = "invite-" + generateId();
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour expiry

  const newInvitation: TeamInvitation = {
    id: inviteId,
    email,
    teamId,
    teamName,
    role,
    token,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  await setDoc(doc(db, "invitations", token), newInvitation);
  return newInvitation;
};

/**
 * Join a team using an active invitation token.
 */
export const joinTeamViaInvitation = async (
  token: string,
  userId: string,
  userDetails: { name: string; email: string; avatarUrl: string }
): Promise<Team | null> => {
  const db = requireDb();

  try {
    return await runTransaction(db, async (transaction) => {
      const inviteDocRef = doc(db, "invitations", token);
      const inviteSnap = await transaction.get(inviteDocRef);

      if (!inviteSnap.exists()) return null;
      const invite = inviteSnap.data() as TeamInvitation;

      if (invite.status !== "pending") return null;
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        transaction.update(inviteDocRef, { status: "expired" });
        return null;
      }

      const membershipId = `${userId}_${invite.teamId}`;
      const membershipRef = doc(db, "team_memberships", membershipId);
      const membershipSnap = await transaction.get(membershipRef);

      if (membershipSnap.exists()) {
        const teamSnap = await transaction.get(doc(db, "teams", invite.teamId));
        return teamSnap.exists() ? (teamSnap.data() as Team) : null;
      }

      const newMembership = {
        id: userId,
        userId: userId,
        teamId: invite.teamId,
        name: userDetails.name,
        email: userDetails.email,
        avatarUrl: userDetails.avatarUrl,
        status: "active",
        activity: "viewing",
        role: invite.role,
        invitationToken: token,
        lastActiveAt: new Date().toISOString()
      };

      transaction.set(membershipRef, newMembership);
      transaction.update(inviteDocRef, { status: "accepted" });

      const teamSnap = await transaction.get(doc(db, "teams", invite.teamId));
      return teamSnap.exists() ? (teamSnap.data() as Team) : null;
    });
  } catch (e) {
    console.error("Invite processing error", e);
    throw e;
  }
};

/**
 * Fetch memberships for a specific team.
 */
export const fetchTeamMemberships = async (teamId: string): Promise<TeamMember[]> => {
  const db = requireDb();
  const q = query(collection(db, "team_memberships"), where("teamId", "==", teamId));
  const querySnapshot = await getDocs(q);
  const members: TeamMember[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    members.push({
      id: data.id,
      name: data.name,
      avatarUrl: data.avatarUrl,
      status: data.status || "active",
      activity: data.activity || "viewing",
      role: data.role || "member",
      email: data.email,
      lastActiveAt: data.lastActiveAt
    } as TeamMember);
  });
  return members;
};

/**
 * Subscribe to team memberships in real-time.
 */
export const subscribeToTeamMemberships = (
  teamId: string,
  callback: (members: TeamMember[]) => void
): () => void => {
  const db = requireDb();
  const q = query(collection(db, "team_memberships"), where("teamId", "==", teamId));
  return onSnapshot(q, (snapshot) => {
    const members: TeamMember[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: data.id,
        name: data.name,
        avatarUrl: data.avatarUrl,
        status: data.status || "active",
        activity: data.activity || "viewing",
        role: data.role || "member",
        email: data.email,
        lastActiveAt: data.lastActiveAt
      } as TeamMember);
    });
    callback(members);
  });
};

/**
 * Update current user's active presence and editing state on the board.
 */
export const updatePresence = async (
  teamId: string,
  userId: string,
  status: "active" | "away" | "offline",
  activity: "viewing" | "editing" | "idle"
): Promise<void> => {
  const db = requireDb();
  const membershipDocRef = doc(db, "team_memberships", `${userId}_${teamId}`);
  // merge: true so this behaves as an upsert — avoids failing on a first-write
  // race where the membership doc hasn't been created yet.
  await setDoc(
    membershipDocRef,
    { status, activity, lastActiveAt: new Date().toISOString() },
    { merge: true }
  );
};

/**
 * Change member role (admin / editor / viewer / member).
 */
export const changeMemberRole = async (
  teamId: string,
  userId: string,
  newRole: "admin" | "editor" | "viewer" | "member"
): Promise<void> => {
  const db = requireDb();
  const membershipDocRef = doc(db, "team_memberships", `${userId}_${teamId}`);
  await updateDoc(membershipDocRef, { role: newRole });
};

/**
 * Remove member from a team.
 */
export const removeTeamMember = async (
  teamId: string,
  userId: string
): Promise<void> => {
  const db = requireDb();
  await deleteDoc(doc(db, "team_memberships", `${userId}_${teamId}`));
};

/**
 * Fetch Leads for a specific Team.
 */
export const fetchLeadsByTeam = async (teamId: string): Promise<Lead[]> => {
  const db = requireDb();
  const q = query(collection(db, "leads"), where("teamId", "==", teamId));
  const querySnapshot = await getDocs(q);
  const leads: Lead[] = [];
  querySnapshot.forEach((doc) => {
    leads.push({ id: doc.id, ...doc.data() } as Lead);
  });
  return leads;
};

/**
 * Save lead associated with team.
 */
export const saveLeadForTeam = async (
  teamId: string,
  lead: Lead
): Promise<void> => {
  const db = requireDb();
  console.info("[teamService] saveLeadForTeam: writing leads/" + lead.id, {
    teamId,
    dbConfigured: isFirebaseConfigured(),
  });
  await setDoc(doc(db, "leads", lead.id), {
    ...lead,
    teamId,
    updatedAt: new Date().toISOString()
  });
  console.info("[teamService] saveLeadForTeam: write OK for leads/" + lead.id);
};

/**
 * Delete lead associated with team.
 */
export const deleteLeadForTeam = async (
  teamId: string,
  leadId: string
): Promise<void> => {
  const db = requireDb();
  await deleteDoc(doc(db, "leads", leadId));
};

/**
 * Permanently delete a team workspace and all associated leads & memberships.
 */
export const deleteTeamWorkspace = async (teamId: string): Promise<void> => {
  const db = requireDb();

  await deleteDoc(doc(db, "teams", teamId));

  const membershipsQuery = query(collection(db, "team_memberships"), where("teamId", "==", teamId));
  const membershipsSnapshot = await getDocs(membershipsQuery);
  for (const mDoc of membershipsSnapshot.docs) {
    await deleteDoc(doc(db, "team_memberships", mDoc.id));
  }

  const leadsQuery = query(collection(db, "leads"), where("teamId", "==", teamId));
  const leadsSnapshot = await getDocs(leadsQuery);
  for (const lDoc of leadsSnapshot.docs) {
    await deleteDoc(doc(db, "leads", lDoc.id));
  }
};
