"use client";

import { useActionState, useEffect } from "react";
import { registerForTournamentAction, type ActionState } from "@/app/(dashboard)/tournaments/registration-actions";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { User, Mail, Phone, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

type RegistrationFormProps = {
  tournamentId: string;
  userEmail: string | undefined;
  userProfile: {
    fullName: string;
    phone: string | null;
  } | null;
  onCancel?: () => void;
};

const initialState: ActionState = {
  status: "idle",
  message: "",
};

export function RegistrationForm({
  tournamentId,
  userEmail,
  userProfile,
  onCancel,
}: RegistrationFormProps) {
  const [state, formAction] = useActionState(registerForTournamentAction, initialState);

  // Focus layout scroll on success/error notice
  useEffect(() => {
    if (state.status !== "idle") {
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  }, [state.status]);

  const fullName = userProfile?.fullName ?? "";
  const phone = userProfile?.phone ?? "Not Provided";
  const email = userEmail ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="glass-card p-6 md:p-8 rounded-2xl relative overflow-hidden border border-slate-200/60 dark:border-white/10"
    >
      <div className="absolute inset-0 bg-radial-card opacity-30 pointer-events-none" />
      <div className="relative space-y-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span className="h-4.5 w-1 bg-pitch-500 rounded-full" />
            Complete Player Registration
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Confirm your player details and select your role to join the tournament.
          </p>
        </div>

        {state.status === "error" ? (
          <Notice type="error" message={state.message} />
        ) : null}
        {state.status === "success" ? (
          <Notice type="success" message={state.message} />
        ) : null}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="tournamentId" value={tournamentId} />

          {/* User pre-filled fields block */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Full Name */}
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Full Name</span>
              <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-pitch-950/40 px-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{fullName}</span>
              </div>
            </div>

            {/* Email Address */}
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Email Address</span>
              <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-pitch-950/40 px-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Phone Number</span>
              <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-pitch-950/40 px-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{phone}</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-pitch-500 shrink-0" />
            Profile details are verified from your account settings. Update your account settings if details are incorrect.
          </p>

          {/* Player Role Dropdown Selection */}
          <div className="pt-2">
            <label className="block">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Select Player Role</span>
              <select
                name="role"
                required
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-xs font-bold text-slate-900 dark:text-white outline-none transition focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
              >
                <option value="" disabled selected>
                  Select your specialty
                </option>
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all_rounder">All-Rounder</option>
                <option value="wicket_keeper">Wicket Keeper</option>
              </select>
            </label>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-end">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="h-11 items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 px-6 text-xs font-bold transition active:scale-98"
              >
                Cancel
              </button>
            ) : null}
            <SubmitButton className="w-full sm:w-auto h-11 px-8 font-black uppercase tracking-wider text-xs">
              Confirm & Register
            </SubmitButton>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
