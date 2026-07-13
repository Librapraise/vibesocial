import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bell, ShieldCheck, Loader2, Save, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";

type NotifSettings = {
  push_enabled: boolean;
  event_start_alerts: boolean;
  status_updates: boolean;
  crowd_level_changes: boolean;
  wait_time_alerts: boolean;
  chat_mentions: boolean;
  weekly_digest: boolean;
};

type SettingDef = { key: keyof NotifSettings; label: string; desc: string };

const DEFAULT_SETTINGS: NotifSettings = {
  push_enabled: false,
  event_start_alerts: true,
  status_updates: true,
  crowd_level_changes: true,
  wait_time_alerts: false,
  chat_mentions: true,
  weekly_digest: true,
};

const SETTING_DEFS: SettingDef[] = [
  { key: "event_start_alerts", label: "Event start alerts", desc: "Get notified when your saved events are about to start." },
  { key: "status_updates", label: "Status updates", desc: "Real-time crowd and vibe updates from events you saved." },
  { key: "crowd_level_changes", label: "Crowd level changes", desc: "Alerts when a venue fills up or hits capacity." },
  { key: "wait_time_alerts", label: "Wait time alerts", desc: "Notified when wait times exceed 15 minutes." },
  { key: "chat_mentions", label: "Chat activity", desc: "New messages in event chats you've joined." },
  { key: "weekly_digest", label: "Weekly digest", desc: "A summary of the hottest events each week." },
];

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  notification_settings?: Partial<NotifSettings>;
} | null;

export default function NotificationSettings() {
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [pushSupported] = useState<boolean>(() => typeof Notification !== "undefined");

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => {
        setUser(u);
        const stored = u && (u.notification_settings || null);
        if (stored) setSettings({ ...DEFAULT_SETTINGS, ...stored });
        // Reconcile push_enabled with browser permission
        if (pushSupported && Notification.permission === "granted") {
          setSettings((s) => ({ ...s, push_enabled: true }));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [pushSupported]);

  const requestPushPermission = async (enabled: boolean) => {
    if (!enabled) {
      setSettings((s) => ({ ...s, push_enabled: false }));
      return;
    }
    if (!pushSupported) return;
    const perm = await Notification.requestPermission();
    setSettings((s) => ({ ...s, push_enabled: perm === "granted" }));
  };

  const toggle = (key: keyof NotifSettings) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ notification_settings: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      // fall back to localStorage so settings persist for guests
      localStorage.setItem("notification_settings", JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
          <p className="text-zinc-500 text-sm mt-1">Choose what updates you receive.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Push notifications master toggle */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Push notifications</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {pushSupported
                    ? "Enable browser notifications to receive alerts in real time."
                    : "Browser notifications aren't supported on this device."}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.push_enabled}
              onCheckedChange={requestPushPermission}
              disabled={!pushSupported}
            />
          </div>
          {!pushSupported && (
            <p className="text-[11px] text-zinc-600 mt-3 pl-13">Your browser doesn't support push, but in-app alerts still work.</p>
          )}
        </section>

        {/* Update types */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
          <div className="p-5 pb-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-400" /> Event updates
            </h2>
            <p className="text-zinc-500 text-xs mt-0.5">Pick which kinds of alerts you want to receive.</p>
          </div>
          {SETTING_DEFS.map((s) => (
            <div key={s.key} className="p-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-zinc-100 text-sm font-medium">{s.label}</p>
                <p className="text-zinc-500 text-xs mt-0.5">{s.desc}</p>
              </div>
              <Switch checked={settings[s.key]} onCheckedChange={() => toggle(s.key)} />
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
          {saved && (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}