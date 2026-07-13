import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  History,
  MapPin,
  QrCode,
  Calendar,
  Loader2,
  Music,
  Users,
  Flame,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const musicVibeMeta: Record<string, { label: string; color: string }> = {
  fire: { label: "Fire", color: "text-orange-400 bg-orange-500/15 border-orange-500/30" },
  decent: { label: "Decent", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  mid: { label: "Mid", color: "text-zinc-400 bg-zinc-700/30 border-zinc-600/30" },
  dead: { label: "Dead", color: "text-zinc-500 bg-zinc-800/50 border-zinc-700" },
};

const crowdMeta: Record<string, { label: string; color: string }> = {
  empty: { label: "Empty", color: "text-zinc-500" },
  filling_up: { label: "Filling Up", color: "text-yellow-400" },
  packed: { label: "Packed", color: "text-orange-400" },
  at_capacity: { label: "At Capacity", color: "text-red-400" },
};

type ActivityItem = {
  id: string;
  event_id: string;
  action_type: string;
  check_in_verified?: boolean;
  check_in_method?: string;
  created_date?: string;
};

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
};

type StatusItem = {
  id: string;
  event_id: string;
  vibe_score?: number;
  music_vibe?: string;
  crowd_level?: string;
  comment?: string;
};

export default function ActivityHistory() {
  const [user, setUser] = useState<{ id?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    base44.auth
      .me()
      .then((u: any) => setUser(u))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // All activity by user
  const { data: activities = [], isLoading: actLoading } = useQuery<ActivityItem[]>({
    queryKey: ["activityHistory", user?.id],
    queryFn: () => base44.entities.UserActivity.filter({ created_by_id: user?.id }, "-created_date", 500),
    enabled: !!user?.id,
  });

  // Check-in activities (verified)
  const checkIns = useMemo(
    () => activities.filter((a) => a.action_type === "checked_in" && a.check_in_verified),
    [activities]
  );

  // Fetch event details
  const eventIds = useMemo(() => [...new Set(checkIns.map((a) => a.event_id))], [checkIns]);

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventItem[]>({
    queryKey: ["historyEvents", eventIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        eventIds.map((id) => base44.entities.Event.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: eventIds.length > 0,
  });

  // Fetch vibe reports (EventStatus) for those events
  const { data: allStatuses = [], isLoading: statusLoading } = useQuery<StatusItem[]>({
    queryKey: ["historyStatuses", eventIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        eventIds.map((id) => base44.entities.EventStatus.filter({ event_id: id }, "-created_date", 10).catch(() => []))
      );
      return results.flat();
    },
    enabled: eventIds.length > 0,
  });

  const eventMap = useMemo(() => {
    const m: Record<string, EventItem> = {};
    events.forEach((e) => { m[e.id] = e; });
    return m;
  }, [events]);

  const statusesByEvent = useMemo(() => {
    const m: Record<string, StatusItem[]> = {};
    allStatuses.forEach((s) => {
      if (!m[s.event_id]) m[s.event_id] = [];
      m[s.event_id].push(s);
    });
    return m;
  }, [allStatuses]);

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
        <UserCircle className="w-16 h-16 text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to view your history</h2>
          <p className="text-zinc-500 text-sm">Your check-in history and vibe reports live here.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/activity-history")} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sign In
        </Button>
      </div>
    );
  }

  const isLoading = actLoading || eventsLoading || statusLoading;

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
            <History className="w-6 h-6 text-orange-400" /> Activity History
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {checkIns.length > 0 ? `${checkIns.length} venue check-in${checkIns.length !== 1 ? "s" : ""}` : "Every venue you've checked into, with dates and vibe reports."}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : checkIns.length === 0 ? (
          <div className="text-center py-24">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No check-ins yet</h3>
            <p className="text-zinc-600 mb-6 text-sm">Check in at events to build your venue history.</p>
            <Link to={createPageUrl("Home")}>
              <Button className="bg-orange-500 hover:bg-orange-600">Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-2 bottom-2 w-px bg-zinc-800" />

            <div className="space-y-4">
              {checkIns.map((checkIn) => {
                const event = eventMap[checkIn.event_id];
                const statuses = statusesByEvent[checkIn.event_id] || [];
                const latestStatus = statuses[0]; // sorted desc

                return (
                  <div key={checkIn.id} className="relative pl-14">
                    {/* Timeline dot */}
                    <div className={cn(
                      "absolute left-3 top-4 w-5 h-5 rounded-full border-2 border-zinc-950 flex items-center justify-center",
                      checkIn.check_in_method === "qr_code" ? "bg-purple-500" : "bg-orange-500"
                    )}>
                      {checkIn.check_in_method === "qr_code" ? (
                        <QrCode className="w-2.5 h-2.5 text-white" />
                      ) : (
                        <MapPin className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                      {/* Event header */}
                      <Link to={`${createPageUrl("EventDetail")}?id=${checkIn.event_id}`} className="block">
                        <div className="p-4 border-b border-zinc-800 hover:bg-zinc-800/30 transition">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-white font-semibold truncate flex items-center gap-1.5 capitalize">
                                {(() => {
                                  const Icon = venueTypeIcons[event?.venue_type || "other"] || venueTypeIcons.other;
                                  return <Icon className="w-4 h-4 text-orange-400" />;
                                })()}
                                {event?.title || "Event"}
                              </h3>
                              <p className="text-zinc-400 text-xs truncate mt-0.5">{event?.venue_name || "Unknown venue"}</p>
                            </div>
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] flex-shrink-0">
                              <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {checkIn.created_date ? format(new Date(checkIn.created_date), "EEE, MMM d · h:mm a") : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              {checkIn.check_in_method === "qr_code" ? <QrCode className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                              {checkIn.check_in_method === "qr_code" ? "QR" : "Location"}
                            </span>
                          </div>
                        </div>
                      </Link>

                      {/* Vibe report */}
                      {latestStatus ? (
                        <div className="p-4 bg-zinc-950/30">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Vibe Report at Check-in
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Vibe score */}
                            <div className="bg-zinc-900 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-orange-400">{latestStatus.vibe_score || "—"}</p>
                              <p className="text-[9px] text-zinc-500">Vibe Score</p>
                            </div>
                            {/* Music vibe */}
                            <div className="bg-zinc-900 rounded-lg p-2 text-center">
                              <p className={cn("text-xs font-semibold", (musicVibeMeta[latestStatus.music_vibe || ""]?.color || "").split(" ")[0] || "text-zinc-400")}>
                                {musicVibeMeta[latestStatus.music_vibe || ""]?.label || "—"}
                              </p>
                              <p className="text-[9px] text-zinc-500 flex items-center justify-center gap-0.5">
                                <Music className="w-2.5 h-2.5" /> Music
                              </p>
                            </div>
                            {/* Crowd */}
                            <div className="bg-zinc-900 rounded-lg p-2 text-center">
                              <p className={cn("text-xs font-semibold", crowdMeta[latestStatus.crowd_level || ""]?.color || "text-zinc-400")}>
                                {crowdMeta[latestStatus.crowd_level || ""]?.label || "—"}
                              </p>
                              <p className="text-[9px] text-zinc-500 flex items-center justify-center gap-0.5">
                                <Users className="w-2.5 h-2.5" /> Crowd
                              </p>
                            </div>
                          </div>
                          {latestStatus.comment && (
                            <p className="text-xs text-zinc-400 mt-2 italic">"{latestStatus.comment}"</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-zinc-950/30">
                          <p className="text-xs text-zinc-600 text-center">No vibe report submitted for this visit.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}