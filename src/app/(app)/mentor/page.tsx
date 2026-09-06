import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { ExecutiveProfileSchema } from "@/lib/agents/executive-profile-schema";
import { ProfileDetail } from "./profile-detail";
import { ValidateButton } from "./validate-button";
import { MenteeRoster, type RosterEntry } from "./mentee-roster";

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy.ts já faz essa checagem antes de chegar aqui — é só uma
  // camada de UX. Esta é a checagem que decide se o client admin é usado.
  if (!user || !isMentor(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();

  const [{ data: pendentes, error }, { data: mentees }, { data: sessions }, { data: profiles }] =
    await Promise.all([
      admin
        .from("executive_profiles")
        .select("id, version, perfil, created_at, mentees(email)")
        .eq("status", "rascunho_agente")
        .order("created_at", { ascending: true }),
      admin.from("mentees").select("id, email").order("created_at", { ascending: true }),
      admin
        .from("diagnostic_sessions")
        .select("mentee_id, status, current_block, started_at")
        .order("started_at", { ascending: false }),
      admin
        .from("executive_profiles")
        .select("mentee_id, status, version, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (error) {
    throw new Error("Falha ao carregar perfis pendentes.");
  }

  // sessions e profiles vêm ordenados do mais recente pro mais antigo — o
  // primeiro find() por mentee_id já pega a versão/sessão mais atual.
  const roster: RosterEntry[] = (mentees ?? []).map((mentee) => ({
    mentee,
    session: sessions?.find((s) => s.mentee_id === mentee.id) ?? null,
    profile: profiles?.find((p) => p.mentee_id === mentee.id) ?? null,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Mentor
      </p>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">
        Meus mentorados
      </h1>

      <MenteeRoster roster={roster} />

      <h2 className="mb-6 mt-12 text-lg font-semibold tracking-tight text-foreground">
        Perfis aguardando validação
      </h2>

      {pendentes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum perfil pendente no momento.</p>
      )}

      <div className="space-y-10">
        {pendentes.map((item) => {
          const parsed = ExecutiveProfileSchema.safeParse(item.perfil);
          const mentee = Array.isArray(item.mentees) ? item.mentees[0] : item.mentees;

          return (
            <section key={item.id} className="space-y-4 border-b border-border pb-10 last:border-b-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{mentee?.email}</p>
                  <p className="text-xs text-muted-foreground">versão {item.version}</p>
                </div>
                <ValidateButton profileId={item.id} />
              </div>

              {parsed.success ? (
                <ProfileDetail perfil={parsed.data} />
              ) : (
                <p className="text-sm text-destructive">
                  Este registro não bate com o schema esperado — não valide sem checar manualmente.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
