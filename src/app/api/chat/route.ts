import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureMentee } from "@/lib/mentees";
import { routeMessage } from "@/lib/agents/router";
import { AGENT_PILAR, type AgentKey } from "@/lib/agents/router-prompt";
import {
  ensureJourneyState,
  isEtapaLiberada,
  agentEtapa,
  etapaAgent,
  ETAPA_MES,
} from "@/lib/agents/journey";
import {
  CAREER_SYSTEM_PROMPT,
  BUSINESS_SYSTEM_PROMPT,
  VALUE_SYSTEM_PROMPT,
  LEADERSHIP_SYSTEM_PROMPT,
  EXECUTIVE_SYSTEM_PROMPT,
  territoryBridgeInstruction,
  notImplementedInstruction,
} from "@/lib/agents/copilot-prompt";
import { buildContextBlock, summarizePerfil, summarizeArtifacts } from "@/lib/agents/context";
import { searchKnowledge } from "@/lib/knowledge/retrieval";
import { detectSignals } from "@/lib/agents/signals";
import { costUsd } from "@/lib/agents/pricing";
import { CHAT_META_MARKER } from "@/lib/agents/chat-meta";
import { extractAttachment, type NativeBlock } from "@/lib/attachments/extract";
import { ATTACHMENTS_BUCKET, MAX_FILES_PER_MESSAGE } from "@/lib/attachments/limits";

const anthropic = new Anthropic();
const CONVERSATION_MODEL = "claude-sonnet-5";
const ROUTER_MODEL = "claude-haiku-4-5";
const SIGNALS_MODEL = "claude-haiku-4-5";
const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 40;
const ROUTER_HISTORY_LIMIT = 6;

// Os 5 copilotos implementados — a lista completa da spec.
const SYSTEM_PROMPTS: Partial<Record<AgentKey, string>> = {
  career: CAREER_SYSTEM_PROMPT,
  business: BUSINESS_SYSTEM_PROMPT,
  value: VALUE_SYSTEM_PROMPT,
  leadership: LEADERSHIP_SYSTEM_PROMPT,
  executive: EXECUTIVE_SYSTEM_PROMPT,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawMessage = typeof body?.message === "string" ? body.message.trim() : "";
  const attachmentIds = Array.isArray(body?.attachmentIds)
    ? body.attachmentIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (!rawMessage || rawMessage.length > MAX_MESSAGE_LENGTH) {
    return new Response("Mensagem inválida.", { status: 400 });
  }
  if (attachmentIds.length > MAX_FILES_PER_MESSAGE) {
    return new Response(`No máximo ${MAX_FILES_PER_MESSAGE} anexos por mensagem.`, { status: 400 });
  }

  const mentee = await ensureMentee(supabase, user);
  const admin = createAdminClient();

  // RLS de messages combina (OR) a policy do caminho session_id (diagnóstico)
  // com a do caminho conversation_id (copiloto) — filtra aqui pra não
  // misturar transcrição do Executive Diagnostic no histórico do copiloto.
  const { data: recentRows } = await supabase
    .from("messages")
    .select("role, content")
    .not("conversation_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const history = (recentRows ?? []).slice().reverse() as { role: "user" | "assistant"; content: string }[];

  const routerHistoryText = history
    .slice(-ROUTER_HISTORY_LIMIT)
    .map((m) => `${m.role === "user" ? "Mentorado" : "Copiloto"}: ${m.content}`)
    .join("\n");

  const route = await routeMessage(anthropic, routerHistoryText, rawMessage);
  const journey = await ensureJourneyState(admin, mentee.id);

  const liberado = isEtapaLiberada(journey.etapas_liberadas, route.agentKey);
  const requestedImplemented = Boolean(SYSTEM_PROMPTS[route.agentKey]);
  const currentAgent = etapaAgent(journey.etapa_atual);
  const effectiveAgent: AgentKey =
    liberado && requestedImplemented
      ? route.agentKey
      : SYSTEM_PROMPTS[currentAgent]
        ? currentAgent
        : "career";
  const basePrompt = SYSTEM_PROMPTS[effectiveAgent] ?? CAREER_SYSTEM_PROMPT;

  let systemPrompt = basePrompt;
  if (effectiveAgent !== route.agentKey) {
    if (!liberado) {
      const unlockEtapa = agentEtapa(route.agentKey);
      systemPrompt = `${basePrompt}\n\n${territoryBridgeInstruction(route.agentKey, unlockEtapa, ETAPA_MES[unlockEtapa])}`;
    } else {
      systemPrompt = `${basePrompt}\n\n${notImplementedInstruction(route.agentKey)}`;
    }
  }

  const [profileResult, artifactsResult, ragTrechos] = await Promise.all([
    supabase
      .from("executive_profiles")
      .select("perfil")
      .eq("mentee_id", mentee.id)
      .eq("status", "validado")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("artifacts")
      .select("tipo, versao, conteudo")
      .eq("mentee_id", mentee.id)
      .eq("status", "validado_mentor"),
    searchKnowledge(admin, rawMessage, AGENT_PILAR[effectiveAgent], journey.etapas_liberadas),
  ]);

  // Anexos: linhas restritas ao próprio mentorado via RLS (client anon), os
  // bytes vêm do bucket privado via admin (sem policy de Storage pro
  // mentorado). Formato/tamanho já foram validados no upload
  // (POST /api/attachments) — aqui só extrai.
  const attachmentRows =
    attachmentIds.length > 0
      ? (
          await supabase
            .from("attachments")
            .select("id, tipo_mime, storage_path, nome_arquivo")
            .in("id", attachmentIds)
            .eq("mentee_id", mentee.id)
        ).data ?? []
      : [];

  if (attachmentIds.length > 0 && attachmentRows.length !== attachmentIds.length) {
    return new Response("Um ou mais anexos não foram encontrados.", { status: 400 });
  }

  const nativeBlocks: NativeBlock[] = [];
  const anexosTexto: string[] = [];

  for (const row of attachmentRows) {
    const { data: fileData, error: downloadError } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .download(row.storage_path);

    if (downloadError || !fileData) {
      console.error("chat: falha ao baixar anexo", row.id, downloadError);
      continue;
    }

    const bytes = Buffer.from(await fileData.arrayBuffer());
    const extracted = await extractAttachment(row.tipo_mime, bytes);

    if (extracted.kind === "native") {
      nativeBlocks.push(extracted.block);
    } else {
      anexosTexto.push(`Arquivo "${row.nome_arquivo}":\n${extracted.text}`);
    }
  }

  const perfilResumo = summarizePerfil(profileResult.data?.perfil ?? null);
  const contextBlock = buildContextBlock(
    perfilResumo,
    summarizeArtifacts(artifactsResult.data ?? []),
    ragTrechos,
    anexosTexto
  );

  if (contextBlock) {
    systemPrompt = `${systemPrompt}\n\n${contextBlock}`;
  }

  // Conversa contínua por território: reaproveita a mais recente do mesmo
  // agent_key (SPEC-AGENTS.md §4, "continuidade vale"), ou abre uma nova.
  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("mentee_id", mentee.id)
    .eq("agent_key", effectiveAgent)
    .order("ultima_atividade", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId = existingConversation?.id as string | undefined;

  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({ mentee_id: mentee.id, agent_key: effectiveAgent, etapa: agentEtapa(effectiveAgent) })
      .select("id")
      .single();

    if (createError || !created) {
      return new Response("Falha ao abrir conversa.", { status: 500 });
    }
    conversationId = created.id;
  }

  const { data: insertedUserMessage, error: insertUserError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: rawMessage,
      agent_key: effectiveAgent,
    })
    .select("id")
    .single();

  if (insertUserError || !insertedUserMessage) {
    return new Response("Falha ao salvar a mensagem.", { status: 500 });
  }

  if (attachmentRows.length > 0) {
    // O anexo pode ter sido enviado antes de o roteador decidir o
    // território desta mensagem (POST /api/attachments não sabe rotear —
    // ver comentário lá). Corrige conversation_id pro valor real aqui, ao
    // mesmo tempo que vincula message_id. Roda como admin: não há policy
    // de update pro mentorado em attachments (só select/insert).
    await admin
      .from("attachments")
      .update({ conversation_id: conversationId, message_id: insertedUserMessage.id })
      .in(
        "id",
        attachmentRows.map((row) => row.id)
      );
  }

  const conversationMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content:
        nativeBlocks.length > 0
          ? [{ type: "text" as const, text: rawMessage }, ...nativeBlocks]
          : rawMessage,
    },
  ];

  const turnStartedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: CONVERSATION_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
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
        conversation_id: conversationId,
        role: "assistant",
        content: fullText,
        agent_key: effectiveAgent,
      });

      await supabase
        .from("conversations")
        .update({ ultima_atividade: new Date().toISOString() })
        .eq("id", conversationId);

      const signals = await detectSignals(
        admin,
        mentee.id,
        effectiveAgent,
        perfilResumo,
        rawMessage,
        fullText
      );

      await admin.from("agent_runs").insert([
        {
          mentee_id: mentee.id,
          agent_key: "router",
          modelo: ROUTER_MODEL,
          input_tokens: route.inputTokens,
          output_tokens: route.outputTokens,
          custo_usd: route.custoUsd,
        },
        {
          mentee_id: mentee.id,
          agent_key: effectiveAgent,
          modelo: CONVERSATION_MODEL,
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
          custo_usd: conversationCost,
          latencia_ms: latenciaMs,
        },
        {
          mentee_id: mentee.id,
          agent_key: "signals",
          modelo: SIGNALS_MODEL,
          input_tokens: signals.inputTokens,
          output_tokens: signals.outputTokens,
          custo_usd: signals.custoUsd,
        },
      ]);

      const meta = JSON.stringify({ agentKey: effectiveAgent });
      controller.enqueue(encoder.encode(`${CHAT_META_MARKER}${meta}`));
    } catch (error) {
      console.error("chat finalizeTurn falhou", error);
    } finally {
      // Se a chamada à Anthropic falhar (ex.: créditos esgotados, rate
      // limit), o listener "error" do stream já chama controller.error(),
      // que fecha o controller — fechar de novo aqui lança "Controller is
      // already closed" como unhandled rejection. Fechar é inofensivo
      // quando já fechado; só a exceção precisa ser engolida.
      try {
        controller.close();
      } catch {
        // já fechado por controller.error() no listener "error" do stream
      }
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
