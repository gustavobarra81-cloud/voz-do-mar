import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, FileUp, HelpCircle, Lightbulb, Loader2, Pencil, Sparkles } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { BotaoGravar } from "@/components/BotaoGravar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useOrganizacoes } from "@/lib/useOrganizacoes";
import { SeletorOrganizacao } from "@/components/SeletorOrganizacao";
import { analisarEdital, escreverProjeto, lerEdital, sugerirIdeias, transcreverAudio } from "@/lib/projeto.functions";

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
  validateSearch: (search: Record<string, unknown>): { edital?: string } =>
    typeof search["edital"] === "string" ? { edital: search["edital"] } : {},
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
  arquivo_path?: string | null;
  organizacao_id: string | null;
};

type ItemAnalise = { requisito: string; situacao: "atendido" | "pendente" | "nao_localizado"; evidencia: string; orientacao: string };
type Ideia = { titulo: string; objetivo: string; problema: string; publico: string; atividades: string[]; resultados: string[]; relacao_edital: string; recursos_confirmar: string[] };

function checklistValido(valor: unknown): valor is ItemAnalise[] {
  return Array.isArray(valor) && valor.every((item) => {
    if (!item || typeof item !== "object") return false;
    const dado = item as Record<string, unknown>;
    return typeof dado["requisito"] === "string"
      && (dado["situacao"] === "atendido" || dado["situacao"] === "pendente" || dado["situacao"] === "nao_localizado")
      && typeof dado["evidencia"] === "string"
      && typeof dado["orientacao"] === "string";
  });
}

function NovoProjeto() {
  const navigate = useNavigate();
  const { user, carregando } = useAuth();
  const { organizacao, organizacoes } = useOrganizacoes();
  const [etapa, setEtapa] = useState(0);
  const [editalId, setEditalId] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<string[]>(() => PERGUNTAS.map(() => ""));
  const [indice, setIndice] = useState(0);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [enviandoPdf, setEnviandoPdf] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [analiseId, setAnaliseId] = useState<string | null>(null);
  const [resumoAnalise, setResumoAnalise] = useState("");
  const [checklist, setChecklist] = useState<ItemAnalise[]>([]);
  const [rascunhoCarregado, setRascunhoCarregado] = useState(false);
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [gerandoIdeias, setGerandoIdeias] = useState(false);

  useEffect(() => {
    if (!user || !organizacao) return;
    let ativo = true;
    const userId = user.id;
    const organizacaoAtual = organizacao;
    const chave = `voz-do-mar:novo:${userId}:${organizacaoAtual.id}`;

    async function carregarRascunho() {
      const antigo = window.localStorage.getItem(`voz-do-mar:novo:${userId}`);
      const salvo = window.localStorage.getItem(chave) ?? (organizacoes.length === 1 ? antigo : null);
      if (salvo) {
        try {
          const dados = JSON.parse(salvo) as {
            etapa?: number; indice?: number; editalId?: string; respostas?: string[];
            checklist?: unknown; resumoAnalise?: string; analiseId?: string;
          };
          const { data: analiseSalva } = dados.analiseId
             ? await supabase.from("analises_editais").select("id").eq("id", dados.analiseId).eq("organizacao_id", organizacaoAtual.id).eq("edital_id", dados.editalId ?? "").maybeSingle()
            : { data: null };
           if (ativo && analiseSalva && dados.editalId && checklistValido(dados.checklist) && dados.checklist.length > 0) {
             setEditalId(dados.editalId); setChecklist(dados.checklist); setAnaliseId(analiseSalva.id);
             setRespostas(dados.respostas?.length === PERGUNTAS.length ? dados.respostas : PERGUNTAS.map(() => ""));
             setIndice(typeof dados.indice === "number" ? Math.max(0, Math.min(PERGUNTAS.length - 1, dados.indice)) : 0);
             setResumoAnalise(dados.resumoAnalise ?? "");
             setEtapa(typeof dados.etapa === "number" ? Math.max(1, Math.min(3, dados.etapa)) : 1);
              if (antigo && !window.localStorage.getItem(chave)) window.localStorage.removeItem(`voz-do-mar:novo:${userId}`);
             setRascunhoCarregado(true);
            return;
          }
        } catch {
          window.localStorage.removeItem(chave);
        }
      }

      const { data } = await supabase
        .from("analises_editais")
        .select("id, edital_id, checklist, resumo")
        .eq("organizacao_id", organizacaoAtual.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ativo) return;
      if (data && checklistValido(data.checklist) && data.checklist.length > 0) {
        setEditalId(data.edital_id);
        setAnaliseId(data.id);
        setChecklist(data.checklist);
        setResumoAnalise(data.resumo ?? "");
        setEtapa(1);
      }
      setRascunhoCarregado(true);
    }

    void carregarRascunho();
    return () => { ativo = false; };
  }, [user?.id, organizacao?.id, organizacoes.length]);

  const { edital: editalDoRadar } = Route.useSearch();
  useEffect(() => {
    if (!editalDoRadar || !rascunhoCarregado) return;
    setEtapa(0); setEditalId(editalDoRadar); setAnaliseId(null); setChecklist([]); setResumoAnalise("");
    setRespostas(PERGUNTAS.map(() => "")); setIndice(0); setIdeias([]);
    void navigate({ to: "/novo", search: {}, replace: true });
  }, [editalDoRadar, rascunhoCarregado]);

  function trocarOrganizacao() {
    setRascunhoCarregado(false); setEtapa(0); setEditalId(null); setAnaliseId(null);
    setChecklist([]); setResumoAnalise(""); setRespostas(PERGUNTAS.map(() => "")); setIndice(0); setIdeias([]);
  }

  useEffect(() => {
    if (!user || !organizacao || !rascunhoCarregado) return;
    window.localStorage.setItem(`voz-do-mar:novo:${user.id}:${organizacao.id}`, JSON.stringify({ etapa, indice, editalId, respostas, checklist, resumoAnalise, analiseId }));
  }, [user?.id, organizacao?.id, rascunhoCarregado, etapa, indice, editalId, respostas, checklist, resumoAnalise, analiseId]);

  const transcrever = useServerFn(transcreverAudio);
  const importarEdital = useServerFn(lerEdital);
  const gerar = useServerFn(escreverProjeto);
  const analisar = useServerFn(analisarEdital);
  const sugerir = useServerFn(sugerirIdeias);

  useEffect(() => {
    if (!carregando && !user) void navigate({ to: "/entrar" });
  }, [carregando, user, navigate]);

  const { data: editais, refetch } = useQuery({
      queryKey: ["editais", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editais")
        .select("id, titulo, orgao, resumo, exigencias, valor_maximo, prazo, arquivo_path, organizacao_id")
        .or(`publico.eq.true,criado_por.eq.${user?.id ?? "00000000-0000-0000-0000-000000000000"}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Edital[];
    },
  });

  const { data: documentos } = useQuery({
    enabled: Boolean(organizacao), queryKey: ["documentos", organizacao?.id],
    queryFn: async () => { const { data, error } = await supabase.from("documentos_organizacao").select("categoria, nome, data_validade").eq("organizacao_id", organizacao?.id ?? ""); if (error) throw error; return data; },
  });

  const editalEscolhido = useMemo(
    () => editais?.find((e) => e.id === editalId && (e.organizacao_id === organizacao?.id || !e.organizacao_id)) ?? null,
    [editais, editalId, organizacao?.id],
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

      if (!user || !organizacao) throw new Error("Cadastre sua organização antes de enviar um edital.");
      const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const arquivoPath = `${user.id}/editais/${crypto.randomUUID()}-${nomeSeguro}`;
      const upload = await supabase.storage.from("documentos-organizacoes").upload(arquivoPath, arquivo, { contentType: "application/pdf" });
      if (upload.error) throw new Error("Não conseguimos guardar o PDF do edital.");
      const { data, error } = await supabase
        .from("editais")
        .insert({ ...lido, criado_por: user.id, organizacao_id: organizacao.id, arquivo_path: arquivoPath, publico: false })
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

  async function analisarCompatibilidade() {
    if (!editalEscolhido || !organizacao) return;
    setAnalisando(true);
    try {
      const resultado = await analisar({ data: {
        edital: { ...editalEscolhido, prazo: editalEscolhido.prazo },
        organizacao,
        documentos: documentos ?? [],
      } });
      const { data, error } = await supabase.from("analises_editais").upsert({
        organizacao_id: organizacao.id, edital_id: editalEscolhido.id,
        checklist: resultado.itens, resumo: resultado.resumo, updated_at: new Date().toISOString(),
      }, { onConflict: "organizacao_id,edital_id" }).select("id").single();
      if (error) throw error;
      setAnaliseId(data.id); setChecklist(resultado.itens); setResumoAnalise(resultado.resumo); setEtapa(1);
    } catch (erro) { toast.error(erro instanceof Error ? erro.message : "Não conseguimos analisar o edital."); }
    finally { setAnalisando(false); }
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

  async function buscarIdeias() {
    if (!editalEscolhido || !organizacao) return;
    setGerandoIdeias(true);
    try {
      const resultado = await sugerir({ data: {
        edital: { titulo: editalEscolhido.titulo, orgao: editalEscolhido.orgao, resumo: editalEscolhido.resumo, exigencias: editalEscolhido.exigencias, valor_maximo: editalEscolhido.valor_maximo },
        organizacao,
        checklist,
      } });
      setIdeias(resultado.ideias);
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não conseguimos sugerir ideias agora.");
    } finally {
      setGerandoIdeias(false);
    }
  }

  function escolherIdeia(ideia: Ideia) {
    setRespostas([
      `${organizacao?.nome_fantasia || organizacao?.razao_social || "Nossa organização"}, da comunidade ${organizacao?.comunidade || "[COMPLETAR: comunidade]"}.`,
      ideia.problema,
      `${ideia.objetivo}\n\nAtividades sugeridas: ${ideia.atividades.join("; ")}.`,
      `${ideia.publico}. Resultados esperados: ${ideia.resultados.join("; ")}.`,
      ideia.recursos_confirmar.length > 0 ? `Precisamos confirmar: ${ideia.recursos_confirmar.join("; ")}.` : "[COMPLETAR: recursos que a organização já possui e o que precisará contratar ou comprar]",
    ]);
    setIndice(0);
    setEtapa(2);
    toast.success("Ideia escolhida. Agora você pode completar ou corrigir falando.");
  }

  async function finalizar() {
    if (!editalEscolhido || !organizacao || !user) return;
    setGerando(true);
    try {
      const { html, titulo } = await gerar({
        data: {
          editalTitulo: editalEscolhido.titulo,
          editalOrgao: editalEscolhido.orgao,
          editalResumo: editalEscolhido.resumo,
          editalExigencias: editalEscolhido.exigencias,
          editalValor: editalEscolhido.valor_maximo,
          organizacao: { ...organizacao },
          checklist,
          respostas: PERGUNTAS.map((pergunta, i) => ({
            pergunta,
            resposta: respostas[i] ?? "",
          })),
        },
      });

      const { data, error } = await supabase
        .from("projetos")
        .insert({
          user_id: user.id,
          edital_id: editalEscolhido.id,
          organizacao_id: organizacao?.id ?? null,
          analise_id: analiseId,
          titulo,
          conteudo: html,
          transcricao: respostas.join("\n\n"),
          respostas: PERGUNTAS.map((p, i) => ({ pergunta: p, resposta: respostas[i] ?? "" })),
          status: "pronto",
        })
        .select("id")
        .single();
      if (error) throw error;

      window.localStorage.removeItem(`voz-do-mar:novo:${user.id}:${organizacao.id}`);
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
        <div className="mb-6"><SeletorOrganizacao onChange={trocarOrganizacao} /></div>
        {etapa === 0 && (
          <section className="space-y-5">
            <p className="font-bold text-primary">Passo 3 de 4</p>
            <h1 className="text-3xl font-bold">Qual edital você quer analisar?</h1>
            <p className="text-lg text-muted-foreground">
              Vamos comparar o edital com o cadastro e os documentos da sua organização.
            </p>

            {!organizacao && <Card className="border-2 border-destructive/40"><CardContent className="space-y-3 py-6"><p className="font-bold">Cadastre sua organização antes de continuar.</p><Button asChild><a href="/organizacao">Fazer cadastro</a></Button></CardContent></Card>}

            <div className="space-y-3">
               {editais?.filter((edital) => !edital.organizacao_id || edital.organizacao_id === organizacao?.id).map((edital) => (
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
               disabled={!editalEscolhido || !organizacao || analisando}
              onClick={() => void analisarCompatibilidade()}
            >
              {analisando ? <><Loader2 className="mr-2 size-5 animate-spin" />Comparando requisitos...</> : <>Ver checklist <ArrowRight className="ml-2 size-5" /></>}
            </Button>
          </section>
        )}

        {etapa === 1 && (
          <section className="space-y-6">
            <div><p className="font-bold text-primary">Resultado da conferência</p><h1 className="mt-1 text-3xl font-bold">Checklist do edital</h1><p className="mt-2 text-muted-foreground">{resumoAnalise}</p></div>
            {editalEscolhido && <Card><CardContent className="space-y-4 py-5"><h2 className="text-lg font-bold">Informações lidas no edital</h2><div className="space-y-2"><Label>Título</Label><Input value={editalEscolhido.titulo} onChange={(e) => { const valor = e.target.value; void supabase.from("editais").update({ titulo: valor }).eq("id", editalEscolhido.id); void refetch(); }} /></div><div className="space-y-2"><Label>Exigências encontradas</Label><Textarea value={editalEscolhido.exigencias ?? ""} onChange={(e) => { const valor = e.target.value; void supabase.from("editais").update({ exigencias: valor }).eq("id", editalEscolhido.id); void refetch(); }} /></div><Button variant="outline" className="w-full" disabled={analisando} onClick={() => void analisarCompatibilidade()}>{analisando && <Loader2 className="mr-2 size-4 animate-spin" />}Salvar correções e analisar novamente</Button></CardContent></Card>}
            <div className="space-y-3">{checklist.map((item, i) => {
              const visual = item.situacao === "atendido" ? { Icone: CheckCircle2, texto: "Atendido", classe: "text-primary" } : item.situacao === "pendente" ? { Icone: AlertTriangle, texto: "Pendente", classe: "text-destructive" } : { Icone: HelpCircle, texto: "Não localizado", classe: "text-muted-foreground" };
              return <Card key={`${item.requisito}-${i}`}><CardContent className="py-5"><div className="flex items-start gap-3"><visual.Icone className={`mt-1 size-5 shrink-0 ${visual.classe}`} /><div><p className="font-bold">{item.requisito}</p><p className={`text-sm font-bold ${visual.classe}`}>{visual.texto}</p>{item.evidencia && <p className="mt-2 text-sm">{item.evidencia}</p>}{item.orientacao && <p className="mt-1 text-sm text-muted-foreground">{item.orientacao}</p>}</div></div></CardContent></Card>;
            })}</div>
            <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Este checklist ajuda na conferência, mas não substitui a validação do órgão responsável ou uma orientação jurídica.</p>
            <section className="space-y-4 border-t pt-6">
              <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Lightbulb className="size-6 text-primary" />Como quer começar?</h2><p className="mt-1 text-muted-foreground">Você pode contar uma ideia que já tem ou receber sugestões baseadas neste edital.</p></div>
              <div className="grid gap-3 sm:grid-cols-2"><Button variant="outline" className="h-16 text-base" onClick={() => setEtapa(2)}><Pencil className="mr-2 size-5" />Já tenho uma ideia</Button><Button className="h-16 text-base" disabled={gerandoIdeias} onClick={() => void buscarIdeias()}>{gerandoIdeias ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Sparkles className="mr-2 size-5" />}Sugerir ideias</Button></div>
              {ideias.length > 0 && <div className="space-y-3"><h3 className="text-lg font-bold">Escolha uma ideia para adaptar</h3>{ideias.map((ideia) => <Card key={ideia.titulo} className="border-2"><CardContent className="space-y-3 py-5"><h3 className="text-xl font-bold">{ideia.titulo}</h3><p>{ideia.objetivo}</p><p className="text-sm text-muted-foreground"><strong>Ligação com o edital:</strong> {ideia.relacao_edital}</p><div><p className="text-sm font-bold">Atividades possíveis</p><ul className="list-disc space-y-1 pl-5 text-sm">{ideia.atividades.map((atividade) => <li key={atividade}>{atividade}</li>)}</ul></div><Button className="w-full" onClick={() => escolherIdeia(ideia)}>Escolher e adaptar esta ideia <ArrowRight className="ml-2 size-4" /></Button></CardContent></Card>)}</div>}
              <Button variant="ghost" className="w-full" onClick={() => setEtapa(0)}><ArrowLeft className="mr-2 size-5" />Trocar edital</Button>
            </section>
          </section>
        )}

        {etapa === 2 && (
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
                onClick={() => (indice === 0 ? setEtapa(1) : setIndice(indice - 1))}
              >
                <ArrowLeft className="mr-2 size-5" /> Voltar
              </Button>
              {indice < PERGUNTAS.length - 1 ? (
                <Button className="h-14 flex-1 text-base" onClick={() => setIndice(indice + 1)}>
                  Próxima <ArrowRight className="ml-2 size-5" />
                </Button>
              ) : (
                <Button className="h-14 flex-1 text-base" onClick={() => setEtapa(3)}>
                  Terminei <Check className="ml-2 size-5" />
                </Button>
              )}
            </div>
          </section>
        )}

        {etapa === 3 && (
          <section className="space-y-6">
            <p className="font-bold text-primary">Passo 4 de 4</p>
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
                onClick={() => setEtapa(2)}
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
