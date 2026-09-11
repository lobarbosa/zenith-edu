import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ExecutiveProfileSchema } from "@/lib/agents/executive-profile-schema";
import { ARTIFACT_LABELS, type ArtifactTipo } from "@/lib/agents/artifact-schemas";
import { ArtifactDetail } from "@/components/artifact-detail";
import { StatTile } from "@/components/stat-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProfileDetail } from "./profile-detail";
import { ReviewActions } from "./review-actions";
import { MenteeRoster, type RosterEntry } from "./mentee-roster";

type PendingItem = {
  kind: "perfil" | ArtifactTipo;
  id: string;
  menteeEmail: string;
  version: number;
  createdAt: string;
  payload: unknown;
};

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
      .select("id, version, perfil, created_at, mentees(email)")
      .eq("status", "rascunho_agente")
      .order("created_at", { ascending: true }),
    admin
      .from("artifacts")
      // artifacts tem duas FKs pra mentees (mentee_id e validado_por) —
      // sem o hint, o PostgREST não sabe qual embutir e retorna 300.
      .select("id, tipo, versao, conteudo, criado_em, mentees!artifacts_mentee_id_fkey(email)")
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

  // Fila heterogênea (perfil + 3 tipos de artefato), mais antigo primeiro —
  // mesma ordem que já valia só pra perfis.
  const queue: PendingItem[] = [
    ...(pendingProfiles ?? []).map((item) => ({
      kind: "perfil" as const,
      id: item.id,
      menteeEmail: extractMenteeEmail(item.mentees),
      version: item.version,
      createdAt: item.created_at,
      payload: item.perfil,
    })),
    ...(pendingArtifacts ?? []).map((item) => ({
      kind: item.tipo as ArtifactTipo,
      id: item.id,
      menteeEmail: extractMenteeEmail(item.mentees),
      version: item.versao,
      createdAt: item.criado_em,
      payload: item.conteudo,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-6 py-10">
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

      <Card>
        <CardHeader>
          <CardTitle>Pendências de validação</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente no momento.</p>
          ) : (
            <div className="space-y-10">
              {queue.map((item) => (
                <section
                  key={`${item.kind}-${item.id}`}
                  className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.menteeEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.kind === "perfil" ? "Perfil Executivo" : ARTIFACT_LABELS[item.kind]} ·
                        versão {item.version}
                      </p>
                    </div>
                    {item.kind === "perfil" ? (
                      <ReviewActions profileId={item.id} />
                    ) : (
                      <ReviewActions artifactId={item.id} />
                    )}
                  </div>

                  {item.kind === "perfil" ? (
                    (() => {
                      const parsed = ExecutiveProfileSchema.safeParse(item.payload);
                      return parsed.success ? (
                        <ProfileDetail perfil={parsed.data} />
                      ) : (
                        <p className="text-sm text-destructive">
                          Este registro não bate com o schema esperado — não valide sem checar
                          manualmente.
                        </p>
                      );
                    })()
                  ) : (
                    <ArtifactDetail tipo={item.kind} conteudo={item.payload} />
                  )}
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </main>
  );
}
