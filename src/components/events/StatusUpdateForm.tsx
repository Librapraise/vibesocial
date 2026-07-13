import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Send, Loader2, Flame, Music, Meh, Frown, User, TrendingUp, Users, Ban, Clock, Check } from "lucide-react";

type StatusUpdateFormProps = {
  eventId: string;
  onSubmitted?: () => void;
};

const musicVibes = [
  { value: "fire", label: "Fire" },
  { value: "decent", label: "Decent" },
  { value: "mid", label: "Mid" },
  { value: "dead", label: "Dead" },
];

const getMusicVibeIcon = (vibe: string, className?: string) => {
  const cnStr = className || "w-5 h-5";
  switch (vibe) {
    case "fire":
      return <Flame className={cn(cnStr, "text-orange-500")} />;
    case "decent":
      return <Music className={cn(cnStr, "text-emerald-400")} />;
    case "mid":
      return <Meh className={cn(cnStr, "text-zinc-400")} />;
    case "dead":
      return <Frown className={cn(cnStr, "text-zinc-600")} />;
    default:
      return null;
  }
};

export default function StatusUpdateForm({ eventId, onSubmitted }: StatusUpdateFormProps) {
  const [vibeScore, setVibeScore] = useState<number[]>([7]);
  const [crowdLevel, setCrowdLevel] = useState<string>("");
  const [waitTime, setWaitTime] = useState<string>("");
  const [musicVibe, setMusicVibe] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const getVibeLabel = (score: number) => {
    if (score >= 9) return "🔥 INSANE";
    if (score >= 7) return "⚡ Lit AF";
    if (score >= 5) return "✨ Good vibes";
    if (score >= 3) return "😐 Mid";
    return "😴 Dead";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Insert new status update
      await base44.entities.StatusUpdate.create({
        event_id: eventId,
        vibe_score: vibeScore[0],
        crowd_level: crowdLevel || undefined,
        wait_time: waitTime || undefined,
        music_vibe: musicVibe || undefined,
        comment: comment.trim() || undefined,
      });

      // 2. Fetch all status updates for this event
      const allStatuses = await base44.entities.StatusUpdate.list({
        where: { event_id: { _eq: eventId } },
        orderBy: { created_date: "desc" },
      });

      // 3. Calculate average vibe score
      const validScores = allStatuses.filter((s: any) => typeof s.vibe_score === "number");
      const avgScore = validScores.length > 0
        ? Math.round(validScores.reduce((sum: number, s: any) => sum + s.vibe_score, 0) / validScores.length)
        : vibeScore[0];

      // 4. Find latest non-empty crowd level and wait time
      const latestWithCrowd = allStatuses.find((s: any) => s.crowd_level);
      const latestWithWait = allStatuses.find((s: any) => s.wait_time);

      // 5. Update the event table
      await base44.entities.Event.update(eventId, {
        current_vibe_score: avgScore,
        current_crowd_level: latestWithCrowd?.crowd_level || undefined,
        current_wait_time: latestWithWait?.wait_time || undefined,
        status_count: allStatuses.length,
      });

      // Reset form
      setCrowdLevel("");
      setWaitTime("");
      setMusicVibe("");
      setComment("");

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (error) {
      console.error("Error submitting status update:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 text-left">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">Report the Vibe</h3>
        <span className="text-xs text-purple-400 font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
          Live Update
        </span>
      </div>

      {/* Vibe Score Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <Label className="text-white text-sm font-medium">Vibe Score</Label>
          <span className="text-purple-400 font-bold text-sm">{vibeScore[0]}/10 ({getVibeLabel(vibeScore[0])})</span>
        </div>
        <Slider
          value={vibeScore}
          onValueChange={setVibeScore}
          max={10}
          min={1}
          step={1}
          className="py-2"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 px-1">
          <span>Dead</span>
          <span>Mid</span>
          <span>Lit</span>
          <span>Insane</span>
        </div>
      </div>

      {/* Music Vibe */}
      <div className="space-y-2">
        <Label className="text-white text-sm font-medium">Music</Label>
        <div className="grid grid-cols-4 gap-2">
          {musicVibes.map((m) => (
            <button
              type="button"
              key={m.value}
              onClick={() => setMusicVibe(musicVibe === m.value ? "" : m.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-xs font-medium transition-all",
                musicVibe === m.value
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600"
              )}
            >
              {getMusicVibeIcon(m.value)}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Crowd Level */}
        <div className="space-y-2">
          <Label className="text-white text-sm font-medium">Crowd</Label>
          <Select value={crowdLevel} onValueChange={setCrowdLevel}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
              <SelectValue placeholder="How packed?" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="empty">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>Empty</span>
                </div>
              </SelectItem>
              <SelectItem value="filling_up">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Filling Up</span>
                </div>
              </SelectItem>
              <SelectItem value="packed">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  <span>Packed</span>
                </div>
              </SelectItem>
              <SelectItem value="at_capacity">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-500" />
                  <span>At Capacity</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Wait Time */}
        <div className="space-y-2">
          <Label className="text-white text-sm font-medium">Wait Time</Label>
          <Select value={waitTime} onValueChange={setWaitTime}>
            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
              <SelectValue placeholder="Door wait?" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="no_wait">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>No wait</span>
                </div>
              </SelectItem>
              <SelectItem value="5_min">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>~5 min</span>
                </div>
              </SelectItem>
              <SelectItem value="15_min">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>~15 min</span>
                </div>
              </SelectItem>
              <SelectItem value="30_min">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>~30 min</span>
                </div>
              </SelectItem>
              <SelectItem value="45_plus_min">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span>45+ min</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label htmlFor="comment" className="text-white text-sm font-medium">What's the vibe right now?</Label>
        <Textarea
          id="comment"
          placeholder="Describe the crowd, music, or overall energy..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 rounded-xl resize-none h-20"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Posting Update...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Share Vibe Report</span>
          </>
        )}
      </Button>
    </form>
  );
}