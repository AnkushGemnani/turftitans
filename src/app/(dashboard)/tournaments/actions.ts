"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/tournaments/format";
import { tournamentSchema } from "@/lib/validations/tournament";

export type TournamentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const defaultError = "Unable to save tournament. Please try again.";

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getBannerFile(formData: FormData) {
  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
}

async function uploadBanner(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Tournament banner must be an image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Tournament banner must be smaller than 5 MB.");
  }

  const supabase = await createClient();
  const path = `${userId}/${crypto.randomUUID()}.${getFileExtension(file)}`;
  const { error } = await supabase.storage
    .from("tournament-banners")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("tournament-banners").getPublicUrl(path);

  return {
    bannerUrl: data.publicUrl,
    bannerStoragePath: path,
  };
}

async function removeBanner(path: string | null) {
  if (!path) {
    return;
  }

  const supabase = await createClient();
  await supabase.storage.from("tournament-banners").remove([path]);
}

function getUpiQrFile(formData: FormData) {
  const file = formData.get("upiQr");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

async function uploadUpiQr(userId: string, file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("UPI QR Code must be an image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("UPI QR Code must be smaller than 5 MB.");
  }

  const supabase = await createClient();
  const path = `${userId}/${crypto.randomUUID()}.${getFileExtension(file)}`;
  const { error } = await supabase.storage
    .from("upi-qr")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    upiQrPath: path,
  };
}

async function removeUpiQr(path: string | null) {
  if (!path) {
    return;
  }

  const supabase = await createClient();
  await supabase.storage.from("upi-qr").remove([path]);
}

async function getApprovedRegistrationCount(tournamentId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "approved");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function parseTournamentForm(formData: FormData) {
  return tournamentSchema.safeParse({
    name: getField(formData, "name"),
    description: getField(formData, "description"),
    rules: getField(formData, "rules"),
    location: getField(formData, "location"),
    startDate: getField(formData, "startDate"),
    registrationDeadline: getField(formData, "registrationDeadline"),
    registrationFee: getField(formData, "registrationFee"),
    maxPlayers: getField(formData, "maxPlayers"),
    numberOfTeams: getField(formData, "numberOfTeams"),
    teamBudget: getField(formData, "teamBudget"),
    upiId: getField(formData, "upiId"),
    paymentInstructions: getField(formData, "paymentInstructions"),
  });
}

export async function createTournamentAction(
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseTournamentForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? defaultError,
    };
  }

  const banner = getBannerFile(formData);
  const upiQr = getUpiQrFile(formData);
  let uploadedBanner: Awaited<ReturnType<typeof uploadBanner>> | null = null;
  let uploadedUpiQr: Awaited<ReturnType<typeof uploadUpiQr>> | null = null;
  let redirectPath: string | null = null;

  try {
    if (banner) {
      uploadedBanner = await uploadBanner(user.id, banner);
    }
    if (upiQr) {
      uploadedUpiQr = await uploadUpiQr(user.id, upiQr);
    }

    const data = parsed.data;
    const slug = `${slugify(data.name)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: tournament, error } = await supabase
      .from("tournaments")
      .insert({
        creator_id: user.id,
        name: data.name,
        slug,
        description: data.description || null,
        rules: data.rules || null,
        location: data.location,
        start_date: data.startDate,
        registration_deadline: new Date(data.registrationDeadline).toISOString(),
        registration_fee: data.registrationFee,
        max_players: data.maxPlayers,
        number_of_teams: data.numberOfTeams,
        team_budget: data.teamBudget,
        banner_url: uploadedBanner?.bannerUrl ?? null,
        banner_storage_path: uploadedBanner?.bannerStoragePath ?? null,
        banner_path: uploadedBanner?.bannerUrl ?? null,
        upi_id: data.upiId || null,
        payment_instructions: data.paymentInstructions || null,
        upi_qr_path: uploadedUpiQr?.upiQrPath ?? null,
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      await removeBanner(uploadedBanner?.bannerStoragePath ?? null);
      await removeUpiQr(uploadedUpiQr?.upiQrPath ?? null);
      return {
        status: "error",
        message: error.message,
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/tournaments");
    redirectPath = `/tournaments/${tournament.id}?message=Tournament created successfully.`;
  } catch (error) {
    await removeBanner(uploadedBanner?.bannerStoragePath ?? null);
    await removeUpiQr(uploadedUpiQr?.upiQrPath ?? null);
    return {
      status: "error",
      message: error instanceof Error ? error.message : defaultError,
    };
  }

  redirect(redirectPath ?? "/tournaments");
}

export async function updateTournamentAction(
  tournamentId: string,
  _previousState: TournamentActionState,
  formData: FormData,
): Promise<TournamentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseTournamentForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? defaultError,
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("tournaments")
    .select("id,creator_id,banner_storage_path,upi_qr_path,status")
    .eq("id", tournamentId)
    .single();

  if (existingError || !existing) {
    return {
      status: "error",
      message: "Tournament not found.",
    };
  }

  if (existing.creator_id !== user.id) {
    return {
      status: "error",
      message: "Only the tournament creator can edit this tournament.",
    };
  }

  if (existing.status === "archived") {
    return {
      status: "error",
      message: "This tournament is archived and cannot be modified.",
    };
  }

  const data = parsed.data;
  const approvedCount = await getApprovedRegistrationCount(tournamentId);
  if (data.maxPlayers < approvedCount) {
    return {
      status: "error",
      message: `Maximum players cannot be less than the ${approvedCount} approved registrations.`,
    };
  }

  const banner = getBannerFile(formData);
  const upiQr = getUpiQrFile(formData);
  let uploadedBanner: Awaited<ReturnType<typeof uploadBanner>> | null = null;
  let uploadedUpiQr: Awaited<ReturnType<typeof uploadUpiQr>> | null = null;
  let redirectPath: string | null = null;

  try {
    if (banner) {
      uploadedBanner = await uploadBanner(user.id, banner);
    }
    if (upiQr) {
      uploadedUpiQr = await uploadUpiQr(user.id, upiQr);
    }

    const updatePayload = {
      name: data.name,
      description: data.description || null,
      rules: data.rules || null,
      location: data.location,
      start_date: data.startDate,
      registration_deadline: new Date(data.registrationDeadline).toISOString(),
      registration_fee: data.registrationFee,
      max_players: data.maxPlayers,
      number_of_teams: data.numberOfTeams,
      team_budget: data.teamBudget,
      upi_id: data.upiId || null,
      payment_instructions: data.paymentInstructions || null,
      ...(uploadedBanner
        ? {
            banner_url: uploadedBanner.bannerUrl,
            banner_storage_path: uploadedBanner.bannerStoragePath,
            banner_path: uploadedBanner.bannerUrl,
          }
        : {}),
      ...(uploadedUpiQr
        ? {
            upi_qr_path: uploadedUpiQr.upiQrPath,
          }
        : {}),
    };

    const { error } = await supabase
      .from("tournaments")
      .update(updatePayload)
      .eq("id", tournamentId)
      .eq("creator_id", user.id);

    if (error) {
      await removeBanner(uploadedBanner?.bannerStoragePath ?? null);
      await removeUpiQr(uploadedUpiQr?.upiQrPath ?? null);
      return {
        status: "error",
        message: error.message,
      };
    }

    if (uploadedBanner) {
      await removeBanner(existing.banner_storage_path ?? null);
    }
    if (uploadedUpiQr) {
      await removeUpiQr(existing.upi_qr_path ?? null);
    }

    revalidatePath("/dashboard");
    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${tournamentId}`);
    redirectPath = `/tournaments/${tournamentId}?message=Tournament updated successfully.`;
  } catch (error) {
    await removeBanner(uploadedBanner?.bannerStoragePath ?? null);
    await removeUpiQr(uploadedUpiQr?.upiQrPath ?? null);
    return {
      status: "error",
      message: error instanceof Error ? error.message : defaultError,
    };
  }

  redirect(redirectPath ?? `/tournaments/${tournamentId}`);
}

export async function deleteTournamentAction(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("id,creator_id,banner_storage_path,status")
    .eq("id", tournamentId)
    .single();

  if (tournamentError || !tournament || tournament.creator_id !== user.id) {
    redirect("/tournaments/my?error=Only the tournament creator can delete this tournament.");
  }

  if (tournament.status === "archived") {
    redirect(`/tournaments/${tournamentId}?error=Archived tournaments cannot be deleted.`);
  }

  const { error } = await supabase
    .from("tournaments")
    .delete()
    .eq("id", tournamentId)
    .eq("creator_id", user.id);

  if (error) {
    redirect(`/tournaments/my?error=${encodeURIComponent(error.message)}`);
  }

  await removeBanner(tournament.banner_storage_path ?? null);

  revalidatePath("/dashboard");
  revalidatePath("/tournaments");
  revalidatePath("/tournaments/my");
  redirect("/tournaments/my?message=Tournament deleted successfully.");
}

export async function updateTournamentStatusAction(
  tournamentId: string,
  status: "open" | "locked" | "auction" | "completed" | "cancelled" | "archived"
): Promise<TournamentActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tournament, error: fetchError } = await supabase
    .from("tournaments")
    .select("id, creator_id, status")
    .eq("id", tournamentId)
    .single();

  if (fetchError || !tournament) {
    return { status: "error", message: "Tournament not found." };
  }

  if (tournament.creator_id !== user.id) {
    return { status: "error", message: "Only the tournament creator can update its status." };
  }

  if (tournament.status === "archived") {
    return { status: "error", message: "This tournament is archived and cannot be modified." };
  }

  // Additional rules
  if (status === "locked" && tournament.status === "open") {
    // Check if at least 1 approved player exists
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("status", "approved");

    if (!count || count === 0) {
      return {
        status: "error",
        message: "You need at least 1 approved player before locking registration.",
      };
    }
  }

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ status })
    .eq("id", tournamentId);

  if (updateError) {
    return { status: "error", message: updateError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/auction`);

  return {
    status: "success",
    message: `Tournament status updated to ${
      status === "locked"
        ? "Registration Closed"
        : status === "completed"
        ? "Auction Completed"
        : status === "archived"
        ? "Tournament Archived"
        : status
    }.`
  };
}
