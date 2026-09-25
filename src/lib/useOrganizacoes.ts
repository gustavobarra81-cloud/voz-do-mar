import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export function useOrganizacoes() {
  const { user } = useAuth();
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  useEffect(() => {
    setEscolhidaId(user ? window.localStorage.getItem(`voz-do-mar:organizacao:${user.id}`) : null);
  }, [user?.id]);
  const { data: organizacoes = [], isLoading, refetch } = useQuery({
    enabled: Boolean(user), queryKey: ["organizacoes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizacoes").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const organizacao = organizacoes.find((item) => item.id === escolhidaId) ?? organizacoes[0] ?? null;
  function escolher(id: string) {
    if (!user || !organizacoes.some((item) => item.id === id)) return;
    window.localStorage.setItem(`voz-do-mar:organizacao:${user.id}`, id);
    setEscolhidaId(id);
  }
  return { organizacoes, organizacao, isLoading, refetchOrganizacoes: refetch, escolher };
}