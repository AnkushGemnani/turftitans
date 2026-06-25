import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-pitch-950 text-slate-800 dark:text-slate-100 antialiased relative overflow-hidden flex flex-col justify-center px-4 py-8 transition-colors duration-300">
      {/* Background Grid Pattern & Radial Ambient Light */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.012)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-pitch-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col justify-center relative z-10">
        <Link href="/" className="mb-8 inline-flex flex-col items-center gap-2 group self-center text-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-pitch-500 to-emerald-400 text-pitch-950 shadow-[0_0_15px_rgba(16,185,129,0.25)] group-hover:scale-105 transition-all duration-300">
              <Trophy className="h-5.5 w-5.5 text-pitch-950" aria-hidden />
            </span>
            <span className="font-display font-black tracking-tight text-2xl text-slate-900 dark:text-white">
              TURF<span className="text-pitch-500 dark:text-pitch-400">TITANS</span>
            </span>
          </div>
          <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-slate-400 dark:text-slate-500 ml-0.5">
            Auction. Play. Win.
          </span>
        </Link>

        <section className="glass-card rounded-2xl p-6 shadow-2xl backdrop-blur-md sm:p-8 relative overflow-hidden">
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-pitch-400">
              Auction cricket
            </p>
            <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
          </div>
          {children}
        </section>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400 relative z-10">{footer}</div>
      </div>
    </main>
  );
}
