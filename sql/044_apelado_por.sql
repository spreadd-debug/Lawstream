-- 044 · apelado_por en matters (GAP R11)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Cuando un caso recibe sentencia y se apela parcialmente, modelamos cada
-- apelación como un matter hijo (kind='apelacion', migración 028) con sus
-- `aspectos_apelados` (migración 029). Hoy NO se distingue quién es el
-- apelante.
--
-- Caso real (Ruiz/Colombo, 2027):
--   • 25/02 — Sebastián apela compensación + atribución vivienda.
--   • 01/03 — Valentina contra-apela compensación (insuficiente).
--
-- Sin `apelado_por`, el banner "parcialmente firme" hace flatMap+Set sobre
-- aspectos y borra la distinción → se muestra "Compensación apelada" sin
-- saber que ambas partes la apelaron por motivos opuestos.
--
-- Modelado: cada parte que apela genera un matter hijo separado con
-- apelado_por = 'cliente' (mi parte) o 'contraparte'. La doble apelación
-- sobre el mismo aspecto se ve como dos cards en SubProcesosPanel.
--
-- Constraint: apelado_por solo puede tener valor cuando kind='apelacion'.
--
-- Dependencias: 028 (matters.kind), 029 (aspectos_apelados).
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. Columna apelado_por
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS apelado_por TEXT;

-- ══════════════════════════════════════════════════════════════
-- 2. Constraint — valores válidos
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_apelado_por_check'
  ) THEN
    ALTER TABLE public.matters
      ADD CONSTRAINT matters_apelado_por_check
      CHECK (apelado_por IS NULL OR apelado_por IN ('cliente', 'contraparte'));
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 3. Constraint — solo apelaciones pueden tener apelado_por
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matters_apelado_por_kind_check'
  ) THEN
    ALTER TABLE public.matters
      ADD CONSTRAINT matters_apelado_por_kind_check
      CHECK (
        apelado_por IS NULL
        OR kind = 'apelacion'
      );
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  kind,
  COUNT(*)                                  AS total,
  COUNT(apelado_por)                        AS con_apelado_por,
  COUNT(*) FILTER (WHERE apelado_por = 'cliente')     AS apela_cliente,
  COUNT(*) FILTER (WHERE apelado_por = 'contraparte') AS apela_contraria
FROM public.matters
WHERE kind = 'apelacion'
GROUP BY kind;
