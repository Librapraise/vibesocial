import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { env } from "../config/env";
import { z } from "zod";
import { sendEmail } from "../services/emailService";

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
    let totalBaseAmount = 0;
    let totalQty = 0;

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
      totalBaseAmount += tt.price * req_ticket.quantity;
      totalQty += req_ticket.quantity;
    }

    const serviceFeeTotal = totalBaseAmount > 0 ? totalQty * 1.50 : 0;
    const totalAmount = totalBaseAmount + serviceFeeTotal;

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

      // Trigger user notification
      const { data: eventDetails } = await supabaseAdmin
        .from("events")
        .select("title, venue_name, address, start_time")
        .eq("id", event_id)
        .single();

      // Send ticket confirmation email
      await sendEmail({
        to: order.attendee_email,
        subject: `Your Tickets for ${eventDetails?.title || "VibeSocial Event"}! 🎫`,
        html: `
          <h2>Ticket Confirmation</h2>
          <p>Hi ${order.attendee_name || "there"},</p>
          <p>Your order for <strong>${eventDetails?.title || "VibeSocial Event"}</strong> has been confirmed.</p>
          <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; color: #fff; margin: 15px 0;">
            <strong>Venue:</strong> ${eventDetails?.venue_name || "TBA"}<br/>
            <strong>Location:</strong> ${eventDetails?.address || "TBA"}<br/>
            <strong>Date/Time:</strong> ${eventDetails?.start_time ? new Date(eventDetails.start_time).toLocaleString() : "TBA"}
          </div>
          <p>You can view your tickets and QR codes directly in your account under "My Tickets".</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send free ticket confirmation email:", err));

      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Tickets Confirmed! 🎫",
          message: `Your tickets for ${eventDetails?.title || "VibeSocial Event"} are confirmed!`,
          target_type: "all",
          event_id,
          event_title: eventDetails?.title,
          link_url: "/MyTickets",
        });
      } catch (err) {
        console.error("Free order notification failed:", err);
      }

      return res.status(201).json({ order, payment_required: false });
    }

    // 4. Paid orders — create a Stripe PaymentIntent
    // Determine if the event organizer has an active Stripe Connect account
    const { data: event } = await supabaseAdmin
      .from("events")
      .select("created_by")
      .eq("id", event_id)
      .single();

    const { data: organizer } = event?.created_by
      ? await supabaseAdmin
          .from("users")
          .select("stripe_connect_id, stripe_connect_status")
          .eq("id", event.created_by)
          .single()
      : { data: null };

    const organizerConnectId =
      organizer?.stripe_connect_status === "active" && organizer?.stripe_connect_id
        ? (organizer.stripe_connect_id as string)
        : null;

    // Calculate platform fee for Connect charges (10% commission on base ticket price + 100% of service fee)
    const platformFeePercent = parseFloat(env.PLATFORM_FEE_PERCENT || "10");
    const commissionCents = Math.round(totalBaseAmount * 100 * (platformFeePercent / 100));
    const serviceFeeCents = Math.round(serviceFeeTotal * 100);
    const applicationFeeAmount = organizerConnectId
      ? (commissionCents + serviceFeeCents)
      : 0;

    // Build PaymentIntent params
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(totalAmount * 100), // cents
      currency: "usd",
      metadata: {
        event_id,
        buyer_id: req.user!.id,
        attendee_email,
        confirmation_code: confirmationCode,
        payout_mode: organizerConnectId ? "connect" : "manual",
      },
      receipt_email: attendee_email,
      description: `VibeSocial tickets — ${confirmationCode}`,
    };

    // Attach Connect destination + platform fee if organizer is connected
    if (organizerConnectId) {
      paymentIntentParams.application_fee_amount = applicationFeeAmount;
      paymentIntentParams.transfer_data = { destination: organizerConnectId };
      paymentIntentParams.on_behalf_of = organizerConnectId;
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

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
      stripe_transfer_id: organizerConnectId ? "split_payout" : null,
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

        // Get event details for confirmation email
        const { data: eventDetails } = await supabaseAdmin
          .from("events")
          .select("title, venue_name, address, start_time")
          .eq("id", order.event_id)
          .single();

        // Send ticket confirmation email
        await sendEmail({
          to: order.attendee_email,
          subject: `Your Tickets for ${eventDetails?.title || "VibeSocial Event"}! 🎫`,
          html: `
            <h2>Ticket Confirmation</h2>
            <p>Hi ${order.attendee_name || "there"},</p>
            <p>Your payment was successful! Your tickets for <strong>${eventDetails?.title || "VibeSocial Event"}</strong> have been confirmed.</p>
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; color: #fff; margin: 15px 0;">
              <strong>Venue:</strong> ${eventDetails?.venue_name || "TBA"}<br/>
              <strong>Location:</strong> ${eventDetails?.address || "TBA"}<br/>
              <strong>Date/Time:</strong> ${eventDetails?.start_time ? new Date(eventDetails.start_time).toLocaleString() : "TBA"}
            </div>
            <p>You can view your tickets and QR codes directly in your account under "My Tickets".</p>
            <br/>
            <p>Best regards,<br/>The VibeSocial Team</p>
          `
        }).catch(err => console.error("Failed to send ticket confirmation email:", err));

        // Trigger user notification
        try {
          await supabaseAdmin.from("notifications").insert({
            title: "Tickets Confirmed! 🎫",
            message: `Your tickets for ${eventDetails?.title || "VibeSocial Event"} are confirmed!`,
            target_type: "all",
            event_id: order.event_id,
            event_title: eventDetails?.title,
            link_url: "/MyTickets",
          });
        } catch (err) {
          console.error("Order notification failed:", err);
        }

        // Check for low inventory warning
        for (const line of order.tickets) {
          const { data: ticketType } = await supabaseAdmin
            .from("ticket_types")
            .select("name, capacity, tickets_sold, event_id")
            .eq("id", line.ticket_type_id)
            .single();

          if (ticketType && ticketType.capacity > 0 && ticketType.tickets_sold >= ticketType.capacity * 0.9) {
            const { data: eventAndOrganizer } = await supabaseAdmin
              .from("events")
              .select("title, created_by, users!created_by(email, name)")
              .eq("id", ticketType.event_id)
              .single() as any;

            if (eventAndOrganizer?.users?.email) {
              await sendEmail({
                to: eventAndOrganizer.users.email,
                subject: `⚠️ Low Inventory Alert: ${ticketType.name} for ${eventAndOrganizer.title}`,
                html: `
                  <h2>Low Ticket Inventory Warning</h2>
                  <p>Hi ${eventAndOrganizer.users.name || "Organizer"},</p>
                  <p>Your ticket tier <strong>${ticketType.name}</strong> for the event <strong>${eventAndOrganizer.title}</strong> is now 90% or more sold out!</p>
                  <p>Current sales: <strong>${ticketType.tickets_sold} / ${ticketType.capacity}</strong></p>
                  <p>Log in to your dashboard to adjust the capacity or manage your ticket types.</p>
                  <br/>
                  <p>Best regards,<br/>The VibeSocial Team</p>
                `
              }).catch(err => console.error("Failed to send low inventory email:", err));
            }
          }
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

    // --- Subscription Tier Handling ---
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Only handle subscription purchases
      if (session.mode === "subscription" && session.subscription) {
        const userId = session.client_reference_id || session.metadata?.user_id;
        
        if (userId) {
          // Retrieve the subscription details to identify the product/price
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const priceId = subscription.items.data[0]?.price.id;
          const productId = subscription.items.data[0]?.price.product as string;

          // Check if this product matches Plus or VIP
          const prodPlus = process.env.STRIPE_PRODUCT_PLUS;
          const prodVip = process.env.STRIPE_PRODUCT_VIP;

          let tier: "free" | "plus" | "vip" = "free";
          if (productId === prodVip || priceId === prodVip) {
            tier = "vip";
          } else if (productId === prodPlus || priceId === prodPlus) {
            tier = "plus";
          }

          if (tier !== "free") {
            // Update the user's subscription tier and store the stripe IDs
            await supabaseAdmin
              .from("users")
              .update({ 
                subscription_tier: tier,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                updated_at: new Date().toISOString()
              })
              .eq("id", userId);

            // Fetch user info for confirmation email
            const { data: userData } = await supabaseAdmin
              .from("users")
              .select("email, name")
              .eq("id", userId)
              .single();

            if (userData?.email) {
              await sendEmail({
                to: userData.email,
                subject: `Welcome to VibeSocial ${tier === "vip" ? "👑 VIP" : "⚡ Plus"}!`,
                html: `
                  <h2>Subscription Upgraded!</h2>
                  <p>Hi ${userData.name || "there"},</p>
                  <p>Thank you for upgrading! Your VibeSocial subscription is now active on the <strong>${tier.toUpperCase()}</strong> tier.</p>
                  <p>You now have access to premium features, priority venue alerts, and exclusive event access.</p>
                  <br/>
                  <p>Best regards,<br/>The VibeSocial Team</p>
                `
              }).catch(err => console.error("Failed to send subscription confirmation email:", err));
            }
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      // Find the user with this customer ID or email, and reset to free
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      const email = (customer as Stripe.Customer).email;

      if (email) {
        await supabaseAdmin
          .from("users")
          .update({ 
            subscription_tier: "free",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("email", email);

        // Send cancellation email
        await sendEmail({
          to: email,
          subject: "Your VibeSocial Subscription has ended",
          html: `
            <h2>Subscription Downgrade Notice</h2>
            <p>We are sorry to see you go! Your VibeSocial premium subscription has been cancelled and your tier has been reset to Free.</p>
            <p>You can re-subscribe at any time from your account settings.</p>
            <br/>
            <p>Best regards,<br/>The VibeSocial Team</p>
          `
        }).catch(err => console.error("Failed to send subscription deletion email:", err));
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const email = invoice.customer_email;
      if (email) {
        await sendEmail({
          to: email,
          subject: "Urgent: Payment Failed for your VibeSocial Subscription ⚠️",
          html: `
            <h2>Subscription Payment Failed</h2>
            <p>We were unable to process your payment for your VibeSocial premium subscription renewal.</p>
            <p>Please log in to your account and update your payment details to avoid interruption of premium features.</p>
            <br/>
            <p>Best regards,<br/>The VibeSocial Team</p>
          `
        }).catch(err => console.error("Failed to send billing failure email:", err));
      }
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

/**
 * POST /api/orders/:id/cancel
 * Cancel an order (buyer or organizer or admin)
 */
router.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*, events!event_id(created_by)")
      .eq("id", id)
      .single();

    if (error || !order) throw new AppError("Order not found", 404);

    const eventCreatedBy = (order.events as any)?.created_by;
    const isBuyer = order.buyer_id === req.user!.id;
    const isOrganizer = eventCreatedBy === req.user!.id;
    const isAdmin = req.user!.role === "admin";

    if (!isBuyer && !isOrganizer && !isAdmin) {
      throw new AppError("Access denied", 403);
    }

    if (order.status === "cancelled") {
      return res.status(409).json({ error: "Order is already cancelled" });
    }

    // Cancel order
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) throw new AppError(updateError.message, 500);

    // If order was confirmed, we need to release ticket capacity and cancel tickets
    if (order.status === "confirmed") {
      // Decrement tickets_sold
      for (const line of order.tickets) {
        await supabaseAdmin.rpc("increment_tickets_sold", {
          p_ticket_type_id: line.ticket_type_id,
          p_quantity: -line.quantity,
        });
      }

      // Cancel associated tickets
      await supabaseAdmin
        .from("tickets")
        .update({ status: "cancelled" })
        .eq("order_id", id);
    }

    // Send cancellation email
    await sendEmail({
      to: order.attendee_email,
      subject: "Your Order has been Cancelled - VibeSocial",
      html: `
        <h2>Order Cancellation Notice</h2>
        <p>Hi ${order.attendee_name || "there"},</p>
        <p>Your order (ID: <strong>${order.id}</strong>) has been successfully cancelled.</p>
        <p>If you were charged, a refund will be processed automatically back to your original payment method within 5-10 business days.</p>
        <br/>
        <p>Best regards,<br/>The VibeSocial Team</p>
      `
    }).catch(err => console.error("Failed to send order cancellation email:", err));

    res.json({ success: true, message: "Order cancelled successfully" });
  })
);

/**
 * PUT /api/orders/:id
 * Update order status (called by frontend when using mock payment in live mode, or admin updates)
 */
router.put(
  "/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("*, tickets")
      .eq("id", id)
      .single();

    if (fetchErr || !order) throw new AppError("Order not found", 404);

    // Only allow buyer or admin to update
    const isBuyer = order.buyer_id === req.user!.id;
    const isAdmin = req.user!.role === "admin";
    if (!isBuyer && !isAdmin) {
      throw new AppError("Access denied", 403);
    }

    const updates: any = {};
    if (status && (status === "confirmed" || status === "cancelled")) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return res.json(order);
    }

    const { data: updatedOrder, error: updateErr } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw new AppError(updateErr.message, 500);

    // If status is updated to confirmed, process ticket generation & email confirmation
    if (updates.status === "confirmed" && order.status !== "confirmed") {
      // 1. Update tickets_sold + create Ticket rows
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

      // 2. Get event details for confirmation email
      const { data: eventDetails } = await supabaseAdmin
        .from("events")
        .select("title, venue_name, address, start_time")
        .eq("id", order.event_id)
        .single();

      // 3. Send ticket confirmation email
      await sendEmail({
        to: order.attendee_email,
        subject: `Your Tickets for ${eventDetails?.title || "VibeSocial Event"}! 🎫`,
        html: `
          <h2>Ticket Confirmation</h2>
          <p>Hi ${order.attendee_name || "there"},</p>
          <p>Your payment was successful! Your tickets for <strong>${eventDetails?.title || "VibeSocial Event"}</strong> have been confirmed.</p>
          <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; color: #fff; margin: 15px 0;">
            <strong>Venue:</strong> ${eventDetails?.venue_name || "TBA"}<br/>
            <strong>Location:</strong> ${eventDetails?.address || "TBA"}<br/>
            <strong>Date/Time:</strong> ${eventDetails?.start_time ? new Date(eventDetails.start_time).toLocaleString() : "TBA"}
          </div>
          <p>You can view your tickets and QR codes directly in your account under "My Tickets".</p>
          <br/>
          <p>Best regards,<br/>The VibeSocial Team</p>
        `
      }).catch(err => console.error("Failed to send ticket confirmation email:", err));

      // 4. Trigger user notification
      try {
        await supabaseAdmin.from("notifications").insert({
          title: "Tickets Confirmed! 🎫",
          message: `Your tickets for ${eventDetails?.title || "VibeSocial Event"} are confirmed!`,
          target_type: "all",
          event_id: order.event_id,
          event_title: eventDetails?.title,
          link_url: "/MyTickets",
        });
      } catch (err) {
        console.error("Order notification failed:", err);
      }
    }

    res.json(updatedOrder);
  })
);

export default router;
