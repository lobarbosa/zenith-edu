import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIAGNOSTIC_SYSTEM_PROMPT } from "@/lib/agents/diagnostic-prompt";
import { DIAGNOSTIC_KICKOFF_MESSAGE, DIAGNOSTIC_META_MARKER } from "@/lib/agents/diagnostic-kickoff";
import { classifyDiagnosticProgress } from "@/lib/agents/diagnostic-block-classifier";
import { synthesizeExecutiveProfile } from "@/lib/agents/executive-profile";
import { costUsd } from "@/lib/agents/pricing";

const anthropic = new Anthropic();
const CONVERSATION_MODEL = "claude-sonnet-5";
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId;

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return new Response("sessionId é obrigatório.", { status: 400 });
  }

  // RLS garante que só retorna a sessão se pertencer ao usuário autenticado.
  const { data: session } = await supabase
    .from("diagnostic_sessions")
    .select("id, status, current_block, mentee_id")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return new Response("Sessão não encontrada.", { status: 404 });
  }

  if (session.status === "concluida") {
    return new Response("Este diagnóstico já foi concluído.", { status: 400 });
  }

  const currentBlock = session.current_block;
  const menteeId = session.mentee_id;

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  const hasMessage = rawMessage.length > 0 && rawMessage.length <= MAX_MESSAGE_LENGTH;

  const { data: existingMessages, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (historyError) {
    return new Response("Falha ao carregar o histórico.", { status: 500 });
  }

  if (!hasMessage && (existingMessages?.length ?? 0) > 0) {
    return new Response("Mensagem inválida.", { status: 400 });
  }

  const userText = hasMessage ? rawMessage : DIAGNOSTIC_KICKOFF_MESSAGE;

  const { error: insertUserError } = await supabase.from("messages").insert({
    session_id: sessionId,
    role: "user",
    content: userText,
    block: currentBlock,
  });

  if (insertUserError) {
    return new Response("Falha ao salvar a mensagem.", { status: 500 });
  }

  const conversationMessages = [
    ...(existingMessages ?? []),
    { role: "user" as const, content: userText },
  ];

  const turnStartedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: CONVERSATION_MODEL,
    max_tokens: 2048,
    system: DIAGNOSTIC_SYSTEM_PROMPT,
    messages: conversationMessages,
  });

  const encoder = new TextEncoder();
  let fullText = "";

  async function finalizeTurn(controller: ReadableStreamDefaultController<Uint8Array>) {
    try {
      const finalMessage = await stream.finalMessage();
      const latenciaMs = Date.now() - turnStartedAt;
      const conversationCost = costUsd(
        CONVERSATION_MODEL,
        finalMessage.usage.input_tokens,
        finalMessage.usage.output_tokens
      );

      await supabase.from("messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: fullText,
        block: currentBlock,
      });

      const classification = await classifyDiagnosticProgress(
        anthropic,
        currentBlock,
        fullText
      );

      const { data: current } = await supabase
        .from("diagnostic_sessions")
        .select("input_tokens, output_tokens, custo_usd")
        .eq("id", sessionId)
        .single();

      await supabase
        .from("diagnostic_sessions")
        .update({
          current_block: classification.bloco,
          status: classification.concluido ? "concluida" : "em_andamento",
          completed_at: classification.concluido ? new Date().toISOString() : null,
          input_tokens: (current?.input_tokens ?? 0) + finalMessage.usage.input_tokens + classification.inputTokens,
          output_tokens: (current?.output_tokens ?? 0) + finalMessage.usage.output_tokens + classification.outputTokens,
          custo_usd: Number(current?.custo_usd ?? 0) + conversationCost + classification.custoUsd,
        })
        .eq("id", sessionId);

      const admin = createAdminClient();
      // agent_runs: mesma observabilidade de custo/latência que copiloto e
      // artefato já têm (SPEC-SOFTWARE.md §7 regra 10) — o diagnóstico só
      // acumulava custo em diagnostic_sessions até aqui, sem entrar no
      // Mentor Console (Fase 4, §13: alerta de latência de primeira
      // resposta usa esta tabela).
      await admin.from("agent_runs").insert({
        mentee_id: menteeId,
        agent_key: "diagnostic",
        modelo: CONVERSATION_MODEL,
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
        custo_usd: conversationCost,
        latencia_ms: latenciaMs,
      });

      if (classification.concluido) {
        await synthesizeExecutiveProfile(supabase, admin, { id: sessionId, mentee_id: menteeId });
      }

      const meta = JSON.stringify({ bloco: classification.bloco, concluido: classification.concluido });
      controller.enqueue(encoder.encode(`${DIAGNOSTIC_META_MARKER}${meta}`));
    } catch (error) {
      console.error("diagnostic finalizeTurn falhou", error);
    } finally {
      controller.close();
    }
  }

  const readable = new ReadableStream({
    start(controller) {
      stream.on("text", (text) => {
        fullText += text;
        controller.enqueue(encoder.encode(text));
      });

      stream.on("end", () => {
        void finalizeTurn(controller);
      });

      stream.on("error", (error) => controller.error(error));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
