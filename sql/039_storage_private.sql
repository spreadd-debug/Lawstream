-- 039 · Multi-tenant Etapa 5 (parte 2) — Bucket privado + SELECT policy
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Objetivo:
--   Cerrar el agujero de SELECT en storage. Hasta ahora el bucket
--   estudio-assets era público — cualquiera con la URL podía leer el
--   archivo. Lo pasamos a privado y el frontend usa signed URLs (con TTL).
--
-- Cambios:
--   1. UPDATE storage.buckets SET public = false
--   2. SELECT policy: solo paths del propio firm (con excepción legacy
--      para el firm default — archivos viejos en logo/ y firma/ sin prefijo).
--   3. Migrar estudio_perfil.logo_url y firma_url: extraer el path puro
--      de las URLs públicas (que después del cambio del bucket dan 404 igual).
--      Los componentes leen el path, firman y muestran.
--
-- Dependencias: 038 (policies INSERT/UPDATE/DELETE ya creadas).
--
-- ⚠️ IMPORTANTE: deployar primero el cambio de db.ts (firmado al fetch)
--    antes de correr este SQL. Después del cambio del bucket a privado,
--    las URLs públicas dejan de funcionar y solo las signed sirven.
--
-- ⚠️ Idempotente.

-- ══════════════════════════════════════════════════════════════
-- 1. Bucket privado
-- ══════════════════════════════════════════════════════════════

UPDATE storage.buckets SET public = false WHERE id = 'estudio-assets';

-- ══════════════════════════════════════════════════════════════
-- 2. SELECT policy
-- ══════════════════════════════════════════════════════════════
-- Permite leer archivos:
--   • del propio firm (folder = firm_id), o
--   • legacy del firm default (folder = 'logo' o 'firma' sin prefijo de UUID),
--     porque los archivos viejos pre-multitenant viven ahí. Cuando se
--     re-suban, irán a 00000000-.../logo/... y la excepción se vuelve inútil.

DROP POLICY IF EXISTS "estudio_assets_select" ON storage.objects;
CREATE POLICY "estudio_assets_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estudio-assets'
  AND (
    (storage.foldername(name))[1] = public.current_firm_id()::text
    OR (
      (storage.foldername(name))[1] IN ('logo', 'firma')
      AND public.current_firm_id() = '00000000-0000-0000-0000-000000000001'::uuid
    )
  )
);

-- ══════════════════════════════════════════════════════════════
-- 3. Migrar URLs guardadas → paths
-- ══════════════════════════════════════════════════════════════
-- Las URLs en estudio_perfil tienen forma:
--   https://<proj>.supabase.co/storage/v1/object/public/estudio-assets/<path>
-- Extraemos solo <path>. Si era una signed URL, le sacamos también el ?token=…
-- Si ya es un path (no empieza con http), no se toca.

UPDATE estudio_perfil
SET logo_url = regexp_replace(
                 regexp_replace(logo_url, '^.*/object/(public|sign)/estudio-assets/', ''),
                 '\?.*$', ''
               )
WHERE logo_url IS NOT NULL
  AND logo_url ~ '^https?://';

UPDATE estudio_perfil
SET firma_url = regexp_replace(
                  regexp_replace(firma_url, '^.*/object/(public|sign)/estudio-assets/', ''),
                  '\?.*$', ''
                )
WHERE firma_url IS NOT NULL
  AND firma_url ~ '^https?://';

-- ══════════════════════════════════════════════════════════════
-- 4. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT id, name, public FROM storage.buckets WHERE id = 'estudio-assets';

SELECT firm_id, logo_url, firma_url
FROM estudio_perfil
ORDER BY firm_id;

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'estudio_assets%'
ORDER BY policyname;
