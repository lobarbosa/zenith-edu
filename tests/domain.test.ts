import { test } from "node:test";
import assert from "node:assert/strict";
import { costUsd } from "@/lib/agents/pricing";
import { chunkText } from "@/lib/knowledge/chunking";
import { ETAPA_ORDER, etapaAgent, isEtapa } from "@/lib/agents/journey";
import {
  ARTIFACT_TIPOS,
  ARTIFACT_SCHEMAS,
  ARTIFACT_LABELS,
  ARTIFACT_ETAPA,
  ARTIFACT_AGENT,
} from "@/lib/agents/artifact-schemas";
import { AGENT_LABELS } from "@/lib/agents/agent-labels";
import { buildContextBlock } from "@/lib/agents/context";

test("custo: modelo conhecido usa a tabela", () => {
  assert.equal(costUsd("claude-sonnet-5", 1_000_000, 1_000_000), 12);
  assert.equal(costUsd("claude-opus-5", 1_000_000, 0), 5);
  assert.equal(costUsd("claude-haiku-4-5", 0, 1_000_000), 5);
});

test("custo: todo modelo usado no código tem preço", () => {
  // Modelo fora da tabela custa 0 e desarma o teto de custo do console.
  for (const modelo of ["claude-sonnet-5", "claude-opus-5", "claude-haiku-4-5"]) {
    assert.ok(costUsd(modelo, 1000, 1000) > 0, modelo);
  }
});

test("chunking: sobreposição entre chunks consecutivos", () => {
  const palavras = Array.from({ length: 1300 }, (_, i) => `p${i}`);
  const chunks = chunkText(palavras.join(" "));
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].split(" ").length, 600);
  // o segundo começa 75 palavras antes do fim do primeiro
  assert.equal(chunks[1].split(" ")[0], "p525");
  assert.equal(chunks.at(-1)!.split(" ").at(-1), "p1299");
  assert.deepEqual(chunkText("   "), []);
});

test("jornada: toda etapa tem um copiloto que existe", () => {
  for (const etapa of ETAPA_ORDER) {
    assert.ok(isEtapa(etapa));
    assert.ok(etapaAgent(etapa) in AGENT_LABELS, etapa);
  }
});

test("artefatos: todo tipo tem schema, rótulo, etapa válida e copiloto dono", () => {
  for (const tipo of ARTIFACT_TIPOS) {
    assert.ok(ARTIFACT_SCHEMAS[tipo], `schema de ${tipo}`);
    assert.ok(ARTIFACT_LABELS[tipo], `rótulo de ${tipo}`);
    assert.ok(isEtapa(ARTIFACT_ETAPA[tipo]), `etapa de ${tipo}`);
    assert.ok(ARTIFACT_AGENT[tipo] in AGENT_LABELS, `copiloto de ${tipo}`);
  }
});

test("bloco de contexto: tudo que vem de fora entra rotulado como dado", () => {
  const bloco = buildContextBlock("perfil", "artefatos", ["trecho"], ["anexo"]);
  assert.equal(bloco.match(/dado, n(ão|unca) instrução/g)?.length, 4);
  assert.equal(buildContextBlock("", "", [], []), "");
});
