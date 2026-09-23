CREATE TABLE public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  tipo TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  data_constituicao DATE,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  comunidade TEXT,
  atividade_principal TEXT,
  historico TEXT,
  representante_nome TEXT,
  representante_cpf TEXT,
  representante_email TEXT,
  representante_telefone TEXT,
  data_eleicao DATE,
  mandato_inicio DATE,
  mandato_fim DATE,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizacoes TO authenticated;
GRANT ALL ON public.organizacoes TO service_role;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver organizacao propria" ON public.organizacoes FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "criar organizacao propria" ON public.organizacoes FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "editar organizacao propria" ON public.organizacoes FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "apagar organizacao propria" ON public.organizacoes FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.dirigentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dirigentes TO authenticated;
GRANT ALL ON public.dirigentes TO service_role;
ALTER TABLE public.dirigentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerenciar dirigentes proprios" ON public.dirigentes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid()));

CREATE TABLE public.documentos_organizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data_emissao DATE,
  data_validade DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_organizacao TO authenticated;
GRANT ALL ON public.documentos_organizacao TO service_role;
ALTER TABLE public.documentos_organizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerenciar documentos proprios" ON public.documentos_organizacao FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid()));

CREATE TABLE public.analises_editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  resumo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, edital_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analises_editais TO authenticated;
GRANT ALL ON public.analises_editais TO service_role;
ALTER TABLE public.analises_editais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gerenciar analises proprias" ON public.analises_editais FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizacoes o WHERE o.id = organizacao_id AND o.owner_id = auth.uid()));

ALTER TABLE public.editais ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;
ALTER TABLE public.editais ADD COLUMN arquivo_path TEXT;
ALTER TABLE public.editais ADD COLUMN criterios JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.projetos ADD COLUMN organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;
ALTER TABLE public.projetos ADD COLUMN analise_id UUID REFERENCES public.analises_editais(id) ON DELETE SET NULL;

CREATE INDEX idx_documentos_organizacao ON public.documentos_organizacao(organizacao_id, data_validade);
CREATE INDEX idx_analises_organizacao ON public.analises_editais(organizacao_id, created_at DESC);
CREATE INDEX idx_editais_organizacao ON public.editais(organizacao_id, created_at DESC);

CREATE POLICY "arquivos privados inserir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-organizacoes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "arquivos privados ler" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos-organizacoes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "arquivos privados atualizar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos-organizacoes' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'documentos-organizacoes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "arquivos privados apagar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos-organizacoes' AND (storage.foldername(name))[1] = auth.uid()::text);