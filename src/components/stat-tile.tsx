import { Card } from "@/components/ui/card";

export function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="gap-1 py-4">
      <div className="px-5 font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="px-5 text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
