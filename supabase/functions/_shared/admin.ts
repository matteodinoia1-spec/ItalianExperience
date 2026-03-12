import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminAuthResult = {
  userId: string;
  role: string;
};

function parseAllowedRoles(raw: string | undefined | null): string[] {
  const v = (raw || "").trim();
  if (!v) return ["admin"];
  return v
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(
  supabaseAdmin: SupabaseClient,
  jwt: string,
): Promise<AdminAuthResult> {
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
    jwt,
  );
  if (userError || !userData?.user?.id) {
    const err = new Error("Unauthorized");
    // @ts-ignore - attach metadata for callers
    err.status = 401;
    throw err;
  }

  const userId = userData.user.id;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    const err = new Error("Forbidden");
    // @ts-ignore
    err.status = 403;
    throw err;
  }

  const role = profile.role != null ? String(profile.role).trim().toLowerCase() : "";
  const allowedRoles = parseAllowedRoles(Deno.env.get("IE_ADMIN_ROLES"));

  if (!role || !allowedRoles.includes(role)) {
    const err = new Error("Forbidden");
    // @ts-ignore
    err.status = 403;
    throw err;
  }

  return { userId, role };
}

