CREATE OR REPLACE FUNCTION public.generate_trade_token()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _candidate text;
  _exists boolean;
BEGIN
  LOOP
    _candidate := lower(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=', 'xyz'));
    SELECT EXISTS(SELECT 1 FROM public.trades WHERE token = _candidate) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _candidate;
END;
$function$;