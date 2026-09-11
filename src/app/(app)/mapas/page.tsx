import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProgram } from "@/lib/mentee-access";
import { ARTIFACT_LABELS, ARTIFACT_ETAPA, type ArtifactTipo } from "@/lib/agents/artifact-schemas";
import { StatusPill } from "@/components/status-pill";
import { ArtifactDetail } from "@/components/artifact-detail";
import { Card, CardContent } from "@/components/ui/card";

type ArtifactRow = {
  id: string;
  tipo: ArtifactTipo;
  versao: number;
  status: "rascunho_agente" | "validado_mentor" | "rejeitado";
  conteudo: unknown;
};

const STATUS_LABEL = {
  rascunho_agente: "Em revisão do mentor",
  validado_mentor: "Validado",
  rejeitado: "Rejeitado pelo mentor",
};
const STATUS_TONE = { rascunho_agente: "warning", validado_mentor: "good", rejeitado: "bad" } as const;

export default async function MapasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo: tipoParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await requireProgram(supabase, user!);

  // Diferente de /jornada, que mostra só a etapa corrente: aqui o mentorado
  // vê o acervo inteiro — o Career Map do mês 1 continua alcançável no mês 5.
  const { data } = await supabase
    .from("artifacts")
    .select("id, tipo, versao, status, conteudo")
    .eq("mentee_id", mentee.id)
    .order("versao", { ascending: false });

  const rows = (data ?? []) as ArtifactRow[];

  // Uma entrada por tipo, sempre a versão mais recente (a query já ordena).
  const latestByTipo = new Map<ArtifactTipo, ArtifactRow>();
  for (const row of rows) {
    if (!latestByTipo.has(row.tipo)) latestByTipo.set(row.tipo, row);
  }
  const items = [...latestByTipo.values()];

  const selected = items.find((item) => item.tipo === tipoParam) ?? items[0];

  return (
    <main className="shell space-y-8 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Mapas</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Artefatos por etapa
        </h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que você e o copiloto construíram até aqui, das etapas já percorridas às atuais.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Nenhum artefato ainda. Eles nascem das conversas com o copiloto e aparecem aqui depois
              de gerados — comece pela{" "}
              <Link href="/jornada" className="font-medium text-primary hover:underline">
                Jornada
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-[280px_1fr] md:items-start">
          <Card>
            <CardContent className="space-y-1 p-2">
              {items.map((item) => {
                const isSelected = selected?.tipo === item.tipo;
                return (
                  <Link
                    key={item.tipo}
                    href={`/mapas?tipo=${item.tipo}`}
                    aria-current={isSelected ? "true" : undefined}
                    className={`block rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                      isSelected ? "bg-secondary" : "hover:bg-secondary/60"
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {ARTIFACT_LABELS[item.tipo]}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {ARTIFACT_ETAPA[item.tipo]} · versão {item.versao}
                    </span>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {ARTIFACT_LABELS[selected.tipo]}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ARTIFACT_ETAPA[selected.tipo]} · versão {selected.versao}
                    </p>
                  </div>
                  <StatusPill tone={STATUS_TONE[selected.status]}>
                    {STATUS_LABEL[selected.status]}
                  </StatusPill>
                </div>

                <ArtifactDetail tipo={selected.tipo} conteudo={selected.conteudo} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
