"use client";

import { useState } from "react";
import { RegistrationForm } from "./registration-form";
import { UserCheck } from "lucide-react";

type RegistrationSectionProps = {
  tournamentId: string;
  userEmail: string | undefined;
  userProfile: {
    fullName: string;
    phone: string | null;
    role: string | null;
    avatarUrl: string | null;
  } | null;
};

export function RegistrationSection({
  tournamentId,
  userEmail,
  userProfile,
}: RegistrationSectionProps) {
  const [isRegistering, setIsRegistering] = useState(false);

  if (isRegistering) {
    return (
      <RegistrationForm
        tournamentId={tournamentId}
        userEmail={userEmail}
        userProfile={userProfile}
        onCancel={() => setIsRegistering(false)}
      />
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden border border-slate-200/50 dark:border-white/5 bg-gradient-to-r from-pitch-500/5 to-transparent">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Ready to join this tournament?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit your application to participate in the upcoming player auction.
          </p>
        </div>
        <button
          onClick={() => setIsRegistering(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-pitch-500 hover:bg-pitch-400 text-pitch-950 px-6 text-sm font-black transition active:scale-98 shadow-md shadow-pitch-500/10 shrink-0"
        >
          <UserCheck className="h-4 w-4" />
          Join Tournament
        </button>
      </div>
    </div>
  );
}
