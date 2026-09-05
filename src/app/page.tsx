import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            T-Shaped Executive
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sessão ativa
          </h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <LogoutButton />
      </div>
    </main>
  );
}
