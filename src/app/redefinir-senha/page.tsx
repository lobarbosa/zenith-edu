import { createClient } from "@/lib/supabase/server";
import { RedefinirSenhaForm } from "./redefinir-senha-form";

export default async function RedefinirSenhaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            T-Shaped Executive
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Redefinir senha
          </h1>
        </div>

        {user ? (
          <RedefinirSenhaForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            Este link de redefinição é inválido ou expirou. Volte pra{" "}
            <a href="/login" className="text-primary hover:underline">
              tela de login
            </a>{" "}
            e peça um novo.
          </p>
        )}
      </div>
    </main>
  );
}
