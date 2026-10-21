import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Anchor, Building2, FileCheck2, FileText, FolderOpen, LogOut, Radar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export function Cabecalho() {
  const { user, carregando, aprovado, isAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: pendentes } = useQuery({
    enabled: Boolean(user && isAdmin), queryKey: ["pendentes-aprovacao"], refetchInterval: 60000,
    queryFn: async () => { const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"); if (error) throw error; return count ?? 0; },
  });

  useEffect(() => {
    if (!carregando && user && !aprovado && pathname !== "/aguardando") void navigate({ to: "/aguardando" });
  }, [carregando, user, aprovado, pathname, navigate]);

  return (
    <header className="nao-imprimir border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Anchor className="size-5" />
          </span>
          Voz do Mar
        </Link>

        <nav className="flex items-center gap-1">
          {user && aprovado ? (
            <>
              <Button asChild variant="ghost" className="text-base">
                <Link to="/radar" aria-label="Radar de Editais"><Radar className="size-5 lg:mr-2" /><span className="hidden lg:inline">Radar</span></Link>
              </Button>

              <Button asChild variant="ghost" className="hidden text-base md:inline-flex">
                <Link to="/organizacao" search={{ nova: false }}><Building2 className="mr-2 size-4" /> Organização</Link>
              </Button>
              <Button asChild variant="ghost" className="hidden text-base md:inline-flex">
                <Link to="/documentos"><FolderOpen className="mr-2 size-4" /> Documentos</Link>
              </Button>
              <Button asChild variant="ghost" className="hidden text-base lg:inline-flex">
                <Link to="/editais"><FileText className="mr-2 size-4" /> Meus editais</Link>
              </Button>
              <Button asChild variant="ghost" className="hidden text-base sm:inline-flex">
                <Link to="/projetos">Meus projetos</Link>
              </Button>
               {isAdmin && <Button asChild variant="ghost" className="text-base"><Link to="/admin" aria-label={`Aprovações: ${pendentes ?? 0} cadastros pendentes`}><ShieldCheck className="size-5 xl:mr-2" /><span className="hidden xl:inline">Aprovações</span>{Boolean(pendentes) && <span className="ml-1 flex min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{pendentes}</span>}</Link></Button>}
              <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Minha organização">
                 <Link to="/organizacao" search={{ nova: false }}><FileCheck2 className="size-5" /></Link>
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
