import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Send, CheckCircle2, MessageSquare, Bug, Lightbulb, Heart } from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type FeedbackType = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string };

const TYPES: FeedbackType[] = [
  { key: "feature_request", label: "Feature request", icon: Lightbulb, color: "orange" },
  { key: "bug_report", label: "Bug report", icon: Bug, color: "red" },
  { key: "general", label: "General feedback", icon: Heart, color: "purple" },
];

const colorMap: Record<string, string> = {
  orange: "border-orange-500 bg-orange-500/10 text-orange-400",
  red: "border-red-500 bg-red-500/10 text-red-400",
  purple: "border-purple-500 bg-purple-500/10 text-purple-400",
  muted: "border-zinc-700 bg-zinc-900 text-zinc-400",
};

type CurrentUser = { email?: string } | null;

export default function Feedback() {
  const [user, setUser] = useState<CurrentUser>(null);
  const [type, setType] = useState<string>("general");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.Feedback.create({
        feedback_type: type,
        subject: subject.trim(),
        message: message.trim(),
        user_email: user?.email || null,
      });
      setSubmitted(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      setError("Couldn't submit feedback. Please try again.");
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
          <h1 className="text-2xl font-bold text-white">Feedback</h1>
          <p className="text-zinc-500 text-sm mt-1">Suggest a feature, report a bug, or share thoughts.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Thank you!</h2>
            <p className="text-zinc-400 text-sm mb-5">Your feedback has been received. We read every submission.</p>
            <Button
              variant="outline"
              onClick={() => setSubmitted(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Submit Another
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type selector */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-2">What kind of feedback?</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => {
                  const active = type === t.key;
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setType(t.key)}
                      className={cn(
                        "rounded-xl border p-3 flex flex-col items-center gap-1.5 transition",
                        active ? colorMap[t.color] : `${colorMap.muted} hover:border-zinc-600`
                      )}
                    >
                      <TIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Subject (optional)</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short headline for your feedback…"
                maxLength={100}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1.5">Your feedback *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Tell us what's on your mind…"
                maxLength={2000}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
              />
              <p className="text-[10px] text-zinc-600 mt-1 text-right">{message.length}/2000</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={submitting || !message.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Sending…" : "Submit Feedback"}
            </Button>

            <p className="text-center text-xs text-zinc-600">
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Submitted {user ? `as ${user.email}` : "anonymously"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}