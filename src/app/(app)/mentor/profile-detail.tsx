import type { ExecutiveProfile } from "@/lib/agents/executive-profile-schema";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function ProfileDetail({ perfil }: { perfil: ExecutiveProfile }) {
  return (
    <div className="space-y-4">
      <Field label="Trajetória">{perfil.trajetoria}</Field>
      <Field label="Momento atual">{perfil.momento_atual}</Field>
      <Field label="Próxima cadeira declarada">
        {perfil.proxima_cadeira.declarada}{" "}
        <span className="text-xs text-muted-foreground">
          (nitidez {perfil.proxima_cadeira.nitidez})
        </span>
      </Field>

      <Field label="Os três gaps">
        <ol className="space-y-2">
          {perfil.gaps.map((gap, index) => (
            <li key={index}>
              <p className="font-medium">{gap.titulo}</p>
              <p className="text-muted-foreground">Evidência: {gap.evidencia}</p>
              <p className="text-muted-foreground">Impacto: {gap.impacto}</p>
            </li>
          ))}
        </ol>
      </Field>

      <Field label="Evidências de preparo">
        <ul className="list-disc space-y-1 pl-4">
          {perfil.evidencias_de_preparo.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Field>

      <Field label="Competências a evoluir">
        <ul className="list-disc space-y-1 pl-4">
          {perfil.competencias_a_evoluir.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </Field>

      <Field label="Percepção atual">
        <p>{perfil.percepcao_atual.como_e_visto}</p>
        <p className="text-muted-foreground">
          Distância da próxima cadeira: {perfil.percepcao_atual.distancia_da_proxima_cadeira}
        </p>
      </Field>

      <Field label="Stakeholders">
        <ul className="space-y-2">
          {perfil.stakeholders.map((s, index) => (
            <li key={index}>
              <p className="font-medium">{s.quem}</p>
              <p className="text-muted-foreground">Hoje: {s.percepcao_atual}</p>
              <p className="text-muted-foreground">Necessário: {s.percepcao_necessaria}</p>
            </li>
          ))}
        </ul>
      </Field>

      <Field label="Custo da inércia em 12 meses">{perfil.custo_da_inercia_12m}</Field>

      <Field label="Confiança do diagnóstico">{perfil.confianca_do_diagnostico}</Field>

      <div className="rounded-md bg-warning-soft p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warning">
          Sinais para o mentor — nunca exibido ao mentorado
        </p>
        {perfil.sinais_para_o_mentor.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum sinal registrado.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {perfil.sinais_para_o_mentor.map((sinal, index) => (
              <li key={index}>{sinal}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
