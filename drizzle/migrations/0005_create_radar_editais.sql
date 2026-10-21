CREATE TABLE public.radar_editais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  orgao text,
  prazo date,
  link text NOT NULL UNIQUE,
  abrangencia text NOT NULL DEFAULT 'nacional',
  temas text[] NOT NULL DEFAULT '{}',
  resumo text,
  publico_elegivel text,
  valor text,
  fonte text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.radar_editais TO authenticated;
GRANT ALL ON public.radar_editais TO service_role;
ALTER TABLE public.radar_editais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprovados veem radar" ON public.radar_editais FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin cria radar" ON public.radar_editais FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin edita radar" ON public.radar_editais FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin apaga radar" ON public.radar_editais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_radar_prazo ON public.radar_editais(prazo);