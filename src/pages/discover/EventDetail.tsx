import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, Clock, Calendar, Share2, MessageCircle, ShieldCheck, Users, Ticket, Megaphone, Radio, MapPinCheck } from "lucide-react";
import SaveEventButton from "@/components/events/SaveEventButton";
import { format } from "date-fns";
import VibeScoreBadge from "@/components/events/VibeScoreBadge";
import CrowdIndicator from "@/components/events/CrowdIndicator";
import StatusUpdateForm from "@/components/events/StatusUpdateForm";
import StatusFeed from "@/components/events/StatusFeed";
import SimilarEvents from "@/components/recommendations/SimilarEvents";
import TicketSelector from "@/components/tickets/TicketSelector";
import TicketTypeManager from "@/components/tickets/TicketTypeManager";
import EventChatPanel from "@/components/events/EventChatPanel";
import CheckInButton from "@/components/events/CheckInButton";
import Checkout from "@/pages/user/Checkout";

const waitTimeLabel: Record<string, string> = {
  no_wait: "No wait", "5_min": "~5 min", "15_min": "~15 min",
  "30_min": "~30 min", "45_plus_min": "45+ min",
};

type EventData = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  description?: string;
  cover_image?: string;
  start_time?: string;
  end_time?: string;
  vibe_tags?: string[];
  current_vibe_score?: number;
  current_crowd_level?: string;
  current_wait_time?: string;
  status_count?: number;
  created_by?: string;
};

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

type CurrentUser = { id?: string; email?: string; full_name?: string } | null;

export default function EventDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("id") || "";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("update");
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);
  const [checkoutSelections, setCheckoutSelections] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => { });
  }, []);

  // Track event view
  useEffect(() => {
    const trackView = async () => {
      if (!eventId) return;
      try {
        const user = await base44.auth.me();
        const eventData = await base44.entities.Event.filter({ id: eventId });
        if (eventData[0]) {
          await base44.entities.UserActivity.create({
            event_id: eventId,
            action_type: "viewed",
            venue_type: eventData[0].venue_type,
            vibe_tags: eventData[0].vibe_tags || []
          });
        }
      } catch (err) {
        // User not logged in or error - continue without tracking
      }
    };
    trackView();
  }, [eventId]);

  const { data: event, isLoading: eventLoading } = useQuery<EventData[]>({
    queryKey: ["event", eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }),
    enabled: !!eventId,
  });
  const eventData = event?.[0];

  const { data: statuses = [], isLoading: statusesLoading } = useQuery<StatusItem[]>({
    queryKey: ["statuses", eventId],
    queryFn: () => base44.entities.EventStatus.filter({ event_id: eventId }, "-created_date", 50),
    enabled: !!eventId,
  });

  const handleStatusSubmitted = () => {
    queryClient.invalidateQueries({ queryKey: ["statuses", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    setActiveTab("feed");
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: eventData?.title, text: `Check out ${eventData?.title} at ${eventData?.venue_name}!`, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white gap-4">
        <span className="text-5xl">🔍</span>
        <h2 className="text-xl font-semibold">Event not found</h2>
        <Link to={createPageUrl("Home")}>
          <Button variant="outline" className="border-zinc-700 text-zinc-300">Go Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="relative">
        <div className="h-56 md:h-72 overflow-hidden">
          {eventData.cover_image ? (
            <img src={eventData.cover_image} alt={eventData.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/60 via-zinc-900 to-orange-900/30 flex items-center justify-center">
              {(() => {
                const Icon = venueTypeIcons[eventData.venue_type || "other"] || venueTypeIcons.other;
                return <Icon className="w-16 h-16 text-zinc-300" />;
              })()}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
          <Link to={createPageUrl("Home")}>
            <Button size="icon" variant="ghost" className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {eventData && <SaveEventButton event={eventData} className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full" />}
            <Button size="icon" variant="ghost" onClick={handleShare}
              className="bg-black/40 backdrop-blur-md hover:bg-black/60 rounded-full text-white">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Event Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              {(() => {
                const Icon = venueTypeIcons[eventData.venue_type || "other"] || venueTypeIcons.other;
                return <Icon className="w-4 h-4 text-orange-400" />;
              })()}
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                {eventData.venue_type?.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black leading-tight mb-1">{eventData.title}</h1>
            <p className="text-zinc-400 text-lg">{eventData.venue_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Status Bar */}
        <div className="flex flex-wrap items-center gap-3 py-5 border-b border-zinc-800">
          <VibeScoreBadge score={eventData.current_vibe_score} size="lg" />
          <CrowdIndicator level={eventData.current_crowd_level} />
          {eventData.current_wait_time && eventData.current_wait_time !== "no_wait" && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-400">
              <Clock className="w-4 h-4" />
              <span>{waitTimeLabel[eventData.current_wait_time]}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <MessageCircle className="w-4 h-4" />
            <span>{eventData.status_count || 0} updates</span>
          </div>
          {checkedIn && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-semibold text-green-400">Verified Attending</span>
            </div>
          )}
        </div>

        <div className="py-5 space-y-4 border-b border-zinc-800">
          {eventData.address && (
            <div className="flex items-center gap-2.5 text-zinc-300 text-base">
              <MapPin className="w-5 h-5 flex-shrink-0 text-zinc-500" />
              <span>{eventData.address}</span>
            </div>
          )}
          {eventData.start_time && (
            <div className="flex items-center gap-2.5 text-zinc-300 text-base font-medium">
              <Calendar className="w-5 h-5 flex-shrink-0 text-orange-500" />
              <span>
                {format(new Date(eventData.start_time), "EEEE, MMMM d · h:mm a")}
                {eventData.end_time && ` — ${format(new Date(eventData.end_time), "h:mm a")}`}
              </span>
            </div>
          )}
          {eventData.description && (
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed pt-2">{eventData.description}</p>
          )}
          {eventData.vibe_tags && eventData.vibe_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {eventData.vibe_tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Creator Controls */}
        {currentUser && eventData.created_by === currentUser.email && (
          <div className="py-4 flex flex-wrap gap-2 border-b border-zinc-800">
            <TicketTypeManager event={eventData} />
            <Link to={createPageUrl(`EventOrders?event_id=${eventData.id}`)}>
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <Users className="w-4 h-4 mr-1.5" /> View Orders
              </Button>
            </Link>
          </div>
        )}

        {/* Tabs: Update + Feed */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-zinc-900 border border-zinc-800 w-full flex overflow-x-auto justify-start sm:justify-center whitespace-nowrap p-1 h-auto gap-1">
              <TabsTrigger value="checkin" className="flex-1 sm:flex-none flex-shrink-0 gap-1.5 items-center justify-center data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 py-2.5 px-4 text-xs md:text-sm rounded-lg">
                <MapPinCheck className="w-4 h-4" /> Check In
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex-1 sm:flex-none flex-shrink-0 gap-1.5 items-center justify-center data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 py-2.5 px-4 text-xs md:text-sm rounded-lg">
                <Ticket className="w-4 h-4" /> Tickets
              </TabsTrigger>
              <TabsTrigger value="update" className="flex-1 sm:flex-none flex-shrink-0 gap-1.5 items-center justify-center data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 py-2.5 px-4 text-xs md:text-sm rounded-lg">
                <Megaphone className="w-4 h-4" /> Drop Update
              </TabsTrigger>
              <TabsTrigger value="feed" className="flex-1 sm:flex-none flex-shrink-0 gap-1.5 items-center justify-center data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 py-2.5 px-4 text-xs md:text-sm rounded-lg">
                <Radio className="w-4 h-4 text-emerald-500" /> Live Feed ({statuses.length})
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 sm:flex-none flex-shrink-0 gap-1.5 items-center justify-center data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500 py-2.5 px-4 text-xs md:text-sm rounded-lg">
                <MessageCircle className="w-4 h-4" /> Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="checkin" className="mt-5">
              {!currentUser ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                  <MapPin className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-zinc-300 font-semibold">Sign in to check in</p>
                  <p className="text-zinc-500 text-xs">Verify your presence at the venue to let others know you are here.</p>
                  <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Sign In
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-zinc-300 font-semibold mb-1">Verify you're here</p>
                    <p className="text-zinc-500 text-sm">Check in via your location or a QR code from the organizer to earn a <span className="text-green-400 font-medium">Verified Attending</span> badge.</p>
                  </div>
                  <CheckInButton event={eventData} onCheckedIn={() => { setCheckedIn(true); queryClient.invalidateQueries({ queryKey: ["event", eventId] }); }} />
                </div>
              )}
            </TabsContent>
            <TabsContent value="tickets" className="mt-5">
              {!currentUser ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                  <Ticket className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-zinc-300 font-semibold">Sign in to buy tickets</p>
                  <p className="text-zinc-500 text-xs">You need an account to purchase tickets and receive your booking confirmation.</p>
                  <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Sign In
                  </Button>
                </div>
              ) : checkoutSelections ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative">
                  <button
                    onClick={() => setCheckoutSelections(null)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <Checkout
                    eventIdProp={eventId}
                    quantitiesProp={checkoutSelections}
                    onCancel={() => setCheckoutSelections(null)}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
                    }}
                  />
                </div>
              ) : (
                <TicketSelector
                  eventId={eventId}
                  onCheckoutSelected={(quantities) => setCheckoutSelections(quantities)}
                />
              )}
            </TabsContent>
            <TabsContent value="update" className="mt-5">
              {!currentUser ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                  <Megaphone className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-zinc-300 font-semibold">Sign in to drop update</p>
                  <p className="text-zinc-500 text-xs">Share real-time reports about wait times, crowd capacity, and the music vibe.</p>
                  <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Sign In
                  </Button>
                </div>
              ) : (
                <StatusUpdateForm eventId={eventId} onSubmitted={handleStatusSubmitted} />
              )}
            </TabsContent>
            <TabsContent value="feed" className="mt-5">
              <StatusFeed statuses={statuses} loading={statusesLoading} />
            </TabsContent>
            <TabsContent value="chat" className="mt-5">
              {!currentUser ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
                  <MessageCircle className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-zinc-300 font-semibold">Sign in to join chat</p>
                  <p className="text-zinc-500 text-xs">Join the live chat room for this event to coordinate with other attendees.</p>
                  <Button onClick={() => base44.auth.redirectToLogin(window.location.pathname + window.location.search)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Sign In
                  </Button>
                </div>
              ) : (
                <EventChatPanel eventId={eventId} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Events */}
        <SimilarEvents currentEvent={eventData} />
      </div>
    </div>
  );
}