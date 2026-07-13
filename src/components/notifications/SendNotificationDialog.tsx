import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Loader2, CheckCircle2 } from "lucide-react";

type EventType = { id: string; title?: string };

type FormState = {
  title: string;
  message: string;
  target_type: string;
  event_id: string;
  link_url: string;
};

export default function SendNotificationDialog() {
  const [open, setOpen] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({ title: "", message: "", target_type: "all", event_id: "", link_url: "" });
  const [loading, setLoading] = useState<boolean>(false);
  const [sent, setSent] = useState<boolean>(false);

  const { data: events = [] } = useQuery<EventType[]>({
    queryKey: ["events-for-notif"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Event.filter({ created_by: user.email, is_active: true });
    },
    enabled: open,
  });

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    setLoading(true);

    const selectedEvent = form.event_id ? events.find(e => e.id === form.event_id) : null;

    await base44.entities.Notification.create({
      title: form.title,
      message: form.message,
      target_type: form.target_type,
      event_id: form.event_id || undefined,
      event_title: selectedEvent?.title || undefined,
      link_url: form.link_url || undefined,
      is_active: true,
    });

    setSent(true);
    setLoading(false);
    setTimeout(() => {
      setSent(false);
      setForm({ title: "", message: "", target_type: "all", event_id: "", link_url: "" });
      setOpen(false);
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 h-8 text-xs">
          <Bell className="w-3.5 h-3.5 mr-1.5" /> Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-400" /> Send Push Notification
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-green-400 font-semibold">Notification Sent!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Title *</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Tonight's Event is PACKED 🔥"
                className="bg-zinc-800 border-zinc-700 text-white h-10"
                maxLength={80}
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Message *</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Tell your users what's happening..."
                className="bg-zinc-800 border-zinc-700 text-white resize-none h-20"
                maxLength={200}
              />
              <p className="text-right text-[10px] text-zinc-600 mt-1">{form.message.length}/200</p>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Target</Label>
              <Select value={form.target_type} onValueChange={v => setForm({ ...form, target_type: v, event_id: "" })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="all">👥 All Users</SelectItem>
                  <SelectItem value="event_attendees">🎟️ Event Attendees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.target_type === "event_attendees" && (
              <div>
                <Label className="text-zinc-400 text-xs mb-1.5 block">Select Event</Label>
                <Select value={form.event_id} onValueChange={v => setForm({ ...form, event_id: v })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-300 h-10">
                    <SelectValue placeholder="Choose your event..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    {events.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-zinc-400 text-xs mb-1.5 block">Link (optional)</Label>
              <Input
                value={form.link_url}
                onChange={e => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://... or leave empty"
                className="bg-zinc-800 border-zinc-700 text-white h-10"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!form.title || !form.message || loading || (form.target_type === "event_attendees" && !form.event_id)}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold h-10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Send Notification
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}