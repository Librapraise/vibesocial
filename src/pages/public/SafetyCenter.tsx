import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Shield, Phone, AlertTriangle, Users, Wine as Drink, Car, Heart, Eye, Bell, MapPin, Info, ExternalLink
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type SafetyTip = {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
};

const SAFETY_TIPS: SafetyTip[] = [
  {
    Icon: Drink,
    title: "Watch your drink",
    desc: "Never leave your drink unattended. If something looks off, don't drink it.",
    color: "text-orange-400 bg-orange-500/10",
  },
  {
    Icon: Users,
    title: "Buddy system",
    desc: "Go with friends and check in with each other throughout the night.",
    color: "text-blue-400 bg-blue-500/10",
  },
  {
    Icon: Car,
    title: "Plan your ride home",
    desc: "Arrange a designated driver, rideshare, or transit before you go out.",
    color: "text-green-400 bg-green-500/10",
  },
  {
    Icon: Eye,
    title: "Stay aware",
    desc: "Keep an eye on your surroundings and trust your instincts. If it feels off, leave.",
    color: "text-purple-400 bg-purple-500/10",
  },
  {
    Icon: Bell,
    title: "Share your location",
    desc: "Share your live location with a trusted contact when heading out.",
    color: "text-pink-400 bg-pink-500/10",
  },
  {
    Icon: Heart,
    title: "Know your limits",
    desc: "Pace yourself, stay hydrated, and don't feel pressured to keep up.",
    color: "text-red-400 bg-red-500/10",
  },
];

type EmergencyContact = { label: string; number: string; desc: string; urgent: boolean };

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { label: "Emergency", number: "911", desc: "Police, fire, or medical emergency", urgent: true },
  { label: "Poison Control", number: "1-800-222-1222", desc: "Substance-related concerns", urgent: false },
  { label: "SAMHSA Helpline", number: "1-800-662-4357", desc: "Mental health & substance use support 24/7", urgent: false },
  { label: "National DV Hotline", number: "1-800-799-7233", desc: "Domestic violence support", urgent: false },
  { label: "Crisis Text Line", number: "Text HOME to 741741", desc: "Free 24/7 crisis support via text", urgent: false },
];

type Resource = { title: string; desc: string };

const RESOURCES: Resource[] = [
  { title: "Rideshare Apps", desc: "Uber, Lyft, or local taxi services for safe rides home" },
  { title: "Venue Security", desc: "Find security staff or the nearest staff member if you feel unsafe" },
  { title: "Designated Driver Programs", desc: "Many venues offer free or discounted non-alcoholic drinks for DDs" },
  { title: "Campus Safety", desc: "Student nightlife safety programs and late-night escort services" },
];

export default function SafetyCenter() {
  const [showContacts, setShowContacts] = useState<boolean>(false);

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

      {/* Main Content */}
      <div className="flex-grow max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-zinc-400 flex items-center justify-center gap-2">
            <Shield className="w-6 h-6 text-orange-400" /> Safety Center
          </h1>
          <p className="text-zinc-400 text-sm">
            Stay safe out there — tips, emergency contacts, and resources for nightlife.
          </p>
        </div>

        <div className="space-y-8">
        {/* Emergency banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">In an emergency, call 911</h2>
            <p className="text-zinc-400 text-sm mt-1">If you or someone else is in immediate danger, don't hesitate — call right away.</p>
          </div>
          <a href="tel:911">
            <Button className="bg-red-500 hover:bg-red-600 text-white">
              <Phone className="w-4 h-4" /> Call 911
            </Button>
          </a>
        </div>

        {/* Safety Tips */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Nightlife Safety Tips</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SAFETY_TIPS.map((tip, i) => {
              const TIcon = tip.Icon;
              return (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", tip.color)}>
                    <TIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-semibold text-sm">{tip.title}</h3>
                  <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{tip.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Emergency & Support Contacts</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContacts((p) => !p)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
            >
              {showContacts ? "Hide" : "Show all"}
            </Button>
          </div>
          <div className="space-y-2">
            {EMERGENCY_CONTACTS.filter((c) => showContacts || c.urgent).map((contact) => (
              <a
                key={contact.label}
                href={contact.number.includes("Text") ? `sms:${contact.number.split(" ").pop()}` : `tel:${contact.number.replace(/[^0-9]/g, "")}`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl border p-4 transition",
                  contact.urgent
                    ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    contact.urgent ? "bg-red-500/20" : "bg-zinc-800"
                  )}>
                    <Phone className={cn("w-4 h-4", contact.urgent ? "text-red-400" : "text-zinc-400")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{contact.label}</p>
                    <p className="text-zinc-500 text-xs truncate">{contact.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-sm font-mono font-bold", contact.urgent ? "text-red-400" : "text-orange-400")}>
                    {contact.number}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-bold text-white">Helpful Resources</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RESOURCES.map((r, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <h3 className="text-white font-semibold text-sm">{r.title}</h3>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
          <p className="text-zinc-500 text-xs leading-relaxed">
            This safety information is provided for general awareness. Always use your best judgment and contact local authorities
            for situation-specific guidance. Your safety comes first.
          </p>
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8 text-center text-zinc-500 text-sm mt-auto">
      <p>&copy; 2026 VibeSocial Inc. All rights reserved.</p>
    </footer>
  </div>
);
}