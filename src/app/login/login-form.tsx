"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Method = "magic" | "senha";
type PasswordMode = "entrar" | "criar";
type Status = "idle" | "loading" | "error";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.99 13.99 0 0 1 10.9 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.97 21.97 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("magic");
  const [passwordMode, setPasswordMode] = useState<PasswordMode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  function switchMethod(next: Method) {
    setMethod(next);
    setPasswordMode("entrar");
    setStatus("idle");
    setMessage(null);
  }

  async function handleGoogle() {
    setStatus("loading");
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage({ tone: "error", text: "Não foi possível iniciar o login com Google." });
    }
    // Sucesso redireciona a página inteira — sem mais estado a tratar aqui.
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setMessage({ tone: "error", text: "Não foi possível enviar o link. Tente novamente." });
      return;
    }
    setStatus("idle");
    setMessage({
      tone: "info",
      text: `Enviamos um link de acesso para ${email}. Ele expira em alguns minutos.`,
    });
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createClient();

    if (passwordMode === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus("error");
        setMessage({ tone: "error", text: error.message || "Não foi possível criar a conta." });
        return;
      }
      // Se a confirmação de e-mail estiver desligada no projeto Supabase,
      // signUp já devolve sessão ativa — não faz sentido pedir confirmação
      // de algo que já aconteceu.
      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }
      setStatus("idle");
      setMessage({
        tone: "info",
        text: `Enviamos um e-mail de confirmação para ${email}. Confirme pra concluir o cadastro.`,
      });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage({ tone: "error", text: "E-mail ou senha incorretos." });
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email) {
      setMessage({ tone: "error", text: "Digite seu e-mail acima primeiro." });
      return;
    }
    setStatus("loading");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });

    setStatus("idle");
    if (error) {
      setMessage({ tone: "error", text: "Não foi possível enviar o e-mail de redefinição." });
      return;
    }
    setMessage({ tone: "info", text: `Enviamos um link de redefinição de senha para ${email}.` });
  }

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogle}
        disabled={status === "loading"}
      >
        <GoogleIcon />
        Entrar com Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-1 rounded-md bg-secondary p-1">
        <button
          type="button"
          onClick={() => switchMethod("magic")}
          className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "magic" ? "bg-background text-foreground" : "text-muted-foreground"
          }`}
        >
          Link mágico
        </button>
        <button
          type="button"
          onClick={() => switchMethod("senha")}
          className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "senha" ? "bg-background text-foreground" : "text-muted-foreground"
          }`}
        >
          Senha
        </button>
      </div>

      {method === "magic" ? (
        <form onSubmit={handleMagicLink} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading" ? "Enviando..." : "Enviar link"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email-senha">E-mail</Label>
            <Input
              id="email-senha"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={passwordMode === "criar" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={status === "loading"}>
            {status === "loading"
              ? "Aguarde..."
              : passwordMode === "criar"
                ? "Criar conta"
                : "Entrar"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setPasswordMode(passwordMode === "criar" ? "entrar" : "criar")}
              className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
            >
              {passwordMode === "criar" ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
            </button>
            {passwordMode === "entrar" && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        </form>
      )}

      {message && (
        <p className={`text-sm ${message.tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
