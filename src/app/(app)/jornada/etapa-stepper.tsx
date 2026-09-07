import { ETAPA_ORDER, ETAPA_MES } from "@/lib/agents/journey";

export function EtapaStepper({
  etapaAtual,
  etapasLiberadas,
}: {
  etapaAtual: string;
  etapasLiberadas: string[];
}) {
  const currentIndex = ETAPA_ORDER.indexOf(etapaAtual as (typeof ETAPA_ORDER)[number]);

  return (
    <ol className="flex flex-wrap gap-2">
      {ETAPA_ORDER.map((etapa, index) => {
        const isCurrent = etapa === etapaAtual;
        const isAlcancada = index < currentIndex || etapasLiberadas.includes(etapa);

        return (
          <li
            key={etapa}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : isAlcancada
                  ? "border-border text-foreground"
                  : "border-border text-muted-foreground/60"
            }`}
          >
            <span className="font-mono text-[10px] opacity-70">M{ETAPA_MES[etapa]}</span>
            {etapa}
          </li>
        );
      })}
    </ol>
  );
}
