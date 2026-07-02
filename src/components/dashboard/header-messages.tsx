"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Users, MessageCircle, Clock, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

type ChatMessage = {
  id: string;
  sender: string;
  avatarSeed: string;
  channel: string;
  text: string;
  time: string;
  unread: boolean;
};

export function HeaderMessages() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Simulated live chat feed previews
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "ch-1",
      sender: "Shubman Gill",
      avatarSeed: "shubman",
      channel: "Bangalore Blasters Chat",
      text: "Glad to be a part of the Blasters! Ready for the league.",
      time: "2026-07-02T13:42:00Z",
      unread: true,
    },
    {
      id: "ch-2",
      sender: "Ankush Gemnani (You)",
      avatarSeed: "ankush",
      channel: "#spl-general-auction",
      text: "Auction room is open. Teams, please check your budgets.",
      time: "2026-07-02T13:20:00Z",
      unread: false,
    },
    {
      id: "ch-3",
      sender: "Hardik Pandya",
      avatarSeed: "hardik",
      channel: "Delhi Dynamites Chat",
      text: "We need to bid for another quality death bowler.",
      time: "2026-07-02T12:05:00Z",
      unread: true,
    },
    {
      id: "ch-4",
      sender: "System Bot",
      avatarSeed: "bot",
      channel: "#announcements",
      text: "Tournament schedules have been successfully exported to Excel.",
      time: "2026-07-02T09:15:00Z",
      unread: false,
    },
  ]);

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = messages.filter((m) => m.unread).length;

  const markAllAsRead = () => {
    setMessages(messages.map((m) => ({ ...m, unread: false })));
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] transition active:scale-95 ${
          isOpen ? "bg-slate-100 dark:bg-white/[0.04] text-slate-950 dark:text-white" : ""
        }`}
        aria-label="Messages"
      >
        <MessageSquare className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-pitch-950 animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 bg-white dark:bg-pitch-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-lg bg-white/95 dark:bg-pitch-900/95"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-150 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-wide">
                Recent Messages
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-pitch-600 dark:text-pitch-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-2">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">No messages yet</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Channels and team chats will display preview messages here.</p>
                </div>
              ) : (
                messages.map((item) => (
                  <Link
                    key={item.id}
                    href={`/tournaments/my?action=auction`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors relative group block ${
                      item.unread ? "bg-emerald-500/[0.02] dark:bg-emerald-400/[0.01]" : ""
                    }`}
                  >
                    {/* Channel / Sender Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-pitch-500/10 to-emerald-500/10 border border-pitch-500/10 flex items-center justify-center font-bold text-pitch-600 dark:text-pitch-400 text-xs uppercase">
                        {item.sender.charAt(0)}
                      </div>
                      {item.unread && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate max-w-[120px]">
                          {item.channel}
                        </span>
                        <span className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTimeAgo(item.time)}
                        </span>
                      </div>
                      <p className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                        {item.sender}: <span className="font-medium text-slate-600 dark:text-slate-400">{item.text}</span>
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-center">
              <Link
                href="/tournaments/my?action=auction"
                onClick={() => setIsOpen(false)}
                className="block py-1.5 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-pitch-600 dark:hover:text-pitch-400 transition"
              >
                Enter Auction Room Chats
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
