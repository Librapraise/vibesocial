import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Plus, Minus, Loader2 } from "lucide-react";
import { createPageUrl } from "../../utils";
import { cn } from "@/lib/utils";

type TicketTypeItem = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  tickets_sold?: number;
  max_per_order?: number;
};

type TicketSelectorProps = {
  eventId: string;
  onCheckoutSelected?: (quantities: Record<string, number>) => void;
};

export default function TicketSelector({ eventId, onCheckoutSelected }: TicketSelectorProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  const { data: ticketTypes = [], isLoading } = useQuery<TicketTypeItem[]>({
    queryKey: ["ticketTypes", eventId],
    queryFn: () => base44.entities.TicketType.filter({ event_id: eventId, is_active: true }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-500">
        <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No tickets available for this event yet.</p>
      </div>
    );
  }

  const updateQty = (id: string, delta: number, maxQty: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      return { ...prev, [id]: Math.max(0, Math.min(maxQty, current + delta)) };
    });
  };

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalCost = ticketTypes.reduce((sum, tt) => sum + (tt.price || 0) * (quantities[tt.id] || 0), 0);

  const handleCheckout = () => {
    if (onCheckoutSelected) {
      onCheckoutSelected(quantities);
      return;
    }
    const selections = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    navigate(createPageUrl(`Checkout?event_id=${eventId}&selections=${selections}`));
  };

  return (
    <div className="space-y-3">
      {ticketTypes.map((tt) => {
        const qty = quantities[tt.id] || 0;
        const available = tt.capacity != null ? tt.capacity - (tt.tickets_sold || 0) : Infinity;
        const isSoldOut = available <= 0;
        const maxQty = available === Infinity ? (tt.max_per_order || 10) : Math.min(tt.max_per_order || 10, available);

        return (
          <div
            key={tt.id}
            className={cn(
              "bg-zinc-800/50 rounded-xl p-4 border transition-all",
              isSoldOut ? "border-zinc-800 opacity-50" : qty > 0 ? "border-orange-500/40 bg-orange-500/5" : "border-zinc-700"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-white">{tt.name}</span>
                  {isSoldOut && <Badge className="bg-red-900/40 text-red-400 border-red-800/40 text-[10px]">Sold Out</Badge>}
                </div>
                {tt.description && <p className="text-xs text-zinc-500 mt-0.5">{tt.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={cn("text-sm font-bold", tt.price === 0 ? "text-green-400" : "text-orange-400")}>
                    {tt.price === 0 ? "FREE" : `$${(tt.price || 0).toFixed(2)}`}
                  </span>
                  {tt.capacity != null && available !== Infinity && (
                    <span className="text-xs text-zinc-600">{available} left</span>
                  )}
                </div>
              </div>
              {!isSoldOut && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(tt.id, -1, maxQty)}
                    disabled={qty === 0}
                    className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 flex items-center justify-center text-white transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-white font-medium w-5 text-center text-sm">{qty}</span>
                  <button
                    onClick={() => updateQty(tt.id, 1, maxQty)}
                    disabled={qty >= maxQty}
                    className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 flex items-center justify-center text-white transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {totalTickets > 0 && (
        <Button
          onClick={handleCheckout}
          className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl h-11 mt-2"
        >
          <Ticket className="w-4 h-4 mr-2" />
          Get {totalTickets} Ticket{totalTickets > 1 ? "s" : ""}
          {totalCost > 0 && ` · $${totalCost.toFixed(2)}`}
        </Button>
      )}
    </div>
  );
}