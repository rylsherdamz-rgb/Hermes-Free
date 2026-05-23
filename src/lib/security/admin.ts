import { config } from "@/lib/config";

export async function isAdmin(psid: string): Promise<boolean> {
  if (config.admin.psids.includes(psid)) return true;

  try {
    const { getSupabaseAdmin } = await import("@/lib/supabase/client");
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("psid", psid)
      .single();

    return (data as { is_admin: boolean } | null)?.is_admin ?? false;
  } catch {
    return false;
  }
}

export function requireAdmin(psid: string): void {
  if (!config.admin.psids.includes(psid)) {
    throw new Error("Admin access required. This feature is restricted.");
  }
}

export async function ensureUserProfile(psid: string): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/client");
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("user_profiles")
    .select("psid")
    .eq("psid", psid)
    .single();

  if (!data) {
    const { getUserProfile } = await import("@/lib/facebook/messenger");
    let profile: { first_name?: string; last_name?: string; profile_pic?: string } = {};
    try {
      profile = await getUserProfile(psid);
    } catch {
      // profile fetch is best-effort
    }

    await supabase.from("user_profiles").insert({
      psid,
      first_name: profile.first_name || "User",
      last_name: profile.last_name || "",
      profile_pic: profile.profile_pic || "",
      is_admin: config.admin.psids.includes(psid),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

export function allowedModelForUser(
  model: string,
  isAdmin: boolean
): boolean {
  const publicModels = ["llama", "nemotron"];
  if (isAdmin) return true;
  return publicModels.includes(model);
}