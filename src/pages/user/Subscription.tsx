import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Zap,
  Star,
  Music,
  Eye,
  Gift,
  Loader2,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Lock,
  Smartphone
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import SubscriptionManager from "@/components/billing/SubscriptionManager";

// Load Stripe publishable key if available
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) 
  : null;

type Tier = {
  key: string;
  name: string;
  price: string;
  priceNum: number;
  period: string;
  tagline: string;
  color: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  features: { text: string; details: string }[];
  cta: string;
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free Essentials",
    price: "$0",
    priceNum: 0,
    period: "forever",
    tagline: "Start exploring venues and current live vibes",
    color: "from-zinc-700 to-zinc-800",
    badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700",
    icon: Eye,
    features: [
      { text: "Browse all events & venues", details: "Access our curated directory of local hotspots." },
      { text: "Real-time vibe scores", details: "See current score averages submitted by active partygoers." },
      { text: "Event chat (guest access)", details: "Read chat logs to see what people are saying in real time." },
      { text: "Save up to 10 events", details: "Track upcoming events in your personal short-list." },
    ],
    cta: "Downgrade to Free",
  },
  {
    key: "plus",
    name: "Vibe Plus",
    price: "$4.99",
    priceNum: 4.99,
    period: "per month",
    tagline: "Ad-free experience with early ticket bookings",
    color: "from-orange-500 to-pink-500",
    badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: Zap,
    popular: true,
    features: [
      { text: "Everything in Free", details: "All core directory and live vibe features included." },
      { text: "Ad-free browsing", details: "Enjoy an uninterrupted interface with zero external placements." },
      { text: "Early event access (24h)", details: "View and book tickets 24 hours before they open to the public." },
      { text: "Unlimited saved events", details: "Keep track of as many events and locations as you want." },
      { text: "Priority event chat", details: "Send messages in live chatrooms to coordinate with others." },
      { text: "Basic venue analytics", details: "View crowd level charts and wait time trends over the last 24 hours." },
      { text: "Custom vibe alerts", details: "Receive push notifications when saved venues hit your preferred vibe score." },
    ],
    cta: "Upgrade to Plus",
  },
  {
    key: "vip",
    name: "Elite VIP",
    price: "$9.99",
    priceNum: 9.99,
    period: "per month",
    tagline: "Skip-the-line privileges and exclusive access",
    color: "from-purple-500 to-indigo-600",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Crown,
    features: [
      { text: "Everything in Plus", details: "All ad-free and early booking options included." },
      { text: "Skip-the-line partner access", details: "Show your VIP pass at participating venues to fast-track entry." },
      { text: "Exclusive VIP events", details: "Access listings and buy tickets for secret or invite-only member parties." },
      { text: "Verified profile badge", details: "Stand out in chatrooms with an exclusive premium star badge." },
      { text: "Advanced trend analytics", details: "Access deep crowd history, popular days, and peak hours analysis." },
      { text: "Direct organizer messaging", details: "Initiate contact with event hosts for table reservations or custom inquiries." },
      { text: "Early ticket presales (48h)", details: "Highest priority booking window for major city concerts and events." },
      { text: "Priority VIP support", details: "Dedicated line with average response times under 10 minutes." },
    ],
    cta: "Go VIP Elite",
  },
];

// ─── Stripe Subscription Billing Form ────────────────────────────────────────
function StripeBillingForm({ plan, onPaymentSuccess, onCancel }: { plan: Tier; onPaymentSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setLoading(false);
      return;
    }

    // In a production backend subscription flow, we create a SetupIntent or Subscription PaymentIntent
    // and confirm it here. For integration demonstration, we confirm a mock client-side payment method:
    try {
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        setError(pmError.message || "Failed to validate card details.");
        setLoading(false);
      } else {
        // Success
        onPaymentSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
      <div className="space-y-2">
        <Label className="text-zinc-300 text-xs font-semibold">Card Details</Label>
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
          <CardElement options={{
            style: {
              base: {
                color: '#ffffff',
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                '::placeholder': {
                  color: '#71717a',
                },
              },
              invalid: {
                color: '#f87171',
              },
            },
          }} />
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-900">
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !stripe} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Subscribe & Pay {plan.price}
        </Button>
      </div>
    </form>
  );
}

// ─── Mock Subscription Billing Form ──────────────────────────────────────────
function MockBillingForm({ plan, onPaymentSuccess, onCancel }: { plan: Tier; onPaymentSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc) {
      setError("Please fill in all card details.");
      return;
    }
    setLoading(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    onPaymentSuccess();
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardNumber(value.slice(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setExpiry(value.slice(0, 5));
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvc(value.slice(0, 3));
  };

  return (
    <form onSubmit={handlePay} className="space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-950 p-4 rounded-xl border border-zinc-700 relative overflow-hidden shadow-lg mb-4 select-none">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full blur-xl"></div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">VibeSocial Card</span>
          <span className="text-zinc-400 font-black text-xs italic">BILLING SECURE</span>
        </div>
        <div className="text-sm font-mono tracking-widest mb-4 h-6 text-zinc-300">
          {cardNumber || "•••• •••• •••• ••••"}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-zinc-500">
          <div>
            <p className="uppercase text-[8px] text-zinc-650">Cardholder</p>
            <p className="text-zinc-400 mt-0.5">Attendee Premium Guest</p>
          </div>
          <div>
            <p className="uppercase text-[8px] text-zinc-650">Expires</p>
            <p className="text-zinc-400 mt-0.5">{expiry || "MM/YY"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-zinc-450 text-xs mb-1.5 block">Card Number</Label>
          <Input value={cardNumber} onChange={handleCardNumberChange} placeholder="4111 1111 1111 1111" className="bg-zinc-850/50 border-zinc-750 text-white h-11" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-zinc-450 text-xs mb-1.5 block">Expiration Date</Label>
            <Input value={expiry} onChange={handleExpiryChange} placeholder="MM/YY" className="bg-zinc-850/50 border-zinc-750 text-white h-11" />
          </div>
          <div>
            <Label className="text-zinc-450 text-xs mb-1.5 block">CVC</Label>
            <Input value={cvc} onChange={handleCvcChange} placeholder="123" type="password" className="bg-zinc-850/50 border-zinc-750 text-white h-11" />
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-900">
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Subscribe & Pay {plan.price}
        </Button>
      </div>
    </form>
  );
}

// ─── Main Subscription Page ──────────────────────────────────────────────────
export default function Subscription() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [updating, setUpdating] = useState<string | null>(null);

  // Checkout Plan selection
  const [checkoutPlan, setCheckoutPlan] = useState<Tier | null>(null);
  const [downgradePlan, setDowngradePlan] = useState<Tier | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentPlan(user.subscription_tier || "free");
    }
  }, [user]);

  const handleUpgradeConfirmed = async () => {
    if (!checkoutPlan) return;
    const tierKey = checkoutPlan.key;
    setUpdating(tierKey);
    setCheckoutPlan(null);
    try {
      await base44.auth.updateMe({ subscription_tier: tierKey });
      updateUser({ subscription_tier: tierKey });
      setCurrentPlan(tierKey);
      toast({
        title: "Subscription Upgraded! 🎉",
        description: `You are now on the ${tierKey.toUpperCase()} plan. Thank you for subscribing!`,
      });
    } catch (err: any) {
      toast({
        title: "Subscription Failed",
        description: err.message || "Failed to save subscription plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDowngradeConfirmed = async () => {
    if (!downgradePlan) return;
    const tierKey = downgradePlan.key;
    setUpdating(tierKey);
    setDowngradePlan(null);
    try {
      await base44.auth.updateMe({ subscription_tier: tierKey });
      updateUser({ subscription_tier: tierKey });
      setCurrentPlan(tierKey);
      toast({
        title: "Subscription Downgraded",
        description: `Your subscription has been changed to ${tierKey.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({
        title: "Downgrade Failed",
        description: err.message || "Failed to downgrade plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleSelectPlan = (tier: Tier) => {
    const TIER_ORDER = ["free", "plus", "vip"];
    const currentIndex = TIER_ORDER.indexOf(currentPlan);
    const selectedIndex = TIER_ORDER.indexOf(tier.key);

    if (selectedIndex > currentIndex) {
      // Upgrading: requires payment card details
      setCheckoutPlan(tier);
    } else {
      // Downgrading: ask for confirmation
      setDowngradePlan(tier);
    }
  };

  // ─── Checkout Step ─────────────────────────────────────────────────────────
  if (checkoutPlan) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900/50 sticky top-16 z-10 backdrop-blur-md">
          <div className="max-w-md mx-auto px-6 py-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setCheckoutPlan(null)} className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-black">Subscription Checkout</h1>
              <p className="text-zinc-500 text-xs">Authorize payment for your premium access</p>
            </div>
          </div>
        </div>

        <div className="flex-grow max-w-md mx-auto w-full px-6 py-10 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{checkoutPlan.name} Subscription</h3>
                <p className="text-[11px] text-zinc-500">{checkoutPlan.tagline}</p>
              </div>
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-xs px-2.5 py-0.5">{checkoutPlan.price}</Badge>
            </div>
            <div className="border-t border-zinc-800 pt-3 flex justify-between text-xs font-semibold text-zinc-400">
              <span>Total Due Now</span>
              <span className="text-white font-bold">{checkoutPlan.price} / month</span>
            </div>
          </div>

          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripeBillingForm 
                plan={checkoutPlan}
                onPaymentSuccess={handleUpgradeConfirmed}
                onCancel={() => setCheckoutPlan(null)}
              />
            </Elements>
          ) : (
            <MockBillingForm 
              plan={checkoutPlan}
              onPaymentSuccess={handleUpgradeConfirmed}
              onCancel={() => setCheckoutPlan(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // ─── Downgrade Confirmation Step ───────────────────────────────────────────
  if (downgradePlan) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-5 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Downgrade subscription?</h2>
            <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">
              Are you sure you want to change your plan to **{downgradePlan.name}**? You will immediately lose all premium presets, Presale priorities, and skip-the-line privileges of your current {currentPlan.toUpperCase()} tier.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDowngradePlan(null)} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-850">
              Keep Current Plan
            </Button>
            <Button onClick={handleDowngradeConfirmed} className="flex-1 bg-red-650 hover:bg-red-700 text-white font-bold">
              Yes, Downgrade
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900/50 sticky top-16 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
              <Crown className="w-5.5 h-5.5 text-orange-400" /> Premium Subscription
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">Manage your tier and discover exclusive membership privileges.</p>
          </div>
          <Link to={createPageUrl("Profile")}>
            <Button variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-900 hover:text-white rounded-xl text-xs gap-1.5 self-start">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow max-w-4xl mx-auto w-full px-6 py-8 space-y-10">
        
        {/* Active subscription checkout and cancellation manager */}
        <SubscriptionManager 
          currentTier={currentPlan as any} 
          onUpdated={() => {
            // Refresh user details state
            base44.auth.me().then((u) => {
              if (u) {
                updateUser(u);
                setCurrentPlan(u.subscription_tier || "free");
              }
            });
          }}
        />

        {/* Feature Comparison Grid */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white pl-1">Tier Features & Privileges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const isCurrent = currentPlan === tier.key;
              const TIcon = tier.icon;
              return (
                <div
                  key={tier.key}
                  className={cn(
                    "relative bg-zinc-900/40 border rounded-2xl p-5 flex flex-col transition-all duration-305 hover:border-zinc-800",
                    isCurrent ? "border-orange-500/40 bg-zinc-900/60" : "border-zinc-900"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3", tier.color)}>
                    <TIcon className="w-4.5 h-4.5 text-white" />
                  </div>

                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {tier.name}
                    {isCurrent && <Badge className="bg-zinc-800 text-orange-400 border-zinc-700 text-[8px] font-bold">Active</Badge>}
                  </h3>
                  <p className="text-zinc-500 text-[10px] mt-0.5 mb-3">{tier.tagline}</p>

                  <ul className="space-y-3 flex-1 border-t border-zinc-800/40 pt-3">
                    {tier.features.map((f, i) => (
                      <li key={i} className="space-y-0.5">
                        <div className="flex items-start gap-2 text-[11px] font-semibold text-zinc-300">
                          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          <span>{f.text}</span>
                        </div>
                        <p className="text-[9px] text-zinc-500 pl-5.5 leading-relaxed">{f.details}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Secure billing note */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-zinc-200">Secure Billing & Terms</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Subscribing grants immediate access to premium features associated with the tier. Payments are processed securely. You may downgrade or cancel your subscription at any time without fees; remaining days of the current billing cycles continue to grant active access.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
