CREATE OR REPLACE FUNCTION public.current_approval_status(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT approval_status FROM public.profiles WHERE id = _user_id
$$;
GRANT EXECUTE ON FUNCTION public.current_approval_status(UUID) TO authenticated;

DROP POLICY "own profile update" ON public.profiles;
CREATE POLICY "atualizar perfil sem alterar aprovacao" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND approval_status = public.current_approval_status(auth.uid())
);