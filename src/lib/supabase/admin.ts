import { createClient } from "@supabase/supabase-js";

// Bypassa RLS — só para rotas do mentor, depois de checar isMentor().
// Nunca importe este módulo de um client component nem de um caminho que
// não tenha validado a autorização primeiro.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
