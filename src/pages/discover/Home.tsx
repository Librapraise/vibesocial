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

import { useEffect, useRef } from "react";

function VibeMap({ events }: { events: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cssId = "leaflet-cdn-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-cdn-js";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(interval);
          initMap();
        }
      }, 100);
    }

    let mapInstance: any = null;

    function initMap() {
      if (!mapRef.current) return;
      const L = (window as any).L;
      if (!L) return;

      if (mapRef.current.innerHTML !== "") {
        mapRef.current.innerHTML = "";
      }

      const activeEvents = events.filter((e) => e.lat && e.lng);
      const centerLat = activeEvents[0]?.lat || 40.7128;
      const centerLng = activeEvents[0]?.lng || -74.0060;

      mapInstance = L.map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(mapInstance);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(mapInstance);

      activeEvents.forEach((e) => {
        const score = Number(e.current_vibe_score || 0);
        const color = score >= 7 ? "#f97316" : score >= 4 ? "#a855f7" : "#3b82f6";
        const marker = L.circleMarker([e.lat, e.lng], {
          radius: 10,
          fillColor: color,
          color: "#fff",
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapInstance);

        const popupContent = `
          <div style="color: #fafafa; font-family: sans-serif; padding: 4px; font-size: 12px; line-height: 1.4; width: 180px;">
            <strong style="font-size: 13px; color: #fff; display: block; margin-bottom: 2px;">${e.title}</strong>
            <span style="color: #a1a1aa; display: block; font-weight: 500; margin-bottom: 2px;">${e.venue_name}</span>
            <span style="color: #71717a; font-size: 10px; display: block; margin-bottom: 8px;">${e.address}</span>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="background-color: ${color}20; color: ${color}; border: 1px solid ${color}40; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px; text-transform: uppercase;">
                VIBE: ${score.toFixed(1)}
              </span>
              <a href="/EventDetail/${e.id}" style="color: #f97316; font-weight: bold; font-size: 10px; text-decoration: underline;">
                View Details
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: "dark-popup",
        });
      });
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [events]);

  return (
    <div className="w-full h-[500px] rounded-2xl border border-zinc-800 overflow-hidden relative bg-zinc-950 z-0">
      <div ref={mapRef} className="w-full h-full z-0" />
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #18181b !important;
          border: 1px solid #27272a !important;
          border-radius: 12px !important;
        }
        .leaflet-popup-tip {
          background: #18181b !important;
          border: 1px solid #27272a !important;
        }
        .leaflet-popup-close-button {
          color: #71717a !important;
        }
      `}</style>
    </div>
  );
}

// Keep original code below...
export default function Home() {
  useEventAlerts();
  const { user } = useAuth();
  const [search, setSearch] = useState<string>("");
  const [venueFilter, setVenueFilter] = useState<string>("all");

  React.useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("search");
    if (query) {
      setSearch(query);
    }
  }, []);
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

          {/* Filters Panel */}
          <div className="relative z-20 bg-zinc-900/30 border border-zinc-900/60 rounded-3xl p-5 space-y-4 max-w-5xl mx-auto backdrop-blur-sm shadow-xl">
            {/* Top row: Categories and State Selection */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none select-none">
                {venueFilters.map((f) => {
                  const Icon = f.icon;
                  const isActive = venueFilter === f.value;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setVenueFilter(f.value)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0",
                        isActive
                          ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20"
                          : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-white"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[10px] text-zinc-550 uppercase tracking-widest font-black">Region:</span>
                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className={cn(
                    "h-9 px-4 rounded-xl text-xs font-bold border w-36 gap-2 bg-zinc-950/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                  )}>
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
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
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <SelectItem value="all" className="text-zinc-300">All States</SelectItem>
                    {filteredStates.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="text-zinc-300">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom row: Sort, View mode, and Actions */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Sorting Segmented Control */}
                <div className="flex bg-zinc-950/60 border border-zinc-850 rounded-xl p-0.5 w-full sm:w-auto">
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
                          "flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                          isActive
                            ? "bg-zinc-800 text-white shadow-sm"
                            : "text-zinc-550 hover:text-zinc-300"
                        )}
                      >
                        <s.icon 
                          className={cn("w-3.5 h-3.5", isActive ? cn(s.color, s.fill) : "text-zinc-550")} 
                          strokeWidth={2.2}
                        />
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* View Mode Toggle: List / Map */}
                <div className="flex bg-zinc-950/60 border border-zinc-850 rounded-xl p-0.5 h-9 shrink-0">
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "px-3.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all",
                      viewMode === "list" ? "bg-zinc-800 text-white" : "text-zinc-550 hover:text-zinc-300"
                    )}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={cn(
                      "px-3.5 rounded-lg text-[10px] uppercase font-black tracking-wider transition-all",
                      viewMode === "map" ? "bg-zinc-800 text-white" : "text-zinc-550 hover:text-zinc-300"
                    )}
                  >
                    Map
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <Link to={createPageUrl("MyCalendar")}>
                  <Button variant="ghost" className="text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-950/20 hover:bg-zinc-900 rounded-xl px-3.5 h-9 text-xs font-bold transition">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> My Calendar
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
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Vibe Map Hotspots</h2>
            </div>
            <VibeMap events={filteredEvents} />
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