import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

let adminClient: SupabaseClientAny | null = null;

export function getSupabaseAdmin(): SupabaseClientAny {
  if (!adminClient) {
    adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false },
    }) as SupabaseClientAny;
  }
  return adminClient;
}

export function getSupabaseClient(): SupabaseClientAny {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: { persistSession: false },
  }) as SupabaseClientAny;
}