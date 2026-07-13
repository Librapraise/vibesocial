import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Users, AlertTriangle, Heart, MessageSquare, Flag, Check, X } from "lucide-react";
import { createPageUrl } from "@/utils";

type Principle = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

const PRINCIPLES: Principle[] = [
  {
    icon: Heart,
    title: "Be respectful",
    desc: "Treat fellow guests, staff, and organizers with kindness. Harassment of any kind is not tolerated.",
  },
  {
    icon: Users,
    title: "Look out for each other",
    desc: "If someone looks unwell or uncomfortable, check in or alert venue staff. We're a community.",
  },
  {
    icon: ShieldCheck,
    title: "Verify honestly",
    desc: "Only check in at events you actually attend. Fake check-ins undermine the trust of the vibe system.",
  },
  {
    icon: MessageSquare,
    title: "Keep chat real",
    desc: "Share genuine updates. No spam, promotion, or misleading info in event chats.",
  },
];

const DONT: string[] = [
  "Hate speech, slurs, or discriminatory language",
  "Sexual harassment or unwanted advances",
  "Threats, intimidation, or doxxing",
  "Sharing private information about others",
  "Fake status updates or coordinated review bombing",
  "Selling tickets outside the platform",
];

function ReportForm() {
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [category, setCategory] = useState<string>("");
  const [details, setDetails] = useState<string>("");

  if (submitted) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-white font-semibold mb-1">Report received</p>
        <p className="text-zinc-400 text-sm">Our moderation team will review it shortly.</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400 mt-3"
          onClick={() => {
            setSubmitted(false);
            setCategory("");
            setDetails("");
          }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!details.trim()) return;
        // Store report locally — could be wired to a backend entity later
        const reports = JSON.parse(localStorage.getItem("reported_incidents") || "[]");
        reports.push({ category, details: details.trim(), at: new Date().toISOString() });
        localStorage.setItem("reported_incidents", JSON.stringify(reports));
        setSubmitted(true);
      }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
    >
      <div>
        <label className="text-xs text-zinc-400 font-medium block mb-1.5">What happened?</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500/40"
        >
          <option value="">Select a category…</option>
          <option>Harassment or hate speech</option>
          <option>Fake check-in or status update</option>
          <option>Spam in event chat</option>
          <option>Inappropriate content</option>
          <option>Safety concern at a venue</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-zinc-400 font-medium block mb-1.5">Tell us more</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          required
          rows={4}
          placeholder="Describe what you saw, where, and who was involved (if known)…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
        />
      </div>
      <Button type="submit" className="bg-red-500/80 hover:bg-red-500 text-white">
        <Flag className="w-4 h-4" /> Submit Report
      </Button>
    </form>
  );
}

export default function CommunityGuidelines() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white font-black text-sm">VS</span>
            VibeSocial
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 flex items-center justify-center gap-2">
            Community Guidelines
          </h1>
          <p className="text-zinc-400 text-sm">
            How we keep VibeSocial fun, safe, and real.
          </p>
        </div>

        <div className="space-y-8">
        {/* Principles */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRINCIPLES.map((p) => {
            const PIcon = p.icon;
            return (
              <div key={p.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
                  <PIcon className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1">{p.title}</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </section>

        {/* Don'ts */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">What's not allowed</h2>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
            {DONT.map((d) => (
              <div key={d} className="flex items-center gap-3 p-4">
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-zinc-300 text-sm">{d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reporting */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Report inappropriate conduct</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-4">
            See something that breaks these guidelines? Let our moderation team know.
          </p>
          <ReportForm />
        </section>
      </div>
    </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-zinc-500 text-sm mt-auto">
        <p>&copy; 2026 VibeSocial Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}