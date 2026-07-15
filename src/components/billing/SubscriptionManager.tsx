import React, { useState } from "react";
import { base44Live } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
  XCircle,
} from "lucide-react";

interface SubscriptionManagerProps {
  currentTier: "free" | "standard" | "plus" | "vip";
  onUpdated?: () => void;
}

export default function SubscriptionManager({ currentTier = "free", onUpdated }: SubscriptionManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Retrieve subscription Price IDs from environment variables
  const pricePlus = import.meta.env.VITE_STRIPE_PRICE_PLUS || import.meta.env.VITE_STRIPE_PRODUCT_PLUS || "";
  const priceVip = import.meta.env.VITE_STRIPE_PRICE_VIP || import.meta.env.VITE_STRIPE_PRODUCT_VIP || "";

  const handleSubscribe = async (priceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await base44Live.billing.createCheckout(priceId);
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to initiate subscription checkout.");
      setLoading(false);
    }
  };

  const handleManagePortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await base44Live.billing.createPortal();
      window.location.href = url; // Redirect to Stripe Customer Portal
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to open billing portal.");
      setLoading(false);
    }
  };

  const handleCancelDirectly = async () => {
    if (!confirm("Are you sure you want to cancel your VibeSocial subscription? You will lose premium benefits at the end of the current billing cycle.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await base44Live.billing.cancelSubscription();
      setSuccessMsg(res.message);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 max-w-xl mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-orange-400" /> Plan Membership
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Manage your billing and subscription tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 text-xs">Current Plan:</span>
          <Badge className={`capitalize py-1 px-3 ${currentTier === "vip"
              ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
              : currentTier === "plus"
                ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}>
            {currentTier === "standard" ? "free" : currentTier}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Subscription Cards & Plans */}
      {currentTier === "free" || currentTier === "standard" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plus Plan Option */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/40 flex flex-col justify-between space-y-4">
            <div>
              <Badge className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-[10px] mb-2">PLUS TIER</Badge>
              <h4 className="text-base font-semibold text-zinc-100">$9.99 / mo</h4>
              <ul className="text-[11px] text-zinc-500 space-y-1.5 mt-3 list-disc list-inside">
                <li>Double Vibe Points</li>
                <li>Exclusive chat stickers</li>
                <li>Fast ticket check-in</li>
              </ul>
            </div>
            <Button
              onClick={() => handleSubscribe(pricePlus)}
              disabled={loading || !pricePlus}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs w-full transition"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              Upgrade to Plus
            </Button>
          </div>

          {/* VIP Plan Option */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/40 flex flex-col justify-between space-y-4">
            <div>
              <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-[10px] mb-2">VIP TIER</Badge>
              <h4 className="text-base font-semibold text-zinc-100">$29.99 / mo</h4>
              <ul className="text-[11px] text-zinc-500 space-y-1.5 mt-3 list-disc list-inside">
                <li>Priority updates</li>
                <li>Unlimited private group chats</li>
                <li>Zero booking/service fees</li>
              </ul>
            </div>
            <Button
              onClick={() => handleSubscribe(priceVip)}
              disabled={loading || !priceVip}
              size="sm"
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs w-full transition"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Upgrade to VIP
            </Button>
          </div>
        </div>
      ) : (
        /* Active Subscription Management Panel */
        <div className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-5 space-y-4 text-center">
          <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto">
            You have active premium features enabled. You can upgrade, update your credit card details, or cancel your subscription at any time.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
            <Button
              onClick={handleManagePortal}
              disabled={loading}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl text-xs px-4 h-9 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
              Billing Customer Portal
            </Button>

            <Button
              onClick={handleCancelDirectly}
              disabled={loading}
              variant="ghost"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl text-xs px-4 h-9 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
              Cancel Subscription
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
