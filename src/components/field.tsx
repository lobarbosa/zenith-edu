// Extraído de mentor/profile-detail.tsx — mesmo padrão de rótulo +
// conteúdo usado agora também nos detalhes de artefato (mentor/jornada).
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
