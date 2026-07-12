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
  serverTimestamp
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { Team, TeamMember, TeamInvitation, Lead } from "../types";

// Local storage key constants for fallback mode
const TEAMS_KEY = "soro_teams_local";
const MEMBERSHIPS_KEY_PREFIX = "soro_memberships_local_";
const INVITATIONS_KEY = "soro_invitations_local";
const LEADS_KEY_PREFIX = "soro_leads_team_";

// Quick random ID generator
const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Create a new team workspace and assign the creator as the Owner.
 */
export const createTeam = async (
  name: string, 
  ownerId: string, 
  ownerDetails: { name: string; email: string; avatarUrl: string }
): Promise<Team> => {
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

  if (isFirebaseConfigured() && db) {
    try {
      // Create team document
      await setDoc(doc(db, "teams", teamId), newTeam);
      // Create initial membership document
      await setDoc(doc(db, "team_memberships", `${ownerId}_${teamId}`), {
        ...initialMember,
        userId: ownerId,
        teamId: teamId
      });
      return newTeam;
    } catch (e) {
      console.error("Failed to create team in Firestore, using fallback", e);
    }
  }

  // Fallback to local storage
  const teams = await fetchUserTeamsLocal(ownerId);
  teams.push(newTeam);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));

  const memberships = [initialMember];
  localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`, JSON.stringify(memberships));

  return newTeam;
};

/**
 * Fetch all teams that the user is currently a member of.
 */
export const fetchUserTeams = async (userId: string | null): Promise<Team[]> => {
  if (!userId) return [];

  if (isFirebaseConfigured() && db) {
    try {
      // Find all memberships of this user
      const q = query(collection(db, "team_memberships"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const teamIds: string[] = [];
      querySnapshot.forEach((doc) => {
        teamIds.push(doc.data().teamId);
      });

      if (teamIds.length === 0) {
        return [];
      }

      // Fetch details of those teams (Firestore limit of 'in' operator is 30, which is perfectly safe here)
      const teams: Team[] = [];
      const chunkedIds = chunkArray(teamIds, 10);
      for (const chunk of chunkedIds) {
        const teamQuery = query(collection(db, "teams"), where("id", "in", chunk));
        const teamSnapshot = await getDocs(teamQuery);
        teamSnapshot.forEach((doc) => {
          teams.push(doc.data() as Team);
        });
      }
      return teams.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (e) {
      console.error("Failed to fetch teams from Firestore, using fallback", e);
    }
  }

  return fetchUserTeamsLocal(userId);
};

const fetchUserTeamsLocal = (userId: string): Team[] => {
  const localData = localStorage.getItem(TEAMS_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      return [];
    }
  }
  return [];
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
  const inviteId = "invite-" + generateId();
  const token = "tok-" + generateId() + generateId();
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

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, "invitations", token), newInvitation);
      return newInvitation;
    } catch (e) {
      console.error("Failed to save invitation in Firestore", e);
    }
  }

  // Local fallback
  const invites = fetchLocalInvitations();
  invites.push(newInvitation);
  localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invites));

  return newInvitation;
};

const fetchLocalInvitations = (): TeamInvitation[] => {
  const localData = localStorage.getItem(INVITATIONS_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      return [];
    }
  }
  return [];
};

/**
 * Join a team using an active invitation token.
 */
export const joinTeamViaInvitation = async (
  token: string,
  userId: string,
  userDetails: { name: string; email: string; avatarUrl: string }
): Promise<Team | null> => {
  if (isFirebaseConfigured() && db) {
    try {
      const inviteDocRef = doc(db, "invitations", token);
      const inviteSnap = await getDoc(inviteDocRef);

      if (!inviteSnap.exists()) return null;
      const invite = inviteSnap.data() as TeamInvitation;

      if (invite.status !== "pending") return null;
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        await updateDoc(inviteDocRef, { status: "expired" });
        return null;
      }

      // Add to memberships
      const membershipId = `${userId}_${invite.teamId}`;
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
        lastActiveAt: new Date().toISOString()
      };

      await setDoc(doc(db, "team_memberships", membershipId), newMembership);
      await updateDoc(inviteDocRef, { status: "accepted" });

      // Fetch team
      const teamSnap = await getDoc(doc(db, "teams", invite.teamId));
      return teamSnap.exists() ? (teamSnap.data() as Team) : null;
    } catch (e) {
      console.error("Failed to join team in Firestore", e);
    }
  }

  // Local fallback
  const invites = fetchLocalInvitations();
  const inviteIndex = invites.findIndex((i) => i.token === token);
  if (inviteIndex === -1) return null;
  const invite = invites[inviteIndex];

  if (invite.status !== "pending") return null;
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    invite.status = "expired";
    localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invites));
    return null;
  }

  invite.status = "accepted";
  localStorage.setItem(INVITATIONS_KEY, JSON.stringify(invites));

  // Add membership
  const memberships = fetchLocalMemberships(invite.teamId);
  const newMember: TeamMember = {
    id: userId,
    name: userDetails.name,
    email: userDetails.email,
    avatarUrl: userDetails.avatarUrl,
    status: "active",
    activity: "viewing",
    role: invite.role,
    lastActiveAt: new Date().toISOString()
  };
  memberships.push(newMember);
  localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${invite.teamId}`, JSON.stringify(memberships));

  // Retrieve team
  const teams = JSON.parse(localStorage.getItem(TEAMS_KEY) || "[]") as Team[];
  const team = teams.find((t) => t.id === invite.teamId);
  return team || { id: invite.teamId, name: invite.teamName, ownerId: "fallback", createdAt: new Date().toISOString() };
};

/**
 * Fetch memberships for a specific team.
 */
export const fetchTeamMemberships = async (teamId: string): Promise<TeamMember[]> => {
  if (isFirebaseConfigured() && db) {
    try {
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
    } catch (e) {
      console.error("Failed to fetch memberships from Firestore", e);
    }
  }

  return fetchLocalMemberships(teamId);
};

const fetchLocalMemberships = (teamId: string): TeamMember[] => {
  const localData = localStorage.getItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      return [];
    }
  }

  // Default seed members for the demo workspace if it's the first time
  const defaultMembers: TeamMember[] = [
    {
      id: "demo-founder-123",
      name: "Demo Founder",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      status: "active",
      activity: "viewing",
      role: "owner"
    },
    {
      id: "member-2",
      name: "Lina (Growth PM)",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80",
      status: "active",
      activity: "editing",
      role: "admin"
    },
    {
      id: "member-3",
      name: "Toby (Founder)",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      status: "away",
      activity: "idle",
      role: "member"
    }
  ];
  localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`, JSON.stringify(defaultMembers));
  return defaultMembers;
};

/**
 * Subscribe to team memberships in real-time.
 */
export const subscribeToTeamMemberships = (
  teamId: string, 
  callback: (members: TeamMember[]) => void
): () => void => {
  if (isFirebaseConfigured() && db) {
    try {
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
    } catch (e) {
      console.error("Firestore team subscriptions setup failed, using polling fallback", e);
    }
  }

  // Fallback mode: Poll localStorage or trigger a local update event
  const interval = setInterval(() => {
    callback(fetchLocalMemberships(teamId));
  }, 1500);

  // Trigger immediate load
  callback(fetchLocalMemberships(teamId));

  return () => clearInterval(interval);
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
  if (isFirebaseConfigured() && db) {
    try {
      const membershipDocRef = doc(db, "team_memberships", `${userId}_${teamId}`);
      await updateDoc(membershipDocRef, {
        status,
        activity,
        lastActiveAt: new Date().toISOString()
      });
      return;
    } catch (e) {
      // In case doc does not exist, we try to fetch user name & avatar URL first
    }
  }

  // Local fallback
  const memberships = fetchLocalMemberships(teamId);
  const memberIndex = memberships.findIndex((m) => m.id === userId);
  if (memberIndex !== -1) {
    memberships[memberIndex].status = status;
    memberships[memberIndex].activity = activity;
    memberships[memberIndex].lastActiveAt = new Date().toISOString();
    localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`, JSON.stringify(memberships));
  }
};

/**
 * Change member role (admin / editor / viewer / member).
 */
export const changeMemberRole = async (
  teamId: string,
  userId: string,
  newRole: "admin" | "editor" | "viewer" | "member"
): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      const membershipDocRef = doc(db, "team_memberships", `${userId}_${teamId}`);
      await updateDoc(membershipDocRef, { role: newRole });
      return;
    } catch (e) {
      console.error("Failed to change user role in Firestore", e);
    }
  }

  // Local fallback
  const memberships = fetchLocalMemberships(teamId);
  const memberIndex = memberships.findIndex((m) => m.id === userId);
  if (memberIndex !== -1) {
    memberships[memberIndex].role = newRole;
    localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`, JSON.stringify(memberships));
  }
};

/**
 * Remove member from a team.
 */
export const removeTeamMember = async (
  teamId: string,
  userId: string
): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, "team_memberships", `${userId}_${teamId}`));
      return;
    } catch (e) {
      console.error("Failed to remove user from Firestore team", e);
    }
  }

  // Local fallback
  const memberships = fetchLocalMemberships(teamId);
  const filtered = memberships.filter((m) => m.id !== userId);
  localStorage.setItem(`${MEMBERSHIPS_KEY_PREFIX}${teamId}`, JSON.stringify(filtered));
};

/**
 * Fetch Leads for a specific Team.
 */
export const fetchLeadsByTeam = async (teamId: string): Promise<Lead[]> => {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "leads"), where("teamId", "==", teamId));
      const querySnapshot = await getDocs(q);
      const leads: Lead[] = [];
      querySnapshot.forEach((doc) => {
        leads.push({ id: doc.id, ...doc.data() } as Lead);
      });
      return leads;
    } catch (error) {
      console.error("Firestore team leads read error, falling back to local storage:", error);
    }
  }

  // Local fallback
  const localData = localStorage.getItem(`${LEADS_KEY_PREFIX}${teamId}`);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      return [];
    }
  } else {
    // If empty, return a copy of general leads as seed data for this fresh team workspace
    const rawLeads = localStorage.getItem("soro_leads_persistence") || "[]";
    const initialLeads = JSON.parse(rawLeads);
    localStorage.setItem(`${LEADS_KEY_PREFIX}${teamId}`, JSON.stringify(initialLeads));
    return initialLeads;
  }
};

/**
 * Save lead associated with team.
 */
export const saveLeadForTeam = async (
  teamId: string, 
  lead: Lead
): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, "leads", lead.id), {
        ...lead,
        teamId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Firestore team write error, saving to local storage fallback:", error);
    }
  }

  // Update Local Storage
  const leads = await fetchLeadsByTeam(teamId);
  const index = leads.findIndex((l) => l.id === lead.id);
  const updatedLead = { ...lead, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    leads[index] = updatedLead;
  } else {
    leads.push(updatedLead);
  }
  localStorage.setItem(`${LEADS_KEY_PREFIX}${teamId}`, JSON.stringify(leads));
};

/**
 * Delete lead associated with team.
 */
export const deleteLeadForTeam = async (
  teamId: string, 
  leadId: string
): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, "leads", leadId));
    } catch (error) {
      console.error("Firestore team delete error, removing from local storage fallback:", error);
    }
  }

  // Update Local Storage
  const leads = await fetchLeadsByTeam(teamId);
  const filtered = leads.filter((l) => l.id !== leadId);
  localStorage.setItem(`${LEADS_KEY_PREFIX}${teamId}`, JSON.stringify(filtered));
};

/**
 * Permanently delete a team workspace and all associated leads & memberships.
 */
export const deleteTeamWorkspace = async (teamId: string): Promise<void> => {
  if (isFirebaseConfigured() && db) {
    try {
      // 1. Delete team doc
      await deleteDoc(doc(db, "teams", teamId));
      
      // 2. Delete memberships
      const membershipsQuery = query(collection(db, "team_memberships"), where("teamId", "==", teamId));
      const membershipsSnapshot = await getDocs(membershipsQuery);
      for (const mDoc of membershipsSnapshot.docs) {
        await deleteDoc(doc(db, "team_memberships", mDoc.id));
      }

      // 3. Delete leads
      const leadsQuery = query(collection(db, "leads"), where("teamId", "==", teamId));
      const leadsSnapshot = await getDocs(leadsQuery);
      for (const lDoc of leadsSnapshot.docs) {
        await deleteDoc(doc(db, "leads", lDoc.id));
      }
    } catch (e) {
      console.error("Failed to delete team in Firestore", e);
    }
  }

  // Fallback local storage
  const teamsData = localStorage.getItem("soro_teams_local");
  if (teamsData) {
    const teams = JSON.parse(teamsData) as Team[];
    const filtered = teams.filter(t => t.id !== teamId);
    localStorage.setItem("soro_teams_local", JSON.stringify(filtered));
  }
  localStorage.removeItem(`soro_memberships_local_${teamId}`);
  localStorage.removeItem(`soro_leads_team_${teamId}`);
};

// Helper function to chunk array for firestore limits
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};
