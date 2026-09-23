import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Save } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
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
        .select("id, titulo, conteudo, created_at")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (projeto?.conteudo) setRascunho(projeto.conteudo);
  }, [projeto?.conteudo]);

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase
      .from("projetos")
      .update({ conteudo: rascunho, updated_at: new Date().toISOString() })
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
    const documento = `<!doctype html><html><head><meta charset="utf-8"><title>${projeto?.titulo ?? "Projeto"}</title></head><body style="font-family:Georgia,serif;line-height:1.6">${projeto?.conteudo ?? ""}</body></html>`;
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

        {editando ? (
          <Textarea
            rows={30}
            className="font-mono text-sm"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
          />
        ) : (
          <article
            className="texto-projeto rounded-3xl bg-card p-6 shadow-soft md:p-10"
            dangerouslySetInnerHTML={{ __html: projeto?.conteudo ?? "" }}
          />
        )}
      </main>
    </div>
  );
}
