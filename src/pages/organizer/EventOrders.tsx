import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Users, DollarSign, Ticket, Search, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig = {
  confirmed: { label: "Confirmed", color: "text-green-400", bg: "bg-green-900/20 border-green-800/40" },
  pending_payment: { label: "Pay at Door", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40" },
  cancelled: { label: "Cancelled", color: "text-red-400", bg: "bg-red-900/20 border-red-800/40" },
  refunded: { label: "Refunded", color: "text-zinc-400", bg: "bg-zinc-800 border-zinc-700" },
};

export default function EventOrders() {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("event_id");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }),
    select: d => d?.[0],
    enabled: !!eventId,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["eventOrders", eventId],
    queryFn: () => base44.entities.Order.filter({ event_id: eventId }, "-created_date", 200),
    enabled: !!eventId,
    refetchInterval: 30000,
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["ticketTypes", eventId],
    queryFn: () => base44.entities.TicketType.filter({ event_id: eventId }),
    enabled: !!eventId,
  });

  const filtered = orders
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .filter(o => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        o.attendee_name?.toLowerCase().includes(s) ||
        o.attendee_email?.toLowerCase().includes(s) ||
        o.confirmation_code?.toLowerCase().includes(s)
      );
    });

  const activeOrders = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded");
  const totalTicketsSold = activeOrders.reduce((sum, o) => sum + (o.tickets?.reduce((a, t) => a + t.quantity, 0) || 0), 0);
  const totalRevenue = activeOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const confirmedCount = orders.filter(o => o.status === "confirmed").length;

  const stats = [
    { label: "Total Orders", value: orders.length, Icon: Ticket, color: "text-orange-400" },
    { label: "Tickets Sold", value: totalTicketsSold, Icon: Users, color: "text-blue-400" },
    { label: "Confirmed", value: confirmedCount, Icon: CheckCircle2, color: "text-green-400" },
    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, Icon: DollarSign, color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to={createPageUrl(`EventDetail?id=${eventId}`)}>
            <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-lg">Order Management</h1>
            <p className="text-zinc-500 text-xs truncate">{event?.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5">
              <stat.Icon className={cn("w-4 h-4 mb-2", stat.color)} />
              <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Ticket Breakdown */}
        {ticketTypes.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-4 text-zinc-300">Ticket Breakdown</h3>
            <div className="space-y-3">
              {ticketTypes.map(tt => {
                const sold = tt.tickets_sold || 0;
                const pct = tt.capacity ? Math.min(100, (sold / tt.capacity) * 100) : 0;
                return (
                  <div key={tt.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{tt.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs">
                          {sold}{tt.capacity ? ` / ${tt.capacity}` : ""} sold
                        </span>
                        <span className={cn("font-semibold text-xs", tt.price === 0 ? "text-green-400" : "text-orange-400")}>
                          {tt.price === 0 ? "Free" : `$${tt.price}`}
                        </span>
                      </div>
                    </div>
                    {tt.capacity && (
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or code..."
              className="bg-zinc-800 border-zinc-700 text-white pl-9 h-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "confirmed", "pending_payment", "cancelled"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  statusFilter === s ? "bg-zinc-700 border-zinc-600 text-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                )}>
                {s === "all" ? "All" : s === "pending_payment" ? "Pay at Door" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search || statusFilter !== "all" ? "No matching orders" : "No orders yet"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const sc = statusConfig[order.status] || statusConfig.confirmed;
              const totalQty = order.tickets?.reduce((a, t) => a + t.quantity, 0) || 0;

              return (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold text-sm">{order.attendee_name}</p>
                        <Badge className={cn("text-[10px] border", sc.bg, sc.color)}>{sc.label}</Badge>
                      </div>
                      <p className="text-zinc-500 text-xs">{order.attendee_email}</p>
                      {order.confirmation_code && (
                        <p className="text-zinc-600 text-xs font-mono mt-0.5">{order.confirmation_code}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-zinc-300 font-medium text-sm">{totalQty} ticket{totalQty !== 1 ? "s" : ""}</p>
                        <p className="text-zinc-500 text-xs leading-snug">
                          {order.tickets?.map(t => `${t.quantity}× ${t.ticket_type_name}`).join(", ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("font-bold text-sm", order.total_amount === 0 ? "text-green-400" : "text-orange-400")}>
                          {order.total_amount === 0 ? "Free" : `$${order.total_amount.toFixed(2)}`}
                        </p>
                        <p className="text-zinc-600 text-xs">
                          {format(order.created_at ? new Date(order.created_at) : order.created_date ? new Date(order.created_date) : new Date(), "MMM d, h:mm a")}
                        </p>
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