import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { ARTIFACT_LABELS, type ArtifactTipo } from "@/lib/agents/artifact-schemas";

export type QueueItem = {
  kind: "perfil" | ArtifactTipo;
  id: string;
  menteeId: string;
  menteeEmail: string;
  version: number;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Mesmo padrão de linha do roster: o item inteiro é o alvo de clique e o
// detalhe abre na tela do mentorado, ancorado na seção certa. Antes cada
// pendência vinha com o conteúdo inteiro expandido aqui, o que tornava a
// tela ilegível quando havia mais de uma.
export function ValidationQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return <p className="px-6 py-2 text-sm text-muted-foreground">Nada pendente no momento.</p>;
  }

  return (
    <div>
      {items.map((item) => (
        <Link
          key={`${item.kind}-${item.id}`}
          href={`/mentor/${item.menteeId}?tab=${item.kind === "perfil" ? "perfil" : "artefatos"}`}
          className="flex items-center justify-between gap-4 border-b border-border px-6 py-3 outline-none last:border-b-0 hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {item.kind === "perfil" ? "Perfil Executivo" : ARTIFACT_LABELS[item.kind]}
              <span className="ml-2 font-normal text-muted-foreground">v{item.version}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">{item.menteeEmail}</p>
          </div>
          <div className="flex flex-none items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {formatDate(item.createdAt)}
            </span>
            <StatusPill tone="warning">Aguardando revisão</StatusPill>
            <span aria-hidden="true" className="text-muted-foreground">
              →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
