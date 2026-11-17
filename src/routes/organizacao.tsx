import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Cabecalho } from "@/components/Cabecalho";
import { CampoData } from "@/components/CampoData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cadastroCompleto, ORGANIZACAO_VAZIA, TIPOS_ORGANIZACAO, type OrganizacaoForm } from "@/lib/organizacao";
import { useAuth, useExigirAprovacao } from "@/lib/useAuth";
import { useOrganizacoes } from "@/lib/useOrganizacoes";
import { SeletorOrganizacao } from "@/components/SeletorOrganizacao";

export const Route = createFileRoute("/organizacao")({
  validateSearch: (search: Record<string, unknown>) => ({ nova: search["nova"] === true }),
  head: () => ({ meta: [
    { title: "Minha organização — Voz do Mar" },
    { name: "description", content: "Cadastre os dados da organização que vai concorrer aos editais." },
    { property: "og:title", content: "Minha organização — Voz do Mar" },
    { property: "og:description", content: "Cadastre os dados da organização que vai concorrer aos editais." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Organizacao,
});

const CAMPOS_OBRIGATORIOS: (keyof OrganizacaoForm)[] = ["tipo", "razao_social", "cnpj", "comunidade", "atividade_principal", "representante_nome", "mandato_fim"];

function Organizacao() {
  const navigate = useNavigate();
  const { nova } = Route.useSearch();
  const { user, carregando } = useAuth();
  useExigirAprovacao();
  const { organizacoes, organizacao: selecionada, refetchOrganizacoes, escolher } = useOrganizacoes();
  const organizacao = nova ? null : selecionada;
  const [form, setForm] = useState<OrganizacaoForm>(ORGANIZACAO_VAZIA);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (!carregando && !user) void navigate({ to: "/entrar" }); }, [carregando, user, navigate]);

  useEffect(() => {
    const novo = { ...ORGANIZACAO_VAZIA };
    if (organizacao) for (const chave of Object.keys(novo) as (keyof OrganizacaoForm)[]) novo[chave] = String(organizacao[chave] ?? "");
    setForm(novo);
  }, [organizacao?.id, nova]);

  const preenchidos = CAMPOS_OBRIGATORIOS.filter((campo) => form[campo].trim()).length;
  const progresso = Math.round((preenchidos / CAMPOS_OBRIGATORIOS.length) * 100);
  const atualizar = (campo: keyof OrganizacaoForm, valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

  async function salvar() {
    if (!user) return;
    setSalvando(true);
    const payload = {
      ...form,
      data_constituicao: form.data_constituicao || null,
      data_eleicao: form.data_eleicao || null,
      mandato_inicio: form.mandato_inicio || null,
      mandato_fim: form.mandato_fim || null,
      owner_id: user.id,
      status: cadastroCompleto(form) ? "completo" : "rascunho",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = organizacao
      ? await supabase.from("organizacoes").update(payload).eq("id", organizacao.id)
          .select("id").single()
      : await supabase.from("organizacoes").insert(payload).select("id").single();
    setSalvando(false);
    if (error) return void toast.error("Não conseguimos salvar o cadastro.");
    await refetchOrganizacoes();
    if (data?.id) escolher(data.id);
    if (nova) void navigate({ to: "/organizacao", search: { nova: false } });
    toast.success(cadastroCompleto(form) ? "Cadastro completo e salvo." : "Rascunho salvo. Você pode continuar depois.");
  }

  const campo = (id: keyof OrganizacaoForm, titulo: string, placeholder = "") => (
    <div className="space-y-2"><Label htmlFor={id}>{titulo}</Label><Input id={id} value={form[id]} placeholder={placeholder} onChange={(e) => atualizar(id, e.target.value)} /></div>
  );

  return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
    <header className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-primary">Passo 1 de 4</p><h1 className="text-3xl font-bold">{nova ? "Nova organização" : "Minha organização"}</h1></div><span className="font-bold">{progresso}% preenchido</span></div><Progress value={progresso} /><p className="text-muted-foreground">Preencha o que souber. Você pode salvar e voltar depois.</p></header>
    {organizacoes.length > 0 && <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><SeletorOrganizacao mostrarNova={false} onChange={() => { if (nova) void navigate({ to: "/organizacao", search: { nova: false } }); }} /></div><Button asChild variant="outline" className="h-12"><Link to="/organizacao" search={{ nova: true }}><Plus className="mr-2 size-4" />Nova organização</Link></Button></div>}

    <section className="space-y-5"><h2 className="text-2xl font-bold">Dados da organização</h2><div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2"><Label>Tipo de organização</Label><Select value={form.tipo} onValueChange={(v) => atualizar("tipo", v)}><SelectTrigger className="h-12"><SelectValue placeholder="Escolha uma opção" /></SelectTrigger><SelectContent>{TIPOS_ORGANIZACAO.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</SelectContent></Select></div>
      {campo("razao_social", "Razão social", "Cooperativa dos Pescadores...")}{campo("nome_fantasia", "Nome de uso")}{campo("cnpj", "CNPJ")}
      <div className="space-y-2"><Label>Data de constituição</Label><CampoData value={form.data_constituicao} onChange={(v) => atualizar("data_constituicao", v)} /></div>
      {campo("comunidade", "Comunidade ou território")}{campo("email", "E-mail da organização")}{campo("telefone", "Telefone")}{campo("endereco", "Endereço")}{campo("cidade", "Cidade")}{campo("estado", "Estado")}{campo("cep", "CEP")}
    </div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Atividade principal</Label><Textarea value={form.atividade_principal} onChange={(e) => atualizar("atividade_principal", e.target.value)} /></div><div className="space-y-2"><Label>Breve histórico</Label><Textarea value={form.historico} onChange={(e) => atualizar("historico", e.target.value)} /></div></div></section>

    <section className="space-y-5 border-t pt-7"><h2 className="text-2xl font-bold">Presidente ou representante legal</h2><div className="grid gap-4 md:grid-cols-2">
      {campo("representante_nome", "Nome completo")}{campo("representante_cpf", "CPF")}{campo("representante_email", "E-mail")}{campo("representante_telefone", "Telefone")}
      <div className="space-y-2"><Label>Data da eleição</Label><CampoData value={form.data_eleicao} onChange={(v) => atualizar("data_eleicao", v)} /></div>
      <div className="space-y-2"><Label>Início do mandato</Label><CampoData value={form.mandato_inicio} onChange={(v) => atualizar("mandato_inicio", v)} /></div>
      <div className="space-y-2"><Label>Fim do mandato</Label><CampoData value={form.mandato_fim} onChange={(v) => atualizar("mandato_fim", v)} /></div>
    </div></section>

    <div className="sticky bottom-3 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-lift sm:flex-row"><Button className="h-14 flex-1 text-base" disabled={salvando} onClick={() => void salvar()}>{salvando ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Save className="mr-2 size-5" />}Salvar cadastro</Button>{organizacao && <Button asChild variant="secondary" className="h-14 flex-1 text-base"><Link to="/documentos"><CheckCircle2 className="mr-2 size-5" />Ir para documentos<ArrowRight className="ml-2 size-5" /></Link></Button>}</div>
  </main></div>;
}