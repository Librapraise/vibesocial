import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Ticket,
  Users,
  DollarSign,
  TrendingUp,
  Settings,
  Megaphone,
  Crown,
  QrCode,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import TicketTypeManager from "@/components/tickets/TicketTypeManager";
import StatusUpdateForm from "@/components/events/StatusUpdateForm";
import StripeConnectCard from "@/components/organizer/StripeConnectCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type EventItem = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  start_time?: string;
  vibe_tags?: string[];
  current_vibe_score?: number;
  current_crowd_level?: string;
  current_wait_time?: string;
  status_count?: number;
  created_by?: string;
};

type OrderItem = {
  id: string;
  buyer_name?: string;
  attendee_name?: string;
  total_amount?: number;
  confirmation_code?: string;
  tickets?: { quantity?: number }[];
};

type TicketTypeItem = {
  id: string;
  tickets_sold?: number;
};

type EventStatusItem = { id: string };

export default function OrganizerPortal() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<any>(authUser);
  const [userLoading, setUserLoading] = useState<boolean>(!authUser);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [qrCodeInput, setQrCodeInput] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScanVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim()) return;
    setScanning(true);
    setScanResult(null);
    setScanError(null);
    try {
      const response = await fetch("http://localhost:5000/api/tickets/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ qr_code_data: qrCodeInput.trim().toUpperCase() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setScanError(data.error || "Failed to validate ticket");
      } else {
        setScanResult(data);
        setQrCodeInput("");
      }
    } catch (err: any) {
      setScanError(err?.message || "Connection error");
    }
    setScanning(false);
  };

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setUserLoading(false);
    }
    base44.auth
      .me()
      .then(setUser)
      .catch((err) => {
        console.error("OrganizerPortal API load error, falling back to AuthContext:", err);
        if (authUser) {
          setUser(authUser);
        } else {
          setUser(null);
        }
      })
      .finally(() => setUserLoading(false));
  }, [authUser]);

  // Events created by current user (fallback to all active if none)
  const { data: myEvents = [], isLoading: isLoadingEvents } = useQuery<EventItem[]>({
    queryKey: ["organizerEvents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const own = await base44.entities.Event.filter({ created_by_id: user.id }, "-created_date", 100).catch(() => []);
      if (own.length) return own;
      return base44.entities.Event.filter({ is_active: true }, "-created_date", 50);
    },
    enabled: !!user?.id,
  });

  const selectedEvent = myEvents.find((e) => e.id === selectedEventId) || myEvents[0];
  const activeId = selectedEvent?.id;

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<OrderItem[]>({
    queryKey: ["eventOrders", activeId],
    queryFn: () => base44.entities.Order.filter({ event_id: activeId }, "-created_date", 200),
    enabled: !!activeId,
  });

  const { data: ticketTypes = [], isLoading: isLoadingTickets } = useQuery<TicketTypeItem[]>({
    queryKey: ["eventTicketTypes", activeId],
    queryFn: () => base44.entities.TicketType.filter({ event_id: activeId }, "-created_date", 50),
    enabled: !!activeId,
  });

  const { data: statuses = [] } = useQuery<EventStatusItem[]>({
    queryKey: ["eventStatusesPortal", activeId],
    queryFn: () => base44.entities.EventStatus.filter({ event_id: activeId }, "-created_date", 50),
    enabled: !!activeId,
  });

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const attendees = orders.reduce((sum, o) => sum + (o.tickets?.reduce((t, ti) => t + (ti.quantity || 0), 0) || 0), 0);
    const ticketsSold = ticketTypes.reduce((sum, t) => sum + (t.tickets_sold || 0), 0);
    return { revenue, attendees, ticketsSold, orderCount: orders.length, statusCount: statuses.length };
  }, [orders, ticketTypes, statuses]);

  if (userLoading || isLoadingEvents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Crown className="w-14 h-14 text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to access the Organizer Portal</h2>
          <p className="text-zinc-500 text-sm">Manage your events, ticket sales, and live status.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/organizer-portal")} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sign In
        </Button>
      </div>
    );
  }

  if (myEvents.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <div className="text-center py-20 text-zinc-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">You haven't organized any events yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-orange-400" /> Organizer Portal
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Track sales, check attendees, and update your event's live status.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Event selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {myEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedEventId(e.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition",
                activeId === e.id
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <span className="inline-flex items-center gap-1.5 capitalize">
                {(() => {
                  const Icon = venueTypeIcons[e.venue_type || "other"] || venueTypeIcons.other;
                  return <Icon className={cn("w-3.5 h-3.5", activeId === e.id ? "text-white" : "text-orange-400")} />;
                })()}
                {e.title}
              </span>
            </button>
          ))}
        </div>

        {selectedEvent && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(0)}`} color="green" />
              <StatCard icon={Users} label="Attendees" value={stats.attendees} color="blue" />
              <StatCard icon={Ticket} label="Tickets Sold" value={stats.ticketsSold} color="orange" />
              <StatCard icon={TrendingUp} label="Status Updates" value={stats.statusCount} color="purple" />
            </div>

            {/* Event header */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                  <p className="text-zinc-400 text-sm">{selectedEvent.venue_name}</p>
                  {selectedEvent.start_time && (
                    <p className="text-zinc-500 text-xs mt-1">
                      {format(new Date(selectedEvent.start_time), "EEEE, MMM d · h:mm a")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link to={`${createPageUrl("EventDetail")}?id=${selectedEvent.id}`}>
                    <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      View Event
                    </Button>
                  </Link>
                  <Link to={`${createPageUrl("EventOrders")}?event_id=${selectedEvent.id}`}>
                    <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      Full Orders
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent orders / attendees */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-white">Recent Attendees</h3>
              </div>
              {isLoadingOrders ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
              ) : orders.length === 0 ? (
                <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
                  No orders yet.
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
                  {orders.slice(0, 8).map((o) => (
                    <div key={o.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {(o.attendee_name || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{o.attendee_name}</p>
                          <p className="text-zinc-500 text-xs truncate">
                            {o.tickets?.reduce((t, ti) => t + (ti.quantity || 0), 0) || 0} ticket(s) · ${o.total_amount || 0}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
                        {o.confirmation_code?.slice(0, 8) || "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Ticket manager */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-white">Ticket Types</h3>
              </div>
              {isLoadingTickets ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
              ) : (
                <TicketTypeManager event={{ id: selectedEvent.id, title: selectedEvent.title }} />
              )}
            </section>

            {/* Ticket scanning console */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <QrCode className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Ticket Verification Console</h3>
                  <p className="text-zinc-550 text-xs mt-0.5">Scan or enter the attendee's ticket code string (e.g. VS-XXXX) to check them in.</p>
                </div>
              </div>

              <form onSubmit={handleScanVerify} className="flex gap-2">
                <input
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                  placeholder="Enter Ticket QR Code (e.g. VS-1A2B3C)..."
                  className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-650 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                />
                <Button
                  type="submit"
                  disabled={scanning || !qrCodeInput.trim()}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 rounded-xl h-11"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
                </Button>
              </form>

              {scanError && (
                <div className="bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl text-xs text-red-400 flex items-start gap-2.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Validation Failed</span>
                    <span>{scanError}</span>
                  </div>
                </div>
              )}

              {scanResult && (
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3.5 rounded-xl text-xs text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">Ticket Confirmed!</span>
                    <p className="text-zinc-300 mt-1">
                      Event: <strong className="text-white">{scanResult.ticket?.events?.title}</strong><br/>
                      Tier: <strong className="text-white">{scanResult.ticket?.ticket_types?.name}</strong><br/>
                      Code: <strong className="text-white font-mono">{scanResult.ticket?.qr_code_data}</strong>
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Live status update */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-5 h-5 text-orange-400" />
                <h3 className="text-lg font-bold text-white">Update Live Status</h3>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <StatusUpdateForm
                  eventId={selectedEvent.id}
                  onSubmitted={() => queryClient.invalidateQueries({ queryKey: ["eventStatusesPortal", selectedEvent.id] })}
                />
              </div>
            </section>
          </>
        )}

        {/* Stripe payouts — always visible to organizers */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-bold text-white">Payout Settings</h3>
          </div>
          <StripeConnectCard />
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    green: "text-green-400 bg-green-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    orange: "text-orange-400 bg-orange-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center mb-2", colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}