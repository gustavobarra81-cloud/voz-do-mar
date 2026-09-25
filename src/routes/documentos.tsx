import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock3, FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Cabecalho } from "@/components/Cabecalho";
import { CampoData } from "@/components/CampoData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS_DOCUMENTO } from "@/lib/organizacao";
import { useAuth } from "@/lib/useAuth";
import { useOrganizacoes } from "@/lib/useOrganizacoes";
import { SeletorOrganizacao } from "@/components/SeletorOrganizacao";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [
    { title: "Documentos — Voz do Mar" }, { name: "description", content: "Guarde e acompanhe a validade dos documentos da organização." },
    { property: "og:title", content: "Documentos — Voz do Mar" }, { property: "og:description", content: "Guarde e acompanhe a validade dos documentos da organização." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Documentos,
});

function situacao(validade: string | null) {
  if (!validade) return { texto: "Sem validade informada", variante: "outline" as const, Icone: Clock3 };
  const dias = Math.ceil((new Date(`${validade}T23:59:59`).getTime() - Date.now()) / 86400000);
  if (dias < 0) return { texto: "Vencido", variante: "destructive" as const, Icone: AlertTriangle };
  if (dias <= 30) return { texto: `Vence em ${dias} dias`, variante: "secondary" as const, Icone: AlertTriangle };
  return { texto: "Válido", variante: "default" as const, Icone: CheckCircle2 };
}

function Documentos() {
  const navigate = useNavigate(); const { user, carregando } = useAuth();
  const { organizacao, isLoading } = useOrganizacoes();
  const [categoria, setCategoria] = useState(""); const [nome, setNome] = useState("");
  const [emissao, setEmissao] = useState(""); const [validade, setValidade] = useState(""); const [enviando, setEnviando] = useState(false);
  useEffect(() => { if (!carregando && !user) void navigate({ to: "/entrar" }); }, [carregando, user, navigate]);
  const { data: documentos, refetch } = useQuery({ enabled: Boolean(organizacao), queryKey: ["documentos", organizacao?.id], queryFn: async () => { const { data, error } = await supabase.from("documentos_organizacao").select("*").eq("organizacao_id", organizacao?.id ?? "").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const alertas = useMemo(() => documentos?.filter((d) => situacao(d.data_validade).texto !== "Válido") ?? [], [documentos]);

  async function enviar(arquivo: File) {
    if (!user || !organizacao || !categoria || !nome || !validade) return void toast.error("Informe categoria, nome e validade antes de anexar.");
    if (arquivo.size > 20_000_000 || !["application/pdf", "image/jpeg", "image/png"].includes(arquivo.type)) return void toast.error("Envie PDF, JPG ou PNG com até 20 MB.");
    setEnviando(true);
    const seguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const path = `${user.id}/organizacao/${organizacao.id}/${crypto.randomUUID()}-${seguro}`;
    const upload = await supabase.storage.from("documentos-organizacoes").upload(path, arquivo, { contentType: arquivo.type });
    if (upload.error) { setEnviando(false); return void toast.error("Não conseguimos enviar o arquivo."); }
    const { error } = await supabase.from("documentos_organizacao").insert({ organizacao_id: organizacao.id, categoria, nome, arquivo_path: path, mime_type: arquivo.type, data_emissao: emissao || null, data_validade: validade });
    setEnviando(false);
    if (error) { await supabase.storage.from("documentos-organizacoes").remove([path]); return void toast.error("Não conseguimos guardar os dados do documento."); }
    setCategoria(""); setNome(""); setEmissao(""); setValidade(""); await refetch(); toast.success("Documento guardado com segurança.");
  }

  async function abrir(path: string) { const { data, error } = await supabase.storage.from("documentos-organizacoes").createSignedUrl(path, 60); if (error) return void toast.error("Não foi possível abrir o documento."); window.open(data.signedUrl, "_blank", "noopener,noreferrer"); }
  async function remover(id: string, path: string) { await supabase.storage.from("documentos-organizacoes").remove([path]); const { error } = await supabase.from("documentos_organizacao").delete().eq("id", id); if (error) return void toast.error("Não conseguimos excluir."); await refetch(); }

   if (user && !isLoading && !organizacao) return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-2xl px-4 py-12 text-center"><h1 className="text-3xl font-bold">Cadastre sua organização primeiro</h1><Button asChild className="mt-6 h-14"><Link to="/organizacao" search={{ nova: false }}>Começar cadastro</Link></Button></main></div>;
  return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
     <header><p className="font-bold text-primary">Passo 2 de 4</p><h1 className="text-3xl font-bold">Documentos da organização</h1><p className="mt-2 text-muted-foreground">Todos os documentos têm validade para ajudar você a manter a pasta em dia.</p></header>
     <SeletorOrganizacao />
    {alertas.length > 0 && <section className="rounded-lg border-2 border-destructive/30 bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="size-5 text-destructive" /> Atenção aos documentos</h2><p className="mt-1 text-muted-foreground">{alertas.length} documento(s) vencido(s), próximo(s) do vencimento ou sem validade.</p></section>}
    <section className="space-y-4"><h2 className="text-xl font-bold">Adicionar documento</h2><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Categoria</Label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger className="h-12"><SelectValue placeholder="Escolha o tipo" /></SelectTrigger><SelectContent>{CATEGORIAS_DOCUMENTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Nome do documento</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Certidão FGTS setembro" /></div><div className="space-y-2"><Label>Data de emissão</Label><CampoData value={emissao} onChange={setEmissao} /></div><div className="space-y-2"><Label>Validade</Label><CampoData value={validade} onChange={setValidade} placeholder="Informe a validade" /></div></div><label className="flex h-14 cursor-pointer items-center justify-center rounded-md bg-primary px-5 font-bold text-primary-foreground">{enviando ? <Loader2 className="mr-2 size-5 animate-spin" /> : <FileUp className="mr-2 size-5" />}Anexar PDF ou imagem<input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" disabled={enviando} onChange={(e) => { const arquivo = e.target.files?.[0]; if (arquivo) void enviar(arquivo); e.target.value = ""; }} /></label></section>
    <section className="space-y-3"><h2 className="text-xl font-bold">Documentos guardados</h2>{documentos?.length === 0 && <p className="rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground">Nenhum documento anexado ainda.</p>}{documentos?.map((doc) => { const estado = situacao(doc.data_validade); return <Card key={doc.id}><CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><button type="button" className="text-left" onClick={() => void abrir(doc.arquivo_path)}><p className="font-bold text-primary underline">{doc.nome}</p><p className="text-sm text-muted-foreground">{doc.categoria}</p></button><div className="flex items-center gap-2"><Badge variant={estado.variante}><estado.Icone className="mr-1 size-3" />{estado.texto}</Badge><Button size="icon" variant="ghost" aria-label="Excluir documento" onClick={() => void remover(doc.id, doc.arquivo_path)}><Trash2 className="size-4" /></Button></div></CardContent></Card>; })}</section>
    <Button asChild className="h-14 w-full text-base"><Link to="/novo">Analisar um edital</Link></Button>
  </main></div>;
}