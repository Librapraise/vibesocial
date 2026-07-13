import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /api/saved-events
 * List saved events for the authenticated user
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("saved_events")
      .select("*, events!event_id(*)")
      .eq("user_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

/**
 * POST /api/saved-events
 * Save an event
 */
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.body;
    if (!event_id) throw new AppError("event_id is required", 400);

    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from("saved_events")
      .select("id")
      .eq("user_id", req.user!.id)
      .eq("event_id", event_id)
      .single();

    if (existing) {
      res.status(200).json(existing); // idempotent
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("saved_events")
      .insert({ user_id: req.user!.id, event_id })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    res.status(201).json(data);
  })
);

/**
 * DELETE /api/saved-events/:event_id
 * Unsave an event
 */
router.delete(
  "/:event_id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await supabaseAdmin
      .from("saved_events")
      .delete()
      .eq("user_id", req.user!.id)
      .eq("event_id", req.params.event_id);

    res.json({ success: true });
  })
);

export default router;
