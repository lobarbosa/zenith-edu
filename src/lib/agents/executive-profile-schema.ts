import { z } from "zod";

// Schema exato do SPEC-AGENTS.md §5 ("Síntese do Perfil Executivo").
// "gaps" tem exatamente três itens — regra explícita da spec, não uma
// escolha de engenharia.
export const ExecutiveProfileSchema = z.object({
  trajetoria: z.string(),
  momento_atual: z.string(),
  proxima_cadeira: z.object({
    declarada: z.string(),
    nitidez: z.enum(["alta", "media", "baixa"]),
  }),
  gaps: z
    .array(
      z.object({
        titulo: z.string(),
        evidencia: z.string(),
        impacto: z.string(),
      })
    )
    .length(3),
  evidencias_de_preparo: z.array(z.string()),
  competencias_a_evoluir: z.array(z.string()),
  percepcao_atual: z.object({
    como_e_visto: z.string(),
    distancia_da_proxima_cadeira: z.string(),
  }),
  stakeholders: z.array(
    z.object({
      quem: z.string(),
      percepcao_atual: z.string(),
      percepcao_necessaria: z.string(),
    })
  ),
  custo_da_inercia_12m: z.string(),
  // Nunca exibido ao mentorado — uso exclusivo do mentor.
  sinais_para_o_mentor: z.array(z.string()),
  confianca_do_diagnostico: z.enum(["alta", "media", "baixa"]),
});

export type ExecutiveProfile = z.infer<typeof ExecutiveProfileSchema>;
