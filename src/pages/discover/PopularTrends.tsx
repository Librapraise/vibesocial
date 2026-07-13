import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Music, Flame, Loader2, Hash } from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import EventCard from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

const MUSIC_VIBE_LABEL: Record<string, string> = { fire: "🔥 Fire", decent: "👌 Decent", mid: "😐 Mid", dead: "💀 Dead" };

function rankColor(rank: number): string {
  if (rank === 1) return "bg-orange-500";
  if (rank === 2) return "bg-zinc-400";
  if (rank === 3) return "bg-amber-700";
  return "bg-zinc-700";
}

type EventData = {
  id: string;
  venue_type?: string;
  status_count?: number;
  vibe_tags?: string[];
};

type StatusItem = {
  id: string;
  created_date?: string;
  music_vibe?: string;
};

export default function PopularTrends() {
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<EventData[]>({
    queryKey: ["trendsEvents"],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, "-status_count", 200),
  });

  const { data: statuses = [], isLoading: isLoadingStatuses } = useQuery<StatusItem[]>({
    queryKey: ["trendsStatuses"],
    queryFn: () => base44.entities.EventStatus.list("-created_date", 500),
  });

  const recentStatuses = useMemo(
    () => statuses.filter((s) => s.created_date && new Date(s.created_date) >= weekAgo),
    [statuses, weekAgo]
  );

  // Venue type popularity from events
  const venueTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.venue_type) counts[e.venue_type] = (counts[e.venue_type] || 0) + (e.status_count || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [events]);

  // Vibe tags popularity
  const vibeTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      (e.vibe_tags || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + (e.status_count || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  // Music vibe distribution
  const musicVibeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    recentStatuses.forEach((s) => {
      if (s.music_vibe) counts[s.music_vibe] = (counts[s.music_vibe] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recentStatuses]);

  const totalMusicVotes = musicVibeCounts.reduce((sum, [, c]) => sum + c, 0);

  // Trending events = events with most status_count this week
  const trendingEvents = useMemo(
    () => events.filter((e) => (e.status_count || 0) > 0).sort((a, b) => (b.status_count || 0) - (a.status_count || 0)).slice(0, 6),
    [events]
  );

  const loading = isLoadingEvents || isLoadingStatuses;

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-400" /> Popular Trends
          </h1>
          <p className="text-zinc-500 text-sm mt-1">What's hot this week across {venueTypeCounts.length} venue types.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {!loading && (
          <>
            {/* Venue types */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Trending Venue Types</h2>
              </div>
              {venueTypeCounts.length === 0 ? (
                <EmptyState text="No venue data yet." />
              ) : (
                <div className="space-y-2">
                  {venueTypeCounts.map(([type, count], i) => {
                    const max = venueTypeCounts[0][1];
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white", rankColor(i))}>
                              {i + 1}
                            </div>
                            {(() => {
                               const Icon = venueTypeIcons[type] || venueTypeIcons.other;
                               return <Icon className="w-5 h-5 text-orange-400" />;
                             })()}
                            <span className="text-white font-medium capitalize">{type.replace("_", " ")}</span>
                          </div>
                          <span className="text-zinc-400 text-sm">{count} activity</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-orange-500 to-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Music vibes */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Music Vibes This Week</h2>
              </div>
              {musicVibeCounts.length === 0 ? (
                <EmptyState text="No music vibe reports this week." />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {musicVibeCounts.map(([vibe, count]) => {
                    const pct = totalMusicVotes > 0 ? Math.round((count / totalMusicVotes) * 100) : 0;
                    return (
                      <div key={vibe} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                        <p className="text-2xl mb-1">{MUSIC_VIBE_LABEL[vibe]?.split(" ")[0] || "🎵"}</p>
                        <p className="text-white text-sm font-medium capitalize">{vibe}</p>
                        <p className="text-orange-400 text-lg font-bold mt-1">{pct}%</p>
                        <p className="text-zinc-600 text-[10px]">{count} report{count !== 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Vibe tags */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Popular Vibe Tags</h2>
              </div>
              {vibeTagCounts.length === 0 ? (
                <EmptyState text="No vibe tags yet." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {vibeTagCounts.map(([tag, count], i) => (
                    <div
                      key={tag}
                      className={cn(
                        "rounded-full border px-3 py-1.5 flex items-center gap-1.5 text-sm",
                        i === 0
                          ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300"
                      )}
                    >
                      <span className="font-medium">#{tag}</span>
                      <span className="text-zinc-600 text-xs">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Trending events */}
            {trendingEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <h2 className="text-lg font-bold text-white">Trending Events</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingEvents.map((e, i) => (
                    <EventCard key={e.id} event={e} rank={i + 1} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
      {text}
    </div>
  );
}