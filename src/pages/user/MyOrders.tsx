import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, Calendar, MapPin, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  confirmed: { label: "Confirmed", Icon: CheckCircle2, color: "text-green-400", bg: "bg-green-900/20 border-green-800/40" },
  pending_payment: { label: "Pay at Door", Icon: Clock, color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40" },
  cancelled: { label: "Cancelled", Icon: XCircle, color: "text-red-400", bg: "bg-red-900/20 border-red-800/40" },
  refunded: { label: "Refunded", Icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-800 border-zinc-700" },
};

export default function MyOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["myOrders"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Order.filter({ created_by: user.email }, "-created_date", 50);
    },
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to={createPageUrl("Home")}>
            <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <Ticket className="w-5 h-5 text-orange-400" /> My Tickets
            </h1>
            {orders.length > 0 && (
              <p className="text-zinc-500 text-xs">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
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
              const sc = statusConfig[order.status] || statusConfig.confirmed;
              const totalQty = order.tickets?.reduce((a, t) => a + t.quantity, 0) || 0;

              return (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate">{order.event_title}</h3>
                        <p className="text-zinc-400 text-sm">{order.event_venue_name}</p>
                      </div>
                      <Badge className={cn("border text-xs flex items-center gap-1 flex-shrink-0", sc.bg, sc.color)}>
                        <sc.Icon className="w-3 h-3" />
                        {sc.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      {order.event_start_time && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(order.event_start_time), "EEE, MMM d · h:mm a")}
                        </span>
                      )}
                      {order.event_address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.event_address}
                        </span>
                      )}
                    </div>

                    <div className="bg-zinc-800/50 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                          {totalQty} Ticket{totalQty !== 1 ? "s" : ""}
                        </span>
                        {order.confirmation_code && (
                          <span className="text-xs font-mono text-orange-400 tracking-wider">{order.confirmation_code}</span>
                        )}
                      </div>
                      {order.tickets?.map((t, i) => (
                        <div key={i} className="flex justify-between text-sm py-0.5">
                          <span className="text-zinc-300">{t.quantity}× {t.ticket_type_name}</span>
                          <span className="text-zinc-500">{t.unit_price === 0 ? "Free" : `$${(t.unit_price * t.quantity).toFixed(2)}`}</span>
                        </div>
                      ))}
                    </div>

                    {order.total_amount > 0 && (
                      <div className="flex justify-between font-semibold text-sm px-1">
                        <span className="text-zinc-300">Total</span>
                        <span className="text-orange-400">${order.total_amount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 pb-4">
                    <Link to={createPageUrl(`EventDetail?id=${order.event_id}`)}>
                      <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs">
                        View Event
                      </Button>
                    </Link>
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