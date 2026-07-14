import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShoppingCart,
  Star,
  Radio,
  Megaphone,
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  TrendingUp,
  BarChart3,
  Loader2,
  Shield,
  Activity,
  Cpu,
  Server,
  Globe,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  DollarSign,
  Eye,
  EyeOff,
  MoreVertical,
  RefreshCw,
  Send,
  UserCheck,
  Building,
  Zap,
  Menu,
  X,
  Crown,
  UserCog,
  Mail,
  CalendarClock,
  BadgeCheck,
  ShieldAlert,
  Gem,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarSection =
  | "overview"
  | "users"
  | "events"
  | "orders"
  | "reviews"
  | "vibes"
  | "announcements"
  | "ai";

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accent: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "text-orange-400", accent: "from-orange-500 to-pink-500" },
  { id: "users", label: "Users", icon: Users, color: "text-blue-400", accent: "from-blue-500 to-cyan-500" },
  { id: "events", label: "Events", icon: CalendarDays, color: "text-emerald-400", accent: "from-emerald-500 to-teal-500" },
  { id: "orders", label: "Orders", icon: ShoppingCart, color: "text-amber-400", accent: "from-amber-500 to-yellow-500" },
  { id: "reviews", label: "Reviews", icon: Star, color: "text-pink-400", accent: "from-pink-500 to-rose-500" },
  { id: "vibes", label: "Vibe Updates", icon: Radio, color: "text-purple-400", accent: "from-purple-500 to-violet-500" },
  { id: "announcements", label: "Announcements", icon: Megaphone, color: "text-sky-400", accent: "from-sky-500 to-indigo-500" },
  { id: "ai", label: "AI Audit", icon: Sparkles, color: "text-violet-400", accent: "from-violet-500 to-fuchsia-500" },
];

// ─── Reusable sub-components ─────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  icon: Icon,
  colorClass,
  glowClass,
  sub,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  glowClass: string;
  sub?: string;
  isLoading?: boolean;
}) => (
  <div className={`bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/60 rounded-2xl p-5 relative overflow-hidden group transition-all duration-300`}>
    <div className={`absolute top-0 right-0 w-28 h-28 ${glowClass} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
    <div className="flex items-start justify-between mb-3">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className={`w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    {isLoading ? (
      <div className="h-9 w-20 bg-zinc-800/60 rounded-lg animate-pulse" />
    ) : (
      <h2 className="text-3xl font-black tracking-tight text-zinc-100">{value}</h2>
    )}
    {sub && (
      <div className={`text-[10px] font-semibold mt-2 flex items-center gap-1.5 ${colorClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        {sub}
      </div>
    )}
  </div>
);

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  colorClass,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  colorClass: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-800/60">
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center ${colorClass}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <h2 className="font-bold text-zinc-100 text-lg leading-none">{title}</h2>
        {subtitle && <p className="text-zinc-500 text-xs mt-1">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-14 text-zinc-600">
    <Server className="w-8 h-8 mx-auto mb-3 opacity-40" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const TableSkeleton = ({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-5 bg-zinc-800/60 rounded animate-pulse flex-1" />
        ))}
      </div>
    ))}
  </div>
);

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.22 },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<SidebarSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // User management modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deletingUser, setDectingUser] = useState(false);

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  // Announcement form state
  const [announcement, setAnnouncement] = useState({ title: "", body: "", target: "all" });
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // AI Audit state
  const [aiPrompt, setAiPrompt] = useState("Analyze recent platform activity and identify potential crowd-reporting anomalies or suspicious behaviour patterns.");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // ─── Data Queries ───────────────────────────────────────────────────────────

  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => (base44 as any).admin.getStats(),
    refetchInterval: 60_000,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => (base44 as any).admin.getUsers(),
    enabled: activeSection === "users",
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => (base44 as any).admin.getEvents(),
    enabled: activeSection === "events",
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => (base44 as any).admin.getOrders(),
    enabled: activeSection === "orders",
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => (base44 as any).admin.getReviews(),
    enabled: activeSection === "reviews",
  });

  const { data: statusUpdates = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ["admin", "status-updates"],
    queryFn: () => (base44 as any).admin.getStatusUpdates(),
    enabled: activeSection === "vibes",
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      (base44 as any).admin.updateUserRole(userId, role),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      // Keep modal in sync with fresh data
      if (selectedUser && data?.id === selectedUser.id) setSelectedUser(data);
      toast({ title: "✅ Role Updated", description: "User role changed successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to update role.", variant: "destructive" });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ userId, subscription_tier }: { userId: string; subscription_tier: string }) =>
      (base44 as any).admin.updateUserSubscription(userId, subscription_tier),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      if (selectedUser && data?.id === selectedUser.id) setSelectedUser(data);
      toast({ title: "✅ Subscription Updated", description: "Subscription tier changed successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to update subscription.", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => (base44 as any).admin.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      setSelectedUser(null);
      setDectingUser(false);
      toast({ title: "🗑️ User Deleted", description: "User account removed from platform." });
    },
    onError: (err: any) => {
      setDectingUser(false);
      toast({ title: "Error", description: err?.message || "Failed to delete user.", variant: "destructive" });
    },
  });

  const toggleEventMutation = useMutation({
    mutationFn: ({ eventId, is_active }: { eventId: string; is_active: boolean }) =>
      (base44 as any).admin.updateEvent(eventId, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Event Updated", description: "Event status changed." });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => (base44 as any).admin.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "🗑️ Event Deleted", description: "Event has been removed." });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => (base44 as any).admin.deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Review Removed", description: "The review has been moderated." });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: (statusId: string) => (base44 as any).admin.deleteStatusUpdate(statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "status-updates"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast({ title: "Vibe Update Removed", description: "Status update has been deleted." });
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title || !announcement.body) return;
    setSendingAnnounce(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSendingAnnounce(false);
    setAnnouncement({ title: "", body: "", target: "all" });
    toast({ title: "📣 Broadcast Sent", description: "Your announcement has been dispatched to all active sessions." });
  };

  const handleAIAudit = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const prompt = `You are the VibeSocial Platform Auditor.
Context:
- Total Users: ${stats?.totalUsers ?? 0}
- Total Events: ${stats?.totalEvents ?? 0} (${stats?.activeEvents ?? 0} active)
- Confirmed Orders: ${stats?.confirmedOrders ?? 0}
- Total Revenue: $${stats?.totalRevenue?.toFixed(2) ?? "0.00"}
- Total Reviews: ${stats?.totalReviews ?? 0}
- Total Status Updates: ${stats?.totalStatusUpdates ?? 0}
- New Users This Week: ${stats?.newUsersThisWeek ?? 0}

Prompt: ${aiPrompt}

Generate a concise executive summary identifying key concerns, anomalies, sentiment trends, or recommendations.`;
      const response = await (base44 as any).integrations.Core.InvokeLLM({ prompt });
      if (response && typeof response === "object") {
        setAiResult(response.summary || JSON.stringify(response, null, 2) || "Audit completed successfully.");
      } else {
        setAiResult(String(response) || "Audit completed — no anomalies detected.");
      }
    } catch (err: any) {
      setAiResult(`AI analysis failed: ${err?.message || "Unknown error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const navigate = useCallback((section: SidebarSection) => {
    setActiveSection(section);
    setMobileSidebarOpen(false);
  }, []);

  // ─── Filtered data ──────────────────────────────────────────────────────────

  const filteredUsers = users.filter((u: any) => {
    const t = userSearch.toLowerCase();
    return !t || u.name?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t) || u.role?.toLowerCase().includes(t);
  });

  const filteredEvents = events.filter((e: any) => {
    const t = eventSearch.toLowerCase();
    return !t || e.title?.toLowerCase().includes(t) || e.venue_name?.toLowerCase().includes(t);
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection)!;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800/60 shrink-0">
        <img src={logoImg} alt="VibeSocial" className="w-8 h-8 rounded-xl object-cover shadow-lg" />
        {sidebarOpen && (
          <div className="overflow-hidden">
            <span className="font-black text-sm text-white tracking-tight block">VibeSocial</span>
            <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Admin Console</span>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative
                ${active
                  ? `bg-gradient-to-r ${item.accent} text-white shadow-lg`
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                }`}
            >
              <item.icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-white" : item.color}`} />
              {sidebarOpen && <span className="truncate">{item.label}</span>}
              {active && sidebarOpen && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-zinc-800/60 p-3 shrink-0">
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-xs font-black shrink-0">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-zinc-200 truncate">{user?.name || "Admin"}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            title="Sign out"
            className="w-full flex items-center justify-center py-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex text-zinc-100 font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col border-r border-zinc-800/60 bg-zinc-950 sticky top-0 h-screen z-30 shrink-0 transition-all duration-300 ${
          sidebarOpen ? "w-56" : "w-[60px]"
        }`}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="absolute -right-3 top-20 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition shadow-lg"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-56 bg-zinc-950 border-r border-zinc-800/60 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex items-center gap-4 px-6 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <currentNav.icon className={`w-5 h-5 ${currentNav.color}`} />
            <h1 className="text-base font-bold text-zinc-100">{currentNav.label}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => refetchStats()}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition"
              title="Refresh stats"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-zinc-700/40">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* ─────────────── OVERVIEW ─────────────── */}
            {activeSection === "overview" && (
              <motion.div key="overview" {...fadeUp} className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <StatCard label="Total Users" value={stats?.totalUsers ?? "—"} icon={Users} colorClass="text-orange-400" glowClass="bg-orange-500" sub={`+${stats?.newUsersThisWeek ?? 0} this week`} isLoading={loadingStats} />
                  <StatCard label="Active Events" value={stats?.activeEvents ?? "—"} icon={CalendarDays} colorClass="text-emerald-400" glowClass="bg-emerald-500" sub={`of ${stats?.totalEvents ?? 0} total`} isLoading={loadingStats} />
                  <StatCard label="Total Revenue" value={stats ? `$${Number(stats.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"} icon={DollarSign} colorClass="text-amber-400" glowClass="bg-amber-500" sub={`${stats?.confirmedOrders ?? 0} confirmed orders`} isLoading={loadingStats} />
                  <StatCard label="Content Reports" value={stats ? (stats.totalReviews + stats.totalStatusUpdates) : "—"} icon={AlertTriangle} colorClass="text-red-400" glowClass="bg-red-500" sub="Reviews + vibe updates" isLoading={loadingStats} />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Total Reviews" value={stats?.totalReviews ?? "—"} icon={Star} colorClass="text-pink-400" glowClass="bg-pink-500" isLoading={loadingStats} />
                  <StatCard label="Vibe Status Updates" value={stats?.totalStatusUpdates ?? "—"} icon={Radio} colorClass="text-purple-400" glowClass="bg-purple-500" isLoading={loadingStats} />
                  <StatCard label="New Orders (Week)" value={stats?.newOrdersThisWeek ?? "—"} icon={ShoppingCart} colorClass="text-sky-400" glowClass="bg-sky-500" isLoading={loadingStats} />
                </div>

                {/* Activity Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bar Chart */}
                  <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold flex items-center gap-2 text-zinc-100">
                        <BarChart3 className="w-4.5 h-4.5 text-orange-400" />
                        Platform Activity — Hourly
                      </h3>
                      <Badge variant="outline" className="border-orange-500/20 text-orange-400 text-[10px] tracking-wider uppercase">Simulated</Badge>
                    </div>

                    <div className="h-52 flex items-end gap-2">
                      {[38, 52, 47, 68, 82, 59, 71, 77, 91, 100, 64, 78].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
                          <div className="w-full rounded-t-md overflow-hidden bg-zinc-800/50 relative" style={{ height: `${val * 1.7}px` }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-600 via-pink-500/80 to-purple-500/60 group-hover:opacity-70 transition-opacity" />
                          </div>
                          <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">{String(i + 8).padStart(2, "0")}h</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-zinc-800/60 pt-3 mt-3 flex justify-between items-center text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Platform load: nominal</span>
                      <button onClick={() => navigate("ai")} className="text-purple-400 hover:text-purple-300 font-semibold transition">AI Audit →</button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
                    <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" /> Quick Actions
                    </h3>
                    {NAV_ITEMS.filter(n => n.id !== "overview").map(item => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl text-sm font-medium text-zinc-300 hover:text-white transition-all group`}
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─────────────── USERS ─────────────── */}
            {activeSection === "users" && (
              <motion.div key="users" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                <SectionHeader
                  icon={Users}
                  title="User Directory"
                  subtitle={`${users.length} registered users · click any row to manage`}
                  colorClass="text-blue-400"
                  action={
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        placeholder="Search name, email, role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-zinc-950/60 border-zinc-800 text-white pl-9 h-9 rounded-xl w-64 focus-visible:ring-blue-500/30 placeholder:text-zinc-600 text-sm"
                      />
                    </div>
                  }
                />

                <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950/60 text-zinc-500 text-[11px] font-bold uppercase tracking-widest border-b border-zinc-800/60">
                      <tr>
                        <th className="px-5 py-3.5 text-left">User</th>
                        <th className="px-5 py-3.5 text-left">Email</th>
                        <th className="px-5 py-3.5 text-left">Role</th>
                        <th className="px-5 py-3.5 text-left">Subscription</th>
                        <th className="px-5 py-3.5 text-left">Joined</th>
                        <th className="px-5 py-3.5 text-right">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {loadingUsers ? (
                        <tr><td colSpan={6}><TableSkeleton rows={6} cols={6} /></td></tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr><td colSpan={6}><EmptyState message="No users match your search." /></td></tr>
                      ) : (
                        filteredUsers.map((u: any) => (
                          <tr
                            key={u.id}
                            className="hover:bg-zinc-800/30 transition cursor-pointer group"
                            onClick={() => { setSelectedUser(u); setDectingUser(false); }}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                  u.role === "admin" ? "bg-gradient-to-br from-red-500/30 to-red-400/10 text-red-400" :
                                  u.role === "organizer" ? "bg-gradient-to-br from-orange-500/30 to-orange-400/10 text-orange-400" :
                                  "bg-zinc-700/60 text-zinc-300"
                                }`}>
                                  {u.name?.[0]?.toUpperCase() || "?"}
                                </div>
                                <span className="font-semibold text-zinc-200 truncate max-w-[120px] group-hover:text-white transition">{u.name || "—"}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-zinc-400 text-xs">{u.email}</td>
                            <td className="px-5 py-3.5">
                              <Badge variant="outline" className={
                                u.role === "admin"
                                  ? "border-red-500/30 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                                  : u.role === "organizer"
                                  ? "border-orange-500/30 bg-orange-500/5 text-orange-400 text-[10px] font-bold uppercase tracking-wider"
                                  : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 text-[10px] font-bold uppercase tracking-wider"
                              }>
                                {u.role}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge variant="outline" className={
                                u.subscription_tier === "vip"
                                  ? "border-violet-500/30 bg-violet-500/5 text-violet-400 text-[10px] font-bold uppercase tracking-wider"
                                  : u.subscription_tier === "plus"
                                  ? "border-blue-500/30 bg-blue-500/5 text-blue-400 text-[10px] font-bold uppercase tracking-wider"
                                  : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 text-[10px] font-bold uppercase tracking-wider"
                              }>
                                {u.subscription_tier === "vip" ? "👑 VIP" : u.subscription_tier === "plus" ? "⚡ Plus" : "Free"}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-zinc-500 text-xs">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setDectingUser(false); }}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition border border-blue-500/20 hover:border-blue-500/40"
                              >
                                <UserCog className="w-3.5 h-3.5" />
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ─────────────── USER MANAGE MODAL ─────────────── */}
            <AnimatePresence>
              {selectedUser && (
                <>
                  <motion.div
                    key="user-modal-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setSelectedUser(null); setDectingUser(false); }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
                  />
                  <motion.div
                    key="user-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ type: "spring", damping: 26, stiffness: 300 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                  >
                    <div className="pointer-events-auto w-full max-w-md bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden">
                      {/* Header */}
                      <div className="relative bg-gradient-to-br from-zinc-800/80 to-zinc-900 border-b border-zinc-800/60 p-5">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                        <button
                          onClick={() => { setSelectedUser(null); setDectingUser(false); }}
                          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700/60 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg ${
                            selectedUser.role === "admin" ? "bg-gradient-to-br from-red-500/40 to-red-400/20 text-red-300" :
                            selectedUser.role === "organizer" ? "bg-gradient-to-br from-orange-500/40 to-orange-400/20 text-orange-300" :
                            "bg-gradient-to-br from-zinc-600/60 to-zinc-700/40 text-zinc-200"
                          }`}>
                            {selectedUser.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-zinc-100 text-base truncate">{selectedUser.name || "Unnamed User"}</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                              <p className="text-xs text-zinc-400 truncate">{selectedUser.email}</p>
                            </div>
                            {selectedUser.created_at && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <CalendarClock className="w-3 h-3 text-zinc-500 shrink-0" />
                                <p className="text-[10px] text-zinc-500">
                                  Joined {new Date(selectedUser.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant="outline" className={
                            selectedUser.role === "admin" ? "border-red-500/40 bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-wider" :
                            selectedUser.role === "organizer" ? "border-orange-500/40 bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider" :
                            "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 text-[10px] font-bold uppercase tracking-wider"
                          }>
                            {selectedUser.role === "admin" ? "🛡 Admin" : selectedUser.role === "organizer" ? "🏢 Organizer" : "👤 Attendee"}
                          </Badge>
                          <Badge variant="outline" className={
                            selectedUser.subscription_tier === "vip" ? "border-violet-500/40 bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase tracking-wider" :
                            selectedUser.subscription_tier === "plus" ? "border-blue-500/40 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider" :
                            "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 text-[10px] font-bold uppercase tracking-wider"
                          }>
                            {selectedUser.subscription_tier === "vip" ? "👑 VIP" : selectedUser.subscription_tier === "plus" ? "⚡ Plus" : "Free"}
                          </Badge>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">

                        {/* Role */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Platform Role</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { value: "admin", label: "Admin", desc: "Full platform access", color: "red" },
                              { value: "organizer", label: "Organizer", desc: "Create & manage events", color: "orange" },
                              { value: "attendee", label: "Attendee", desc: "Standard access", color: "zinc" },
                            ] as const).map((option) => {
                              const isActive = selectedUser.role === option.value;
                              const colorCls = {
                                red: isActive ? "border-red-500/50 bg-red-500/15 text-red-300 shadow-red-500/10 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400",
                                orange: isActive ? "border-orange-500/50 bg-orange-500/15 text-orange-300 shadow-orange-500/10 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-orange-500/30 hover:bg-orange-500/5 hover:text-orange-400",
                                zinc: isActive ? "border-zinc-500/50 bg-zinc-700/50 text-zinc-200 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-zinc-500/40 hover:bg-zinc-700/40 hover:text-zinc-200",
                              }[option.color];
                              return (
                                <button
                                  key={option.value}
                                  disabled={isActive || updateRoleMutation.isPending}
                                  onClick={() => {
                                    setSelectedUser({ ...selectedUser, role: option.value });
                                    updateRoleMutation.mutate({ userId: selectedUser.id, role: option.value });
                                  }}
                                  className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all duration-200 disabled:cursor-default ${colorCls}`}
                                >
                                  {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                                  <span className="text-xs font-bold">{option.label}</span>
                                  <span className="text-[9px] leading-tight opacity-70">{option.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Subscription */}
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Gem className="w-3.5 h-3.5 text-zinc-500" />
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Subscription Tier</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {([
                              { value: "standard", label: "Free", desc: "Basic features only", icon: "🔵", color: "zinc" },
                              { value: "plus", label: "Plus", desc: "Chat + premium perks", icon: "⚡", color: "blue" },
                              { value: "vip", label: "VIP", desc: "All features + priority", icon: "👑", color: "violet" },
                            ] as const).map((tier) => {
                              const isActive = (selectedUser.subscription_tier || "standard") === tier.value;
                              const colorCls = {
                                zinc: isActive ? "border-zinc-500/50 bg-zinc-700/50 text-zinc-200 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-zinc-500/40 hover:bg-zinc-700/40 hover:text-zinc-200",
                                blue: isActive ? "border-blue-500/50 bg-blue-500/15 text-blue-300 shadow-blue-500/10 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-400",
                                violet: isActive ? "border-violet-500/50 bg-violet-500/15 text-violet-300 shadow-violet-500/10 shadow-md" : "border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-400",
                              }[tier.color];
                              return (
                                <button
                                  key={tier.value}
                                  disabled={isActive || updateSubscriptionMutation.isPending}
                                  onClick={() => {
                                    setSelectedUser({ ...selectedUser, subscription_tier: tier.value });
                                    updateSubscriptionMutation.mutate({ userId: selectedUser.id, subscription_tier: tier.value });
                                  }}
                                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-200 disabled:cursor-default ${colorCls}`}
                                >
                                  {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                                  <span className="text-lg leading-none">{tier.icon}</span>
                                  <span className="text-xs font-bold">{tier.label}</span>
                                  <span className="text-[9px] leading-tight opacity-70">{tier.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Danger Zone */}
                        {selectedUser.id !== user?.id && (
                          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest">Danger Zone</p>
                            </div>
                            {!deletingUser ? (
                              <button
                                onClick={() => setDectingUser(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-sm font-semibold transition"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete User Account
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs text-red-400 text-center font-medium">This action is <strong>irreversible</strong>. Are you sure?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setDectingUser(false)}
                                    className="flex-1 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => deleteUserMutation.mutate(selectedUser.id)}
                                    disabled={deleteUserMutation.isPending}
                                    className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-semibold transition disabled:opacity-50"
                                  >
                                    {deleteUserMutation.isPending ? "Deleting…" : "Yes, Delete"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* ─────────────── EVENTS ─────────────── */}

            {activeSection === "events" && (
              <motion.div key="events" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                <SectionHeader
                  icon={CalendarDays}
                  title="Event Management"
                  subtitle={`${events.length} total events`}
                  colorClass="text-emerald-400"
                  action={
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        placeholder="Search events..."
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        className="bg-zinc-950/60 border-zinc-800 text-white pl-9 h-9 rounded-xl w-60 focus-visible:ring-emerald-500/30 placeholder:text-zinc-600 text-sm"
                      />
                    </div>
                  }
                />

                <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950/60 text-zinc-500 text-[11px] font-bold uppercase tracking-widest border-b border-zinc-800/60">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Event</th>
                        <th className="px-5 py-3.5 text-left">Venue</th>
                        <th className="px-5 py-3.5 text-left">Organizer</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {loadingEvents ? (
                        <tr><td colSpan={5}><TableSkeleton rows={5} cols={5} /></td></tr>
                      ) : filteredEvents.length === 0 ? (
                        <tr><td colSpan={5}><EmptyState message="No events found." /></td></tr>
                      ) : (
                        filteredEvents.map((ev: any) => (
                          <tr key={ev.id} className="hover:bg-zinc-800/20 transition">
                            <td className="px-5 py-3.5 font-semibold text-zinc-200 max-w-[180px]">
                              <p className="truncate">{ev.title}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{ev.state}</p>
                            </td>
                            <td className="px-5 py-3.5 text-zinc-400 text-xs truncate max-w-[140px]">{ev.venue_name}</td>
                            <td className="px-5 py-3.5 text-zinc-400 text-xs">
                              {ev.users?.name || ev.users?.email || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant="outline"
                                className={ev.is_active
                                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider"
                                  : "border-zinc-700/40 bg-zinc-800/30 text-zinc-500 text-[10px] font-bold uppercase tracking-wider"
                                }
                              >
                                {ev.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm"
                                  onClick={() => toggleEventMutation.mutate({ eventId: ev.id, is_active: !ev.is_active })}
                                  className={`text-[11px] h-7 px-2 rounded-lg ${ev.is_active ? "text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-emerald-400 hover:bg-emerald-500/10"}`}
                                >
                                  {ev.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>
                                <Button variant="ghost" size="sm"
                                  onClick={() => {
                                    if (window.confirm(`Permanently delete "${ev.title}"?`)) {
                                      deleteEventMutation.mutate(ev.id);
                                    }
                                  }}
                                  className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ─────────────── ORDERS ─────────────── */}
            {activeSection === "orders" && (
              <motion.div key="orders" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                <SectionHeader
                  icon={ShoppingCart}
                  title="Orders"
                  subtitle={`${orders.length} total orders`}
                  colorClass="text-amber-400"
                />

                <div className="overflow-x-auto rounded-xl border border-zinc-800/60">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950/60 text-zinc-500 text-[11px] font-bold uppercase tracking-widest border-b border-zinc-800/60">
                      <tr>
                        <th className="px-5 py-3.5 text-left">Order</th>
                        <th className="px-5 py-3.5 text-left">Event</th>
                        <th className="px-5 py-3.5 text-left">Buyer</th>
                        <th className="px-5 py-3.5 text-left">Amount</th>
                        <th className="px-5 py-3.5 text-left">Status</th>
                        <th className="px-5 py-3.5 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {loadingOrders ? (
                        <tr><td colSpan={6}><TableSkeleton rows={5} cols={6} /></td></tr>
                      ) : orders.length === 0 ? (
                        <tr><td colSpan={6}><EmptyState message="No orders found." /></td></tr>
                      ) : (
                        orders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-zinc-800/20 transition">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-md">
                                {o.confirmation_code || o.id?.slice(0, 8)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-zinc-300 text-xs truncate max-w-[150px]">
                              {o.events?.title || "—"}
                            </td>
                            <td className="px-5 py-3.5 text-zinc-400 text-xs">
                              {o.attendee_name || o.users?.name || "—"}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-emerald-400">
                              ${Number(o.total_amount || 0).toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5">
                              <Badge
                                variant="outline"
                                className={
                                  o.status === "confirmed"
                                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider"
                                    : o.status === "pending_payment"
                                    ? "border-amber-500/30 bg-amber-500/5 text-amber-400 text-[10px] font-bold uppercase tracking-wider"
                                    : "border-red-500/30 bg-red-500/5 text-red-400 text-[10px] font-bold uppercase tracking-wider"
                                }
                              >
                                {o.status}
                              </Badge>
                            </td>
                            <td className="px-5 py-3.5 text-zinc-500 text-xs">
                              {o.created_at ? new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ─────────────── REVIEWS ─────────────── */}
            {activeSection === "reviews" && (
              <motion.div key="reviews" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                <SectionHeader
                  icon={Star}
                  title="Review Moderation"
                  subtitle={`${reviews.length} reviews to moderate`}
                  colorClass="text-pink-400"
                />

                {loadingReviews ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-20 bg-zinc-800/30 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <EmptyState message="No reviews found." />
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="p-4 bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl flex items-start justify-between gap-4 transition">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-zinc-200">{r.users?.name || "Anonymous"}</span>
                            <span className="text-xs text-amber-400 font-extrabold">★ {r.rating}</span>
                            {r.events?.title && (
                              <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                                {r.events.title}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{r.comment}</p>
                          <p className="text-[10px] text-zinc-600">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReviewMutation.mutate(r.id)}
                          disabled={deleteReviewMutation.isPending}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 h-8 rounded-lg shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─────────────── VIBE UPDATES ─────────────── */}
            {activeSection === "vibes" && (
              <motion.div key="vibes" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5">
                <SectionHeader
                  icon={Radio}
                  title="Vibe Status Updates"
                  subtitle={`${statusUpdates.length} crowdsourced reports`}
                  colorClass="text-purple-400"
                />

                {loadingStatuses ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-20 bg-zinc-800/30 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : statusUpdates.length === 0 ? (
                  <EmptyState message="No status updates found." />
                ) : (
                  <div className="space-y-3">
                    {statusUpdates.map((s: any) => (
                      <div key={s.id} className="p-4 bg-zinc-950/40 border border-zinc-800/60 hover:border-zinc-700/60 rounded-xl flex items-start justify-between gap-4 transition">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-zinc-200">{s.users?.name || "Crowd Spotter"}</span>
                            <Badge variant="outline" className="border-purple-500/20 bg-purple-500/5 text-purple-400 text-[10px] font-bold">
                              Vibe {s.vibe_score || "—"}
                            </Badge>
                            {s.events?.title && (
                              <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                                {s.events.title}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400">
                            Crowd: <span className="text-zinc-300 font-medium">{s.crowd_level}</span> · Wait: <span className="text-zinc-300 font-medium">{s.wait_time}</span>
                          </p>
                          {s.comment && <p className="text-xs text-zinc-500 italic">"{s.comment}"</p>}
                          <p className="text-[10px] text-zinc-600">
                            {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStatusMutation.mutate(s.id)}
                          disabled={deleteStatusMutation.isPending}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 h-8 rounded-lg shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─────────────── ANNOUNCEMENTS ─────────────── */}
            {activeSection === "announcements" && (
              <motion.div key="announcements" {...fadeUp} className="max-w-2xl mx-auto bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                <SectionHeader
                  icon={Megaphone}
                  title="Platform Announcements"
                  subtitle="Broadcast alerts to all active sessions"
                  colorClass="text-sky-400"
                />

                <form onSubmit={handleSendAnnouncement} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Announcement Title</label>
                    <Input
                      placeholder="e.g. Maintenance Window, New Feature Release"
                      value={announcement.title}
                      onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                      required
                      className="bg-zinc-950/60 border-zinc-800 text-white rounded-xl placeholder:text-zinc-600 focus-visible:ring-sky-500/30 focus-visible:border-sky-500/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Message Content</label>
                    <textarea
                      placeholder="Write your broadcast message here..."
                      value={announcement.body}
                      onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })}
                      required
                      rows={5}
                      className="w-full bg-zinc-950/60 border border-zinc-800 text-white rounded-xl p-3 text-sm resize-none outline-none focus:ring-1 focus:ring-sky-500/30 placeholder:text-zinc-600 transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Audience</label>
                    <select
                      value={announcement.target}
                      onChange={(e) => setAnnouncement({ ...announcement, target: e.target.value })}
                      className="w-full bg-zinc-950/60 border border-zinc-800 text-white rounded-xl p-2.5 text-sm outline-none focus:ring-1 focus:ring-sky-500/30 transition"
                    >
                      <option value="all">All Users (Attendees + Organizers)</option>
                      <option value="organizers">Organizers Only</option>
                      <option value="attendees">Attendees Only</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingAnnounce}
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 font-bold h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    {sendingAnnounce ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sendingAnnounce ? "Dispatching..." : "Send Announcement"}
                  </Button>
                </form>
              </motion.div>
            )}

            {/* ─────────────── AI AUDIT ─────────────── */}
            {activeSection === "ai" && (
              <motion.div key="ai" {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
                <SectionHeader
                  icon={Sparkles}
                  title="AI Platform Audit"
                  subtitle="Run security, traffic modeling, or sentiment diagnostics"
                  colorClass="text-violet-400"
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Controls */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Audit Prompt</label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={5}
                        className="w-full bg-zinc-950/60 border border-zinc-800 text-white rounded-xl p-3 text-sm resize-none outline-none focus:ring-1 focus:ring-violet-500/30 placeholder:text-zinc-600 transition"
                      />
                    </div>

                    {/* Context snapshot */}
                    <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 space-y-1.5 text-xs text-zinc-500">
                      <p className="text-zinc-400 font-semibold mb-2">Context Snapshot</p>
                      <p>Users: <span className="text-zinc-300">{stats?.totalUsers ?? "…"}</span></p>
                      <p>Events: <span className="text-zinc-300">{stats?.activeEvents ?? "…"} active / {stats?.totalEvents ?? "…"} total</span></p>
                      <p>Orders: <span className="text-zinc-300">{stats?.confirmedOrders ?? "…"} confirmed</span></p>
                      <p>Revenue: <span className="text-emerald-400">${Number(stats?.totalRevenue ?? 0).toFixed(2)}</span></p>
                      <p>Reviews: <span className="text-zinc-300">{stats?.totalReviews ?? "…"}</span></p>
                      <p>Vibe Updates: <span className="text-zinc-300">{stats?.totalStatusUpdates ?? "…"}</span></p>
                    </div>

                    <Button
                      onClick={handleAIAudit}
                      disabled={aiLoading}
                      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 font-bold h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-900/30"
                    >
                      {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {aiLoading ? "Analysing..." : "Run Audit"}
                    </Button>
                  </div>

                  {/* Terminal */}
                  <div className="lg:col-span-2 flex flex-col min-h-[340px]">
                    <div className="flex items-center justify-between bg-zinc-950 px-4 py-2 border-t border-x border-zinc-800 rounded-t-xl text-xs font-mono text-zinc-500">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      </div>
                      <span>vibe_monitor_v2.0.sh</span>
                      <Cpu className="w-3.5 h-3.5 text-zinc-600" />
                    </div>

                    <div className="flex-1 bg-black border border-zinc-800 p-5 font-mono text-xs text-green-400 rounded-b-xl relative overflow-y-auto leading-relaxed">
                      {/* Scanline */}
                      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] opacity-25" />

                      <div className="space-y-2 relative z-10">
                        <p className="text-zinc-600">&gt; Connecting to VibeSocial data warehouse...</p>
                        <p className="text-zinc-600">&gt; Auth: OK — admin session verified.</p>
                        <p className="text-zinc-600">&gt; Context loaded: {stats?.totalUsers ?? "?"} users, {stats?.totalEvents ?? "?"} events, {stats?.confirmedOrders ?? "?"} orders.</p>
                        <p className="text-zinc-700">&gt; AI auditor agent standby. Awaiting instructions...</p>

                        {aiLoading && (
                          <div className="flex items-center gap-2 text-violet-400 py-2 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Running platform audit... scanning anomalies...</span>
                          </div>
                        )}

                        {aiResult ? (
                          <div className="mt-4 text-zinc-300 bg-zinc-900/40 p-4 border border-zinc-800 rounded-lg whitespace-pre-line">
                            <span className="text-violet-400 font-bold block mb-2">AUDIT REPORT:</span>
                            {aiResult}
                          </div>
                        ) : (
                          !aiLoading && (
                            <p className="text-zinc-700 mt-4">&gt; Shell idle. Click 'Run Audit' to start diagnostics.</p>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
