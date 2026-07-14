import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireRole("admin"));

// ─── Validation Schemas ───────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  role: z.enum(["attendee", "organizer", "admin"]),
});

// ─── STATS OVERVIEW ──────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * Returns aggregate platform metrics for the dashboard overview.
 */
router.get(
  "/stats",
  asyncHandler(async (_req: Request, res: Response) => {
    const [
      { count: totalUsers },
      { count: totalEvents },
      { count: activeEvents },
      { count: totalOrders },
      { count: totalReviews },
      { count: totalStatusUpdates },
      { data: revenueData },
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("events").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmed"),
      supabaseAdmin.from("reviews").select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("status_updates")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("orders")
        .select("total_amount")
        .eq("status", "confirmed"),
    ]);

    const totalRevenue = (revenueData || []).reduce(
      (sum: number, o: any) => sum + (o.total_amount || 0),
      0
    );

    // Recent activity: last 7 days of orders + status updates
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { count: newUsersWeek } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: newOrdersWeek } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "confirmed");

    res.json({
      totalUsers: totalUsers || 0,
      totalEvents: totalEvents || 0,
      activeEvents: activeEvents || 0,
      confirmedOrders: totalOrders || 0,
      totalRevenue,
      totalReviews: totalReviews || 0,
      totalStatusUpdates: totalStatusUpdates || 0,
      newUsersThisWeek: newUsersWeek || 0,
      newOrdersThisWeek: newOrdersWeek || 0,
    });
  })
);

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * List all users with optional search. Supports ?search=&role=&limit=&offset=
 */
router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const { search, role, limit = "100", offset = "0" } = req.query;

    let query = supabaseAdmin
      .from("users")
      .select("id, email, name, role, avatar_url, created_at, subscription_tier, bio")
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (role && role !== "all") {
      query = query.eq("role", role as string);
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * PATCH /api/admin/users/:id/role
 * Change a user's role
 */
router.patch(
  "/users/:id/role",
  validate(updateRoleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from demoting themselves
    if (id === req.user!.id && role !== "admin") {
      throw new AppError("You cannot change your own admin role", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError("User not found", 404);

    res.json(data);
  })
);

/**
 * DELETE /api/admin/users/:id
 * Delete a user account (and associated Supabase auth user)
 */
router.delete(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (id === req.user!.id) {
      throw new AppError("You cannot delete your own account", 400);
    }

    // Delete from our users table
    await supabaseAdmin.from("users").delete().eq("id", id);

    // Also delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(id);

    res.json({ success: true });
  })
);

// ─── EVENT MANAGEMENT ────────────────────────────────────────────────────────

/**
 * GET /api/admin/events
 * All events (including inactive) with organizer info
 */
router.get(
  "/events",
  asyncHandler(async (req: Request, res: Response) => {
    const { search, is_active, limit = "100", offset = "0" } = req.query;

    let query = supabaseAdmin
      .from("events")
      .select(`
        id, title, venue_name, venue_type, address, state, is_active,
        current_vibe_score, status_count, created_at, start_time,
        users!created_by(id, name, email)
      `)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,venue_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * PATCH /api/admin/events/:id
 * Toggle event active status or update fields
 */
router.patch(
  "/events/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("events")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    res.json(data);
  })
);

/**
 * DELETE /api/admin/events/:id
 * Hard-delete an event (admin only)
 */
router.delete(
  "/events/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabaseAdmin.from("events").delete().eq("id", id);
    if (error) throw new AppError(error.message, 500);

    res.json({ success: true });
  })
);

// ─── ORDER MANAGEMENT ────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 * All platform orders with buyer and event info
 */
router.get(
  "/orders",
  asyncHandler(async (req: Request, res: Response) => {
    const { status, limit = "100", offset = "0" } = req.query;

    let query = supabaseAdmin
      .from("orders")
      .select(`
        id, total_amount, status, created_at, confirmation_code,
        attendee_name, attendee_email,
        events!event_id(id, title, venue_name),
        users!buyer_id(id, name, email)
      `)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && status !== "all") {
      query = query.eq("status", status as string);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

// ─── REVIEW MODERATION ───────────────────────────────────────────────────────

/**
 * GET /api/admin/reviews
 * All reviews with user + event info
 */
router.get(
  "/reviews",
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = "100", offset = "0" } = req.query;

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select(`
        id, rating, comment, created_at,
        users!user_id(id, name, email),
        events!event_id(id, title, venue_name)
      `)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * DELETE /api/admin/reviews/:id
 * Remove a flagged review
 */
router.delete(
  "/reviews/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  })
);

// ─── STATUS UPDATE MODERATION ────────────────────────────────────────────────

/**
 * GET /api/admin/status-updates
 * All vibe status updates with user + event info
 */
router.get(
  "/status-updates",
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = "100", offset = "0" } = req.query;

    const { data, error } = await supabaseAdmin
      .from("status_updates")
      .select(`
        id, crowd_level, wait_time, vibe_score, comment, created_at,
        users!user_id(id, name, email),
        events!event_id(id, title, venue_name)
      `)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * DELETE /api/admin/status-updates/:id
 * Remove a suspicious status update
 */
router.delete(
  "/status-updates/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("status_updates")
      .delete()
      .eq("id", id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  })
);

export default router;
