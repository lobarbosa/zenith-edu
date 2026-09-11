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

1. `routeMessage` (Haiku, `router.ts`) classifica a mensagem contra as seis
   últimas trocas e devolve `agent_key`. Falha de parse cai em `career`
   com confiança baixa — nunca lança.
2. `isEtapaLiberada(etapas_liberadas, agentKey)` decide se aquele
   território está aberto para este mentorado.
3. Liberado: responde o copiloto pedido. Não liberado: responde o copiloto
   da **etapa atual**, com `territoryBridgeInstruction` anexada — ele
   reconhece a pergunta, diz em que etapa aquilo abre e faz a ponte para
   um trabalho concreto da etapa corrente. Recusa seca quebra a
   experiência premium (SPEC-AGENTS.md §4).
4. A conversa é contínua por território: `conversations` é reaproveitada
   por `agent_key`.
5. `AGENT_PILAR[agente]` filtra o RAG — o copiloto só recupera trecho do
   próprio pilar.

`executive` cobre duas etapas (INFLUENCE e MOVE); `isEtapaLiberada` abre
se qualquer uma das duas liberou. Quem avança etapa é o mentor, via
`POST /api/mentor/advance`, uma por vez na ordem de `ETAPA_ORDER`.

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
