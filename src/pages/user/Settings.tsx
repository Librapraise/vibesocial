import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Shield,
  Bell,
  Sparkles,
  Loader2,
  CheckCircle2,
  Lock,
  Link2,
  KeyRound,
  Smartphone,
  Eye,
  EyeOff,
  Users,
  Share2,
  Activity,
  ArrowLeft
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

// --- Notification Types & Constants ---
type NotifSettings = {
  push_enabled: boolean;
  event_start_alerts: boolean;
  status_updates: boolean;
  crowd_level_changes: boolean;
  wait_time_alerts: boolean;
  chat_mentions: boolean;
  weekly_digest: boolean;
};

const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  push_enabled: false,
  event_start_alerts: true,
  status_updates: true,
  crowd_level_changes: true,
  wait_time_alerts: false,
  chat_mentions: true,
  weekly_digest: true,
};

const NOTIF_DEFS = [
  { key: "event_start_alerts" as keyof NotifSettings, label: "Event start alerts", desc: "Get notified when your saved events are about to start." },
  { key: "status_updates" as keyof NotifSettings, label: "Status updates", desc: "Real-time crowd and vibe updates from events you saved." },
  { key: "crowd_level_changes" as keyof NotifSettings, label: "Crowd level changes", desc: "Alerts when a venue fills up or hits capacity." },
  { key: "wait_time_alerts" as keyof NotifSettings, label: "Wait time alerts", desc: "Notified when wait times exceed 15 minutes." },
  { key: "chat_mentions" as keyof NotifSettings, label: "Chat activity", desc: "New messages in event chats you've joined." },
  { key: "weekly_digest" as keyof NotifSettings, label: "Weekly digest", desc: "A summary of the hottest events each week." },
];

// --- Scene/Vibe preferences ---
const VIBE_INTERESTS_LIST = [
  "Techno", "House", "Hip Hop", "R&B", "Jazz", "Latin", "Rock", "Pop", 
  "Cocktails", "Craft Beer", "Rooftops", "Live Bands", "Speakeasies", "Dance Club"
];

// --- Privacy Types & Constants ---
const VISIBILITY_LEVELS = [
  { key: "public", label: "Public", desc: "Anyone can see your activity history and badges", Icon: Eye },
  { key: "friends", label: "Friends Only", desc: "Only your connections can see your activity", Icon: Users },
  { key: "private", label: "Private", desc: "Your activity is visible only to you", Icon: EyeOff },
];

type CurrentUser = {
  id?: string;
  email: string;
  name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  social_links?: Record<string, string>;
  vibe_preferences?: string[];
  privacy_settings?: {
    is_private?: boolean;
    show_on_leaderboard?: boolean;
    visibility?: string;
    share_checkins?: boolean;
    show_in_directory?: boolean;
    share_vibes?: boolean;
  };
  subscription_tier?: string;
  notification_settings?: Partial<NotifSettings>;
} | null;

type TabId = "profile" | "vibes" | "privacy" | "notifications";

export default function Settings() {
  const { toast } = useToast();
  const { user: authUser, checkAppState, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [user, setUser] = useState<CurrentUser>(authUser);
  const [loading, setLoading] = useState<boolean>(!authUser);
  const [saving, setSaving] = useState<boolean>(false);

  // Profile Form States
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [spotifyHandle, setSpotifyHandle] = useState("");

  // Privacy States
  const [visibility, setVisibility] = useState("public");
  const [shareCheckIns, setShareCheckIns] = useState(true);
  const [showInDirectory, setShowInDirectory] = useState(true);
  const [shareVibeReports, setShareVibeReports] = useState(true);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);

  // Notification States
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF_SETTINGS);
  const [pushSupported] = useState<boolean>(() => typeof Notification !== "undefined");

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setEditName(authUser.name || "");
      setEditBio(authUser.bio || "");
      setInstagramHandle(authUser.social_links?.instagram || "");
      setSpotifyHandle(authUser.social_links?.spotify || "");

      const ps = authUser.privacy_settings as any;
      setVisibility(ps?.visibility || "public");
      setShareCheckIns(ps?.share_checkins !== false);
      setShowInDirectory(ps?.show_in_directory !== false);
      setShareVibeReports(ps?.share_vibes !== false);
      setIsPrivateAccount(ps?.is_private || false);
      setShowOnLeaderboard(ps?.show_on_leaderboard !== false);

      const storedNotifs = authUser.notification_settings;
      if (storedNotifs) setNotifSettings({ ...DEFAULT_NOTIF_SETTINGS, ...storedNotifs });
      setLoading(false);
    }

    base44.auth
      .me()
      .then((u: any) => {
        if (u) {
          setUser(u);
          setEditName(u.name || "");
          setEditBio(u.bio || "");
          setInstagramHandle(u.social_links?.instagram || "");
          setSpotifyHandle(u.social_links?.spotify || "");

          const ps2 = u.privacy_settings as any;
          setVisibility(ps2?.visibility || "public");
          setShareCheckIns(ps2?.share_checkins !== false);
          setShowInDirectory(ps2?.show_in_directory !== false);
          setShareVibeReports(ps2?.share_vibes !== false);
          setIsPrivateAccount(ps2?.is_private || false);
          setShowOnLeaderboard(ps2?.show_on_leaderboard !== false);

          const storedNotifs = u.notification_settings;
          if (storedNotifs) setNotifSettings({ ...DEFAULT_NOTIF_SETTINGS, ...storedNotifs });
        }
      })
      .catch((err) => {
        console.error("Failed to load user profile from API, using AuthContext fallback:", err);
        if (authUser) {
          setUser(authUser);
        } else {
          setUser(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    // Reconcile push_enabled with browser permission
    if (pushSupported && Notification.permission === "granted") {
      setNotifSettings((s) => ({ ...s, push_enabled: true }));
    }
  }, [pushSupported, authUser]);

  // Request notification permissions
  const requestPushPermission = async (enabled: boolean) => {
    if (!enabled) {
      setNotifSettings((s) => ({ ...s, push_enabled: false }));
      return;
    }
    if (!pushSupported) return;
    const perm = await Notification.requestPermission();
    setNotifSettings((s) => ({ ...s, push_enabled: perm === "granted" }));
  };

  // Toggle notification switches
  const toggleNotif = (key: keyof NotifSettings) => {
    setNotifSettings((s) => ({ ...s, [key]: !s[key] }));
  };

  // Toggle vibe preferences
  const handleToggleVibeTag = async (tag: string) => {
    if (!user) return;
    const current = user.vibe_preferences || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];

    const updatedUser = { ...user, vibe_preferences: updated };
    setUser(updatedUser);

    try {
      await base44.auth.updateMe({ vibe_preferences: updated });
      updateUser({ vibe_preferences: updated });
      toast({
        title: "Preferences Updated",
        description: `Your preference for "${tag}" has been updated.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to update vibe preferences.",
        variant: "destructive",
      });
    }
  };

  // Save Settings handler (combines saving across tabs based on active view)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      let payload: Partial<CurrentUser> = {};

      if (activeTab === "profile") {
        payload = {
          name: editName,
          bio: editBio,
          social_links: {
            instagram: instagramHandle,
            spotify: spotifyHandle,
          },
        };
      } else if (activeTab === "privacy") {
        payload = {
          privacy_settings: {
            visibility,
            share_checkins: shareCheckIns,
            show_in_directory: showInDirectory,
            share_vibes: shareVibeReports,
            is_private: isPrivateAccount,
            show_on_leaderboard: showOnLeaderboard,
          },
        };
      } else if (activeTab === "notifications") {
        payload = {
          notification_settings: notifSettings,
        };
      }

      await base44.auth.updateMe(payload);
      updateUser(payload);
      setUser((prev: any) => ({ ...prev, ...payload }));
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (err) {
      // Fallback for notifications if guest
      if (activeTab === "notifications") {
        localStorage.setItem("notification_settings", JSON.stringify(notifSettings));
        toast({
          title: "Settings Saved (Demo Mode)",
          description: "Your notification settings have been stored locally.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4 p-6 text-center">
        <Shield className="w-16 h-16 text-zinc-800" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to view settings</h2>
          <p className="text-zinc-500 text-sm">Access and update your profile, privacy, and preferences.</p>
        </div>
        <Button
          onClick={() => base44.auth.redirectToLogin("/Settings")}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-xl"
        >
          Sign In
        </Button>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "profile", label: "Profile & Security", icon: User },
    { id: "vibes", label: "Scene Preferences", icon: Sparkles },
    { id: "privacy", label: "Privacy Controls", icon: Shield },
    { id: "notifications", label: "Alerts & Notifications", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900/50 sticky top-16 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Account Settings
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">Customize your identity, notifications, and privacy levels.</p>
          </div>
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-900 hover:text-white rounded-xl text-xs gap-1.5 self-start">
              <ArrowLeft className="w-3.5 h-3.5" /> Back Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-8 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col overflow-x-auto gap-1 border-b md:border-b-0 md:border-r border-zinc-900 pb-4 md:pb-0 md:pr-4 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap md:w-full border border-transparent",
                  active
                    ? "bg-gradient-to-r from-orange-500/15 to-pink-500/5 text-orange-400 border-orange-500/10 shadow-sm"
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", active ? "text-orange-400" : "text-zinc-500")} />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Settings Area */}
        <div className="flex-1 min-w-0">
          {/* TAB 1: PROFILE & SECURITY */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <form onSubmit={handleSave} className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-white">Profile Details</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Update how you appear to others on VibeSocial.</p>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-orange-500/25 flex items-center justify-center font-bold text-orange-400 text-lg shadow-inner">
                    {user.name?.[0] || "U"}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{user.name || "Default Username"}</h4>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Display Name</Label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bio Description</Label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={250}
                    placeholder="Tell the community about your venue style or music taste..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-sm focus-visible:ring-1 focus-visible:ring-orange-500 outline-none min-h-[90px] resize-none"
                  />
                  <p className="text-[10px] text-zinc-600 text-right">{editBio.length}/250 characters</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      Instagram Handle
                    </Label>
                    <Input
                      type="text"
                      placeholder="@handle"
                      value={instagramHandle}
                      onChange={(e) => setInstagramHandle(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      Spotify Handle
                    </Label>
                    <Input
                      type="text"
                      placeholder="@handle"
                      value={spotifyHandle}
                      onChange={(e) => setSpotifyHandle(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl text-sm"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 font-bold h-11 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </form>

              {/* Membership details */}
              <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-600/10 border border-orange-500/20 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Membership Details</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Unlock early bookings and exclusive vibe updates.</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black px-3 py-1 rounded-lg text-[10px] uppercase tracking-wide">
                    {user.subscription_tier || "Standard"}
                  </Badge>
                </div>
              </div>

              {/* Password & Connected Accounts */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3 flex items-center gap-1.5">
                  <KeyRound className="w-4.5 h-4.5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">Password & Accounts</h3>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4 bg-zinc-950/40 border border-zinc-800 rounded-xl p-4">
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Reset Password</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Password updates are handled securely via your registered email.</p>
                  </div>
                  <Button
                    onClick={() => base44.auth.redirectToLogin("/Settings")}
                    variant="outline"
                    className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 rounded-xl text-xs"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" /> Reset
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Linked Social Logins</Label>
                  {[
                    { name: "Google", connected: false, label: "Google Authentication" },
                    { name: "Apple ID", connected: false, label: "Apple Single Sign-On" }
                  ].map((acct) => (
                    <div key={acct.name} className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded-xl p-3">
                      <div>
                        <p className="text-xs font-bold text-white">{acct.name}</p>
                        <p className="text-[10px] text-zinc-500">{acct.label}</p>
                      </div>
                      <Button variant="outline" size="sm" disabled className="border-zinc-800 text-zinc-600 text-[10px] rounded-lg">
                        <Link2 className="w-3 h-3 mr-1" /> Connect
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCENE PREFERENCES */}
          {activeTab === "vibes" && (
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-6">
              <div className="border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-orange-400 animate-pulse" /> Favorite Scenes & Vibes
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select tags that describe the environments and music styles you prefer. We'll use these to refine recommendations.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {VIBE_INTERESTS_LIST.map((tag) => {
                  const isSelected = user.vibe_preferences?.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleVibeTag(tag)}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PRIVACY CONTROLS */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-4.5 h-4.5 text-orange-400" /> Activity History Visibility
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Control who can see the venues you've checked into.</p>
                </div>

                <div className="space-y-2.5">
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
                          <p className={cn("text-xs font-bold", active ? "text-white" : "text-zinc-300")}>{lvl.label}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{lvl.desc}</p>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                          active ? "border-orange-500 bg-orange-500" : "border-zinc-700"
                        )}>
                          {active && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Check-in sharing toggles */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3 flex items-center gap-1.5">
                  <Share2 className="w-4.5 h-4.5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">Sharing & Directory settings</h3>
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    label="Share check-ins to event chat"
                    desc="Automatically post when you check in at an event."
                    value={shareCheckIns}
                    onChange={setShareCheckIns}
                  />
                  <ToggleRow
                    label="Share vibe reports publicly"
                    desc="Help nearby users by sharing crowd details and music vibes."
                    value={shareVibeReports}
                    onChange={setShareVibeReports}
                  />
                  <ToggleRow
                    label="Appear in venue directory"
                    desc="Show your profile details in active attendee lists."
                    value={showInDirectory}
                    onChange={setShowInDirectory}
                  />
                </div>
              </div>

              {/* Account visibility toggles */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3 flex items-center gap-1.5">
                  <Lock className="w-4.5 h-4.5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">Profile Toggles</h3>
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    label="Private Profile Account"
                    desc="Hide all check-in badges and event history from non-friends."
                    value={isPrivateAccount}
                    onChange={setIsPrivateAccount}
                  />
                  <ToggleRow
                    label="Show on public Leaderboards"
                    desc="Participate in monthly top attendee charts and rank lists."
                    value={showOnLeaderboard}
                    onChange={setShowOnLeaderboard}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave()} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 rounded-xl shadow-md">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Save Privacy Settings
              </Button>
            </div>
          )}

          {/* TAB 4: ALERTS & NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              {/* Push permission card */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3 flex items-center gap-1.5">
                  <Bell className="w-4.5 h-4.5 text-orange-400" />
                  <h3 className="text-base font-bold text-white">Browser Push Notifications</h3>
                </div>

                <div className="flex items-center justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-200">Push notifications</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {pushSupported
                        ? "Receive wait times and event alerts in real-time."
                        : "Notifications are not supported in your browser."}
                    </p>
                  </div>
                  <button
                    onClick={() => requestPushPermission(!notifSettings.push_enabled)}
                    disabled={!pushSupported}
                    className={cn(
                      "w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex-shrink-0",
                      notifSettings.push_enabled ? "bg-orange-500" : "bg-zinc-800"
                )}
              >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full bg-white transition-transform duration-200",
                        notifSettings.push_enabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Notification types */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
                <div className="border-b border-zinc-800 pb-3">
                  <h3 className="text-base font-bold text-white">Alert Preferences</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Choose exactly what messages or alerts are sent to you.</p>
                </div>

                <div className="space-y-3">
                  {NOTIF_DEFS.map((def) => (
                    <ToggleRow
                      key={def.key}
                      label={def.label}
                      desc={def.desc}
                      value={notifSettings[def.key]}
                      onChange={() => toggleNotif(def.key)}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={() => handleSave()} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 rounded-xl shadow-md">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                Save Alert Settings
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper toggle row component
function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl">
      <div className="min-w-0">
        <p className="text-xs font-bold text-zinc-200">{label}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex-shrink-0",
          value ? "bg-orange-500" : "bg-zinc-800"
        )}
      >
        <div
          className={cn(
            "w-4 h-4 rounded-full bg-white transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
