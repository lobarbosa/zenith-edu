import { z } from "zod";
import type { AgentKey } from "./router-prompt";

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

// visibilidade nullable pelo mesmo motivo dos enums acima: julgamento que
// pode não ter base ainda na conversa.
export const BusinessMapSchema = z.object({
  empresa: z.object({
    setor: z.string(),
    modelo_de_receita: z.string(),
    porte: z.string(),
  }),
  motor_economico: z.object({
    de_onde_vem_a_receita: z.string(),
    onde_esta_a_margem: z.string(),
    o_que_pressiona: z.string(),
  }),
  estrutura_de_decisao: z.array(
    z.object({
      quem: z.string(),
      decide_sobre: z.string(),
      olha_para: z.string(),
    })
  ),
  conexao_da_area: z.object({
    como_contribui: z.string(),
    como_e_medida: z.string(),
    visibilidade: z.enum(["alta", "media", "baixa"]).nullable(),
  }),
  lacunas_de_informacao: z.array(z.string()),
  perguntas_para_levar_a_empresa: z.array(z.string()),
});
export type BusinessMap = z.infer<typeof BusinessMapSchema>;

// tipo/confianca/status nullable pelo mesmo motivo dos outros enums acima
// (julgamento sem base ainda na conversa) — e pra não repetir o bug já
// achado uma vez (enum sem .nullable() esgota as tentativas de geração
// quando o modelo tenta emitir string vazia num campo sem base).
export const ValueCreationMapSchema = z.object({
  iniciativas: z.array(
    z.object({
      nome: z.string(),
      tipo: z.enum(["receita", "custo", "risco"]).nullable(),
      linha_de_base: z.string(),
      metrica: z.string(),
      impacto_estimado: z.string(),
      premissas: z.array(z.string()),
      horizonte: z.string(),
      quem_se_importa: z.string(),
      confianca: z.enum(["alta", "media", "baixa"]).nullable(),
      status: z.enum(["hipotese", "em_validacao", "comprovado"]).nullable(),
    })
  ),
  prioridade: z.array(z.string()),
  narrativa_de_impacto: z.string(),
  o_que_falta_medir: z.array(z.string()),
});
export type ValueCreationMap = z.infer<typeof ValueCreationMapSchema>;

// nivel nullable pelo mesmo motivo dos outros enums: julgamento sem base
// ainda na conversa.
export const LeadershipMapSchema = z.object({
  time: z.object({
    tamanho: z.string(),
    senioridade: z.string(),
    maturidade: z.string(),
  }),
  delegacao: z.object({
    o_que_delega: z.array(z.string()),
    o_que_retem: z.array(z.string()),
    motivo_da_retencao: z.string(),
    nivel: z.enum(["tarefa", "projeto", "resultado"]).nullable(),
  }),
  gargalos_no_lider: z.array(z.string()),
  conversas_pendentes: z.array(
    z.object({
      com_quem: z.string(),
      tema: z.string(),
      risco_de_adiar: z.string(),
    })
  ),
  desenvolvimento_do_time: z.array(
    z.object({
      pessoa: z.string(),
      lacuna: z.string(),
      movimento: z.string(),
    })
  ),
  prioridades: z.array(z.string()),
});
export type LeadershipMap = z.infer<typeof LeadershipMapSchema>;

export const ARTIFACT_TIPOS = [
  "career_map",
  "competency_map",
  "next_chair_map",
  "business_map",
  "value_creation_map",
  "leadership_map",
] as const;
export type ArtifactTipo = (typeof ARTIFACT_TIPOS)[number];

export const ARTIFACT_SCHEMAS: Record<ArtifactTipo, z.ZodType> = {
  career_map: CareerMapSchema,
  competency_map: CompetencyMapSchema,
  next_chair_map: NextChairMapSchema,
  business_map: BusinessMapSchema,
  value_creation_map: ValueCreationMapSchema,
  leadership_map: LeadershipMapSchema,
};

// Rótulo em português pra UI — nunca no prompt (esse fica em copilot-prompt.ts).
export const ARTIFACT_LABELS: Record<ArtifactTipo, string> = {
  career_map: "Career Map",
  competency_map: "Competency Map",
  next_chair_map: "Next Chair Map",
  business_map: "Business Map",
  value_creation_map: "Value Creation Map",
  leadership_map: "Leadership Map",
};

// Qual copiloto gera/usa cada artefato — filtra a conversa na geração
// (artifact-generation.ts) e a etapa liberada na rota (api/artifact).
export const ARTIFACT_AGENT: Record<ArtifactTipo, AgentKey> = {
  career_map: "career",
  competency_map: "career",
  next_chair_map: "career",
  business_map: "business",
  value_creation_map: "value",
  leadership_map: "leadership",
};
