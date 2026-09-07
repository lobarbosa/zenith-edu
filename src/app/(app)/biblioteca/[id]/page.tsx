import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { ensureJourneyState } from "@/lib/agents/journey";

export default async function BibliotecaDocumentPage(props: PageProps<"/biblioteca/[id]">) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);
  const admin = createAdminClient();
  const journey = await ensureJourneyState(admin, mentee.id);

  // Mesma trava da lista: visibilidade + etapa liberada checadas de novo
  // aqui, não só na listagem — o id na URL não é permissão.
  const { data: document } = await admin
    .from("knowledge_documents")
    .select("id, titulo, conteudo")
    .eq("id", id)
    .eq("visibilidade", "turma")
    .overlaps("etapas", journey.etapas_liberadas)
    .maybeSingle();

  if (!document) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/biblioteca"
        className="text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        ← Biblioteca
      </Link>
      <h1 className="mb-8 mt-4 text-2xl font-semibold tracking-tight text-foreground">
        {document.titulo}
      </h1>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {document.conteudo}
      </div>
    </main>
  );
}
