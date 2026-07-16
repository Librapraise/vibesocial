import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout Session for subscribing to Plus or VIP tier.
 */
router.post(
  "/checkout",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { priceId } = req.body as { priceId: string };

    if (!priceId) {
      throw new AppError("priceId is required", 400);
    }

    // Fetch user details
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("email, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);

    let customerId = user.stripe_customer_id;

    // Create a Stripe customer if not already exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { vibesocial_user_id: userId },
      });
      customerId = customer.id;

      // Save customer ID back to user profile
      await supabaseAdmin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const origin = req.headers.origin || "http://localhost:5173";

    let finalPriceId = priceId;
    if (priceId.startsWith("prod_")) {
      const prices = await stripe.prices.list({
        product: priceId,
        active: true,
        limit: 1,
      });
      if (prices.data && prices.data.length > 0) {
        finalPriceId = prices.data[0].id;
      } else {
        throw new AppError("No active price found for this product ID", 400);
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: finalPriceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/Home?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/Home`,
      client_reference_id: userId,
      metadata: { user_id: userId },
    });

    res.json({ url: session.url });
  })
);

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal Session for managing subscriptions & cancelling.
 */
router.post(
  "/portal",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);
    if (!user.stripe_customer_id) {
      throw new AppError("No billing profile found. You must subscribe first.", 400);
    }

    const origin = req.headers.origin || "http://localhost:5173";

    // Create billing portal session hosted by Stripe
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/Home`,
    });

    res.json({ url: session.url });
  })
);

/**
 * POST /api/billing/cancel
 * Cancel the current subscription directly at any time.
 */
router.post(
  "/cancel",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);
    if (!user.stripe_subscription_id) {
      throw new AppError("No active subscription found to cancel", 400);
    }

    // Cancel at period end so they still keep access until billing cycle finishes
    const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      message: "Subscription set to cancel at period end.",
      cancel_at_period_end: subscription.cancel_at_period_end,
    });
  })
);

export default router;
