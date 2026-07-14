import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, Flame, TrendingUp, Clock, Sparkles, MapPin, CalendarDays, Ticket, Music, Martini, Beer, Sunset, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EventCard from "@/components/events/EventCard";
import CreateEventDialog from "@/components/events/CreateEventDialog";
import ForYouSection from "@/components/recommendations/ForYouSection";
import NotificationBell from "@/components/notifications/NotificationBell";
import SendNotificationDialog from "@/components/notifications/SendNotificationDialog";
import useEventAlerts from "@/hooks/useEventAlerts";
import { useAuth } from "@/lib/AuthContext";

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  state?: string;
  vibe_tags?: string[];
  current_vibe_score?: number;
  status_count?: number;
  is_active?: boolean;
  created_date?: string;
  cover_image?: string;
  start_time?: string;
};

const venueFilters = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "club", label: "Clubs", icon: Music },
  { value: "lounge", label: "Lounge", icon: Martini },
  { value: "bar", label: "Bars", icon: Beer },
  { value: "rooftop", label: "Rooftop", icon: Sunset },
  { value: "concert", label: "Concert", icon: Mic },
];

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

export default function Home() {
  useEventAlerts();
  const { user } = useAuth();
  const [search, setSearch] = useState<string>("");
  const [venueFilter, setVenueFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [stateSearch, setStateSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("vibe");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const filteredStates = useMemo(() => {
    if (!stateSearch) return US_STATES;
    const q = stateSearch.toLowerCase();
    return US_STATES.filter(
      (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
    );
  }, [stateSearch]);

  const { data: events = [], isLoading, refetch } = useQuery<EventItem[]>({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date", 100),
  });

  const filteredEvents = events
    .filter((e) => e.is_active !== false)
    .filter((e) => venueFilter === "all" || e.venue_type === venueFilter)
    .filter((e) => stateFilter === "all" || e.state === stateFilter)
    .filter((e) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        e.title?.toLowerCase().includes(s) ||
        e.venue_name?.toLowerCase().includes(s) ||
        e.address?.toLowerCase().includes(s) ||
        e.vibe_tags?.some((t) => t.includes(s))
      );
    })
    .sort((a, b) => {
      if (sortBy === "vibe") return (b.current_vibe_score || 0) - (a.current_vibe_score || 0);
      if (sortBy === "trending") return (b.status_count || 0) - (a.status_count || 0);
      return new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
    });

  const litEvents = filteredEvents.filter((e) => (e.current_vibe_score || 0) >= 7);
  const otherEvents = filteredEvents.filter((e) => (e.current_vibe_score || 0) < 7);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative overflow-x-clip">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-purple-500/5 to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-32 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3">
              What's{" "}
              <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Lit
              </span>{" "}
              Tonight?
            </h1>
            <p className="text-zinc-400 text-lg max-w-md mx-auto">
              Real-time vibes from clubs, lounges & events near you
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venues, vibes..."
                className="bg-zinc-900/80 border-zinc-800 text-white pl-11 h-12 rounded-xl placeholder:text-zinc-600 focus-visible:ring-orange-500/30"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-col gap-2 pb-1 w-full lg:w-auto">
              <div className="flex flex-wrap gap-2">
                {venueFilters.map((f) => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setVenueFilter(f.value)}
                      className={cn(
                        "flex items-center gap-1.5 flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                        venueFilter === f.value
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className={cn(
                  "h-[30px] px-3 rounded-full text-xs font-medium border w-auto gap-1 self-start",
                  stateFilter !== "all"
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                )}>
                  <MapPin className="w-3 h-3" />
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                  <div className="p-2 sticky top-0 bg-zinc-900 border-b border-zinc-800 z-10">
                    <input
                      type="text"
                      placeholder="Search state..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <SelectItem value="all" className="text-zinc-300">All States</SelectItem>
                  {filteredStates.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-zinc-300">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 w-full sm:w-auto justify-between sm:justify-start">
                {[
                  { key: "vibe", label: "Top Vibes", icon: Flame, color: "text-orange-500", fill: "fill-orange-500/20" },
                  { key: "trending", label: "Trending", icon: TrendingUp, color: "text-pink-500" },
                  { key: "new", label: "New", icon: Clock, color: "text-purple-500" },
                ].map((s) => {
                  const isActive = sortBy === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={cn(
                        "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                        isActive
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <s.icon 
                        className={cn("w-3.5 h-3.5", isActive ? cn(s.color, s.fill) : "text-zinc-500")} 
                        strokeWidth={2.2}
                      />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <Link to={createPageUrl("MyCalendar")} className="flex-1 sm:flex-initial">
                  <Button variant="ghost" className="w-full sm:w-auto text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 h-8 text-xs">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> My Calendar
                  </Button>
                </Link>
                <NotificationBell />
                <CreateEventDialog onCreated={refetch} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events */}
      <div className="max-w-6xl mx-auto px-4 pb-16">

        {/* Map View */}
        {viewMode === "map" && (
          <div className="mt-6">
            <div className="text-zinc-500 text-sm">Map view coming soon</div>
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div>
            <ForYouSection />

            {(!user || (user.subscription_tier !== "plus" && user.subscription_tier !== "vip")) && (
              <div className="mt-6 bg-gradient-to-r from-purple-900/40 via-pink-900/35 to-orange-900/35 border border-purple-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 font-black text-[9px] uppercase tracking-wider px-2.5">Sponsored</Badge>
                  <h4 className="text-white font-bold text-sm">Experience VibeSocial Ad-Free</h4>
                  <p className="text-zinc-450 text-xs leading-relaxed">Upgrade to Plus or VIP for ad-free browsing, priority chat access, and skip-the-line VIP privileges.</p>
                </div>
                <Link to={createPageUrl("Subscription")} className="shrink-0 w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold text-xs h-9 rounded-xl px-4">
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-zinc-900/50 rounded-2xl h-72 animate-pulse" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-zinc-900/80 rounded-2xl border border-zinc-800 flex items-center justify-center mx-auto mb-5 shadow-inner">
                  <Sparkles className="w-8 h-8 text-zinc-600" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">Nothing happening yet</h3>
                <p className="text-zinc-500">Be the first to post an event tonight!</p>
              </div>
            ) : (
              <>
                {litEvents.length > 0 && (
                  <div className="mt-12 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame className="w-5 h-5 text-orange-400" />
                      <h2 className="text-lg font-bold text-white">Most Lit Right Now</h2>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">
                        {litEvents.length} events
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {litEvents.map((event, i) => (
                        <EventCard key={event.id} event={event} rank={i + 1} />
                      ))}
                    </div>
                  </div>
                )}

                {otherEvents.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      {litEvents.length > 0 ? "More Events" : "Events Tonight"}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {otherEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-20 md:bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <Link to={createPageUrl("MyOrders")}>
          <Button variant="ghost" className="text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900 hover:border-zinc-600 rounded-lg px-3 h-8 text-xs">
            <Ticket className="w-3.5 h-3.5 mr-1.5" /> My Tickets
          </Button>
        </Link>
        <SendNotificationDialog />
      </div>
    </div>
  );
}