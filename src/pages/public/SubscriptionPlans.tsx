import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type Tier = {
  key: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  color: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  cta: string;
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "The essentials to find your vibe",
    color: "from-zinc-700 to-zinc-800",
    badgeColor: "bg-zinc-700 text-zinc-200 border-zinc-600",
    icon: Eye,
    features: [
      "Browse all events & venues",
      "Real-time vibe scores",
      "Event chat (guest access)",
      "Save up to 10 events",
      "Basic check-in verification",
    ],
    cta: "Current Plan",
  },
  {
    key: "plus",
    name: "Plus",
    price: "$4.99",
    period: "per month",
    tagline: "Ad-free with early access perks",
    color: "from-orange-500 to-pink-500",
    badgeColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: Zap,
    popular: true,
    features: [
      "Everything in Free",
      "Ad-free browsing",
      "Early event access (24h before public)",
      "Unlimited saved events",
      "Priority event chat access",
      "Detailed venue analytics",
      "Custom vibe alerts",
    ],
    cta: "Upgrade to Plus",
  },
  {
    key: "vip",
    name: "VIP",
    price: "$9.99",
    period: "per month",
    tagline: "Ultimate access for power users",
    color: "from-purple-500 to-indigo-600",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Crown,
    features: [
      "Everything in Plus",
      "Skip-the-line partner access",
      "Exclusive VIP-only events",
      "Verified organizer badge",
      "Advanced trend analytics",
      "Direct organizer messaging",
      "Early ticket presales (48h)",
      "Priority support",
    ],
    cta: "Go VIP",
  },
];

type PlanFeature = { Icon: React.ComponentType<{ className?: string }>; label: string };

export default function SubscriptionPlans() {
  const [user, setUser] = useState<{ id?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => {
    base44.auth
      .me()
      .then((u: any) => {
        setUser(u);
        setCurrentPlan(u.subscription_tier || "free");
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (tierKey: string) => {
    if (tierKey === currentPlan) return;
    try {
      await base44.auth.updateMe({ subscription_tier: tierKey });
      setCurrentPlan(tierKey);
    } catch (err) {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const planFeatures: PlanFeature[] = [
    { Icon: Music, label: "Real-time chat" },
    { Icon: Star, label: "Vibe scores" },
    { Icon: Eye, label: "Venue directory" },
    { Icon: Check, label: "Check-in badges" },
  ];
  const homeUrl = user ? createPageUrl("Home") : "/";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={homeUrl} className="flex items-center gap-2 font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white font-black text-sm">VS</span>
            VibeSocial
          </Link>
          <Link to={homeUrl}>
            <Button variant="ghost" className="text-zinc-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-400" /> Subscription Plans
          </h1>
          <p className="text-zinc-400 text-sm">
            {currentPlan !== "free" ? `You're currently on ${currentPlan.toUpperCase()}.` : "Unlock premium features and early event access."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.key;
            const TIcon = tier.icon;
            return (
              <div
                key={tier.key}
                className={cn(
                  "relative bg-zinc-900 border rounded-2xl p-6 flex flex-col",
                  tier.popular ? "border-orange-500/50 md:scale-105" : "border-zinc-800"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white border-orange-400 text-xs px-3">
                      <Star className="w-3 h-3 mr-1" /> Most Popular
                    </Badge>
                  </div>
                )}

                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4", tier.color)}>
                  <TIcon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                <p className="text-zinc-500 text-xs mt-0.5 mb-3">{tier.tagline}</p>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-bold text-white">{tier.price}</span>
                  <span className="text-zinc-500 text-xs">/{tier.period === "forever" ? "forever" : "mo"}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => {
                    if (user) {
                      window.location.href = createPageUrl("Subscription");
                    } else {
                      window.location.href = createPageUrl("Login");
                    }
                  }}
                  disabled={isCurrent && !!user}
                  className={cn(
                    "w-full",
                    isCurrent && user
                      ? "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      : tier.popular
                        ? "bg-orange-500 hover:bg-orange-600 text-white font-bold"
                        : "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                  )}
                >
                  {isCurrent && user ? (
                    <>
                      <Check className="w-4 h-4" /> Current Plan
                    </>
                  ) : user ? (
                    tier.cta
                  ) : (
                    "Sign In to Subscribe"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Feature comparison note */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-orange-400" />
            <h3 className="text-white font-semibold">All plans include</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {planFeatures.map((item, i) => {
              const IIcon = item.Icon;
              return (
                <div key={i} className="flex items-center gap-2 text-zinc-400 text-sm">
                  <IIcon className="w-4 h-4 text-orange-400" />
                  {item.label}
                </div>
              );
            })}
          </div>
          {!user && (
            <p className="text-zinc-500 text-xs mt-4 text-center">
              <Link to={createPageUrl("Home")} className="text-orange-400 hover:underline">Sign in</Link> to manage your subscription.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-zinc-500 text-sm mt-auto">
        <p>&copy; 2026 VibeSocial Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}