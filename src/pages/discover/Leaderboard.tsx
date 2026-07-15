import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Flame, Loader2, Crown, Medal, Award } from "lucide-react";
import { createPageUrl } from "@/utils";
import EventCard from "@/components/events/EventCard";
import { cn } from "@/lib/utils";

type StatusItem = {
  id: string;
  reporter_name?: string;
  vibe_score: number;
};

type EventData = {
  id: string;
  current_vibe_score?: number;
};

type Reporter = { name: string; count: number; topVibe: number };

function ReporterRow({ reporter, rank }: { reporter: Reporter; rank: number }) {
  const RankIcon = rank === 1 ? Crown : rank === 2 ? Medal : rank === 3 ? Award : null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border",
        rank === 1
          ? "bg-gradient-to-r from-orange-500/10 to-zinc-900 border-orange-500/30"
          : "bg-zinc-900 border-zinc-800"
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
          rank === 1 ? "bg-orange-500 text-white" : rank === 2 ? "bg-zinc-400 text-zinc-900" : rank === 3 ? "bg-amber-700 text-white" : "bg-zinc-800 text-zinc-400"
        )}
      >
        {RankIcon ? <RankIcon className="w-4 h-4" /> : rank}
      </div>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-orange-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
        {(reporter.name || "?")[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{reporter.name}</p>
        <p className="text-zinc-500 text-xs">{reporter.count} status update{reporter.count !== 1 ? "s" : ""}</p>
      </div>
      {rank === 1 && (
        <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">Top Vibe Reporter</Badge>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { data: statuses = [], isLoading: isLoadingStatuses } = useQuery<StatusItem[]>({
    queryKey: ["allStatuses"],
    queryFn: () => base44.entities.EventStatus.list("-created_date", 500),
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery<EventData[]>({
    queryKey: ["activeEventsLeaderboard"],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, "-current_vibe_score", 12),
  });

  // Aggregate reporters
  const reporters = useMemo(() => {
    const map: Record<string, Reporter> = {};
    statuses.forEach((s) => {
      const name = s.reporter_name || (s as any).users?.name || "Anonymous";
      if (!map[name]) map[name] = { name, count: 0, topVibe: 0 };
      map[name].count += 1;
      if (s.vibe_score > map[name].topVibe) map[name].topVibe = s.vibe_score;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [statuses]);

  const topVibeEvents = useMemo(
    () => events.filter((e) => (e.current_vibe_score || 0) > 0).slice(0, 6),
    [events]
  );

  const loading = isLoadingStatuses || isLoadingEvents;

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-400" /> Leaderboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Top vibe reporters and the hottest events right now.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Top reporters */}
        {!loading && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Top Vibe Reporters</h2>
            </div>
            {reporters.length === 0 ? (
              <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                No status updates yet. Be the first to drop a vibe!
              </div>
            ) : (
              <div className="space-y-2">
                {reporters.map((r, i) => (
                  <ReporterRow key={r.name} reporter={r} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Highest-vibe events */}
        {!loading && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Highest-Vibe Events</h2>
            </div>
            {topVibeEvents.length === 0 ? (
              <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
                No vibe scores reported yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topVibeEvents.map((e, i) => (
                  <EventCard key={e.id} event={e} rank={i + 1} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}