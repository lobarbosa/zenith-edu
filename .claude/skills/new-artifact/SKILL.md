---
name: new-artifact
description: "Como adicionar ou alterar um tipo de artefato no T-Shaped Executive (career_map, business_map, value_creation_map, leadership_map, executive_positioning_map, executive_movement_plan e afins). Use quando a tarefa envolver criar um artefato novo, mudar o schema de um existente, ajustar como ele é gerado pelo Opus ou como aparece na tela do mentorado e do mentor. Carrega a ordem dos arquivos e as armadilhas que já causaram bug real (enum sem nullable, etapa do artefato vs. etapa do agente)."
---

# Artefato: adicionar ou alterar

Três arquivos, nesta ordem. O resto do caminho é genérico e não precisa
ser tocado.

## 1. `src/lib/agents/artifact-schemas.ts`

Schema Zod, o type inferido, e **cinco** mapeamentos. Esquecer um deles
compila, mas quebra em runtime ou some da UI.

```ts
export const MeuMapaSchema = z.object({ /* ... */ });
export type MeuMapa = z.infer<typeof MeuMapaSchema>;
```

| Mapeamento | Para que serve |
|---|---|
| `ARTIFACT_TIPOS` | Aceito por `POST /api/artifact`; ordem da listagem |
| `ARTIFACT_SCHEMAS` | Parse na geração e na renderização |
| `ARTIFACT_LABELS` | Rótulo em português na UI |
| `ARTIFACT_AGENT` | Qual copiloto gera — filtra a transcrição que embasa a geração |
| `ARTIFACT_ETAPA` | Em que etapa libera — gate de `/api/artifact` e filtro de `/jornada` |

### Armadilha 1 — todo enum precisa de `.nullable()`

Bug real, já custou três tentativas de geração esgotadas. A regra do
prompt manda deixar vazio o campo sem base na conversa; o modelo tenta
emitir string vazia num enum e o Zod rejeita.

```ts
nivel: z.enum(["inicial", "solido"]).nullable(),   // certo
nivel: z.enum(["inicial", "solido"]),              // esgota as tentativas
```

Vale para `boolean` também: `z.boolean().nullable()`. String e array
ficam vazios (`""`, `[]`), não `null`.

### Armadilha 2 — `ARTIFACT_ETAPA` não é a etapa do agente

`agentEtapa()` (em `journey.ts`) devolve a etapa em que o *agente* abre.
O copiloto `executive` cobre duas etapas — INFLUENCE e MOVE — com um
artefato em cada. Sem `ARTIFACT_ETAPA` os dois ficariam presos a
INFLUENCE: liberados cedo demais, e o `executive_movement_plan` nunca
apareceria em MOVE.

## 2. `src/lib/agents/artifact-prompt.ts`

Uma entrada em `ARTIFACT_FOCUS`: uma frase dizendo o que organizar, na
ordem dos campos do schema. `GENERATION_RULES` é comum aos oito tipos —
não escreva nada ali que só valha para um artefato.

## 3. `src/components/artifact-detail.tsx`

Um componente `MeuMapaDetail` e o branch correspondente no dispatch do
`ArtifactDetail` no fim do arquivo.

- Lista vazia renderiza `<EmptyNote />`, nunca nada. A spec exige marcação
  explícita do que falta — o mentorado lê isso como diagnóstico.
- Campo de opção fixa que chegou `null` vira `"Ainda não avaliado"`, com
  uma função `xLabel(v: string | null)` no padrão dos vizinhos. Nunca
  esconda o campo.

## Não precisa tocar

- `POST /api/artifact` — valida contra `ARTIFACT_TIPOS` e o gate de etapa
- `artifact-generation.ts` — Opus com retry, já genérico
- `/jornada` — filtra por `ARTIFACT_ETAPA[tipo] === etapa_atual`
- `/mentor` e `/mentor/[menteeId]` — fila e validação já genéricas

## Regras que não mudam

- Todo campo rastreia a uma fala do mentorado ou a artefato anterior
  validado. Nunca inferir, nunca inventar.
- Nasce em `rascunho_agente`. Versionado — nova versão, nunca sobrescrever.
- Um artefato incompleto é melhor que um plausível e errado.

Feche com a skill `validate-delivery`.
