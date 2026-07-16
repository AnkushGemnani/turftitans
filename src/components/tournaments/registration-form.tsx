"use client";

import { useActionState, useEffect, useState } from "react";
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
    role: string | null;
    avatarUrl: string | null;
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
  const [clientError, setClientError] = useState<string | null>(null);

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

        {clientError ? (
          <Notice type="error" message={clientError} />
        ) : null}
        {state.status === "error" ? (
          <Notice type="error" message={state.message} />
        ) : null}
        {state.status === "success" ? (
          <Notice type="success" message={state.message} />
        ) : null}

        <form action={formAction} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="tournamentId" value={tournamentId} />

          {/* Profile Picture Verification or Upload */}
          {userProfile?.avatarUrl ? (
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-pitch-950/20 p-3.5 rounded-xl border border-slate-150 dark:border-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={userProfile.avatarUrl}
                alt="Profile Preview"
                className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 shadow-sm"
              />
              <div>
                <span className="text-[10px] font-bold text-pitch-600 dark:text-gold-400 uppercase tracking-wider block">
                  Profile Picture Verified
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  This picture will be shown in the live auction.
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-pitch-950/20 p-4 rounded-xl border border-slate-150 dark:border-white/5 space-y-2">
              <label className="block">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                  Upload Profile Picture <span className="text-red-500">*</span>
                </span>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 leading-relaxed">
                  A profile picture is required to register. Make sure it clearly shows your face for the auction console. Max size 3 MB.
                </p>
                <input
                  type="file"
                  name="profileImage"
                  accept="image/*"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setClientError(null);
                    if (file) {
                      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
                      if (!allowedTypes.includes(file.type)) {
                        setClientError("Only JPG, PNG, and WEBP image formats are supported.");
                        event.target.value = "";
                        return;
                      }
                      const maxSizeBytes = 3 * 1024 * 1024; // 3 MB
                      if (file.size > maxSizeBytes) {
                        setClientError("Profile picture must be smaller than 3 MB.");
                        event.target.value = "";
                        return;
                      }
                    }
                  }}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400
                    file:mr-4 file:py-1.5 file:px-3.5
                    file:rounded-xl file:border-0
                    file:text-xs file:font-bold
                    file:bg-pitch-500/10 file:text-pitch-600 dark:file:text-pitch-400
                    hover:file:bg-pitch-500/20
                    cursor-pointer border border-slate-200 dark:border-white/10 rounded-xl p-2 bg-white dark:bg-pitch-950/40 focus:outline-none"
                />
              </label>
            </div>
          )}

          {/* User pre-filled fields block */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Full Name */}
            <div>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Full Name</span>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    name="fullName"
                    defaultValue={fullName}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 pl-10 pr-3 text-xs font-bold text-slate-900 dark:text-white outline-none transition focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
                  />
                </div>
              </label>
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

          {/* Player Role Selection/Display */}
          {!userProfile?.role ? (
            <div className="pt-2">
              <label className="block">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Select Player Role</span>
                <select
                  name="role"
                  required
                  defaultValue=""
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-pitch-950/70 px-4 text-xs font-bold text-slate-900 dark:text-white outline-none transition focus:border-pitch-500 dark:focus:border-pitch-400 focus:ring-1 focus:ring-pitch-500/50"
                >
                  <option value="" disabled>
                    Select your specialty
                  </option>
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all_rounder">All-Rounder</option>
                  <option value="wicket_keeper">Wicket Keeper</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">Player Specialty Role</span>
              <div className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-pitch-950/40 px-3 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {(() => {
                    const r = userProfile.role;
                    const labels: Record<string, string> = {
                      batsman: "Batsman",
                      bowler: "Bowler",
                      all_rounder: "All-Rounder",
                      wicket_keeper: "Wicket Keeper",
                    };
                    return labels[r] || r || "Not Provided";
                  })()}
                </span>
              </div>
              <input type="hidden" name="role" value={userProfile.role} />
            </div>
          )}

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
