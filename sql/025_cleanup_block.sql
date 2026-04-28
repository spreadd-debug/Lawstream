-- 025 · Cleanup block: doc↔evento FK · status Archivado
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Bundle de tres mejoras estructurales chicas:
--
--   GAP 30 — vínculo documento ↔ evento como FK real (no TEXT libre).
--            Permite navegar de un evento a sus documentos y viceversa.
--   GAP 31 — categorías estructuradas de documento. NO se agrega CHECK
--            constraint para no romper datos legados con valores libres;
--            el enum vive en TypeScript. La columna `category` queda
--            TEXT como antes.
--   GAP 15 — estado 'Archivado' en matters. Distinto de 'Cerrado':
--            Cerrado = caso que terminó (con o sin éxito).
--            Archivado = caso archivado judicialmente, expediente al
--            archivo. Útil para reportes y filtros.

-- ══════════════════════════════════════════════════════════════
-- 1. GAP 30 — documents.evento_id (FK opcional a eventos_expediente)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES eventos_expediente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_evento_id ON documents(evento_id) WHERE evento_id IS NOT NULL;

-- Nota: NO se hace backfill desde `associated_action` (TEXT libre) —
-- requeriría matching difuso por título y arriesga errores. El campo
-- legacy se mantiene; los documentos nuevos usan evento_id.

-- ══════════════════════════════════════════════════════════════
-- 2. GAP 15 — matters.status acepta 'Archivado'
-- ══════════════════════════════════════════════════════════════

ALTER TABLE matters DROP CONSTRAINT IF EXISTS matters_status_check;
ALTER TABLE matters ADD CONSTRAINT matters_status_check
  CHECK (status IN ('Activo', 'Suspendido', 'Cerrado', 'Pausado', 'Archivado'));

-- ══════════════════════════════════════════════════════════════
-- 3. Diagnóstico
-- ══════════════════════════════════════════════════════════════

SELECT
  'documents con evento_id'      AS metrica,
  COUNT(*)                       AS valor
FROM documents WHERE evento_id IS NOT NULL
UNION ALL
SELECT 'matters por status', COUNT(*) FROM matters
UNION ALL
SELECT
  'matters Archivado',
  COUNT(*)
FROM matters WHERE status = 'Archivado';

SELECT status, COUNT(*) AS cantidad
FROM matters
GROUP BY status
ORDER BY cantidad DESC;
