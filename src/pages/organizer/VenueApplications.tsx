import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
  Clock,
  History,
  FileText,
  XCircle,
  Camera,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const VENUE_TYPES = [
  { value: "club", label: "Club" },
  { value: "lounge", label: "Lounge" },
  { value: "bar", label: "Bar" },
  { value: "rooftop", label: "Rooftop" },
  { value: "house_party", label: "House Party" },
  { value: "pop_up", label: "Pop Up" },
  { value: "concert", label: "Concert" },
  { value: "other", label: "Other" },
];

const getVenueTypeIcon = (type: string, cnStr: string) => {
  switch (type) {
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

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" }
];

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
  images: string[];
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
  images: [],
};

export default function VenueApplications() {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [activeTab, setActiveTab] = useState<"apply" | "history">("apply");
  const [uploadingImages, setUploadingImages] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const urls: string[] = [...(form.images || [])];
      for (let i = 0; i < files.length; i++) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: files[i] });
        urls.push(file_url);
      }
      setForm((f) => ({ ...f, images: urls }));
    } catch (err) {
      setError("Failed to upload some images. Please try again.");
    }
    setUploadingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setForm((f) => ({
      ...f,
      images: (f.images || []).filter((_, i) => i !== index),
    }));
  };

  useEffect(() => {
    base44.auth.me().then((u: any) => {
      if (u?.full_name) setForm((f) => ({ ...f, applicant_name: u.full_name }));
      if (u?.email) setForm((f) => ({ ...f, applicant_email: u.email }));
    }).catch(() => { });
  }, []);

  const { data: myApplications = [], isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["myVenueApplications"],
    queryFn: () => base44.entities.VenueApplication.list().catch(() => []),
  });

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
      refetchHistory();
    } catch (err) {
      setError("Couldn't submit your application. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pb-20 bg-zinc-950 text-white font-sans">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900/50">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" size="sm" className="border-zinc-850 bg-zinc-900/30 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs gap-1.5 mb-4">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-400" /> List Your Venue
          </h1>
          <p className="text-zinc-500 text-xs mt-1">Apply to feature your club, lounge, or venue as a Verified Partner on VibeSocial.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex bg-zinc-900/40 border border-zinc-850 rounded-xl p-1 mb-6 w-full gap-1">
          <button
            onClick={() => { setActiveTab("apply"); setSubmitted(false); }}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === "apply" ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/30" : "text-zinc-500 hover:text-zinc-350"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Submit Application
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
              activeTab === "history" ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/30" : "text-zinc-500 hover:text-zinc-350"
            )}
          >
            <History className="w-3.5 h-3.5" /> Application History
            {myApplications.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-zinc-950 text-zinc-400 text-[10px] rounded-md font-black">
                {myApplications.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "apply" ? (
          submitted ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center my-6">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Application submitted!</h2>
              <p className="text-zinc-400 text-sm mb-5">
                We'll review your venue and get back to you at <span className="text-orange-400">{form.applicant_email}</span> within 3-5 business days.
              </p>
              <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Status: Pending Review</Badge>
              <div className="mt-6 pt-4 border-t border-zinc-900">
                <Button variant="outline" size="sm" onClick={() => { setForm(initialForm); setSubmitted(false); }} className="border-zinc-800 bg-zinc-900/30 text-zinc-450 hover:text-white">
                  Submit Another Venue
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Venue Info */}
              <section className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-5 space-y-4">
                <h2 className="text-white font-semibold flex items-center gap-2 border-b border-zinc-900 pb-2 text-sm uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-orange-400" /> Venue Information
                </h2>

                <Field label="Venue name *">
                  <input value={form.venue_name} onChange={(e) => update("venue_name", e.target.value)} required
                    placeholder="e.g. Neon Room"
                    className={inputCls} />
                </Field>

                <Field label="Venue type *">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VENUE_TYPES.map((v) => (
                      <button key={v.value} type="button" onClick={() => update("venue_type", v.value)}
                        className={cn(
                          "rounded-lg border px-2 py-2.5 text-xs font-medium transition flex items-center justify-center gap-1.5",
                          form.venue_type === v.value
                            ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                            : "bg-zinc-950/50 border-zinc-850 text-zinc-400 hover:border-zinc-750"
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
                      {US_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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
              <section className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-5 space-y-4">
                <h2 className="text-white font-semibold flex items-center gap-2 border-b border-zinc-900 pb-2 text-sm uppercase tracking-wider">
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
              <section className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-5 space-y-4">
                <h2 className="text-white font-semibold flex items-center gap-2 border-b border-zinc-900 pb-2 text-sm uppercase tracking-wider">
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

              {/* Venue Photos */}
              <section className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-5 space-y-4">
                <h2 className="text-white font-semibold flex items-center gap-2 border-b border-zinc-900 pb-2 text-sm uppercase tracking-wider">
                  <Camera className="w-4 h-4 text-orange-400" /> Venue Photos (optional)
                </h2>

                <Field label="Upload Images">
                  <div className="space-y-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      {form.images?.map((url, index) => (
                        <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                          <img src={url} alt={`Venue image ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-zinc-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImages}
                        className="w-20 h-20 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-zinc-400 transition"
                      >
                        {uploadingImages ? (
                          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                        ) : (
                          <span className="text-xl font-bold text-orange-400">+</span>
                        )}
                        <span className="text-[10px]">Add Photo</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500">Provide clear photos of the venue entrance, interior layout, or stage setup.</p>
                  </div>
                </Field>
              </section>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 rounded-xl">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            </form>
          )
        ) : (
          /* History Tab */
          loadingHistory ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : myApplications.length === 0 ? (
            <div className="bg-zinc-900/20 border border-zinc-855 border-dashed rounded-2xl p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
              <h3 className="text-sm font-bold text-zinc-400 mb-1">No applications listed</h3>
              <p className="text-zinc-600 text-xs max-w-xs mx-auto">You haven't listed any venues yet. Submit one using the "Submit Application" tab!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((app: any) => (
                <div key={app.id} className="bg-zinc-900/40 border border-zinc-850/80 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-start gap-3 pb-3 border-b border-zinc-900">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-bold text-sm">{app.venue_name}</h3>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-wider",
                          app.status === "approved" ? "border-green-500/30 bg-green-500/5 text-green-400" :
                          app.status === "rejected" ? "border-red-500/30 bg-red-500/5 text-red-400" :
                          "border-amber-500/30 bg-amber-500/5 text-amber-400"
                        )}>
                          {app.status || "pending"}
                        </Badge>
                      </div>
                      <p className="text-zinc-500 text-xs capitalize mt-1 flex items-center gap-1.5">
                        {getVenueTypeIcon(app.venue_type, "w-3 h-3 text-orange-400")}
                        <span>{app.venue_type}</span>
                        {app.capacity && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>Capacity: {app.capacity}</span>
                          </>
                        )}
                      </p>
                    </div>
                    
                    <span className="text-[10px] text-zinc-650 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-400">
                    <div>
                      <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold mb-0.5">Address</p>
                      <p>{app.address}, {app.city}, {app.state}</p>
                    </div>
                    <div>
                      <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold mb-0.5">Contact Submitted</p>
                      <p className="truncate">{app.applicant_name} ({app.applicant_role})</p>
                    </div>
                  </div>

                  {app.images && app.images.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-zinc-550 text-[9px] uppercase tracking-wider font-bold">Uploaded Photos</p>
                      <div className="flex flex-wrap gap-2">
                        {app.images.map((url: string, index: number) => (
                          <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-850 bg-zinc-950 hover:border-zinc-700 transition block">
                            <img src={url} alt={`Venue photo ${index + 1}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {app.status === "approved" && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>This venue is live! It is listed as a Verified Partner on the platform directory.</span>
                    </div>
                  )}

                  {app.status === "rejected" && (
                    <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-xs text-red-400 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span className="font-bold">This application was rejected.</span>
                      </div>
                      {app.rejection_reason && (
                        <div className="bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg text-red-300">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-red-400 mb-1">Reason for Rejection:</p>
                          <p className="leading-relaxed">{app.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-zinc-950/50 border border-zinc-850 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-orange-500/40 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-450 font-medium block mb-1.5">{label}</label>
      {children}
    </div>
  );
}