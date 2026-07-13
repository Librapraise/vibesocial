import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, CheckCircle2, Loader2, Calendar, MapPin, User, Mail } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type CheckoutProps = {
  eventIdProp?: string;
  quantitiesProp?: Record<string, number>;
  onCancel?: () => void;
  onSuccess?: (order: any) => void;
};

export default function Checkout({ eventIdProp, quantitiesProp, onCancel, onSuccess }: CheckoutProps = {}) {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = eventIdProp || urlParams.get("event_id");
  const selectionsParam = urlParams.get("selections") || "";

  const initialQuantities: Record<string, number> = {};
  if (quantitiesProp) {
    Object.assign(initialQuantities, quantitiesProp);
  } else if (selectionsParam) {
    selectionsParam.split(",").forEach(s => {
      const [id, qty] = s.split(":");
      if (id && qty) initialQuantities[id] = parseInt(qty);
    });
  }

  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
  const [form, setForm] = useState({ name: "", email: "" });
  const [step, setStep] = useState("checkout");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);

  const isEmbedded = !!eventIdProp;

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setForm(prev => ({ ...prev, name: u.name || "", email: u.email || "" }));
    }).catch(() => { });
  }, []);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }),
    select: d => d?.[0],
    enabled: !!eventId,
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["ticketTypes", eventId],
    queryFn: () => base44.entities.TicketType.filter({ event_id: eventId, is_active: true }),
    enabled: !!eventId,
  });

  const updateQty = (id, delta, maxQty) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, Math.min(maxQty, (prev[id] || 0) + delta)) }));
  };

  const selectedTickets = ticketTypes.filter(tt => (quantities[tt.id] || 0) > 0);
  const totalAmount = selectedTickets.reduce((sum, tt) => sum + (tt.price || 0) * (quantities[tt.id] || 0), 0);
  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleConfirmOrder = async () => {
    setLoading(true);
    const tickets = selectedTickets.map(tt => ({
      ticket_type_id: tt.id,
      ticket_type_name: tt.name,
      quantity: quantities[tt.id],
      unit_price: tt.price || 0,
    }));

    const confirmationCode = "TKT-" + Math.random().toString(36).substr(2, 8).toUpperCase();

    const orderData = {
      event_id: event.id,
      event_title: event.title,
      event_venue_name: event.venue_name,
      event_start_time: event.start_time,
      event_address: event.address,
      attendee_name: form.name,
      attendee_email: form.email,
      tickets,
      total_amount: totalAmount,
      status: totalAmount === 0 ? "confirmed" : "pending_payment",
      confirmation_code: confirmationCode,
    };

    const created = await base44.entities.Order.create(orderData);

    for (const tt of selectedTickets) {
      await base44.entities.TicketType.update(tt.id, {
        tickets_sold: (tt.tickets_sold || 0) + (quantities[tt.id] || 0),
      });
    }

    const resultOrder = { ...orderData, id: created.id, confirmation_code: confirmationCode };
    setOrder(resultOrder);
    setStep("success");
    setLoading(false);
    onSuccess?.(resultOrder);
  };

  // Success screen
  // Success screen
  if (step === "success" && order) {
    return (
      <div className={cn("text-white flex items-center justify-center p-4", !isEmbedded && "min-h-screen")}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-black mb-1">You're In! 🎉</h1>
            <p className="text-zinc-400">Your tickets have been reserved.</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-5">
            <div className="p-5 border-b border-dashed border-zinc-700">
              <p className="text-xs text-zinc-500 text-center mb-1">Confirmation Code</p>
              <p className="text-xl font-mono font-bold text-orange-400 text-center tracking-widest">{order.confirmation_code}</p>
            </div>
            <div className="p-5">
              <h2 className="font-bold text-lg mb-0.5">{event?.title}</h2>
              <p className="text-zinc-400 text-sm mb-3">{event?.venue_name}</p>
              {event?.start_time && (
                <p className="text-zinc-400 text-sm flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-1.5">
                {selectedTickets.map(tt => (
                  <div key={tt.id} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{quantities[tt.id]}× {tt.name}</span>
                    <span className="text-zinc-400">{tt.price === 0 ? "Free" : `$${(tt.price * quantities[tt.id]).toFixed(2)}`}</span>
                  </div>
                ))}
              </div>
              {totalAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <div className="flex justify-between font-bold mb-2">
                    <span>Total Due</span>
                    <span className="text-orange-400">${totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">💳 Payment collected at the door or via the event organizer.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            {isEmbedded ? (
              <Button onClick={onCancel} className="w-full bg-orange-500 hover:bg-orange-600">
                Done
              </Button>
            ) : (
              <>
                <Link to={createPageUrl("MyOrders")} className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    <Ticket className="w-4 h-4 mr-1.5" /> View My Tickets
                  </Button>
                </Link>
                <Link to={createPageUrl(`EventDetail?id=${eventId}`)}>
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Back to Event</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Checkout screen
  return (
    <div className={cn("text-white", !isEmbedded && "min-h-screen bg-zinc-950")}>
      {!isEmbedded && (
        <div className="border-b border-zinc-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <Link to={createPageUrl(`EventDetail?id=${eventId}`)}>
              <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-bold text-lg">Get Tickets</h1>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Event Info */}
        {event && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h2 className="font-bold text-lg mb-1">{event.title}</h2>
            <p className="text-zinc-400 text-sm mb-2">{event.venue_name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
              {event.start_time && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
                </span>
              )}
              {event.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.address}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ticket Selection */}
        <div>
          <h3 className="font-semibold mb-3 text-zinc-200">Select Tickets</h3>
          <div className="space-y-3">
            {ticketTypes.map((tt) => {
              const qty = quantities[tt.id] || 0;
              const available = tt.capacity != null ? tt.capacity - (tt.tickets_sold || 0) : Infinity;
              const isSoldOut = available <= 0;
              const maxQty = available === Infinity ? (tt.max_per_order || 10) : Math.min(tt.max_per_order || 10, available);

              return (
                <div key={tt.id} className={cn(
                  "bg-zinc-800/50 rounded-xl p-4 border transition-all",
                  qty > 0 ? "border-orange-500/40" : "border-zinc-700",
                  isSoldOut && "opacity-50"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{tt.name}</p>
                      {tt.description && <p className="text-xs text-zinc-500 mt-0.5">{tt.description}</p>}
                      <p className={cn("text-sm font-bold mt-1.5", tt.price === 0 ? "text-green-400" : "text-orange-400")}>
                        {tt.price === 0 ? "FREE" : `$${tt.price.toFixed(2)}`}
                      </p>
                    </div>
                    {!isSoldOut ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(tt.id, -1, maxQty)} disabled={qty === 0}
                          className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 flex items-center justify-center text-white font-bold text-lg">
                          −
                        </button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <button onClick={() => updateQty(tt.id, 1, maxQty)} disabled={qty >= maxQty}
                          className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 flex items-center justify-center text-white font-bold text-lg">
                          +
                        </button>
                      </div>
                    ) : (
                      <Badge className="bg-red-900/40 text-red-400 border-red-800/40">Sold Out</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendee Info */}
        {totalQty > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-zinc-200">Your Info</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-zinc-400 text-xs mb-1.5 block">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Your full name"
                    className="bg-zinc-800/50 border-zinc-700 text-white pl-9 h-11" />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs mb-1.5 block">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="your@email.com"
                    className="bg-zinc-800/50 border-zinc-700 text-white pl-9 h-11" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        {totalQty > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-semibold mb-3 text-zinc-200 text-sm uppercase tracking-wider">Order Summary</h3>
            <div className="space-y-2 mb-3">
              {selectedTickets.map(tt => (
                <div key={tt.id} className="flex justify-between text-sm">
                  <span className="text-zinc-400">{quantities[tt.id]}× {tt.name}</span>
                  <span className="text-zinc-300">{tt.price === 0 ? "Free" : `$${(tt.price * quantities[tt.id]).toFixed(2)}`}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span className={totalAmount === 0 ? "text-green-400" : "text-orange-400"}>
                {totalAmount === 0 ? "FREE" : `$${totalAmount.toFixed(2)}`}
              </span>
            </div>
            {totalAmount > 0 && (
              <p className="text-xs text-zinc-600 mt-2">💡 Payment collected at the door or via the event organizer.</p>
            )}
          </div>
        )}

        {/* Confirm Button */}
        {totalQty > 0 && (
          <Button
            onClick={handleConfirmOrder}
            disabled={!form.name || !form.email || loading}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold h-12 rounded-xl text-base"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Ticket className="w-5 h-5 mr-2" />
            )}
            {totalAmount === 0 ? `Confirm ${totalQty} Free Ticket${totalQty > 1 ? "s" : ""}` : `Reserve Tickets — $${totalAmount.toFixed(2)}`}
          </Button>
        )}
      </div>
    </div>
  );
}