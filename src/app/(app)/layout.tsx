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

  // Duas perguntas de estado, em paralelo: o diagnóstico já fechou, e já
  // existe perfil validado. A segunda decide se "Perfil Executivo" entra
  // no menu — link só aparece quando tem conteúdo do outro lado.
  const [sessionResult, perfilResult] = mentee
    ? await Promise.all([
        supabase
          .from("diagnostic_sessions")
          .select("status")
          .eq("mentee_id", mentee.id)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("executive_profiles")
          .select("id")
          .eq("mentee_id", mentee.id)
          .eq("status", "validado")
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const diagnosticoConcluido = sessionResult.data?.status === "concluida";
  const temPerfilValidado = Boolean(perfilResult.data);

  // Prospect: diagnóstico e o próprio perfil, nada mais. Jornada, Mapas e
  // Biblioteca são do programa e as páginas recusam o acesso
  // (requireProgram) — o menu não pode oferecer porta que não abre.
  if (!mentee || !isInProgram(mentee)) {
    const prospectItems: NavItem[] = [];
    if (!diagnosticoConcluido) {
      prospectItems.push({ href: "/diagnostico", label: "Diagnóstico" });
    }
    if (temPerfilValidado) {
      prospectItems.push({ href: "/perfil", label: "Perfil Executivo" });
    }
    return prospectItems;
  }

  const items: NavItem[] = [{ href: "/jornada", label: "Jornada" }];

  if (!diagnosticoConcluido) {
    items.push({ href: "/diagnostico", label: "Diagnóstico" });
  }

  if (temPerfilValidado) {
    items.push({ href: "/perfil", label: "Perfil Executivo" });
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
