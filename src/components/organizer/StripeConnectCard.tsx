import React, { useState, useEffect } from "react";
import { base44Live } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Zap,
  DollarSign,
} from "lucide-react";

type ConnectStatus = "not_connected" | "pending" | "active" | "loading";

interface StatusResponse {
  status: "not_connected" | "pending" | "active";
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
}

export default function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus>("loading");
  const [details, setDetails] = useState<StatusResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On mount, refresh Connect status from the backend
  useEffect(() => {
    base44Live.stripeConnect
      .getStatus()
      .then((data) => {
        setDetails(data);
        setStatus(data.status);
      })
      .catch(() => {
        // If the call fails it could mean the user has no Connect account yet
        setStatus("not_connected");
      });
  }, []);

  const handleConnect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const { url } = await base44Live.stripeConnect.onboard(
        `${origin}/organizer?stripe_return=1`,
        `${origin}/organizer?stripe_refresh=1`
      );
      // Redirect to Stripe's hosted onboarding form
      window.location.href = url;
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to start Stripe onboarding. Please try again.");
      setActionLoading(false);
    }
  };

  const handleDashboard = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { url } = await base44Live.stripeConnect.getDashboardLink();
      window.open(url, "_blank", "noopener noreferrer");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not open Stripe Dashboard. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-100">Stripe Payouts</span>
        </div>
        {status === "active" && (
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        )}
        {status === "pending" && (
          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )}
        {status === "not_connected" && (
          <Badge className="bg-zinc-700/50 text-zinc-400 border-zinc-700 text-xs">
            Not Connected
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {status === "loading" && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Checking account status…</span>
          </div>
        )}

        {status === "not_connected" && (
          <>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Connect your Stripe account to receive automatic payouts when
              attendees purchase your event tickets. VibeSocial keeps a{" "}
              <span className="text-orange-400 font-semibold">10% platform fee</span>{" "}
              — the rest goes directly to your bank.
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                Instant split on every ticket sale
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                Stripe handles bank verification &amp; tax docs
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                View your payouts in the Stripe Dashboard
              </li>
            </ul>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm h-9 rounded-xl transition-all"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Connect with Stripe
            </Button>
          </>
        )}

        {status === "pending" && (
          <>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your Stripe account setup is <strong className="text-amber-400">incomplete</strong>.
              Click below to finish filling in your banking and identity details on Stripe.
            </p>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button
              onClick={handleConnect}
              disabled={actionLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm h-9 rounded-xl transition-all"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Complete Stripe Setup
            </Button>
          </>
        )}

        {status === "active" && (
          <>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Your Stripe account is active. Ticket sales for your events are
              automatically split — <span className="text-emerald-400 font-semibold">90%</span> to
              you and <span className="text-orange-400 font-semibold">10%</span> to VibeSocial.
            </p>
            {details && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <p className="text-zinc-500">Charges</p>
                  <p className={details.charges_enabled ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {details.charges_enabled ? "Enabled" : "Pending"}
                  </p>
                </div>
                <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
                  <p className="text-zinc-500">Payouts</p>
                  <p className={details.payouts_enabled ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {details.payouts_enabled ? "Enabled" : "Pending"}
                  </p>
                </div>
              </div>
            )}
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button
              onClick={handleDashboard}
              disabled={actionLoading}
              variant="outline"
              className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm h-9 rounded-xl transition-all"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              View Stripe Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
