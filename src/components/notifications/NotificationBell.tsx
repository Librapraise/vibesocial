import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X, ExternalLink, Loader2 } from "lucide-react";
import { createPageUrl } from "../../utils";
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

export default function NotificationBell() {
    const [open, setOpen] = useState<boolean>(false);
    const [lastReadAt, setLastReadAt] = useState<Date>(() => {
        const saved = localStorage.getItem(LAST_READ_KEY);
        return saved ? new Date(saved) : new Date(0);
    });
    const panelRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
        queryKey: ["notifications"],
        queryFn: () => base44.entities.Notification.list("-created_date", 30),
    });

    const unreadCount = notifications.filter(
        (n) => new Date(n.created_date || 0) > lastReadAt
    ).length;

    // Real-time subscription
    useEffect(() => {
        const unsub = base44.entities.Notification.subscribe((event: any) => {
            if (event.type === "create") {
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                // Browser notification
                if (Notification.permission === "granted") {
                    const notif = new Notification(event.data.title, {
                        body: event.data.message,
                        icon: "/favicon.ico",
                    });
                    if (event.data.link_url) {
                        notif.onclick = () => window.open(event.data.link_url, "_blank");
                    }
                }
            }
        });
        return unsub;
    }, [queryClient]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const handleOpen = () => {
        setOpen((prev) => !prev);
        // Request browser notification permission if not yet asked
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }
        // Mark all as read
        const now = new Date();
        setLastReadAt(now);
        localStorage.setItem(LAST_READ_KEY, now.toISOString());
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={handleOpen}
                className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-[-100px] md:right-0 top-10 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <span className="font-semibold text-sm text-white">Notifications</span>
                        <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-10 text-zinc-500">
                                <Bell className="w-7 h-7 mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const isUnread = new Date(n.created_date || 0) > lastReadAt;
                                return (
                                    <div
                                        key={n.id}
                                        className={cn(
                                            "px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                                            isUnread && "bg-orange-500/5"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    {isUnread && (
                                                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full flex-shrink-0" />
                                                    )}
                                                    <p className="font-semibold text-xs text-white truncate">{n.title}</p>
                                                </div>
                                                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{n.message}</p>
                                                <p className="text-[10px] text-zinc-600 mt-1">
                                                    {formatDistanceToNow(new Date(n.created_date || 0), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {n.link_url && (
                                                <a href={n.link_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-orange-400 flex-shrink-0 mt-0.5">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}