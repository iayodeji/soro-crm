import { initializeApp, getApps, getApp } from "firebase/app";
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
  where,
  onSnapshot
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Lead } from "../types";

// Determine if we are using actual Firebase credentials or placeholder
export const isFirebaseConfigured = (): boolean => {
  return (
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "mock-api-key-placeholder" &&
    !firebaseConfig.apiKey.includes("placeholder")
  );
};

// Initialize app only if actual configuration exists
let app;
export let auth: any = null;
export let db: any = null;

const parsedConfig = firebaseConfig as any;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app, parsedConfig.firestoreDatabaseId || "sorocrm");
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
 * Automatically falls back to local demo user if Firebase is unconfigured.
 */
export const initAuth = (
  onAuthSuccess: (user: any, token: string | null) => void,
  onAuthFailure: () => void
) => {
  if (!auth) {
    // Demo Mode fallback
    const savedDemoUser = localStorage.getItem("soro_demo_user");
    if (savedDemoUser) {
      onAuthSuccess(JSON.parse(savedDemoUser), "demo-token");
    } else {
      onAuthFailure();
    }
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might need popup sign-in to refresh scopes or retrieve access token
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
export const googleSignIn = async (): Promise<{ user: any; accessToken: string | null } | null> => {
  if (!auth) {
    // Simulated sign-in for Demo Mode
    const demoUser = {
      uid: "demo-founder-123",
      displayName: "Demo Founder",
      email: "founder@sorocrm.co",
      photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
    };
    localStorage.setItem("soro_demo_user", JSON.stringify(demoUser));
    return { user: demoUser, accessToken: "demo-token" };
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
  localStorage.removeItem("soro_demo_user");
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Data Persistence Interface (Handles transparent sync between Firestore and LocalStorage)
 */

const LOCAL_STORAGE_KEY = "soro_leads_persistence";

// Default seed leads for fresh dashboards
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
  if (db && userId) {
    try {
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
    } catch (error) {
      console.error("Firestore read error, falling back to local storage:", error);
    }
  }

  // Fallback to local storage
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      return defaultSeedLeads;
    }
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultSeedLeads));
    return defaultSeedLeads;
  }
};

/**
 * Save or update a lead
 */
export const saveLead = async (userId: string | null, lead: Lead): Promise<void> => {
  if (db && userId) {
    try {
      await setDoc(doc(db, "leads", lead.id), {
        ...lead,
        userId,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Firestore write error, saving to local storage fallback:", error);
    }
  }

  // Update Local Storage
  const leads = await fetchLeads(userId);
  const index = leads.findIndex((l) => l.id === lead.id);
  const updatedLead = { ...lead, updatedAt: new Date().toISOString() };
  if (index >= 0) {
    leads[index] = updatedLead;
  } else {
    leads.push(updatedLead);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(leads));
};

/**
 * Delete a lead
 */
export const deleteLead = async (userId: string | null, leadId: string): Promise<void> => {
  if (db && userId) {
    try {
      await deleteDoc(doc(db, "leads", leadId));
    } catch (error) {
      console.error("Firestore delete error, removing from local storage fallback:", error);
    }
  }

  // Update Local Storage
  const leads = await fetchLeads(userId);
  const filtered = leads.filter((l) => l.id !== leadId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
};
