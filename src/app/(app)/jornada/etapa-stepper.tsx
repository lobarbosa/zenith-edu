import { ETAPA_ORDER, ETAPA_MES, etapaAgent } from "@/lib/agents/journey";
import { AGENT_SHORT_LABELS } from "@/lib/agents/agent-labels";

// Trilho de seis colunas — rótulo, barra, mês e copiloto — como no artefato
// validado. Pills numa linha só quebravam em duas fileiras e perdiam a
// leitura de progresso, que é o trabalho desta peça.
export function EtapaStepper({
  etapaAtual,
  etapasLiberadas,
}: {
  etapaAtual: string;
  etapasLiberadas: string[];
}) {
  return (
    <ol className="flex gap-1.5">
      {ETAPA_ORDER.map((etapa) => {
        const isAtual = etapa === etapaAtual;
        const isLiberada = etapasLiberadas.includes(etapa);
        const concluida = isLiberada && !isAtual;

        return (
          <li key={etapa} className="flex min-w-0 flex-1 flex-col gap-2">
            <span
              className={`truncate text-[11px] font-semibold ${
                isLiberada ? "text-foreground" : "text-muted-foreground/70"
              }`}
            >
              {etapa}
            </span>
            <span
              aria-hidden="true"
              className={`h-1.5 rounded-full ${
                isAtual ? "bg-primary" : concluida ? "bg-good" : "bg-border"
              }`}
            />
            <span className="truncate text-[10.5px] text-muted-foreground">
              Mês {ETAPA_MES[etapa]} · {AGENT_SHORT_LABELS[etapaAgent(etapa)]}
            </span>
            <span className="sr-only">
              {isAtual ? "etapa atual" : isLiberada ? "liberada" : "bloqueada"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
