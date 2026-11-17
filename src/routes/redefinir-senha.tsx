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

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Voz do Mar" },
      { name: "description", content: "Defina uma nova senha para entrar na sua conta do Voz do Mar." },
      { property: "og:title", content: "Criar nova senha — Voz do Mar" },
      { property: "og:description", content: "Defina uma nova senha para entrar na sua conta do Voz do Mar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === "PASSWORD_RECOVERY" || sessao) setPronto(true);
    });
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (senha !== confirmar) { toast.error("As duas senhas não são iguais."); return; }
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) { toast.error("Não conseguimos trocar a senha. Peça um novo link e tente de novo."); return; }
    toast.success("Senha trocada! Você já está conectado.");
    void navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen surface-wave">
      <Cabecalho />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Criar nova senha</CardTitle>
            <CardDescription className="text-base">
              {pronto ? "Escolha uma senha nova e repita para confirmar." : "Abra esta página pelo link que enviamos ao seu e-mail. Se o link expirou, peça outro em “Esqueci minha senha”."}
            </CardDescription>
          </CardHeader>
          {pronto && (
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void salvar(e)}>
                <div className="space-y-2">
                  <Label htmlFor="nova" className="text-base">Nova senha</Label>
                  <Input id="nova" type="password" minLength={6} required className="h-12 text-base" value={senha} onChange={(e) => setSenha(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar" className="text-base">Repita a nova senha</Label>
                  <Input id="confirmar" type="password" minLength={6} required className="h-12 text-base" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                </div>
                <Button type="submit" className="h-14 w-full text-lg" disabled={ocupado}>
                  {ocupado && <Loader2 className="mr-2 size-5 animate-spin" />}Salvar nova senha
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
