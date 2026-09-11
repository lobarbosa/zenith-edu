import Link from "next/link";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isMentor } from "@/lib/mentor";
import { ensureMentee } from "@/lib/mentees";
import { isInProgram } from "@/lib/mentee-access";
import { menteeStatus } from "@/lib/mentee-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentor = isMentor(user?.email);
  const cta = mentor ? null : await menteeCta(supabase, user!);

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Sessão ativa
            </h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          {mentor ? (
            <Button asChild>
              <Link href="/mentor">Ir para o Mentor</Link>
            </Button>
          ) : (
            cta
          )}
        </CardContent>
      </Card>
    </main>
  );
}

async function menteeCta(supabase: SupabaseClient, user: User) {
  const mentee = await ensureMentee(supabase, user);

  const [{ data: session }, { data: profile }] = await Promise.all([
    supabase
      .from("diagnostic_sessions")
      .select("status, current_block")
      .eq("mentee_id", mentee.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("executive_profiles")
      .select("status, version, motivo_rejeicao")
      .eq("mentee_id", mentee.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const status = menteeStatus(session, profile);

  if (profile?.status === "validado") {
    // Perfil validado não é o mesmo que aceito: o mentor ainda decide se
    // esta pessoa entra na turma. Mandar pra /jornada aqui daria porta
    // fechada, porque a página recusa quem não foi aceito.
    if (!isInProgram(mentee)) {
      return (
        <p className="text-sm text-muted-foreground">
          Seu Perfil Executivo está pronto e validado. Seu mentor vai retomar contato para
          falar sobre a entrada no programa.
        </p>
      );
    }

    return (
      <Button asChild>
        <Link href="/jornada">Ir para a Jornada</Link>
      </Button>
    );
  }

  if (profile?.status === "rejeitado") {
    return (
      <p className="text-sm text-muted-foreground">
        {status.label}
        {profile.motivo_rejeicao ? ` — ${profile.motivo_rejeicao}` : ""} — seu mentor vai retomar
        contato com você.
      </p>
    );
  }

  if (session?.status === "concluida") {
    return (
      <p className="text-sm text-muted-foreground">
        {status.label} — o mentor vai retornar com a devolutiva.
      </p>
    );
  }

  return (
    <Button asChild>
      <Link href="/diagnostico">
        {session ? "Continuar o Executive Diagnostic" : "Iniciar Executive Diagnostic"}
      </Link>
    </Button>
  );
}
