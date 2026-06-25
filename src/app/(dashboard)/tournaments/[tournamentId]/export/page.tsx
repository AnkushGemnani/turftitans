import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportDashboard } from "@/components/exports/export-dashboard";

type ExportPageProps = {
  params: Promise<{ tournamentId: string }>;
};

export default async function ExportPage({ params }: ExportPageProps) {
  const { tournamentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch tournament details
  const { data: tournament, error: tourneyError } = await supabase
    .from("tournaments")
    .select("id, name, creator_id, start_date, registration_fee, max_players, number_of_teams, team_budget, status")
    .eq("id", tournamentId)
    .single();

  if (tourneyError || !tournament) {
    notFound();
  }

  // Permission validation: Only creator can access exports
  if (tournament.creator_id !== user.id) {
    redirect(`/tournaments/${tournamentId}?error=Only the tournament creator can access the Export Dashboard.`);
  }

  // 2. Fetch teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, budget, remaining_budget")
    .eq("tournament_id", tournamentId);

  const teams = teamsData || [];

  // 3. Fetch registrations (join profiles to get full_name)
  const { data: registrationsData } = await supabase
    .from("registrations")
    .select(`
      id,
      role,
      status,
      created_at,
      profiles(
        full_name
      )
    `)
    .eq("tournament_id", tournamentId);

  const registrations = (registrationsData || []).map((r: any) => ({
    id: r.id,
    role: r.role,
    status: r.status,
    created_at: r.created_at,
    playerName: r.profiles?.full_name || "Unknown Player",
  }));

  // 4. Fetch payments (join profiles to get full_name)
  const { data: paymentsData } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      status,
      created_at,
      profiles:profiles!payments_user_id_fkey(
        full_name
      )
    `)
    .eq("tournament_id", tournamentId);

  const payments = (paymentsData || []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    created_at: p.created_at,
    playerName: p.profiles?.full_name || "Unknown Player",
  }));

  // 5. Fetch auction purchases (join registrations & profiles + teams)
  const { data: auctionPurchasesData } = await supabase
    .from("auction_purchases")
    .select(`
      id,
      purchase_amount,
      created_at,
      registrations(
        role,
        profiles(
          full_name
        )
      ),
      teams(
        name
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("status", "sold");

  const auctionPurchases = (auctionPurchasesData || []).map((ap: any) => ({
    id: ap.id,
    purchase_amount: ap.purchase_amount,
    created_at: ap.created_at,
    role: ap.registrations?.role || "batsman",
    playerName: ap.registrations?.profiles?.full_name || "Unknown Player",
    teamName: ap.teams?.name || "Unassigned",
  }));

  return (
    <main className="container mx-auto px-4 py-8">
      <ExportDashboard
        tournament={tournament}
        teams={teams}
        registrations={registrations}
        payments={payments}
        auctionPurchases={auctionPurchases}
      />
    </main>
  );
}
