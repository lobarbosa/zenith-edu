import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            T-Shaped Executive
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Acesse sua conta
          </h1>
        </div>

        <LoginForm />
      </div>

      <Link
        href="/privacidade"
        className="mt-16 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        Política de privacidade
      </Link>
    </main>
  );
}
