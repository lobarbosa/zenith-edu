// Os campos de identificação e o normalizador ficam aqui, fora do módulo do
// formulário: `mentee-identity-form.tsx` é "use client", e um server
// component não pode chamar função exportada de módulo client — só renderizar
// o componente. `/diagnostico` e `/conta` chamam toIdentityValues no
// servidor, então ela precisa morar num módulo neutro.

export type MenteeIdentityValues = {
  nome: string | null;
  sobrenome: string | null;
  data_nascimento: string | null;
  cargo: string | null;
  empresa: string | null;
  linkedin: string | null;
  telefone: string | null;
  carreira_inicio_ano: number | null;
};

// As colunas vêm todas nullable do banco (0007) e o formulário trabalha com
// string. Este normaliza a linha lida — inclusive `null`, para quem ainda
// não tem linha — no formato que o formulário espera.
export function toIdentityValues(
  row: Partial<MenteeIdentityValues> | null
): MenteeIdentityValues {
  return {
    nome: row?.nome ?? null,
    sobrenome: row?.sobrenome ?? null,
    data_nascimento: row?.data_nascimento ?? null,
    cargo: row?.cargo ?? null,
    empresa: row?.empresa ?? null,
    linkedin: row?.linkedin ?? null,
    telefone: row?.telefone ?? null,
    carreira_inicio_ano: row?.carreira_inicio_ano ?? null,
  };
}
