ALTER TABLE public.exercises ALTER COLUMN name_normalized SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.unaccent_safe(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT translate(
    _txt,
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  )
$$;

CREATE OR REPLACE FUNCTION public.initcap_first(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN _txt = '' THEN _txt ELSE upper(left(_txt, 1)) || substr(_txt, 2) END
$$;

CREATE OR REPLACE FUNCTION public.normalize_exercise_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(lower(public.unaccent_safe(_name)), '\s+', ' ', 'g'))
$$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_exercise(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_exercise(text, text) TO authenticated;