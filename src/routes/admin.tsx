import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Cabecalho } from "@/components/Cabecalho";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Aprovar cadastros — Voz do Mar" },
    { name: "description", content: "Área administrativa para revisar cadastros do Voz do Mar." },
    { property: "og:title", content: "Aprovar cadastros — Voz do Mar" },
    { property: "og:description", content: "Área administrativa para revisar cadastros do Voz do Mar." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const { user, carregando, isAdmin } = useAuth();
  useEffect(() => { if (!carregando && (!user || !isAdmin)) void navigate({ to: user ? "/organizacao" : "/entrar" }); }, [carregando, user, isAdmin, navigate]);
  const { data: perfis, refetch } = useQuery({
    enabled: Boolean(user && isAdmin), queryKey: ["cadastros-para-aprovacao"],
    queryFn: async () => { const { data, error } = await supabase.from("profiles").select("id,nome,email,approval_status,created_at,reviewed_at").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  async function revisar(id: string, status: "approved" | "rejected") {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ approval_status: status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq("id", id);
    if (error) return void toast.error("Não foi possível atualizar este cadastro.");
    await refetch(); toast.success(status === "approved" ? "Cadastro aprovado." : "Cadastro recusado.");
  }
  return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <header><p className="flex items-center gap-2 font-bold text-primary"><ShieldCheck className="size-5" />Administração</p><h1 className="text-3xl font-bold">Aprovar cadastros</h1><p className="mt-2 text-muted-foreground">Revise quem poderá usar as áreas privadas da ferramenta.</p></header>
    <div className="space-y-3">{perfis?.map((perfil) => { const pendente = perfil.approval_status === "pending"; return <Card key={perfil.id}><CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{perfil.nome || "Nome não informado"}</h2><Badge variant={pendente ? "secondary" : perfil.approval_status === "approved" ? "default" : "destructive"}>{pendente ? "Aguardando" : perfil.approval_status === "approved" ? "Aprovado" : "Recusado"}</Badge></div><p className="text-sm text-muted-foreground">{perfil.email || "E-mail não informado"}</p></div><div className="flex gap-2"><Button variant="outline" disabled={perfil.approval_status === "rejected"} onClick={() => void revisar(perfil.id, "rejected")}><XCircle className="mr-2 size-4" />Recusar</Button><Button disabled={perfil.approval_status === "approved"} onClick={() => void revisar(perfil.id, "approved")}><CheckCircle2 className="mr-2 size-4" />Aprovar</Button></div></CardContent></Card>; })}</div>
    {perfis?.length === 0 && <p className="rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground"><Clock3 className="mx-auto mb-2 size-8" />Nenhum cadastro recebido.</p>}
  </main></div>;
}