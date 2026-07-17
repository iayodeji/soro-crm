"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw } from "lucide-react";

type Sender = { sendAsEmail: string; displayName?: string; isDefault?: boolean };

export default function MailPreferencesPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [selectedSender, setSelectedSender] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSenders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/gmail/senders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your Gmail sender addresses.");
      setSenders(data.senders || []);
      setSelectedSender(data.preferred || "");
    } catch (caught: any) {
      setError(caught.message || "Could not load your Gmail sender addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSenders(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSender) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/workspace/gmail/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEmail: selectedSender }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your mail preference.");
      setMessage("Saved. Future emails will use this address.");
    } catch (caught: any) {
      setError(caught.message || "Could not save your mail preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <Link href="/crm" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#1F1612]/12 bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1F1612]/65 transition-colors hover:bg-[#1F1612]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26]"><ArrowLeft className="h-3.5 w-3.5" />Back to People</Link>
      <header className="mt-6 border-b border-[#1F1612]/15 pb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B74A26]/10 text-[#B74A26]"><Mail className="h-5 w-5" /></div>
        <h1 className="mt-4 font-serif text-3xl sm:text-4xl font-bold italic tracking-tight text-[#1F1612]">Mail preferences</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#1F1612]/60">Choose the verified Gmail address you want Soro to use when sending outreach. This applies only to your own account.</p>
      </header>

      <section className="mt-7 rounded-2xl border border-[#1F1612]/12 bg-white/75 p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#1F1612]/10 pb-4"><div><h2 className="font-serif text-xl font-bold italic">Default sender</h2><p className="mt-1 text-xs leading-5 text-[#1F1612]/55">Only addresses verified under Gmail’s “Send mail as” settings can be selected.</p></div><button type="button" onClick={() => void loadSenders()} disabled={loading} aria-label="Refresh Gmail sender addresses" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1F1612]/12 bg-white text-[#1F1612]/60 hover:bg-[#1F1612]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
        {error ? <div role="alert" className="mt-5 rounded-xl border border-[#B74A26]/25 bg-[#B74A26]/5 p-4 text-sm leading-6 text-[#9E3D1F]"><p>{error}</p><p className="mt-2">Open your profile menu, connect or reconnect Google, and approve Mail access; then refresh this page.</p></div> : <form onSubmit={save} className="mt-6 space-y-5"><div><label htmlFor="default-sender" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Send future mail from</label><select id="default-sender" value={selectedSender} onChange={(event) => { setSelectedSender(event.target.value); setMessage(""); }} disabled={loading || senders.length === 0} className="mt-2 min-h-12 w-full rounded-xl border border-[#1F1612]/15 bg-white px-3 text-sm text-[#1F1612] outline-none focus:ring-2 focus:ring-[#B74A26]/30 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{loading ? "Loading approved Gmail addresses…" : senders.length === 0 ? "No approved sender addresses" : "Choose a sender address"}</option>{senders.map((sender) => <option key={sender.sendAsEmail} value={sender.sendAsEmail}>{sender.displayName ? `${sender.displayName} — ` : ""}{sender.sendAsEmail}{sender.isDefault ? " (Gmail default)" : ""}</option>)}</select></div>{message && <p role="status" className="flex items-center gap-2 rounded-xl bg-[#7A8452]/10 px-3 py-2.5 text-sm text-[#536035]"><CheckCircle2 className="h-4 w-4 shrink-0" />{message}</p>}<button disabled={loading || saving || !selectedSender} className="min-h-11 rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#9E3D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Save mail preference"}</button></form>}
      </section>
    </main>
  );
}
