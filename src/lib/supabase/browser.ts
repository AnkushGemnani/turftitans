"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { assertSupabaseEnv, env } from "@/lib/env";

export function createClient(): SupabaseClient<Database> {
  assertSupabaseEnv();

  return createBrowserClient(
    env.supabaseUrl!,
    env.supabaseAnonKey!,
  ) as unknown as SupabaseClient<Database>;
}
