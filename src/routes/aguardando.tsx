import { createFileRoute } from "@tanstack/react-router";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/aguardando")({
  head: () => ({ meta: [
    { title: "Aguardando aprovação — Voz do Mar" },
    { name: "description", content: "Acompanhe a aprovação do seu cadastro no Voz do Mar." },
    { property: "og:title", content: "Aguardando aprovação — Voz do Mar" },
    { property: "og:description", content: "Acompanhe a aprovação do seu cadastro no Voz do Mar." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Aguardando,
});

function Aguardando() {
  const { approvalStatus } = useAuth();
  const rejeitado = approvalStatus === "rejected";
  return <div className="min-h-screen surface-wave"><Cabecalho /><main className="mx-auto max-w-xl px-4 py-14">
    <Card className="border-2"><CardContent className="space-y-5 py-10 text-center">
      {rejeitado ? <ShieldCheck className="mx-auto size-14 text-destructive" /> : <Clock3 className="mx-auto size-14 text-primary" />}
      <h1 className="text-3xl font-bold">{rejeitado ? "Cadastro não aprovado" : "Cadastro aguardando aprovação"}</h1>
      <p className="text-lg text-muted-foreground">{rejeitado ? "Entre em contato com a equipe responsável para revisar seu acesso." : "Sua conta foi recebida. Assim que for aprovada, você poderá cadastrar a organização, enviar documentos e criar projetos."}</p>
      <Button variant="outline" className="h-12" onClick={async () => { await supabase.auth.signOut(); window.location.href = "/entrar"; }}><LogOut className="mr-2 size-4" />Sair da conta</Button>
    </CardContent></Card>
  </main></div>;
}