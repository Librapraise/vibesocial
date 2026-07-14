import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const GUEST_NAME_KEY = "chat_guest_name";

type ChatMessage = {
  id: string;
  sender_name?: string;
  sender_email?: string;
  message?: string;
  created_date?: string;
};

type CurrentUser = { email: string; full_name?: string; subscription_tier?: string } | null;

type EventChatPanelProps = {
  eventId: string;
};

export default function EventChatPanel({ eventId }: EventChatPanelProps) {
  const [message, setMessage] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [guestName, setGuestName] = useState<string>(() => localStorage.getItem(GUEST_NAME_KEY) || "");
  const [guestNameInput, setGuestNameInput] = useState<string>("");
  const [namePrompt, setNamePrompt] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => { });
  }, []);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["eventChat", eventId],
    queryFn: () => base44.entities.EventChat.filter({ event_id: eventId }, "created_date", 100),
    enabled: !!eventId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const unsub = base44.entities.EventChat.subscribe((ev: any) => {
      if (ev.data?.event_id === eventId) {
        queryClient.invalidateQueries({ queryKey: ["eventChat", eventId] });
      }
    });
    return unsub;
  }, [eventId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const senderName = currentUser
    ? (currentUser.full_name || currentUser.email.split("@")[0])
    : guestName;

  const senderEmail = currentUser ? currentUser.email : `guest-${guestName}`;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Guest hasn't set a name yet — show prompt
    if (!currentUser && !guestName) {
      setNamePrompt(true);
      return;
    }

    setSending(true);
    await base44.entities.EventChat.create({
      event_id: eventId,
      sender_name: senderName,
      sender_email: senderEmail,
      sender_tier: (currentUser as any)?.subscription_tier || "free",
      message: message.trim(),
    });
    setMessage("");
    setSending(false);
  };

  const handleSetGuestName = (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestNameInput.trim();
    if (!name) return;
    localStorage.setItem(GUEST_NAME_KEY, name);
    setGuestName(name);
    setNamePrompt(false);
  };

  return (
    <div className="flex flex-col h-[420px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-sm">No messages yet. Be the first!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_email === senderEmail;
            return (
              <div key={msg.id} className={cn("flex gap-2", isMe ? "justify-end" : "justify-start")}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-0.5">
                    {(msg.sender_name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className={cn("max-w-[75%] flex flex-col gap-0.5", isMe ? "items-end" : "items-start")}>
                  {!isMe && (
                    <span className="text-[10px] text-zinc-500 px-1 flex items-center gap-1">
                      {msg.sender_name}
                      {(msg as any).sender_tier === "vip" && (
                        <Crown className="w-3 h-3 text-orange-400 inline fill-orange-400/25" />
                      )}
                    </span>
                  )}
                  <div className={cn(
                    "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    isMe ? "bg-orange-500 text-white rounded-br-sm" : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                  )}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-zinc-600 px-1">
                    {msg.created_date ? format(new Date(msg.created_date), "h:mm a") : ""}
                  </span>
                </div>
                {isMe && (
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 relative">
                    {senderName[0]?.toUpperCase()}
                    {(currentUser as any)?.subscription_tier === "vip" && (
                      <div className="absolute -top-1 -right-1 bg-zinc-950 rounded-full p-0.5 border border-zinc-800">
                        <Crown className="w-2.5 h-2.5 text-orange-400 fill-orange-400/25" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Guest name prompt */}
      {namePrompt && !currentUser && (
        <form onSubmit={handleSetGuestName} className="flex gap-2 mb-2">
          <Input
            value={guestNameInput}
            onChange={(e) => setGuestNameInput(e.target.value)}
            placeholder="Enter your display name…"
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 flex-1"
            autoFocus
            maxLength={30}
          />
          <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            Set Name
          </Button>
        </form>
      )}

      {/* Input */}
      {!namePrompt && (
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              currentUser
                ? (currentUser.subscription_tier === "plus" || currentUser.subscription_tier === "vip")
                  ? "Say something..."
                  : "Upgrade to Plus or VIP to participate in chat..."
                : "Sign In & Upgrade to participate in chat..."
            }
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 flex-1 disabled:opacity-50"
            disabled={!currentUser || (currentUser.subscription_tier !== "plus" && currentUser.subscription_tier !== "vip")}
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={
              !message.trim() ||
              sending ||
              !currentUser ||
              (currentUser.subscription_tier !== "plus" && currentUser.subscription_tier !== "vip")
            }
            className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}

      {/* Guest label */}
      {!currentUser && guestName && (
        <p className="text-[10px] text-zinc-600 text-center mt-1">
          Chatting as <span className="text-zinc-400">{guestName}</span> ·{" "}
          <button className="underline hover:text-zinc-300" onClick={() => { setGuestName(""); localStorage.removeItem(GUEST_NAME_KEY); setNamePrompt(false); }}>
            change
          </button>
        </p>
      )}
    </div>
  );
}