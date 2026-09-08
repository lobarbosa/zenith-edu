import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILE_SYSTEM_PROMPT } from "./profile-prompt";
import { ExecutiveProfileSchema } from "./executive-profile-schema";
import { costUsd } from "./pricing";

const PROFILE_MODEL = "claude-opus-5";
const MAX_ATTEMPTS = 3; // 1 tentativa + até 2 novas, per SPEC-SOFTWARE.md §11

type DiagnosticSessionRef = {
  id: string;
  mentee_id: string;
};

// Roda depois que o diagnóstico fecha (bloco 8, encerramento). Nunca lança
// — uma falha de síntese não pode derrubar o fluxo do mentorado, que já
// terminou a conversa dele. Registra o erro e retorna null.
// `admin`: só pra gravar em agent_runs (sem policy pra mentorado, mesmo
// padrão de generateArtifact em artifact-generation.ts).
export async function synthesizeExecutiveProfile(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  session: DiagnosticSessionRef
) {
  const startedAt = Date.now();
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (messagesError || !messages || messages.length === 0) {
    console.error("synthesizeExecutiveProfile: sem transcrição", messagesError);
    return null;
  }

  const latenciaMs = () => Date.now() - startedAt;

  const transcript = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "Mentorado" : "Agente"}: ${m.content}`
    )
    .join("\n\n");

  const anthropic = new Anthropic();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await anthropic.messages.parse({
        model: PROFILE_MODEL,
        max_tokens: 4096,
        system: PROFILE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Transcrição do Executive Diagnostic:\n\n${transcript}` }],
        output_config: { format: zodOutputFormat(ExecutiveProfileSchema) },
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      totalCostUsd += costUsd(PROFILE_MODEL, response.usage.input_tokens, response.usage.output_tokens);

      if (!response.parsed_output) {
        console.error(`synthesizeExecutiveProfile: parse falhou na tentativa ${attempt}`);
        continue;
      }

      const profile = await persistProfile(supabase, session, response.parsed_output);
      await accumulateSessionCost(supabase, session.id, totalInputTokens, totalOutputTokens, totalCostUsd);
      await logRun(admin, session.mentee_id, totalInputTokens, totalOutputTokens, totalCostUsd, true, latenciaMs());
      return profile;
    } catch (error) {
      console.error(`synthesizeExecutiveProfile: tentativa ${attempt} falhou`, error);
    }
  }

  await accumulateSessionCost(supabase, session.id, totalInputTokens, totalOutputTokens, totalCostUsd);
  await logRun(admin, session.mentee_id, totalInputTokens, totalOutputTokens, totalCostUsd, false, latenciaMs());
  console.error("synthesizeExecutiveProfile: esgotou as tentativas para a sessão", session.id);
  return null;
}

async function logRun(
  admin: SupabaseClient,
  menteeId: string,
  inputTokens: number,
  outputTokens: number,
  custoUsd: number,
  sucesso: boolean,
  latenciaMs: number
) {
  await admin.from("agent_runs").insert({
    mentee_id: menteeId,
    agent_key: "perfil",
    modelo: PROFILE_MODEL,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    custo_usd: custoUsd,
    sucesso,
    latencia_ms: latenciaMs,
  });
}

async function persistProfile(
  supabase: SupabaseClient,
  session: DiagnosticSessionRef,
  perfil: unknown
) {
  const { data: latest } = await supabase
    .from("executive_profiles")
    .select("version")
    .eq("session_id", session.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data: created, error } = await supabase
    .from("executive_profiles")
    .insert({
      session_id: session.id,
      mentee_id: session.mentee_id,
      version: nextVersion,
      perfil,
    })
    .select("id, version, status")
    .single();

  if (error) throw error;
  return created;
}

async function accumulateSessionCost(
  supabase: SupabaseClient,
  sessionId: string,
  inputTokens: number,
  outputTokens: number,
  costUsdDelta: number
) {
  const { data: current } = await supabase
    .from("diagnostic_sessions")
    .select("input_tokens, output_tokens, custo_usd")
    .eq("id", sessionId)
    .single();

  await supabase
    .from("diagnostic_sessions")
    .update({
      input_tokens: (current?.input_tokens ?? 0) + inputTokens,
      output_tokens: (current?.output_tokens ?? 0) + outputTokens,
      custo_usd: Number(current?.custo_usd ?? 0) + costUsdDelta,
    })
    .eq("id", sessionId);
}
