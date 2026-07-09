"use client";

import { useState } from "react";
import { TournamentCard } from "./tournament-card";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trophy, Play, CheckCircle2, ListFilter } from "lucide-react";

type TournamentListItem = {
  id: string;
  name: string;
  location: string;
  start_date: string;
  registration_fee: number;
  max_players: number;
  banner_url: string | null;
  banner_path: string | null;
  status: "draft" | "open" | "locked" | "auction" | "completed" | "cancelled" | "archived";
  registrations?: Array<{ status: string }>;
};

type TournamentsListClientProps = {
  items: TournamentListItem[];
};

type TabId = "all" | "open" | "auction" | "completed";

export function TournamentsListClient({ items }: TournamentsListClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");

  const counts = {
    all: items.length,
    open: items.filter((item) => item.status === "open").length,
    auction: items.filter((item) => item.status === "auction").length,
    completed: items.filter((item) => item.status === "completed").length,
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === "all") return true;
    return item.status === activeTab;
  });

  const tabs = [
    { id: "all", label: "All", count: counts.all, icon: ListFilter },
    { id: "open", label: "Registration Open", count: counts.open, icon: Trophy, activeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "auction", label: "Auction Live", count: counts.auction, icon: Play, activeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20", pulse: true },
    { id: "completed", label: "Completed", count: counts.completed, icon: CheckCircle2, activeColor: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Dynamic Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-white/5 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer border ${
                isActive
                  ? "border-pitch-500/20 bg-pitch-500/10 text-pitch-600 dark:text-pitch-400 shadow-sm"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/[0.03] hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {/* Pulsing indicator for active live auction */}
              {tab.id === "auction" && tab.count > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
              )}
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                isActive 
                  ? "bg-pitch-500/20 text-pitch-600 dark:text-pitch-400" 
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
              }`}>
                {tab.count}
              </span>
              
              {/* Slidable background decoration */}
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 -z-10 rounded-xl border border-pitch-500/30 bg-pitch-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Grid of Cards with Motion Animations */}
      {filteredItems.length > 0 ? (
        <motion.div 
          layout
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((tournament) => (
              <motion.div
                key={tournament.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <TournamentCard tournament={tournament} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01] p-12 text-center shadow-sm"
        >
          <Search className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" aria-hidden />
          <h2 className="mt-4 text-lg font-bold font-display tracking-tight text-slate-900 dark:text-white">No tournaments in this category</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            There are currently no tournaments matching this filter. Try checking the other sections above or search for another name.
          </p>
        </motion.section>
      )}
    </div>
  );
}
