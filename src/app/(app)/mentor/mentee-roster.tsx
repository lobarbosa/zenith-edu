import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { menteeStatus, type Session, type Profile } from "@/lib/mentee-status";

export type RosterEntry = {
  mentee: { id: string; email: string };
  session: Session;
  profile: Profile;
};

export function MenteeRoster({ roster }: { roster: RosterEntry[] }) {
  if (roster.length === 0) {
    return <p className="px-6 py-2 text-sm text-muted-foreground">Nenhum mentorado ainda.</p>;
  }

  return (
    <div>
      {roster.map(({ mentee, session, profile }) => {
        const status = menteeStatus(session, profile);
        return (
          <Link
            key={mentee.id}
            href={`/mentor/${mentee.id}`}
            className="flex items-center justify-between gap-4 border-b border-border px-6 py-3 outline-none last:border-b-0 hover:bg-secondary/50 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{mentee.email}</p>
              <p className="text-xs text-muted-foreground">Founding Cohort</p>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <span className="text-xs text-muted-foreground">perfil v{profile.version}</span>
              )}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
