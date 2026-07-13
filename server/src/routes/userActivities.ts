import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /api/user-activities
 * List/filter user activities (check-ins)
 */
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { created_by_id, event_id, action_type } = req.query;

    let query = supabaseAdmin.from("user_activities").select("*");

    if (created_by_id) {
      query = query.eq("user_id", created_by_id);
    }
    if (event_id) {
      query = query.eq("event_id", event_id);
    }
    if (action_type) {
      query = query.eq("action_type", action_type);
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
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, action_type, venue_type, vibe_tags, check_in_method, check_in_verified } = req.body;

    if (!event_id || !action_type) {
      throw new AppError("event_id and action_type are required", 400);
    }

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

export default router;
