import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type StatusKey = "confirmed" | "pending_payment" | "cancelled" | "refunded";

type StatusConfig = {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
};

const statusConfig: Record<StatusKey, StatusConfig> = {
  confirmed: { label: "Valid", Icon: CheckCircle2, color: "text-green-400", bg: "bg-green-900/20 border-green-800/40" },
  pending_payment: { label: "Pay at Door", Icon: Clock, color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40" },
  cancelled: { label: "Cancelled", Icon: XCircle, color: "text-red-400", bg: "bg-red-900/20 border-red-800/40" },
  refunded: { label: "Refunded", Icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-800 border-zinc-700" },
};

type TicketLine = {
  ticket_type_name?: string;
  quantity?: number;
  unit_price?: number;
};

type Order = {
  id: string;
  status?: string;
  tickets?: TicketLine[];
  event_start_time?: string;
  event_title?: string;
  event_venue_name?: string;
  event_venue_type?: string;
  event_address?: string;
  confirmation_code?: string;
  event_id?: string;
};

function TicketQRCode({ code }: { code: string }) {
  const [dataUrl, setUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(code, { width: 160, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then(setUrl)
      .catch(() => { });
  }, [code]);
  if (!dataUrl) return <div className="w-32 h-32 bg-zinc-800 rounded-lg animate-pulse mx-auto" />;
  return <img src={dataUrl} alt="Ticket QR" className="w-32 h-32 rounded-lg mx-auto" />;
}

export default function MyTickets() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["myTickets"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Order.filter({ created_by: (user as any).email }, "-created_date", 100);
    },
  });

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
            <Ticket className="w-6 h-6 text-orange-400" /> My Tickets
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {orders.length > 0 ? `${orders.length} ticket order${orders.length !== 1 ? "s" : ""} · QR codes ready for entry` : "Your tickets and QR codes for entry"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">No tickets yet</h3>
            <p className="text-zinc-600 mb-6 text-sm">Browse events and grab some tickets!</p>
            <Link to={createPageUrl("Home")}>
              <Button className="bg-orange-500 hover:bg-orange-600">Browse Events</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const sc = statusConfig[(order.status as StatusKey) || "confirmed"] || statusConfig.confirmed;
              const SIcon = sc.Icon;
              const totalQty = order.tickets?.reduce((a, t) => a + (t.quantity || 0), 0) || 0;
              const isValid = order.status === "confirmed";
              const eventDate = order.event_start_time ? new Date(order.event_start_time) : null;
              const isPast = eventDate && eventDate < new Date();

              return (
                <div key={order.id} className={cn(
                  "bg-zinc-900 border rounded-2xl overflow-hidden",
                  isValid ? "border-zinc-800" : "border-zinc-800 opacity-60"
                )}>
                  {/* Top stripe */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = venueTypeIcons[order.event_venue_type || "other"] || venueTypeIcons.other;
                        return <Icon className="w-5 h-5 text-orange-400" />;
                      })()}
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">{order.event_title}</h3>
                        <p className="text-zinc-500 text-xs truncate">{order.event_venue_name}</p>
                      </div>
                    </div>
                    <Badge className={cn("border text-xs flex items-center gap-1 flex-shrink-0", sc.bg, sc.color)}>
                      <SIcon className="w-3 h-3" />
                      {sc.label}
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row">
                    {/* QR code */}
                    <div className="flex-shrink-0 p-5 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-zinc-800 bg-white/[0.02]">
                      {isValid ? (
                        <TicketQRCode code={order.confirmation_code || order.id} />
                      ) : (
                        <div className="w-32 h-32 rounded-lg bg-zinc-800 flex items-center justify-center mx-auto">
                          <XCircle className="w-10 h-10 text-zinc-600" />
                        </div>
                      )}
                      <p className="text-[10px] font-mono text-orange-400 tracking-wider mt-2">
                        {order.confirmation_code?.slice(0, 12) || "—"}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-4 space-y-3">
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                        {eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(eventDate, "EEE, MMM d · h:mm a")}
                          </span>
                        )}
                        {order.event_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[140px] sm:max-w-[280px]">{order.event_address}</span>
                          </span>
                        )}
                      </div>

                      <div className="bg-zinc-800/50 rounded-xl p-3">
                        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                          {totalQty} Ticket{totalQty !== 1 ? "s" : ""}
                        </p>
                        {order.tickets?.map((t, i) => (
                          <div key={i} className="flex justify-between text-sm py-0.5">
                            <span className="text-zinc-300">{t.quantity}× {t.ticket_type_name}</span>
                            <span className="text-zinc-500">{(t.unit_price || 0) === 0 ? "Free" : `$${((t.unit_price || 0) * (t.quantity || 0)).toFixed(2)}`}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        {isValid && !isPast && (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-[10px]">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Valid for entry
                          </Badge>
                        )}
                        {isValid && isPast && (
                          <Badge className="bg-zinc-800 text-zinc-500 border-zinc-700 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Event ended
                          </Badge>
                        )}
                        <Link to={`${createPageUrl("EventDetail")}?id=${order.event_id}`}>
                          <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                            View Event
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}