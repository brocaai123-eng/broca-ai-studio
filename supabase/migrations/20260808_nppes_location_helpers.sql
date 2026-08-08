-- Helper RPCs so admin UI can load City/ZIP dropdowns after selecting a state

CREATE OR REPLACE FUNCTION public.nppes_cities_for_state(p_state text)
RETURNS TABLE(city text, cnt bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT practice_city AS city, count(*)::bigint AS cnt
  FROM public.nppes_providers
  WHERE practice_state = upper(trim(p_state))
    AND practice_city IS NOT NULL
    AND length(trim(practice_city)) > 0
  GROUP BY practice_city
  ORDER BY count(*) DESC, practice_city ASC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.nppes_zips_for_state(
  p_state text,
  p_city text DEFAULT NULL
)
RETURNS TABLE(zip text, cnt bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT practice_zip AS zip, count(*)::bigint AS cnt
  FROM public.nppes_providers
  WHERE practice_state = upper(trim(p_state))
    AND practice_zip IS NOT NULL
    AND length(trim(practice_zip)) = 5
    AND (
      p_city IS NULL
      OR length(trim(p_city)) = 0
      OR lower(practice_city) = lower(trim(p_city))
    )
  GROUP BY practice_zip
  ORDER BY count(*) DESC, practice_zip ASC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.nppes_cities_for_state(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.nppes_zips_for_state(text, text) TO service_role;
