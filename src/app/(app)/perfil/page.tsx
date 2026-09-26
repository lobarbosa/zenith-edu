import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureMentee } from "@/lib/mentees";
import { ExecutiveProfileSchema } from "@/lib/agents/executive-profile-schema";
import { ProfileDetail } from "@/components/profile-detail";
import { Card, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentee = await ensureMentee(supabase, user!);

  // Só versões validadas. Um rascunho na tela do mentorado quebraria a
  // regra de que nada é exibido como validado sem ação do mentor, e
  // entregaria os três gaps antes da devolutiva — que é do mentor, ao vivo.
  // A validação é o gate: o mentor decide quando esta tela ganha conteúdo.
  const { data: profiles } = await supabase
    .from("executive_profiles")
    .select("id, version, perfil, validated_at")
    .eq("mentee_id", mentee.id)
    .eq("status", "validado")
    .order("version", { ascending: false });

  if (!profiles || profiles.length === 0) {
    return (
      <main className="shell-narrow px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Perfil Executivo
        </p>
        <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
          Seu Perfil Executivo
        </h1>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ele é sintetizado a partir do Executive Diagnostic e aparece aqui depois que o
              seu mentor revisa e valida. Até lá, a devolutiva vem dele.
            </p>
            <p className="mt-4 text-sm">
              <Link href="/" className="font-medium text-primary hover:underline">
                Voltar ao início
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const [atual, ...anteriores] = profiles;
  const parsed = ExecutiveProfileSchema.safeParse(atual.perfil);
  const validadoEm = formatDate(atual.validated_at);

  return (
    <main className="shell-narrow space-y-8 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Perfil Executivo
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Seu Perfil Executivo
          </h1>
          <StatusPill tone="good">Validado pelo mentor</StatusPill>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Versão {atual.version}
          {validadoEm ? ` · validada em ${validadoEm}` : ""}. É a leitura que o seu mentor
          fez do diagnóstico, e é o que os copilotos usam para conhecer a sua situação.
        </p>
      </div>

      <Card>
        <CardContent>
          {parsed.success ? (
            <ProfileDetail perfil={parsed.data} audiencia="mentorado" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Não foi possível exibir esta versão. Fale com o seu mentor.
            </p>
          )}
        </CardContent>
      </Card>

      {anteriores.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-foreground">Versões anteriores</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Um perfil nunca é sobrescrito. Cada revisão cria uma versão nova e as
              anteriores ficam.
            </p>
            <div className="mt-6 space-y-6">
              {anteriores.map((item) => {
                const anterior = ExecutiveProfileSchema.safeParse(item.perfil);
                return (
                  <details key={item.id} className="border-t border-border pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                      Versão {item.version}
                      {formatDate(item.validated_at) ? ` · ${formatDate(item.validated_at)}` : ""}
                    </summary>
                    <div className="mt-4">
                      {anterior.success ? (
                        <ProfileDetail perfil={anterior.data} audiencia="mentorado" />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Não foi possível exibir esta versão.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
