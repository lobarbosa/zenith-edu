import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Sem `cache()` de propósito: este módulo é importado pelas dezesseis rotas de
// API, e `cache()` só tem semântica garantida dentro de um passe de render
// de servidor. Construir o cliente não custa rede — é `cookies()` e um
// objeto. O que custava rede está em `getAuthUser`, abaixo.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita;
            // o middleware já cuida de refrescar a sessão nesse caso.
          }
        },
      },
    }
  );
}

// `getUser()` não lê cookie: revalida o JWT contra o /auth/v1/user do
// Supabase, ou seja, é round-trip de rede. O layout de (app) envolve toda
// tela do produto e precisa do usuário pra montar o menu; a página dentro
// dele precisa do mesmo usuário pra escopar as consultas. Eram dois
// round-trips de autenticação em série em toda navegação.
//
// `cache()` do React memoiza por passe de render, e layout e página rodam no
// mesmo passe — então os dois viram um. Só componentes de servidor usam
// isto; rota de API chama `getUser()` uma vez por requisição e não tem o que
// deduplicar.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
