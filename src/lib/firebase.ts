import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { app, firebaseConfig } from "./firebaseConfig";
import { Lead } from "../types";

// Determine if we are using actual Firebase credentials or placeholder
export const isFirebaseConfigured = (): boolean => {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "mock-api-key-placeholder" &&
    !firebaseConfig.apiKey.includes("placeholder")
  );
};

// Initialize auth/db only if actual configuration exists
export let auth: any = null;
export let db: any = null;

if (isFirebaseConfigured()) {
  try {
    auth = getAuth(app);
    db = getFirestore(app); // connects to the '(default)' Firestore database
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
}

const provider = new GoogleAuthProvider();
// Google Workspace scopes needed for Sheets, Gmail, Calendar
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/calendar.events");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initializes authentication state listener.
 * Throws if Firebase is not configured.
 */
export const initAuth = (
  onAuthSuccess: (user: any, token: string | null) => void,
  onAuthFailure: () => void
) => {
  if (!auth) {
    throw new Error("Firebase is not configured. Please set valid Firebase credentials.");
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign-in with scopes for Workspace integration
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string | null }> => {
  if (!auth) {
    throw new Error("Firebase is not configured. Please set valid Firebase credentials.");
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Firebase Google Sign-in Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Logout of current session
 */
export const logout = async () => {
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Data Persistence Interface (Firestore only — no localStorage fallback).
 * If Firestore isn't configured or a call fails, these throw rather than
 * silently diverging into per-browser local state, since that would mean
 * different team members see different, unsynced data.
 */

// Default seed leads, used only to bootstrap a brand-new user's first workspace
const defaultSeedLeads: Lead[] = [
  {
    id: "lead-1",
    name: "Alex Rivera",
    company_name: "HypeSpace",
    email: "alex@hypespace.xyz",
    phone: "+1 (555) 349-8812",
    notes: "Alex is building a community-led video platform for creators. Frustrated with current Discord noise.",
    phase: "lead_found",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    marketFitThesis: "Alex fits Soro's target early-stage founder profile seeking clean, noise-free customer feedback loops.",
    momTestQuestions: [
      "How do you currently filter valuable feature feedback from general chatter?",
      "Can you describe what happened the last time you launched a new community channel?",
      "How did you resolve the most recent dispute regarding your community platform rules?"
    ]
  },
  {
    id: "lead-2",
    name: "Chloe Chen",
    company_name: "Glint AI",
    email: "chloe@glint.ai",
    phone: null,
    notes: "Met at SF Gen Z Hackathon. Chloe expressed concerns that founders spend too much time scheduling interviews rather than talking to users.",
    phase: "prospect_engaged",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    marketFitThesis: "Chloe is a highly active technical builder who is actively experiencing the scheduling bottleneck.",
    momTestQuestions: [
      "How much time did you spend setting up interviews for your last sprint?",
      "Walk me through how you structured your questions during your very last user chat.",
      "What did you do with the notes from that conversation after it ended?"
    ]
  },
  {
    id: "lead-3",
    name: "Jordan Taylor",
    company_name: "Bloom Organics",
    email: "jordan@bloom.co",
    phone: "+1 (555) 890-2345",
    notes: "Bloom is a direct-to-consumer sustainability brand. Jordan conducts weekly feedback sessions with top repeat buyers.",
    phase: "client_closed",
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    marketFitThesis: "Jordan is an e-commerce operator who relies on continuous user discovery to maintain extremely high customer retention.",
    momTestQuestions: [
      "How do you select which repeat buyers to talk to every week?",
      "Describe the last product change you made directly because of buyer feedback.",
      "What tools or methods did you use to analyze the sentiment of your last 10 interviews?"
    ]
  }
];

/**
 * Fetch all leads
 */
export const fetchLeads = async (userId: string | null): Promise<Lead[]> => {
  if (!db || !userId) {
    throw new Error("Firebase is not configured or user is not authenticated.");
  }

  const q = query(collection(db, "leads"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  const leads: Lead[] = [];
  querySnapshot.forEach((doc) => {
    leads.push({ id: doc.id, ...doc.data() } as Lead);
  });

  // If Firestore is empty, seed it with default leads for this user
  if (leads.length === 0) {
    for (const defaultLead of defaultSeedLeads) {
      const newLead = { ...defaultLead, userId };
      await setDoc(doc(db, "leads", defaultLead.id), newLead);
      leads.push(defaultLead);
    }
  }
  return leads;
};

/**
 * Save or update a lead
 */
export const saveLead = async (userId: string | null, lead: Lead): Promise<void> => {
  if (!db || !userId) {
    throw new Error("saveLead called without a configured db or userId");
  }
  await setDoc(doc(db, "leads", lead.id), {
    ...lead,
    userId,
    updatedAt: new Date().toISOString()
  });
};

/**
 * Delete a lead
 */
export const deleteLead = async (userId: string | null, leadId: string): Promise<void> => {
  if (!db || !userId) {
    throw new Error("deleteLead called without a configured db or userId");
  }
  await deleteDoc(doc(db, "leads", leadId));
};