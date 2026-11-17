import { createFileRoute, Link } from "@tanstack/react-router";
import { Cabecalho } from "@/components/Cabecalho";

const titulo = "Política de Privacidade — Voz do Mar";
const descricao = "Quais dados o Voz do Mar guarda, incluindo a voz, para que servem e como pedir para apagar.";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: titulo }, { name: "description", content: descricao },
      { property: "og:title", content: titulo }, { property: "og:description", content: descricao },
      { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidade,
});

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="space-y-2"><h2 className="font-display text-2xl font-bold">{titulo}</h2><div className="space-y-2 text-lg leading-relaxed">{children}</div></section>;
}

function Privacidade() {
  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header className="space-y-2">
          <h1 className="font-display text-4xl font-bold">Política de Privacidade</h1>
          <p className="text-lg text-muted-foreground">Explicamos aqui, de forma simples, o que guardamos sobre você e sua organização.</p>
        </header>

        <Bloco titulo="Quais dados guardamos">
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Sua conta:</strong> nome, e-mail e senha (a senha fica protegida, ninguém consegue ler).</li>
            <li><strong>Sua organização:</strong> nome, CNPJ, cidade, comunidade, atividades, história, dados da eleição e do mandato.</li>
            <li><strong>Dados do representante:</strong> nome, CPF, telefone e e-mail.</li>
            <li><strong>Documentos que você envia:</strong> certidões, estatuto, atas e outros arquivos, com suas datas de validade.</li>
            <li><strong>Editais</strong> que você envia e os <strong>projetos</strong> escritos.</li>
            <li><strong>Sua voz:</strong> quando você aperta o botão de gravar, o áudio é enviado para virar texto. <strong>Guardamos só o texto</strong>, o áudio não fica salvo.</li>
          </ul>
        </Bloco>

        <Bloco titulo="Para que usamos">
          <ul className="list-disc space-y-1 pl-6">
            <li>Conferir se a organização pode participar de um edital.</li>
            <li>Sugerir ideias e escrever o projeto com as palavras da comunidade.</li>
            <li>Avisar quando um documento está perto de vencer.</li>
            <li>Liberar o acesso só para pessoas aprovadas pela equipe.</li>
          </ul>
          <p>Não vendemos e não compartilhamos seus dados com propaganda.</p>
        </Bloco>

        <Bloco titulo="Inteligência artificial e seus dados pessoais">
          <p>Para ler editais, transcrever a voz e escrever projetos usamos inteligência artificial. <strong>CPF, telefones, e-mails pessoais e endereços nunca são enviados para ela.</strong></p>
          <p>No texto do projeto, ela escreve marcas como <em>[CPF do representante]</em>. O aplicativo coloca o dado verdadeiro só na sua tela e no arquivo que você baixa.</p>
        </Bloco>

        <Bloco titulo="Quem pode ver">
          <p>Só você vê os dados, documentos e projetos da sua conta. A equipe administradora vê apenas nome e e-mail de quem pede acesso, para aprovar o cadastro.</p>
          <p>Para contar visitas ao site usamos uma contagem simples, sem cookies e sem identificar ninguém.</p>
        </Bloco>

        <Bloco titulo="Como pedir para apagar seus dados">
          <p>Você pode apagar documentos e projetos a qualquer momento dentro da plataforma.</p>
          <p>Para apagar <strong>toda a sua conta</strong> e tudo o que está nela, mande uma mensagem para <a className="text-primary underline" href="mailto:editais.pescarte@uenf.br?subject=Pedido%20de%20exclus%C3%A3o%20de%20dados">editais.pescarte@uenf.br</a> com o e-mail da sua conta. Respondemos e apagamos em até 15 dias.</p>
          <p>Você também pode pedir uma cópia dos seus dados ou a correção de algo errado pelo mesmo e-mail.</p>
        </Bloco>

        <p className="text-base text-muted-foreground">Última atualização: novembro de 2026. <Link to="/" className="text-primary underline">Voltar ao início</Link></p>
      </main>
    </div>
  );
}
