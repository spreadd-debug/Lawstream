-- 049 · Ampliar matters.type CHECK para incluir 'Penal' (cierra GAP R12)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- En la migración 046 (R12 — causas relacionadas) agregamos 'Penal' al
-- enum TypeScript de MatterType, pero el CHECK constraint de la tabla
-- matters todavía rechaza ese valor. Esto bloquea el modo 'interna' de
-- causa relacionada (donde el estudio toma la causa penal también como
-- matter del sistema).
--
-- ⚠️ Idempotente.

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.matters'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type%'
    AND pg_get_constraintdef(oid) ILIKE '%Familia%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.matters DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE '[049] CHECK previo de type dropeado: %', v_constraint_name;
  END IF;

  ALTER TABLE public.matters
    ADD CONSTRAINT matters_type_check
    CHECK (type IN ('Laboral', 'Familia', 'Daños', 'Comercial', 'Sucesiones', 'Civil', 'Penal'));
END $$;

-- Diagnóstico
SELECT type, COUNT(*) FROM public.matters GROUP BY type ORDER BY type;
