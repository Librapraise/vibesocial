import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const createReviewSchema = z.object({
  event_id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * GET /api/reviews?event_id=
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.query;

    let query = supabaseAdmin
      .from("reviews")
      .select("*, users!user_id(name, avatar_url)")
      .order("created_at", { ascending: false });

    if (event_id) query = query.eq("event_id", event_id as string);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * POST /api/reviews
 * One review per user per event.
 */
router.post(
  "/",
  requireAuth,
  validate(createReviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, rating, comment } = req.body;

    // Check for duplicate review
    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("event_id", event_id)
      .eq("user_id", req.user!.id)
      .single();

    if (existing) throw new AppError("You have already reviewed this event", 409);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert({ event_id, user_id: req.user!.id, rating, comment })
      .select("*, users!user_id(name, avatar_url)")
      .single();

    if (error) throw new AppError(error.message, 400);
    res.status(201).json(data);
  })
);

/**
 * DELETE /api/reviews/:id (owner only)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data: existing } = await supabaseAdmin
      .from("reviews")
      .select("user_id")
      .eq("id", req.params.id)
      .single();

    if (!existing) throw new AppError("Review not found", 404);
    if (existing.user_id !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("You can only delete your own reviews", 403);
    }

    await supabaseAdmin.from("reviews").delete().eq("id", req.params.id);
    res.json({ success: true });
  })
);

export default router;
