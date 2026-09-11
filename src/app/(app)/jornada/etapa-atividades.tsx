import { StatusPill } from "@/components/status-pill";
import type { EtapaAtividades } from "@/lib/agents/activities";

const CHECK_CLASS = {
  concluida: "border-good bg-good text-white",
  em_andamento: "border-primary",
  pendente: "border-border",
} as const;

// <details>/<summary> em vez de estado React: a expansão é nativa,
// acessível por teclado e mantém a página como server component.
export function EtapaAtividadesList({ etapas }: { etapas: EtapaAtividades[] }) {
  return (
    <div className="divide-y divide-border">
      {etapas.map((item) => (
        <details key={item.etapa} open={item.atual} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px] font-semibold ${
                  item.liberada ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {item.mes}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.etapa}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Mês {item.mes} · {item.copiloto}
                  {item.liberada && item.atividades.length > 0
                    ? ` · ${item.concluidas} de ${item.atividades.length}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <StatusPill tone={item.atual ? "warning" : item.liberada ? "good" : "neutral"}>
                {item.atual ? "Em andamento" : item.liberada ? "Liberada" : "Bloqueada"}
              </StatusPill>
              <span
                aria-hidden="true"
                className="text-xs text-muted-foreground transition-transform group-open:rotate-90"
              >
                ▸
              </span>
            </div>
          </summary>

          <div className="pb-4 pl-9">
            {!item.liberada ? (
              <p className="text-sm text-muted-foreground">
                Abre quando o mentor avançar sua jornada até aqui.
              </p>
            ) : (
              <ul className="space-y-3">
                {item.atividades.map((atividade, index) => (
                  <li key={index} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-sm border text-[10px] ${
                        CHECK_CLASS[atividade.status]
                      }`}
                    >
                      {atividade.status === "concluida" ? "✓" : ""}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{atividade.titulo}</p>
                      <p className="text-sm text-muted-foreground">{atividade.detalhe}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
