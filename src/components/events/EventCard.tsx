import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl, venueTypeIcons } from "../../utils";
import { cn } from "@/lib/utils";
import { Clock, MapPin, MessageCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import VibeScoreBadge from "./VibeScoreBadge";
import CrowdIndicator from "./CrowdIndicator";
import { format } from "date-fns";

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  cover_image?: string;
  start_time?: string;
  current_vibe_score?: number;
  current_crowd_level?: string;
  current_wait_time?: string;
  status_count?: number;
  vibe_tags?: string[];
};

type EventCardProps = {
  event: EventItem;
  rank?: number;
};

const waitTimeLabel: Record<string, string> = {
  no_wait: "No wait",
  "5_min": "~5 min",
  "15_min": "~15 min",
  "30_min": "~30 min",
  "45_plus_min": "45+ min",
};

export default function EventCard({ event, rank }: EventCardProps) {
  const isLit = (event.current_vibe_score || 0) >= 7;

  return (
    <Link to={createPageUrl("EventDetail") + `?id=${event.id}`}>
      <div className={cn(
        "group relative rounded-2xl overflow-hidden transition-all duration-300",
        "bg-zinc-900/80 border border-zinc-800 hover:border-zinc-600",
        "hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-0.5",
        isLit && "border-orange-500/30 shadow-lg shadow-orange-500/5"
      )}>
        {/* Cover Image */}
        <div className="relative h-40 overflow-hidden">
          {event.cover_image ? (
            <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/50 via-zinc-900 to-zinc-900 flex items-center justify-center">
              {(() => {
                const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
                return <Icon className="w-8 h-8 text-zinc-400" />;
              })()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

          {/* Rank badge */}
          {rank && rank <= 3 && (
            <div className={cn(
              "absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
              rank === 1 ? "bg-orange-500 text-white" : rank === 2 ? "bg-zinc-400 text-zinc-900" : "bg-amber-700 text-white"
            )}>
              #{rank}
            </div>
          )}

          {/* Vibe badge */}
          <div className="absolute top-3 right-3">
            <VibeScoreBadge score={event.current_vibe_score} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {(() => {
                const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
                return <Icon className="w-4 h-4 text-orange-400" />;
              })()}
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                {event.venue_type?.replace("_", " ")}
              </span>
            </div>
            <h3 className="text-white font-extrabold text-xl leading-tight truncate mb-1">{event.title}</h3>
            <p className="text-zinc-300 text-base truncate">{event.venue_name}</p>
            {event.start_time && (
              <div className="flex items-center gap-2 text-sm text-zinc-400 mt-2 font-medium">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span>{format(new Date(event.start_time), "EEE, MMM d · h:mm a")}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <CrowdIndicator level={event.current_crowd_level} />
            {event.current_wait_time && event.current_wait_time !== "no_wait" && (
              <div className="flex items-center gap-1 text-xs text-zinc-400 font-semibold">
                <Clock className="w-3.5 h-3.5 text-orange-400/80" strokeWidth={2.2} />
                <span>{waitTimeLabel[event.current_wait_time]}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80">
            {event.address && (
              <div className="flex items-center gap-1 text-xs text-zinc-400 truncate max-w-[60%]">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-pink-500/80" strokeWidth={2.2} />
                <span className="truncate">{event.address}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
              <MessageCircle className="w-3.5 h-3.5 text-purple-400/80" strokeWidth={2.2} />
              <span>{event.status_count || 0} updates</span>
            </div>
          </div>

          {event.vibe_tags && event.vibe_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.vibe_tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-2 py-0.5 hover:bg-zinc-700">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Lit glow effect */}
        {isLit && (
          <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-orange-500/20" />
        )}
      </div>
    </Link>
  );
}