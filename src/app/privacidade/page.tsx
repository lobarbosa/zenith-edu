import Link from "next/link";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/login"
        className="text-xs font-medium uppercase tracking-widest text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        T-Shaped Executive
      </Link>
      <h1 className="mb-10 mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Política de privacidade
      </h1>

      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quais dados coletamos
          </h2>
          <p>
            Dados de identificação que você informa no início do diagnóstico — nome,
            sobrenome, cargo e, se quiser preencher, data de nascimento, empresa, LinkedIn,
            telefone e ano de início da carreira; e-mail de acesso; as mensagens trocadas com o
            agente de diagnóstico e com os copilotos; o Perfil Executivo e os artefatos gerados
            a partir dessas conversas; e metadados de progresso na jornada do programa.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Base legal
          </h2>
          <p>
            Dados operacionais — login, sessão, progresso na jornada — são tratados sob a base de
            execução de contrato, necessários para prestar o serviço contratado.
          </p>
          <p>
            Dados sensíveis compartilhados na conversa — remuneração, avaliação de liderança,
            relação com a empresa, insatisfação profissional — são tratados sob consentimento
            explícito, obtido antes do início do primeiro diagnóstico.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Finalidade
          </h2>
          <p>
            Conduzir o diagnóstico executivo, sintetizar o Perfil Executivo, gerar os artefatos da
            jornada e dar ao mentor humano o contexto necessário para orientar o programa. Não
            usamos esses dados para fins de marketing ou publicidade.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Uso por modelos de IA
          </h2>
          <p>
            Os dados da sua conta não são usados para treinar modelos de inteligência artificial —
            nem os que operam este produto, nem quaisquer outros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Com quem compartilhamos
          </h2>
          <p>
            Dados são processados por fornecedores que operam como parte da infraestrutura do
            produto — provedor de banco de dados e autenticação, e provedor do modelo de
            linguagem usado nas conversas — sob os respectivos termos de processamento de dados
            desses fornecedores. Não vendemos nem compartilhamos seus dados com terceiros para
            fins comerciais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Retenção
          </h2>
          <p>
            Seus dados ficam retidos enquanto sua conta estiver ativa. Após uma solicitação de
            exclusão, os dados são apagados em até 30 dias.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Como excluir seus dados
          </h2>
          <p>
            Você pode solicitar a exclusão completa da sua conta a qualquer momento, diretamente
            pelo portal, em <span className="font-medium">Conta</span>. A exclusão remove
            permanentemente suas mensagens, perfil, artefatos e demais dados associados à sua
            conta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Segurança
          </h2>
          <p>
            Cada mentorado só tem acesso às próprias informações — o isolamento é garantido no
            nível do banco de dados. Credenciais e chaves de acesso ficam restritas ao servidor,
            nunca expostas no navegador.
          </p>
        </section>
      </div>
    </main>
  );
}
