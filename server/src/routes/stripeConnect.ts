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
 * POST /api/stripe-connect/onboard
 * Create (or retrieve) a Stripe Express account for the organizer and return
 * an Account Link URL to redirect them to Stripe's hosted onboarding flow.
 */
router.post(
  "/onboard",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { return_url, refresh_url } = req.body as {
      return_url: string;
      refresh_url: string;
    };

    if (!return_url || !refresh_url) {
      throw new AppError("return_url and refresh_url are required", 400);
    }

    // Fetch current user to check existing stripe_connect_id
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("stripe_connect_id, stripe_connect_status, email, name")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);

    let connectAccountId = user.stripe_connect_id as string | null;

    // Create a new Stripe Express account if not already linked
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: user.name || undefined,
          url: "https://vibesocial-zeta.vercel.app",
        },
        metadata: { vibesocial_user_id: userId },
      });

      connectAccountId = account.id;

      // Persist the new account ID and set status to pending
      await supabaseAdmin
        .from("users")
        .update({
          stripe_connect_id: connectAccountId,
          stripe_connect_status: "pending",
        })
        .eq("id", userId);
    }

    // Generate Account Link (the hosted Stripe onboarding URL)
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  })
);

/**
 * GET /api/stripe-connect/status
 * Refresh the organizer's Stripe account status from Stripe and update DB.
 * Call this when the organizer returns from Stripe onboarding (return_url).
 */
router.get(
  "/status",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("stripe_connect_id, stripe_connect_status")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);

    const connectId = user.stripe_connect_id as string | null;

    if (!connectId) {
      return res.json({
        status: "not_connected",
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false,
      });
    }

    // Fetch live account data from Stripe
    const account = await stripe.accounts.retrieve(connectId);

    const newStatus =
      account.details_submitted && account.charges_enabled ? "active" : "pending";

    // Update DB if status changed
    if (newStatus !== user.stripe_connect_status || account.details_submitted !== (user as any).stripe_connect_details_submitted) {
      await supabaseAdmin
        .from("users")
        .update({
          stripe_connect_status: newStatus,
          stripe_connect_details_submitted: account.details_submitted,
        })
        .eq("id", userId);
    }

    res.json({
      status: newStatus,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
  })
);

/**
 * GET /api/stripe-connect/dashboard-link
 * Generate a Stripe Express Dashboard login link so the organizer can view
 * their payouts, balance, and refunds directly in Stripe.
 */
router.get(
  "/dashboard-link",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("stripe_connect_id, stripe_connect_status")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new AppError("User not found", 404);
    if (!user.stripe_connect_id || user.stripe_connect_status !== "active") {
      throw new AppError("Stripe account not connected or not yet active", 400);
    }

    const loginLink = await stripe.accounts.createLoginLink(
      user.stripe_connect_id as string
    );

    res.json({ url: loginLink.url });
  })
);

export default router;
