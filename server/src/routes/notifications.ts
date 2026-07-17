import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  target_type: z.string().default("all"),
  user_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  event_title: z.string().optional(),
  link_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

/**
 * GET /api/notifications
 * List notifications
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = "30" } = req.query;

    const currentUserId = req.user?.id;
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .or(`user_id.is.null,user_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (error) throw new AppError(error.message, 500);

    // Map database columns to frontend-expected fields
    const mapped = (data || []).map((row: any) => ({
      ...row,
      created_date: row.created_at,
    }));

    res.json(mapped);
  })
);

/**
 * POST /api/notifications
 * Create a new notification
 */
router.post(
  "/",
  requireAuth,
  validate(createNotificationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { title, message, target_type, user_id, event_id, event_title, link_url, is_active } = req.body;

    const recipientUserId = user_id || req.user?.id || null;

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        title,
        message,
        target_type,
        user_id: recipientUserId,
        event_id: event_id || null,
        event_title: event_title || null,
        link_url: link_url || null,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    res.status(201).json({
      ...data,
      created_date: data.created_at,
    });
  })
);

export default router;
