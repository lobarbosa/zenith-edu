import { Field } from "@/components/field";
import {
  ARTIFACT_SCHEMAS,
  type ArtifactTipo,
  type CareerMap,
  type CompetencyMap,
  type NextChairMap,
} from "@/lib/agents/artifact-schemas";

// "Campo vazio é permitido, com marcação explícita do que falta. Nunca
// preenchido por invenção" (SPEC-AGENTS.md §11) — por isso toda lista vazia
// mostra este aviso em vez de simplesmente não renderizar nada.
function EmptyNote() {
  return <p className="text-muted-foreground">Não identificado na conversa ainda.</p>;
}

function CareerMapDetail({ conteudo }: { conteudo: CareerMap }) {
  return (
    <div className="space-y-4">
      <Field label="Trajetória">
        {conteudo.trajetoria.length === 0 ? (
          <EmptyNote />
        ) : (
          <ol className="space-y-2">
            {conteudo.trajetoria.map((item, index) => (
              <li key={index}>
                <p className="font-medium">
                  {item.papel} <span className="text-muted-foreground">· {item.periodo}</span>
                </p>
                <p className="text-muted-foreground">Escopo: {item.escopo}</p>
                <p className="text-muted-foreground">Virada: {item.virada}</p>
              </li>
            ))}
          </ol>
        )}
      </Field>

      <Field label="Padrões recorrentes">
        {conteudo.padroes.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.padroes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Forças recorrentes">
        {conteudo.forcas_recorrentes.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.forcas_recorrentes.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Tetos encontrados">
        {conteudo.tetos_encontrados.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.tetos_encontrados.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>
    </div>
  );
}

const NIVEL_LABEL: Record<string, string> = {
  inicial: "Inicial",
  em_desenvolvimento: "Em desenvolvimento",
  solido: "Sólido",
  referencia: "Referência",
};

// Campos de opção fixa chegam null quando o agente ainda não tem base na
// conversa pra julgar (SPEC-AGENTS.md §11) — nunca escondido, sempre
// rotulado como pendente.
function nivelLabel(v: string | null): string {
  return v ? NIVEL_LABEL[v] : "Ainda não avaliado";
}

function CompetencyMapDetail({ conteudo }: { conteudo: CompetencyMap }) {
  return (
    <div className="space-y-4">
      <Field label="Competências">
        {conteudo.competencias.length === 0 ? (
          <EmptyNote />
        ) : (
          <ol className="space-y-3">
            {conteudo.competencias.map((item, index) => (
              <li key={index}>
                <p className="font-medium">
                  {item.nome} <span className="text-muted-foreground">· {item.pilar}</span>
                </p>
                <p className="text-muted-foreground">
                  Nível atual: {nivelLabel(item.nivel_atual)} → exigido: {nivelLabel(item.nivel_exigido)}
                </p>
                <p className="text-muted-foreground">Evidência atual: {item.evidencia_atual}</p>
                <p className="text-muted-foreground">Lacuna: {item.lacuna}</p>
              </li>
            ))}
          </ol>
        )}
      </Field>

      <Field label="Prioridades">
        {conteudo.prioridades.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.prioridades.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>
    </div>
  );
}

const SITUACAO_LABEL: Record<string, string> = {
  atendido: "Atendido",
  parcial: "Parcial",
  nao_atendido: "Não atendido",
};
function situacaoLabel(v: string | null): string {
  return v ? SITUACAO_LABEL[v] : "Ainda não avaliado";
}

const DISTANCIA_LABEL: Record<string, string> = { curta: "Curta", media: "Média", longa: "Longa" };
function distanciaLabel(v: string | null): string {
  return v ? DISTANCIA_LABEL[v] : "Ainda não avaliada";
}

function NextChairMapDetail({ conteudo }: { conteudo: NextChairMap }) {
  return (
    <div className="space-y-4">
      <Field label="Cadeira-alvo">
        <p className="font-medium">{conteudo.cadeira_alvo.papel}</p>
        <p className="text-muted-foreground">Escopo: {conteudo.cadeira_alvo.escopo}</p>
        <p className="text-muted-foreground">
          Tipo de problema: {conteudo.cadeira_alvo.tipo_de_problema}
        </p>
        <p className="text-muted-foreground">Horizonte: {conteudo.cadeira_alvo.horizonte}</p>
      </Field>

      <Field label="Por que essa cadeira">{conteudo.por_que_essa || <EmptyNote />}</Field>

      <Field label="Requisitos">
        {conteudo.requisitos.length === 0 ? (
          <EmptyNote />
        ) : (
          <ol className="space-y-2">
            {conteudo.requisitos.map((item, index) => (
              <li key={index}>
                <p className="font-medium">
                  {item.requisito}{" "}
                  <span className="text-muted-foreground">
                    · {situacaoLabel(item.situacao)}
                  </span>
                </p>
                <p className="text-muted-foreground">Evidência: {item.evidencia}</p>
              </li>
            ))}
          </ol>
        )}
      </Field>

      <Field label="Distância até a cadeira">{distanciaLabel(conteudo.distancia)}</Field>

      <Field label="Hipóteses alternativas">
        {conteudo.hipoteses_alternativas.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.hipoteses_alternativas.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>

      <Field label="Riscos da escolha">
        {conteudo.riscos_da_escolha.length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="list-disc space-y-1 pl-4">
            {conteudo.riscos_da_escolha.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        )}
      </Field>
    </div>
  );
}

export function ArtifactDetail({ tipo, conteudo }: { tipo: ArtifactTipo; conteudo: unknown }) {
  const parsed = ARTIFACT_SCHEMAS[tipo].safeParse(conteudo);

  if (!parsed.success) {
    return (
      <p className="text-sm text-destructive">
        Este registro não bate com o schema esperado — não valide sem checar manualmente.
      </p>
    );
  }

  if (tipo === "career_map") return <CareerMapDetail conteudo={parsed.data as CareerMap} />;
  if (tipo === "competency_map")
    return <CompetencyMapDetail conteudo={parsed.data as CompetencyMap} />;
  return <NextChairMapDetail conteudo={parsed.data as NextChairMap} />;
}
