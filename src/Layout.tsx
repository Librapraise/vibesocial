import * as React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  Flame,
  Home,
  User,
  Ticket,
  Settings,
  Calendar,
  Layers,
  LogOut,
  MapPin,
  TrendingUp,
  HelpCircle,
  ShieldCheck,
  Building,
  Menu,
  ChevronRight,
  TrendingDown
} from "lucide-react";

export default function Layout({ children, currentPageName }: { children: React.ReactNode; currentPageName?: string }) {
  const { user, logout } = useAuth();
  
  // Navigation groupings
  const discoverLinks = [
    { name: "Home", icon: Home },
    { name: "VenueDirectory", label: "Venues", icon: Building },
    { name: "PopularTrends", label: "Trends", icon: TrendingUp },
    { name: "UpcomingEvents", label: "Upcoming", icon: Calendar },
    { name: "Leaderboard", label: "Rankings", icon: Flame },
  ];

  const userLinks = [
    { name: "Profile", icon: User },
    { name: "MyTickets", label: "My Tickets", icon: Ticket },
    { name: "MyCalendar", label: "My Calendar", icon: Calendar },
    { name: "MyReviews", label: "My Reviews", icon: Layers },
    { name: "NotificationSettings", label: "Alerts", icon: Settings },
  ];

  const organizerLinks = [
    { name: "OrganizerPortal", label: "Dashboard", icon: ShieldCheck },
    { name: "MyHostedEvents", label: "Hosted Events", icon: Calendar },
    { name: "VenueApplications", label: "Applications", icon: Building },
  ];

  const publicLinks = [
    { name: "HelpCenter", label: "Help Center", icon: HelpCircle },
    { name: "CommunityGuidelines", label: "Guidelines", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex text-zinc-100">
      <style>{`
        :root {
          --background: 240 10% 3.9%;
          --foreground: 0 0% 98%;
          --card: 240 10% 5.9%;
          --card-foreground: 0 0% 98%;
          --popover: 240 10% 3.9%;
          --popover-foreground: 0 0% 98%;
          --primary: 24.6 95% 53.1%;
          --primary-foreground: 0 0% 100%;
          --secondary: 240 3.7% 15.9%;
          --secondary-foreground: 0 0% 98%;
          --muted: 240 3.7% 15.9%;
          --muted-foreground: 240 5% 64.9%;
          --accent: 240 3.7% 15.9%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 98%;
          --border: 240 3.7% 15.9%;
          --input: 240 3.7% 15.9%;
          --ring: 24.6 95% 53.1%;
          --radius: 0.75rem;
        }
        body {
          background: #09090b;
          color: #fafafa;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #27272a transparent;
        }
      `}</style>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 h-screen select-none z-30 shrink-0">
        {/* Brand Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-zinc-900/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">
            VS
          </div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            VibeSocial
          </span>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {/* Discover Category */}
          <div>
            <span className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Discover
            </span>
            <ul className="space-y-1">
              {discoverLinks.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <li key={item.name}>
                    <Link
                      to={createPageUrl(item.name)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/15 to-pink-500/5 text-orange-400 border border-orange-500/10 shadow-sm"
                          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <item.icon 
                        className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                          isActive 
                            ? "text-orange-400 fill-orange-500/20" 
                            : "text-zinc-500 group-hover:text-zinc-300"
                        }`}
                        strokeWidth={2.2}
                      />
                      {item.label || item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Personal Category */}
          <div>
            <span className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
              Personal
            </span>
            <ul className="space-y-1">
              {userLinks.map((item) => {
                const isActive = currentPageName === item.name;
                return (
                  <li key={item.name}>
                    <Link
                      to={createPageUrl(item.name)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-orange-500/15 to-pink-500/5 text-orange-400 border border-orange-500/10 shadow-sm"
                          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <item.icon 
                        className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                          isActive 
                            ? "text-orange-400 fill-orange-500/20" 
                            : "text-zinc-500 group-hover:text-zinc-300"
                        }`}
                        strokeWidth={2.2}
                      />
                      {item.label || item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Organizer Category */}
          {user && (
            <div>
              <span className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                Organizer
              </span>
              <ul className="space-y-1">
                {organizerLinks.map((item) => {
                  const isActive = currentPageName === item.name;
                  return (
                    <li key={item.name}>
                      <Link
                        to={createPageUrl(item.name)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500/15 to-pink-500/5 text-orange-400 border border-orange-500/10 shadow-sm"
                            : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border border-transparent"
                        }`}
                      >
                        <item.icon 
                          className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                            isActive 
                              ? "text-orange-400 fill-orange-500/20" 
                              : "text-zinc-500 group-hover:text-zinc-300"
                          }`}
                          strokeWidth={2.2}
                        />
                        {item.label || item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Profile / Logout section */}
        {user && (
          <div className="p-4 border-t border-zinc-900/50 flex items-center justify-between gap-2 bg-zinc-950/20">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-orange-400">
                {user.name?.[0] || "U"}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-zinc-200 truncate">{user.name}</span>
                <span className="text-[10px] text-zinc-500 truncate">{user.email}</span>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Top Navbar */}
      <div className="flex flex-col flex-1 min-w-0 pb-16 md:pb-0">
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-zinc-400">
              {currentPageName ? currentPageName.replace(/([A-Z])/g, ' $1').trim() : "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Profile display */}
            {user && (
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-orange-400 text-xs">
                  {user.name?.[0] || "U"}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 border-t border-zinc-900 backdrop-blur-lg flex items-center justify-around px-2 z-40">
        {discoverLinks.slice(0, 3).map((item) => {
          const isActive = currentPageName === item.name;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.name)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                isActive ? "text-orange-400" : "text-zinc-500"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium mt-1 truncate max-w-full">
                {item.label || item.name}
              </span>
            </Link>
          );
        })}
        
        <Link
          to={createPageUrl("MyTickets")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
            currentPageName === "MyTickets" ? "text-orange-400" : "text-zinc-500"
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[9px] font-medium mt-1">Tickets</span>
        </Link>

        <Link
          to={createPageUrl("Profile")}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
            currentPageName === "Profile" ? "text-orange-400" : "text-zinc-500"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-medium mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}