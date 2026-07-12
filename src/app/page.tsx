'use client';
import React, { useState, useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { OmniInput } from "@/components/OmniInput";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LeadDetailView } from "@/components/LeadDetailView";
import { 
  initAuth, googleSignIn, logout, isFirebaseConfigured
} from "@/lib/firebase";
import { 
  createTeam, fetchUserTeams, subscribeToTeamMemberships, 
  updatePresence, fetchLeadsByTeam, saveLeadForTeam, 
  deleteLeadForTeam, joinTeamViaInvitation 
} from "@/lib/teamService";
import { Lead, ActivityLog, TeamMember, Phase, Team } from "@/types";
import { TeamManagementModal } from "@/components/TeamManagementModal";
import { 
  Users, CheckCircle2, MessageSquare, History, Sparkles, 
  TrendingUp, RefreshCw, Layers, Bell, FileDown, Smartphone, 
  Volume2, VolumeX, AlertCircle, X, Check, Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  playSuccessPop, playInfoTap, playFCMPushSound, playWarningChime 
} from "@/utils/audio";

interface ToastMessage {
  id: string;
  title: string;
  desc: string;
  type: "success" | "info" | "warning";
}

/**
 * Main coordinating App component for Soro CRM.
 * Manages full-stack states, authentication, collaborative pipeline, and activity audit trails.
 */
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Fun, gamified Soro CRM premium features:
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [fcmEnabled, setFcmEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [simulatedNotifications, setSimulatedNotifications] = useState<any[]>([]);
  const [leadIdToConfirmDelete, setLeadIdToConfirmDelete] = useState<string | null>(null);

  // Multi-Tenant workspace and dynamic memberships
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  // Handle local network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        logActivity(
          "Authenticated Session",
          `User ${currentUser.displayName || currentUser.email} authenticated.`,
          "success"
        );
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Initialize and load multi-tenant workspaces for the authenticated user
  useEffect(() => {
    const loadWorkspaces = async () => {
      const userId = user?.uid || "demo-founder-123";
      let teams = await fetchUserTeams(userId);
      
      if (teams.length === 0) {
        // Automatically create a default team workspace if none exist
        const defaultTeamName = user?.displayName ? `${user.displayName}'s Pipeline` : "Soro Team";
        const ownerDetails = {
          name: user?.displayName || "Demo Founder",
          email: user?.email || "founder@sorocrm.co",
          avatarUrl: user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
        };
        const defaultTeam = await createTeam(defaultTeamName, userId, ownerDetails);
        teams = [defaultTeam];
      }
      setMyTeams(teams);

      // Handle query parameter invitation token intake if present
      const urlParams = new URLSearchParams(window.location.search);
      const inviteToken = urlParams.get("inviteToken");
      if (inviteToken) {
        const userDetails = {
          name: user?.displayName || "Workspace Teammate",
          email: user?.email || "teammate@sorocrm.co",
          avatarUrl: user?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80"
        };
        try {
          const joined = await joinTeamViaInvitation(inviteToken, userId, userDetails);
          if (joined) {
            logActivity("Joined Team", `Successfully accepted invite to join team "${joined.name}".`, "success");
            // Refresh list
            teams = await fetchUserTeams(userId);
            setMyTeams(teams);
            const matchedTeam = teams.find(t => t.id === joined.id);
            setCurrentTeam(matchedTeam || joined);
          } else {
            logActivity("Invite Expired", "The team invitation token is invalid or has expired.", "warning");
            setCurrentTeam(teams[0]);
          }
        } catch (e) {
          console.error("Invite processing error", e);
          setCurrentTeam(teams[0]);
        } finally {
          // Clear URL query params to keep the interface pristine
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setCurrentTeam(teams[0]);
      }
    };

    loadWorkspaces();
  }, [user]);

  // Sync isolated team leads and real-time memberships
  useEffect(() => {
    if (!currentTeam) return;

    // Fetch team leads
    const loadTeamLeads = async () => {
      const teamLeads = await fetchLeadsByTeam(currentTeam.id);
      setLeads(teamLeads);
    };
    loadTeamLeads();

    // Subscribe to real-time team memberships
    const unsubscribe = subscribeToTeamMemberships(currentTeam.id, (members) => {
      setTeamMembers(members);
    });

    return () => unsubscribe();
  }, [currentTeam]);

  // Sync current user presence state (viewing vs editing) to database presence registers
  useEffect(() => {
    if (!currentTeam) return;
    const userId = user?.uid || "demo-founder-123";
    
    // Active activity state detection
    const activity = selectedLead ? "editing" : "viewing";
    
    updatePresence(currentTeam.id, userId, "active", activity);

    // Heartbeat before unload
    const handleBeforeUnload = () => {
      updatePresence(currentTeam.id, userId, "offline", "idle");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Dynamic idle timer to set status to 'away' if mouse/keyboard are inactive for 2 minutes
    let idleTimer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      updatePresence(currentTeam.id, userId, "active", activity);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        updatePresence(currentTeam.id, userId, "away", "idle");
      }, 120000); // 2 minutes
    };

    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keypress", resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keypress", resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, [currentTeam, user, selectedLead]);

  /**
   * Helper: Dispatches an FCM Push Notification alert. Triggers standard browser native
   * notifications if permissions are granted, and shows an in-app banner fallback.
   */
  const triggerSimulatedFCMPush = (title: string, body: string, leadName: string) => {
    // If native browser notification permission is active, trigger native prompt
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: body,
          });
        } catch (e) {
          console.warn("Native Notification dispatch failed:", e);
        }
      }
    }

    // Small network lag simulator to make it feel extremely real & reactive
    setTimeout(() => {
      if (soundEnabled) {
        playFCMPushSound();
      }
      const newNotif = {
        id: `fcm-${Date.now()}-${Math.random()}`,
        title,
        body,
        leadName,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSimulatedNotifications((prev) => [newNotif, ...prev]);

      // Dismiss the push banner after 7 seconds
      setTimeout(() => {
        setSimulatedNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, 7000);
    }, 1500);
  };

  /**
   * Appends a structured audit event to the pipeline activity ledger.
   * Also triggers direct playful Toast alerts and audio synthesized sound feedbacks!
   */
  const logActivity = (action: string, details: string, type: "success" | "info" | "warning") => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      leadId: selectedLead?.id || "global",
      leadName: selectedLead?.name || "System",
      action,
      details,
      type,
    };
    setActivityLogs((prev) => [newLog, ...prev].slice(0, 30));

    // Post to instant interactive Toast list
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id: toastId, title: action, desc: details, type }]);

    // Trigger browser sound synthesize
    if (soundEnabled) {
      if (type === "success") {
        playSuccessPop();
      } else if (type === "warning") {
        playWarningChime();
      } else {
        playInfoTap();
      }
    }

    // Auto dismiss Toast
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 4500);

    // AI-first Automated Push Notification Triggers:
    // When a task is created, a sheet synced, raw text parsed, or call scheduled:
    if (fcmEnabled) {
      if (action.includes("Tasks Synced") || action.includes("Google Tasks")) {
        triggerSimulatedFCMPush(
          "🚨 Upcoming Discovery Call Action",
          `Google Task added: "Follow up interview with ${selectedLead?.name || 'lead'}". Tap to view.`,
          selectedLead?.name || "Pipeline reminder"
        );
      } else if (action.includes("Sheets Sync") || action.includes("Exported")) {
        triggerSimulatedFCMPush(
          "📊 Google Sheets Synced",
          `Success: Discovery logs of ${selectedLead?.name || 'lead'} pushed to Soro-Discovery-Pipeline sheet.`,
          selectedLead?.name || "Workspace sync"
        );
      } else if (action.includes("Gmail")) {
        triggerSimulatedFCMPush(
          "✉️ Discovery Outbox Dispatch",
          `Mom Test Interview request drafted and sent to ${selectedLead?.email || 'target'} successfully.`,
          selectedLead?.name || "Gmail"
        );
      } else if (action.includes("AI Parsing Completed")) {
        triggerSimulatedFCMPush(
          "🧠 Soro Proactive Coach",
          `AI analyzed bios of ${selectedLead?.name || 'new lead'}. Generated custom non-leading discovery query.`,
          selectedLead?.name || "Coach"
        );
      }
    }
  };

  /**
   * Bulletproof offline Local Excel / CSV spreadsheet generator fallback.
   * Bypasses active network Google Sheets API authorization limits.
   */
  const exportDatabaseToCSV = () => {
    try {
      if (leads.length === 0) {
        logActivity("Local CSV Export Failed", "No leads exist in the customer discovery console yet.", "warning");
        return;
      }

      // CSV structure
      const headers = ["Lead ID", "Founder Name", "Company", "Email", "Phone", "Phase", "Market-Fit Thesis", "Created At", "Google Sheets Synced", "Google Tasks Synced"];
      const rows = leads.map((lead) => [
        `"${lead.id}"`,
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.company_name.replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${lead.phase}"`,
        `"${(lead.marketFitThesis || "").replace(/"/g, '""')}"`,
        `"${lead.createdAt}"`,
        `"${lead.sheetsSynced ? "YES" : "NO"}"`,
        `"${lead.tasksCreated ? "YES" : "NO"}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Soro_CRM_Discovery_Pipeline_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      logActivity("Local CSV Exported", "Successfully downloaded perfect Excel-ready spreadsheet of all active pipeline leads.", "success");
    } catch (err: any) {
      logActivity("CSV Export Failed", err.message || "Could not generate local backup", "warning");
    }
  };

  /**
   * Action: Authenticate using Google Single Sign-In
   */
  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        logActivity("Google Sign-In", "Google account connected successfully.", "success");
      }
    } catch (error: any) {
      logActivity("Google Sign-In Failed", error?.message || "Auth error", "warning");
    }
  };

  /**
   * Action: Sign out of active pipeline session
   */
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    logActivity("Session Terminated", "Signed out of discovery console.", "info");
  };

  /**
   * Action: Gemini Parser pipeline
   */
  const handleParseLead = async (
    rawText: string,
    options: { useSearchGrounding: boolean; modelPreset: string }
  ) => {
    setIsParsing(true);
    logActivity(
      "AI Pipeline Requested",
      `Analyzing unstructured raw input with preset '${options.modelPreset}'${options.useSearchGrounding ? " (Web Grounding active)" : ""}.`,
      "info"
    );

    try {
      const response = await fetch("/api/parse-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          useSearchGrounding: options.useSearchGrounding,
          modelPreset: options.modelPreset,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to parse text via backend pipeline.");
      }

      const parsedData = await response.json();

      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: parsedData.parsed_lead?.name || "Unidentified Lead",
        company_name: parsedData.parsed_lead?.company_name || "Startup",
        email: parsedData.parsed_lead?.email || null,
        phone: parsedData.parsed_lead?.phone || null,
        notes: rawText,
        phase: "lead_found",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        marketFitThesis: parsedData.market_fit_thesis,
        momTestQuestions: parsedData.mom_test_questions,
      };

      await handleUpdateLead(newLead);
      setSelectedLead(newLead);
      if (parsedData.isFallback) {
        logActivity(
          "Local Parse Fallback",
          `Using high-fidelity offline heuristic compiler to parse "${newLead.name}" at "${newLead.company_name}". (Define the "soroCRM" secret key in Settings > Secrets to unlock full AI).`,
          "warning"
        );
      } else {
        logActivity(
          "AI Parsing Completed",
          `Discovered ${newLead.name} at ${newLead.company_name}. Compiled ${newLead.momTestQuestions?.length || 0} non-pitching questions.`,
          "success"
        );
      }
    } catch (e: any) {
      console.error("Parse Error:", e);
      logActivity("AI Parsing Failed", e.message || "Unstructured token lookup error.", "warning");
    } finally {
      setIsParsing(false);
    }
  };

  /**
   * Action: Update individual lead details and save securely
   */
  const handleUpdateLead = async (updatedLead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === updatedLead.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedLead;
        return copy;
      }
      return [...prev, updatedLead];
    });

    if (selectedLead?.id === updatedLead.id) {
      setSelectedLead(updatedLead);
    }

    if (currentTeam) {
      await saveLeadForTeam(currentTeam.id, updatedLead);
    }
  };

  /**
   * Action: Delete lead from pipeline
   */
  const handleDeleteLead = async (leadId: string) => {
    setLeadIdToConfirmDelete(leadId);
  };

  /**
   * Action: Quick manual addition
   */
  const handleAddNewLead = async (phase: Phase) => {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: "New Founder Lead",
      company_name: "Acuity Labs",
      email: null,
      phone: null,
      notes: "Describe their operational bottleneck or recent workflow experience.",
      phase,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      marketFitThesis: "A proactive target hypothesis relating to user feedback challenges.",
      momTestQuestions: [
        "How do you currently discover bottlenecks in your day-to-day workflow?",
        "When was the last time you bought a software solution for this challenge?",
        "Walk me through what happened when that software was deployed."
      ]
    };

    await handleUpdateLead(newLead);
    setSelectedLead(newLead);
    logActivity("Manual Lead Added", `Created empty profile card on column ${phase}.`, "info");
  };

  // Compute stats for Dashboard Metrics
  const leadCount = leads.filter((l) => l.phase === "lead_found").length;
  const prospectCount = leads.filter((l) => l.phase === "prospect_engaged").length;
  const clientCount = leads.filter((l) => l.phase === "client_closed").length;
  const syncedCount = leads.filter((l) => l.sheetsSynced).length;
  const tasksSyncedCount = leads.filter((l) => l.tasksCreated).length;

  // Determine current user's role in this team and check if they are a Viewer
  const currentUserMember = teamMembers.find(
    (m) => m.id === (user?.uid || "demo-founder-123")
  );
  const isViewer = currentUserMember?.role === "viewer";

  if (selectedLead) {
    return (
      <LeadDetailView
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdateLead={handleUpdateLead}
        accessToken={accessToken}
        user={user}
        onLogActivity={logActivity}
        isViewer={isViewer}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] flex flex-col font-sans select-none antialiased">
      
      {/* Top Navigation Component */}
      <TopBar
        user={user}
        accessToken={accessToken}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isFirebaseSynced={isFirebaseConfigured() && !!user}
        networkStatus={networkStatus}
        teamMembers={teamMembers}
        onManageTeam={() => setIsTeamModalOpen(true)}
        currentTeamName={currentTeam?.name}
      />

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
        
        {/* Editorial Greeting Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1F1612]/15 pb-6">
          <div>
            <h2 className="font-serif font-bold italic text-4xl text-[#1F1612] tracking-tight">
              Customer Discovery Console
            </h2>
            <p className="text-sm font-sans text-[#1F1612]/60 mt-1">
              Analyze user bios, construct non-leading discovery profiles, and sync to Workspace sheets.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Active Board</span>
              <span className="text-xl font-serif font-bold italic text-[#B74A26]">{leads.length} leads</span>
            </div>
            <div className="h-8 w-px bg-[#1F1612]/10" />
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Synced Sheets</span>
              <span className="text-xl font-serif font-bold italic text-[#7A8452]">{syncedCount} rows</span>
            </div>
            <div className="h-8 w-px bg-[#1F1612]/10" />
            <div className="text-right">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Tracked Tasks</span>
              <span className="text-xl font-serif font-bold italic text-[#B74A26]">{tasksSyncedCount} synced</span>
            </div>
          </div>
        </div>

        {/* FCM & Push Notification Control Center & API Settings Hint */}
        <div className="bg-white/60 backdrop-blur-md border border-[#1F1612]/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Left side: AI-First & Notification Engine Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block p-1.5 rounded-lg bg-[#B74A26]/10 text-[#B74A26]">
                  <Smartphone className="w-4 h-4 text-[#B74A26]" />
                </span>
                <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Notification Engine</h3>
              </div>
              <p className="text-xs text-[#1F1612]/70 leading-relaxed max-w-2xl">
                Configure your CRM workspace alerts. Seamlessly export structured Excel-ready backups of your customer pipeline database directly, or request Native Browser Notifications for discovery alerts.
              </p>
            </div>

            {/* Right side: Interactive Toggles and Actions */}
            <div className="flex flex-wrap items-center gap-3.5 w-full lg:w-auto">
              {/* Local CSV fallback */}
              <button
                onClick={exportDatabaseToCSV}
                className="flex items-center gap-2 bg-white hover:bg-[#7A8452]/10 border border-[#7A8452]/30 text-[#7A8452] font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Direct local spreadsheet fallback without Google credentials"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export Excel Backup</span>
              </button>

              {/* FCM status toggle */}
              <button
                onClick={async () => {
                  const val = !fcmEnabled;
                  if (val && typeof window !== "undefined" && "Notification" in window) {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      logActivity("Notifications Active", "Standard native push notifications are now active. You will receive live system alerts!", "success");
                    } else {
                      logActivity("Notifications Blocked", "Standard native push permissions were denied. Soro will use in-app alerts.", "warning");
                    }
                  }
                  setFcmEnabled(val);
                  logActivity(
                    "FCM Push Alerts " + (val ? "Enabled" : "Disabled"),
                    val ? "FCM service channel is listening for live pipeline activity and task deadlines." : "FCM channel muted.",
                    val ? "success" : "info"
                  );
                }}
                className={`flex items-center gap-2 border font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                  fcmEnabled 
                    ? "bg-[#B74A26]/10 border-[#B74A26]/30 text-[#B74A26]" 
                    : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>FCM {fcmEnabled ? "Active" : "Muted"}</span>
              </button>

              {/* Sound status toggle */}
              <button
                onClick={() => {
                  const val = !soundEnabled;
                  setSoundEnabled(val);
                  if (val) {
                    playSuccessPop();
                  }
                  logActivity(
                    "Tactile Audio " + (val ? "Unmuted" : "Muted"),
                    val ? "Soro micro-sound synthesizers active." : "Chimes muted.",
                    "info"
                  );
                }}
                className={`flex items-center gap-2 border font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
                  soundEnabled 
                    ? "bg-[#7A8452]/10 border-[#7A8452]/30 text-[#7A8452]" 
                    : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? "Audio On" : "Muted"}</span>
              </button>

              {/* Push Dispatcher Tester */}
              <button
                onClick={() => {
                  triggerSimulatedFCMPush(
                    "📅 Discovery Follow-up",
                    "Tomorrow's interview with Marcus Thorne (NextFlow) is scheduled for 10:00 AM.",
                    "Marcus Thorne"
                  );
                  logActivity("Alert Dispatched", "Dispatched discovery timeline notification.", "info");
                }}
                className="bg-[#1F1612] hover:bg-[#B74A26] text-[#FDFBF2] font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Test Notification
              </button>
            </div>

          </div>

          {/* Connected VAPID FCM registration credential details & Gemini API secret hint */}
          <div className="pt-3.5 border-t border-[#1F1612]/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px] font-mono text-[#1F1612]/50">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452] animate-pulse"></span>
              <span>FCM Registration token: <code className="bg-[#1F1612]/5 px-1.5 py-0.5 rounded font-bold">Bk4SoroCrmVapidActiveProdKey</code></span>
            </div>
            <div className="flex items-center gap-1.5 text-[#B74A26] font-bold">
              <Sparkles className="w-3 h-3 text-[#B74A26]" />
              <span>To add your Gemini API Key: Settings menu (gear icon top-right) &gt; Secrets &gt; soroCRM</span>
            </div>
          </div>
        </div>

        {/* Dashboard Analytics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Card: Lead Found */}
          <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Lead Found</p>
              <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{leadCount}</h4>
            </div>
            <span className="p-2.5 rounded-xl bg-[#B74A26]/10 text-[#B74A26]">
              <Layers className="w-5 h-5" />
            </span>
          </div>

          {/* Card: Engaged */}
          <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Prospect (Engaged)</p>
              <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{prospectCount}</h4>
            </div>
            <span className="p-2.5 rounded-xl bg-[#CFA331]/10 text-[#CFA331]">
              <MessageSquare className="w-5 h-5" />
            </span>
          </div>

          {/* Card: Success Closed */}
          <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Client (Closed)</p>
              <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{clientCount}</h4>
            </div>
            <span className="p-2.5 rounded-xl bg-[#7A8452]/10 text-[#7A8452]">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>

          {/* Card: Soro Coach status */}
          <div className="bg-[#B74A26]/5 border border-[#B74A26]/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] uppercase font-bold tracking-tighter text-[#B74A26]">Sorizzy AI Status</p>
              <h4 className="text-sm font-sans font-bold mt-1 text-[#1F1612] flex items-center gap-1">
                Proactive Active <Sparkles className="w-3.5 h-3.5 text-[#B74A26] inline" />
              </h4>
            </div>
            <span className="p-2.5 rounded-xl bg-[#B74A26]/10 text-[#B74A26]">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>

        </div>

        {/* Omni-Input Capture Component */}
        <OmniInput onParse={handleParseLead} isParsing={isParsing} />

        {/* Kanban Board Layout */}
        <KanbanBoard
          leads={leads}
          onUpdateLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onSelectLead={setSelectedLead}
          selectedLeadId={selectedLead?.id}
          onAddNewLead={handleAddNewLead}
          isViewer={isViewer}
        />

        {/* Live Event Log & Audit Ledger */}
        <div className="bg-white/40 border border-[#1F1612]/10 rounded-2xl p-5 shadow-sm space-y-4 max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 border-b border-[#1F1612]/5 pb-3">
            <History className="w-4 h-4 text-[#1F1612]/50" />
            <h4 className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/70">
              Discovery Pipeline Audit Ledger
            </h4>
          </div>

          {/* Activity Logs Rows */}
          <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-[#1F1612]/40 italic py-2">No pipeline activities recorded yet.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between text-xs border-b border-[#1F1612]/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-start space-x-3">
                    <span className="text-[10px] font-mono text-[#1F1612]/30 mt-0.5">{log.timestamp}</span>
                    <div>
                      <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md mr-2 ${
                        log.type === "success" 
                          ? "bg-[#7A8452]/10 text-[#7A8452]" 
                          : log.type === "warning" 
                          ? "bg-[#B74A26]/10 text-[#B74A26]" 
                          : "bg-[#1F1612]/5 text-[#1F1612]/60"
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[#1F1612]/80">{log.details}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#1F1612]/40 font-semibold">{log.leadName}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      {/* Playful Toast Notifications Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex gap-3 items-start backdrop-blur-md transition-all ${
                toast.type === "success"
                  ? "bg-[#7A8452]/95 text-white border-[#7A8452]/40"
                  : toast.type === "warning"
                  ? "bg-[#B74A26]/95 text-white border-[#B74A26]/40"
                  : "bg-white/95 text-[#1F1612] border-[#1F1612]/15"
              }`}
            >
              {toast.type === "success" ? (
                <div className="p-1 rounded bg-white/20 text-white flex-shrink-0">
                  <Check className="w-4 h-4 font-bold" />
                </div>
              ) : toast.type === "warning" ? (
                <div className="p-1 rounded bg-white/20 text-white flex-shrink-0">
                  <AlertCircle className="w-4 h-4 font-bold" />
                </div>
              ) : (
                <div className="p-1 rounded bg-[#1F1612]/10 text-[#1F1612] flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-serif font-bold italic text-sm leading-none mb-1">{toast.title}</h4>
                <p className="text-xs opacity-90 leading-normal">{toast.desc}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* FCM Cloud Push Notification Alerts */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {simulatedNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              className="pointer-events-auto bg-[#1F1612]/95 text-white p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-2 backdrop-blur-lg w-80 ring-4 ring-[#1F1612]/20"
            >
              {/* FCM Cloud Push Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[9px] font-mono text-white/50 tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3 h-3 text-[#B74A26] animate-pulse" />
                  <span className="font-bold uppercase">FCM CLOUD PUSH</span>
                </div>
                <span>{notif.timestamp}</span>
              </div>

              {/* Alert Content */}
              <div className="space-y-1">
                <div className="text-xs font-serif font-bold italic text-[#FDFBF2] flex items-center gap-1.5">
                  <span>{notif.title}</span>
                </div>
                <p className="text-[11px] text-white/80 leading-snug">{notif.body}</p>
              </div>

              {/* Quick interactive Actions */}
              <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono border-t border-white/5 mt-1">
                <span className="text-[#B74A26] font-bold">📲 Lead: {notif.leadName}</span>
                <button
                  onClick={() => {
                    setSimulatedNotifications((prev) => prev.filter((n) => n.id !== notif.id));
                    if (soundEnabled) {
                      playSuccessPop();
                    }
                  }}
                  className="px-2 py-0.5 bg-white/10 hover:bg-[#B74A26] text-white rounded-md transition-colors cursor-pointer uppercase text-[9px] tracking-tight"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {leadIdToConfirmDelete && (() => {
          const leadToDelete = leads.find((l) => l.id === leadIdToConfirmDelete);
          if (!leadToDelete) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#FDFBF2] rounded-3xl p-6 border border-[#1F1612]/15 max-w-sm w-full space-y-4 shadow-2xl relative"
              >
                <button
                  onClick={() => setLeadIdToConfirmDelete(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1F1612]/5 text-[#1F1612]/40 hover:text-[#1F1612] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-3 text-[#B74A26]">
                  <div className="p-2 rounded-xl bg-[#B74A26]/10 text-[#B74A26]">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#B74A26] block">Warning action</span>
                    <h3 className="font-serif font-bold text-lg text-[#1F1612]">Delete Lead?</h3>
                  </div>
                </div>

                <p className="text-xs text-[#1F1612]/85 leading-relaxed">
                  Are you sure you want to permanently delete <b>{leadToDelete.name}</b> from your discovery pipeline? This cannot be undone.
                </p>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setLeadIdToConfirmDelete(null)}
                    className="flex-1 px-4 py-2 border border-[#1F1612]/15 hover:bg-[#1F1612]/5 text-xs font-bold text-[#1F1612]/70 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const id = leadIdToConfirmDelete;
                      setLeadIdToConfirmDelete(null);
                      setLeads((prev) => prev.filter((l) => l.id !== id));
                      if (selectedLead?.id === id) {
                        setSelectedLead(null);
                      }
                      if (currentTeam) {
                        await deleteLeadForTeam(currentTeam.id, id);
                      }
                      logActivity("Lead Deleted", `Permanently removed "${leadToDelete.name}" from pipeline.`, "warning");
                    }}
                    className="flex-1 px-4 py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUser={user}
        currentTeam={currentTeam}
        myTeams={myTeams}
        teamMembers={teamMembers}
        onTeamSelected={(team) => {
          setCurrentTeam(team);
          logActivity("Workspace Switched", `Switched active customer discovery board to "${team.name}".`, "info");
        }}
        onTeamCreated={(team) => {
          setMyTeams((prev) => [...prev, team]);
          setCurrentTeam(team);
          logActivity("Workspace Created", `Successfully deployed a secure workspace pipeline "${team.name}".`, "success");
        }}
        onTeamDeleted={(deletedTeamId) => {
          setMyTeams((prev) => {
            const updated = prev.filter((t) => t.id !== deletedTeamId);
            if (currentTeam?.id === deletedTeamId) {
              if (updated.length > 0) {
                setCurrentTeam(updated[0]);
              } else {
                setCurrentTeam(null);
              }
            }
            return updated;
          });
          setIsTeamModalOpen(false);
          logActivity(
            "Workspace Deleted",
            "The workspace and its associated customer data have been deleted.",
            "warning"
          );
        }}
        onLogActivity={(action, details, type) => logActivity(action, details, type)}
      />

    </div>
  );
}
