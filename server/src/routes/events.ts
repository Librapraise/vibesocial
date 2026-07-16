import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";
import { sendEmail } from "../services/emailService";
import { calculateDecayedVibe } from "./statusUpdates";

const router = Router();

/**
 * Utility to decay events vibe scores on-the-fly if they have not been updated for 2 hours.
 */
async function decayEventsIfStale(eventsList: any[]) {
  const now = Date.now();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  
  for (const event of eventsList) {
    const lastUpdate = new Date(event.updated_at || event.created_at).getTime();
    if (now - lastUpdate >= twoHoursMs && Number(event.current_vibe_score) !== 5.0) {
      const { data: recent } = await supabaseAdmin
        .from("status_updates")
        .select("vibe_score, crowd_level, wait_time, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const { avgScore, latestCrowd, latestWait } = calculateDecayedVibe(recent || [], 5.0);

      await supabaseAdmin.from("events").update({
        current_vibe_score: avgScore,
        current_crowd_level: latestCrowd,
        current_wait_time: latestWait,
        updated_at: new Date().toISOString()
      }).eq("id", event.id);

      event.current_vibe_score = avgScore;
      event.current_crowd_level = latestCrowd;
      event.current_wait_time = latestWait;
    }
  }
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createEventSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  venue_name: z.string().min(2),
  venue_type: z.enum(["club", "lounge", "bar", "rooftop", "house_party", "pop_up", "concert", "other"]),
  address: z.string().min(2),
  state: z.string().length(2, "State must be 2-letter code"),
  description: z.string().optional(),
  cover_image: z.string().url().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  vibe_tags: z.array(z.string()).default([]),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
});

const updateEventSchema = createEventSchema.partial().extend({
  current_vibe_score: z.number().min(0).max(10).optional(),
  current_crowd_level: z.enum(["empty", "filling_up", "active", "busy", "packed", "at_capacity"]).optional().nullable(),
  current_wait_time: z.enum(["no_wait", "5_min", "15_min", "30_min", "45_plus_min"]).optional().nullable(),
  is_active: z.boolean().optional(),
  status_count: z.number().int().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/events
 * List events with optional filters: venue_type, state, is_active, search
 * Supports sort_by: vibe | trending | new
 */
router.get(
  "/",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { venue_type, state, is_active, search, sort_by = "vibe", limit = "50", offset = "0" } = req.query;

    let query = supabaseAdmin.from("events").select(`
      *,
      ticket_types!event_id(id, name, price, capacity, tickets_sold, is_active)
    `);

    if (venue_type && venue_type !== "all") {
      query = query.eq("venue_type", venue_type as string);
    }
    if (state && state !== "all") {
      query = query.eq("state", state as string);
    }
    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    } else {
      // Default: only active events
      query = query.eq("is_active", true);
    }
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,venue_name.ilike.%${search}%,address.ilike.%${search}%`
      );
    }

    // Sorting
    if (sort_by === "vibe") {
      query = query.order("current_vibe_score", { ascending: false });
    } else if (sort_by === "trending") {
      query = query.order("status_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    if (data && data.length > 0) {
      await decayEventsIfStale(data).catch(err => console.error("Event decay error:", err));
    }

    res.json(data || []);
  })
);

/**
 * GET /api/events/:id
 * Get a single event by ID — includes ticket types + recent status updates
 */
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select(`
        *,
        ticket_types!event_id(*),
        status_updates!event_id(*, users!user_id(name, avatar_url)),
        reviews!event_id(*, users!user_id(name, avatar_url))
      `)
      .eq("id", id)
      .single();

    if (error || !event) throw new AppError("Event not found", 404);

    await decayEventsIfStale([event]).catch(err => console.error("Single event decay error:", err));

    // Limit status updates and reviews to latest 20
    const result = {
      ...event,
      status_updates: event.status_updates?.slice(0, 20) || [],
      reviews: event.reviews?.slice(0, 20) || [],
    };

    res.json(result);
  })
);

/**
 * POST /api/events
 * Create a new event (auth required)
 */
router.post(
  "/",
  requireAuth,
  validate(createEventSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const eventData = {
      ...req.body,
      created_by: req.user!.id,
      current_vibe_score: 0,
      status_count: 0,
      is_active: true,
    };

    const { data, error } = await supabaseAdmin
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    res.status(201).json(data);
  })
);

/**
 * PUT /api/events/:id
 * Update an event (owner only)
 */
router.put(
  "/:id",
  requireAuth,
  validate(updateEventSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Verify ownership (admins can update any)
    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("title, created_by, start_time, address")
      .eq("id", id)
      .single();

    if (!existing) throw new AppError("Event not found", 404);

    if (existing.created_by !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("You can only update your own events", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    // Notify ticket holders if critical fields (time/location) changed
    const timeChanged = req.body.start_time && req.body.start_time !== existing.start_time;
    const locationChanged = req.body.address && req.body.address !== existing.address;

    if (timeChanged || locationChanged) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("attendee_email, attendee_name")
        .eq("event_id", id)
        .eq("status", "confirmed");

      if (orders && orders.length > 0) {
        for (const order of orders) {
          await sendEmail({
            to: order.attendee_email,
            subject: `Important Update: Changes to ${data.title} 📢`,
            html: `
              <h2>Event Update Notice</h2>
              <p>Hi ${order.attendee_name || "Attendee"},</p>
              <p>There has been an update to the event <strong>${data.title}</strong> that you hold tickets for.</p>
              <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; color: #fff; margin: 15px 0;">
                <strong>New Venue:</strong> ${data.venue_name || "TBA"}<br/>
                <strong>New Location:</strong> ${data.address || "TBA"}<br/>
                <strong>New Date/Time:</strong> ${data.start_time ? new Date(data.start_time).toLocaleString() : "TBA"}
              </div>
              <p>Please update your calendar details accordingly. See you there!</p>
              <br/>
              <p>Best regards,<br/>The VibeSocial Team</p>
            `
          }).catch(err => console.error("Failed to send event update email:", err));
        }
      }
    }

    res.json(data);
  })
);

/**
 * DELETE /api/events/:id
 * Soft-delete an event by setting is_active=false (owner or admin only)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from("events")
      .select("title, created_by")
      .eq("id", id)
      .single();

    if (!existing) throw new AppError("Event not found", 404);

    if (existing.created_by !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("You can only delete your own events", 403);
    }

    await supabaseAdmin
      .from("events")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Fetch and notify confirmed ticket holders
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("attendee_email, attendee_name")
      .eq("event_id", id)
      .eq("status", "confirmed");

    if (orders && orders.length > 0) {
      for (const order of orders) {
        await sendEmail({
          to: order.attendee_email,
          subject: `Urgent: Event Cancelled - ${existing.title} ⚠️`,
          html: `
            <h2>Event Cancellation Notice</h2>
            <p>Hi ${order.attendee_name || "Attendee"},</p>
            <p>We regret to inform you that the event <strong>${existing.title}</strong> has been cancelled by the organizer.</p>
            <p>If you purchased a paid ticket, a full refund will be initiated automatically. Refund processing typically takes 5-10 business days.</p>
            <br/>
            <p>Best regards,<br/>The VibeSocial Team</p>
          `
        }).catch(err => console.error("Failed to send cancellation email:", err));
      }
    }

    res.json({ success: true });
  })
);

export default router;
