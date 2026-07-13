import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, QrCode, CheckCircle2, Loader2, ShieldCheck, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";

const GEO_RADIUS_METERS = 500; // within 500m counts as present

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  return null;
}

type CheckInEvent = {
  id: string;
  address?: string;
  venue_type?: string;
  vibe_tags?: string[];
  status_count?: number;
};

type CheckInButtonProps = {
  event: CheckInEvent;
  onCheckedIn?: () => void;
};

type CheckInStatus = "idle" | "loading" | "success" | "error" | "qr_mode";

export default function CheckInButton({ event, onCheckedIn }: CheckInButtonProps) {
  const [status, setStatus] = useState<CheckInStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrPanel, setShowQrPanel] = useState<boolean>(false);
  const [qrInput, setQrInput] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // QR token: simple hash of event id + secret phrase
  const QR_TOKEN = `CHECKIN-${event.id}-VIBECHECK`;

  useEffect(() => {
    // Check if user already checked in to this event
    const check = async () => {
      try {
        const activities = await base44.entities.UserActivity.filter({
          event_id: event.id,
          action_type: "checked_in",
        });
        if (activities.some((a: any) => a.check_in_verified)) {
          setAlreadyCheckedIn(true);
        }
      } catch { }
    };
    check();
  }, [event.id]);

  useEffect(() => {
    if (showQrPanel) {
      QRCode.toDataURL(QR_TOKEN, { width: 220, margin: 2, color: { dark: "#f97316", light: "#18181b" } })
        .then(setQrDataUrl)
        .catch(() => { });
    }
  }, [showQrPanel, QR_TOKEN]);

  const recordCheckIn = async (method: string) => {
    // Bump event status_count as proxy for activity score
    const currentCount = event.status_count || 0;
    await base44.entities.Event.update(event.id, { status_count: currentCount + 2 });

    await base44.entities.UserActivity.create({
      event_id: event.id,
      action_type: "checked_in",
      venue_type: event.venue_type,
      vibe_tags: event.vibe_tags || [],
      check_in_method: method,
      check_in_verified: true,
    });

    setAlreadyCheckedIn(true);
    setStatus("success");
    setMessage("You're verified! Badge added to your profile.");
    onCheckedIn?.();
  };

  const handleGeoCheckIn = async () => {
    setStatus("loading");
    setMessage("Getting your location…");

    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("Geolocation not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        if (!event.address) {
          // No address to compare — accept the check-in on good faith
          await recordCheckIn("geolocation");
          return;
        }

        setMessage("Verifying your location…");
        const coords = await geocodeAddress(event.address);
        if (!coords) {
          // Couldn't geocode — still accept
          await recordCheckIn("geolocation");
          return;
        }

        const dist = getDistanceMeters(latitude, longitude, coords.lat, coords.lon);
        if (dist <= GEO_RADIUS_METERS) {
          await recordCheckIn("geolocation");
        } else {
          setStatus("error");
          setMessage(`You appear to be ${Math.round(dist)}m from the venue. Must be within ${GEO_RADIUS_METERS}m.`);
        }
      },
      (err) => {
        setStatus("error");
        setMessage("Location access denied. Try QR check-in instead.");
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleQrSubmit = async () => {
    if (qrInput.trim() === QR_TOKEN) {
      setStatus("loading");
      await recordCheckIn("qr_code");
      setShowQrPanel(false);
    } else {
      setStatus("error");
      setMessage("Invalid QR code. Ask the event organizer for the code.");
    }
  };

  if (alreadyCheckedIn) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-green-400">Verified Attending</span>
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">✓</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleGeoCheckIn}
          disabled={status === "loading"}
          className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
          variant="ghost"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 mr-2" />
          )}
          Check In via Location
        </Button>

        <Button
          onClick={() => { setShowQrPanel((p) => !p); setStatus("idle"); setMessage(""); }}
          variant="ghost"
          className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold"
        >
          <QrCode className="w-4 h-4 mr-2" />
          Check In via QR Code
        </Button>
      </div>

      {/* Status message */}
      {message && (
        <p className={cn(
          "text-xs text-center px-3 py-2 rounded-lg",
          status === "success" && "bg-green-500/10 text-green-400",
          status === "error" && "bg-red-500/10 text-red-400",
          status === "loading" && "text-zinc-400"
        )}>
          {message}
        </p>
      )}

      {/* QR Panel */}
      {showQrPanel && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Show this QR to the organizer</p>
            <p className="text-xs text-zinc-500">or enter the code they show you</p>
          </div>

          {/* Display QR for organizer to scan from user's screen */}
          {qrDataUrl && (
            <div className="flex justify-center">
              <img src={qrDataUrl} alt="Check-in QR" className="rounded-xl w-48 h-48" />
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="flex-1 border-t border-zinc-800" /></div>
            <div className="relative flex justify-center"><span className="bg-zinc-900 px-3 text-xs text-zinc-500">or type the code</span></div>
          </div>

          <div className="flex gap-2">
            <input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Paste / type check-in code…"
              className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-xs px-3 py-2 rounded-lg placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
            />
            <Button size="sm" onClick={handleQrSubmit} className="bg-orange-500 hover:bg-orange-600 text-white">
              <ScanLine className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}