import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createUserActivitySchema = z.object({
  event_id: z.string().uuid(),
  action_type: z.string().min(1),
  venue_type: z.enum(["club", "lounge", "bar", "rooftop", "house_party", "pop_up", "concert", "other"]).optional().nullable(),
  vibe_tags: z.array(z.string()).optional(),
  check_in_method: z.string().optional().nullable(),
  check_in_verified: z.boolean().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/user-activities
 * List/filter user activities (check-ins)
 * Only authenticated users can view, and users can only view their own activities (or admin views all)
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { created_by_id, event_id, action_type } = req.query;

    const targetUserId = (created_by_id as string) || req.user!.id;

    // Security check: restrict non-admins to querying only their own activities
    if (targetUserId !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Access denied: You can only query your own activities", 403);
    }

    let query = supabaseAdmin.from("user_activities").select("*").eq("user_id", targetUserId);

    if (event_id) {
      query = query.eq("event_id", event_id as string);
    }
    if (action_type) {
      query = query.eq("action_type", action_type as string);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);

    // Map database columns to the key names expected by the frontend
    const mappedData = (data || []).map((row: any) => ({
      ...row,
      created_by_id: row.user_id,
      created_date: row.created_at,
    }));

    res.json(mappedData);
  })
);

/**
 * POST /api/user-activities
 * Record a new user activity (check-in)
 */
router.post(
  "/",
  requireAuth,
  validate(createUserActivitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, action_type, venue_type, vibe_tags, check_in_method, check_in_verified } = req.body;

    const { data, error } = await supabaseAdmin
      .from("user_activities")
      .insert({
        event_id,
        user_id: req.user!.id,
        action_type,
        venue_type,
        vibe_tags: vibe_tags || [],
        check_in_method,
        check_in_verified: check_in_verified !== false,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    res.status(201).json({
      ...data,
      created_by_id: data.user_id,
      created_date: data.created_at,
    });
  })
);

/**
 * DELETE /api/user-activities/:id
 * Delete an activity log entry (owner only)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const { data: existing } = await supabaseAdmin
      .from("user_activities")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing) throw new AppError("Activity not found", 404);
    if (existing.user_id !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Access denied: You can only delete your own activity logs", 403);
    }

    const { error } = await supabaseAdmin
      .from("user_activities")
      .delete()
      .eq("id", id);

    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, message: "Activity deleted successfully" });
  })
);

export default router;
