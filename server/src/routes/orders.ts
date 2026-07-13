import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { env } from "../config/env";
import { z } from "zod";

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });

// ─── Validation ───────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  event_id: z.string(),
  attendee_name: z.string().min(2),
  attendee_email: z.string().email(),
  tickets: z
    .array(
      z.object({
        ticket_type_id: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one ticket is required"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateConfirmationCode = () =>
  "TKT-" + Math.random().toString(36).substr(2, 8).toUpperCase();

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Create an order. Returns a Stripe PaymentIntent client_secret for paid tickets,
 * or confirms immediately for free events.
 */
router.post(
  "/",
  requireAuth,
  validate(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id, attendee_name, attendee_email, tickets: requestedTickets } = req.body;

    // 1. Resolve all ticket types in one query
    const ticketTypeIds = requestedTickets.map((t: any) => t.ticket_type_id);
    const { data: ticketTypes, error: ttError } = await supabaseAdmin
      .from("ticket_types")
      .select("*")
      .in("id", ticketTypeIds)
      .eq("is_active", true);

    if (ttError) throw new AppError(ttError.message, 500);
    if (!ticketTypes || ticketTypes.length !== ticketTypeIds.length) {
      throw new AppError("One or more ticket types are invalid or unavailable", 400);
    }

    // 2. Validate availability
    const ticketTypeMap = new Map(ticketTypes.map((tt: any) => [tt.id, tt]));
    const orderLines = [];
    let totalAmount = 0;

    for (const req_ticket of requestedTickets) {
      const tt = ticketTypeMap.get(req_ticket.ticket_type_id) as any;
      if (!tt) throw new AppError(`Ticket type ${req_ticket.ticket_type_id} not found`, 400);

      if (tt.capacity !== null) {
        const remaining = tt.capacity - tt.tickets_sold;
        if (req_ticket.quantity > remaining) {
          throw new AppError(`Only ${remaining} ticket(s) remaining for "${tt.name}"`, 400);
        }
      }
      if (req_ticket.quantity > tt.max_per_order) {
        throw new AppError(`Max ${tt.max_per_order} tickets per order for "${tt.name}"`, 400);
      }

      orderLines.push({
        ticket_type_id: tt.id,
        ticket_type_name: tt.name,
        quantity: req_ticket.quantity,
        unit_price: tt.price,
      });
      totalAmount += tt.price * req_ticket.quantity;
    }

    const confirmationCode = generateConfirmationCode();

    // 3. Handle free orders — confirm immediately
    if (totalAmount === 0) {
      const orderData = {
        event_id,
        buyer_id: req.user!.id,
        attendee_name,
        attendee_email,
        tickets: orderLines,
        total_amount: 0,
        status: "confirmed",
        confirmation_code: confirmationCode,
      };

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw new AppError(orderError.message, 500);

      // Increment tickets_sold for each ticket type
      for (const line of orderLines) {
        await supabaseAdmin.rpc("increment_tickets_sold", {
          p_ticket_type_id: line.ticket_type_id,
          p_quantity: line.quantity,
        });

        // Create individual Ticket rows for QR codes
        const ticketRows = Array.from({ length: line.quantity }, () => ({
          id: uuidv4(),
          order_id: order.id,
          event_id,
          ticket_type_id: line.ticket_type_id,
          buyer_id: req.user!.id,
          status: "valid",
          qr_code_data: `VS-${uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
        }));

        await supabaseAdmin.from("tickets").insert(ticketRows);
      }

      return res.status(201).json({ order, payment_required: false });
    }

    // 4. Paid orders — create a Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // cents
      currency: "usd",
      metadata: {
        event_id,
        buyer_id: req.user!.id,
        attendee_email,
        confirmation_code: confirmationCode,
      },
      receipt_email: attendee_email,
      description: `VibeSocial tickets — ${confirmationCode}`,
    });

    // 5. Create order in "pending_payment" state
    const orderData = {
      event_id,
      buyer_id: req.user!.id,
      attendee_name,
      attendee_email,
      tickets: orderLines,
      total_amount: totalAmount,
      status: "pending_payment",
      confirmation_code: confirmationCode,
      stripe_payment_intent_id: paymentIntent.id,
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw new AppError(orderError.message, 500);

    res.status(201).json({
      order,
      payment_required: true,
      client_secret: paymentIntent.client_secret,
    });
  })
);

/**
 * POST /api/orders/webhook
 * Stripe webhook to confirm payment and finalize the order
 */
router.post(
  "/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;

      // Find the pending order
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("*, tickets")
        .eq("stripe_payment_intent_id", pi.id)
        .single();

      if (!error && order) {
        // Confirm the order
        await supabaseAdmin
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", order.id);

        // Update tickets_sold + create Ticket rows
        for (const line of order.tickets) {
          await supabaseAdmin.rpc("increment_tickets_sold", {
            p_ticket_type_id: line.ticket_type_id,
            p_quantity: line.quantity,
          });

          const ticketRows = Array.from({ length: line.quantity }, () => ({
            id: uuidv4(),
            order_id: order.id,
            event_id: order.event_id,
            ticket_type_id: line.ticket_type_id,
            buyer_id: order.buyer_id,
            status: "valid",
            qr_code_data: `VS-${uuidv4().replace(/-/g, "").slice(0, 16).toUpperCase()}`,
          }));

          await supabaseAdmin.from("tickets").insert(ticketRows);
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("stripe_payment_intent_id", pi.id);
    }

    res.json({ received: true });
  })
);

/**
 * GET /api/orders
 * List orders — filtered by buyer_id (user) or event_id (organizer)
 */
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { event_id } = req.query;

    let query = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false });

    if (event_id) {
      // Organizer viewing orders for their event
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("created_by")
        .eq("id", event_id as string)
        .single();

      if (event?.created_by !== req.user!.id && req.user!.role !== "admin") {
        throw new AppError("Only the event organizer can view event orders", 403);
      }
      query = query.eq("event_id", event_id as string);
    } else {
      // Regular user seeing their own orders
      query = query.eq("buyer_id", req.user!.id);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 500);

    res.json(data || []);
  })
);

/**
 * GET /api/orders/:id
 * Get a single order (owner or event organizer)
 */
router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, events!event_id(title, venue_name, start_time, address)")
      .eq("id", req.params.id)
      .single();

    if (error || !order) throw new AppError("Order not found", 404);

    // Must be buyer or the event organizer
    const eventCreatedBy = (order.events as any)?.created_by;
    if (order.buyer_id !== req.user!.id && eventCreatedBy !== req.user!.id && req.user!.role !== "admin") {
      throw new AppError("Access denied", 403);
    }

    res.json(order);
  })
);

export default router;
