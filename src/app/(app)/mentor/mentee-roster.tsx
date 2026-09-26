import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { menteeStatus, type Session, type Profile } from "@/lib/mentee-status";
import { menteeDisplayName, menteeSubtitle, type MenteeIdentity } from "@/lib/mentees";

export type RosterEntry = {
  mentee: MenteeIdentity & { id: string; papel: string };
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
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {menteeDisplayName(mentee)}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {menteeSubtitle(mentee) ?? mentee.email}
              </p>
            </div>
            <div className="flex flex-none items-center gap-3">
              {mentee.papel === "prospect" && <StatusPill tone="neutral">Prospect</StatusPill>}
              {profile && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  perfil v{profile.version}
                </span>
              )}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
