import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const createStatusSchema = z.object({
  event_id: z.string(),
  vibe_score: z.number().int().min(1).max(10),
  crowd_level: z.enum(["empty", "filling_up", "active", "busy", "packed", "at_capacity"]).optional(),
  wait_time: z.enum(["no_wait", "5_min", "15_min", "30_min", "45_plus_min"]).optional(),
  music_vibe: z.enum(["fire", "decent", "mid", "dead"]).optional(),
  comment: z.string().max(500).optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/status-updates?event_id=
 * List recent status updates for an event
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, limit = "30" } = req.query;

    let query = supabaseAdmin
      .from("status_updates")
      .select("*, users!user_id(name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (event_id) query = query.eq("event_id", event_id as string);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * Helper to calculate decayed vibe score based on time.
 * Vibe scores decay towards a baseline (5.0) if no updates are posted in the last 2 hours.
 */
export function calculateDecayedVibe(recentUpdates: any[], baseVibe = 5.0): { avgScore: number; latestCrowd: string | null; latestWait: string | null } {
  if (!recentUpdates || recentUpdates.length === 0) {
    return { avgScore: baseVibe, latestCrowd: null, latestWait: null };
  }

  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  // Filter updates within the last 2 hours
  const activeUpdates = recentUpdates.filter(
    (u) => (now - new Date(u.created_at).getTime()) <= twoHoursMs
  );

  if (activeUpdates.length > 0) {
    const scores = activeUpdates.map((u) => u.vibe_score).filter(Boolean);
    const avgScore = parseFloat(
      (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1)
    );
    const latestCrowd = activeUpdates.find((u) => u.crowd_level)?.crowd_level || null;
    const latestWait = activeUpdates.find((u) => u.wait_time)?.wait_time || null;
    return { avgScore, latestCrowd, latestWait };
  }

  // No active updates in the last 2 hours, decay the most recent update's score towards the baseVibe
  const latestUpdate = recentUpdates[0];
  const latestScore = latestUpdate.vibe_score || baseVibe;
  const timeDiffHours = (now - new Date(latestUpdate.created_at).getTime()) / (60 * 60 * 1000);

  // Exponential decay formula: Score decays towards baseVibe (5.0)
  const decayedScore = parseFloat(
    (baseVibe + (latestScore - baseVibe) * Math.exp(-0.5 * (timeDiffHours - 2))).toFixed(1)
  );

  return {
    avgScore: decayedScore,
    latestCrowd: null, // Reset status indicators on decay
    latestWait: null,
  };
}

/**
 * POST /api/status-updates
 * Create a vibe status update for an event.
 * Atomically recalculates and updates the event's current_vibe_score, crowd_level, wait_time.
 */
router.post(
  "/",
  requireAuth,
  validate(createStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, vibe_score, crowd_level, wait_time, music_vibe, comment } = req.body;

    // Verify event exists
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, status_count")
      .eq("id", event_id)
      .single();

    if (eventError || !event) throw new AppError("Event not found", 404);

    // Insert status update
    const { data: statusUpdate, error: insertError } = await supabaseAdmin
      .from("status_updates")
      .insert({
        event_id,
        user_id: req.user!.id,
        vibe_score,
        crowd_level,
        wait_time,
        music_vibe,
        comment,
      })
      .select("*, users!user_id(name, avatar_url)")
      .single();

    if (insertError) throw new AppError(insertError.message, 500);

    // Recalculate aggregate vibe score from last 50 updates
    const { data: recent } = await supabaseAdmin
      .from("status_updates")
      .select("vibe_score, crowd_level, wait_time, created_at")
      .eq("event_id", event_id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { avgScore, latestCrowd, latestWait } = calculateDecayedVibe(recent || [], 5.0);

    // Update event aggregates
    await supabaseAdmin.from("events").update({
      current_vibe_score: avgScore,
      current_crowd_level: latestCrowd || crowd_level || null,
      current_wait_time: latestWait || wait_time || null,
      status_count: (event.status_count || 0) + 1,
      updated_at: new Date().toISOString(),
    }).eq("id", event_id);

    // Increment points for status update (+10 points)
    const { data: userRecord } = await supabaseAdmin.from("users").select("points").eq("id", req.user!.id).single();
    const newPoints = (userRecord?.points || 0) + 10;
    await supabaseAdmin.from("users").update({ points: newPoints }).eq("id", req.user!.id);

    res.status(201).json(statusUpdate);
  })
);

export default router;
