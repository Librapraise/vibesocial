import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { sendEmail } from "../services/emailService";

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
      visibility: z.enum(["public", "friends", "private"]).optional(),
      share_checkins: z.boolean().optional(),
      show_in_directory: z.boolean().optional(),
      share_vibes: z.boolean().optional(),
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

const changePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
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

    // Welcome email
    await sendEmail({
      to: email,
      subject: "Welcome to VibeSocial! 🌟",
      html: `
        <h2>Welcome to VibeSocial, ${name}!</h2>
        <p>We are thrilled to have you join our community.</p>
        <p>Discover local clubs, events, track crowd levels, and stay up to date with the latest vibes in your city.</p>
        <p>Log in to your account and start exploring now!</p>
        <br/>
        <p>Best regards,<br/>The VibeSocial Team</p>
      `
    }).catch(err => console.error("Failed to send welcome email:", err));

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

    // Fetch existing JSONB fields so we can deep-merge instead of overwriting
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("notification_settings, privacy_settings")
      .eq("id", userId)
      .single();

    const merged: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };

    // Deep-merge JSONB fields — prevents toggling one switch from wiping the others
    if (updates.notification_settings && existing?.notification_settings) {
      merged.notification_settings = {
        ...(existing.notification_settings as object),
        ...updates.notification_settings,
      };
    }
    if (updates.privacy_settings && existing?.privacy_settings) {
      merged.privacy_settings = {
        ...(existing.privacy_settings as object),
        ...updates.privacy_settings,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(merged)
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

/**
 * POST /api/auth/change-password
 * Change password of authenticated user
 */
router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { password } = req.body;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (error) throw new AppError(error.message, 400);

    // Send security alert email
    await sendEmail({
      to: req.user!.email,
      subject: "Security Alert: Password Changed - VibeSocial",
      html: `
        <h2>Security Notice</h2>
        <p>Hi ${req.user!.name || "User"},</p>
        <p>This is a confirmation that the password for your VibeSocial account has been successfully changed.</p>
        <p>If you did not make this change, please contact our support team immediately to secure your account.</p>
        <br/>
        <p>Best regards,<br/>The VibeSocial Team</p>
      `
    }).catch(err => console.error("Failed to send password change security alert:", err));

    res.json({ message: "Password updated successfully" });
  })
);

export default router;
