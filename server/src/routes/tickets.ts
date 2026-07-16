import { Router, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();

/**
 * GET /api/tickets
 * List tickets for the authenticated user (with event details)
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        *,
        events!event_id(title, venue_name, address, start_time, cover_image),
        ticket_types!ticket_type_id(name, price)
      `)
      .eq("buyer_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 500);
    res.json(data || []);
  })
);

/**
 * GET /api/tickets/:id
 * Get a single ticket (owner only)
 */
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        *,
        events!event_id(title, venue_name, address, start_time, cover_image),
        ticket_types!ticket_type_id(name, price),
        orders!order_id(confirmation_code, total_amount)
      `)
      .eq("id", req.params.id)
      .single();

    if (error || !ticket) throw new AppError("Ticket not found", 404);
    if (ticket.buyer_id !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Access denied", 403);
    }

    res.json(ticket);
  })
);

/**
 * POST /api/tickets/:id/use
 * Mark a ticket as used (event organizer scanning at door)
 */
router.post(
  "/:id/use",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select("id, status, event_id, events!event_id(created_by)")
      .eq("id", req.params.id)
      .single();

    if (error || !ticket) throw new AppError("Ticket not found", 404);

    const eventCreatedBy = (ticket.events as any)?.created_by;
    if (eventCreatedBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Only the event organizer can scan tickets", 403);
    }

    if (ticket.status === "used") {
      return res.status(409).json({ error: "Ticket already used", status: "used" });
    }
    if (ticket.status === "cancelled") {
      return res.status(409).json({ error: "Ticket is cancelled", status: "cancelled" });
    }

    await supabaseAdmin.from("tickets").update({ status: "used" }).eq("id", req.params.id);
    res.json({ success: true, message: "Ticket validated successfully" });
  })
);

/**
 * POST /api/tickets/scan
 * Mark a ticket as used by its qr_code_data string (event organizer scanning at door)
 */
router.post(
  "/scan",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { qr_code_data } = req.body;
    if (!qr_code_data) throw new AppError("qr_code_data is required", 400);

    const uppercaseCode = qr_code_data.trim().toUpperCase();

    // 1. Try to find a single ticket by qr_code_data
    let { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("id, status, event_id, qr_code_data, events!event_id(title, created_by), ticket_types!ticket_type_id(name)")
      .eq("qr_code_data", uppercaseCode)
      .maybeSingle();

    // 2. If not found, check if it's an order confirmation code
    if (!ticket) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, confirmation_code")
        .eq("confirmation_code", uppercaseCode)
        .maybeSingle();

      if (order) {
        // Find the first unused/valid ticket in this order
        const { data: orderTickets } = await supabaseAdmin
          .from("tickets")
          .select("id, status, event_id, qr_code_data, events!event_id(title, created_by), ticket_types!ticket_type_id(name)")
          .eq("order_id", order.id);

        if (orderTickets && orderTickets.length > 0) {
          const unusedTicket = orderTickets.find(t => t.status === "valid");
          ticket = unusedTicket || orderTickets[0];
        }
      }
    }

    if (!ticket) throw new AppError("Ticket or Order not found with that code", 404);

    const eventCreatedBy = (ticket.events as any)?.created_by;
    if (eventCreatedBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Only the event organizer can scan tickets", 403);
    }

    if (ticket.status === "used") {
      return res.status(409).json({ error: "Ticket already used", status: "used", ticket });
    }
    if (ticket.status === "cancelled") {
      return res.status(409).json({ error: "Ticket is cancelled", status: "cancelled", ticket });
    }

    await supabaseAdmin.from("tickets").update({ status: "used" }).eq("id", ticket.id);
    res.json({ success: true, message: "Ticket validated successfully", ticket });
  })
);

export default router;
