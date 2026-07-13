import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Shield, ChevronRight } from "lucide-react";
import { createPageUrl } from "@/utils";

type Section = { title: string; body: string[] };

const SECTIONS: Section[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing and using VibesSocial (\"the Service\"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this Service.",
      "These terms apply to all visitors, users, and others who access or use the Service.",
    ],
  },
  {
    title: "2. Description of Service",
    body: [
      "VibesSocial is a real-time event discovery platform that allows users to find nightlife events, share vibe reports, check in at venues, and connect with other attendees.",
      "The Service is provided for informational and social purposes only. We do not guarantee the accuracy of crowd levels, vibe scores, or other user-reported data.",
    ],
  },
  {
    title: "3. User Accounts",
    body: [
      "To access certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.",
      "You must be at least 18 years old (or the legal age of majority in your jurisdiction) to use this Service, given the nightlife-oriented nature of the content.",
      "You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.",
    ],
  },
  {
    title: "4. User Conduct",
    body: [
      "You agree not to use the Service to:",
      "• Post, upload, or share content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable.",
      "• Impersonate another person or misrepresent your affiliation with a person or entity.",
      "• Submit false or misleading vibe reports, check-ins, or reviews.",
      "• Use the Service for any illegal or unauthorized purpose.",
      "• Attempt to disrupt, overload, or reverse-engineer the Service or its underlying systems.",
      "• Share content that promotes excessive alcohol consumption, drug use, or other harmful behavior.",
    ],
  },
  {
    title: "5. Check-ins and Vibe Reports",
    body: [
      "User-submitted check-ins and vibe reports are voluntary and represent the opinions of the submitting user, not VibesSocial.",
      "Check-in verification (via geolocation or QR code) is a convenience feature and does not constitute a guarantee of physical presence.",
      "You are solely responsible for the content you submit. We reserve the right to remove any content that violates these terms.",
    ],
  },
  {
    title: "6. Event and Venue Information",
    body: [
      "Event details, venue information, and crowd data are provided by users and third parties. VibesSocial does not independently verify all information and is not responsible for inaccuracies.",
      "Venue listings and event details may change without notice. Always confirm details directly with the venue before attending.",
    ],
  },
  {
    title: "7. Privacy",
    body: [
      "Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as described in the Privacy Policy.",
      "You can manage your privacy settings, including the visibility of your check-in history and activity, at any time from your account settings.",
    ],
  },
  {
    title: "8. Intellectual Property",
    body: [
      "The Service and its original content, features, and functionality are owned by VibesSocial and are protected by international copyright, trademark, and other intellectual property laws.",
      "User-submitted content remains the property of the user, but by submitting it you grant VibesSocial a non-exclusive, royalty-free license to display and use that content within the Service.",
    ],
  },
  {
    title: "9. Tickets and Purchases",
    body: [
      "When purchasing tickets through the Service, you enter into a transaction with the event organizer, not VibesSocial. VibesSocial acts solely as a platform facilitator.",
      "Refund policies are determined by individual event organizers. Please review the refund policy before completing any purchase.",
    ],
  },
  {
    title: "10. Disclaimers and Limitation of Liability",
    body: [
      "The Service is provided \"as is\" and \"as available\" without warranties of any kind, either express or implied.",
      "VibesSocial shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.",
      "We do not warrant that the Service will be uninterrupted, secure, or error-free at all times.",
    ],
  },
  {
    title: "11. Safety",
    body: [
      "Your safety is important to us. We provide safety resources in our Safety Center, but you are ultimately responsible for your personal safety while attending events.",
      "If you encounter a situation that feels unsafe, contact local authorities or venue security immediately.",
    ],
  },
  {
    title: "12. Termination",
    body: [
      "We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including if you breach these Terms.",
      "You may stop using the Service at any time. Upon termination, your right to use the Service will cease immediately.",
    ],
  },
  {
    title: "13. Changes to Terms",
    body: [
      "We reserve the right to modify these Terms at any time. We will notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the updated Terms.",
    ],
  },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen pb-20">
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white mb-3 -ml-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-400" /> Terms of Service
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Last updated: July 2026</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Quick nav */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium mb-3">Contents</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {SECTIONS.map((s, i) => (
              <a key={i} href={`#section-${i + 1}`}
                className="flex items-center justify-between text-sm text-zinc-400 hover:text-orange-400 transition py-1">
                <span className="truncate">{s.title}</span>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-zinc-700" />
              </a>
            ))}
          </div>
        </div>

        {/* Intro */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-zinc-300 text-sm leading-relaxed">
              Welcome to VibesSocial. These Terms of Service govern your use of our platform. Please read them carefully —
              by using the Service, you agree to be bound by these terms.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((section, i) => (
            <section key={i} id={`section-${i + 1}`} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 scroll-mt-4">
              <h2 className="text-white font-bold text-base mb-3">{section.title}</h2>
              <div className="space-y-2">
                {section.body.map((para, j) => (
                  <p key={j} className="text-zinc-400 text-sm leading-relaxed">{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-xs">
            Questions about these terms? Visit our{" "}
            <Link to={createPageUrl("HelpCenter")} className="text-orange-400 hover:underline">Help Center</Link>{" "}
            or{" "}
            <Link to={createPageUrl("Feedback")} className="text-orange-400 hover:underline">contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}