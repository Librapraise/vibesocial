import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Tighter limit strictly on login/register endpoints
  message: { error: "Too many auth attempts, please try again later." },
});

// ─── Validation Schemas ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional().nullable(),
  bio: z.string().max(250).optional().nullable(),
  social_links: z.record(z.string(), z.string()).optional(),
  vibe_preferences: z.array(z.string()).optional(),
  privacy_settings: z
    .object({
      is_private: z.boolean().optional(),
      show_on_leaderboard: z.boolean().optional(),
    })
    .optional(),
  subscription_tier: z.string().optional(),
  notification_settings: z
    .object({
      push_enabled: z.boolean().optional(),
      event_start_alerts: z.boolean().optional(),
      status_updates: z.boolean().optional(),
      crowd_level_changes: z.boolean().optional(),
      wait_time_alerts: z.boolean().optional(),
      chat_mentions: z.boolean().optional(),
      weekly_digest: z.boolean().optional(),
    })
    .optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new Supabase Auth user + profile row
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true, // skip confirmation in dev — set to false for production with email verify
    });

    if (error) {
      throw new AppError(error.message, 400);
    }

    // Create the user profile row
    const profile = {
      id: data.user.id,
      email,
      name,
      role: "attendee",
      notification_settings: {
        push_enabled: true,
        event_start_alerts: true,
        status_updates: true,
        crowd_level_changes: true,
        wait_time_alerts: true,
        chat_mentions: true,
        weekly_digest: true,
      },
    };

    await supabaseAdmin.from("users").insert(profile);

    res.status(201).json({ message: "Account created successfully. Please sign in." });
  })
);

/**
 * POST /api/auth/login
 * Sign in with email + password via Supabase Auth
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      throw new AppError("Invalid email or password", 401);
    }

    // Fetch the user profile
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: profile || data.user,
    });
  })
);

/**
 * POST /api/auth/logout
 * Invalidate the current session
 */
router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    // Supabase sessions are stateless JWTs — just confirm logout on client
    res.json({ message: "Logged out successfully" });
  })
);

/**
 * GET /api/auth/me
 * Return the authenticated user's profile
 */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(req.user);
  })
);

/**
 * PUT /api/auth/me
 * Update profile (name, avatar, notification settings)
 */
router.put(
  "/me",
  requireAuth,
  validate(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    res.json(data);
  })
);

/**
 * POST /api/auth/refresh
 * Refresh an expired access token
 */
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new AppError("refresh_token is required", 400);

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

    if (error || !data.session) throw new AppError("Invalid refresh token", 401);

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  })
);

export default router;
