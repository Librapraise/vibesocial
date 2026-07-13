import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SaveEventRef = {
  id: string;
  title?: string;
  start_time?: string;
  venue_name?: string;
  address?: string;
};

type SaveEventButtonProps = {
  event: SaveEventRef;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
};

export default function SaveEventButton({ event, className, size = "default" }: SaveEventButtonProps) {
  const [saved, setSaved] = useState<boolean>(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        const user = await base44.auth.me();
        const results = await base44.entities.SavedEvent.filter({
          event_id: event.id,
          created_by: user.email,
        });
        if (results.length > 0) {
          setSaved(true);
          setSavedId(results[0].id);
        }
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [event.id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (saved && savedId) {
        await base44.entities.SavedEvent.delete(savedId);
        setSaved(false);
        setSavedId(null);
        toast.success("Removed from your calendar");
      } else {
        const user = await base44.auth.me();
        const result = await base44.entities.SavedEvent.create({
          event_id: event.id,
          event_title: event.title,
          event_start_time: event.start_time,
          event_venue_name: event.venue_name,
          event_address: event.address,
          created_by: user.email,
        });
        setSaved(true);
        setSavedId(result.id);
        toast.success("Saved to your calendar! 📅");
      }
    } catch {
      toast.error("Please log in to save events");
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <Button
      size={size === "sm" ? "sm" : "default"}
      variant="ghost"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "transition-all",
        saved
          ? "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
          : "text-zinc-400 hover:text-white hover:bg-zinc-700/50",
        className
      )}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : saved ? (
        <BookmarkCheck className={iconSize} />
      ) : (
        <Bookmark className={iconSize} />
      )}
      {size !== "icon" && (
        <span className="ml-1.5 text-xs">{saved ? "Saved" : "Save"}</span>
      )}
    </Button>
  );
}