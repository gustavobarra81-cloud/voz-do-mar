import { substituirMarcadores } from "@/lib/privacidade";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, PenLine, Printer, RotateCcw, Save } from "lucide-react";
import { BotaoGravar } from "@/components/BotaoGravar";
import { Progress } from "@/components/ui/progress";
import { escreverSecao, transcreverAudio } from "@/lib/projeto.functions";
import { dividirHtml, normalizarSecoesProjeto, proximaSecaoVazia, type SecaoProjeto } from "@/lib/edital";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/projetos/$id")({
  head: () => ({
    meta: [
      { title: "Projeto escrito — Voz do Mar" },
      {
        name: "description",
        content: "Leia, ajuste e baixe o projeto escrito da sua comunidade.",
      },
      { property: "og:title", content: "Projeto escrito — Voz do Mar" },
      {
        property: "og:description",
        content: "Leia, ajuste e baixe o projeto escrito da sua comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerProjeto,
});

function VerProjeto() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, carregando } = useAuth();
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!carregando && !user) void navigate({ to: "/entrar" });
  }, [carregando, user, navigate]);

  const { data: projeto, refetch } = useQuery({
    enabled: Boolean(user),
    queryKey: ["projeto", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, conteudo, created_at, status, secoes, organizacao_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Dados pessoais reais só entram na hora de exibir/exportar; o banco guarda marcadores.
  const { data: org } = useQuery({
    enabled: Boolean(projeto?.organizacao_id), queryKey: ["organizacao-dados", projeto?.organizacao_id],
    queryFn: async () => { const { data } = await supabase.from("organizacoes").select("*").eq("id", projeto!.organizacao_id!).maybeSingle(); return data; },
  });
  const real = (html: string) => substituirMarcadores(html, org);

  useEffect(() => {
    if (projeto?.conteudo) setRascunho(projeto.conteudo);
  }, [projeto?.conteudo]);

  const escrever = useServerFn(escreverSecao);
  const secoes = normalizarSecoesProjeto(projeto?.secoes);
  const proxima = proximaSecaoVazia(secoes);
  const [escrevendo, setEscrevendo] = useState<number | null>(null);
  const [falhou, setFalhou] = useState(false);
  const rodando = useRef(false);

  async function continuarEscrita() {
    if (rodando.current) return;
    rodando.current = true;
    setFalhou(false);
    try {
      for (;;) {
        const { data: atual } = await refetch();
        const lista = normalizarSecoesProjeto(atual?.secoes);
        const i = proximaSecaoVazia(lista);
        if (i < 0) break;
        setEscrevendo(i);
        await escrever({ data: { projetoId: id, indice: i } });
      }
      await refetch();
      toast.success("Projeto completo!");
    } catch (erro) {
      setFalhou(true);
      toast.error(erro instanceof Error ? erro.message : "A escrita parou. Tente de novo.");
    } finally {
      setEscrevendo(null);
      rodando.current = false;
    }
  }

  useEffect(() => {
    if (projeto && proxima >= 0 && !falhou) void continuarEscrita();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projeto?.id, proxima >= 0]);

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase
      .from("projetos")
      .update({ conteudo: rascunho, ...(secoes.length > 0 ? { secoes: dividirHtml(rascunho, secoes) as unknown as Json } : {}), updated_at: new Date().toISOString() })
      .eq("id", id);
    setSalvando(false);
    if (error) {
      toast.error("Não conseguimos salvar. Tente de novo.");
      return;
    }
    setEditando(false);
    await refetch();
    toast.success("Alterações salvas.");
  }

  function baixarWord() {
    const documento = `<!doctype html><html><head><meta charset="utf-8"><title>${projeto?.titulo ?? "Projeto"}</title></head><body style="font-family:Georgia,serif;line-height:1.6">${real(projeto?.conteudo ?? "")}</body></html>`;
    const url = URL.createObjectURL(new Blob([documento], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(projeto?.titulo ?? "projeto").replace(/[^\p{L}\d ]/gu, "").slice(0, 60)}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <Link
          to="/projetos"
          className="nao-imprimir inline-flex items-center gap-2 text-primary underline"
        >
          <ArrowLeft className="size-4" /> Meus projetos
        </Link>

        <h1 className="text-3xl font-bold">{projeto?.titulo ?? "Carregando..."}</h1>

        <div className="nao-imprimir flex flex-wrap gap-3">
          <Button variant="outline" className="h-12 text-base" onClick={baixarWord}>
            <Download className="mr-2 size-5" /> Baixar documento
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={() => window.print()}>
            <Printer className="mr-2 size-5" /> Imprimir / salvar PDF
          </Button>
          <Button
            variant={editando ? "default" : "secondary"}
            className="h-12 text-base"
            disabled={salvando}
            onClick={() => (editando ? void salvar() : setEditando(true))}
          >
            <Save className="mr-2 size-5" /> {editando ? "Salvar alterações" : "Corrigir texto"}
          </Button>
        </div>

        {proxima >= 0 && secoes.length > 0 && (
          <div className="nao-imprimir space-y-3 rounded-3xl bg-card p-5 shadow-soft">
            <p className="flex items-center gap-2 font-bold">
              {falhou ? <RotateCcw className="size-5" /> : <Loader2 className="size-5 animate-spin" />}
              {falhou ? "A escrita parou em" : "Escrevendo"} {(escrevendo ?? proxima) + 1} de {secoes.length}: {secoes[escrevendo ?? proxima]?.nome}
            </p>
            <Progress value={(secoes.filter((s) => s.html).length / secoes.length) * 100} />
            <p className="text-sm text-muted-foreground">Pode fechar a página: ao voltar, a escrita continua de onde parou.</p>
            {falhou && <Button onClick={() => void continuarEscrita()}><RotateCcw className="mr-2 size-4" />Tentar de novo</Button>}
          </div>
        )}

        {editando ? (
          <Textarea
            rows={30}
            className="font-mono text-sm"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
          />
        ) : (
          secoes.length > 0 ? (
            <article className="texto-projeto space-y-6 rounded-3xl bg-card p-6 shadow-soft md:p-10">
              <h2>{projeto?.titulo}</h2>
              {secoes.map((secao, i) => secao.html ? (
                <ParteProjeto key={i} secao={secao} indice={i} projetoId={id} bloqueado={escrevendo !== null} aoMudar={() => void refetch()} real={real} />
              ) : null)}
            </article>
          ) : (
            <article
              className="texto-projeto rounded-3xl bg-card p-6 shadow-soft md:p-10"
              dangerouslySetInnerHTML={{ __html: real(projeto?.conteudo ?? "") }}
            />
          )
        )}
      </main>
    </div>
  );
}

function ParteProjeto({ secao, indice, projetoId, bloqueado, aoMudar, real }: { secao: SecaoProjeto; indice: number; projetoId: string; bloqueado: boolean; aoMudar: () => void; real: (html: string) => string }) {
  const escrever = useServerFn(escreverSecao);
  const transcrever = useServerFn(transcreverAudio);
  const [aberto, setAberto] = useState(false);
  const [pedido, setPedido] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);

  async function reescrever() {
    if (!pedido.trim()) { toast.error("Conte o que você quer mudar."); return; }
    setOcupado(true);
    try {
      await escrever({ data: { projetoId, indice, instrucao: pedido.trim() } });
      setPedido(""); setAberto(false); aoMudar();
      toast.success(`"${secao.nome}" reescrita.`);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não conseguimos reescrever. Tente de novo.");
    } finally { setOcupado(false); }
  }

  return (
    <section className="relative">
      <h3>{secao.nome}</h3>
      <div className={ocupado ? "opacity-50" : ""} dangerouslySetInnerHTML={{ __html: real(secao.html) }} />
      <div className="nao-imprimir mt-3">
        {!aberto ? (
          <Button variant="outline" size="sm" disabled={bloqueado} onClick={() => setAberto(true)}><PenLine className="mr-2 size-4" />Reescrever esta parte</Button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
            <p className="font-bold">O que você quer mudar em "{secao.nome}"?</p>
            <Textarea rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="Escreva ou fale, por exemplo: deixe mais curto e fale das marisqueiras" />
            <BotaoGravar ocupado={ouvindo} aoTranscrever={async (audio) => {
              setOuvindo(true);
              try { const { texto } = await transcrever({ data: audio }); setPedido((p) => (p ? `${p} ${texto}` : texto)); }
              finally { setOuvindo(false); }
            }} />
            <div className="flex gap-2">
              <Button disabled={ocupado} onClick={() => void reescrever()}>{ocupado && <Loader2 className="mr-2 size-4 animate-spin" />}Reescrever</Button>
              <Button variant="ghost" disabled={ocupado} onClick={() => setAberto(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
