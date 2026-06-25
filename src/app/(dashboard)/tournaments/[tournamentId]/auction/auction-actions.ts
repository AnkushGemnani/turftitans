"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AuctionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey)
    throw new Error("Missing Supabase configuration for admin operation.");
  return createSupabaseClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function verifyCreatorForAuction(tournamentId: string) {
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: tournament } = await userClient
    .from("tournaments")
    .select("id, creator_id, status")
    .eq("id", tournamentId)
    .single();

  if (!tournament || tournament.creator_id !== user.id) {
    throw new Error("Only the tournament creator can perform this action.");
  }
  return { user, tournament, userClient };
}

// ─── Status Transitions ──────────────────────────────────────────────────────

export async function lockTournamentAction(
  tournamentId: string
): Promise<AuctionActionState> {
  try {
    const { tournament, userClient } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "open") {
      return { status: "error", message: "Tournament must be open to lock it." };
    }

    const adminClient = createAdminClient();
    const { count: approvedCount } = await adminClient
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "approved");

    if (!approvedCount || approvedCount === 0) {
      return {
        status: "error",
        message: "You need at least 1 approved player before locking.",
      };
    }

    const { error } = await userClient
      .from("tournaments")
      .update({ status: "locked" })
      .eq("id", tournamentId);

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/teams`);
    revalidatePath(`/tournaments/${tournamentId}/edit`);
    return {
      status: "success",
      message: "Tournament locked. Create teams and start the auction.",
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to lock tournament.",
    };
  }
}

export async function startAuctionAction(
  tournamentId: string
): Promise<AuctionActionState> {
  try {
    const { tournament, userClient } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "locked") {
      return {
        status: "error",
        message: "Tournament must be locked before starting the auction.",
      };
    }

    const adminClient = createAdminClient();
    const { count: teamCount } = await adminClient
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (!teamCount || teamCount < 2) {
      return {
        status: "error",
        message: "You need at least 2 teams to start the auction.",
      };
    }

    const { error } = await userClient
      .from("tournaments")
      .update({ status: "auction" })
      .eq("id", tournamentId);

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/auction`);
    revalidatePath(`/tournaments/${tournamentId}/teams`);
    return { status: "success", message: "Auction is now LIVE!" };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to start auction.",
    };
  }
}

export async function completeAuctionAction(
  tournamentId: string
): Promise<AuctionActionState> {
  try {
    const { tournament, userClient } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "auction") {
      return { status: "error", message: "Auction must be active to complete it." };
    }

    const { error } = await userClient
      .from("tournaments")
      .update({ status: "completed" })
      .eq("id", tournamentId);

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath(`/tournaments/${tournamentId}/auction`);
    revalidatePath(`/tournaments/${tournamentId}/teams`);
    return {
      status: "success",
      message: "Auction complete! Final rosters are now locked.",
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to complete auction.",
    };
  }
}

// ─── Player Actions ───────────────────────────────────────────────────────────

export async function sellPlayerAction(
  tournamentId: string,
  registrationId: string,
  teamId: string,
  purchaseAmount: number
): Promise<AuctionActionState> {
  try {
    const { user, tournament } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "auction") {
      return { status: "error", message: "Auction is not active." };
    }
    if (purchaseAmount < 0) {
      return { status: "error", message: "Purchase amount cannot be negative." };
    }

    const adminClient = createAdminClient();

    const { data: team } = await adminClient
      .from("teams")
      .select("id, remaining_budget, name")
      .eq("id", teamId)
      .eq("tournament_id", tournamentId)
      .single();

    if (!team) return { status: "error", message: "Team not found." };

    if (purchaseAmount > team.remaining_budget) {
      return {
        status: "error",
        message: `${team.name} only has ₹${team.remaining_budget.toLocaleString("en-IN")} remaining. Cannot spend ₹${purchaseAmount.toLocaleString("en-IN")}.`,
      };
    }

    const { data: registration } = await adminClient
      .from("registrations")
      .select("id, status")
      .eq("id", registrationId)
      .eq("tournament_id", tournamentId)
      .single();

    if (!registration || registration.status !== "approved") {
      return { status: "error", message: "Player not found or not approved." };
    }

    // Check if already sold
    const { data: existingPurchase } = await adminClient
      .from("auction_purchases")
      .select("id, status")
      .eq("registration_id", registrationId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (existingPurchase?.status === "sold") {
      return { status: "error", message: "This player is already sold." };
    }

    // Upsert — handles both fresh sells and previously-skipped players
    const { error } = await adminClient.from("auction_purchases").upsert(
      {
        tournament_id: tournamentId,
        registration_id: registrationId,
        team_id: teamId,
        purchase_amount: purchaseAmount,
        status: "sold",
        created_by: user.id,
      },
      { onConflict: "tournament_id,registration_id" }
    );

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}/auction`);
    revalidatePath(`/tournaments/${tournamentId}/teams`);
    return { status: "success", message: "Player sold!" };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to sell player.",
    };
  }
}

export async function skipPlayerAction(
  tournamentId: string,
  registrationId: string
): Promise<AuctionActionState> {
  try {
    const { user, tournament } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "auction") {
      return { status: "error", message: "Auction is not active." };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from("auction_purchases")
      .select("id, status")
      .eq("registration_id", registrationId)
      .eq("tournament_id", tournamentId)
      .maybeSingle();

    if (existing?.status === "sold") {
      return { status: "error", message: "Cannot skip a player who is already sold." };
    }

    const { error } = await adminClient.from("auction_purchases").upsert(
      {
        tournament_id: tournamentId,
        registration_id: registrationId,
        team_id: null,
        purchase_amount: 0,
        status: "skipped",
        created_by: user.id,
      },
      { onConflict: "tournament_id,registration_id" }
    );

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}/auction`);
    return { status: "success", message: "Player skipped. Will return to pool later." };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to skip player.",
    };
  }
}

export async function returnPlayerAction(
  tournamentId: string,
  registrationId: string
): Promise<AuctionActionState> {
  try {
    const { tournament } = await verifyCreatorForAuction(tournamentId);

    if (tournament.status !== "auction") {
      return { status: "error", message: "Auction is not active." };
    }

    const adminClient = createAdminClient();

    // Delete purchase record — budget refresh trigger will recalculate team budget
    const { error } = await adminClient
      .from("auction_purchases")
      .delete()
      .eq("registration_id", registrationId)
      .eq("tournament_id", tournamentId);

    if (error) return { status: "error", message: error.message };

    revalidatePath(`/tournaments/${tournamentId}/auction`);
    revalidatePath(`/tournaments/${tournamentId}/teams`);
    return { status: "success", message: "Player returned to the pool." };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "Failed to return player.",
    };
  }
}
