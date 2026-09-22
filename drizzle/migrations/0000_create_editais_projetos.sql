-- Perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  comunidade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome) VALUES (NEW.id, NEW.raw_user_meta_data->>'nome')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Editais
CREATE TABLE public.editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  orgao TEXT,
  resumo TEXT,
  prazo DATE,
  valor_maximo TEXT,
  exigencias TEXT,
  texto_completo TEXT,
  publico BOOLEAN NOT NULL DEFAULT false,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editais TO authenticated;
GRANT SELECT ON public.editais TO anon;
GRANT ALL ON public.editais TO service_role;
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editais publicos visiveis" ON public.editais FOR SELECT TO anon USING (publico = true);
CREATE POLICY "ver editais publicos ou proprios" ON public.editais FOR SELECT TO authenticated USING (publico = true OR criado_por = auth.uid());
CREATE POLICY "criar edital proprio" ON public.editais FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());
CREATE POLICY "editar edital proprio" ON public.editais FOR UPDATE TO authenticated USING (criado_por = auth.uid());
CREATE POLICY "apagar edital proprio" ON public.editais FOR DELETE TO authenticated USING (criado_por = auth.uid());

-- Projetos
CREATE TABLE public.projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edital_id UUID REFERENCES public.editais(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Projeto sem título',
  transcricao TEXT,
  respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
  conteudo TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projetos TO authenticated;
GRANT ALL ON public.projetos TO service_role;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver projetos proprios" ON public.projetos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "criar projeto proprio" ON public.projetos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "editar projeto proprio" ON public.projetos FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "apagar projeto proprio" ON public.projetos FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_projetos_user ON public.projetos(user_id, created_at DESC);

-- Editais de exemplo (públicos)
INSERT INTO public.editais (titulo, orgao, resumo, prazo, valor_maximo, exigencias, publico) VALUES
('Chamada Pública de Apoio à Pesca Artesanal', 'Ministério da Pesca e Aquicultura', 'Apoio a projetos de comunidades pesqueiras artesanais para melhoria da produção, beneficiamento e comercialização do pescado.', '2026-12-15', 'Até R$ 150.000,00', 'Seções obrigatórias: Identificação do proponente; Justificativa; Objetivo geral e específicos; Público beneficiado; Metodologia; Metas e cronograma (12 meses); Orçamento detalhado; Sustentabilidade após o projeto.', true),
('Edital de Cultura e Saberes Tradicionais', 'Secretaria de Cultura', 'Fomento a iniciativas culturais de povos e comunidades tradicionais, incluindo pescadores artesanais.', '2026-10-30', 'Até R$ 60.000,00', 'Seções obrigatórias: Apresentação do grupo; Justificativa cultural; Objetivos; Plano de atividades; Cronograma; Planilha orçamentária; Contrapartida social.', true),
('Fundo Socioambiental - Territórios Costeiros', 'Fundo Socioambiental', 'Projetos de conservação costeira, manejo comunitário e geração de renda em comunidades pesqueiras.', '2027-02-28', 'Até R$ 200.000,00', 'Seções obrigatórias: Contexto e território; Problema; Objetivos; Resultados esperados e indicadores; Atividades; Equipe; Orçamento; Riscos.', true);
