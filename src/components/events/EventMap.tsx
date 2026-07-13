import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import { createPageUrl, venueTypeIcons } from "../../utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VibeScoreBadge from "./VibeScoreBadge";
import { Loader2, Navigation } from "lucide-react";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Premium SVG paths corresponding to Lucide icons
const venueIcons: Record<string, string> = {
  club: `<path d="M12 2v20M17 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`, // Lucide Box/Lounge representation
  lounge: `<path d="M22 22H2M18 22V13c0-3.3-2.7-6-6-6s-6 2.7-6 6v9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 2v5" stroke="white" stroke-width="2" fill="none"/>`, // Wine Glass representation
  bar: `<path d="M6 3h12l-6 6Z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M12 9v12M8 21h8" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`, // Cocktail representation
  rooftop: `<path d="M12 2 2 7l10 5 10-5-10-5Z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>`, // Layers representation
  house_party: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/><path d="M9 22V12h6v10" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>`, // House representation
  pop_up: `<path d="m13 2-2 10h9L11 22l2-10H4L13 2z" stroke="white" stroke-width="2" stroke-linejoin="round" fill="none"/>`, // Bolt representation
  concert: `<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" stroke="white" stroke-width="2" fill="none"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>`, // Mic representation
  other: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" stroke="white" stroke-width="2" fill="none"/><path d="M6 18h12" stroke="white" stroke-width="2" fill="none"/>`, // Venue building outline
};

const getVibeColor = (score?: number): string => {
  if (!score) return "#71717a";
  if (score >= 8) return "#f97316";
  if (score >= 6) return "#a855f7";
  if (score >= 4) return "#3b82f6";
  return "#71717a";
};

type MapEvent = {
  id: string;
  title?: string;
  venue_name?: string;
  venue_type?: string;
  address?: string;
  current_vibe_score?: number;
};

type GeocodedEvent = MapEvent & { coords: [number, number] };

function createEventIcon(event: MapEvent): L.DivIcon {
  const color = getVibeColor(event.current_vibe_score);
  const iconMarkup = venueIcons[event.venue_type || "other"] || venueIcons.other;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 24 28">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 5.25 10 14 10 14s10-8.75 10-14c0-5.5-4.5-10-10-10z" fill="${color}" stroke="white" stroke-width="1.5" filter="url(#shadow)"/>
      <g transform="translate(4.5, 4.5) scale(0.62)">
        ${iconMarkup}
      </g>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [40, 48],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
}

function LocateControl({ onLocate }: { onLocate?: (coords: [number, number]) => void }) {
  const map = useMap();
  const handleLocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 13, { duration: 1.5 });
        onLocate?.([latitude, longitude]);
      },
      () => { }
    );
  };
  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: "10px", marginRight: "10px" }}>
      <button
        onClick={handleLocate}
        className="bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 hover:bg-zinc-800 transition-colors shadow-lg"
        title="Use my location"
      >
        <Navigation className="w-4 h-4" />
      </button>
    </div>
  );
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  );
  const data = await res.json();
  if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

type EventMapProps = {
  events: MapEvent[];
};

export default function EventMap({ events }: EventMapProps) {
  const [geocoded, setGeocoded] = useState<GeocodedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!events.length) { setLoading(false); return; }

    const geocodeAll = async () => {
      setLoading(true);
      const results = await Promise.all(
        events.map(async (event) => {
          if (!event.address) return null;
          const coords = await geocodeAddress(event.address);
          if (!coords) return null;
          return { ...event, coords };
        })
      );
      setGeocoded(results.filter(Boolean) as GeocodedEvent[]);
      setLoading(false);
    };

    geocodeAll();
  }, [events]);

  const center: [number, number] = geocoded.length > 0 ? geocoded[0].coords : [39.8283, -98.5795];
  const zoom = geocoded.length > 0 ? 12 : 4;

  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-zinc-800">
      {loading && (
        <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center z-[1000] gap-3">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Pinning events on the map...</p>
        </div>
      )}

      {!loading && geocoded.length === 0 && (
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center z-[1000] gap-3">
          <span className="text-5xl">🗺️</span>
          <p className="text-zinc-400 text-sm">No events with addresses to display</p>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", background: "#09090b" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <LocateControl />
        {geocoded.map((event) => (
          <Marker key={event.id} position={event.coords} icon={createEventIcon(event)}>
            <Popup className="event-popup">
              <div className="bg-zinc-900 text-white rounded-xl p-3 min-w-[220px] shadow-xl border border-zinc-700">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const Icon = venueTypeIcons[event.venue_type || "other"] || venueTypeIcons.other;
                    return <Icon className="w-5 h-5 text-orange-400" />;
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{event.title}</p>
                    <p className="text-zinc-400 text-xs truncate">{event.venue_name}</p>
                  </div>
                </div>
                {event.current_vibe_score && (
                  <div className="mb-2">
                    <VibeScoreBadge score={event.current_vibe_score} size="sm" />
                  </div>
                )}
                {event.address && (
                  <p className="text-zinc-500 text-xs mb-3 truncate">📍 {event.address}</p>
                )}
                <Link to={createPageUrl("EventDetail") + `?id=${event.id}`}>
                  <button className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    View Event →
                  </button>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip {
          display: none !important;
        }
        .leaflet-control-zoom a {
          background-color: #18181b !important;
          color: #fff !important;
          border-color: #3f3f46 !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #27272a !important;
        }
      `}</style>
    </div>
  );
}