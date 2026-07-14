import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Flame,
  VolumeX,
  Bell,
  BarChart3,
  MessagesSquare
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
  features: { text: string; details: string }[];
  cta: string;
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free Essentials",
    price: "$0",
    period: "forever",
    tagline: "Start exploring venues and current live vibes",
    color: "from-zinc-700 to-zinc-800",
    badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700",
    icon: Eye,
    features: [
      { text: "Browse all events & venues", details: "Access our curated directory of live local hotspots." },
      { text: "Real-time vibe scores", details: "See current score averages submitted by active partygoers." },
      { text: "Event chat (guest access)", details: "Read chat logs to see what people are saying in real time." },
      { text: "Save up to 10 events", details: "Track upcoming events in your personal short-list." },
    ],
    cta: "Current Plan",
  },
  {
    key: "plus",
    name: "Vibe Plus",
    price: "$4.99",
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

export default function Subscription() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setCurrentPlan(user.subscription_tier || "free");
    }
  }, [user]);

  const handleUpgrade = async (tierKey: string) => {
    if (tierKey === currentPlan) return;
    setUpdating(tierKey);
    try {
      await base44.auth.updateMe({ subscription_tier: tierKey });
      updateUser({ subscription_tier: tierKey });
      setCurrentPlan(tierKey);
      toast({
        title: "Subscription Updated! 🎉",
        description: `You have successfully changed your plan to ${tierKey.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({
        title: "Upgrade Failed",
        description: err.message || "Failed to update subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

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
        
        {/* Active plan status bar */}
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Your Account Status</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Active Plan: {currentPlan.toUpperCase()}</h3>
              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] font-bold">In-App billing</Badge>
            </div>
            <p className="text-xs text-zinc-400">Upgrade or downgrade anytime. Changes apply immediately.</p>
          </div>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 p-3 rounded-xl">
            <Crown className="w-5 h-5 text-orange-400" />
            <div className="text-[11px]">
              <p className="font-bold text-zinc-200">VIP Support Line</p>
              <p className="text-zinc-500">Fast-track assistance always active.</p>
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = currentPlan === tier.key;
            const TIcon = tier.icon;
            const isUpdating = updating === tier.key;
            return (
              <div
                key={tier.key}
                className={cn(
                  "relative bg-zinc-900/60 border rounded-2xl p-6 flex flex-col transition-all duration-300 hover:border-zinc-700",
                  tier.popular ? "border-orange-500/40 md:scale-[1.03] shadow-lg shadow-orange-500/5" : "border-zinc-900",
                  isCurrent && "border-orange-500/60 shadow-md bg-zinc-900"
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-none text-[9px] font-black uppercase tracking-wider px-3">
                      <Star className="w-2.5 h-2.5 mr-1" /> Recommended
                    </Badge>
                  </div>
                )}

                <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4", tier.color)}>
                  <TIcon className="w-5 h-5 text-white" />
                </div>

                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  {tier.name}
                  {isCurrent && <Badge className="bg-zinc-800 text-orange-400 border-zinc-700 text-[9px] font-bold">Active</Badge>}
                </h3>
                <p className="text-zinc-500 text-[11px] mt-0.5 mb-3">{tier.tagline}</p>

                <div className="flex items-baseline gap-1 mb-5 border-b border-zinc-800/50 pb-4">
                  <span className="text-3xl font-black text-white">{tier.price}</span>
                  <span className="text-zinc-500 text-xs">/{tier.period === "forever" ? "forever" : "mo"}</span>
                </div>

                <ul className="space-y-4 mb-6 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="space-y-0.5">
                      <div className="flex items-start gap-2 text-xs font-semibold text-zinc-200">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>{f.text}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 pl-6 leading-relaxed">{f.details}</p>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(tier.key)}
                  disabled={isCurrent || isUpdating}
                  className={cn(
                    "w-full h-10 rounded-xl text-xs font-bold transition-all",
                    isCurrent
                      ? "bg-zinc-800 text-zinc-500 border border-zinc-750 cursor-default"
                      : tier.popular
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-black"
                        : "bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700"
                  )}
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    tier.cta
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* In-app secure billing note */}
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
