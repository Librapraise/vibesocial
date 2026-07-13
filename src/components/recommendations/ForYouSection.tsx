import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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

type UserActivity = {
  action_type?: string;
  venue_type?: string;
  vibe_tags?: string[];
  event_id?: string;
};

export default function ForYouSection() {
  const [recommendations, setRecommendations] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: userActivities = [] } = useQuery<UserActivity[]>({
    queryKey: ['userActivities'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.UserActivity.filter({ created_by: user.email }, '-created_date', 50);
    },
  });

  const { data: allEvents = [] } = useQuery<EventItem[]>({
    queryKey: ['allEvents'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, '-current_vibe_score'),
  });

  useEffect(() => {
    generateRecommendations();
  }, [userActivities, allEvents]);

  const generateRecommendations = async () => {
    if (!allEvents.length) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Analyze user preferences
      const likedVenueTypes = userActivities
        .filter(a => ['liked', 'attended', 'dropped_status'].includes(a.action_type || ''))
        .map(a => a.venue_type)
        .filter(Boolean) as string[];

      const likedTags = userActivities
        .filter(a => ['liked', 'attended', 'dropped_status'].includes(a.action_type || ''))
        .flatMap(a => a.vibe_tags || []);

      const viewedEventIds = userActivities
        .filter(a => a.action_type === 'viewed')
        .map(a => a.event_id);

      // If no user activity, show top events
      if (userActivities.length === 0) {
        setRecommendations(allEvents.slice(0, 4));
        setLoading(false);
        return;
      }

      // Use AI to generate personalized recommendations
      const prompt = `You are an event recommendation engine. Analyze the user's preferences and current events to recommend the best matches.

User Preferences:
- Liked venue types: ${likedVenueTypes.join(', ') || 'none yet'}
- Interested in tags: ${likedTags.join(', ') || 'none yet'}
- Previously viewed ${viewedEventIds.length} events

Available Events:
${allEvents.map(e => `- ${e.title} at ${e.venue_name} (${e.venue_type}), vibe: ${e.current_vibe_score || 0}/10, crowd: ${e.current_crowd_level}, tags: ${(e.vibe_tags || []).join(', ')}, id: ${e.id}`).join('\n')}

Recommend 4 events that best match the user's preferences. Consider:
1. Venue types they've enjoyed
2. Vibe tags they're interested in
3. Current vibe scores (higher is better)
4. Variety (don't recommend all the same type)
5. Avoid events they've already viewed recently

Return ONLY the event IDs as an array, ordered by best match first.`;

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

      const recommendedEvents = result.event_ids
        .map(id => allEvents.find(e => e.id === id))
        .filter(Boolean) as EventItem[];

      setRecommendations(recommendedEvents.length > 0 ? recommendedEvents.slice(0, 4) : allEvents.slice(0, 4));
    } catch (error) {
      console.error('Recommendation error:', error);
      setRecommendations(allEvents.slice(0, 4));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 p-8">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <p className="text-purple-200">Personalizing your recommendations...</p>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-bold text-white">For You</h2>
        <span className="text-sm text-zinc-400">Personalized picks based on your vibe</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}