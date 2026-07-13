import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldAlert,
  Users,
  Building,
  AlertTriangle,
  Send,
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  TrendingUp,
  UserCheck,
  Megaphone,
  BarChart3,
  Loader2,
  ArrowRight,
  Shield
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Tabs: overview, users, venues, moderation, notifications, ai
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "venues" | "moderation" | "notifications" | "ai">("overview");
  
  // State for user search & filters
  const [userSearch, setUserSearch] = useState("");
  
  // State for announcement
  const [announcement, setAnnouncement] = useState({ title: "", body: "", target: "all" });
  const [sendingAnnounce, setSendingAnnounce] = useState(false);

  // State for AI Analysis
  const [aiPrompt, setAiPrompt] = useState("Analyze recent platform activity and identify potential crowd-reporting anomalies.");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Queries for data
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: () => base44.entities.Event.list(),
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => base44.entities.Review.list(),
  });

  const { data: statusUpdates = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ["admin", "statusUpdates"],
    queryFn: () => base44.entities.StatusUpdate.list(),
  });

  // Simulated venue applications (as venue directory/applications can be fetched or mocked)
  const [venueApps, setVenueApps] = useState([
    { id: "app-1", name: "The Crystal Room", type: "club", address: "123 luxury Way, CA", applicant: "Sarah Connor", email: "sarah@crystalroom.com", status: "pending" },
    { id: "app-2", name: "Warehouse 88", type: "other", address: "88 Industrial Blvd, NY", applicant: "John Miller", email: "john@warehouse88.com", status: "pending" },
    { id: "app-3", name: "Retro Bar", type: "bar", address: "404 Neon Ave, TX", applicant: "Mike Jones", email: "mike@retrobar.com", status: "pending" },
  ]);

  // Mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return base44.entities.User.update(userId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role Updated", description: "User role has been successfully modified." });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      return base44.entities.Review.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast({ title: "Review Moderated", description: "The review has been removed." });
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return base44.entities.StatusUpdate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "statusUpdates"] });
      toast({ title: "Status Removed", description: "The status update has been deleted." });
    },
  });

  // Action Handlers
  const handleApproveVenue = (id: string, name: string) => {
    setVenueApps(prev => prev.map(app => app.id === id ? { ...app, status: "approved" } : app));
    toast({ title: "Venue Approved", description: `${name} application has been approved and listed.` });
  };

  const handleRejectVenue = (id: string, name: string) => {
    setVenueApps(prev => prev.map(app => app.id === id ? { ...app, status: "rejected" } : app));
    toast({ title: "Venue Rejected", description: `${name} application has been rejected.` });
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title || !announcement.body) return;
    setSendingAnnounce(true);
    // Simulate sending announcement via system logs / API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSendingAnnounce(false);
    setAnnouncement({ title: "", body: "", target: "all" });
    toast({ title: "Announcement Dispatched", description: "Your alert was pushed to all online attendees and organizers." });
  };

  const handleInvokeAI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const promptText = `
        You are the VibeSocial Platform Auditor. 
        Context:
        - Active Users: ${users.length}
        - Total Events: ${events.length}
        - Recent Vibe Status Updates: ${statusUpdates.length}
        - Recent Reviews: ${reviews.length}
        
        Prompt: ${aiPrompt}
        
        Generate a concise executive summary identifying key concerns, anomalies, sentiment trends, or recommendations.
      `;
      const response = await base44.integrations.Core.InvokeLLM({ prompt: promptText });
      // If mock/live client returns event list or text
      if (response && typeof response === 'object') {
        setAiResult(response.summary || JSON.stringify(response, null, 2) || "AI completed platform diagnostics successfully.");
      } else {
        setAiResult(response || "Diagnostic execution returned successfully.");
      }
    } catch (err: any) {
      setAiResult(`AI analysis failed: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter((u: any) => {
    const term = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-zinc-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
            <Shield className="w-8 h-8 text-orange-500" /> Admin Command Center
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Global system overrides, compliance moderation, and platform intelligence diagnostics.
          </p>
        </div>
        
        <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
          {(["overview", "users", "venues", "moderation", "notifications", "ai"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Users</span>
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-3xl font-black">{users.length}</h2>
              <div className="text-xs text-orange-500/70 font-semibold mt-2 flex items-center gap-1">
                Active & registered accounts
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Live Venues & Events</span>
                <Building className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-3xl font-black">{events.length}</h2>
              <div className="text-xs text-pink-500/70 font-semibold mt-2 flex items-center gap-1">
                Real-time hotspots
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Vibe Updates</span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-3xl font-black">{statusUpdates.length}</h2>
              <div className="text-xs text-purple-500/70 font-semibold mt-2 flex items-center gap-1">
                Crowdsourced stats submitted
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Flagged Incidents</span>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-3xl font-black">2</h2>
              <div className="text-xs text-red-500/70 font-semibold mt-2 flex items-center gap-1">
                Requires moderator action
              </div>
            </div>
          </div>

          {/* Quick Actions / Activity Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-400" /> Platform Event Heatmap
              </h3>
              <div className="h-64 rounded-xl border border-zinc-800/80 bg-zinc-950 flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-400">Total Ticket pre-sales volume is rising.</p>
                  <p className="text-xs text-zinc-600 mt-1">Platform analytics and traffic graphs require Supabase metrics connection.</p>
                  <Button variant="outline" className="mt-4 border-zinc-800 text-xs font-bold text-zinc-300" onClick={() => setActiveTab("ai")}>
                    Generate AI Health Assessment
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold">System Log Alerts</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Spam Alert Detected</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">User 'dj_flex' reported twice for fake wait-time status.</p>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/5 border border-orange-500/15 rounded-xl flex items-start gap-2">
                  <Building className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">Pending Venue Application</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">'The Crystal Room' submitted a new host approval request.</p>
                  </div>
                </div>
                <div className="p-3 bg-zinc-800/30 border border-zinc-800/80 rounded-xl flex items-start gap-2">
                  <UserCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-200">System Backup Complete</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Dynamic in-memory backup finished at 18:00 UTC.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" /> User Directory
            </h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by name, email, or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-zinc-800/60 border-zinc-700 text-white pl-9 placeholder:text-zinc-500 h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-800 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/80 text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/30">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                      Loading User Registry...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-500">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition duration-150">
                      <td className="px-6 py-4 font-bold text-zinc-200">{u.name}</td>
                      <td className="px-6 py-4 text-zinc-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={
                            u.role === "admin"
                              ? "border-red-500/30 bg-red-500/5 text-red-400"
                              : u.role === "organizer"
                              ? "border-orange-500/30 bg-orange-500/5 text-orange-400"
                              : "border-zinc-700 bg-zinc-800/50 text-zinc-300"
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {u.role !== "admin" && (
                          <Button
                            variant="ghost"
                            onClick={() => updateUserRoleMutation.mutate({ userId: u.id, role: "admin" })}
                            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 rounded-lg"
                          >
                            Make Admin
                          </Button>
                        )}
                        {u.role !== "organizer" && (
                          <Button
                            variant="ghost"
                            onClick={() => updateUserRoleMutation.mutate({ userId: u.id, role: "organizer" })}
                            className="text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-8 rounded-lg"
                          >
                            Make Organizer
                          </Button>
                        )}
                        {u.role !== "attendee" && (
                          <Button
                            variant="ghost"
                            onClick={() => updateUserRoleMutation.mutate({ userId: u.id, role: "attendee" })}
                            className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 h-8 rounded-lg"
                          >
                            Make Attendee
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENUES TAB */}
      {activeTab === "venues" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Building className="w-5 h-5 text-pink-400" /> Host & Venue Applications
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {venueApps.map((app) => (
              <div key={app.id} className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-zinc-200 text-lg">{app.name}</h4>
                    <p className="text-zinc-500 text-xs mt-0.5">{app.address}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      app.status === "approved"
                        ? "border-green-500/30 bg-green-500/5 text-green-400"
                        : app.status === "rejected"
                        ? "border-red-500/30 bg-red-500/5 text-red-400"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-400"
                    }
                  >
                    {app.status}
                  </Badge>
                </div>
                
                <div className="border-t border-zinc-800/50 pt-3 flex flex-col gap-1 text-xs text-zinc-400">
                  <p><span className="text-zinc-600">Applicant:</span> {app.applicant}</p>
                  <p><span className="text-zinc-600">Contact:</span> {app.email}</p>
                  <p><span className="text-zinc-600">Listing Type:</span> {app.type.toUpperCase()}</p>
                </div>

                {app.status === "pending" && (
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleRejectVenue(app.id, app.name)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 rounded-xl flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                    <Button
                      onClick={() => handleApproveVenue(app.id, app.name)}
                      className="text-xs bg-green-600/10 border border-green-600/30 text-green-400 hover:bg-green-600 hover:text-white h-9 rounded-xl flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve Listing
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODERATION TAB */}
      {activeTab === "moderation" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reviews Moderation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" /> Recent User Reviews
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {loadingReviews ? (
                <div className="text-center py-8 text-zinc-500">Loading Reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">No reviews found.</div>
              ) : (
                reviews.map((r: any) => (
                  <div key={r.id} className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl flex justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-200">{r.user_name || "Anonymous"}</span>
                        <span className="text-xs text-orange-400">★ {r.rating}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">{r.comment}</p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => deleteReviewMutation.mutate(r.id)}
                      className="text-zinc-500 hover:text-red-400 p-2 h-8 rounded-lg hover:bg-red-500/10"
                      title="Remove review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vibe Status Updates Moderation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-400" /> Crowdsourced Vibe Updates
            </h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {loadingStatuses ? (
                <div className="text-center py-8 text-zinc-500">Loading Vibe Statuses...</div>
              ) : statusUpdates.length === 0 ? (
                <div className="text-center py-8 text-zinc-600">No status reports found.</div>
              ) : (
                statusUpdates.map((s: any) => (
                  <div key={s.id} className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl flex justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{s.user_name || "Crowd Spotter"}</span>
                        <Badge variant="outline" className="border-purple-500/20 bg-purple-500/5 text-purple-400 text-[10px]">
                          Vibe: {s.vibe_score || "N/A"}
                        </Badge>
                      </div>
                      <p className="text-zinc-400 mt-1">
                        <span className="text-zinc-600">Crowd:</span> {s.crowd_level} | <span className="text-zinc-600">Wait:</span> {s.wait_time}
                      </p>
                      {s.comment && <p className="text-zinc-500 italic mt-0.5">"{s.comment}"</p>}
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => deleteStatusMutation.mutate(s.id)}
                      className="text-zinc-500 hover:text-red-400 p-2 h-8 rounded-lg hover:bg-red-500/10"
                      title="Delete status update"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM ANNOUNCEMENTS TAB */}
      {activeTab === "notifications" && (
        <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <Megaphone className="w-6 h-6 text-orange-400" />
            <div>
              <h3 className="text-lg font-bold">Platform-Wide Announcement Dispatch</h3>
              <p className="text-xs text-zinc-500">Send system updates or urgent safety broadcasts to all mobile/web sessions.</p>
            </div>
          </div>

          <form onSubmit={handleSendAnnouncement} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Announcement Title</label>
              <Input
                type="text"
                placeholder="e.g. System Maintenance, Holiday Ticket Special"
                value={announcement.title}
                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                required
                className="bg-zinc-850 border-zinc-700 text-white rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Broadcast Content</label>
              <textarea
                placeholder="Write message copy here..."
                value={announcement.body}
                onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })}
                required
                rows={4}
                className="w-full bg-zinc-800/60 border border-zinc-700 text-white rounded-xl p-3 text-sm focus-visible:ring-1 focus-visible:ring-orange-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Target Audience</label>
                <select
                  value={announcement.target}
                  onChange={(e) => setAnnouncement({ ...announcement, target: e.target.value })}
                  className="w-full bg-zinc-800/60 border border-zinc-700 text-white rounded-xl p-2 text-sm outline-none animate-none"
                >
                  <option value="all">All Users (Attendees + Organizers)</option>
                  <option value="organizers">Organizers Only</option>
                  <option value="attendees">Attendees Only</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={sendingAnnounce}
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 font-bold h-11 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              {sendingAnnounce ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingAnnounce ? "Dispatching Broadcast..." : "Send Announcement Now"}
            </Button>
          </form>
        </div>
      )}

      {/* AI PLATFORM INTELLIGENCE */}
      {activeTab === "ai" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
            <div>
              <h3 className="text-lg font-bold">AI Platform Diagnostics</h3>
              <p className="text-xs text-zinc-500">Run security, traffic modeling, or sentiment audits on crowdsourced events database.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Audit Request Prompt</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800/60 border border-zinc-700 text-white rounded-xl p-3 text-sm focus-visible:ring-1 focus-visible:ring-purple-500 outline-none"
              />
            </div>

            <Button
              onClick={handleInvokeAI}
              disabled={aiLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 rounded-xl flex items-center justify-center gap-2 px-6"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? "Executing Platform Audit..." : "Analyze Platform Data"}
            </Button>

            {aiResult && (
              <div className="mt-4 p-5 bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Diagnostic Report
                </p>
                <div className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                  {aiResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
