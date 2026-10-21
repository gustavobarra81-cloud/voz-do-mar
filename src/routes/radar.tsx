import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ExternalLink, Loader2, Radar, RefreshCw, Search, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Cabecalho } from "@/components/Cabecalho";
import { SeletorOrganizacao } from "@/components/SeletorOrganizacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useOrganizacoes } from "@/lib/useOrganizacoes";
import { ABRANGENCIAS, TEMAS, diasRestantes, filtrarRadar, linkWhatsApp, urgente, type RadarEdital } from "@/lib/radar";
import { atualizarRadar } from "@/lib/radar.functions";

export const Route = createFileRoute("/radar")({
  head: () => ({ meta: [
    { title: "Radar de Editais — Voz do Mar" },
    { name: "description", content: "Editais abertos para pesca artesanal, educação ambiental, cultura e economia solidária na Bacia de Campos, no RJ e no Brasil." },
    { property: "og:title", content: "Radar de Editais — Voz do Mar" },
    { property: "og:description", content: "Encontre editais abertos para comunidades pesqueiras e compartilhe pelo WhatsApp." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RadarPagina,
});

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" size="sm" variant={ativo ? "default" : "outline"} aria-pressed={ativo} className="rounded-full" onClick={onClick}>{children}</Button>;
}

function alternar(lista: string[], id: string) { return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]; }

function RadarPagina() {
  const { user, carregando, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { organizacao } = useOrganizacoes();
  const [abrangencias, setAbrangencias] = useState<string[]>([]);
  const [temas, setTemas] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const atualizar = useServerFn(atualizarRadar);

  useEffect(() => { if (!carregando && !user) void navigate({ to: "/entrar" }); }, [carregando, user, navigate]);

  const { data, isLoading, refetch } = useQuery({
    enabled: Boolean(user), queryKey: ["radar"],
    queryFn: async () => { const { data: rows, error } = await supabase.from("radar_editais").select("*").order("prazo", { ascending: true }); if (error) throw error; return rows as RadarEdital[]; },
  });

  const lista = useMemo(() => filtrarRadar(data ?? [], { abrangencias, temas, busca }), [data, abrangencias, temas, busca]);
  const temFiltro = abrangencias.length > 0 || temas.length > 0 || busca.trim() !== "";

  async function buscarNovos() {
    setAtualizando(true);
    try { const r = await atualizar(); toast.success(`${r.encontrados} edital(is) encontrado(s) em ${r.fontes.join(", ")}.`); await refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não conseguimos atualizar o radar."); }
    finally { setAtualizando(false); }
  }

  async function analisar(e: RadarEdital) {
    if (!user || !organizacao) { toast.error("Cadastre ou escolha uma organização primeiro."); return; }
    setAbrindo(e.id);
    try {
      const { data: novo, error } = await supabase.from("editais").insert({
        titulo: e.titulo, orgao: e.orgao, resumo: e.resumo, prazo: e.prazo, valor_maximo: e.valor,
        exigencias: [e.publico_elegivel && `Quem pode concorrer: ${e.publico_elegivel}`, `Edital completo: ${e.link}`].filter(Boolean).join("\n"),
        criado_por: user.id, organizacao_id: organizacao.id, publico: false,
      }).select("id").single();
      if (error) throw error;
      void navigate({ to: "/novo", search: { edital: novo.id } });
    } catch { toast.error("Não conseguimos abrir esse edital para análise."); setAbrindo(null); }
  }

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-bold text-primary"><Radar className="size-5" /> Radar de Editais</p>
            <h1 className="mt-1 text-3xl font-bold">Oportunidades abertas</h1>
            <p className="mt-1 text-muted-foreground">Editais reais, com link para a fonte oficial. Os que vencem primeiro aparecem no topo.</p>
          </div>
          {isAdmin && <Button onClick={() => void buscarNovos()} disabled={atualizando}>{atualizando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}{atualizando ? "Procurando nas fontes..." : "Buscar novos editais"}</Button>}
        </div>

        <SeletorOrganizacao />

        <Card><CardContent className="space-y-4 py-5">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={busca} onChange={(ev) => setBusca(ev.target.value)} placeholder="Buscar por palavra ou instituição (ex.: Petrobras, FNMA, cultura)" className="pl-9" /></div>
          <div><p className="mb-2 text-sm font-bold">Onde</p><div className="flex flex-wrap gap-2">{ABRANGENCIAS.map((a) => <Chip key={a.id} ativo={abrangencias.includes(a.id)} onClick={() => setAbrangencias((l) => alternar(l, a.id))}>{a.rotulo}</Chip>)}</div></div>
          <div><p className="mb-2 text-sm font-bold">Temas</p><div className="flex flex-wrap gap-2">{TEMAS.map((t) => <Chip key={t.id} ativo={temas.includes(t.id)} onClick={() => setTemas((l) => alternar(l, t.id))}>{t.rotulo}</Chip>)}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <p className="font-bold">{lista.length} edital(is) encontrado(s)</p>
            {temFiltro && <Button variant="ghost" size="sm" onClick={() => { setAbrangencias([]); setTemas([]); setBusca(""); }}><X className="mr-1 size-4" />Limpar filtros</Button>}
          </div>
        </CardContent></Card>

        {isLoading && <p className="text-center text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />Carregando editais...</p>}
        {!isLoading && lista.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-10 text-center">
            <Radar className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-3 font-bold">{temFiltro ? "Nenhum edital com esses filtros." : "Nenhum edital aberto no radar ainda."}</p>
            {!temFiltro && isAdmin && <p className="mt-1 text-sm text-muted-foreground">Clique em “Buscar novos editais” para procurar nas fontes.</p>}
          </div>
        )}

        <div className="grid gap-4">
          {lista.map((e) => {
            const dias = diasRestantes(e.prazo); const pressa = urgente(e.prazo);
            return (
              <Card key={e.id} className={pressa ? "border-2 border-destructive" : undefined}>
                <CardContent className="space-y-3 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><h2 className="text-lg font-bold">{e.titulo}</h2>{e.orgao && <p className="text-sm text-muted-foreground">{e.orgao}</p>}</div>
                    <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${pressa ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      <CalendarClock className="size-4" />{e.prazo ? `${e.prazo.split("-").reverse().join("/")} · ${dias === 0 ? "vence hoje" : `faltam ${dias} dias`}` : "Prazo: ver edital"}
                    </span>
                  </div>
                  {e.resumo && <p>{e.resumo}</p>}
                  {e.publico_elegivel && <p className="text-sm"><strong>Quem pode concorrer:</strong> {e.publico_elegivel}</p>}
                  {e.valor && <p className="text-sm"><strong>Apoio:</strong> {e.valor}</p>}
                  <div className="flex flex-wrap gap-1">{e.temas.map((t) => <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{TEMAS.find((x) => x.id === t)?.rotulo ?? t}</span>)}<span className="rounded-full bg-muted px-2 py-0.5 text-xs">{ABRANGENCIAS.find((x) => x.id === e.abrangencia)?.rotulo}</span>{e.fonte && <span className="px-2 py-0.5 text-xs text-muted-foreground">Fonte: {e.fonte}</span>}</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={() => void analisar(e)} disabled={abrindo === e.id}>{abrindo === e.id && <Loader2 className="mr-2 size-4 animate-spin" />}Analisar com minha organização</Button>
                    <Button asChild variant="outline"><a href={linkWhatsApp(e)} target="_blank" rel="noopener noreferrer"><Share2 className="mr-2 size-4" />Compartilhar no WhatsApp</a></Button>
                    <Button asChild variant="ghost"><a href={e.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 size-4" />Ver edital</a></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
