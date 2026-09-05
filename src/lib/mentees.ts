import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export async function ensureMentee(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("mentees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("mentees")
    .insert({ user_id: user.id, email: user.email })
    .select("id")
    .single();

  if (error) throw error;
  return created;
}
