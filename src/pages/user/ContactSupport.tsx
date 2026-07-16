import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { HelpCircle, Send, Loader2, CheckCircle2, MessageSquare, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function ContactSupport() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const createTicketMutation = useMutation({
    mutationFn: (data: { category: string; subject: string; message: string }) =>
      (base44 as any).support.createTicket(data),
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "🎫 Complaint Logged", description: "Support has received your request. We'll update you via email." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.error || err?.message || "Failed to submit request.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTicketMutation.mutate({
      category: formData.get("category") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link to={createPageUrl("Home")} className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Info / FAQ Section (5 cols on md+) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl" />
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400">
              <HelpCircle className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white">Contact Support</h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Have a complaint, feedback, or ticketing issue? Drop us a message and our support team will get back to you within 24 hours.
            </p>
          </div>

          {/* Quick FAQ Cards */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-zinc-350 uppercase tracking-wider">Quick Help & FAQs</h3>
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-850 transition">
                <h4 className="text-xs font-semibold text-white mb-1">🎫 Double Charges at Checkout</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Select "Ticketing & Checkout Issues" and provide your checkout email and event name.
                </p>
              </div>
              <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-850 transition">
                <h4 className="text-xs font-semibold text-white mb-1">🏢 Event/Venue Complaints</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Select "Event / Venue Complaint" and write the name of the host or organization.
                </p>
              </div>
              <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-850 transition">
                <h4 className="text-xs font-semibold text-white mb-1">⚙️ Organizer Portal Setup</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Select "Organizer Connect Details" if you have inquiries regarding Stripe Express payouts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section (7 cols on md+) */}
        <div className="md:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:opacity-60 transition" />

            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <div>
                  <h3 className="text-base font-bold text-zinc-200">Ticket Submitted Successfully!</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[340px] mx-auto">
                    An administrator has been notified. We will update you at your registered email address.
                  </p>
                </div>
                <Button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl px-6"
                >
                  Submit another request
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Complaint Category</label>
                  <select
                    name="category"
                    required
                    className="w-full bg-zinc-950/60 border border-zinc-800 text-white rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-orange-500/30 transition cursor-pointer"
                  >
                    <option value="Ticketing">Ticketing & Checkout Issues</option>
                    <option value="Event Experience">Event / Venue Complaint</option>
                    <option value="Organizer Portal">Organizer Connect Details</option>
                    <option value="Technical Support">Technical Bugs & Crashes</option>
                    <option value="General feedback">General Feedback or Inquiries</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Subject Summary</label>
                  <Input
                    name="subject"
                    type="text"
                    placeholder="e.g. Double charged at checkout"
                    required
                    maxLength={100}
                    className="bg-zinc-950/60 border-zinc-800 text-white rounded-xl text-xs h-11 placeholder:text-zinc-600 focus-visible:ring-orange-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Describe your complaint</label>
                  <textarea
                    name="message"
                    placeholder="Provide all details, including order confirmation code if applicable..."
                    required
                    rows={6}
                    minLength={10}
                    maxLength={1000}
                    className="w-full bg-zinc-950/60 border border-zinc-800 text-white rounded-xl p-3.5 text-xs resize-none outline-none focus:ring-1 focus:ring-orange-500/30 placeholder:text-zinc-650 transition"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-orange-950/30"
                >
                  {createTicketMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {createTicketMutation.isPending ? "Submitting..." : "Send Request"}
                </Button>
              </form>
            )}
          </motion.div>

          <div className="text-center text-[10px] text-zinc-600 flex items-center justify-center gap-1.5 mt-4">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Average response time: &lt; 24 hours</span>
          </div>
        </div>
      </div>
    </div>
  );
}
