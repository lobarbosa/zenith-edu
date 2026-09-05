import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DIAGNOSTIC_SYSTEM_PROMPT } from "@/lib/agents/diagnostic-prompt";

const anthropic = new Anthropic();

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 4000;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isValidMessages(value: unknown): value is IncomingMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
    return false;
  }

  return value.every(
    (message) =>
      typeof message === "object" &&
      message !== null &&
      (message as IncomingMessage).role &&
      ["user", "assistant"].includes((message as IncomingMessage).role) &&
      typeof (message as IncomingMessage).content === "string" &&
      (message as IncomingMessage).content.length > 0 &&
      (message as IncomingMessage).content.length <= MAX_MESSAGE_LENGTH
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autenticado.", { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body || !isValidMessages(body.messages)) {
    return new Response("Corpo da requisição inválido.", { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: DIAGNOSTIC_SYSTEM_PROMPT,
    messages: body.messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      stream.on("text", (text) => {
        controller.enqueue(encoder.encode(text));
      });
      stream.on("end", () => controller.close());
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
