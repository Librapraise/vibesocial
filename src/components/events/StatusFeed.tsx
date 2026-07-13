import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Clock, MessageCircle, Flame, Music, Meh, Frown, User, TrendingUp, Users, Ban } from "lucide-react";

const getMusicVibeIcon = (vibe: string) => {
  switch (vibe) {
    case "fire":
      return <Flame className="w-3.5 h-3.5 text-orange-500" />;
    case "decent":
      return <Music className="w-3.5 h-3.5 text-emerald-400" />;
    case "mid":
      return <Meh className="w-3.5 h-3.5 text-zinc-400" />;
    case "dead":
      return <Frown className="w-3.5 h-3.5 text-zinc-600" />;
    default:
      return null;
  }
};

const getCrowdLevelIcon = (level: string) => {
  switch (level) {
    case "empty":
      return <User className="w-3.5 h-3.5 text-zinc-500" />;
    case "filling_up":
      return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
    case "packed":
      return <Users className="w-3.5 h-3.5 text-orange-400" />;
    case "at_capacity":
      return <Ban className="w-3.5 h-3.5 text-red-500" />;
    default:
      return null;
  }
};

const waitLabel: Record<string, string> = { no_wait: "No wait", "5_min": "~5 min", "15_min": "~15 min", "30_min": "~30 min", "45_plus_min": "45+ min" };

type StatusItem = {
  id: string;
  vibe_score: number;
  reporter_name?: string;
  created_date?: string;
  comment?: string;
  music_vibe?: string;
  crowd_level?: string;
  wait_time?: string;
};

type StatusFeedProps = {
  statuses?: StatusItem[];
  loading?: boolean;
};

export default function StatusFeed({ statuses, loading }: StatusFeedProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-800/50 rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-zinc-700 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!statuses?.length) {
    return (
      <div className="text-center py-10">
        <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No status updates yet. Be the first to report the vibe!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {statuses.map((status) => (
        <div key={status.id} className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                status.vibe_score >= 7 ? "bg-orange-500/20 text-orange-400" :
                  status.vibe_score >= 4 ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-blue-500/20 text-blue-400"
              )}>
                {status.vibe_score}
              </div>
              <div>
                <span className="text-zinc-400 text-xs">
                  {status.reporter_name || "Anonymous"}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-zinc-600">
              {format(new Date(status.created_date || 0), "h:mm a")}
            </span>
          </div>

          {status.comment && (
            <p className="text-zinc-300 text-sm leading-relaxed">{status.comment}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {status.music_vibe && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-700/50 text-zinc-400 px-2 py-0.5 rounded-full">
                {getMusicVibeIcon(status.music_vibe)}
                <span>Music: {status.music_vibe}</span>
              </span>
            )}
            {status.crowd_level && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-700/50 text-zinc-400 px-2 py-0.5 rounded-full">
                {getCrowdLevelIcon(status.crowd_level)}
                <span className="capitalize">{status.crowd_level.replace("_", " ")}</span>
              </span>
            )}
            {status.wait_time && (
              <span className="inline-flex items-center gap-1.5 text-xs bg-zinc-700/50 text-zinc-400 px-2 py-0.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />
                <span>{waitLabel[status.wait_time]}</span>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}