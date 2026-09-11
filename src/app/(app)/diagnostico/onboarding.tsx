import { Card, CardContent } from "@/components/ui/card";
import { MenteeIdentityForm, type MenteeIdentityValues } from "@/components/mentee-identity-form";

// Antes do bloco 1. Sem isso o perfil chegava ao mentor identificado por
// endereço de e-mail, e o agente abria a conversa sem saber com quem fala.
export function DiagnosticOnboarding({ initial }: { initial: MenteeIdentityValues }) {
  return (
    <main className="shell-narrow px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Executive Diagnostic
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
        Antes de começar
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        São oito blocos de conversa sobre a sua trajetória. Comece se apresentando — é o que
        o seu mentor lê junto com o diagnóstico.
      </p>

      <Card className="mt-8">
        <CardContent>
          <MenteeIdentityForm initial={initial} submitLabel="Começar o diagnóstico" />
        </CardContent>
      </Card>
    </main>
  );
}
