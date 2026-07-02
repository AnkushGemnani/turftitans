"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export type TeamActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Service role key not configured.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createTeamAction(
  tournamentId: string,
  _prev: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name || name.length < 2) {
    return { status: "error", message: "Team name must be at least 2 characters." };
  }

  // Verify creator
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, creator_id, team_budget, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.creator_id !== user.id) {
    return { status: "error", message: "Only the tournament creator can manage teams." };
  }

  if (tournament.status === "completed" || tournament.status === "cancelled" || tournament.status === "archived") {
    return { status: "error", message: "Cannot add teams to a completed, cancelled, or archived tournament." };
  }

  // Handle logo upload (optional)
  let logoPath: string | null = null;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { status: "error", message: "Logo must be an image file." };
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      return { status: "error", message: "Logo must be smaller than 2 MB." };
    }
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(path, logoFile, { contentType: logoFile.type, upsert: false });
    if (uploadError) {
      return { status: "error", message: `Logo upload failed: ${uploadError.message}` };
    }
    logoPath = path;
  }

  const adminClient = getAdminClient();
  const budget = tournament.team_budget;
  const { error } = await adminClient.from("teams").insert({
    tournament_id: tournamentId,
    name,
    logo_path: logoPath,
    budget,
    remaining_budget: budget,
  });

  if (error) {
    return {
      status: "error",
      message: error.message.includes("unique")
        ? `A team named "${name}" already exists.`
        : error.message,
    };
  }

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { status: "success", message: `Team "${name}" created successfully.` };
}

export async function deleteTeamAction(
  tournamentId: string,
  teamId: string
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, creator_id, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.creator_id !== user.id) {
    return { status: "error", message: "Only the creator can delete teams." };
  }

  if (tournament.status === "auction" || tournament.status === "completed" || tournament.status === "archived") {
    return { status: "error", message: "Cannot delete teams once the auction has started or tournament is archived." };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("tournament_id", tournamentId);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  return { status: "success", message: "Team deleted." };
}

export async function updateTeamAction(
  tournamentId: string,
  teamId: string,
  formData: FormData
): Promise<TeamActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim();
  const budgetStr = formData.get("budget") as string | null;

  if (!name || name.length < 2) {
    return { status: "error", message: "Team name must be at least 2 characters." };
  }

  // Verify creator
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, creator_id, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.creator_id !== user.id) {
    return { status: "error", message: "Only the tournament creator can manage teams." };
  }

  if (tournament.status === "completed" || tournament.status === "cancelled" || tournament.status === "archived") {
    return { status: "error", message: "Cannot edit teams in a completed, cancelled, or archived tournament." };
  }

  const adminClient = getAdminClient();

  // Get current team to see if we have players/what was spent
  const { data: team } = await adminClient
    .from("teams")
    .select("budget, remaining_budget, logo_path")
    .eq("id", teamId)
    .single();

  if (!team) {
    return { status: "error", message: "Team not found." };
  }

  let newBudget = team.budget;
  if (budgetStr !== null) {
    const parsedBudget = parseInt(budgetStr.replace(/[^0-9]/g, ""), 10);
    if (isNaN(parsedBudget) || parsedBudget < 0) {
      return { status: "error", message: "Budget must be a positive number." };
    }
    newBudget = parsedBudget;
  }

  // Check how much the team has already spent
  const spent = team.budget - team.remaining_budget;
  if (newBudget < spent) {
    return {
      status: "error",
      message: `New budget cannot be less than what team has already spent (₹${spent.toLocaleString("en-IN")}).`,
    };
  }

  const newRemaining = newBudget - spent;

  // Handle logo upload (optional)
  let logoPath = team.logo_path;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      return { status: "error", message: "Logo must be an image file." };
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      return { status: "error", message: "Logo must be smaller than 2 MB." };
    }
    const ext = logoFile.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(path, logoFile, { contentType: logoFile.type, upsert: false });
    if (uploadError) {
      return { status: "error", message: `Logo upload failed: ${uploadError.message}` };
    }
    logoPath = path;
  }

  const { error } = await adminClient
    .from("teams")
    .update({
      name,
      budget: newBudget,
      remaining_budget: newRemaining,
      logo_path: logoPath,
    })
    .eq("id", teamId)
    .eq("tournament_id", tournamentId);

  if (error) {
    return {
      status: "error",
      message: error.message.includes("unique")
        ? `A team named "${name}" already exists.`
        : error.message,
    };
  }

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { status: "success", message: `Team "${name}" updated successfully.` };
}
