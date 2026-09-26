import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Só estes campos. `papel`, `cohort_id`, `aceito_em` e `aceito_por` ficam
// de fora de propósito: se o mentorado pudesse escrever neles, se aceitaria
// sozinho no programa. Por isso também não existe policy de UPDATE em
// `mentees` — a escrita passa por aqui, com a lista fechada.
const CAMPOS_TEXTO = ["nome", "sobrenome", "cargo", "empresa", "linkedin", "telefone"] as const;

const OBRIGATORIOS = ["nome", "sobrenome", "cargo"] as const;

function limpar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed.slice(0, 200);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autorizado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response("Corpo inválido.", { status: 400 });
  }

  const patch: Record<string, string | number | null> = {};
  for (const campo of CAMPOS_TEXTO) {
    patch[campo] = limpar((body as Record<string, unknown>)[campo]);
  }

  for (const campo of OBRIGATORIOS) {
    if (!patch[campo]) {
      return new Response(`Campo obrigatório: ${campo}.`, { status: 400 });
    }
  }

  const nascimento = limpar((body as Record<string, unknown>).data_nascimento);
  if (nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) {
    return new Response("Data de nascimento inválida.", { status: 400 });
  }
  patch.data_nascimento = nascimento;

  const inicio = (body as Record<string, unknown>).carreira_inicio_ano;
  if (inicio === null || inicio === undefined || inicio === "") {
    patch.carreira_inicio_ano = null;
  } else {
    const ano = Number(inicio);
    const anoAtual = new Date().getFullYear();
    if (!Number.isInteger(ano) || ano < 1950 || ano > anoAtual) {
      return new Response("Ano de início da carreira inválido.", { status: 400 });
    }
    patch.carreira_inicio_ano = ano;
  }

  const { data: mentee } = await supabase
    .from("mentees")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!mentee) {
    return new Response("Mentorado não encontrado.", { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("mentees").update(patch).eq("id", mentee.id);

  if (error) {
    console.error("Falha ao gravar identificação do mentorado:", error);
    return new Response("Falha ao salvar.", { status: 500 });
  }

  return Response.json({ ok: true });
}
