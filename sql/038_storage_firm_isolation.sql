-- 038 · Multi-tenant Etapa 5 — Storage policies por firm
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   Aislar el bucket estudio-assets por firm. Cada estudio solo puede escribir
--   en su propia carpeta (`<firm_id>/...`).
--
-- Qué protegemos:
--   • INSERT: que un firm no suba archivos al folder de otro.
--   • UPDATE: que no modifique archivos ajenos.
--   • DELETE: que no borre archivos ajenos.
--
-- Qué NO protegemos (a propósito):
--   • SELECT — el bucket está marcado como public:true, así que las URLs se
--     sirven sin auth de todas formas (se accede vía URL pública directa).
--     Si en el futuro se hace privado, hay que agregar policy de SELECT.
--
-- Dependencias: 032 (current_firm_id helper).
--
-- ⚠️ IMPORTANTE: deployar primero el cambio de db.ts (paths con firm prefix)
--    antes de correr este SQL. Si corrés este SQL primero, los uploads del
--    código viejo van a fallar porque sus paths no incluyen firm prefix.
--
-- ⚠️ Idempotente.
--
-- Sobre archivos legacy:
--   Los archivos existentes (subidos antes de este cambio) viven en paths
--   como `logo/123.png` o `firma/123.png`. Las URLs guardadas en
--   estudio_perfil.logo_url siguen funcionando porque el bucket es público.
--   Pero esos archivos quedan en limbo: no son escribibles ni borrables por
--   nadie con las nuevas policies. Cuando el firm default suba un nuevo logo,
--   se va al path correcto y las URLs viejas quedan colgadas (storage tiene
--   los archivos pero nadie los referencia). Limpieza manual desde el
--   Storage Dashboard si se quiere.

-- ══════════════════════════════════════════════════════════════
-- 1. Limpiar policies viejas (idempotencia)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "estudio_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "estudio_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "estudio_assets_delete" ON storage.objects;

-- ══════════════════════════════════════════════════════════════
-- 2. INSERT — solo en propio firm
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "estudio_assets_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estudio-assets'
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

-- ══════════════════════════════════════════════════════════════
-- 3. UPDATE — solo archivos del propio firm
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "estudio_assets_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'estudio-assets'
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
)
WITH CHECK (
  bucket_id = 'estudio-assets'
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

-- ══════════════════════════════════════════════════════════════
-- 4. DELETE — solo archivos del propio firm
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "estudio_assets_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'estudio-assets'
  AND (storage.foldername(name))[1] = public.current_firm_id()::text
);

-- ══════════════════════════════════════════════════════════════
-- 5. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'estudio_assets%'
ORDER BY policyname;
