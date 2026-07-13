import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Eye, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white font-black text-sm">VS</span>
            VibeSocial
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex p-3 rounded-2xl bg-pink-500/10 text-pink-500 mb-4 animate-pulse">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            Privacy Policy
          </h1>
          <p className="text-zinc-400 text-lg">
            Last Updated: July 13, 2026. Learn how we handle your data with transparency and care.
          </p>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition duration-300">
            <div className="p-2 w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 mb-4 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-2">Secure Data</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We encrypt all personal information and location telemetry data to ensure it stays private.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition duration-300">
            <div className="p-2 w-10 h-10 rounded-lg bg-pink-500/10 text-pink-500 mb-4 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-2">No Tracking</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              We never sell your data or trace your background location. Your check-ins are under your control.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition duration-300">
            <div className="p-2 w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 mb-4 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-zinc-100 mb-2">Full Access</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Request, download, or permanently delete your account and entire activity history instantly.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="prose prose-invert prose-zinc max-w-none space-y-8 text-zinc-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">1. Information We Collect</h2>
            <p>
              To provide the best real-time vibe updates, wait-time reports, and ticket transactions, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Credentials:</strong> Email addresses, name, profile details.</li>
              <li><strong>Location Data:</strong> Temporary device location when search filters are active, or when reporting venue crowd/wait statuses.</li>
              <li><strong>Usage Analytics:</strong> Anonymous diagnostic logs and user interactions.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">2. How We Use Your Data</h2>
            <p>
              We process information in order to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Calibrate crowdsourced wait times and vibe indices.</li>
              <li>Process secure payments for ticket purchases via Stripe.</li>
              <li>Prevent fraudulent event creations or fake review submissions.</li>
              <li>Offer personalized venue recommendations based on your preferences.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">3. Data Sharing & Third Parties</h2>
            <p>
              We do not distribute your personal details. We partner with secure third parties for critical functionalities:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> Payment card processing (we do not store raw card numbers).</li>
              <li><strong>Supabase:</strong> Fully encrypted cloud hosting and user authentication.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">4. Your Control & Privacy Rights</h2>
            <p>
              You maintain absolute control. From your settings dashboard, you can:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Toggle off location sharing permissions.</li>
              <li>Configure alerts and push notification frequencies.</li>
              <li>Request full account termination, purging all check-ins, tickets, and reviews.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-100 border-b border-zinc-800 pb-2">5. Updates to This Policy</h2>
            <p>
              We may modify this policy periodically to reflect platform upgrades. Significant edits will be highlighted via in-app banner announcements.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-zinc-500 text-sm">
        <p>&copy; 2026 VibeSocial Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
