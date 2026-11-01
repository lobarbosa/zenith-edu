import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// `cache()` memoiza por passe de render do servidor. O layout de (app)
// envolve toda tela do produto e precisa do usuário pra montar o menu; a
// página dentro dele precisa do mesmo usuário pra escopar as consultas.
// Sem memoização isso era um cliente novo e — pior — uma ida a mais ao
// /auth/v1/user do Supabase por navegação, em série com a da página.
// `getUser()` revalida o JWT contra o servidor de auth, não é leitura de
// cookie: é round-trip de rede, e eram dois em toda navegação.
export const createClient = cache(async () => {
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
});

export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
