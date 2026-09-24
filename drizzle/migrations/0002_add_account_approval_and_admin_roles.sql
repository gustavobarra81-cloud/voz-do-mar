ALTER TABLE public.profiles
  ADD COLUMN email TEXT,
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID;

UPDATE public.profiles p
SET email = u.email,
    approval_status = 'approved',
    reviewed_at = now()
FROM auth.users u
WHERE u.id = p.id;

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND approval_status = 'approved'
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_approved(UUID) TO authenticated;

CREATE POLICY "ver papel proprio ou como admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin ve cadastros" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin atualiza aprovacoes" ON public.profiles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, approval_status)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome', NEW.email, 'pending')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE POLICY "somente aprovados em organizacoes" ON public.organizacoes AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em dirigentes" ON public.dirigentes AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em documentos" ON public.documentos_organizacao AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em analises" ON public.analises_editais AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em projetos" ON public.projetos AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em editais" ON public.editais AS RESTRICTIVE
FOR ALL TO authenticated
USING (public.is_approved(auth.uid()))
WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "somente aprovados em arquivos" ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated
USING (bucket_id <> 'documentos-organizacoes' OR public.is_approved(auth.uid()))
WITH CHECK (bucket_id <> 'documentos-organizacoes' OR public.is_approved(auth.uid()));