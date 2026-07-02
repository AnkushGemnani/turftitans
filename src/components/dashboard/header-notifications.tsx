"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, UserCheck, CreditCard, Clock, X } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

type NotificationItem = {
  id: string;
  text: string;
  time: string;
  status: string;
  read: boolean;
};

export function HeaderNotifications({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { data: tournaments } = await supabase
          .from("tournaments")
          .select("id, name")
          .eq("creator_id", userId);

        if (!tournaments || tournaments.length === 0) return;

        const tourneyIds = tournaments.map((t) => t.id);

        const { data: registrations } = await supabase
          .from("registrations")
          .select(`
            id,
            status,
            created_at,
            profiles:profiles!registrations_user_id_fkey (
              full_name
            ),
            tournaments (
              name
            )
          `)
          .in("tournament_id", tourneyIds)
          .order("created_at", { ascending: false })
          .limit(5);

        if (registrations) {
          const list = registrations.map((r: any) => {
            let text = "";
            const name = r.profiles?.full_name ?? "Someone";
            const tourney = r.tournaments?.name ?? "Tournament";
            
            if (r.status === "payment_uploaded") {
              text = `${name} uploaded payment proof for ${tourney}`;
            } else if (r.status === "approved") {
              text = `${name}'s registration approved for ${tourney}`;
            } else if (r.status === "rejected") {
              text = `${name}'s registration rejected for ${tourney}`;
            } else {
              text = `${name} registered for ${tourney}`;
            }

            return {
              id: r.id,
              text,
              time: r.created_at,
              status: r.status,
              read: false,
            };
          });
          setNotifications(list);
        }
      } catch (err) {
        console.warn("Failed to load notifications:", err);
      }
    }

    loadNotifications();

    // Set up database subscription for realtime notification alerts
    const channel = supabase
      .channel("realtime-registrations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(notifications.filter((n) => n.id !== id));
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
          isOpen ? "bg-slate-100 dark:bg-white/[0.04] text-slate-905 dark:text-white" : ""
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-pitch-500 border-2 border-white dark:border-pitch-950" />
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
                Notifications ({unreadCount} new)
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-pitch-600 dark:text-pitch-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-2">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">No new notifications from registrations.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors relative group ${
                      !item.read ? "bg-pitch-500/[0.02] dark:bg-pitch-400/[0.01]" : ""
                    }`}
                  >
                    <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      item.status === "payment_uploaded"
                        ? "bg-amber-500/10 text-amber-500"
                        : item.status === "approved"
                        ? "bg-pitch-500/10 text-pitch-500"
                        : "bg-purple-500/10 text-purple-500"
                    }`}>
                      {item.status === "payment_uploaded" ? (
                        <CreditCard className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {item.text}
                      </p>
                      <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(item.time)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => removeNotification(item.id, e)}
                      className="absolute top-3.5 right-3 h-5 w-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* View Queue Footer */}
            <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] text-center">
              <Link
                href="/tournaments/my?action=registrations"
                onClick={() => setIsOpen(false)}
                className="block py-1.5 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 hover:text-pitch-600 dark:hover:text-pitch-400 transition"
              >
                View all registrations
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
