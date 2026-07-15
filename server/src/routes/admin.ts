import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { sendEmail } from "../services/emailService";

const router = Router();

// All admin routes require authentication + admin role
router.use(requireAuth, requireRole("admin"));

// ─── Validation Schemas ───────────────────────────────────────────────────────

const updateRoleSchema = z.object({
  role: z.enum(["attendee", "organizer", "admin"]),
});

const updateSubscriptionSchema = z.object({
  subscription_tier: z.enum(["free", "plus", "vip"]),
});

const adminUpdateEventSchema = z.object({
  title: z.string().min(2).optional(),
  venue_name: z.string().min(2).optional(),
  venue_type: z.enum(["club", "lounge", "bar", "rooftop", "house_party", "pop_up", "concert", "other"]).optional(),
  address: z.string().min(2).optional(),
  state: z.string().length(2).optional(),
  description: z.string().optional(),
  cover_image: z.string().url().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  vibe_tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  current_vibe_score: z.number().min(0).max(10).optional(),
  current_crowd_level: z.enum(["empty", "filling_up", "active", "busy", "packed", "at_capacity"]).optional().nullable(),
  current_wait_time: z.enum(["no_wait", "5_min", "15_min", "30_min", "45_plus_min"]).optional().nullable(),
  status_count: z.number().int().optional(),
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

/**
 * POST /api/admin/trigger-weekly-report
 * Trigger sending the weekly dashboard stats email summary to administrators.
 */
router.post(
  "/trigger-weekly-report",
  asyncHandler(async (_req: Request, res: Response) => {
    // Fetch metrics
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
      supabaseAdmin.from("events").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("orders").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
      supabaseAdmin.from("reviews").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("status_updates").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("orders").select("total_amount").eq("status", "confirmed"),
    ]);

    const totalRevenue = (revenueData || []).reduce(
      (sum: number, o: any) => sum + (o.total_amount || 0),
      0
    );

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: newUsersWeek } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo);

    const { count: newOrdersWeek } = await supabaseAdmin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "confirmed");

    // Send email
    const adminEmail = process.env.EMAIL_FROM || "admin@vibesocial.app";
    await sendEmail({
      to: adminEmail,
      subject: "📊 Weekly Platform Health & Activity Summary - VibeSocial",
      html: `
        <h2>Weekly Platform Report</h2>
        <p>Here is the weekly health and metrics summary for VibeSocial:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; color: #1f2937; margin: 15px 0;">
          <strong>Total Users:</strong> ${totalUsers || 0} (${newUsersWeek || 0} new this week)<br/>
          <strong>Total Events:</strong> ${totalEvents || 0} (${activeEvents || 0} currently active)<br/>
          <strong>Confirmed Orders:</strong> ${totalOrders || 0} (${newOrdersWeek || 0} this week)<br/>
          <strong>Total Revenue:</strong> $${totalRevenue.toFixed(2)}<br/>
          <strong>Total Status Updates:</strong> ${totalStatusUpdates || 0}<br/>
          <strong>Total Reviews:</strong> ${totalReviews || 0}
        </div>
        <p>Review the full console on your admin dashboard.</p>
        <br/>
        <p>Best regards,<br/>VibeSocial Automated Systems</p>
      `
    });

    res.json({ success: true, message: "Weekly report email dispatched to administrator." });
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
 * PATCH /api/admin/users/:id/subscription
 * Change a user's subscription tier
 */
router.patch(
  "/users/:id/subscription",
  validate(updateSubscriptionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { subscription_tier } = req.body;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ subscription_tier, updated_at: new Date().toISOString() })
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
  validate(adminUpdateEventSchema),
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

    // Fetch review and user email before deleting
    const { data: review } = await supabaseAdmin
      .from("reviews")
      .select("comment, users!user_id(email, name)")
      .eq("id", id)
      .single() as any;

    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
    if (error) throw new AppError(error.message, 500);

    if (review?.users?.email) {
      await sendEmail({
        to: review.users.email,
        subject: "Content Moderation Notice - VibeSocial",
        html: `
          <h2>Content Moderation Update</h2>
          <p>Hi ${review.users.name || "User"},</p>
          <p>Your review containing the comment <em>"${review.comment || ""}"</em> has been removed by platform administrators due to a violation of our community guidelines.</p>
          <p>Please review our Terms of Service to ensure future contributions align with our community values.</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send review moderation email:", err));
    }

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

    // Fetch status update and user details before deleting
    const { data: statusUpdate } = await supabaseAdmin
      .from("status_updates")
      .select("comment, users!user_id(email, name)")
      .eq("id", id)
      .single() as any;

    const { error } = await supabaseAdmin
      .from("status_updates")
      .delete()
      .eq("id", id);
    if (error) throw new AppError(error.message, 500);

    if (statusUpdate?.users?.email) {
      await sendEmail({
        to: statusUpdate.users.email,
        subject: "Status Update Moderated - VibeSocial",
        html: `
          <h2>Content Moderation Update</h2>
          <p>Hi ${statusUpdate.users.name || "User"},</p>
          <p>Your vibe status update containing the comment <em>"${statusUpdate.comment || "N/A"}"</em> has been removed by platform administrators due to suspicious activity or a violation of our community standards.</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send status update moderation email:", err));
    }

    res.json({ success: true });
  })
);

/**
 * GET /api/admin/tickets
 * List all tickets in the platform (with event and buyer details)
 */
router.get(
  "/tickets",
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = "100", offset = "0" } = req.query;

    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        id, status, qr_code_data, created_at,
        users!buyer_id(id, name, email),
        events!event_id(id, title, venue_name)
      `)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

export default router;
