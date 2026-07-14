import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldCheck,
  MapPin,
  QrCode,
  Calendar,
  Ticket,
  Loader2,
  UserCircle,
  ArrowLeft,
  TrendingUp,
  Instagram,
  Music,
  Settings,
  Shield,
  Upload,
  Sparkles,
  Lock,
  Globe,
  Camera,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { useAuth } from "@/lib/AuthContext";

type Activity = {
  id: string;
  event_id: string;
  action_type?: string;
  check_in_verified?: boolean;
  check_in_method?: string;
  created_date?: string;
  venue_type?: string;
  vibe_tags?: string[];
};

type EventData = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  cover_image?: string;
};

type CurrentUser = {
  id?: string;
  email: string;
  name?: string;
  avatar_url?: string | null;
  bio?: string | null;
  social_links?: Record<string, string>;
  vibe_preferences?: string[];
  privacy_settings?: {
    is_private: boolean;
    show_on_leaderboard: boolean;
  };
  subscription_tier?: string;
} | null;

const VIBE_INTERESTS_LIST = [
  "Techno", "House", "Hip Hop", "R&B", "Jazz", "Latin", "Rock", "Pop", 
  "Cocktails", "Craft Beer", "Rooftops", "Live Bands", "Speakeasies", "Dance Club"
];

export default function Profile() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<CurrentUser>(authUser);
  const [userLoading, setUserLoading] = useState<boolean>(!authUser);
  const [activeTab, setActiveTab] = useState<"activity" | "edit" | "interests" | "settings">("activity");

  // Form states for updates
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [spotifyHandle, setSpotifyHandle] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setEditName(authUser.name || "");
      setEditBio(authUser.bio || "");
      setInstagramHandle(authUser.social_links?.instagram || "");
      setSpotifyHandle(authUser.social_links?.spotify || "");
      setUserLoading(false);
    }
    base44.auth
      .me()
      .then((u) => {
        setUser(u);
        setEditName(u.name || "");
        setEditBio(u.bio || "");
        setInstagramHandle(u.social_links?.instagram || "");
        setSpotifyHandle(u.social_links?.spotify || "");
      })
      .catch((err) => {
        console.error("Profile API load error, falling back to AuthContext:", err);
        if (authUser) {
          setUser(authUser);
        } else {
          setUser(null);
        }
      })
      .finally(() => setUserLoading(false));
  }, [authUser]);

  // All activity by the current user
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["myActivity", user?.id],
    queryFn: () =>
      base44.entities.UserActivity.filter({ created_by_id: user?.id }, "-created_date", 200),
    enabled: !!user?.id,
  });

  // Verified check-ins (badges)
  const verifiedCheckIns = activities.filter(
    (a) => a.action_type === "checked_in" && a.check_in_verified
  );

  // Attended history = verified check-ins OR explicit "attended" actions
  const attendedActivities = activities.filter(
    (a) =>
      (a.action_type === "checked_in" && a.check_in_verified) ||
      a.action_type === "attended"
  );

  // Unique event IDs from attended activities
  const attendedEventIds = [...new Set(attendedActivities.map((a) => a.event_id))];

  // Fetch event details for each attended event
  const { data: attendedEvents = [], isLoading: eventsLoading } = useQuery<EventData[]>({
    queryKey: ["attendedEvents", attendedEventIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        attendedEventIds.map((id) =>
          base44.entities.Event.get(id).catch(() => null)
        )
      );
      return results.filter(Boolean) as EventData[];
    },
    enabled: attendedEventIds.length > 0,
  });

  // Build a map of event_id -> most recent check-in activity (for date display)
  const checkInByEvent: Record<string, Activity> = {};
  verifiedCheckIns.forEach((a) => {
    if (!checkInByEvent[a.event_id] || new Date(a.created_date || 0) > new Date(checkInByEvent[a.event_id].created_date || 0)) {
      checkInByEvent[a.event_id] = a;
    }
  });

  // Sort attended events by most recent check-in date
  const sortedAttendedEvents = [...attendedEvents].sort((a, b) => {
    const dateA = checkInByEvent[a.id]?.created_date
      ? new Date(checkInByEvent[a.id].created_date).getTime()
      : 0;
    const dateB = checkInByEvent[b.id]?.created_date
      ? new Date(checkInByEvent[b.id].created_date).getTime()
      : 0;
    return dateB - dateA;
  });

  // Stats
  const uniqueVenues = new Set(attendedEvents.map((e) => e.venue_name)).size;
  const uniqueVenueTypes = new Set(attendedEvents.map((e) => e.venue_type)).size;
  const topVenueType = (() => {
    const counts: Record<string, number> = {};
    attendedEvents.forEach((e) => {
      if (e.venue_type) counts[e.venue_type] = (counts[e.venue_type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  })();

  // Form Submit Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await base44.auth.updateMe({
        name: editName,
        bio: editBio,
        social_links: {
          instagram: instagramHandle,
          spotify: spotifyHandle,
        },
      });
      setUser(updated);
      toast({ title: "Profile Saved", description: "Changes updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res && res.file_url) {
        const updated = await base44.auth.updateMe({ avatar_url: res.file_url });
        setUser(updated);
        toast({ title: "Avatar Uploaded", description: "Profile photo successfully updated." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Toggle Vibe Preference Tag Handler
  const handleToggleVibeTag = async (tag: string) => {
    if (!user) return;
    const currentTags = user.vibe_preferences || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
      
    try {
      const updated = await base44.auth.updateMe({ vibe_preferences: newTags });
      setUser(updated);
      toast({ title: "Interests Saved", description: `${tag} selection toggled.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Saving", description: err.message });
    }
  };

  // Toggle Privacy Settings Handler
  const handleTogglePrivacySetting = async (key: "is_private" | "show_on_leaderboard") => {
    if (!user) return;
    const currentPrivacy = user.privacy_settings || { is_private: false, show_on_leaderboard: true };
    const newPrivacy = {
      ...currentPrivacy,
      [key]: !currentPrivacy[key],
    };
    
    try {
      const updated = await base44.auth.updateMe({ privacy_settings: newPrivacy });
      setUser(updated);
      toast({ title: "Privacy Saved", description: "Settings successfully updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <UserCircle className="w-16 h-16 text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to view your profile</h2>
          <p className="text-zinc-500 text-sm">Your badges and event history live here.</p>
        </div>
        <Button
          onClick={() => base44.auth.redirectToLogin("/profile")}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Sign In
        </Button>
      </div>
    );
  }

  const displayName = user.name || user.email.split("@")[0];
  const initials = displayName[0]?.toUpperCase();

  return (
    <div className="min-h-screen pb-20 font-sans bg-zinc-950 text-zinc-100 selection:bg-orange-500 selection:text-white">
      {/* Cover Backdrop (Glow) */}
      <div className="h-44 bg-gradient-to-r from-orange-600/20 via-pink-600/10 to-purple-600/20 border-b border-zinc-900 relative">
        <div className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[1px]"></div>
      </div>

      {/* Header Container */}
      <div className="max-w-3xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-900">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            <div className="relative group w-28 h-28 rounded-full border-4 border-zinc-950 overflow-hidden bg-zinc-900 shadow-2xl flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-4xl font-extrabold text-white">
                  {initials}
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition duration-200">
                <Camera className="w-6 h-6 text-zinc-300" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">{displayName}</h1>
                <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {user.subscription_tier === "vip" ? "VIP" : user.subscription_tier === "plus" ? "Plus" : "Free"}
                </Badge>
              </div>
              <p className="text-zinc-500 text-sm">{user.email}</p>
              {user.bio && <p className="text-zinc-300 text-sm max-w-md mt-2 italic">"{user.bio}"</p>}
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-4 sm:mt-0">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="flex gap-2 bg-zinc-900/50 border border-zinc-900 rounded-xl p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
              activeTab === "activity"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Activity & Badges
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
              activeTab === "edit"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("interests")}
            className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
              activeTab === "interests"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 min-w-[90px] py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
              activeTab === "settings"
                ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Tab 1: ACTIVITY & BADGES */}
        {activeTab === "activity" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">{verifiedCheckIns.length}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Badges Earned</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">{uniqueVenues}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Unique Venues</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-900 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">{uniqueVenueTypes}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mt-0.5">Venue Types</p>
              </div>
            </div>

            {topVenueType && (
              <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/5 border border-orange-500/25 rounded-2xl p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                <p className="text-sm text-zinc-300">
                  Your favorite scene:{" "}
                  <span className="font-semibold text-white inline-flex items-center gap-1.5 capitalize">
                    {(() => {
                      const Icon = venueTypeIcons[topVenueType] || venueTypeIcons.other;
                      return <Icon className="w-4 h-4 text-orange-400" />;
                    })()}
                    {topVenueType.replace("_", " ")}
                  </span>
                </p>
              </div>
            )}

            {/* Verified Badges */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <ShieldCheck className="w-5 h-5 text-green-400" />
                <h2 className="text-lg font-bold text-white">Verified Check-in Badges</h2>
              </div>

              {activitiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                </div>
              ) : verifiedCheckIns.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
                  <ShieldCheck className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-medium mb-1">No badges yet</p>
                  <p className="text-zinc-600 text-xs">
                    Check in at events via location or QR code to earn verified badges.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {verifiedCheckIns.map((a) => {
                    const event = attendedEvents.find((e) => e.id === a.event_id);
                    return (
                      <div
                        key={a.id}
                        className="bg-gradient-to-br from-green-500/5 to-zinc-900 border border-green-500/10 rounded-2xl p-4 flex flex-col items-center text-center gap-2"
                      >
                        <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center mb-1">
                          {a.check_in_method === "qr_code" ? (
                            <QrCode className="w-5 h-5 text-green-400" />
                          ) : (
                            <MapPin className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-white text-xs font-bold truncate">
                            {event?.title || "Event"}
                          </p>
                          <p className="text-zinc-500 text-[10px] truncate mt-0.5">
                            {event?.venue_name || "Unknown venue"}
                          </p>
                          <p className="text-green-400/80 text-[10px] mt-1.5 font-semibold">
                            {a.created_date ? format(new Date(a.created_date), "MMM d, yyyy") : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Attendance History */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Events Attended</h2>
              </div>

              {activitiesLoading || eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                </div>
              ) : sortedAttendedEvents.length === 0 ? (
                <div className="bg-zinc-900/30 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
                  <Ticket className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm font-medium mb-1">No events attended yet</p>
                  <p className="text-zinc-600 text-xs mb-4">Discover live events and check in to start your history.</p>
                  <Link to={createPageUrl("Home")}>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl" size="sm">
                      Browse Events
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAttendedEvents.map((event) => {
                    const checkIn = checkInByEvent[event.id];
                    return (
                      <Link
                        key={event.id}
                        to={`${createPageUrl("EventDetail")}?id=${event.id}`}
                        className="block"
                      >
                        <div className="bg-zinc-900/40 border border-zinc-900 hover:border-zinc-700/80 rounded-2xl overflow-hidden flex transition-all hover:-translate-y-0.5">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                            {event.cover_image ? (
                              <img
                                src={event.cover_image}
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-zinc-900 flex items-center justify-center">
                                {(() => {
                                  const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
                                  return <Icon className="w-6 h-6 text-zinc-400" />;
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 p-3 sm:p-4 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-white font-semibold text-sm truncate">{event.title}</h3>
                                <p className="text-zinc-500 text-xs truncate mt-0.5">{event.venue_name}</p>
                              </div>
                              {checkIn?.check_in_verified && (
                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] flex-shrink-0">
                                  <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-500">
                              {checkIn?.created_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-zinc-600" />
                                  {format(new Date(checkIn.created_date), "MMM d, yyyy")}
                                </span>
                              )}
                              {event.address && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3 text-zinc-600" />
                                  <span className="truncate">{event.address}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 2: EDIT PROFILE */}
        {activeTab === "edit" && (
          <form onSubmit={handleSaveProfile} className="space-y-6 max-w-xl mx-auto bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl animate-in fade-in duration-300">
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white">Profile Details</h3>
              <p className="text-xs text-zinc-500 mt-1">Configure your screen name, custom bio description, and social media handles.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Display Name</Label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Bio Description</Label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={250}
                placeholder="Share a short snippet about your vibe..."
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-sm focus-visible:ring-1 focus-visible:ring-orange-500 outline-none min-h-[80px] resize-none"
              />
              <p className="text-[10px] text-zinc-600 text-right">{editBio.length}/250 characters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-zinc-500" /> Instagram Handle
                </Label>
                <Input
                  type="text"
                  placeholder="@handle"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-zinc-500" /> Spotify Handle
                </Label>
                <Input
                  type="text"
                  placeholder="@handle"
                  value={spotifyHandle}
                  onChange={(e) => setSpotifyHandle(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingProfile}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 font-bold h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {savingProfile ? "Saving Changes..." : "Save Profile Details"}
            </Button>
          </form>
        )}

        {/* Tab 3: INTERESTS & VIBES */}
        {activeTab === "interests" && (
          <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-orange-400" /> Favorite Scenes & Vibes
              </h3>
              <p className="text-xs text-zinc-500 mt-1">Select tags that describe the environments and music styles you prefer. We'll use these to refine recommendations.</p>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              {VIBE_INTERESTS_LIST.map((tag) => {
                const isSelected = user.vibe_preferences?.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleVibeTag(tag)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: SETTINGS & PRIVACY */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-xl mx-auto animate-in fade-in duration-300">
            {/* Membership Card */}
            <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-600/10 border border-orange-500/20 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Membership Details</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Explore premium pre-sales and status updates alerts.</p>
                </div>
                <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black px-3 py-1 rounded-lg text-xs uppercase tracking-wide">
                  {user.subscription_tier === "vip" ? "VIP" : user.subscription_tier === "plus" ? "Plus" : "Free"}
                </Badge>
              </div>

              <div className="border-t border-zinc-900/50 pt-4 flex justify-between items-center text-xs">
                <span className="text-zinc-400 font-medium">
                  Monthly pre-sale tickets remaining: {
                    user.subscription_tier === "vip"
                      ? "Unlimited"
                      : user.subscription_tier === "plus"
                        ? "5"
                        : "0"
                  }
                </span>
                <Link to={createPageUrl("Subscription")}>
                  <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 font-bold p-0 flex items-center gap-1">
                    Upgrade Tier <TrendingUp className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl space-y-5">
              <div className="border-b border-zinc-800 pb-3 flex items-center gap-1.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Privacy Controls</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-200 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-zinc-500" /> Private Account
                    </p>
                    <p className="text-[10px] text-zinc-500">Hide your check-in badges and event history from others.</p>
                  </div>
                  <button
                    onClick={() => handleTogglePrivacySetting("is_private")}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      user.privacy_settings?.is_private ? "bg-orange-500" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        user.privacy_settings?.is_private ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-200 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" /> Show on Leaderboard
                    </p>
                    <p className="text-[10px] text-zinc-500">Participate in monthly top check-in rankings and gain reputation points.</p>
                  </div>
                  <button
                    onClick={() => handleTogglePrivacySetting("show_on_leaderboard")}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                      user.privacy_settings?.show_on_leaderboard ? "bg-orange-500" : "bg-zinc-800"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                        user.privacy_settings?.show_on_leaderboard ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}