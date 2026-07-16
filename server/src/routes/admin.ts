import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { sendEmail } from "../services/emailService";
import Stripe from "stripe";
import { env } from "../config/env";
import { logBuffer } from "../utils/logBuffer";

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });

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

    let totalRevenue = 0;
    let ticketGross = 0;
    let subscriptionGross = 0;
    let platformFeesCollected = 0;
    let stripeProcessingFees = 0;
    const transactionsList: any[] = [];

    try {
      const stripeCharges = await stripe.charges.list({ limit: 100 });
      const succeededCharges = stripeCharges.data.filter((c) => c.status === "succeeded");

      for (const c of succeededCharges) {
        const gross = c.amount / 100;
        const appFee = c.application_fee_amount ? c.application_fee_amount / 100 : 0;
        
        // Estimate Stripe processing fee (2.9% + 30c)
        const stripeFee = (gross * 0.029) + 0.30;
        
        totalRevenue += gross;
        
        const isSubscription = c.description?.toLowerCase().includes("plus") || 
                               c.description?.toLowerCase().includes("vip") ||
                               c.description?.toLowerCase().includes("subscription");

        if (isSubscription) {
          subscriptionGross += gross;
          // Platform keeps 100% of subscription revenue
          platformFeesCollected += gross;
        } else {
          ticketGross += gross;
          // Platform keeps the application fee (10% + service fee)
          platformFeesCollected += appFee;
        }
        
        stripeProcessingFees += stripeFee;

        transactionsList.push({
          id: c.id,
          created: new Date(c.created * 1000).toISOString(),
          description: c.description || "Payment Transaction",
          amount: gross,
          type: isSubscription ? "subscription" : "ticket",
          fee: appFee,
          stripeFee,
          status: c.status
        });
      }
    } catch (err) {
      console.error("Failed to parse Stripe finance details:", err);
      totalRevenue = (revenueData || []).reduce(
        (sum: number, o: any) => sum + (o.total_amount || 0),
        0
      );
    }

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
      finance: {
        ticketGross,
        subscriptionGross,
        platformFeesCollected,
        stripeProcessingFees,
        transactions: transactionsList
      }
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

    let totalRevenue = 0;
    try {
      const stripeCharges = await stripe.charges.list({ limit: 100 });
      totalRevenue = stripeCharges.data
        .filter((c) => c.status === "succeeded")
        .reduce((sum, c) => sum + c.amount / 100, 0);
    } catch (err) {
      console.error("Failed to fetch Stripe charges for weekly report:", err);
      totalRevenue = (revenueData || []).reduce(
        (sum: number, o: any) => sum + (o.total_amount || 0),
        0
      );
    }

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

// ─── PAYOUTS & TRANSFERS ──────────────────────────────────────────────────────

router.get(
  "/transfers",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const transfers = await stripe.transfers.list({ limit: 100 });
      const transfersWithDetails = await Promise.all(
        transfers.data.map(async (t) => {
          const { data: organizer } = await supabaseAdmin
            .from("users")
            .select("id, name, email")
            .eq("stripe_connect_id", t.destination)
            .maybeSingle();
          return {
            id: t.id,
            amount: t.amount / 100,
            created: new Date(t.created * 1000).toISOString(),
            destination: t.destination,
            organizer: organizer || { name: "Unknown Organizer", email: "N/A" },
            status: "succeeded",
            transferGroup: t.transfer_group,
          };
        })
      );
      res.json(transfersWithDetails);
    } catch (err: any) {
      console.error("Failed to fetch Stripe transfers:", err);
      res.json([]);
    }
  })
);

router.post(
  "/transfers/retry",
  asyncHandler(async (req: Request, res: Response) => {
    const { destination, amount, transferGroup } = req.body;
    if (!destination || !amount) {
      throw new AppError("Destination and amount are required", 400);
    }
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      destination,
      transfer_group: transferGroup || `retry_${Date.now()}`,
    });
    res.json({ success: true, transfer });
  })
);

// ─── MODERATION REPORTS ───────────────────────────────────────────────────────

router.get(
  "/reports",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("content_reports")
      .select(`
        id, entity_type, entity_id, reason, status, created_at,
        users!reporter_id(id, name, email)
      `)
      .order("created_at", { ascending: false });
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

router.post(
  "/reports/:id/action",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action } = req.body; // 'resolve' or 'dismiss'
    if (!action || !["resolve", "dismiss"].includes(action)) {
      throw new AppError("Invalid action type", 400);
    }
    
    if (action === "resolve") {
      const { data: report } = await supabaseAdmin
        .from("content_reports")
        .select("*")
        .eq("id", id)
        .maybeSingle();
        
      if (report) {
        if (report.entity_type === "event") {
          await supabaseAdmin.from("events").delete().eq("id", report.entity_id);
        } else if (report.entity_type === "review") {
          await supabaseAdmin.from("reviews").delete().eq("id", report.entity_id);
        } else if (report.entity_type === "status_update") {
          await supabaseAdmin.from("status_updates").delete().eq("id", report.entity_id);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from("content_reports")
      .update({ status: action === "resolve" ? "resolved" : "dismissed" })
      .eq("id", id);
    if (error) throw new AppError(error.message, 500);

    res.json({ success: true });
  })
);

// ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────

router.get(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("key, value");
    if (error) throw new AppError(error.message, 500);
    
    const settingsObj = (data || []).reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  })
);

router.put(
  "/settings",
  asyncHandler(async (req: Request, res: Response) => {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabaseAdmin
        .from("system_settings")
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new AppError(error.message, 500);
    }
    res.json({ success: true });
  })
);

// ─── PROMO CODES ─────────────────────────────────────────────────────────────

router.get(
  "/promos",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

router.post(
  "/promos",
  asyncHandler(async (req: Request, res: Response) => {
    const { code, discount_type, discount_value, max_uses, expires_at, event_id } = req.body;
    if (!code || !discount_type || !discount_value) {
      throw new AppError("Missing required promo fields", 400);
    }
    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .insert({
        code: code.toUpperCase(),
        discount_type,
        discount_value,
        max_uses: max_uses ? Number(max_uses) : null,
        expires_at: expires_at || null,
        is_active: true,
        event_id: event_id || null
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 500);
    res.json(data);
  })
);

router.delete(
  "/promos/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("promo_codes")
      .delete()
      .eq("id", id);
    if (error) throw new AppError(error.message, 500);
    res.json({ success: true });
  })
);

// ─── SYSTEM LOGS ─────────────────────────────────────────────────────────────

router.get(
  "/logs",
  asyncHandler(async (req: Request, res: Response) => {
    res.json(logBuffer);
  })
);

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

router.get(
  "/support",
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .select(`
        id, category, subject, message, status, created_at,
        users!user_id(id, name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

router.patch(
  "/support/:id/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body; // 'open' | 'in_progress' | 'resolved'
    if (!status || !["open", "in_progress", "resolved"].includes(status)) {
      throw new AppError("Invalid status value", 400);
    }

    const { data: ticket, error: fetchErr } = await supabaseAdmin
      .from("support_tickets")
      .select("*, users!user_id(name, email)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !ticket) {
      throw new AppError("Ticket not found", 404);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("support_tickets")
      .update({ status })
      .eq("id", id);

    if (updateErr) throw new AppError(updateErr.message, 500);

    // Notify the user about their support ticket status change
    if (ticket.users?.email) {
      try {
        await sendEmail({
          to: ticket.users.email,
          subject: `📢 Update on your Support Request: [${ticket.category}] ${ticket.subject}`,
          html: `
            <h2>Support Ticket Status Update</h2>
            <p>Hi ${ticket.users.name || "User"},</p>
            <p>The status of your support request <strong>"${ticket.subject}"</strong> has been updated to: <strong style="text-transform: uppercase; color: #f97316;">${status}</strong>.</p>
            <br/>
            <p>Best regards,<br/>The VibeSocial Support Team</p>
          `,
        });
      } catch (err) {
        console.error("Failed to send status update email to user:", err);
      }
    }

    // CC admin
    const adminEmail = process.env.EMAIL_FROM || "admin@vibesocial.app";
    try {
      await sendEmail({
        to: adminEmail,
        subject: `📢 Support Ticket Status Changed: ${ticket.subject}`,
        html: `
          <h3>Support Ticket Status Updated</h3>
          <p>Ticket ID: ${ticket.id}</p>
          <p>New Status: <strong>${status}</strong></p>
          <p>User: ${ticket.users?.name || "N/A"} (${ticket.users?.email || "N/A"})</p>
        `,
      });
    } catch (err) {
      console.error("Failed to notify admin of status change:", err);
    }

    res.json({ success: true });
  })
);

router.get(
  "/notifications",
  asyncHandler(async (req: Request, res: Response) => {
    // 1. Open Support Tickets
    const { data: tickets } = await supabaseAdmin
      .from("support_tickets")
      .select("id, category, subject, created_at")
      .eq("status", "open");

    // 2. Pending Venue Applications
    const { data: venueApps } = await supabaseAdmin
      .from("venue_applications")
      .select("id, name, created_at")
      .eq("status", "pending");

    // 3. Pending Moderation Reports
    const { data: reports } = await supabaseAdmin
      .from("content_reports")
      .select("id, entity_type, reason, created_at")
      .eq("status", "pending");

    const alerts: any[] = [];

    if (tickets) {
      tickets.forEach((t) => {
        alerts.push({
          id: `ticket-${t.id}`,
          title: `🎫 New Support Ticket`,
          message: `[${t.category}] ${t.subject}`,
          created_date: t.created_at,
          link_section: "support",
        });
      });
    }

    if (venueApps) {
      venueApps.forEach((v) => {
        alerts.push({
          id: `venue-${v.id}`,
          title: `🏢 Pending Venue Application`,
          message: `New application from "${v.name}"`,
          created_date: v.created_at,
          link_section: "venue-applications",
        });
      });
    }

    if (reports) {
      reports.forEach((r) => {
        alerts.push({
          id: `report-${r.id}`,
          title: `⚠️ Flagged Content Report`,
          message: `A ${r.entity_type} was flagged for "${r.reason}"`,
          created_date: r.created_at,
          link_section: "moderation",
        });
      });
    }

    // Sort by created_date desc
    alerts.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

    res.json(alerts);
  })
);

export default router;
