import Link from "next/link";

export const MENTEE_TABS = [
  { key: "perfil", label: "Perfil Executivo" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "artefatos", label: "Artefatos" },
  { key: "notas", label: "Notas e anexos" },
] as const;

export type MenteeTab = (typeof MENTEE_TABS)[number]["key"];

export function isMenteeTab(value: string | undefined): value is MenteeTab {
  return MENTEE_TABS.some((tab) => tab.key === value);
}

// Abas por query param em vez de estado de cliente: a página continua
// server component, cada aba tem URL própria (a fila de validação em
// /mentor aponta direto para a aba certa) e o voltar do navegador funciona.
export function MenteeTabs({
  menteeId,
  active,
  counts,
}: {
  menteeId: string;
  active: MenteeTab;
  counts: Partial<Record<MenteeTab, number>>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Seções do mentorado"
      className="flex gap-6 overflow-x-auto border-b border-border"
    >
      {MENTEE_TABS.map((tab) => {
        const isActive = tab.key === active;
        const count = counts[tab.key];

        return (
          <Link
            key={tab.key}
            href={`/mentor/${menteeId}?tab=${tab.key}`}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={`-mb-px flex flex-none items-center gap-2 border-b-2 pb-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                  isActive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
