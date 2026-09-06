import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ExecutiveProfileSchema } from "@/lib/agents/executive-profile-schema";
import { StatusPill } from "@/components/status-pill";
import { menteeStatus } from "../mentee-status";
import { ProfileDetail } from "../profile-detail";
import { ValidateButton } from "../validate-button";
import { Transcript } from "../transcript";

const STATUS_LABEL = { rascunho_agente: "Rascunho do agente", validado: "Validado" };
const STATUS_TONE = { rascunho_agente: "warning", validado: "good" } as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function MenteeDetailPage(props: PageProps<"/mentor/[menteeId]">) {
  const { menteeId } = await props.params;

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

  const { data: mentee } = await admin
    .from("mentees")
    .select("id, email, created_at")
    .eq("id", menteeId)
    .maybeSingle();

  if (!mentee) {
    notFound();
  }

  const { data: session } = await admin
    .from("diagnostic_sessions")
    .select(
      "id, status, current_block, started_at, completed_at, input_tokens, output_tokens, custo_usd"
    )
    .eq("mentee_id", menteeId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: messages } = session
    ? await admin
        .from("messages")
        .select("role, content, block")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: profiles } = await admin
    .from("executive_profiles")
    .select("id, version, status, perfil, created_at, validated_at")
    .eq("mentee_id", menteeId)
    .order("version", { ascending: false });

  const latestProfile = profiles?.[0]
    ? { status: profiles[0].status, version: profiles[0].version }
    : null;
  const status = menteeStatus(
    session ? { status: session.status, current_block: session.current_block } : null,
    latestProfile
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/mentor" className="text-xs text-muted-foreground hover:text-foreground">
        ← Meus mentorados
      </Link>

      <div className="mt-4 mb-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Founding Cohort
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {mentee.email}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            mentorado desde {formatDate(mentee.created_at)}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Executive Diagnostic
        </h2>
        {!session ? (
          <p className="text-sm text-muted-foreground">Ainda não iniciou o diagnóstico.</p>
        ) : (
          <>
            <dl className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Iniciado em</dt>
                <dd className="font-medium text-foreground">{formatDate(session.started_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Concluído em</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(session.completed_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tokens</dt>
                <dd className="font-medium text-foreground">
                  {(session.input_tokens + session.output_tokens).toLocaleString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Custo</dt>
                <dd className="font-medium text-foreground">
                  US$ {Number(session.custo_usd).toFixed(4)}
                </dd>
              </div>
            </dl>
            <Transcript messages={messages ?? []} />
          </>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
          Perfil Executivo
        </h2>
        {!profiles || profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não foi sintetizado.</p>
        ) : (
          <div className="space-y-10">
            {profiles.map((item) => {
              const parsed = ExecutiveProfileSchema.safeParse(item.perfil);
              return (
                <div
                  key={item.id}
                  className="space-y-4 border-t border-border pt-8 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        versão {item.version}
                      </p>
                      <StatusPill tone={STATUS_TONE[item.status as keyof typeof STATUS_TONE]}>
                        {STATUS_LABEL[item.status as keyof typeof STATUS_LABEL]}
                      </StatusPill>
                    </div>
                    {item.status === "rascunho_agente" && <ValidateButton profileId={item.id} />}
                  </div>
                  {parsed.success ? (
                    <ProfileDetail perfil={parsed.data} />
                  ) : (
                    <p className="text-sm text-destructive">
                      Este registro não bate com o schema esperado — não valide sem checar
                      manualmente.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
