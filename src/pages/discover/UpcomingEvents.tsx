import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Loader2, Clock } from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import EventCard from "@/components/events/EventCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const VENUE_TYPES = ["all", "club", "lounge", "bar", "rooftop", "house_party", "pop_up", "concert", "other"];

type EventData = {
  id: string;
  start_time?: string;
  venue_type?: string;
};

export default function UpcomingEvents() {
  const [activeType, setActiveType] = useState<string>("all");

  const { data: events = [], isLoading } = useQuery<EventData[]>({
    queryKey: ["upcomingEvents"],
    queryFn: () => base44.entities.Event.list("start_time", 200),
  });

  const now = new Date();
  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.start_time && new Date(e.start_time) >= now)
      .filter((e) => activeType === "all" || e.venue_type === activeType)
      .sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime());
  }, [events, activeType, now]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, EventData[]> = {};
    upcoming.forEach((e) => {
      const key = format(new Date(e.start_time || 0), "EEEE, MMM d");
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map);
  }, [upcoming]);

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-400" /> Upcoming Events
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Plan your nights out — chronological from soonest to latest.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1">
          {VENUE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition capitalize",
                activeType === t
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              )}
            >
              {t === "all" ? (
                "All Types"
              ) : (
                <span className="inline-flex items-center gap-1.5 capitalize">
                  {(() => {
                    const Icon = venueTypeIcons[t] || venueTypeIcons.other;
                    return <Icon className={cn("w-3.5 h-3.5", activeType === t ? "text-white" : "text-orange-400")} />;
                  })()}
                  {t.replace("_", " ")}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No upcoming events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([day, dayEvents]) => (
              <section key={day}>
                <div className="flex items-center gap-2 mb-4 sticky top-[88px] bg-zinc-950/80 backdrop-blur-sm py-2 -mx-4 px-4 z-[5]">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <h2 className="text-white font-semibold">{day}</h2>
                  <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                    {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayEvents.map((e) => (
                    <div key={e.id} className="relative">
                      <EventCard event={e} />
                      <div className="absolute top-3 left-3 bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-full px-2 py-0.5 text-[10px] text-orange-400 font-medium flex items-center gap-1 z-10">
                        <Clock className="w-3 h-3" />
                        {format(new Date(e.start_time || 0), "h:mm a")}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}