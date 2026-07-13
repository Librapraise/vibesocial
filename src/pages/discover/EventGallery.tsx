import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Images,
  Upload,
  Loader2,
  Camera,
  X,
  Sparkles,
  Flame,
} from "lucide-react";
import { createPageUrl, venueTypeIcons } from "@/utils";
import { cn } from "@/lib/utils";

export default function EventGallery() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["galleryEvents"],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, "-current_vibe_score", 50),
  });

  const activeEventId = selectedEventId || events[0]?.id;

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ["galleryPhotos", activeEventId],
    queryFn: () => base44.entities.Gallery.filter({ event_id: activeEventId }, "-created_date", 200),
    enabled: !!activeEventId,
  });

  const activeEvent = events.find((e) => e.id === activeEventId);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeEventId) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      let uploaderName = "Guest";
      try {
        const me = await base44.auth.me();
        uploaderName = me.name || me.email?.split("@")[0] || "Guest";
        await base44.entities.Gallery.create({
          event_id: activeEventId,
          event_title: activeEvent?.title,
          image_url: file_url,
          caption: caption.trim() || undefined,
          uploader_name: uploaderName,
          uploader_email: me.email,
        });
      } catch {
        uploaderName = localStorage.getItem("guest_name") || "Guest";
        await base44.entities.Gallery.create({
          event_id: activeEventId,
          event_title: activeEvent?.title,
          image_url: file_url,
          caption: caption.trim() || undefined,
          uploader_name: uploaderName,
        });
      }
      setCaption("");
      queryClient.invalidateQueries({ queryKey: ["galleryPhotos", activeEventId] });
    } catch (err) {
      // ignore
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Images className="w-6 h-6 text-orange-400" /> Event Gallery
          </h1>
          <p className="text-zinc-500 text-sm mt-1">See the vibe in real time — photos from events happening now.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {eventsLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No active events to browse yet.</p>
          </div>
        ) : (
          <>
            {/* Event selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEventId(e.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition flex items-center gap-1.5",
                    activeEventId === e.id
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <span className="inline-flex items-center gap-1.5 capitalize">
                    {(() => {
                      const Icon = venueTypeIcons[e.venue_type || "other"] || venueTypeIcons.other;
                      return <Icon className={cn("w-3.5 h-3.5", activeEventId === e.id ? "text-white" : "text-orange-400")} />;
                    })()}
                    {e.title}
                  </span>
                  {(e.current_vibe_score || 0) >= 7 && <Flame className="w-3 h-3" />}
                </button>
              ))}
            </div>

            {/* Active event header */}
            {activeEvent && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white">{activeEvent.title}</h2>
                    <p className="text-zinc-400 text-sm flex items-center gap-1.5 capitalize mt-1">
                      {(() => {
                        const Icon = venueTypeIcons[activeEvent.venue_type || "other"] || venueTypeIcons.other;
                        return <Icon className="w-4 h-4 text-orange-400" />;
                      })()}
                      {activeEvent.venue_name}
                    </p>
                    {activeEvent.vibe_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeEvent.vibe_tags.slice(0, 6).map((t) => (
                          <Badge key={t} variant="secondary" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px]">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Link to={`${createPageUrl("EventDetail")}?id=${activeEvent.id}`}>
                    <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      View Event
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Upload bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-semibold text-sm">Share a Photo</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption (optional)…"
                  className="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                />
                <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploading ? "Uploading…" : "Upload Photo"}
                </Button>
              </div>
              <p className="text-zinc-600 text-[11px] mt-2">Only upload photos you've taken at this event. Be respectful of others.</p>
            </div>

            {/* Photo grid */}
            {photosLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-600" /></div>
            ) : photos.length === 0 ? (
              <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-zinc-400">No photos yet</p>
                <p className="text-xs mt-1">Be the first to share the vibe from this event!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setLightbox(p)}
                    className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 group bg-zinc-900"
                  >
                    <img src={p.image_url} alt={p.caption || ""} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                      <p className="text-white text-[10px] truncate">{p.caption || p.uploader_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        >
          <button className="absolute top-4 right-4 text-zinc-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.image_url} alt={lightbox.caption || ""} className="w-full max-h-[70vh] object-contain rounded-xl" />
            <div className="mt-3 text-center">
              {lightbox.caption && <p className="text-white text-sm mb-1">{lightbox.caption}</p>}
              <p className="text-zinc-500 text-xs">by {lightbox.uploader_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}