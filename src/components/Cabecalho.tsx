import { Link, useNavigate } from "@tanstack/react-router";
import { Anchor, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export function Cabecalho() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nao-imprimir border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Anchor className="size-5" />
          </span>
          Voz do Mar
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" className="text-base">
                <Link to="/projetos">Meus projetos</Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sair"
                onClick={async () => {
                  await supabase.auth.signOut();
                  void navigate({ to: "/" });
                }}
              >
                <LogOut className="size-5" />
              </Button>
            </>
          ) : (
            <Button asChild className="text-base">
              <Link to="/entrar">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
