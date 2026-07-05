import React from "react";
import Link from "next/link";
import { Trophy, ArrowLeft, Heart, Target, Users, Code } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = {
  title: "About Us | TurfTitans",
  description: "Learn more about TurfTitans, our mission, our values, and the developers behind the ultimate cricket tournament platform.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-350 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-pitch-950/70 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between transition-colors duration-300">
        <Link href="/" className="flex flex-col group px-2">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-600 text-pitch-950 shadow-[0_0_20px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-all duration-300">
              <Trophy className="h-4.5 w-4.5" />
            </span>
            <span className="text-lg font-black font-display tracking-tight text-slate-900 dark:text-white">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 px-4 text-xs font-bold transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 p-6 sm:p-8 lg:p-12 max-w-4xl mx-auto w-full relative z-10 space-y-12">
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-pitch-600 dark:text-pitch-400 text-xs font-black uppercase tracking-wider bg-pitch-500/5 dark:bg-pitch-500/10 px-3 py-1 rounded-full border border-pitch-500/25">
            Our Story
          </span>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Reimagining Cricket Tournaments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            TurfTitans is built for tournament organizers, players, and franchise owners. We remove the chaos of WhatsApp lists and spreadsheets to deliver a professional IPL-style experience.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="glass-card rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-pitch-500/10 text-pitch-500 flex items-center justify-center">
              <Target className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Our Mission</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              To democratise professional sports management tools and bring high-production value tournament setups to turf cricket groups worldwide.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Community First</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              We empower team owners to build their rosters interactively in live player drafting sessions and play live bidding games.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Code className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Engineering Quality</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Built with Next.js, Supabase Realtime, and Framer Motion for buttery-smooth responsiveness and sub-second live state synchronization.
            </p>
          </div>
        </div>

        {/* Developer Info Card */}
        <div className="glass-card rounded-3xl p-8 border border-slate-200/50 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-md flex flex-col sm:flex-row items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pitch-500 to-emerald-400 flex items-center justify-center font-black text-3xl text-pitch-950 shadow-md">
            A
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Developed by Ankush</h2>
            <p className="text-xs text-pitch-650 dark:text-pitch-400 font-bold uppercase tracking-wider">Lead Developer & Architect</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ankush is a passionate software engineer and sports enthusiast who designed TurfTitans to elevate the local league cricket drafting experience. His goal is to bring the excitement of major league auctions to local community turfs.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-200/50 dark:border-white/5 pt-6 text-center text-[10px] text-slate-450">
          <div className="flex items-center justify-center gap-1">
            <Heart className="h-3.5 w-3.5 text-pitch-500 fill-current" />
            <span>Built for Cricket Fans Everywhere &bull; Developed by Ankush &bull; &copy; {new Date().getFullYear()} TurfTitans.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
