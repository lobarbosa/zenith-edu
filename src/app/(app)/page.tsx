import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isMentor } from "@/lib/mentor";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mentor = isMentor(user?.email);

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sessão ativa
          </h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {mentor ? (
          <Button asChild>
            <Link href="/mentor">Ir para o Mentor</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/diagnostico">Iniciar Executive Diagnostic</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
