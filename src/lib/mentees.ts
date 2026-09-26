import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

// Colunas de identificação, sempre lidas juntas: qualquer tela do mentor
// que mostre uma pessoa precisa do nome e do fallback de e-mail no mesmo
// select. Ver 0007_perfil_mentee_e_aceite.sql.
export const MENTEE_IDENTITY_COLUMNS =
  "id, email, nome, sobrenome, cargo, empresa, papel";

export type MenteeIdentity = {
  email: string;
  nome: string | null;
  sobrenome: string | null;
  cargo?: string | null;
  empresa?: string | null;
};

// Fallback de e-mail em vez de "—": quem entrou antes do formulário de
// identificação existir não pode virar uma linha sem identidade nenhuma.
export function menteeDisplayName(mentee: MenteeIdentity): string {
  const nome = [mentee.nome, mentee.sobrenome].filter(Boolean).join(" ").trim();
  return nome.length > 0 ? nome : mentee.email;
}

export function menteeSubtitle(mentee: MenteeIdentity): string | null {
  const cargo = [mentee.cargo, mentee.empresa].filter(Boolean).join(" · ").trim();
  return cargo.length > 0 ? cargo : null;
}

export async function ensureMentee(supabase: SupabaseClient, user: User) {
  const { data: existing } = await supabase
    .from("mentees")
    .select("id, papel, nome")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("mentees")
    .insert({ user_id: user.id, email: user.email })
    .select("id, papel, nome")
    .single();

  if (error) throw error;
  return created;
}
