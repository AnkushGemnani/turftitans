"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteTournamentAction } from "@/app/(dashboard)/tournaments/actions";
import { cn } from "@/lib/utils/cn";

type DeleteTournamentButtonProps = {
  tournamentId: string;
  tournamentName: string;
  className?: string;
};

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  className,
}: DeleteTournamentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 text-xs font-bold text-red-400 transition hover:bg-red-500/10 hover:border-red-500/30",
          className
        )}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),#040806)] p-6 shadow-2xl dark:shadow-premium relative animate-in fade-in-50 zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Delete Tournament?</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  This will delete <strong className="text-slate-900 dark:text-white font-semibold">{tournamentName}</strong> and all associated tournament data, registrations, and matches. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 px-4 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.08] hover:text-slate-950 dark:hover:text-white transition-colors duration-150"
              >
                Cancel
              </button>
              <form action={deleteTournamentAction.bind(null, tournamentId)} className="w-full sm:w-auto">
                <button
                  type="submit"
                  className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-500 transition-colors duration-150 shadow-lg shadow-red-950/45 sm:w-auto"
                >
                  Delete tournament
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
