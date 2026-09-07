import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState } from "@/lib/agents/journey";

const TIPO_LABEL: Record<string, string> = {
  playbook: "Playbook",
  framework: "Framework",
  transcricao: "Transcrição",
  bibliografia: "Bibliografia",
  caso: "Caso",
};

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);
  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, mentee.id);

  // Sem policy de RLS pra knowledge_documents de propósito (0004_fase1_schema.sql)
  // — mentorado nunca acessa a tabela direto, só via este server component
  // com service_role, filtrado por visibilidade e etapa liberada.
  const { data: documents } = await admin
    .from("knowledge_documents")
    .select("id, titulo, tipo, pilar, etapas")
    .eq("visibilidade", "turma")
    .overlaps("etapas", journey.etapas_liberadas)
    .order("criado_em", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Biblioteca
      </p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        Playbooks e frameworks
      </h1>

      {!documents || documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada liberado ainda para a sua etapa atual.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/biblioteca/${doc.id}`}
                className="flex items-center justify-between gap-4 py-5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
              >
                <span className="text-sm font-medium text-foreground">{doc.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {TIPO_LABEL[doc.tipo] ?? doc.tipo}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
