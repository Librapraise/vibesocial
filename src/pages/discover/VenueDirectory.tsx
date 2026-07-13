import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Search, Loader2, Calendar } from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import VibeScoreBadge from "@/components/events/VibeScoreBadge";
import { cn } from "@/lib/utils";

const VENUE_TYPES = ["club", "lounge", "bar", "rooftop", "house_party", "pop_up", "concert", "other"];

type EventData = {
  id: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  state?: string;
  start_time?: string;
  cover_image?: string;
  current_vibe_score?: number;
};

type Venue = {
  name: string;
  venue_type?: string;
  address?: string;
  state?: string;
  eventCount: number;
  topVibe: number;
  latestStart: string | null;
  cover_image: string | null;
};

export default function VenueDirectory() {
  const [activeType, setActiveType] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const { data: events = [], isLoading } = useQuery<EventData[]>({
    queryKey: ["allActiveEvents"],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, "-current_vibe_score", 200),
  });

  // Group events by venue_name
  const venues = useMemo(() => {
    const map: Record<string, Venue> = {};
    events.forEach((e) => {
      const key = e.venue_name;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          name: key,
          venue_type: e.venue_type,
          address: e.address,
          state: e.state,
          eventCount: 0,
          topVibe: 0,
          latestStart: null,
          cover_image: null,
        };
      }
      map[key].eventCount += 1;
      if ((e.current_vibe_score || 0) > map[key].topVibe) {
        map[key].topVibe = e.current_vibe_score || 0;
        map[key].cover_image = e.cover_image || null;
      }
      if (e.start_time && (!map[key].latestStart || new Date(e.start_time) > new Date(map[key].latestStart as string))) {
        map[key].latestStart = e.start_time;
      }
    });
    let list = Object.values(map);
    if (activeType !== "all") list = list.filter((v) => v.venue_type === activeType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q) || (v.address || "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.topVibe - a.topVibe);
  }, [events, activeType, search]);

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Venue Directory</h1>
          <p className="text-zinc-500 text-sm">Browse featured clubs, lounges, and party spots.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venues or addresses…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          <button
            onClick={() => setActiveType("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition",
              activeType === "all"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
            )}
          >
            All
          </button>
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
              <span className="inline-flex items-center gap-1.5 capitalize">
                {(() => {
                  const Icon = venueTypeIcons[t] || venueTypeIcons.other;
                  return <Icon className={cn("w-3.5 h-3.5", activeType === t ? "text-white" : "text-orange-400")} />;
                })()}
                {t.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-sm">No venues found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((v) => (
              <div
                key={v.name}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden transition hover:-translate-y-0.5"
              >
                <div className="h-28 relative">
                  {v.cover_image ? (
                    <img src={v.cover_image} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-zinc-900 flex items-center justify-center">
                      {(() => {
                        const Icon = venueTypeIcons[v.venue_type || "other"] || venueTypeIcons.other;
                        return <Icon className="w-8 h-8 text-zinc-400" />;
                      })()}
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    {v.topVibe > 0 && <VibeScoreBadge score={v.topVibe} />}
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = venueTypeIcons[v.venue_type || "other"] || venueTypeIcons.other;
                      return <Icon className="w-3.5 h-3.5 text-orange-400" />;
                    })()}
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider capitalize">
                      {v.venue_type?.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold truncate">{v.name}</h3>
                  {v.address && (
                    <p className="text-zinc-500 text-xs flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3" /> {v.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {v.eventCount} event{v.eventCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}