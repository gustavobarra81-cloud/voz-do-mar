import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, FileText, Download, ArrowRight } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/useAuth";
import heroPesca from "@/assets/hero-pesca.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voz do Mar — conte falando, receba o projeto escrito" },
      {
        name: "description",
        content:
          "Pescadores e pescadoras artesanais contam a ideia falando e recebem um projeto escrito no formato exigido pelo edital.",
      },
      { property: "og:title", content: "Voz do Mar — conte falando, receba o projeto escrito" },
      {
        property: "og:description",
        content:
          "Pescadores e pescadoras artesanais contam a ideia falando e recebem um projeto escrito no formato exigido pelo edital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const passos = [
  {
    icone: Mic,
    titulo: "1. Você fala",
    texto: "Aperte o botão e conte, com suas palavras, o que a comunidade quer fazer.",
  },
  {
    icone: FileText,
    titulo: "2. Nós escrevemos",
    texto: "O texto sai organizado nas seções que o edital pede, em linguagem formal.",
  },
  {
    icone: Download,
    titulo: "3. Você envia",
    texto: "Leia, ajuste o que quiser e baixe o documento pronto para submeter.",
  },
];

function Inicio() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div className="space-y-6">
            <p className="inline-block rounded-full bg-sand px-4 py-1 text-sm font-bold text-sun-foreground">
              Para comunidades pesqueiras artesanais
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Conte falando. O projeto sai escrito.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              Escrever um projeto para edital é difícil. Aqui você só precisa falar: a ferramenta
              escuta, entende o edital e monta o documento no formato certo para a sua comunidade
              enviar.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-16 px-8 text-lg font-bold">
                <Link to={user ? "/novo" : "/entrar"}>
                  Começar a falar
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              {user && (
                <Button asChild size="lg" variant="outline" className="h-16 px-8 text-lg">
                  <Link to="/projetos">Meus projetos</Link>
                </Button>
              )}
            </div>
          </div>

          <img
            src={heroPesca}
            alt="Barco de pesca artesanal e redes secando na beira da praia ao amanhecer"
            width={1600}
            height={912}
            className="rounded-3xl object-cover shadow-lift"
          />
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 md:grid-cols-3">
            {passos.map((passo) => (
              <Card key={passo.titulo} className="border-2 shadow-soft">
                <CardContent className="space-y-3 pt-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <passo.icone className="size-6" />
                  </span>
                  <h2 className="text-xl font-bold">{passo.titulo}</h2>
                  <p className="text-muted-foreground">{passo.texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
