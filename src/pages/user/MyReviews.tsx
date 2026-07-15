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
  Sparkles,
  Layers,
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
  comment?: string;
  review_text?: string; // fallback
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
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
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

  // Categorize events into Pending vs Reviewed
  const pendingEvents = useMemo(() => {
    return events.filter(e => !reviewByEvent[e.id]);
  }, [events, reviewByEvent]);

  const reviewedEvents = useMemo(() => {
    return events.filter(e => !!reviewByEvent[e.id]);
  }, [events, reviewByEvent]);

  const averageRating = useMemo(() => {
    if (myReviews.length === 0) return 0;
    const total = myReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return parseFloat((total / myReviews.length).toFixed(1));
  }, [myReviews]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <UserCircle className="w-16 h-16 text-zinc-800 animate-pulse" />
        <div>
          <h2 className="text-xl font-black text-white mb-1">Sign in to write reviews</h2>
          <p className="text-zinc-500 text-sm max-w-xs">Rate and review the venues and events you have attended recently.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/my-reviews")} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl px-6">
          Sign In
        </Button>
      </div>
    );
  }

  const isLoading = actLoading || eventsLoading || reviewsLoading;

  return (
    <div className="min-h-screen pb-20 bg-zinc-950 text-zinc-100 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-955 border-b border-zinc-900/50">
        <div className="absolute top-0 right-0 w-80 h-40 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-40 bg-pink-500/5 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" size="sm" className="border-zinc-850 bg-zinc-900/30 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs gap-1.5 mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
            <Star className="w-7 h-7 text-orange-400 fill-orange-400/20" /> My Reviews
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Build your Vibe Profile by sharing feedback on event venues you've checked into.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Stats Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                <h2 className="text-sm font-bold text-zinc-350 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" /> Vibe Statistics
                </h2>
                
                {/* Visual gauge */}
                <div className="flex items-center gap-5 pb-6 border-b border-zinc-800/80 mb-5">
                  <div className="w-20 h-20 rounded-full border-4 border-orange-500/20 flex flex-col items-center justify-center bg-zinc-950/40 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-pulse" />
                    <span className="text-2xl font-black text-white leading-none">{averageRating}</span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mt-1">Score</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Average Rating</h3>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={cn(
                            "w-3.5 h-3.5",
                            star <= Math.round(averageRating) ? "text-orange-400 fill-orange-400" : "text-zinc-850"
                          )} 
                        />
                      ))}
                    </div>
                    <p className="text-zinc-500 text-[11px] mt-1.5">Based on {myReviews.length} submissions</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-500 text-xs">Total Attended Events</span>
                    <span className="font-semibold text-zinc-300">{events.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-500 text-xs">Reviews Completed</span>
                    <span className="font-semibold text-orange-400">{myReviews.length}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-500 text-xs">Pending Reviews</span>
                    <span className="font-semibold text-zinc-400">{pendingEvents.length}</span>
                  </div>
                </div>

                {myReviews.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-zinc-800/80">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Top Vibe Tags Used</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set(myReviews.flatMap((r) => r.vibe_tags || []))
                      ).slice(0, 6).map((tag) => (
                        <span key={tag} className="text-[10px] bg-zinc-950 text-zinc-400 border border-zinc-850 rounded-full px-2.5 py-1">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Tabbed Lists */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Selector */}
              <div className="flex border-b border-zinc-900">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={cn(
                    "pb-3.5 text-xs uppercase font-bold tracking-widest border-b-2 transition-all mr-6 flex items-center gap-2",
                    activeTab === "pending"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <PenLine className="w-3.5 h-3.5" /> Pending Review
                  {pendingEvents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] font-black rounded-md border border-orange-500/20">
                      {pendingEvents.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "pb-3.5 text-xs uppercase font-bold tracking-widest border-b-2 transition-all flex items-center gap-2",
                    activeTab === "history"
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" /> Review History
                  {reviewedEvents.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[10px] font-black rounded-md border border-zinc-700">
                      {reviewedEvents.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "pending" ? (
                pendingEvents.length === 0 ? (
                  <div className="bg-zinc-900/25 border border-zinc-900 border-dashed rounded-2xl p-12 text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 text-zinc-755" />
                    <h3 className="text-sm font-bold text-zinc-400 mb-1">All caught up!</h3>
                    <p className="text-zinc-600 text-xs max-w-xs mx-auto">No pending events to review. Attend some events and check in to unlock reviews!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingEvents.map((event) => (
                      <ReviewCard
                        key={event.id}
                        event={event}
                        existingReview={reviewByEvent[event.id]}
                        onSaved={() => queryClient.invalidateQueries({ queryKey: ["myReviews", user.id] })}
                        defaultEditing={true}
                        pendingEventsCount={pendingEvents.length}
                      />
                    ))}
                  </div>
                )
              ) : reviewedEvents.length === 0 ? (
                <div className="bg-zinc-900/25 border border-zinc-900 border-dashed rounded-2xl p-12 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-zinc-755" />
                  <h3 className="text-sm font-bold text-zinc-450 mb-1">No history yet</h3>
                  <p className="text-zinc-650 text-xs max-w-xs mx-auto">You haven't written any reviews yet. Click the "Pending Review" tab to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewedEvents.map((event) => (
                    <ReviewCard
                      key={event.id}
                      event={event}
                      existingReview={reviewByEvent[event.id]}
                      onSaved={() => queryClient.invalidateQueries({ queryKey: ["myReviews", user.id] })}
                      defaultEditing={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ event, existingReview, onSaved, defaultEditing, pendingEventsCount = 0 }: {
  event: EventItem;
  existingReview?: ReviewItem;
  onSaved: () => void;
  defaultEditing: boolean;
  pendingEventsCount?: number;
}) {
  const [editing, setEditing] = useState<boolean>(defaultEditing);
  const [rating, setRating] = useState<number>(existingReview?.rating || 0);
  const [hover, setHover] = useState<number>(0);
  const [text, setText] = useState<string>(existingReview?.comment || existingReview?.review_text || "");
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
          comment: text.trim(),
          vibe_tags: tags,
        });
      } else {
        await base44.entities.Review.create({
          event_id: event.id,
          event_title: event.title,
          venue_name: event.venue_name,
          venue_type: event.venue_type,
          rating,
          comment: text.trim(),
          vibe_tags: tags,
        });
      }
      setSaved(true);
      setEditing(false);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  return (
    <div className={cn(
      "bg-zinc-900/40 border rounded-2xl overflow-hidden transition-all duration-300 hover:border-zinc-800/80",
      existingReview && !editing ? "border-zinc-900" : "border-orange-500/10 shadow-lg shadow-orange-500/2"
    )}>
      {/* Event header */}
      <div className="p-4 bg-zinc-900/20 border-b border-zinc-900/60 flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-zinc-950/60 border border-zinc-850 flex items-center justify-center flex-shrink-0">
            {(() => {
              const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
              return <Icon className="w-5 h-5 text-orange-400" />;
            })()}
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-bold text-sm truncate">{event.title}</h3>
            <p className="text-zinc-500 text-xs truncate flex items-center gap-1.5 mt-0.5">
              <span>{event.venue_name}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="capitalize">{event.venue_type}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`}>
            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white hover:bg-zinc-800/50 text-[11px] rounded-lg px-2.5 h-8">
              View Venue
            </Button>
          </Link>
        </div>
      </div>

      {/* Existing review display */}
      {existingReview && !editing ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn("w-4 h-4", i <= (existingReview.rating || 0) ? "text-orange-400 fill-orange-400" : "text-zinc-800")}
                  />
                ))}
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider h-5 px-1.5 flex items-center">
                <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Reviewed
              </Badge>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditing(true); setSaved(false); }}
              className="border-zinc-800 bg-zinc-900/30 text-zinc-450 hover:text-white hover:bg-zinc-800 text-xs px-3 h-8 rounded-lg"
            >
              <PenLine className="w-3 h-3 mr-1.5" /> Edit
            </Button>
          </div>
          
          {(existingReview.comment || existingReview.review_text) && (
            <p className="text-zinc-300 text-xs leading-relaxed bg-zinc-955/35 border border-zinc-850/30 p-3 rounded-xl">
              {existingReview.comment || existingReview.review_text}
            </p>
          )}
          
          {existingReview.vibe_tags && existingReview.vibe_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {existingReview.vibe_tags.map((t) => (
                <span key={t} className="text-[10px] bg-zinc-950 text-zinc-550 border border-zinc-850 rounded-full px-2 py-0.5">
                  #{t}
                </span>
              ))}
            </div>
          )}
          
          {saved && (
            <p className="text-green-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Review saved successfully
            </p>
          )}
        </div>
      ) : (
        /* Edit or New Form */
        <div className="p-5 space-y-4 bg-zinc-900/10">
          {/* Star rating */}
          <div>
            <p className="text-xs text-zinc-450 font-bold uppercase tracking-wider mb-2">Rating</p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors duration-150",
                      i <= (hover || rating)
                        ? "text-orange-400 fill-orange-400 filter drop-shadow-[0_0_4px_rgba(251,146,60,0.25)]"
                        : "text-zinc-800 hover:text-zinc-650"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Vibe tags */}
          <div>
            <p className="text-xs text-zinc-455 font-bold uppercase tracking-wider mb-2">Select Vibes (Optional)</p>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_TAG_OPTIONS.map((tag) => {
                const isActive = tags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "text-[11px] font-medium rounded-full px-3 py-1 border transition-all duration-150",
                      isActive
                        ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                        : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:border-zinc-800 hover:text-zinc-350"
                    )}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review text */}
          <div>
            <p className="text-xs text-zinc-455 font-bold uppercase tracking-wider mb-2">Comments (Optional)</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="How was the crowd, the audio, and the staff?"
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 resize-none transition-colors"
            />
            <p className="text-[9px] text-zinc-600 mt-1 text-right">{text.length} / 500 characters</p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold h-9 rounded-lg"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              {submitting ? "Saving…" : existingReview ? "Save Changes" : "Post Review"}
            </Button>
            
            {existingReview ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setRating(existingReview.rating || 0);
                  setText(existingReview.comment || existingReview.review_text || "");
                  setTags(existingReview.vibe_tags || []);
                }}
                className="border-zinc-850 bg-zinc-900/30 text-zinc-450 hover:text-zinc-250 h-9 rounded-lg px-4"
              >
                Cancel
              </Button>
            ) : (
              // If it's a new review, let them collapse the editor if it's defaultEditing
              pendingEventsCount > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setRating(0)}
                  className="text-zinc-550 hover:text-zinc-455 h-9 px-3"
                >
                  Clear
                </Button>
              )
            )}
          </div>
          
          {rating === 0 && (
            <p className="text-zinc-600 text-[10px] text-center">Please select a star rating to publish your review.</p>
          )}
        </div>
      )}
    </div>
  );
}