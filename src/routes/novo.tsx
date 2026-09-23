import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2, Pencil } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoGravar } from "@/components/BotaoGravar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { escreverProjeto, lerEdital, transcreverAudio } from "@/lib/projeto.functions";

export const Route = createFileRoute("/novo")({
  head: () => ({
    meta: [
      { title: "Novo projeto falado — Voz do Mar" },
      {
        name: "description",
        content:
          "Escolha o edital, conte sua ideia falando e receba o projeto escrito para a sua comunidade.",
      },
      { property: "og:title", content: "Novo projeto falado — Voz do Mar" },
      {
        property: "og:description",
        content:
          "Escolha o edital, conte sua ideia falando e receba o projeto escrito para a sua comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovoProjeto,
});

const PERGUNTAS = [
  "Quem é você e de qual comunidade de pesca você fala?",
  "Qual é a maior dificuldade que a comunidade está vivendo hoje?",
  "O que vocês querem fazer para melhorar isso? Conte com detalhes.",
  "Quantas pessoas ou famílias vão ser ajudadas e em quanto tempo isso acontece?",
  "O que vocês já têm hoje (barcos, casa de farinha, associação, ajuda de alguém) e do que precisam comprar ou pagar?",
];

type Edital = {
  id: string;
  titulo: string;
  orgao: string | null;
  resumo: string | null;
  exigencias: string | null;
  valor_maximo: string | null;
  prazo: string | null;
};

function NovoProjeto() {
  const navigate = useNavigate();
  const { user, carregando } = useAuth();
  const [etapa, setEtapa] = useState(0);
  const [editalId, setEditalId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<string[]>(() => PERGUNTAS.map(() => ""));
  const [indice, setIndice] = useState(0);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [gerando, setGerando] = useState(false);

  const transcrever = useServerFn(transcreverAudio);
  const importarEdital = useServerFn(lerEdital);
  const gerar = useServerFn(escreverProjeto);

  useEffect(() => {
    if (!carregando && !user) void navigate({ to: "/entrar" });
  }, [carregando, user, navigate]);

  const { data: editais, refetch } = useQuery({
    queryKey: ["editais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editais")
        .select("id, titulo, orgao, resumo, exigencias, valor_maximo, prazo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Edital[];
    },
  });

  const editalEscolhido = useMemo(
    () => editais?.find((e) => e.id === editalId) ?? null,
    [editais, editalId],
  );

  async function enviarPdf(arquivo: File) {
    if (arquivo.size > 12_000_000) {
      toast.error("Esse arquivo é muito grande. Envie um PDF menor que 12 MB.");
      return;
    }
    setEnviandoPdf(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const texto = String(reader.result);
          resolve(texto.slice(texto.indexOf(",") + 1));
        };
        reader.onerror = () => reject(new Error("leitura"));
        reader.readAsDataURL(arquivo);
      });

      const lido = await importarEdital({
        data: { nomeArquivo: arquivo.name, pdfBase64: base64 },
      });

      const { data, error } = await supabase
        .from("editais")
        .insert({ ...lido, criado_por: user!.id, publico: false })
        .select("id")
        .single();
      if (error) throw error;

      await refetch();
      setEditalId(data.id);
      toast.success("Edital lido! Já entendemos o que ele pede.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não conseguimos ler esse arquivo.");
    } finally {
      setEnviandoPdf(false);
    }
  }

  async function aoTranscrever(base64: string) {
    setTranscrevendo(true);
    try {
      const { texto } = await transcrever({ data: { audioBase64: base64 } });
      if (!texto) {
        toast.error("Não entendemos o que foi dito. Tente falar mais perto do celular.");
        return;
      }
      setRespostas((anteriores) => {
        const copia = [...anteriores];
        copia[indice] = `${copia[indice] ? `${copia[indice]} ` : ""}${texto}`.trim();
        return copia;
      });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu para ouvir o áudio.");
    } finally {
      setTranscrevendo(false);
    }
  }

  async function finalizar() {
    if (!editalEscolhido) return;
    setGerando(true);
    try {
      const { html, titulo } = await gerar({
        data: {
          editalTitulo: editalEscolhido.titulo,
          editalOrgao: editalEscolhido.orgao,
          editalResumo: editalEscolhido.resumo,
          editalExigencias: editalEscolhido.exigencias,
          editalValor: editalEscolhido.valor_maximo,
          respostas: PERGUNTAS.map((pergunta, i) => ({
            pergunta,
            resposta: respostas[i] ?? "",
          })),
        },
      });

      const { data, error } = await supabase
        .from("projetos")
        .insert({
          user_id: user!.id,
          edital_id: editalEscolhido.id,
          titulo,
          conteudo: html,
          transcricao: respostas.join("\n\n"),
          respostas: PERGUNTAS.map((p, i) => ({ pergunta: p, resposta: respostas[i] ?? "" })),
          status: "pronto",
        })
        .select("id")
        .single();
      if (error) throw error;

      void navigate({ to: "/projetos/$id", params: { id: data.id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não conseguimos escrever o projeto.");
    } finally {
      setGerando(false);
    }
  }

  const respondidas = respostas.filter((r) => r.trim().length > 0).length;

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {etapa === 0 && (
          <section className="space-y-5">
            <h1 className="text-3xl font-bold">Para qual edital é o projeto?</h1>
            <p className="text-lg text-muted-foreground">
              Escolha um da lista ou envie o arquivo PDF do edital que você recebeu.
            </p>

            <div className="space-y-3">
              {editais?.map((edital) => (
                <button
                  key={edital.id}
                  type="button"
                  onClick={() => setEditalId(edital.id)}
                  className={`w-full rounded-2xl border-2 p-5 text-left transition-colors ${
                    editalId === edital.id
                      ? "border-primary bg-secondary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-lg font-bold">{edital.titulo}</span>
                      {edital.orgao && (
                        <span className="block text-sm text-muted-foreground">{edital.orgao}</span>
                      )}
                      {edital.resumo && <span className="mt-2 block">{edital.resumo}</span>}
                    </span>
                    {editalId === edital.id && <Check className="mt-1 size-6 text-primary" />}
                  </span>
                </button>
              ))}
            </div>

            <Card className="border-2 border-dashed">
              <CardContent className="space-y-3 pt-6">
                <p className="font-bold">Tem o PDF de outro edital?</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-4 text-base font-bold text-secondary-foreground">
                  {enviandoPdf ? (
                    <>
                      <Loader2 className="size-5 animate-spin" /> Lendo o edital...
                    </>
                  ) : (
                    <>
                      <FileUp className="size-5" /> Enviar PDF do edital
                    </>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={enviandoPdf}
                    onChange={(e) => {
                      const arquivo = e.target.files?.[0];
                      if (arquivo) void enviarPdf(arquivo);
                      e.target.value = "";
                    }}
                  />
                </label>
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="h-16 w-full text-lg font-bold"
              disabled={!editalId}
              onClick={() => setEtapa(1)}
            >
              Continuar <ArrowRight className="ml-2 size-5" />
            </Button>
          </section>
        )}

        {etapa === 1 && (
          <section className="space-y-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Pergunta {indice + 1} de {PERGUNTAS.length}
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-snug">{PERGUNTAS[indice]}</h1>
            </div>

            <BotaoGravar aoTranscrever={aoTranscrever} ocupado={transcrevendo} />

            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Pencil className="size-4" /> O que entendemos (você pode corrigir escrevendo):
              </p>
              <Textarea
                rows={6}
                className="text-base"
                placeholder="Aperte o botão acima e fale. O texto aparece aqui."
                value={respostas[indice] ?? ""}
                onChange={(e) =>
                  setRespostas((anteriores) => {
                    const copia = [...anteriores];
                    copia[indice] = e.target.value;
                    return copia;
                  })
                }
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-14 flex-1 text-base"
                onClick={() => (indice === 0 ? setEtapa(0) : setIndice(indice - 1))}
              >
                <ArrowLeft className="mr-2 size-5" /> Voltar
              </Button>
              {indice < PERGUNTAS.length - 1 ? (
                <Button className="h-14 flex-1 text-base" onClick={() => setIndice(indice + 1)}>
                  Próxima <ArrowRight className="ml-2 size-5" />
                </Button>
              ) : (
                <Button className="h-14 flex-1 text-base" onClick={() => setEtapa(2)}>
                  Terminei <Check className="ml-2 size-5" />
                </Button>
              )}
            </div>
          </section>
        )}

        {etapa === 2 && (
          <section className="space-y-6">
            <h1 className="text-3xl font-bold">Pronto para escrever o projeto</h1>
            <p className="text-lg text-muted-foreground">
              Edital: <strong>{editalEscolhido?.titulo}</strong>. Você respondeu {respondidas} de{" "}
              {PERGUNTAS.length} perguntas. Quanto mais você contou, melhor fica o texto.
            </p>

            <div className="space-y-3">
              {PERGUNTAS.map((pergunta, i) => (
                <Card key={pergunta}>
                  <CardContent className="pt-5">
                    <p className="font-bold">{pergunta}</p>
                    <p className="mt-1 text-muted-foreground">
                      {respostas[i]?.trim() || "— sem resposta —"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="h-16 text-base sm:flex-1"
                onClick={() => setEtapa(1)}
              >
                <ArrowLeft className="mr-2 size-5" /> Corrigir respostas
              </Button>
              <Button
                className="h-16 text-lg font-bold sm:flex-1"
                disabled={gerando || respondidas === 0}
                onClick={() => void finalizar()}
              >
                {gerando ? (
                  <>
                    <Loader2 className="mr-2 size-6 animate-spin" /> Escrevendo o projeto...
                  </>
                ) : (
                  "Escrever meu projeto"
                )}
              </Button>
            </div>
            {gerando && (
              <p className="text-center text-muted-foreground">
                Isso leva cerca de um minuto. Não feche a página.
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
