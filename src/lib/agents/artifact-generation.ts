import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTIFACT_SCHEMAS, type ArtifactTipo } from "./artifact-schemas";
import { artifactSystemPrompt } from "./artifact-prompt";
import { summarizePerfil, summarizeArtifacts } from "./context";
import { costUsd } from "./pricing";

const ARTIFACT_MODEL = "claude-opus-5";
const MAX_ATTEMPTS = 3; // 1 tentativa + até 2 novas, SPEC-AGENTS.md §11

export type GenerateArtifactResult =
  | { ok: true; artifact: { id: string; tipo: ArtifactTipo; versao: number; status: string } }
  | { ok: false; reason: "sem_conversa" | "falha_geracao" };

// `supabase`: client do próprio mentorado — lê a conversa (RLS já escopa) e
// insere o artefato (policy trava em status = 'rascunho_agente', mesmo
// padrão de executive_profiles). `admin`: só pra gravar em agent_runs, que
// não tem policy nenhuma pra mentorado (SPEC-SOFTWARE.md §7 regra 10).
export async function generateArtifact(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  menteeId: string,
  tipo: ArtifactTipo
): Promise<GenerateArtifactResult> {
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    return { ok: false, reason: "sem_conversa" };
  }

  const transcript = (messages as { role: string; content: string }[])
    .map((m) => `${m.role === "user" ? "Mentorado" : "Copiloto"}: ${m.content}`)
    .join("\n\n");

  const [{ data: profileRow }, { data: existingArtifacts }] = await Promise.all([
    supabase
      .from("executive_profiles")
      .select("perfil")
      .eq("mentee_id", menteeId)
      .eq("status", "validado")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("artifacts")
      .select("tipo, versao, conteudo")
      .eq("mentee_id", menteeId)
      .eq("status", "validado_mentor"),
  ]);

  const contextText = [summarizePerfil(profileRow?.perfil ?? null), summarizeArtifacts(existingArtifacts ?? [])]
    .filter(Boolean)
    .join("\n\n");

  const anthropic = new Anthropic();
  const schema = ARTIFACT_SCHEMAS[tipo];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await anthropic.messages.parse({
        model: ARTIFACT_MODEL,
        max_tokens: 4096,
        system: artifactSystemPrompt(tipo),
        messages: [
          {
            role: "user",
            content: `${contextText ? `Contexto:\n${contextText}\n\n` : ""}Conversa com o copiloto:\n\n${transcript}`,
          },
        ],
        output_config: { format: zodOutputFormat(schema) },
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      totalCostUsd += costUsd(ARTIFACT_MODEL, response.usage.input_tokens, response.usage.output_tokens);

      if (!response.parsed_output) {
        console.error(`generateArtifact(${tipo}): parse falhou na tentativa ${attempt}`);
        continue;
      }

      const artifact = await persistArtifact(supabase, menteeId, tipo, response.parsed_output);
      await logRun(admin, menteeId, tipo, totalInputTokens, totalOutputTokens, totalCostUsd, true);
      return { ok: true, artifact };
    } catch (error) {
      console.error(`generateArtifact(${tipo}): tentativa ${attempt} falhou`, error);
    }
  }

  await logRun(admin, menteeId, tipo, totalInputTokens, totalOutputTokens, totalCostUsd, false);
  console.error(`generateArtifact(${tipo}): esgotou as tentativas para`, menteeId);
  return { ok: false, reason: "falha_geracao" };
}

async function persistArtifact(
  supabase: SupabaseClient,
  menteeId: string,
  tipo: ArtifactTipo,
  conteudo: unknown
) {
  const { data: latest } = await supabase
    .from("artifacts")
    .select("versao")
    .eq("mentee_id", menteeId)
    .eq("tipo", tipo)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.versao ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("artifacts")
    .insert({ mentee_id: menteeId, tipo, versao: nextVersion, conteudo, gerado_por: "career" })
    .select("id, tipo, versao, status")
    .single();

  if (error) throw error;
  return created;
}

async function logRun(
  admin: SupabaseClient,
  menteeId: string,
  tipo: ArtifactTipo,
  inputTokens: number,
  outputTokens: number,
  custoUsd: number,
  sucesso: boolean
) {
  await admin.from("agent_runs").insert({
    mentee_id: menteeId,
    agent_key: `artifact:${tipo}`,
    modelo: ARTIFACT_MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    custo_usd: custoUsd,
    sucesso,
  });
}
