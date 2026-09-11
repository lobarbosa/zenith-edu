import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/field";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isMentor } from "@/lib/mentor";
import { createAdminClient } from "@/lib/supabase/admin";
import { MenteeIdentityForm, toIdentityValues } from "@/components/mentee-identity-form";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mesmo formulário do início do diagnóstico: quem já preencheu corrige
  // aqui, e quem entrou antes do formulário existir tem onde se identificar.
  // Leitura com admin pelo mesmo motivo de /diagnostico — a escrita passa
  // por /api/mentee/perfil, não por policy de UPDATE.
  const admin = createAdminClient();
  const { data: identidade } = isMentor(user?.email)
    ? { data: null }
    : await admin
        .from("mentees")
        .select(
          "nome, sobrenome, data_nascimento, cargo, empresa, linkedin, telefone, carreira_inicio_ano"
        )
        .eq("user_id", user!.id)
        .maybeSingle();

  return (
    <main className="shell-narrow px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Conta</p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">Sua conta</h1>

      {identidade && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
          </CardHeader>
          <CardContent>
            <MenteeIdentityForm initial={toIdentityValues(identidade)} submitLabel="Salvar" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-6">
          <Field label="E-mail">{user?.email}</Field>

          <Field label="Senha">
            <ChangePasswordForm />
          </Field>

          <Field label="Privacidade">
            <Link
              href="/privacidade"
              className="text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
            >
              Como tratamos seus dados
            </Link>
          </Field>

          <Field label="Excluir conta">
            <p className="mb-3 text-muted-foreground">
              Apaga permanentemente sua conta e todos os dados associados a ela.
            </p>
            <DeleteAccountButton />
          </Field>
        </CardContent>
      </Card>
    </main>
  );
}
