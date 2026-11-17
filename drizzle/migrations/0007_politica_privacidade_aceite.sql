ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS politica_aceita_em timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, approval_status, politica_aceita_em)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nome', NEW.email, 'pending',
    CASE WHEN NEW.raw_user_meta_data->>'politica_aceita' = 'true' THEN now() ELSE NULL END)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.aceitar_politica()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE agora timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.profiles SET politica_aceita_em = agora WHERE id = auth.uid();
  RETURN agora;
END;
$$;
REVOKE ALL ON FUNCTION public.aceitar_politica() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceitar_politica() TO authenticated;