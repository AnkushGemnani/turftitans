"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

export function SidebarBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-pitch-500/10 dark:border-white/5 bg-gradient-to-br from-pitch-950 via-slate-900 to-pitch-950 p-4 shadow-lg text-white">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-pitch-500/10 rounded-full blur-2xl pointer-events-none" />
      
      {/* Graphic background */}
      <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none w-24 h-24">
        <Image
          src="/images/cricket-action.png"
          alt="Cricketer Silhouette"
          width={96}
          height={96}
          className="object-contain"
        />
      </div>

      <div className="relative z-10 space-y-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-pitch-400">
            Create. Compete. Conquer.
          </h4>
          <p className="mt-1 text-[11px] text-slate-300 leading-relaxed max-w-[85%]">
            The all-in-one platform for cricket tournament organizers.
          </p>
        </div>
        
        <Link
          href="/tournaments/create"
          className="inline-flex w-full items-center justify-center gap-1.5 h-8 rounded-lg bg-pitch-500 hover:bg-pitch-400 text-pitch-950 text-xs font-bold transition-all shadow-md shadow-pitch-500/10 active:scale-98"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Tournament
        </Link>
      </div>
    </div>
  );
}
