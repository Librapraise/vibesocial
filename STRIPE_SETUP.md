# VibeSocial — Stripe & Connect Setup Guide

This guide walks you through setting up your Stripe Dashboard, API keys, Webhooks, Stripe Connect Express configuration, and subscription tiers so that unauthenticated visitors, ticket buyers, and organizers can process payments and automated payouts.

---

## 1. Obtain Your API Keys

1. Sign up or log into the [Stripe Dashboard](https://dashboard.stripe.com).
2. Toggle on **Test Mode** (usually at the top right of the page) so you can test without real money.
3. Navigate to **Developers → API Keys**.
4. Copy the following keys:
   * **Publishable Key** (starts with `pk_test_...`) → Place this in your frontend `.env` as `VITE_STRIPE_PUBLISHABLE_KEY`.
   * **Secret Key** (starts with `sk_test_...`) → Place this in your backend `server/.env` as `STRIPE_SECRET_KEY`.

---

## 2. Configure Stripe Connect (Express)

Since VibeSocial uses **Stripe Connect Express** to split payments between the platform and organizers, you must enable and configure Connect inside the dashboard:

1. Click on **Connect** in the left sidebar menu of your Stripe Dashboard.
2. Click **Get Started** or **Enable Connect**.
3. Choose **Platform** or **Marketplace** as your integration type.
4. Go to **Connect Settings** (gear icon or Developers section):
   * Under **Onboarding options**, enable **Express** accounts.
   * Under **Branding**, customize your platform name, colors, and logos. This is what organizers will see when they redirect to Stripe to link their bank accounts.
   * Add your redirect/return URL to the whitelisted domains if Stripe asks for them:
     * Local: `http://localhost:5173/organizer`
     * Production: `https://vibesocial-zeta.vercel.app/organizer`

---

## 3. Set Up Subscription Tiers (Stripe Billing)

VibeSocial features three user tiers: `free`, `plus`, and `vip`. To sell recurring subscription plans via Stripe, configure them in your dashboard:

1. In the Stripe Dashboard, go to **Product catalog** (or **Products**).
2. Click **Add product** for each tier you want to offer:
   * **Plus Tier**:
     * Name: `VibeSocial Plus`
     * Pricing model: **Standard pricing**
     * Price: e.g., `$9.99` USD
     * Billing frequency: **Recurring** (Monthly or Yearly)
   * **VIP Tier**:
     * Name: `VibeSocial VIP`
     * Pricing model: **Standard pricing**
     * Price: e.g., `$29.99` USD
     * Billing frequency: **Recurring** (Monthly or Yearly)
3. Save each product. Stripe will generate a **Price ID** (starts with `price_...`) for each tier.
4. You can use these Price IDs in your checkout integrations to subscribe users to these plans.
5. In the VibeSocial DB, when a webhook registers a successful subscription checkout, update the user's `subscription_tier` in the `users` table to `plus` or `vip`.

---

## 4. Set Up Webhooks

Webhooks notify the VibeSocial backend when payments and subscription events occur. This allows the backend to automatically update ticket sales and user subscription tiers.

### Webhook Endpoint URL
The webhook handler is mounted at: `/api/orders/webhook`
* **Local Development URL**: `http://localhost:5000/api/orders/webhook`
* **Production URL**: `https://vibesocial-backend-4k0j.onrender.com/api/orders/webhook`

### Required Webhook Events
In order for both ticket orders and subscription tiers to work properly, your Stripe webhook must listen to the following events:
1. **Ticket Orders**:
   * `payment_intent.succeeded` — Confirms ticket payment and generates valid tickets.
   * `payment_intent.payment_failed` — Marks the ticket order status as cancelled.
2. **Subscriptions**:
   * `checkout.session.completed` — Triggered when a customer successfully completes checkout. Handles subscribing users to `plus` or `vip` tiers by updating their `subscription_tier`, `stripe_customer_id`, and `stripe_subscription_id`.
   * `customer.subscription.deleted` — Triggered when a subscription is cancelled or ends. Reverts the user's tier back to `free`.

### Backend Environment Variables
To ensure the webhook can verify incoming Stripe signatures and map subscription products correctly, set the following environment variables in your backend (`server/.env`):
* `STRIPE_WEBHOOK_SECRET`: The webhook signing secret provided by Stripe (starts with `whsec_...`).
* `STRIPE_PRODUCT_PLUS`: The Product ID or Price ID of your VibeSocial Plus subscription tier.
* `STRIPE_PRODUCT_VIP`: The Product ID or Price ID of your VibeSocial VIP subscription tier.

### Local Development Setup:
1. Download and install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Open your terminal and log in:
   ```bash
   stripe login
   ```
3. Forward webhook events to your local VibeSocial API:
   ```bash
   stripe listen --forward-to localhost:5000/api/orders/webhook
   ```
4. The CLI will print a **Webhook Signing Secret** (starts with `whsec_...`).
5. Copy this string and paste it into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

### Production Deployment Setup:
1. Go to **Developers → Webhooks** in the Stripe Dashboard.
2. Click **Add endpoint**.
3. Set the Endpoint URL to your backend's public endpoint: `https://vibesocial-backend-4k0j.onrender.com/api/orders/webhook`
4. Select the events to listen to:
   * `payment_intent.succeeded`
   * `payment_intent.payment_failed`
   * `checkout.session.completed`
   * `customer.subscription.deleted`
5. Click **Add endpoint** and copy the signing secret to your server's hosting environment variables as `STRIPE_WEBHOOK_SECRET`.

---

## 5. Testing Payments & Payouts

* **Test Card Details**:
  * Card Number: `4242 4242 4242 4242`
  * Expiry: Any future date (e.g., `12/30`)
  * CVC: Any 3 digits (e.g., `123`)
  * Zip Code: Any 5 digits (e.g., `90210`)
* **Testing Connect Flow**:
  1. Log into your VibeSocial frontend, navigate to the **Organizer Portal**, and click **Connect with Stripe**.
  2. Complete the Stripe onboarding form (you can use test phone numbers/emails and choose "Skip this step" when prompted for bank details during testing).
  3. You will be redirected back to the VibeSocial Organizer Portal, and your status will update to **Connected ✓**.
  4. Create a ticket type, purchase a ticket using the test card, and look at your Stripe Developer logs to verify the split payment (Destination Charge).
