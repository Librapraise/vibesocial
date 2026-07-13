import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bug, Send, Loader2, CheckCircle2, AlertTriangle, Smartphone, Monitor } from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type Severity = { key: string; label: string; color: string };

const SEVERITY: Severity[] = [
  { key: "low", label: "Minor", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { key: "medium", label: "Moderate", color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" },
  { key: "high", label: "Severe", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { key: "critical", label: "Critical", color: "text-red-400 border-red-500/30 bg-red-500/10" },
];

type Platform = { key: string; label: string; Icon: React.ComponentType<{ className?: string }> };

const PLATFORMS: Platform[] = [
  { key: "ios", label: "iOS App", Icon: Smartphone },
  { key: "android", label: "Android App", Icon: Smartphone },
  { key: "web", label: "Web Browser", Icon: Monitor },
];

export default function ReportBug() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [severity, setSeverity] = useState<string>("medium");
  const [platform, setPlatform] = useState<string>("web");
  const [steps, setSteps] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    base44.auth.me().then((u: any) => setUser(u)).catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const fullMessage = [
        `Severity: ${severity}`,
        `Platform: ${platform}`,
        steps.trim() ? `\nSteps to reproduce:\n${steps.trim()}` : "",
        `\nDescription:\n${message.trim()}`,
      ].join("\n");

      await base44.entities.Feedback.create({
        feedback_type: "bug_report",
        subject: subject.trim() || "Bug report",
        message: fullMessage,
        user_email: user?.email || null,
      });
      setSubmitted(true);
      setSubject("");
      setMessage("");
      setSteps("");
    } catch (err) {
      setError("Couldn't submit your report. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bug className="w-6 h-6 text-orange-400" /> Report a Bug
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Help us fix issues — tell us what went wrong.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Bug report submitted!</h2>
            <p className="text-zinc-400 text-sm mb-5">Our team will investigate. Thank you for helping improve the app.</p>
            <Button variant="outline" onClick={() => setSubmitted(false)} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Report Another Issue
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Severity */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-2">How severe is this issue?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSeverity(s.key)}
                    className={cn(
                      "rounded-xl border p-3 text-center transition",
                      severity === s.key ? s.color : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    <p className="text-xs font-medium">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-2">Where did it happen?</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const active = platform === p.key;
                  const PIcon = p.Icon;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPlatform(p.key)}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col items-center gap-1.5 transition",
                        active ? "bg-orange-500/10 border-orange-500/40 text-orange-400" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      <PIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Brief title *</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={120}
                placeholder="e.g. Chat messages not loading on event page"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              />
            </div>

            {/* Steps */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Steps to reproduce (optional)</label>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder={"1. Opened event page\n2. Typed a message\n3. Pressed send\n4. Message disappeared"}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">What happened? *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={2000}
                placeholder="Describe the issue in detail. What did you expect to happen instead?"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
              />
              <p className="text-[10px] text-zinc-600 mt-1 text-right">{message.length}/2000</p>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400/80 text-xs">
                For urgent safety concerns, call 911. This form is for app bugs and technical issues only.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" disabled={submitting || !message.trim()} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting…" : "Submit Bug Report"}
            </Button>

            <p className="text-center text-xs text-zinc-600">
              Submitted {user ? `as ${user.email}` : "anonymously"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}