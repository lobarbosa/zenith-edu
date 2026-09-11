---
name: copilot-anatomy
description: "Mapa das camadas de um copiloto do T-Shaped Executive (Career, Business, Value, Leadership, Executive) e de como o roteamento entre eles funciona. Use quando a tarefa envolver alterar o prompt ou o território de um copiloto, mexer no roteador, na liberação de etapas da jornada, no filtro de RAG por pilar, ou entender por que um copiloto respondeu no lugar de outro. Carrega os seis arquivos que definem um copiloto e o que é regra travada da spec."
---

# Anatomia de um copiloto

Os cinco copilotos da spec existem e estão completos: `career`,
`business`, `value`, `leadership`, `executive`. Um sexto seria mudança de
produto — pergunte antes de escrever código.

## As seis camadas

| # | Arquivo | O que define |
|---|---|---|
| 1 | `src/lib/agents/copilot-prompt.ts` | `COPILOT_BASE_PROMPT` + o prompt do território → `X_SYSTEM_PROMPT` |
| 2 | `src/lib/agents/router-prompt.ts` | Linha de território no `ROUTER_SYSTEM_PROMPT`, `AgentKey`, `AGENT_KEYS`, `AGENT_PILAR` |
| 3 | `src/lib/agents/journey.ts` | `AGENT_ETAPAS` — em que etapa o território abre |
| 4 | `src/app/api/chat/route.ts` | `SYSTEM_PROMPTS` |
| 5 | `src/lib/agents/agent-labels.ts` | `AGENT_LABELS` — assinatura na UI |
| 6 | `src/lib/agents/artifact-schemas.ts` | `ARTIFACT_AGENT` — que artefatos ele gera |

`SYSTEM_PROMPTS` é `Record<AgentKey, string>` total, de propósito: um
`AgentKey` novo quebra o type em vez de cair num fallback silencioso.

**Só `agent-labels.ts` é seguro em client component** — é o único da
lista sem prompt. Os outros cinco nunca podem ser importados do cliente;
o prompt do sistema não pode ser recuperável pelo usuário.

## Como o roteamento decide

**O roteador classifica por ETAPA, não por copiloto.** Essa é a regra que
mantém tudo consistente: a liberação é por etapa, e `executive` cobre
duas (INFLUENCE e MOVE). Rotear por copiloto fazia o mês 5 abrir o mês 6
junto. O copiloto sai da etapa por `etapaAgent()`.

1. `ensureJourneyState` **antes** do roteador — ele precisa da etapa atual
   como destino de falha.
2. `routeMessage` (Haiku, `router.ts`) classifica contra as seis últimas
   trocas e devolve `{etapa, confianca, intencao_clara}`. Qualquer falha
   (parse, enum inválido, API fora) cai na **etapa atual**, nunca numa
   etapa fixa — cair em FIND tornava a falha indistinguível de um acerto,
   porque FIND está sempre liberado.
3. Confiança `baixa` ou `intencao_clara: false` → fica na etapa atual em
   vez de chutar destino. É o caso de saudação e dúvida sobre o programa.
4. `etapas_liberadas.includes(etapaPedida)` decide. Liberada: responde o
   copiloto dono dela. Não liberada: responde o copiloto da **etapa
   atual** com `territoryBridgeInstruction` — reconhece a pergunta, diz em
   que mês aquilo abre, faz a ponte. Recusa seca quebra a experiência
   premium (SPEC-AGENTS.md §4).
5. A conversa é contínua por território: `conversations` reaproveitada por
   `agent_key`, com `etapa` gravando a etapa efetiva.
6. `AGENT_PILAR[agente]` filtra o RAG — só trecho do próprio pilar.

Quem avança etapa é o mentor, via `POST /api/mentor/advance`, uma por vez
na ordem de `ETAPA_ORDER`, cumulativamente.

**Ao mexer aqui, cheque os dois lados do descasamento:** o roteador decide
por etapa (`ETAPA_ORDER`), o prompt e o RAG por copiloto (`AGENT_PILAR`).
`ARTIFACT_ETAPA` segue a mesma lógica do roteador, pela mesma razão.

## Regra travada

O prompt do sistema é fonte de verdade (`SPEC-AGENTS.md`). **Não altere
tom nem limites sem pedido explícito do usuário.** Os quatro limites
rígidos valem para todos os cinco:

- Nunca prometer ou sugerir promoção, aumento, cargo ou contratação
- Nunca estimar salário para a pessoa
- Nunca oferecer o programa, preço ou vaga
- Nunca entregar plano de ação — o agente diagnostica, o mentor prescreve

O quarto é o mais atacado na prática: pedidos do tipo "só um rascunho" ou
"só um esqueleto" são a mesma prescrição com outro nome, e o prompt já
trata isso explicitamente. Um ataque que violou esse limite já foi
encontrado e corrigido uma vez — se mexer nessa parte do prompt, revalide
ao vivo.

Fora de escopo de todos: sofrimento psíquico, assédio, conflito
trabalhista, questão jurídica ou de saúde. Reconhece, encaminha ao mentor,
registra o sinal, não conduz.

Feche com a skill `validate-delivery`.
