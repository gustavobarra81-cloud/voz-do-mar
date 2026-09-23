import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/editais")({
  head: () => ({ meta: [
    { title: "Meus editais — Voz do Mar" }, { name: "description", content: "Consulte os editais enviados pela sua organização." },
    { property: "og:title", content: "Meus editais — Voz do Mar" }, { property: "og:description", content: "Consulte os editais enviados pela sua organização." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: Editais,
});

function Editais() {
  const { user, carregando } = useAuth(); const navigate = useNavigate();
  useEffect(() => { if (!carregando && !user) void navigate({ to: "/entrar" }); }, [carregando, user, navigate]);
  const { data } = useQuery({ enabled: Boolean(user), queryKey: ["meus-editais", user?.id], queryFn: async () => { const { data: rows, error } = await supabase.from("editais").select("id,titulo,orgao,resumo,prazo,publico").eq("criado_por", user?.id ?? "").order("created_at", { ascending: false }); if (error) throw error; return rows; } });
  return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Meus editais</h1><p className="mt-1 text-muted-foreground">Editais enviados e analisados pela sua organização.</p></div><Button asChild><Link to="/novo"><Plus className="mr-2 size-5" />Enviar edital</Link></Button></div>{data?.length === 0 && <div className="rounded-lg border-2 border-dashed p-10 text-center"><FileText className="mx-auto size-10 text-muted-foreground" /><p className="mt-3 font-bold">Nenhum edital enviado ainda.</p></div>}<div className="grid gap-3">{data?.map((edital) => <Card key={edital.id}><CardContent className="py-5"><h2 className="text-lg font-bold">{edital.titulo}</h2>{edital.orgao && <p className="text-sm text-muted-foreground">{edital.orgao}</p>}{edital.resumo && <p className="mt-2">{edital.resumo}</p>}</CardContent></Card>)}</div></main></div>;
}