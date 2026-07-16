import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { AppError } from "../middleware/errorHandler";
import { sendEmail } from "../services/emailService";

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

    // Send onboarding link via email
    await sendEmail({
      to: user.email,
      subject: "Action Required: Complete your Stripe Connect Onboarding - VibeSocial",
      html: `
        <h2>Stripe Connect Onboarding</h2>
        <p>Hi ${user.name || "Organizer"},</p>
        <p>You have initiated the onboarding flow to set up payouts for ticket sales on VibeSocial.</p>
        <p>Please use the following secure link to complete your details on Stripe Express:</p>
        <p><a href="${accountLink.url}" style="background-color: #f97316; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Start Onboarding</a></p>
        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p>${accountLink.url}</p>
        <br/>
        <p>Best regards,<br/>The VibeSocial Team</p>
      `
    }).catch(err => console.error("Failed to send Connect onboarding email:", err));

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

      // Send email if status became active
      if (newStatus === "active" && user.stripe_connect_status !== "active") {
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("email, name")
          .eq("id", userId)
          .single();
 
        if (userData?.email) {
          await sendEmail({
            to: userData.email,
            subject: "Stripe Connect Activated! 💳 - VibeSocial",
            html: `
              <h2>Stripe Connect Status Update</h2>
              <p>Hi ${userData.name || "Organizer"},</p>
              <p>Congratulations! Your Stripe Connect Express account is now fully active.</p>
              <p>You can now accept card payments for your event tickets and receive payouts directly to your bank account.</p>
              <br/>
              <p>Best regards,<br/>The VibeSocial Team</p>
            `
          }).catch(err => console.error("Failed to send Connect active email:", err));
        }
      }
    }

    // --- Retroactive Payout Transfer Logic (Runs whenever status is active) ---
    if (newStatus === "active") {
      try {
        const { data: eventsList } = await supabaseAdmin
          .from("events")
          .select("id")
          .eq("created_by", userId);

        const eventIds = eventsList?.map((e) => e.id) || [];

        if (eventIds.length > 0) {
          const { data: pendingOrders } = await supabaseAdmin
            .from("orders")
            .select("id, total_amount, confirmation_code")
            .in("event_id", eventIds)
            .eq("status", "confirmed")
            .is("stripe_transfer_id", null)
            .gt("total_amount", 0);

          if (pendingOrders && pendingOrders.length > 0) {
            const platformFeePercent = parseFloat(env.PLATFORM_FEE_PERCENT || "10");
            const payoutPercent = 100 - platformFeePercent;

            for (const order of pendingOrders) {
              const totalCents = Math.round(order.total_amount * 100);
              // Calculate 2.9% + 30c card processing fee in cents
              const stripeFeeCents = Math.round(totalCents * 0.029 + 30);
              const basePayoutCents = Math.round(totalCents * (payoutPercent / 100));
              const payoutAmount = basePayoutCents - stripeFeeCents;

              if (payoutAmount <= 0) {
                console.log(`Skipping order ${order.confirmation_code} because payout amount is <= 0 after fee deduction.`);
                continue;
              }

              try {
                const transfer = await stripe.transfers.create({
                  amount: payoutAmount,
                  currency: "usd",
                  destination: connectId,
                  description: `Retroactive payout transfer for order ${order.confirmation_code}`,
                  metadata: { order_id: order.id },
                });

                await supabaseAdmin
                  .from("orders")
                  .update({ stripe_transfer_id: transfer.id })
                  .eq("id", order.id);

                console.log(
                  `Successfully processed retroactive payout of $${(
                    payoutAmount / 100
                  ).toFixed(2)} for order ${order.confirmation_code}`
                );
              } catch (transferErr) {
                console.error(
                  `Failed to transfer for order ${order.id}:`,
                  transferErr
                );
              }
            }
          }
        }
      } catch (retroactiveErr) {
        console.error("Error processing retroactive transfers:", retroactiveErr);
      }
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
