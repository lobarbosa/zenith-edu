import { ARTIFACT_TIPOS, ARTIFACT_ETAPA, ARTIFACT_LABELS, type ArtifactTipo } from "./artifact-schemas";
import { etapaAgent, ETAPA_ORDER, ETAPA_MES, type Etapa } from "./journey";
import { AGENT_LABELS } from "./agent-labels";

export type AtividadeStatus = "concluida" | "em_andamento" | "pendente";

export type Atividade = {
  titulo: string;
  detalhe: string;
  status: AtividadeStatus;
};

export type EtapaAtividades = {
  etapa: Etapa;
  mes: number;
  copiloto: string;
  liberada: boolean;
  atual: boolean;
  atividades: Atividade[];
  concluidas: number;
};

type ArtifactState = { status: "rascunho_agente" | "validado_mentor" | "rejeitado" };

// As atividades são derivadas, não cadastradas: conversa com o copiloto da
// etapa e o estado de cada artefato dela. Uma tabela de atividades exigiria
// alguém alimentando à mão e nasceria vazia; derivada, ela reflete o
// progresso real desde a primeira mensagem.
export function buildEtapaAtividades({
  etapasLiberadas,
  etapaAtual,
  artifactByTipo,
  mensagensPorAgente,
}: {
  etapasLiberadas: string[];
  etapaAtual: string;
  artifactByTipo: Map<ArtifactTipo, ArtifactState>;
  mensagensPorAgente: Map<string, number>;
}): EtapaAtividades[] {
  return ETAPA_ORDER.map((etapa) => {
    const agente = etapaAgent(etapa);
    const copiloto = AGENT_LABELS[agente];
    const liberada = etapasLiberadas.includes(etapa);

    const atividades: Atividade[] = [];

    if (liberada) {
      const trocas = mensagensPorAgente.get(agente) ?? 0;
      atividades.push({
        titulo: `Conversar com o ${copiloto}`,
        detalhe:
          trocas === 0
            ? "A etapa começa pela conversa — é dela que saem os artefatos."
            : `${trocas} ${trocas === 1 ? "mensagem trocada" : "mensagens trocadas"} até aqui.`,
        status: trocas === 0 ? "pendente" : "concluida",
      });

      for (const tipo of ARTIFACT_TIPOS.filter((t) => ARTIFACT_ETAPA[t] === etapa)) {
        const artifact = artifactByTipo.get(tipo);
        atividades.push({
          titulo: artifact ? ARTIFACT_LABELS[tipo] : `Gerar o ${ARTIFACT_LABELS[tipo]}`,
          detalhe: artifactDetalhe(artifact),
          status: artifactStatus(artifact),
        });
      }
    }

    return {
      etapa,
      mes: ETAPA_MES[etapa],
      copiloto,
      liberada,
      atual: etapa === etapaAtual,
      atividades,
      concluidas: atividades.filter((a) => a.status === "concluida").length,
    };
  });
}

function artifactStatus(artifact: ArtifactState | undefined): AtividadeStatus {
  if (!artifact) return "pendente";
  if (artifact.status === "validado_mentor") return "concluida";
  return "em_andamento";
}

function artifactDetalhe(artifact: ArtifactState | undefined): string {
  if (!artifact) return "Ainda não gerado a partir da conversa.";
  if (artifact.status === "validado_mentor") return "Validado pelo mentor.";
  if (artifact.status === "rejeitado") return "O mentor pediu uma nova versão.";
  return "Gerado, aguardando a revisão do mentor.";
}
