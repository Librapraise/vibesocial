import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  Megaphone,
  Ticket,
  DollarSign,
  Users,
  Pencil,
  Save,
  X,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MyHostedEvents() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => { }).finally(() => setUserLoading(false));
  }, []);

  const { data: myEvents = [], isLoading } = useQuery({
    queryKey: ["myHostedEvents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const own = await base44.entities.Event.filter({ created_by_id: user.id }, "-created_date", 100).catch(() => []);
      if (own.length) return own;
      return base44.entities.Event.filter({ is_active: true }, "-created_date", 50);
    },
    enabled: !!user?.id,
  });

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Megaphone className="w-14 h-14 text-zinc-700" />
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Sign in to manage your events</h2>
          <p className="text-zinc-500 text-sm">View, edit, and track ticket sales for events you host.</p>
        </div>
        <Button onClick={() => base44.auth.redirectToLogin("/my-hosted-events")} className="bg-orange-500 hover:bg-orange-600 text-white">
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-400" /> My Hosted Events
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Edit details and track ticket sales for your events.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {myEvents.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">You haven't created any events yet.</p>
            <Link to={createPageUrl("Home")}>
              <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Post an Event
              </Button>
            </Link>
          </div>
        ) : (
          myEvents.map((event) => <HostedEventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

function HostedEventCard({ event }) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["eventTicketTypes", event.id],
    queryFn: () => base44.entities.TicketType.filter({ event_id: event.id }, "-created_date", 50),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["eventOrdersSummary", event.id],
    queryFn: () => base44.entities.Order.filter({ event_id: event.id }, "-created_date", 200),
  });

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    const attendees = orders.reduce((s, o) => s + (o.tickets?.reduce((t, ti) => t + (ti.quantity || 0), 0) || 0), 0);
    const sold = ticketTypes.reduce((s, t) => s + (t.tickets_sold || 0), 0);
    const capacity = ticketTypes.reduce((s, t) => s + (t.capacity || 0), 0);
    return { revenue, attendees, sold, capacity };
  }, [orders, ticketTypes]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {(() => {
                const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
                return <Icon className="w-5 h-5 text-orange-400" />;
              })()}
              <h2 className="text-lg font-bold text-white truncate">{event.title}</h2>
            </div>
            <p className="text-zinc-400 text-sm">{event.venue_name}</p>
            {event.start_time && (
              <p className="text-zinc-500 text-xs mt-1">
                {format(new Date(event.start_time), "EEE, MMM d · h:mm a")}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`${createPageUrl("EventDetail")}?id=${event.id}`}>
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <ExternalLink className="w-3.5 h-3.5" /> View
              </Button>
            </Link>
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              onClick={() => setEditing((p) => !p)}
              className={editing ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}
            >
              {editing ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Pencil className="w-3.5 h-3.5" /> Edit</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Sales summary */}
      {!editing && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={DollarSign} label="Revenue" value={`$${stats.revenue.toFixed(0)}`} color="text-green-400" />
            <MiniStat icon={Users} label="Attendees" value={stats.attendees} color="text-blue-400" />
            <MiniStat icon={Ticket} label="Sold" value={stats.sold} color="text-orange-400" />
          </div>

          {/* Per ticket type progress */}
          {ticketTypes.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Ticket Sales Progress
              </p>
              {ticketTypes.map((t) => {
                const sold = t.tickets_sold || 0;
                const cap = t.capacity || 0;
                const pct = cap > 0 ? Math.min(100, (sold / cap) * 100) : 0;
                return (
                  <div key={t.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{t.name}</p>
                        <p className="text-zinc-500 text-xs">${t.price || 0} · {sold} sold{cap > 0 ? ` / ${cap}` : ""}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px]",
                        pct >= 90 ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : pct >= 50 ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {cap > 0 ? `${Math.round(pct)}%` : "Open"}
                      </Badge>
                    </div>
                    {cap > 0 && (
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 90 ? "bg-red-500" : pct >= 50 ? "bg-orange-500" : "bg-zinc-600"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {ticketTypes.length === 0 && (
            <div className="bg-zinc-950/50 border border-dashed border-zinc-800 rounded-xl p-4 text-center">
              <p className="text-zinc-500 text-xs">No ticket types set up yet.</p>
              <Link to={`${createPageUrl("OrganizerPortal")}`}>
                <Button variant="link" className="text-orange-400 text-xs h-auto p-0 mt-1">Set up tickets →</Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && <EditEventForm event={event} onDone={() => {
        setEditing(false);
        queryClient.invalidateQueries({ queryKey: ["myHostedEvents"] });
      }} />}
    </div>
  );
}

function EditEventForm({ event, onDone }) {
  const [form, setForm] = useState({
    title: event.title || "",
    venue_name: event.venue_name || "",
    address: event.address || "",
    description: event.description || "",
    start_time: event.start_time ? event.start_time.slice(0, 16) : "",
    end_time: event.end_time ? event.end_time.slice(0, 16) : "",
    cover_image: event.cover_image || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Event.update(event.id, {
        title: form.title,
        venue_name: form.venue_name,
        address: form.address,
        description: form.description,
        start_time: form.start_time ? new Date(form.start_time).toISOString() : undefined,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
        cover_image: form.cover_image || undefined,
      });
      onDone();
    } catch (err) {
      // ignore
    }
    setSaving(false);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs">Event title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="bg-zinc-950/50 border-zinc-800 text-white" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Venue name</Label>
          <Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
            className="bg-zinc-950/50 border-zinc-800 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Address</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="bg-zinc-950/50 border-zinc-800 text-white" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">Start time</Label>
          <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className="bg-zinc-950/50 border-zinc-800 text-white" />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400 text-xs">End time</Label>
          <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className="bg-zinc-950/50 border-zinc-800 text-white" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs">Cover image URL</Label>
        <Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
          placeholder="https://…"
          className="bg-zinc-950/50 border-zinc-800 text-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-400 text-xs">Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="bg-zinc-950/50 border-zinc-800 text-white resize-none" />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-center">
      <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}