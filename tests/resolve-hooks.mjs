// Deixa o runner de testes do Node importar os módulos do projeto do jeito
// que o código os escreve: alias "@/..." e import relativo sem extensão.
// Zero dependência — só o que o Node já traz.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

function withExtension(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep) && path.extname(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith("@/")) {
    base = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const resolved = base && withExtension(base);
  if (resolved) return nextResolve(pathToFileURL(resolved).href, context);
  return nextResolve(specifier, context);
}
