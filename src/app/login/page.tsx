import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
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
    </main>
  );
}
