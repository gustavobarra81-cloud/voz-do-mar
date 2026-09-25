ALTER TABLE public.organizacoes DROP CONSTRAINT organizacoes_owner_id_key;
CREATE INDEX idx_organizacoes_owner ON public.organizacoes(owner_id, created_at);
COMMENT ON COLUMN public.organizacoes.owner_id IS 'Uma conta pode administrar diversas organizações; cada organização mantém seus próprios documentos, editais, análises e projetos.';