import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { type ArtifactTipo } from "@/lib/agents/artifact-schemas";
import { StatTile } from "@/components/stat-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MenteeRoster, type RosterEntry } from "./mentee-roster";
import { ValidationQueue, type QueueItem } from "./validation-queue";

function extractMenteeEmail(mentees: { email: string }[] | { email: string } | null) {
  return (Array.isArray(mentees) ? mentees[0] : mentees)?.email ?? "—";
}

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy.ts já faz essa checagem antes de chegar aqui — é só uma
  // camada de UX. Esta é a checagem que decide se o client admin é usado.
  if (!user || !isMentor(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();

  const [
    { data: pendingProfiles, error: profilesError },
    { data: pendingArtifacts, error: artifactsError },
    { data: mentees },
    { data: sessions },
    { data: profiles },
  ] = await Promise.all([
    admin
      .from("executive_profiles")
      .select("id, mentee_id, version, created_at, mentees(email)")
      .eq("status", "rascunho_agente")
      .order("created_at", { ascending: true }),
    admin
      .from("artifacts")
      // artifacts tem duas FKs pra mentees (mentee_id e validado_por) —
      // sem o hint, o PostgREST não sabe qual embutir e retorna 300.
      .select("id, mentee_id, tipo, versao, criado_em, mentees!artifacts_mentee_id_fkey(email)")
      .eq("status", "rascunho_agente")
      .order("criado_em", { ascending: true }),
    admin.from("mentees").select("id, email").order("created_at", { ascending: true }),
    admin
      .from("diagnostic_sessions")
      .select("mentee_id, status, current_block, started_at")
      .order("started_at", { ascending: false }),
    admin
      .from("executive_profiles")
      .select("mentee_id, status, version, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (profilesError || artifactsError) {
    console.error("Falha ao carregar pendências de validação:", {
      profilesError,
      artifactsError,
    });
    throw new Error("Falha ao carregar pendências de validação.");
  }

  // sessions e profiles vêm ordenados do mais recente pro mais antigo — o
  // primeiro find() por mentee_id já pega a versão/sessão mais atual.
  const roster: RosterEntry[] = (mentees ?? []).map((mentee) => ({
    mentee,
    session: sessions?.find((s) => s.mentee_id === mentee.id) ?? null,
    profile: profiles?.find((p) => p.mentee_id === mentee.id) ?? null,
  }));

  // Sinais, pulso e custo migraram para /mentor/console (visão de turma) —
  // aqui fica a fila de validação, que é o fluxo de trabalho do mentor.

  // Fila heterogênea (perfil + tipos de artefato), mais antigo primeiro.
  // Só o cabeçalho de cada item: o conteúdo para revisar abre na tela do
  // mentorado, que já tem o detalhe e as ações de validar e rejeitar.
  const queue: QueueItem[] = [
    ...(pendingProfiles ?? []).map((item) => ({
      kind: "perfil" as const,
      id: item.id,
      menteeId: item.mentee_id,
      menteeEmail: extractMenteeEmail(item.mentees),
      version: item.version,
      createdAt: item.created_at,
    })),
    ...(pendingArtifacts ?? []).map((item) => ({
      kind: item.tipo as ArtifactTipo,
      id: item.id,
      menteeId: item.mentee_id,
      menteeEmail: extractMenteeEmail(item.mentees),
      version: item.versao,
      createdAt: item.criado_em,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <main className="shell space-y-10 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Mentor
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meus mentorados</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sinais, pulso da turma e custo ficam no{" "}
          <Link href="/mentor/console" className="font-medium text-primary hover:underline">
            Console da turma
          </Link>
          .
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Mentorados" value={roster.length} />
        <StatTile label="Pendências de validação" value={queue.length} />
      </div>

      <Card className="py-0">
        <CardContent className="px-0 py-2">
          <MenteeRoster roster={roster} />
        </CardContent>
      </Card>

      {/* gap-3 em vez do gap-6 padrão do Card: com a lista encostando nas
          bordas, o vão do título ficava grande demais. */}
      <Card className="gap-3 py-0">
        <CardHeader className="px-6 pt-5">
          <CardTitle>Pendências de validação</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <ValidationQueue items={queue} />
        </CardContent>
      </Card>
    </main>
  );
}
