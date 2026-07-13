import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const venueTypes = [
  { value: "club", label: "🪩 Club" },
  { value: "lounge", label: "🍸 Lounge" },
  { value: "bar", label: "🍺 Bar" },
  { value: "rooftop", label: "🌃 Rooftop" },
  { value: "house_party", label: "🏠 House Party" },
  { value: "pop_up", label: "⚡ Pop Up" },
  { value: "concert", label: "🎤 Concert" },
  { value: "other", label: "🎉 Other" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

type CreateEventDialogProps = {
  onCreated?: () => void;
};

export default function CreateEventDialog({ onCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [form, setForm] = useState<{
    title: string;
    venue_name: string;
    venue_type: string;
    state: string;
    description: string;
    address: string;
    start_time: string;
    end_time: string;
  }>({
    title: "", venue_name: "", venue_type: "club", state: "",
    description: "", address: "", start_time: "", end_time: "",
  });
  const [tagInput, setTagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.venue_name) return;
    setLoading(true);
    await base44.entities.Event.create({
      ...form,
      vibe_tags: tags,
      current_vibe_score: 0,
      status_count: 0,
      is_active: true,
    });
    setLoading(false);
    setOpen(false);
    setForm({ title: "", venue_name: "", venue_type: "club", state: "", description: "", address: "", start_time: "", end_time: "" });
    setTags([]);
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl font-semibold gap-2">
          <Plus className="w-4 h-4" /> Post Event
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Post a New Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Event Name *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Friday Night Vibes" className="bg-zinc-800/50 border-zinc-700 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Venue Name *</Label>
              <Input value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                placeholder="e.g. The Loft" className="bg-zinc-800/50 border-zinc-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label>Venue Type</Label>
              <Select value={form.venue_type} onValueChange={(v) => setForm({ ...form, venue_type: v })}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {venueTypes.map((v) => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>State / DC</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-white">
                <SelectValue placeholder="Select state..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main St, City" className="bg-zinc-800/50 border-zinc-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's this event about?" className="bg-zinc-800/50 border-zinc-700 text-white resize-none h-20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Vibe Tags</Label>
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag}
              placeholder="Type a tag and press Enter" className="bg-zinc-800/50 border-zinc-700 text-white" />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 gap-1">
                    #{tag}
                    <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={loading || !form.title || !form.venue_name}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold rounded-xl h-11 mt-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Post Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}