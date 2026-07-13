import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import EventCard from "../events/EventCard";

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  current_vibe_score?: number;
  current_crowd_level?: string;
  vibe_tags?: string[];
};

type SimilarEventsProps = {
  currentEvent: EventItem;
};

export default function SimilarEvents({ currentEvent }: SimilarEventsProps) {
  const [recommendations, setRecommendations] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: allEvents = [] } = useQuery<EventItem[]>({
    queryKey: ['allEvents'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, '-current_vibe_score'),
  });

  useEffect(() => {
    if (currentEvent && allEvents.length) {
      generateSimilarEvents();
    }
  }, [currentEvent, allEvents]);

  const generateSimilarEvents = async () => {
    try {
      setLoading(true);

      const otherEvents = allEvents.filter(e => e.id !== currentEvent.id);
      if (otherEvents.length === 0) {
        setLoading(false);
        return;
      }

      const prompt = `Find 3 events most similar to the current event.

Current Event:
- ${currentEvent.title} at ${currentEvent.venue_name}
- Venue type: ${currentEvent.venue_type}
- Vibe score: ${currentEvent.current_vibe_score || 0}/10
- Tags: ${(currentEvent.vibe_tags || []).join(', ')}
- Crowd: ${currentEvent.current_crowd_level}

Other Events:
${otherEvents.map(e => `- ${e.title} at ${e.venue_name} (${e.venue_type}), vibe: ${e.current_vibe_score || 0}/10, crowd: ${e.current_crowd_level}, tags: ${(e.vibe_tags || []).join(', ')}, id: ${e.id}`).join('\n')}

Recommend 3 events most similar based on:
1. Same or similar venue type
2. Similar vibe tags
3. Similar vibe scores
4. Similar crowd levels

Return ONLY the event IDs as an array.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            event_ids: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      }) as { event_ids: string[] };

      const similar = result.event_ids
        .map(id => otherEvents.find(e => e.id === id))
        .filter(Boolean) as EventItem[];

      setRecommendations(similar);
    } catch (error) {
      console.error('Similar events error:', error);
      setRecommendations(allEvents.filter(e => e.id !== currentEvent.id).slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-8">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
        <p className="text-purple-200">Finding similar events...</p>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Similar Events</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}