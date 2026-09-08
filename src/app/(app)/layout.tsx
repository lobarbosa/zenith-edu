import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMentor } from "@/lib/mentor";
import { AppShell } from "./app-shell";
import type { NavItem } from "./app-sidebar";

const MENTOR_NAV: NavItem[] = [{ href: "/mentor", label: "Meus mentorados" }];

async function menteeNav(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const items: NavItem[] = [{ href: "/jornada", label: "Jornada" }];

  // Só pergunta pelo estado do diagnóstico — nunca cria a linha de mentee
  // aqui (layout roda em toda navegação, não é lugar pra efeito colateral
  // de escrita). Sem linha ainda = diagnóstico não começou.
  const { data: mentee } = await supabase.from("mentees").select("id").eq("user_id", userId).maybeSingle();
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

  if (!diagnosticoConcluido) {
    items.push({ href: "/diagnostico", label: "Diagnóstico" });
  }

  items.push({ href: "/copiloto", label: "Copiloto" }, { href: "/biblioteca", label: "Biblioteca" });
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

  return (
    <AppShell navItems={navItems} roleLabel={mentor ? "Mentor" : "Portal do mentorado"} userEmail={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
