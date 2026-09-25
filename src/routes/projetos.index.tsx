import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useOrganizacoes } from "@/lib/useOrganizacoes";
import { SeletorOrganizacao } from "@/components/SeletorOrganizacao";

export const Route = createFileRoute("/projetos/")({
  head: () => ({
    meta: [
      { title: "Meus projetos — Voz do Mar" },
      {
        name: "description",
        content: "Todos os projetos que a sua comunidade já criou falando.",
      },
      { property: "og:title", content: "Meus projetos — Voz do Mar" },
      {
        property: "og:description",
        content: "Todos os projetos que a sua comunidade já criou falando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListaProjetos,
});

function ListaProjetos() {
  const navigate = useNavigate();
  const { user, carregando } = useAuth();
  const { organizacao } = useOrganizacoes();

  useEffect(() => {
    if (!carregando && !user) void navigate({ to: "/entrar" });
  }, [carregando, user, navigate]);

  const { data: projetos, isLoading } = useQuery({
    enabled: Boolean(user && organizacao),
    queryKey: ["projetos", user?.id, organizacao?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projetos")
        .select("id, titulo, created_at, status")
        .eq("organizacao_id", organizacao?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Meus projetos</h1>
          <Button asChild size="lg" className="h-14 text-base font-bold">
            <Link to="/novo">
              <Plus className="mr-2 size-5" /> Novo projeto
            </Link>
          </Button>
        </div>

        <SeletorOrganizacao />

        {isLoading && <p className="text-muted-foreground">Carregando...</p>}

        {projetos?.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="space-y-3 py-10 text-center">
              <FileText className="mx-auto size-10 text-muted-foreground" />
              <p className="text-lg">Você ainda não tem projetos.</p>
              <Button asChild size="lg" className="h-14 text-base">
                <Link to="/novo">Começar falando</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {projetos?.map((projeto) => (
            <Link
              key={projeto.id}
              to="/projetos/$id"
              params={{ id: projeto.id }}
              className="block rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <p className="text-lg font-bold">{projeto.titulo}</p>
              <p className="text-sm text-muted-foreground">
                Criado em {new Date(projeto.created_at).toLocaleDateString("pt-BR")}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
