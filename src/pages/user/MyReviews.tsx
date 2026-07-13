import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Star,
  Loader2,
  MessageSquare,
  Send,
  CheckCircle2,
  UserCircle,
  PenLine,
} from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const VIBE_TAG_OPTIONS = ["fire", "chill", "hiphop", "techno", "crowded", "expensive", "friendly", "late_night"];

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
};

type ReviewItem = {
  id: string;
  event_id: string;
  rating?: number;
  review_text?: string;
  vibe_tags?: string[];
};

type ActivityItem = {
  id: string;
  event_id: string;
  action_type: string;
  check_in_verified?: boolean;
};

export default function MyReviews() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<{ id?: string } | null>(authUser);
  const [loading, setLoading] = useState<boolean>(!authUser);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setLoading(false);
    }
    base44.auth
      .me()
      .then((u: any) => setUser(u))
      .catch((err) => {
        console.error("MyReviews API load error, falling back to AuthContext:", err);
        if (authUser) {
          setUser(authUser);
        } else {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [authUser]);

  // All activity — attended / checked in events
  const { data: activities = [], isLoading: actLoading } = useQuery<ActivityItem[]>({
    queryKey: ["reviewActivities", user?.id],
    queryFn: () => base44.entities.UserActivity.filter({ created_by_id: user?.id }, "-created_date", 500),
    enabled: !!user?.id,
  });

  // Events the user has attended (unique by event_id)
  const attendedEventIds = useMemo(() => {
    const attended = activities.filter(
      (a) => (a.action_type === "checked_in" && a.check_in_verified) || a.action_type === "attended"
    );
    return [...new Set(attended.map((a) => a.event_id))];
  }, [activities]);

  // Fetch event details
  const { data: events = [], isLoading: eventsLoading } = useQuery<EventItem[]>({
    queryKey: ["reviewEvents", attendedEventIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        attendedEventIds.map((id) => base44.entities.Event.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: attendedEventIds.length > 0,
  });

  // Fetch user's existing reviews
  const { data: myReviews = [], isLoading: reviewsLoading } = useQuery<ReviewItem[]>({
    queryKey: ["myReviews", user?.id],
    queryFn: () => base44.entities.Review.filter({ created_by_id: user?.id }, "-created_date", 200),
    enabled: !!user?.id,
  });

  const reviewByEvent = useMemo(() => {
    const m: Record<string, ReviewItem> = {};
    myReviews.forEach((r) => { m[r.event_id] = r; });
    return m;
  }, [myReviews]);

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
          <h2 className="text-xl font-bold text-white mb-1">Sign in to write reviews</h2>
          <p className="text-zinc-500 text-sm">Rate venues from events you've attended.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/my-reviews")} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sign In
        </Button>
      </div>
    );
  }

  const isLoading = actLoading || eventsLoading || reviewsLoading;

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
            <Star className="w-6 h-6 text-orange-400" /> My Reviews
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Rate and review venues from events you've attended.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No events to review yet</h3>
            <p className="text-zinc-600 mb-6 text-sm">Attend and check in at events to unlock reviews.</p>
            <Link to={createPageUrl("Home")}>
              <Button className="bg-orange-500 hover:bg-orange-600">Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <ReviewCard
                key={event.id}
                event={event}
                existingReview={reviewByEvent[event.id]}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["myReviews", user.id] })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ event, existingReview, onSaved }: {
  event: EventItem;
  existingReview?: ReviewItem;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hover, setHover] = useState<number>(0);
  const [text, setText] = useState<string>(existingReview?.review_text || "");
  const [tags, setTags] = useState<string[]>(existingReview?.vibe_tags || []);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setSaved(false);
    try {
      if (existingReview?.id) {
        await base44.entities.Review.update(existingReview.id, {
          rating,
          review_text: text.trim(),
          vibe_tags: tags,
        });
      } else {
        await base44.entities.Review.create({
          event_id: event.id,
          event_title: event.title,
          venue_name: event.venue_name,
          venue_type: event.venue_type,
          rating,
          review_text: text.trim(),
          vibe_tags: tags,
        });
      }
      setSaved(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // ignore
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Event header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            {(() => {
              const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
              return <Icon className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />;
            })()}
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{event.title}</h3>
              <p className="text-zinc-400 text-xs truncate">{event.venue_name}</p>
            </div>
          </div>
          <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`}>
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white text-xs -mr-2">
              View
            </Button>
          </Link>
        </div>
      </div>

      {/* Existing review or edit form */}
      {existingReview && !editing ? (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn("w-4 h-4", i <= (existingReview.rating || 0) ? "text-orange-400 fill-orange-400" : "text-zinc-700")}
                />
              ))}
            </div>
            <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Reviewed
            </Badge>
          </div>
          {existingReview.review_text && (
            <p className="text-zinc-300 text-sm mt-2">{existingReview.review_text}</p>
          )}
          {existingReview.vibe_tags && existingReview.vibe_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {existingReview.vibe_tags.map((t) => (
                <span key={t} className="text-[10px] bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">#{t}</span>
              ))}
            </div>
          )}
          {saved && (
            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Review saved
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditing(true); setSaved(false); }}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs mt-3"
          >
            <PenLine className="w-3 h-3 mr-1" /> Edit Review
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Star rating */}
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-2">Your rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      "w-7 h-7 transition",
                      i <= (hover || rating)
                        ? "text-orange-400 fill-orange-400"
                        : "text-zinc-700 hover:text-zinc-500"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Vibe tags */}
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-2">Vibe tags (optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "text-xs rounded-full px-2.5 py-1 border transition",
                    tags.includes(tag)
                      ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <p className="text-xs text-zinc-400 font-medium mb-1.5">Your review (optional)</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Share your experience…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40 resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1 text-right">{text.length}/500</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Saving…" : existingReview ? "Update Review" : "Submit Review"}
            </Button>
            {existingReview && (
              <Button
                variant="outline"
                onClick={() => { setEditing(false); setRating(existingReview.rating || 0); setText(existingReview.review_text || ""); setTags(existingReview.vibe_tags || []); }}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            )}
          </div>
          {rating === 0 && (
            <p className="text-zinc-600 text-xs text-center">Select a star rating to submit.</p>
          )}
        </div>
      )}
    </div>
  );
}