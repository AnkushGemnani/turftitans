"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, Shield, Trophy, Zap, Star, Check, X, ShieldAlert, Award, FileSpreadsheet, Heart, Landmark, Settings, UserCheck, Users, ChevronRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { CricketLoader } from "@/components/landing/cricket-loader";
import { AnimatePresence, motion } from "framer-motion";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasSeenIntro = sessionStorage.getItem("turf-intro-seen");
    const forceIntro = window.location.search.includes("intro=true");
    
    if (hasSeenIntro && !forceIntro) {
      setIsLoading(false);
    }
  }, []);

  const handleLoaderComplete = () => {
    sessionStorage.setItem("turf-intro-seen", "true");
    setIsLoading(false);
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                if (sessionStorage.getItem('turf-intro-seen') && !window.location.search.includes('intro=true')) {
                  document.documentElement.classList.add('intro-seen');
                }
              } catch (e) {}
            })()
          `,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .intro-seen .cricket-loader {
              display: none !important;
            }
          `,
        }}
      />
      
      <AnimatePresence mode="wait">
        {mounted && isLoading && (
          <CricketLoader onComplete={handleLoaderComplete} />
        )}
      </AnimatePresence>

      <motion.div
        initial={isLoading ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased relative overflow-hidden flex flex-col transition-colors duration-300"
      >

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: AURORA HERO — Full viewport, animated aurora BG
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col">
        {/* Aurora animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`
              [--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]
              [--dark-gradient:repeating-linear-gradient(100deg,#040806_0%,#040806_7%,transparent_10%,transparent_12%,#040806_16%)]
              [--aurora:repeating-linear-gradient(100deg,#10b981_10%,#34d399_15%,#059669_20%,#6ee7b7_25%,#10b981_30%)]
              [background-image:var(--white-gradient),var(--aurora)]
              dark:[background-image:var(--dark-gradient),var(--aurora)]
              [background-size:300%,_200%]
              [background-position:50%_50%,50%_50%]
              filter blur-[10px] invert-0 dark:invert
              after:content-[""] after:absolute after:inset-0
              after:[background-image:var(--white-gradient),var(--aurora)]
              after:dark:[background-image:var(--dark-gradient),var(--aurora)]
              after:[background-size:200%,_100%]
              after:animate-aurora after:[background-attachment:fixed]
              after:mix-blend-difference
              pointer-events-none
              absolute -inset-[10px] opacity-40 will-change-transform
              [mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]
            `}
          />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* Top Navbar */}
        <header className="relative z-20 max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pitch-500 to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Trophy className="h-4.5 w-4.5 text-pitch-950" />
              </div>
              <span className="font-display font-black tracking-tight text-lg text-slate-900 dark:text-white">
                TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
              </span>
            </div>
            <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 ml-10 -mt-0.5">
              Auction. Play. Win.
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <a href="#story" className="hover:text-pitch-500 transition-colors">Our Story</a>
            <a href="#how-it-works" className="hover:text-pitch-500 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-pitch-500 transition-colors">Features</a>
            <a href="#gallery" className="hover:text-pitch-500 transition-colors">Gallery</a>
            <Link href="/quick-auction" className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-bold flex items-center gap-1 transition-colors">
              <Zap className="h-3.5 w-3.5" /> Quick Auction
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] px-4 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 active:scale-98 backdrop-blur-md"
            >
              Login
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-4 text-xs font-black transition-all active:scale-98 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              Sign Up
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center">
          <div className="max-w-7xl mx-auto w-full px-6 grid gap-10 lg:grid-cols-2 items-center">
            {/* Left */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
              {/* Pulsing badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-pitch-500/20 bg-pitch-500/5 dark:bg-pitch-500/10 px-4 py-1.5 text-[11px] font-bold text-pitch-600 dark:text-pitch-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pitch-500" />
                </span>
                New: Live Auction Room Now Available
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Your Cricket Tournament,{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pitch-500 to-emerald-400 dark:from-pitch-400 dark:to-emerald-300">
                  Reimagined.
                </span>
              </h1>

              <p className="max-w-lg text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400">
                From player registration to IPL-style auctions, team formation to budget tracking — run everything from one powerful platform. No more WhatsApp chaos.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto pt-2">
                <Link
                  href="/sign-up"
                  className="group relative inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-7 text-sm font-black transition-all active:scale-98 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                >
                  Create Your Tournament
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link
                  href="/quick-auction"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-7 text-sm font-black transition-all active:scale-98 backdrop-blur-md"
                >
                  <Zap className="h-4 w-4" /> Quick WhatsApp Auction
                </Link>
                <Link
                  href="/tournaments"
                  className="inline-flex h-13 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] px-7 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-98 backdrop-blur-md"
                >
                  Explore Tournaments
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 border-t border-slate-200/50 dark:border-white/5 w-full">
                <div className="flex -space-x-3">
                  {[
                    { name: "A", bg: "bg-pitch-800" },
                    { name: "R", bg: "bg-emerald-500" },
                    { name: "K", bg: "bg-emerald-600" },
                    { name: "S", bg: "bg-pitch-500" }
                  ].map((av, idx) => (
                    <div key={idx} className={`h-8 w-8 rounded-full border-2 border-white dark:border-pitch-950 flex items-center justify-center text-[10px] font-black text-white ${av.bg}`}>
                      {av.name}
                    </div>
                  ))}
                </div>
                <div className="text-left space-y-0.5">
                  <div className="flex gap-0.5 text-pitch-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                    Trusted by 500+ Organizers across India
                  </p>
                </div>
              </div>
            </div>

            {/* Right — Hero Image with App Mockup overlay */}
            <div className="w-full flex justify-center relative">
              <div className="relative w-full max-w-[520px]">
                {/* Turf ground image */}
                <div className="rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/hero-turf-ground.png"
                    alt="Cricket turf ground at sunset"
                    className="w-full h-auto object-cover aspect-[16/10]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-50/80 via-transparent to-transparent dark:from-pitch-950/90 dark:via-transparent dark:to-transparent rounded-2xl" />
                </div>

                {/* Floating stats card */}
                <div className="absolute -bottom-4 -left-4 sm:-left-8 glass-card rounded-xl p-3 shadow-xl backdrop-blur-xl border border-slate-200/60 dark:border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-pitch-500 flex items-center justify-center">
                      <Users className="h-3 w-3 text-pitch-950" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">45 Players Registered</span>
                  </div>
                  <div className="h-1.5 w-32 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[100%] bg-gradient-to-r from-pitch-500 to-emerald-400 rounded-full" />
                  </div>
                  <span className="text-[10px] text-pitch-600 dark:text-pitch-400 font-semibold">Slots Full • Auction Ready</span>
                </div>

                {/* Floating live badge */}
                <div className="absolute -top-3 -right-3 sm:-right-6 glass-card rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-xl border border-pitch-500/20">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pitch-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pitch-500" />
                    </span>
                    <span className="text-xs font-black text-pitch-600 dark:text-pitch-400 uppercase tracking-wider">Live Auction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8">
          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500 animate-bounce">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scroll to explore</span>
            <ChevronRight className="h-4 w-4 rotate-90" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: THE STORY — Visual storytelling with cricket imagery
      ═══════════════════════════════════════════════════════════════ */}
      <section id="story" className="relative z-10 bg-white/50 dark:bg-pitch-950/50 backdrop-blur-sm border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            {/* Left — Auction Image */}
            <div className="relative group order-2 lg:order-1">
              <div className="rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/auction-atmosphere.png"
                  alt="IPL-style cricket auction atmosphere"
                  className="w-full h-auto object-cover aspect-[16/10] group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              </div>
              {/* Floating auction stat */}
              <div className="absolute bottom-4 left-4 right-4 glass-card rounded-xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-pitch-500 dark:text-pitch-400">Current Bid</p>
                    <p className="text-2xl font-display font-black text-slate-900 dark:text-white">₹75,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Team Budget Left</p>
                    <p className="text-lg font-bold text-pitch-600 dark:text-pitch-400">₹4,25,000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Story text */}
            <div className="space-y-6 order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-widest text-pitch-500 dark:text-pitch-400 font-display">The Problem</span>
              <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Still Managing Auctions on <span className="text-red-500">WhatsApp?</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Every weekend, thousands of cricket organizers across India struggle with the same nightmare — managing tournaments through spreadsheets, screenshots, and group chats.
              </p>
              
              <div className="space-y-3 pt-2">
                {[
                  { title: "Collecting registrations manually", desc: "Copy-pasting names from WhatsApp to Excel" },
                  { title: "Verifying UPI screenshots", desc: "Cross-referencing 50+ payment proofs" },
                  { title: "Running auctions on paper", desc: "Calculating budgets with a calculator app" },
                  { title: "Tracking team rosters", desc: "Sharing final teams as text messages" },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="h-5 w-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="h-3 w-3 text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: THE SOLUTION — What TurfTitans offers
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            {/* Left — Solution */}
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-pitch-500 dark:text-pitch-400 font-display">The Solution</span>
              <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                One Platform. <span className="text-transparent bg-clip-text bg-gradient-to-r from-pitch-500 to-emerald-400">Complete Control.</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                TurfTitans replaces your entire workflow — from the first registration to the final team roster. Built by cricket lovers, for cricket lovers.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  "Auto-collect player registrations with sharable links",
                  "One-click payment verification dashboard",
                  "Real-time IPL-style auction room with budget tracking",
                  "Automatic team formation and roster management",
                  "PDF and Excel exports for everything",
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <div className="h-5 w-5 rounded-full bg-pitch-500/10 border border-pitch-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-pitch-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — App Mockup (Dashboard Preview) */}
            <div className="w-full flex justify-center">
              <div className="w-full max-w-[500px] bg-pitch-950 border border-white/10 rounded-2xl p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-[11px] text-slate-300 font-sans space-y-4">
                
                {/* App Mockup Top Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded bg-pitch-500/20 border border-pitch-500/30 flex items-center justify-center">
                      <Trophy className="h-3 w-3 text-pitch-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">SPPL Auction League</span>
                      <span className="text-[8px] text-slate-500">45 / 45 Registered</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-pitch-500/10 border border-pitch-500/20 text-[9px] font-black text-pitch-400 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      Live
                    </span>
                  </div>
                </div>

                {/* Team Budgets */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2">
                  <span className="font-bold text-white block">Team Budgets</span>
                  <div className="space-y-1.5">
                    {[
                      { name: "Hidden Heroes", spent: "80L", fill: "w-[80%]" },
                      { name: "Warriors", spent: "65L", fill: "w-[65%]" },
                      { name: "Titans", spent: "72L", fill: "w-[72%]" },
                      { name: "Challengers", spent: "68L", fill: "w-[68%]" }
                    ].map((t) => (
                      <div key={t.name} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">{t.name}</span>
                        <div className="flex items-center gap-2 flex-1 mx-3">
                          <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full bg-pitch-500 rounded-full ${t.fill}`} />
                          </div>
                        </div>
                        <span className="font-bold text-white">{t.spent}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next Player */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex gap-3 items-center">
                  <div className="h-10 w-10 rounded-full bg-pitch-900 border border-white/5 flex items-center justify-center shadow-glow-green shrink-0 overflow-hidden relative">
                    <div className="absolute top-1.5 h-4 w-4 bg-pitch-400 rounded-full" />
                    <div className="absolute bottom-0 h-4 w-7 bg-pitch-600 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white block truncate text-[12px]">Ankush Gemnani</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">All Rounder &bull; Right Handed Bat</span>
                    <span className="text-[10px] text-pitch-400 font-bold block mt-1">Base Price: 50,000</span>
                  </div>
                  <button type="button" className="bg-pitch-500 text-pitch-950 font-black px-2.5 py-1.5 rounded-lg hover:brightness-110 shrink-0 text-[10px]">
                    Pick Player
                  </button>
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/5 text-center text-[9px]">
                  {[
                    { label: "Registered", value: "45" },
                    { label: "Approved", value: "33", highlight: true },
                    { label: "Teams", value: "6" },
                    { label: "Budget", value: "100L", highlight: true },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/[0.02] border border-white/5 p-1.5 rounded-lg">
                      <span className="text-slate-500 block">{s.label}</span>
                      <span className={`font-bold text-[11px] mt-0.5 block ${s.highlight ? "text-pitch-400" : "text-white"}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: HOW IT WORKS — 5 step visual flow
      ═══════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-10 border-t border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-pitch-900/30 backdrop-blur-sm">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-pitch-500/8 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28 text-center relative">
          <div className="space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-pitch-500 dark:text-pitch-400 font-display">Workflow</span>
            <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white">
              How <span className="text-pitch-500 dark:text-pitch-400">TurfTitans</span> Works
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">From setup to game day, we&apos;ve streamlined every step of tournament management.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-pitch-500/20 to-transparent" />

            {[
              { step: "1", title: "Create Tournament", desc: "Set fees, player limits, team count, and auction budgets.", icon: Trophy },
              { step: "2", title: "Players Register", desc: "Share your unique tournament link. Players sign up directly.", icon: UserCheck },
              { step: "3", title: "Verify Payments", desc: "Approve payment screenshots with one click.", icon: Landmark },
              { step: "4", title: "Run The Auction", desc: "Random player selection, live bidding, budget tracking.", icon: Zap },
              { step: "5", title: "Teams Ready", desc: "Complete rosters and auction history, instantly.", icon: Award },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.step} 
                  className="glass-card glass-card-hover p-6 rounded-2xl relative text-left space-y-4 group"
                >
                  <div className="h-8 w-8 rounded-full bg-pitch-500 text-pitch-950 font-display font-black flex items-center justify-center text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)] relative z-10">
                    {item.step}
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-white/90 dark:bg-pitch-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:border-pitch-500/20 transition-all duration-300">
                    <Icon className="h-4.5 w-4.5 text-pitch-500 dark:text-pitch-400" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: FEATURES — Detailed feature grid
      ═══════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 border-t border-slate-200/50 dark:border-white/5">
        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-pitch-500 dark:text-pitch-400">Features</span>
            <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white">
              Everything You Need To Run An <span className="text-pitch-500 dark:text-pitch-400">Auction Tournament</span>
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Trophy, title: "Tournament Management", desc: "Create and configure tournament profiles, match dates, entries, and slot limits in minutes." },
              { icon: Landmark, title: "Payment Tracking", desc: "Examine registry logs and verify payments, approving player entries in one dashboard." },
              { icon: Zap, title: "Auction Room", desc: "Run active player auctions with dynamic bidding, base prices, bids, and slot fills." },
              { icon: Settings, title: "Budget Management", desc: "Track team salary cap spending, locks, and block bid points overruns at the database level." },
              { icon: Award, title: "Team Formation", desc: "Build balanced squads automatically as bids resolve, forming team rosters with data logs." },
              { icon: FileSpreadsheet, title: "Registration Dashboard", desc: "Monitor tournament metrics, remaining slots, approvals, and download player lists." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.title} 
                  className="glass-card glass-card-hover p-6 rounded-2xl space-y-4 group border border-slate-200/50"
                >
                  <div className="h-10 w-10 rounded-xl bg-white/90 dark:bg-pitch-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-center group-hover:border-pitch-500/20 transition-all duration-300">
                    <Icon className="h-5 w-5 text-pitch-500 dark:text-pitch-400" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: GALLERY — Visual cricket storytelling
      ═══════════════════════════════════════════════════════════════ */}
      <section id="gallery" className="relative z-10 border-t border-slate-200/50 dark:border-white/5 bg-white/30 dark:bg-pitch-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto w-full px-6 py-20 lg:py-28">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-pitch-500 dark:text-pitch-400">Gallery</span>
            <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white">
              From Registration to <span className="text-pitch-500 dark:text-pitch-400">Victory Lap</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Every tournament is a story. Here&apos;s how TurfTitans brings yours to life.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { src: "/images/hero-turf-ground.png", title: "The Arena", desc: "Where legends are made. Set up your tournament with a few clicks." },
              { src: "/images/auction-atmosphere.png", title: "Auction Night", desc: "The thrill of IPL-style auctions, right in your pocket." },
              { src: "/images/team-celebration.png", title: "Victory Moment", desc: "Balanced teams, fair play, unforgettable memories." },
            ].map((img) => (
              <div key={img.title} className="group relative rounded-2xl overflow-hidden border border-slate-200/50 dark:border-white/10 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 space-y-1">
                  <h3 className="text-base font-display font-black text-white">{img.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{img.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 7: CTA BANNER — Final conversion section
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-gradient-to-r dark:from-pitch-950 dark:via-pitch-900 dark:to-pitch-950 shadow-lg dark:shadow-premium relative p-8 lg:p-12">
          <div className="absolute inset-0 bg-radial-card opacity-40 pointer-events-none" />
          
          <div className="grid gap-8 lg:grid-cols-12 items-center relative z-10">
            {/* Left: Cricket Action Image */}
            <div className="lg:col-span-5 w-full flex justify-center order-2 lg:order-1">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-square w-full rounded-2xl overflow-hidden border border-slate-200/30 dark:border-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/images/cricket-action.png" 
                  alt="Cricket Batsman" 
                  className="h-full w-full object-cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 dark:from-pitch-950/90 to-transparent" />
              </div>
            </div>

            {/* Right: CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left order-1 lg:order-2">
              <h2 className="text-3xl lg:text-4xl font-display font-black tracking-tight text-slate-900 dark:text-white">
                Ready To Run Your Next <span className="text-pitch-500 dark:text-pitch-400">Auction Tournament?</span>
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Stop managing registrations on WhatsApp and spreadsheets. Start organizing smarter with TurfTitans.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-pitch-500 hover:bg-pitch-600 text-pitch-950 px-6 text-sm font-black transition-all active:scale-98 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  Create Your First Tournament
                </Link>
                <div className="flex flex-col text-left text-[11px] text-slate-500 dark:text-slate-400 font-semibold space-y-0.5">
                  <span>&bull; No setup fees</span>
                  <span>&bull; Built for cricket communities</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 border-t border-slate-200/50 dark:border-white/5 grid gap-8 sm:grid-cols-2 lg:grid-cols-12 text-xs text-slate-500 dark:text-slate-400">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-pitch-500 flex items-center justify-center">
              <Trophy className="h-3.5 w-3.5 text-pitch-950" />
            </div>
            <span className="font-display font-black text-sm text-slate-900 dark:text-white">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
          </div>
          <p className="text-[11px] leading-relaxed max-w-sm">
            The all-in-one platform for cricket tournament organizers. Create, manage, and run successful auction tournaments effortlessly.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">Product</h4>
          <ul className="space-y-2 text-[11px]">
            <li><Link href="/sign-up" className="hover:text-pitch-500 transition-colors">Create Tournament</Link></li>
            <li><a href="#how-it-works" className="hover:text-pitch-500 transition-colors">How It Works</a></li>
            <li><a href="#features" className="hover:text-pitch-500 transition-colors">Features</a></li>
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">Resources</h4>
          <ul className="space-y-2 text-[11px]">
            <li><a href="#" className="hover:text-pitch-500 transition-colors">Help Center</a></li>
            <li><a href="#" className="hover:text-pitch-500 transition-colors">Guides</a></li>
            <li><a href="#" className="hover:text-pitch-500 transition-colors">Blog</a></li>
          </ul>
        </div>

        <div className="lg:col-span-3 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider">Company</h4>
          <ul className="space-y-2 text-[11px]">
            <li><a href="#" className="hover:text-pitch-500 transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-pitch-500 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-pitch-500 transition-colors">Privacy Policy</a></li>
          </ul>
          <div className="pt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-pitch-500/10 border border-pitch-500/20 px-2.5 py-1 text-[9px] font-bold text-pitch-500 dark:text-pitch-400">
              <Heart className="h-3 w-3 fill-current" /> Built for Cricket
            </span>
            <button
              onClick={() => {
                sessionStorage.removeItem("turf-intro-seen");
                document.documentElement.classList.remove("intro-seen");
                window.location.reload();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 px-2.5 py-1 text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
            >
              Replay Intro
            </button>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-12 py-4 border-t border-slate-200/50 dark:border-white/5 text-center text-[10px] text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} TurfTitans. All rights reserved.
        </div>
      </footer>
    </motion.div>
    </>
  );
}
