import React from "react";
import { cn } from "@/lib/utils";
import { Flame, Zap, Sparkles, Snowflake } from "lucide-react";

type VibeConfig = { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> };

const getVibeConfig = (score?: number): VibeConfig => {
  if (!score || score === 0) return { label: "No updates", color: "text-zinc-500", bg: "bg-zinc-800/50", icon: Snowflake };
  if (score >= 8) return { label: "🔥 On Fire", color: "text-orange-400", bg: "bg-orange-500/15 border-orange-500/30", icon: Flame };
  if (score >= 6) return { label: "⚡ Lit", color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/30", icon: Zap };
  if (score >= 4) return { label: "✨ Warming Up", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", icon: Sparkles };
  return { label: "❄️ Chill", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", icon: Snowflake };
};

type VibeScoreBadgeProps = {
  score?: number;
  size?: "sm" | "lg";
};

export default function VibeScoreBadge({ score, size = "sm" }: VibeScoreBadgeProps) {
  const config = getVibeConfig(score);

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium",
      config.bg, config.color,
      size === "sm" ? "px-2.5 py-1 text-xs" : "px-4 py-1.5 text-sm"
    )}>
      <span>{config.label}</span>
      {score && score > 0 && <span className="font-bold">{score.toFixed(1)}</span>}
    </div>
  );
}
