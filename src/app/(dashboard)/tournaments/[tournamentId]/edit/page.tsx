import { notFound, redirect } from "next/navigation";
import { updateTournamentAction } from "@/app/(dashboard)/tournaments/actions";
import { TournamentForm } from "@/components/tournaments/tournament-form";
import { createClient } from "@/lib/supabase/server";

type EditTournamentPageProps = {
  params: Promise<{ tournamentId: string }>;
};

type EditableTournament = {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  rules: string | null;
  location: string;
  start_date: string;
  registration_deadline: string;
  registration_fee: number;
  max_players: number;
  number_of_teams: number;
  team_budget: number;
  banner_url: string | null;
  registrations?: Array<{ status: string }>;
};

export default async function EditTournamentPage({ params }: EditTournamentPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("*,registrations(id,status)")
    .eq("id", tournamentId)
    .single();

  if (error || !data) {
    notFound();
  }

  let upiQrUrl = null;
  if (data.upi_qr_path) {
    const { getSignedUpiQrUrlAction } = await import("@/app/(dashboard)/tournaments/payment-actions");
    upiQrUrl = await getSignedUpiQrUrlAction(tournamentId);
  }

  const tournament = {
    ...data,
    upi_qr_url: upiQrUrl
  } as EditableTournament & { upi_qr_url?: string | null };

  if (tournament.creator_id !== user.id) {
    redirect(`/tournaments/${tournamentId}?error=Only the creator can edit this tournament.`);
  }

  const approvedCount =
    tournament.registrations?.filter((registration) => registration.status === "approved").length ?? 0;

  return (
    <section className="mx-auto max-w-3xl glass-card rounded-2xl p-6 sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-pitch-600 dark:text-gold-400">
        Creator tools
      </p>
      <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">Edit Tournament</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Update tournament details, replace the banner, and tune registration settings.
      </p>
      <div className="mt-6">
        <TournamentForm
          mode="edit"
          action={updateTournamentAction.bind(null, tournamentId)}
          tournament={tournament}
          approvedCount={approvedCount}
        />
      </div>
    </section>
  );
}
