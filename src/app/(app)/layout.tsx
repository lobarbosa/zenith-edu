import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMentor } from "@/lib/mentor";
import { isInProgram } from "@/lib/mentee-access";
import { AppShell } from "./app-shell";
import { CopilotoWidget } from "@/components/copiloto-widget";
import type { NavItem } from "./app-sidebar";

const MENTOR_NAV: NavItem[] = [
  { href: "/mentor", label: "Meus mentorados" },
  { href: "/mentor/console", label: "Console da turma" },
];

async function menteeNav(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // Só pergunta pelo estado — nunca cria a linha de mentee aqui (layout
  // roda em toda navegação, não é lugar pra efeito colateral de escrita).
  // Sem linha ainda = diagnóstico não começou.
  const { data: mentee } = await supabase
    .from("mentees")
    .select("id, papel")
    .eq("user_id", userId)
    .maybeSingle();

  const diagnosticoConcluido = mentee
    ? (
        await supabase
          .from("diagnostic_sessions")
          .select("status")
          .eq("mentee_id", mentee.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data?.status === "concluida"
    : false;

  // Prospect: só o diagnóstico. Jornada, Mapas e Biblioteca são do
  // programa e as páginas recusam o acesso (requireProgram) — o menu não
  // pode oferecer porta que não abre.
  if (!mentee || !isInProgram(mentee)) {
    return diagnosticoConcluido ? [] : [{ href: "/diagnostico", label: "Diagnóstico" }];
  }

  const items: NavItem[] = [{ href: "/jornada", label: "Jornada" }];

  if (!diagnosticoConcluido) {
    items.push({ href: "/diagnostico", label: "Diagnóstico" });
  }

  // "Copiloto" não entra aqui de propósito: é assistente disponível em
  // qualquer tela (CopilotoWidget), não destino de navegação — decisão do
  // artefato validado. A rota /copiloto continua existindo e acessível.
  items.push({ href: "/mapas", label: "Mapas" }, { href: "/biblioteca", label: "Biblioteca" });
  return items;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const mentor = isMentor(user.email);
  const navItems = mentor ? MENTOR_NAV : await menteeNav(supabase, user.id);
  // O copiloto pertence ao programa: prospect não vê o widget, do mesmo
  // jeito que /api/chat recusa a conversa.
  const inProgram =
    !mentor && navItems.some((item) => item.href === "/jornada");

  return (
    <>
      <AppShell
        navItems={navItems}
        roleLabel={mentor ? "Mentor" : inProgram ? "Portal do mentorado" : "Executive Diagnostic"}
        userEmail={user.email ?? ""}
        reserveBottomSpace={inProgram}
      >
        {children}
      </AppShell>
      {/* O copiloto acompanha o mentorado em qualquer tela — é assistente,
          não destino de navegação. A tela /copiloto continua existindo: o
          widget é o caminho curto, ela é a conversa em tela cheia. */}
      {inProgram && <CopilotoWidget />}
    </>
  );
}
