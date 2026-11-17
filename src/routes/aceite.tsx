import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/aceite")({
  head: () => ({
    meta: [
      { title: "Aceite da Política de Privacidade — Voz do Mar" },
      { name: "description", content: "Confirme que leu a Política de Privacidade para continuar usando o Voz do Mar." },
      { property: "og:title", content: "Aceite da Política de Privacidade — Voz do Mar" },
      { property: "og:description", content: "Confirme que leu a Política de Privacidade para continuar usando o Voz do Mar." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Aceite,
});

function Aceite() {
  const navigate = useNavigate();
  const [marcado, setMarcado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  async function aceitar() {
    setOcupado(true);
    const { error } = await supabase.rpc("aceitar_politica");
    setOcupado(false);
    if (error) { toast.error("Não conseguimos registrar. Tente de novo."); return; }
    window.dispatchEvent(new Event("politica-aceita"));
    void navigate({ to: "/aguardando" });
  }
  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-md space-y-5 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Antes de continuar</h1>
        <p className="text-lg">Leia a <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>. Ela explica quais dados guardamos, incluindo a voz, e como pedir para apagar.</p>
        <label className="flex items-start gap-3 text-lg">
          <Checkbox className="mt-1 size-6" checked={marcado} onCheckedChange={(v) => setMarcado(v === true)} />
          Li e aceito a Política de Privacidade.
        </label>
        <Button className="h-14 w-full text-lg" disabled={!marcado || ocupado} onClick={() => void aceitar()}>Continuar</Button>
      </main>
    </div>
  );
}
