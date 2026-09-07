import { z } from "zod";

// Schemas exatos do SPEC-AGENTS.md §6 (Career Copilot — FIND). Campo vazio
// é permitido (o agente marca o que falta, nunca inventa — SPEC-AGENTS.md
// §11), por isso strings soltas em vez de required com mínimo de tamanho.
export const CareerMapSchema = z.object({
  trajetoria: z.array(
    z.object({
      periodo: z.string(),
      papel: z.string(),
      escopo: z.string(),
      virada: z.string(),
    })
  ),
  padroes: z.array(z.string()),
  forcas_recorrentes: z.array(z.string()),
  tetos_encontrados: z.array(z.string()),
});
export type CareerMap = z.infer<typeof CareerMapSchema>;

// nivel_atual/nivel_exigido são nullable: são julgamento que exige base na
// conversa (SPEC-AGENTS.md §11), e um enum de opções fixas não tem como
// representar "vazio" a não ser null — string fora da lista quebra o
// parse. Achado rodando geração real contra o Opus: o modelo, seguindo a
// instrução de "campo sem base fica vazio" ao pé da letra, tentava emitir
// string vazia num enum e o Zod rejeitava, esgotando as 3 tentativas.
export const CompetencyMapSchema = z.object({
  competencias: z.array(
    z.object({
      nome: z.string(),
      pilar: z.enum(["BUSINESS", "VALUE", "PEOPLE", "COMMUNICATION"]),
      nivel_atual: z.enum(["inicial", "em_desenvolvimento", "solido", "referencia"]).nullable(),
      nivel_exigido: z.enum(["inicial", "em_desenvolvimento", "solido", "referencia"]).nullable(),
      evidencia_atual: z.string(),
      lacuna: z.string(),
    })
  ),
  prioridades: z.array(z.string()),
});
export type CompetencyMap = z.infer<typeof CompetencyMapSchema>;

export const NextChairMapSchema = z.object({
  cadeira_alvo: z.object({
    papel: z.string(),
    escopo: z.string(),
    tipo_de_problema: z.string(),
    horizonte: z.string(),
  }),
  por_que_essa: z.string(),
  requisitos: z.array(
    z.object({
      requisito: z.string(),
      situacao: z.enum(["atendido", "parcial", "nao_atendido"]).nullable(),
      evidencia: z.string(),
    })
  ),
  distancia: z.enum(["curta", "media", "longa"]).nullable(),
  hipoteses_alternativas: z.array(z.string()),
  riscos_da_escolha: z.array(z.string()),
});
export type NextChairMap = z.infer<typeof NextChairMapSchema>;

export const ARTIFACT_TIPOS = ["career_map", "competency_map", "next_chair_map"] as const;
export type ArtifactTipo = (typeof ARTIFACT_TIPOS)[number];

export const ARTIFACT_SCHEMAS: Record<ArtifactTipo, z.ZodType> = {
  career_map: CareerMapSchema,
  competency_map: CompetencyMapSchema,
  next_chair_map: NextChairMapSchema,
};

// Rótulo em português pra UI — nunca no prompt (esse fica em copilot-prompt.ts).
export const ARTIFACT_LABELS: Record<ArtifactTipo, string> = {
  career_map: "Career Map",
  competency_map: "Competency Map",
  next_chair_map: "Next Chair Map",
};
