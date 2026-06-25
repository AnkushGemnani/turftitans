import { createTournamentAction } from "@/app/(dashboard)/tournaments/actions";
import { TournamentForm } from "@/components/tournaments/tournament-form";

export default function CreateTournamentPage() {
  return (
    <section className="mx-auto max-w-3xl glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-gold-400">
        Tournament setup
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">Create Tournament</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Add your tournament details, payment rules, capacity, and auction budget.
      </p>
      <div className="mt-6">
        <TournamentForm mode="create" action={createTournamentAction} />
      </div>
    </section>
  );
}
