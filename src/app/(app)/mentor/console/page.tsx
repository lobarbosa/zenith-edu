import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMentor } from "@/lib/mentor";
import { StatusPill } from "@/components/status-pill";
import { StatTile } from "@/components/stat-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  getSinaisNaoLidos,
  getPulsoDaTurma,
  getCustoPorMentee,
  getAlertas,
  type Sinal,
} from "@/lib/mentor-console";
import { SinalActions } from "../sinal-actions";
import { MENTEE_IDENTITY_COLUMNS } from "@/lib/mentees";

const SINAL_TIPO_LABEL: Record<Sinal["tipo"], string> = {
  contradicao: "Contradição",
  resistencia: "Resistência",
  risco: "Risco",
  avanco: "Avanço",
  fora_de_escopo: "Fora de escopo",
};
const SEVERIDADE_TONE = { alta: "bad", media: "warning", baixa: "neutral" } as const;

export default async function MentorConsolePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isMentor(user.email)) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: mentees } = await admin
    .from("mentees")
    .select(MENTEE_IDENTITY_COLUMNS)
    .order("created_at", { ascending: true });
  const menteesLite = mentees ?? [];

  const [sinais, pulsoDaTurma, custoPorMentee] = await Promise.all([
    getSinaisNaoLidos(admin),
    getPulsoDaTurma(admin, menteesLite),
    getCustoPorMentee(admin, menteesLite),
  ]);
  const alertas = await getAlertas(admin, custoPorMentee);
  const custoTotal = custoPorMentee.reduce((acc, c) => acc + c.custoUsd, 0);

  return (
    <main className="shell space-y-10 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Mentor</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Console da turma</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Leitura da turma inteira. A fila de validação fica em{" "}
          <Link href="/mentor" className="font-medium text-primary hover:underline">
            Meus mentorados
          </Link>
          .
        </p>
      </div>

      {alertas.length > 0 && (
        <Card className="border-bad/30 bg-bad-soft py-4">
          <CardContent className="space-y-2">
            {alertas.map((alerta, i) => (
              <p key={i} className="text-sm text-bad">
                {alerta.descricao}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Pessoas" value={menteesLite.length} />
        <StatTile label="Sinais não lidos" value={sinais.length} />
        <StatTile label="Custo total" value={`US$ ${custoTotal.toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sinais</CardTitle>
        </CardHeader>
        <CardContent>
          {sinais.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum sinal pendente.</p>
          ) : (
            <div className="divide-y divide-border">
              {sinais.map((sinal) => (
                <div key={sinal.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={SEVERIDADE_TONE[sinal.severidade]}>{sinal.severidade}</StatusPill>
                      <span className="text-xs text-muted-foreground">{SINAL_TIPO_LABEL[sinal.tipo]}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-foreground">{sinal.menteeNome}</p>
                    <p className="text-sm text-muted-foreground">{sinal.descricao}</p>
                  </div>
                  <SinalActions flagId={sinal.id} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pulso da turma</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Artefatos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pulsoDaTurma.map((p) => (
                <TableRow key={p.menteeId}>
                  <TableCell className="font-medium">{p.menteeNome}</TableCell>
                  <TableCell className="text-muted-foreground">{p.etapaAtual ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.diasSemAtividade === null ? "sem atividade" : `${p.diasSemAtividade}d sem atividade`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.artefatosConcluidos}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              {custoPorMentee.map((c) => (
                <TableRow key={c.menteeId}>
                  <TableCell>{c.menteeNome}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    US$ {c.custoUsd.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-mono font-semibold text-foreground">
                  US$ {custoTotal.toFixed(4)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
