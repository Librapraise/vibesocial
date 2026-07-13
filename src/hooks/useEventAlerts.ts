import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

const CHECKED_KEY = "event_alerts_checked"; // localStorage key for dedup

type AlertPayload = { title: string; message: string; link_url?: string };

type StatusUpdate = {
    event_id: string;
    vibe_score?: number;
    comment?: string;
};

function getCheckedSet(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(CHECKED_KEY) || "[]"));
    } catch {
        return new Set();
    }
}

function saveCheckedSet(set: Set<string>) {
    // Keep last 200 IDs to avoid unbounded growth
    const arr = [...set].slice(-200);
    localStorage.setItem(CHECKED_KEY, JSON.stringify(arr));
}

async function maybeNotify({ title, message, link_url }: AlertPayload) {
    // Create a Notification entity so the bell picks it up
    await base44.entities.Notification.create({
        title,
        message,
        target_type: "all",
        link_url,
        is_active: true,
    });

    // Also try browser notification
    if (Notification.permission === "granted") {
        new Notification(title, { body: message, icon: "/favicon.ico" });
    }
}

export default function useEventAlerts() {
    const intervalRef = useRef < ReturnType < typeof setInterval > | null > (null);
    const statusUnsubRef = useRef < (() => void) | null > (null);

    useEffect(() => {
        let savedEventIds: string[] = [];

        const init = async () => {
            try {
                await base44.auth.me();
            } catch {
                return; // not logged in
            }

            // Request browser notification permission
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }

            // --- 1. Check saved events starting soon (every 5 min) ---
            const checkUpcoming = async () => {
                try {
                    const saved = await base44.entities.SavedEvent.list("-created_date", 50);
                    savedEventIds = saved.map((s: any) => s.event_id);

                    const checked = getCheckedSet();
                    const now = new Date();
                    const soon = new Date(now.getTime() + 60 * 60 * 1000); // 60 min window

                    for (const se of saved) {
                        if (!se.event_start_time) continue;
                        const start = new Date(se.event_start_time);
                        if (start > now && start <= soon) {
                            const alertKey = `start-${se.event_id}`;
                            if (!checked.has(alertKey)) {
                                checked.add(alertKey);
                                saveCheckedSet(checked);
                                const minsLeft = Math.round((start.getTime() - now.getTime()) / 60000);
                                await maybeNotify({
                                    title: `🔔 Starting Soon: ${se.event_title}`,
                                    message: `${se.event_title} at ${se.event_venue_name || "the venue"} starts in ~${minsLeft} min!`,
                                    link_url: `${window.location.origin}${window.location.pathname}#/EventDetail?id=${se.event_id}`,
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error("Event alert check failed", err);
                }
            };

            await checkUpcoming();
            intervalRef.current = setInterval(checkUpcoming, 5 * 60 * 1000);

            // --- 2. Watch for new EventStatus updates on saved events ---
            statusUnsubRef.current = base44.entities.EventStatus.subscribe(async (ev: any) => {
                if (ev.type !== "create") return;
                const status: StatusUpdate = ev.data;
                if (!savedEventIds.includes(status.event_id)) return;

                const checked = getCheckedSet();
                const alertKey = `status-${ev.id}`;
                if (checked.has(alertKey)) return;
                checked.add(alertKey);
                saveCheckedSet(checked);

                // Fetch event info for the title
                let eventTitle = "an event you saved";
                try {
                    const events = await base44.entities.Event.filter({ id: status.event_id });
                    if (events[0]) eventTitle = events[0].title;
                } catch { }

                const vibeLabel = status.vibe_score ? ` — Vibe: ${status.vibe_score}/10` : "";
                const comment = status.comment ? ` "${status.comment}"` : "";

                await maybeNotify({
                    title: `📢 Update at ${eventTitle}`,
                    message: `New status report${vibeLabel}${comment}`,
                    link_url: `${window.location.origin}${window.location.pathname}#/EventDetail?id=${status.event_id}`,
                });
            });
        };

        init();

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            statusUnsubRef.current?.();
        };
    }, []);
}