import { PartyPopper, Sofa, Beer, Sunset, Home, Zap, Mic, Sparkles } from "lucide-react";
import React from "react";

export const venueTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  club: PartyPopper,
  lounge: Sofa,
  bar: Beer,
  rooftop: Sunset,
  house_party: Home,
  pop_up: Zap,
  concert: Mic,
  other: Sparkles,
};

export const venueTypeEmoji: Record<string, string> = {
  club: "🪩",
  lounge: "🍸",
  bar: "🍺",
  rooftop: "🌃",
  house_party: "🏠",
  pop_up: "⚡",
  concert: "🎤",
  other: "🎉",
};
