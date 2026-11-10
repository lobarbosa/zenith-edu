import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeHistory, capTranscript } from "@/lib/agents/history";
import { ownsStoragePath } from "@/lib/attachments/ownership";

const u = (content: string) => ({ role: "user" as const, content });
const a = (content: string) => ({ role: "assistant" as const, content });

test("histórico saudável passa intacto", () => {
  const rows = [u("oi"), a("olá"), u("e agora?"), a("vamos")];
  assert.deepEqual(normalizeHistory(rows), rows);
});

test("janela que começa por assistant é aparada até o primeiro user", () => {
  // É o que sobra quando um turno órfão vira a paridade da janela de 40.
  assert.deepEqual(normalizeHistory([a("resto"), u("pergunta"), a("resposta")]), [
    u("pergunta"),
    a("resposta"),
  ]);
});

test("mensagem vazia sai do histórico", () => {
  assert.deepEqual(normalizeHistory([u("oi"), a(""), a("  \n"), u("de novo")]), [
    u("oi"),
    u("de novo"),
  ]);
});

test("sem nenhuma mensagem de user não sobra nada", () => {
  assert.deepEqual(normalizeHistory([a("só agente")]), []);
});

test("transcrição dentro do teto não é tocada", () => {
  assert.deepEqual(capTranscript("abc", 10), { transcript: "abc", truncado: false });
});

test("transcrição acima do teto preserva o trecho mais recente", () => {
  assert.deepEqual(capTranscript("0123456789", 4), { transcript: "6789", truncado: true });
});

test("caminho de anexo só vale sob o prefixo do próprio mentorado", () => {
  assert.equal(ownsStoragePath("abc", "abc/conv/arquivo.pdf"), true);
  assert.equal(ownsStoragePath("abc", "outro/conv/arquivo.pdf"), false);
  assert.equal(ownsStoragePath("abc", "abcd/conv/arquivo.pdf"), false);
  assert.equal(ownsStoragePath("abc", "abc/../outro/arquivo.pdf"), false);
  assert.equal(ownsStoragePath("", "/conv/arquivo.pdf"), false);
});
