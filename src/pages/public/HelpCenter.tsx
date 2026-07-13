import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ShieldCheck,
  QrCode,
  MapPin,
  MessageCircle,
  Search,
  Calendar,
  Ticket,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createPageUrl } from "@/utils";

type FaqEntry = { q: string; a: string };
type FaqSection = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: FaqEntry[];
};

const SECTIONS: FaqSection[] = [
  {
    id: "checkins",
    icon: ShieldCheck,
    title: "Verifying check-ins",
    items: [
      {
        q: "How do I check in at an event?",
        a: "Open the event page and tap the Check In tab. You can verify you're there via your phone's location (within ~500m of the venue) or by entering the QR code the organizer shows you.",
      },
      {
        q: "What does the 'Verified Attending' badge mean?",
        a: "It's earned when your check-in is successfully verified. The badge appears on the event page and on your profile, marking you as a confirmed attendee.",
      },
      {
        q: "Why did my location check-in fail?",
        a: "Make sure location services are enabled and you're within 500m of the venue address. If you can't get a GPS lock, ask the organizer for the QR code instead.",
      },
      {
        q: "Can I check in with QR if GPS isn't working?",
        a: "Yes. Tap 'Check In via QR Code', then either show the displayed QR to the organizer or type the code they share with you.",
      },
    ],
  },
  {
    id: "chat",
    icon: MessageCircle,
    title: "Using the chat",
    items: [
      {
        q: "Who can chat in an event?",
        a: "Anyone — logged-in users chat under their profile name, and guests can pick a display name the first time they send a message. Your name is saved locally for next time.",
      },
      {
        q: "Are messages private?",
        a: "No. Event chats are public to everyone viewing that event. Be respectful and follow the community guidelines.",
      },
      {
        q: "How fast do messages appear?",
        a: "Messages show up in real time for everyone in the chat. If your connection drops, the panel refreshes every few seconds.",
      },
    ],
  },
  {
    id: "navigate",
    icon: Search,
    title: "Navigating the app",
    items: [
      {
        q: "How do I find events near me?",
        a: "From the home page, use the search bar and filter chips to narrow by venue type or state. Toggle the map view to see events plotted geographically.",
      },
      {
        q: "How do I save an event for later?",
        a: "Tap the bookmark on any event card or detail page. Saved events appear in your Calendar with export options for iCal and Google Calendar.",
      },
      {
        q: "Where are my tickets?",
        a: "Purchased tickets live in the My Orders page. Each order has a confirmation code you can show at the door.",
      },
      {
        q: "How do I see my history?",
        a: "Visit your Profile to see verified check-in badges and a list of every event you've attended.",
      },
    ],
  },
];

function FaqItem({ item }: { item: FaqEntry }) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <div className="border-b border-zinc-800 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 py-4 text-left"
      >
        <span className="text-zinc-100 text-sm font-medium">{item.q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {open && <p className="pb-4 text-zinc-400 text-sm leading-relaxed">{item.a}</p>}
    </div>
  );
}

export default function HelpCenter() {
  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white">Help Center</h1>
          <p className="text-zinc-500 text-sm mt-1">Tips on check-ins, chat, and getting around.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { icon: ShieldCheck, label: "Check In", target: "Home" },
            { icon: MessageCircle, label: "Chat", target: "Home" },
            { icon: Calendar, label: "Calendar", target: "MyCalendar" },
            { icon: Ticket, label: "My Tickets", target: "MyOrders" },
          ] as { icon: React.ComponentType<{ className?: string }>; label: string; target: string }[]).map((q) => {
            const QIcon = q.icon;
            return (
              <Link key={q.label} to={createPageUrl(q.target)}>
                <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition hover:-translate-y-0.5">
                  <QIcon className="w-5 h-5 text-orange-400" />
                  <span className="text-xs text-zinc-300 font-medium">{q.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* FAQ sections */}
        {SECTIONS.map((sec) => {
          const SectionIcon = sec.icon;
          return (
            <section key={sec.id}>
              <div className="flex items-center gap-2 mb-3">
                <SectionIcon className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">{sec.title}</h2>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5">
                {sec.items.map((item) => (
                  <FaqItem key={item.q} item={item} />
                ))}
              </div>
            </section>
          );
        })}

        {/* CTA */}
        <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-2xl p-5 text-center">
          <p className="text-zinc-300 text-sm mb-3">Still need help or have a suggestion?</p>
          <Link to={createPageUrl("Feedback")}>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Send Feedback</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}