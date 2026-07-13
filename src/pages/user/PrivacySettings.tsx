import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  Users,
  Share2,
  Loader2,
  CheckCircle2,
  Bell,
  Activity,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type VisibilityLevel = {
  key: string;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const VISIBILITY_LEVELS: VisibilityLevel[] = [
  { key: "public", label: "Public", desc: "Anyone can see your activity history and badges", Icon: Eye },
  { key: "friends", label: "Friends Only", desc: "Only your connections can see your activity", Icon: Users },
  { key: "private", label: "Private", desc: "Your activity is visible only to you", Icon: EyeOff },
];

export default function PrivacySettings() {
  const [user, setUser] = useState<{ id?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibility, setVisibility] = useState<string>("public");
  const [shareCheckIns, setShareCheckIns] = useState<boolean>(true);
  const [showInDirectory, setShowInDirectory] = useState<boolean>(true);
  const [shareVibeReports, setShareVibeReports] = useState<boolean>(true);
  const [eventAlerts, setEventAlerts] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u: any) => {
        setUser(u);
        setVisibility(u.privacy_visibility || "public");
        setShareCheckIns(u.privacy_share_checkins !== false);
        setShowInDirectory(u.privacy_show_in_directory !== false);
        setShareVibeReports(u.privacy_share_vibes !== false);
        setEventAlerts(u.privacy_event_alerts !== false);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({
        privacy_visibility: visibility,
        privacy_share_checkins: shareCheckIns,
        privacy_show_in_directory: showInDirectory,
        privacy_share_vibes: shareVibeReports,
        privacy_event_alerts: eventAlerts,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // ignore
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Shield className="w-16 h-16 text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to manage privacy</h2>
          <p className="text-zinc-500 text-sm">Control who sees your activity and check-ins.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/privacy-settings")} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sign In
        </Button>
      </div>
    );
  }

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
            <Shield className="w-6 h-6 text-orange-400" /> Privacy Settings
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Control your data, activity visibility, and check-in sharing.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Activity Visibility */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Activity History Visibility</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4">Who can see the venues you've checked into.</p>
          <div className="space-y-2">
            {VISIBILITY_LEVELS.map((lvl) => {
              const active = visibility === lvl.key;
              const LIcon = lvl.Icon;
              return (
                <button
                  key={lvl.key}
                  onClick={() => setVisibility(lvl.key)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 flex items-start gap-3 transition",
                    active ? "bg-orange-500/10 border-orange-500/40" : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <LIcon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", active ? "text-orange-400" : "text-zinc-500")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold", active ? "text-white" : "text-zinc-300")}>{lvl.label}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{lvl.desc}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    active ? "border-orange-500 bg-orange-500" : "border-zinc-700"
                  )}>
                    {active && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Check-in Sharing */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Share2 className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Check-in Sharing</h2>
          </div>
          <div className="space-y-3">
            <ToggleRow
              label="Share check-ins to event chat"
              desc="Automatically post when you check in at an event"
              value={shareCheckIns}
              onChange={setShareCheckIns}
            />
            <ToggleRow
              label="Share vibe reports publicly"
              desc="Your crowd and music vibe updates help other users"
              value={shareVibeReports}
              onChange={setShareVibeReports}
            />
            <ToggleRow
              label="Appear in venue directory"
              desc="Show your profile as an active community member"
              value={showInDirectory}
              onChange={setShowInDirectory}
            />
          </div>
        </section>

        {/* Data & Alerts */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Data & Notifications</h2>
          </div>
          <div className="space-y-3">
            <ToggleRow
              label="Saved event alerts"
              desc="Get notified when your saved events start or heat up"
              value={eventAlerts}
              onChange={setEventAlerts}
            />
          </div>
        </section>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {saving ? "Saving…" : "Save Privacy Settings"}
        </Button>
        {saved && (
          <p className="text-green-400 text-xs text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Privacy settings saved
          </p>
        )}

        <Link to={createPageUrl("AccountSecurity")}>
          <p className="text-zinc-500 text-xs text-center hover:text-orange-400 transition">
            Looking for password & linked accounts? → Account Security
          </p>
        </Link>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 bg-zinc-950/50 border border-zinc-800 rounded-xl p-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-11 h-6 rounded-full transition flex-shrink-0 mt-0.5",
          value ? "bg-orange-500" : "bg-zinc-700"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
          value ? "left-[22px]" : "left-0.5"
        )} />
      </button>
    </div>
  );
}