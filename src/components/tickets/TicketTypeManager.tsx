import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Ticket, Plus, Trash2, Edit2, Loader2, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type EventRef = { id: string; title?: string };

type TicketType = {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  tickets_sold?: number;
  is_active?: boolean;
};

type TicketTypeManagerProps = {
  event: EventRef;
};

type FormState = {
  name: string;
  description: string;
  price: string | number;
  capacity: string | number;
  max_per_order: string | number;
  is_active: boolean;
};

export default function TicketTypeManager({ event }: TicketTypeManagerProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<FormState>({
    name: "", description: "", price: 0, capacity: "", max_per_order: 10, is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: ticketTypes = [], isLoading } = useQuery<TicketType[]>({
    queryKey: ["ticketTypes", event.id],
    queryFn: () => base44.entities.TicketType.filter({ event_id: event.id }),
    enabled: open,
  });

  const resetForm = () => {
    setForm({ name: "", description: "", price: 0, capacity: "", max_per_order: 10, is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (tt: TicketType) => {
    setForm({
      name: tt.name || "",
      description: tt.description || "",
      price: tt.price ?? 0,
      capacity: tt.capacity ?? "",
      max_per_order: tt.max_per_order ?? 10,
      is_active: tt.is_active !== false,
    });
    setEditingId(tt.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    const data = {
      event_id: event.id,
      event_title: event.title,
      name: form.name,
      description: form.description || undefined,
      price: parseFloat(String(form.price)) || 0,
      capacity: form.capacity ? parseInt(String(form.capacity)) : undefined,
      max_per_order: parseInt(String(form.max_per_order)) || 10,
      is_active: form.is_active,
    };
    if (editingId) {
      await base44.entities.TicketType.update(editingId, data);
    } else {
      await base44.entities.TicketType.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ["ticketTypes", event.id] });
    setSaving(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await base44.entities.TicketType.delete(id);
    queryClient.invalidateQueries({ queryKey: ["ticketTypes", event.id] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <Ticket className="w-4 h-4 mr-1.5" /> Manage Tickets
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-orange-400" /> Ticket Types
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
        ) : (
          <div className="space-y-3 mb-4">
            {ticketTypes.length === 0 && !showForm && (
              <p className="text-zinc-500 text-sm text-center py-6">No ticket types yet. Add one to start selling tickets.</p>
            )}
            {ticketTypes.map((tt) => (
              <div key={tt.id} className="bg-zinc-800/60 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{tt.name}</span>
                    {!tt.is_active && <Badge className="bg-zinc-700 text-zinc-400 text-[10px]">Inactive</Badge>}
                  </div>
                  {tt.description && <p className="text-xs text-zinc-500 mt-0.5 truncate">{tt.description}</p>}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                    <span className={cn("flex items-center gap-1 font-semibold", tt.price === 0 ? "text-green-400" : "text-orange-400")}>
                      <DollarSign className="w-3 h-3" />
                      {tt.price === 0 ? "Free" : `$${(tt.price || 0).toFixed(2)}`}
                    </span>
                    {tt.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {tt.tickets_sold || 0} / {tt.capacity} sold
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-white" onClick={() => handleEdit(tt)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(tt.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <div className="bg-zinc-800/40 rounded-xl p-4 space-y-3 border border-zinc-700">
            <h3 className="text-sm font-semibold text-zinc-200">{editingId ? "Edit Ticket Type" : "New Ticket Type"}</h3>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. General Admission, VIP"
                className="bg-zinc-800 border-zinc-700 text-white h-9" />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What's included..."
                className="bg-zinc-800 border-zinc-700 text-white h-9" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Price ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="0 for free"
                  className="bg-zinc-800 border-zinc-700 text-white h-9" />
              </div>
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Capacity</Label>
                <Input type="number" min="1" value={form.capacity}
                  onChange={e => setForm({ ...form, capacity: e.target.value })}
                  placeholder="Unlimited"
                  className="bg-zinc-800 border-zinc-700 text-white h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label className="text-zinc-400 text-xs mb-1 block">Max per order</Label>
                <Input type="number" min="1" max="50" value={form.max_per_order}
                  onChange={e => setForm({ ...form, max_per_order: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white h-9" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label className="text-zinc-300 text-xs">Active</Label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSubmit} disabled={!form.name || saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-9 text-sm">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? "Save Changes" : "Add Ticket Type")}
              </Button>
              <Button onClick={resetForm} variant="outline" className="border-zinc-700 text-zinc-300 h-9 text-sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)} variant="outline"
            className="w-full border-zinc-700 border-dashed text-zinc-400 hover:text-white hover:border-zinc-500">
            <Plus className="w-4 h-4 mr-2" /> Add Ticket Type
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}