import React from "react";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

const crowdConfig: Record<string, { label: string; dots: number; color: string }> = {
  empty: { label: "Empty", dots: 1, color: "text-zinc-400" },
  filling_up: { label: "Filling Up", dots: 2, color: "text-emerald-400" },
  packed: { label: "Packed", dots: 3, color: "text-yellow-400" },
  at_capacity: { label: "At Capacity", dots: 4, color: "text-red-400" },
};

type CrowdIndicatorProps = {
  level?: string;
};

export default function CrowdIndicator({ level }: CrowdIndicatorProps) {
  const config = (level && crowdConfig[level]) || crowdConfig.empty;

  return (
    <div className="flex items-center gap-2">
      <Users className={cn("w-3.5 h-3.5", config.color)} />
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-4 rounded-full transition-all",
              i <= config.dots ? config.color.replace("text-", "bg-") : "bg-zinc-700"
            )}
          />
        ))}
      </div>
      <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
    </div>
  );
}