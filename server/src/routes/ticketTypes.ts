import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { z } from "zod";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const ticketTypeSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  capacity: z.number().int().min(1).optional().nullable(),
  max_per_order: z.number().int().min(1).default(10),
  is_active: z.boolean().default(true),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/ticket-types?event_id=
 * List ticket types for a given event
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.query;

    let query = supabaseAdmin.from("ticket_types").select("*").eq("is_active", true);
    if (event_id) query = query.eq("event_id", event_id as string);

    const { data, error } = await query.order("price", { ascending: true });
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * POST /api/ticket-types
 * Create a ticket type (organizer who owns the event only)
 */
router.post(
  "/",
  requireAuth,
  validate(ticketTypeSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Verify caller owns the event
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("created_by")
      .eq("id", req.body.event_id)
      .single();

    if (!event) throw new AppError("Event not found", 404);
    if (event.created_by !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Only the event organizer can manage ticket types", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("ticket_types")
      .insert({ ...req.body, tickets_sold: 0 })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    res.status(201).json(data);
  })
);

/**
 * PUT /api/ticket-types/:id
 * Update a ticket type (organizer only)
 */
router.put(
  "/:id",
  requireAuth,
  validate(ticketTypeSchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from("ticket_types")
      .select("event_id, events!event_id(created_by)")
      .eq("id", id)
      .single();

    if (!existing) throw new AppError("Ticket type not found", 404);

    const eventCreatedBy = (existing.events as any)?.created_by;
    if (eventCreatedBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Only the event organizer can update ticket types", 403);
    }

    const { data, error } = await supabaseAdmin
      .from("ticket_types")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    res.json(data);
  })
);

/**
 * DELETE /api/ticket-types/:id
 * Soft-delete (set is_active=false)
 */
router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from("ticket_types")
      .select("event_id, events!event_id(created_by)")
      .eq("id", id)
      .single();

    if (!existing) throw new AppError("Ticket type not found", 404);

    const eventCreatedBy = (existing.events as any)?.created_by;
    if (eventCreatedBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Only the event organizer can remove ticket types", 403);
    }

    await supabaseAdmin.from("ticket_types").update({ is_active: false }).eq("id", id);
    res.json({ success: true });
  })
);

export default router;
