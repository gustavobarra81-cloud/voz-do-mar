import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function carregarAcesso(novaSessao: Session | null) {
      setSession(novaSessao);
      if (!novaSessao?.user) {
        setApprovalStatus(null);
        setIsAdmin(false);
        setCarregando(false);
        return;
      }
      const [{ data: perfil }, { data: papel }] = await Promise.all([
        supabase.from("profiles").select("approval_status").eq("id", novaSessao.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", novaSessao.user.id).eq("role", "admin").maybeSingle(),
      ]);
      const status = perfil?.approval_status;
      setApprovalStatus(status === "approved" || status === "rejected" ? status : "pending");
      setIsAdmin(papel?.role === "admin");
      setCarregando(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      void carregarAcesso(novaSessao);
    });

    supabase.auth.getSession().then(({ data }) => {
      void carregarAcesso(data.session);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    carregando,
    approvalStatus,
    aprovado: approvalStatus === "approved",
    isAdmin,
  };
}
