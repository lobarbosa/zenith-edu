import type { NextConfig } from "next";

// Cabeçalhos de segurança de base. O produto tem login e telas com dado
// pessoal e de carreira; sem `frame-ancestors`, qualquer site podia embutir
// a aplicação num iframe e induzir cliques (clickjacking). A CSP fica só
// nessa diretiva de propósito: uma política completa de script/style exige
// nonce no App Router e quebraria a aplicação se entrasse sem teste ao vivo.
// HSTS não entra aqui porque a Vercel já o envia.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Não anuncia o framework em toda resposta.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
