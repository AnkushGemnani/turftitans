"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface CricketLoaderProps {
  onComplete: () => void;
}

export function CricketLoader({ onComplete }: CricketLoaderProps) {
  const [stage, setStage] = useState<"loading" | "reveal">("loading");
  const countRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stage !== "loading") return;

    const countNode = countRef.current;
    const textNode = textRef.current;
    const barNode = barRef.current;

    // Direct DOM animation for the loader stage
    const controls = animate(0, 100, {
      duration: 2.8,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate(value) {
        const progress = Math.round(value);
        
        if (countNode) {
          countNode.textContent = progress.toString();
        }

        if (barNode) {
          barNode.style.width = `${progress}%`;
        }

        if (textNode) {
          if (progress < 25) {
            textNode.textContent = "PREPARING THE TURF...";
          } else if (progress < 35) {
            textNode.textContent = "WALKING OUT TO THE CREASE...";
          } else if (progress < 60) {
            textNode.textContent = "POWERING UP AUCTION ROOMS...";
          } else if (progress < 85) {
            textNode.textContent = "CALIBRATING TEAM BUDGETS...";
          } else {
            textNode.textContent = "READY TO PLAY!";
          }
        }
      },
      onComplete() {
        // Transition to the brand reveal stage instead of exiting immediately
        setStage("reveal");
      },
    });

    return () => controls.stop();
  }, [stage]);

  // Final exit trigger after reveal stage
  useEffect(() => {
    if (stage === "reveal") {
      const timer = setTimeout(() => {
        onComplete();
      }, 2200); // Display the logo reveal for 2.2 seconds for cinematic feel
      return () => clearTimeout(timer);
    }
  }, [stage, onComplete]);

  // Spark configuration for impact
  const sparkCount = 12;
  const sparks = Array.from({ length: sparkCount }).map((_, idx) => {
    const angle = (idx / sparkCount) * Math.PI * 2;
    const distance = 160 + Math.random() * 60;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      scale: 0.5 + Math.random() * 0.7,
    };
  });

  return (
    <div className="cricket-loader fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030704] select-none overflow-hidden font-sans">
      {/* Background ambient lighting/glows (Always present for continuity) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-pitch-500/10 rounded-full blur-[100px] will-change-transform" />
        <div className="absolute top-1/3 left-1/4 w-[250px] h-[250px] bg-emerald-500/5 rounded-full blur-[75px] will-change-transform" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.015)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-all backdrop-blur-md active:scale-95 group"
      >
        <span>Skip Intro</span>
        <X className="h-3.5 w-3.5 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      <AnimatePresence mode="wait">
        {stage === "loading" ? (
          <motion.div
            key="loading-stage"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Main animation container (handles camera shake) */}
            <motion.div
              className="relative flex flex-col items-center justify-center w-full max-w-xl h-[450px] will-change-transform"
              animate={{
                x: [0, 0, -6, 6, -4, 4, -2, 2, 0],
                y: [0, 0, 4, -4, 3, -3, 1, -1, 0],
              }}
              transition={{
                times: [0, 0.34, 0.36, 0.38, 0.40, 0.42, 0.44, 0.46, 0.5],
                duration: 2.8,
                ease: "easeInOut",
              }}
            >
              {/* 1. Impact Spark Flash (Shockwave) */}
              <motion.div
                className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-pitch-400 to-emerald-300 filter blur-sm pointer-events-none will-change-transform"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0, 0, 4.5, 9],
                  opacity: [0, 0, 0.8, 0],
                }}
                transition={{
                  times: [0, 0.34, 0.37, 0.55],
                  duration: 2.8,
                  ease: "easeOut",
                }}
              />

              {/* 2. Spark particles radiating from impact */}
              {sparks.map((spark, idx) => (
                <motion.div
                  key={idx}
                  className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-pitch-400 to-emerald-300 shadow-[0_0_6px_#10b981] pointer-events-none will-change-transform"
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: [0, 0, spark.x],
                    y: [0, 0, spark.y],
                    scale: [0, 0, spark.scale, 0],
                    opacity: [0, 0, 1, 0],
                  }}
                  transition={{
                    times: [0, 0.35, 0.37, 0.6],
                    duration: 2.8,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* 3. Cricket Bat Swing */}
              <motion.div
                className="absolute z-20 pointer-events-none will-change-transform"
                style={{ transformOrigin: "12px 10px" }}
                initial={{ rotate: -80, x: -160, y: -100, opacity: 0 }}
                animate={{
                  rotate: [-80, -80, 28, 55],
                  x: [-160, -160, 0, 120],
                  y: [-100, -100, 0, 90],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  times: [0, 0.08, 0.35, 1],
                  duration: 2.8,
                  ease: "easeIn",
                }}
              >
                {/* Bat SVG */}
                <svg width="28" height="180" viewBox="0 0 28 180" fill="none" className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                  <rect x="11" y="0" width="6" height="70" rx="3" fill="#10b981" />
                  <path d="M11 15 L17 20 M11 25 L17 30 M11 35 L17 40 M11 45 L17 50 M11 55 L17 60" stroke="#047857" strokeWidth="1.5" />
                  <path
                    d="M 7 70 Q 7 65 14 65 Q 21 65 21 70 L 23 172 Q 23 178 14 178 Q 5 178 5 172 Z"
                    fill="url(#woodGrad)"
                  />
                  <path
                    d="M 5 72 L 7 170 M 23 72 L 21 170"
                    stroke="#f59e0b"
                    strokeWidth="0.5"
                    opacity="0.3"
                  />
                  <text
                    x="14"
                    y="120"
                    fill="#064e3b"
                    fontSize="9"
                    fontWeight="900"
                    textAnchor="middle"
                    transform="rotate(90, 14, 120)"
                    letterSpacing="2"
                    fontFamily="sans-serif"
                  >
                    TITANS
                  </text>

                  <defs>
                    <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="50%" stopColor="#b45309" />
                      <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>

              {/* 4. Cricket Ball Travel */}
              <motion.div
                className="absolute z-30 pointer-events-none will-change-transform"
                initial={{ scale: 0.15, x: 250, y: 220, opacity: 0 }}
                animate={{
                  scale: [0.15, 1, 1.25, 230],
                  x: [250, 0, -15, -40],
                  y: [220, 0, -10, 20],
                  opacity: [0, 1, 1, 1],
                }}
                transition={{
                  times: [0, 0.35, 0.42, 1],
                  duration: 2.8,
                  ease: "easeInOut",
                }}
              >
                {/* Ball SVG */}
                <svg width="46" height="46" viewBox="0 0 46 46" fill="none" className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                  <circle cx="23" cy="23" r="21" fill="url(#ballGrad)" />
                  <path
                    d="M 6 23 Q 23 27 40 23"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeDasharray="3,3"
                    fill="none"
                    opacity="0.9"
                  />
                  <path
                    d="M 6 20 Q 23 24 40 20"
                    stroke="#ef4444"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.7"
                  />
                  <path
                    d="M 6 26 Q 23 30 40 26"
                    stroke="#b91c1c"
                    strokeWidth="0.8"
                    fill="none"
                    opacity="0.7"
                  />
                  
                  <defs>
                    <radialGradient id="ballGrad" cx="30%" cy="30%" r="70%">
                      <stop offset="0%" stopColor="#f87171" />
                      <stop offset="40%" stopColor="#dc2626" />
                      <stop offset="85%" stopColor="#991b1b" />
                      <stop offset="100%" stopColor="#450a0a" />
                    </radialGradient>
                  </defs>
                </svg>
              </motion.div>
            </motion.div>

            {/* Progress & Status Text Display */}
            <div className="absolute bottom-20 flex flex-col items-center gap-3 z-40">
              <div className="flex items-baseline gap-1">
                <span
                  ref={countRef}
                  className="text-7xl md:text-8xl font-display font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pitch-400 to-emerald-400 dark:from-pitch-400 dark:to-emerald-300 glow-text-green"
                >
                  0
                </span>
                <span className="text-xl font-bold text-emerald-500/80">%</span>
              </div>

              <div className="flex items-center gap-2 h-6">
                <Sparkles className="h-4 w-4 text-pitch-400 animate-pulse" />
                <span
                  ref={textRef}
                  className="text-[10px] md:text-xs font-black tracking-[0.2em] text-slate-400 uppercase"
                >
                  PREPARING THE TURF...
                </span>
              </div>

              <div className="w-56 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  ref={barRef}
                  className="h-full bg-gradient-to-r from-pitch-500 to-emerald-400"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal-stage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-[#030704]"
          >
            {/* Glowing backdrop circle */}
            <div className="absolute w-[350px] h-[350px] bg-pitch-500/15 rounded-full blur-[90px] will-change-transform pointer-events-none" />

            {/* Shield and Trophy reveal */}
            <div className="relative mb-6">
              {/* Rotating outer ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-6 border border-pitch-500/20 border-dashed rounded-full"
              />
              {/* Pulsing inner ring */}
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-4 bg-pitch-500 rounded-full blur-md"
              />
              {/* Main Badge */}
              <motion.div
                initial={{ rotateY: -90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                className="h-24 w-24 rounded-2xl bg-gradient-to-br from-pitch-950 to-[#041a0e] flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-pitch-500/40 relative z-10"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-pitch-400">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
                  <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z" fill="url(#trophyRevealGrad)" stroke="none" />
                  <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z" />
                  
                  <defs>
                    <linearGradient id="trophyRevealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </div>

            {/* Brand Title with Lens Shimmer Sweep */}
            <div className="relative overflow-hidden px-6 py-2 text-center max-w-sm">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                className="font-display font-black tracking-tight text-5xl md:text-6xl text-white select-none leading-none"
              >
                TURF<span className="text-transparent bg-clip-text bg-gradient-to-r from-pitch-400 to-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">TITANS</span>
              </motion.h1>
              
              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
                className="text-[9px] md:text-[10px] font-black tracking-[0.5em] uppercase text-emerald-500/80 mt-3"
              >
                AUCTION • PLAY • WIN
              </motion.p>
              
              {/* Shimmer sweep effect */}
              <motion.div
                initial={{ x: "-150%" }}
                animate={{ x: "150%" }}
                transition={{ duration: 1.6, ease: "easeInOut", delay: 0.8 }}
                className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-20 pointer-events-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Brand (Always present) */}
      <div className="absolute bottom-6 flex items-center gap-1.5 opacity-40">
        <span className="font-display font-black tracking-tight text-[10px] text-white">
          TURF<span className="text-pitch-400">TITANS</span>
        </span>
      </div>
    </div>
  );
}
