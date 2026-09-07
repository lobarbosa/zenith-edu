export function DiagnosticComplete() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-3 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Executive Diagnostic
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Diagnóstico concluído
        </h1>
        <p className="text-sm text-muted-foreground">
          O mentor vai revisar suas respostas e retornar com a devolutiva.
        </p>
      </div>
    </main>
  );
}
