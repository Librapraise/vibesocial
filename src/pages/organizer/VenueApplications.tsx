import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Send,
  Loader2,
  CheckCircle2,
  User,
  Globe,
  Music,
  Martini,
  Beer,
  Sunset,
  Home,
  Zap,
  Mic,
  PartyPopper,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

type VenueTypeOption = { value: string; label: string };

const VENUE_TYPES: VenueTypeOption[] = [
  { value: "club", label: "Club" },
  { value: "lounge", label: "Lounge" },
  { value: "bar", label: "Bar" },
  { value: "rooftop", label: "Rooftop" },
  { value: "house_party", label: "House Party" },
  { value: "pop_up", label: "Pop-up" },
  { value: "concert", label: "Concert Venue" },
  { value: "other", label: "Other" },
];

const getVenueTypeIcon = (value: string, className?: string) => {
  const cnStr = className || "w-4 h-4";
  switch (value) {
    case "club":
      return <Music className={cnStr} />;
    case "lounge":
      return <Martini className={cnStr} />;
    case "bar":
      return <Beer className={cnStr} />;
    case "rooftop":
      return <Sunset className={cnStr} />;
    case "house_party":
      return <Home className={cnStr} />;
    case "pop_up":
      return <Zap className={cnStr} />;
    case "concert":
      return <Mic className={cnStr} />;
    default:
      return <PartyPopper className={cnStr} />;
  }
};

const ROLES = ["Owner", "Manager", "Promoter", "Booking Agent", "Other"];

const US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

type FormState = {
  venue_name: string;
  venue_type: string;
  address: string;
  city: string;
  state: string;
  capacity: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_role: string;
  description: string;
  website: string;
  social_media: string;
};

const initialForm: FormState = {
  venue_name: "",
  venue_type: "club",
  address: "",
  city: "",
  state: "CA",
  capacity: "",
  applicant_name: "",
  applicant_email: "",
  applicant_phone: "",
  applicant_role: "Owner",
  description: "",
  website: "",
  social_media: "",
};

export default function VenueApplications() {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    base44.auth.me().then((u: any) => {
      if (u?.full_name) setForm((f) => ({ ...f, applicant_name: u.full_name }));
      if (u?.email) setForm((f) => ({ ...f, applicant_email: u.email }));
    }).catch(() => { });
  }, []);

  const update = (key: keyof FormState, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.venue_name || !form.address || !form.applicant_name || !form.applicant_email) return;
    setSubmitting(true);
    setError("");
    try {
      await base44.entities.VenueApplication.create({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError("Couldn't submit your application. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-400" /> List Your Venue
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Apply to feature your club, lounge, or venue on the platform.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Application submitted!</h2>
            <p className="text-zinc-400 text-sm mb-5">
              We'll review your venue and get back to you at <span className="text-orange-400">{form.applicant_email}</span> within 3-5 business days.
            </p>
            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Status: Pending Review</Badge>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Venue Info */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-400" /> Venue Information
              </h2>

              <Field label="Venue name *">
                <input value={form.venue_name} onChange={(e) => update("venue_name", e.target.value)} required
                  placeholder="e.g. Neon Room"
                  className={inputCls} />
              </Field>

              <Field label="Venue type *">
                <div className="grid grid-cols-4 gap-2">
                  {VENUE_TYPES.map((v) => (
                    <button key={v.value} type="button" onClick={() => update("venue_type", v.value)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-xs font-medium transition flex items-center justify-center gap-1.5",
                        form.venue_type === v.value
                          ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                          : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}>
                      {getVenueTypeIcon(v.value, "w-3.5 h-3.5")}
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Street address *">
                <input value={form.address} onChange={(e) => update("address", e.target.value)} required
                  placeholder="123 Main St"
                  className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input value={form.city} onChange={(e) => update("city", e.target.value)}
                    placeholder="Los Angeles"
                    className={inputCls} />
                </Field>
                <Field label="State">
                  <select value={form.state} onChange={(e) => update("state", e.target.value)}
                    className={cn(inputCls, "appearance-none")}>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Capacity">
                <input type="number" value={form.capacity} onChange={(e) => update("capacity", e.target.value)}
                  placeholder="500" min="0"
                  className={inputCls} />
              </Field>

              <Field label="Description">
                <textarea value={form.description} onChange={(e) => update("description", e.target.value)}
                  rows={3} maxLength={500}
                  placeholder="Tell us about your venue — music style, vibe, what makes it special…"
                  className={cn(inputCls, "resize-none")} />
              </Field>
            </section>

            {/* Applicant Info */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-orange-400" /> Your Contact Information
              </h2>

              <Field label="Your name *">
                <input value={form.applicant_name} onChange={(e) => update("applicant_name", e.target.value)} required
                  placeholder="Jane Doe"
                  className={inputCls} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Email *">
                  <input type="email" value={form.applicant_email} onChange={(e) => update("applicant_email", e.target.value)} required
                    placeholder="jane@venue.com"
                    className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={form.applicant_phone} onChange={(e) => update("applicant_phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={inputCls} />
                </Field>
              </div>

              <Field label="Your role">
                <select value={form.applicant_role} onChange={(e) => update("applicant_role", e.target.value)}
                  className={cn(inputCls, "appearance-none")}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </section>

            {/* Online Presence */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4 text-orange-400" /> Online Presence (optional)
              </h2>

              <Field label="Website">
                <input value={form.website} onChange={(e) => update("website", e.target.value)}
                  placeholder="https://yourvenue.com"
                  className={inputCls} />
              </Field>

              <Field label="Instagram / Social handle">
                <input value={form.social_media} onChange={(e) => update("social_media", e.target.value)}
                  placeholder="@yourvenue"
                  className={inputCls} />
              </Field>
            </section>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-400 font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}