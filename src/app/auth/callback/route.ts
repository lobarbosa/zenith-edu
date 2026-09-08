import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureMentee } from "@/lib/mentees";

// `next`: só usado pelo link de redefinição de senha (login-form.tsx),
// pra cair em /redefinir-senha em vez da home depois de trocar o código.
// Sempre relativo — nunca redireciona pra fora do próprio domínio.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      if (safeNext === "/") {
        await ensureMentee(supabase, data.user);
      }
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
