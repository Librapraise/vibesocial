import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";
import { createPageUrl, venueTypeIcons } from "@/utils";

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
  full_name?: string;
} | null;

export default function Profile() {
  const [user, setUser] = useState<CurrentUser>(null);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  useEffect(() => {
    base44.auth
      .me()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setUserLoading(false));
  }, []);

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

  const displayName = user.full_name || user.email.split("@")[0];
  const initials = displayName[0]?.toUpperCase();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">{displayName}</h1>
              <p className="text-zinc-400 text-sm truncate">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {verifiedCheckIns.length} Verified
                </Badge>
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {attendedEventIds.length} Attended
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{verifiedCheckIns.length}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Badges Earned</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{uniqueVenues}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Unique Venues</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{uniqueVenueTypes}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Venue Types</p>
          </div>
        </div>

        {topVenueType && (
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-3">
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
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Verified Check-in Badges</h2>
          </div>

          {activitiesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : verifiedCheckIns.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
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
                    className="bg-gradient-to-br from-green-500/10 to-zinc-900 border border-green-500/20 rounded-2xl p-4 flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      {a.check_in_method === "qr_code" ? (
                        <QrCode className="w-5 h-5 text-green-400" />
                      ) : (
                        <MapPin className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-white text-sm font-semibold truncate">
                        {event?.title || "Event"}
                      </p>
                      <p className="text-zinc-500 text-[10px] truncate">
                        {event?.venue_name || "Unknown venue"}
                      </p>
                      <p className="text-green-400 text-[10px] mt-1">
                        {a.created_date
                          ? format(new Date(a.created_date), "MMM d, yyyy")
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Attendance History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Events Attended</h2>
          </div>

          {activitiesLoading || eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : sortedAttendedEvents.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
              <Ticket className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium mb-1">No events attended yet</p>
              <p className="text-zinc-600 text-xs mb-4">
                Discover live events and check in to start your history.
              </p>
              <Link to={createPageUrl("Home")}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" size="sm">
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
                    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden flex transition-all hover:-translate-y-0.5">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                        {event.cover_image ? (
                          <img
                            src={event.cover_image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-zinc-900 flex items-center justify-center">
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
                            <h3 className="text-white font-semibold truncate">{event.title}</h3>
                            <p className="text-zinc-400 text-xs truncate">{event.venue_name}</p>
                          </div>
                          {checkIn?.check_in_verified && (
                            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px] flex-shrink-0">
                              <ShieldCheck className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                          {checkIn?.created_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(checkIn.created_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {event.address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
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
    </div>
  );
}