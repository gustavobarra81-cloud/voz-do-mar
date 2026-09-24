import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Cabecalho } from "@/components/Cabecalho";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Voz do Mar" },
      {
        name: "description",
        content: "Entre na sua conta para guardar e continuar os projetos da sua comunidade.",
      },
      { property: "og:title", content: "Entrar — Voz do Mar" },
      {
        property: "og:description",
        content: "Entre na sua conta para guardar e continuar os projetos da sua comunidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const { user, carregando, approvalStatus } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!carregando && user) void navigate({ to: approvalStatus === "approved" ? "/organizacao" : "/aguardando" });
  }, [user, carregando, approvalStatus, navigate]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme seu e-mail. Depois, o cadastro seguirá para aprovação.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        void navigate({ to: "/aguardando" });
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não deu certo. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function entrarComGoogle() {
    const resultado = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (resultado.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (resultado.redirected) return;
    void navigate({ to: "/aguardando" });
  }

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </CardTitle>
            <CardDescription className="text-base">
              Novos cadastros são liberados após aprovação da equipe responsável.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Button
              type="button"
              variant="outline"
              className="h-14 w-full text-base"
              onClick={() => void entrarComGoogle()}
            >
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou com e-mail
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={(e) => void enviar(e)}>
              {modo === "criar" && (
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-base">
                    Seu nome
                  </Label>
                  <Input
                    id="nome"
                    className="h-12 text-base"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Maria da Silva"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="h-12 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-base">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  className="h-12 text-base"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-14 w-full text-lg" disabled={ocupado}>
                {ocupado && <Loader2 className="mr-2 size-5 animate-spin" />}
                {modo === "entrar" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <button
              type="button"
              className="w-full text-center text-base text-primary underline"
              onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            >
              {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
