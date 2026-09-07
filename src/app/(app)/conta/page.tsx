import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Field } from "@/components/field";
import { DeleteAccountButton } from "@/components/delete-account-button";

export default async function ContaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Conta</p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">Sua conta</h1>

      <div className="space-y-6">
        <Field label="E-mail">{user?.email}</Field>

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
      </div>
    </main>
  );
}
