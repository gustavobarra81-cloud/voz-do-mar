CREATE OR REPLACE FUNCTION public.validar_edital_publico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF; -- rotinas internas do servidor
  IF NEW.publico IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.publico IS DISTINCT FROM NEW.publico OR OLD.publico IS TRUE)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente administradores podem publicar editais.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS editais_publico_somente_admin ON public.editais;
CREATE TRIGGER editais_publico_somente_admin
BEFORE INSERT OR UPDATE ON public.editais
FOR EACH ROW EXECUTE FUNCTION public.validar_edital_publico();

DROP POLICY IF EXISTS "editais publicos visiveis" ON public.editais;
REVOKE ALL ON public.editais FROM anon;

CREATE TABLE public.uso_ia (
  user_id uuid NOT NULL,
  dia date NOT NULL,
  chamadas integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia)
);
GRANT SELECT ON public.uso_ia TO authenticated;
GRANT ALL ON public.uso_ia TO service_role;
ALTER TABLE public.uso_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver uso proprio" ON public.uso_ia FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.registrar_uso_ia()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _limite constant integer := 150;
  _dia date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _total integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.uso_ia(user_id, dia, chamadas) VALUES (auth.uid(), _dia, 1)
    ON CONFLICT (user_id, dia) DO UPDATE SET chamadas = uso_ia.chamadas + 1, updated_at = now()
    RETURNING chamadas INTO _total;
    RETURN _total;
  END IF;
  INSERT INTO public.uso_ia(user_id, dia, chamadas) VALUES (auth.uid(), _dia, 1)
  ON CONFLICT (user_id, dia) DO UPDATE SET chamadas = uso_ia.chamadas + 1, updated_at = now()
    WHERE uso_ia.chamadas < _limite
  RETURNING chamadas INTO _total;
  IF _total IS NULL THEN RETURN -1; END IF;
  RETURN _total;
END $$;
REVOKE ALL ON FUNCTION public.registrar_uso_ia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_uso_ia() TO authenticated;