-- 051 · hijos_caso — flag de transición a mayoría gestionada (GAP UX-18)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- El banner R3 (cumple 18) seguía apareciendo aunque el usuario ya hubiera
-- adaptado el régimen del hijo (deshabilitar cuidado, dejar solo alimentos
-- art. 663 CCyCN). Agregamos un flag explícito que el usuario marca cuando
-- la transición fue gestionada — y entonces el helper hijosTransicion
-- filtra ese hijo de las listas que disparan el banner.
--
-- ⚠️ Idempotente. Solo agrega columna si no existe.

ALTER TABLE hijos_caso
  ADD COLUMN IF NOT EXISTS transicion_18_gestionada BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN hijos_caso.transicion_18_gestionada IS
  'Flag que el usuario marca cuando la transición a mayoría de edad fue '
  'gestionada para este hijo (régimen actualizado, art. 663 CCyCN). '
  'Cuando es TRUE, el banner R3 deja de aparecer para este hijo aunque '
  'la fecha lo justifique. GAP UX-18.';

-- Diagnóstico
SELECT
  'hijos con transicion 18 gestionada' AS metrica,
  COUNT(*)::TEXT                       AS valor
FROM hijos_caso
WHERE transicion_18_gestionada = TRUE;
