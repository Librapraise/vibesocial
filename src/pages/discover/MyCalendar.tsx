import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2, Download, ArrowLeft, CalendarDays } from "lucide-react";
import { format, isFuture, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function generateICalEvent(saved) {
  const title = saved.event_title || saved.events?.title || "Event";
  const startTime = saved.event_start_time || saved.events?.start_time;
  const venueName = saved.event_venue_name || saved.events?.venue_name;
  const address = saved.event_address || saved.events?.address;

  const start = startTime
    ? new Date(startTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : "";
  const end = start; // fallback: same as start

  return [
    "BEGIN:VEVENT",
    `SUMMARY:${title}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `LOCATION:${address || venueName || ""}`,
    `DESCRIPTION:Check vibes at ${venueName || "the venue"}`,
    `UID:${saved.event_id}@nightvibe`,
    "END:VEVENT",
  ].join("\r\n");
}

function downloadIcal(saved) {
  const title = saved.event_title || saved.events?.title || "event";
  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NightVibe//EN",
    generateICalEvent(saved),
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([cal], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildGoogleCalendarUrl(saved) {
  const title = saved.event_title || saved.events?.title || "Event";
  const venueName = saved.event_venue_name || saved.events?.venue_name;
  const address = saved.event_address || saved.events?.address;
  const startTime = saved.event_start_time || saved.events?.start_time;

  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const encTitle = encodeURIComponent(title);
  const location = encodeURIComponent(address || venueName || "");
  const details = encodeURIComponent(`Check vibes at ${venueName || "the venue"}`);
  let dates = "";
  if (startTime) {
    const d = new Date(startTime).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    dates = `&dates=${d}/${d}`;
  }
  return `${base}&text=${encTitle}&location=${location}&details=${details}${dates}`;
}

function SavedEventCard({ saved, onRemove }) {
  const eventTitle = saved.event_title || saved.events?.title || "Event";
  const eventVenueName = saved.event_venue_name || saved.events?.venue_name;
  const eventStartTime = saved.event_start_time || saved.events?.start_time;
  const eventAddress = saved.event_address || saved.events?.address;

  const hasTime = !!eventStartTime;
  const startDate = hasTime ? new Date(eventStartTime) : null;
  const isUpcoming = startDate ? isFuture(startDate) : true;
  const isHappeningToday = startDate ? isToday(startDate) : false;

  const handleRemove = async () => {
    await base44.entities.SavedEvent.delete(saved.id);
    toast.success("Removed from calendar");
    onRemove();
  };

  return (
    <div className={cn(
      "bg-zinc-900/80 border rounded-2xl p-4 flex flex-col gap-3 transition-all",
      isHappeningToday ? "border-orange-500/40 shadow-lg shadow-orange-500/5" : "border-zinc-800"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isHappeningToday && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px]">Tonight!</Badge>
            )}
            {!isUpcoming && !isHappeningToday && (
              <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600 text-[10px]">Past</Badge>
            )}
          </div>
          <h3 className="text-white font-semibold text-base leading-tight truncate">{eventTitle}</h3>
          {eventVenueName && (
            <p className="text-zinc-400 text-sm truncate">{eventVenueName}</p>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="text-zinc-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {hasTime && startDate && (
        <div className="flex items-center gap-1.5 text-sm text-zinc-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(startDate, "EEE, MMM d · h:mm a")}</span>
        </div>
      )}
      {eventAddress && (
        <div className="flex items-center gap-1.5 text-sm text-zinc-500 truncate">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{eventAddress}</span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-zinc-800 flex-wrap">
        <Link to={createPageUrl("EventDetail") + `?id=${saved.event_id}`}>
          <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-7">
            View Event
          </Button>
        </Link>
        {hasTime && (
          <>
            <a href={buildGoogleCalendarUrl(saved)} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white text-xs h-7">
                <Calendar className="w-3 h-3 mr-1" /> Google Cal
              </Button>
            </a>
            <Button
              size="sm"
              variant="ghost"
              className="text-zinc-400 hover:text-white text-xs h-7"
              onClick={() => downloadIcal(saved)}
            >
              <Download className="w-3 h-3 mr-1" /> iCal
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MyCalendar() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("upcoming");

  const { data: savedEvents = [], isLoading } = useQuery({
    queryKey: ["savedEvents"],
    queryFn: () => base44.entities.SavedEvent.list("-event_start_time", 100),
  });

  const upcoming = savedEvents.filter((s) => {
    const startTime = s.event_start_time || s.events?.start_time;
    return !startTime || isFuture(new Date(startTime)) || isToday(new Date(startTime));
  });
  const past = savedEvents.filter((s) => {
    const startTime = s.event_start_time || s.events?.start_time;
    return startTime && isPast(new Date(startTime)) && !isToday(new Date(startTime));
  });

  const displayed = tab === "upcoming" ? upcoming : past;

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["savedEvents"] });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to={createPageUrl("Home")}>
            <Button size="icon" variant="ghost" className="bg-zinc-900 hover:bg-zinc-800 rounded-full text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-orange-400" />
              My Calendar
            </h1>
            <p className="text-zinc-500 text-sm">{savedEvents.length} saved event{savedEvents.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 w-fit gap-1">
          {[{ key: "upcoming", label: `Upcoming (${upcoming.length})` }, { key: "past", label: `Past (${past.length})` }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                tab === t.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-zinc-900/50 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-zinc-900/80 rounded-2xl border border-zinc-800 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CalendarDays className="w-8 h-8 text-zinc-600" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              {tab === "upcoming" ? "No upcoming events saved" : "No past events"}
            </h3>
            <p className="text-zinc-500 mb-6">
              {tab === "upcoming" ? "Bookmark events to add them here" : ""}
            </p>
            {tab === "upcoming" && (
              <Link to={createPageUrl("Home")}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl">
                  Discover Events
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((saved) => (
              <SavedEventCard key={saved.id} saved={saved} onRemove={refetch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}