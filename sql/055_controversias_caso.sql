-- 055 · Controversias del caso (GAP UX-33)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- En el día a día de un divorcio (o cualquier caso de familia en
-- negociación) aparecen hechos extrajudiciales que generan conflicto
-- entre las partes y que el abogado tiene que registrar para decidir
-- si los lleva a juicio o los resuelve por fuera. Ejemplos:
--   • el cónyuge anuncia que se lleva a los chicos a Mar del Plata,
--   • saca un préstamo grande sin avisar,
--   • cambia la obra social,
--   • se muda con pareja nueva,
--   • deja de pagar el colegio,
--   • etc.
--
-- Estos hechos no son eventos del expediente — el expediente puede
-- todavía no existir. Pero son críticos: tienen plazo (ej. vacaciones
-- empiezan en 3 semanas), posiciones encontradas, y pueden escalar a
-- incidente o demanda. Hoy se mezclan con notas libres o se pierden
-- en mensajes de chat. Esta tabla los estructura.
--
-- Si la controversia escala a juicio, se vincula al sub-proceso
-- (incidente / pedido cautelar) y al evento del timeline procesal
-- correspondiente — eso da trazabilidad bidireccional pre-judicial ↔
-- judicial sin contaminar el timeline procesal con eventos no-procesales.
--
-- Dependencias: 028 (matters.kind), 033 (firm_id), helpers
-- public.set_firm_id_from_profile y public.touch_updated_at.
--
-- ⚠️ Idempotente.

CREATE TABLE IF NOT EXISTS controversias_caso (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id                UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  firm_id                  UUID         NOT NULL REFERENCES firms(id),

  -- Categoría tipificada — permite filtrar y reportar.
  categoria                TEXT         NOT NULL CHECK (categoria IN (
    'vacaciones',
    'cuota_alimentaria',
    'regimen_comunicacion',
    'mudanza',
    'bienes',
    'comunicacion',
    'salud',
    'educacion',
    'otra'
  )),

  -- Hecho disparador. Texto breve que aparece en la card.
  titulo                   TEXT         NOT NULL,

  -- Cuándo ocurrió el hecho que abre la controversia.
  fecha_hecho              DATE         NOT NULL,

  -- Descripción larga + posiciones de las partes.
  descripcion              TEXT,
  posicion_cliente         TEXT,
  posicion_contraparte     TEXT,

  -- Plazo crítico para resolver. Opcional — algunas controversias no lo
  -- tienen (ej. discusión sobre bienes pre-liquidación). Cuando existe,
  -- la card muestra countdown y el panel ordena por urgencia.
  plazo_critico            DATE,

  -- Ciclo de vida.
  --   abierta        — recién registrada, sin movimiento.
  --   negociando     — hay propuestas en juego entre las partes.
  --   acordada       — se llegó a acuerdo extrajudicial (no requiere juicio).
  --   judicializada  — se presentó como incidente / pedido / demanda.
  --   desistida      — el cliente decidió no seguirla (perdió relevancia).
  estado                   TEXT         NOT NULL DEFAULT 'abierta' CHECK (estado IN (
    'abierta', 'negociando', 'acordada', 'judicializada', 'desistida'
  )),

  -- Vínculo bidireccional con sub-proceso cuando se judicializa. Cuando
  -- el abogado clickea "Judicializar" en la card, la app crea (o
  -- vincula) un sub-proceso y guarda la FK acá.
  subproceso_id            UUID         REFERENCES matters(id) ON DELETE SET NULL,

  -- Vínculo opcional al evento del timeline procesal generado al
  -- judicializar (tipo 'controversia_judicializada' o el escrito real).
  evento_origen_id         UUID         REFERENCES eventos_expediente(id) ON DELETE SET NULL,

  -- Adjuntos (URLs de capturas de WhatsApp, mails, audios). JSONB para
  -- mantener el patrón de otros recursos del proyecto.
  documentos_urls          JSONB        NOT NULL DEFAULT '[]'::JSONB,

  notas                    TEXT,
  created_by               UUID         REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_controversias_matter      ON controversias_caso(matter_id);
CREATE INDEX IF NOT EXISTS idx_controversias_firm        ON controversias_caso(firm_id);
CREATE INDEX IF NOT EXISTS idx_controversias_estado      ON controversias_caso(matter_id, estado)
  WHERE estado IN ('abierta', 'negociando');
CREATE INDEX IF NOT EXISTS idx_controversias_plazo       ON controversias_caso(plazo_critico)
  WHERE plazo_critico IS NOT NULL AND estado IN ('abierta', 'negociando');

DROP TRIGGER IF EXISTS trg_set_firm_id ON controversias_caso;
CREATE TRIGGER trg_set_firm_id
  BEFORE INSERT ON controversias_caso
  FOR EACH ROW EXECUTE FUNCTION public.set_firm_id_from_profile();

DROP TRIGGER IF EXISTS trg_controversias_updated ON controversias_caso;
CREATE TRIGGER trg_controversias_updated
  BEFORE UPDATE ON controversias_caso
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE controversias_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "controversias_select" ON controversias_caso;
CREATE POLICY "controversias_select" ON controversias_caso FOR SELECT USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "controversias_insert" ON controversias_caso;
CREATE POLICY "controversias_insert" ON controversias_caso FOR INSERT WITH CHECK (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "controversias_update" ON controversias_caso;
CREATE POLICY "controversias_update" ON controversias_caso FOR UPDATE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);
DROP POLICY IF EXISTS "controversias_delete" ON controversias_caso;
CREATE POLICY "controversias_delete" ON controversias_caso FOR DELETE USING (
  public.user_is_active() AND public.can_see_matter(matter_id)
);

-- Diagnóstico
SELECT
  'controversias por estado' AS metrica,
  estado,
  COUNT(*)::TEXT             AS cantidad
FROM controversias_caso
GROUP BY estado
ORDER BY estado;
