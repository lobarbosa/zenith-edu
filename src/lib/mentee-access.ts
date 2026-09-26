import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureMentee } from "@/lib/mentees";

// O aceite no programa. `papel` nasce 'prospect' (0007): quem se cadastra
// faz o diagnóstico e nada mais até o mentor aceitar. Jornada, copiloto,
// mapas e biblioteca só existem depois disso.
//
// 'mentor' e 'admin' entram aqui porque o mentor também tem linha em
// `mentees` (é assim que validado_por e atualizado_por referenciam ele) e
// não pode cair no gate das telas do mentorado.
const PROGRAM_PAPEIS = ["mentorado", "mentor", "admin"];

export function isInProgram(mentee: { papel?: string | null }): boolean {
  return PROGRAM_PAPEIS.includes(mentee.papel ?? "");
}

// Para páginas. Rotas de API devolvem 403 por conta própria — redirect
// dentro de um fetch() entregaria HTML onde o cliente espera JSON.
export async function requireProgram(supabase: SupabaseClient, user: User) {
  const mentee = await ensureMentee(supabase, user);
  if (!isInProgram(mentee)) {
    redirect("/");
  }
  return mentee;
}
