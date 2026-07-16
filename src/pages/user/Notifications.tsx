import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Bell, ExternalLink, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  created_date?: string;
  link_url?: string;
};

const LAST_READ_KEY = "notif_last_read_at";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [lastReadAt, setLastReadAt] = useState<Date>(() => {
    const saved = localStorage.getItem(LAST_READ_KEY);
    return saved ? new Date(saved) : new Date(0);
  });

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ["notificationsPage"],
    queryFn: () => base44.entities.Notification.list("-created_date", 100),
  });

  const handleMarkAllRead = () => {
    const now = new Date();
    setLastReadAt(now);
    localStorage.setItem(LAST_READ_KEY, now.toISOString());
    queryClient.invalidateQueries({ queryKey: ["notificationsPage"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12">
      <div className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-white -ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-400" /> Notifications Feed
              </h1>
              {notifications.length > 0 && (
                <p className="text-zinc-500 text-xs">Stay updated on active alerts & orders</p>
              )}
            </div>
          </div>
          {notifications.length > 0 && (
            <Button
              onClick={handleMarkAllRead}
              variant="outline"
              size="sm"
              className="text-zinc-400 hover:text-white border-zinc-800 text-xs rounded-xl"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24">
            <Bell className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">Clean slate</h3>
            <p className="text-zinc-650 text-sm">No notifications to display right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const isUnread = new Date(n.created_date || 0) > lastReadAt;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "p-4 rounded-2xl border transition relative overflow-hidden flex items-start gap-4",
                    isUnread
                      ? "bg-orange-500/[0.02] border-orange-500/20 hover:border-orange-500/30"
                      : "bg-zinc-900 border-zinc-800/85 hover:border-zinc-800"
                  )}
                >
                  {isUnread && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-500" />
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    isUnread ? "bg-orange-500/10 text-orange-400" : "bg-zinc-800 text-zinc-500"
                  )}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn("font-bold text-sm", isUnread ? "text-white" : "text-zinc-300")}>{n.title}</h3>
                      <span className="text-[10px] text-zinc-555 shrink-0">
                        {n.created_date ? formatDistanceToNow(new Date(n.created_date), { addSuffix: true }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-450 leading-relaxed">{n.message}</p>
                    {n.link_url && (
                      <div className="pt-2">
                        {n.link_url.startsWith("/") ? (
                          <Link to={n.link_url}>
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-400">
                              View Details <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </Link>
                        ) : (
                          <a href={n.link_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="secondary" className="h-7 text-[10px] font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-orange-400">
                              View Link <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
