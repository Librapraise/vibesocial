import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  Lock,
  Link2,
  Eye,
  EyeOff,
  Users,
  Loader2,
  CheckCircle2,
  KeyRound,
  Smartphone,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type PrivacyLevel = {
  key: string;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const PRIVACY_LEVELS: PrivacyLevel[] = [
  {
    key: "public",
    label: "Public",
    desc: "Anyone can see your check-in history and badges",
    Icon: Eye,
  },
  {
    key: "friends",
    label: "Friends Only",
    desc: "Only people you follow can see your activity",
    Icon: Users,
  },
  {
    key: "private",
    label: "Private",
    desc: "Your check-in history is visible only to you",
    Icon: EyeOff,
  },
];

type LinkedAccount = { name: string; icon: string; desc: string; connected: boolean };

type CurrentUser = { email?: string; check_in_privacy?: string } | null;

export default function AccountSecurity() {
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [privacyLevel, setPrivacyLevel] = useState<string>("public");
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    base44.auth
      .me()
      .then((u: any) => {
        setUser(u);
        setPrivacyLevel(u.check_in_privacy || "public");
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleSavePrivacy = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await base44.auth.updateMe({ check_in_privacy: privacyLevel });
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
          <h2 className="text-xl font-bold text-white mb-1">Sign in to manage security</h2>
          <p className="text-zinc-500 text-sm">Update your password, linked accounts, and privacy.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/account-security")} className="bg-orange-500 hover:bg-orange-600 text-white">
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
            <Shield className="w-6 h-6 text-orange-400" /> Account Security
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your password, linked accounts, and privacy.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Password */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Password</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            Password changes are handled securely through the login system. Use the button below to reset your password.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => base44.auth.redirectToLogin("/account-security")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Lock className="w-4 h-4" /> Reset Password
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Smartphone className="w-3.5 h-3.5" />
              Signed in as {user.email}
            </div>
          </div>
        </section>

        {/* Linked Accounts */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Linked Accounts</h2>
          </div>
          <div className="space-y-3">
            {([
              { name: "Google", icon: "🔗", desc: "Sign in with Google", connected: false },
              { name: "Apple", icon: "🍎", desc: "Sign in with Apple", connected: false },
            ] as LinkedAccount[]).map((acct) => (
              <div key={acct.name} className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{acct.icon}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{acct.name}</p>
                    <p className="text-zinc-500 text-xs">{acct.desc}</p>
                  </div>
                </div>
                {acct.connected ? (
                  <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" disabled className="border-zinc-700 text-zinc-500 text-xs">
                    Connect
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-zinc-600 text-xs mt-3">
            Social login integrations will appear here once enabled for your account.
          </p>
        </section>

        {/* Privacy */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Check-in Privacy</h2>
          </div>
          <p className="text-zinc-400 text-sm mb-4">Control who can see your check-in history and badges.</p>

          <div className="space-y-2 mb-5">
            {PRIVACY_LEVELS.map((lvl) => {
              const active = privacyLevel === lvl.key;
              const LIcon = lvl.Icon;
              return (
                <button
                  key={lvl.key}
                  onClick={() => setPrivacyLevel(lvl.key)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 flex items-start gap-3 transition",
                    active
                      ? "bg-orange-500/10 border-orange-500/40"
                      : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
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

          <Button
            onClick={handleSavePrivacy}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Privacy Settings"}
          </Button>
          {saved && (
            <p className="text-green-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Privacy settings saved
            </p>
          )}
        </section>
      </div>
    </div>
  );
}