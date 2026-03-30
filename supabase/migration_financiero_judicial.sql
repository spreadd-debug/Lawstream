-- ================================================================
-- LAWSTREAM — MIGRACIÓN: MÓDULO FINANCIERO + MÓDULO JUDICIAL
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- ── BLOQUE 1: MÓDULO FINANCIERO ──────────────────────────────────

-- 1.1 Configuración del estudio (valor IUS, etc.)
CREATE TABLE IF NOT EXISTS studio_config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL UNIQUE,   -- 'ius_valor', etc.
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Seed: valor inicial del IUS (actualizar al valor real actual)
INSERT INTO studio_config (key, value, updated_by)
VALUES ('ius_valor', '{"pesos": 3500, "nota": "Actualizar al valor vigente"}', 'sistema')
ON CONFLICT (key) DO NOTHING;

-- 1.2 Presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id     UUID        REFERENCES consultations(id) ON DELETE SET NULL,
  matter_id           UUID        REFERENCES matters(id) ON DELETE SET NULL,
  client_name         TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'Borrador'
                                  CHECK (status IN ('Borrador','Enviado','Aceptado','Rechazado')),
  ius_valor_snapshot  NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_ius        NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal_pesos      NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status      TEXT        NOT NULL DEFAULT 'Pendiente'
                                  CHECK (payment_status IN ('Pendiente','Parcial','Pagado')),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presupuestos_consultation ON presupuestos(consultation_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_matter       ON presupuestos(matter_id);

-- 1.3 Ítems del presupuesto
CREATE TABLE IF NOT EXISTS presupuesto_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id  UUID        NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  concepto        TEXT        NOT NULL,
  tipo            TEXT        NOT NULL DEFAULT 'bono'
                              CHECK (tipo IN ('bono','honorario','gasto','otro')),
  cantidad_ius    NUMERIC(10,2),   -- NULL si el monto es fijo en pesos
  monto_pesos     NUMERIC(14,2)   NOT NULL DEFAULT 0,
  obligatorio     BOOLEAN     NOT NULL DEFAULT true,
  orden           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presupuesto_items_presupuesto ON presupuesto_items(presupuesto_id);

-- 1.4 Agregar campo de entrevista paga a consultations
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS consultation_fee_paid BOOLEAN NOT NULL DEFAULT false;

-- ── BLOQUE 2: MÓDULO JUDICIAL ────────────────────────────────────

-- 2.1 Expedientes judiciales
CREATE TABLE IF NOT EXISTS expedientes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id      UUID        NOT NULL UNIQUE REFERENCES matters(id) ON DELETE CASCADE,
  nro_receptoria TEXT,
  nro_juzgado    TEXT,
  caratula       TEXT        NOT NULL,
  fuero          TEXT        NOT NULL,
  juzgado        TEXT,
  estado_troncal TEXT        NOT NULL DEFAULT 'Sin presentar'
                             CHECK (estado_troncal IN (
                               'Sin presentar',
                               'Presentado en MEV',
                               'Sorteado',
                               'A Despacho',
                               'En Letra',
                               'Fuera de Letra',
                               'Fuera del Organismo',
                               'Paralizado'
                             )),
  subestado      TEXT,
  estado_desde   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mev_presentado BOOLEAN     NOT NULL DEFAULT false,
  mev_fecha      TIMESTAMPTZ,
  mev_token      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expedientes_matter ON expedientes(matter_id);

-- 2.2 Log de cambios de estado del expediente
CREATE TABLE IF NOT EXISTS expediente_estados_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id  UUID        NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
  estado_troncal TEXT        NOT NULL,
  subestado      TEXT,
  fecha_desde    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_hasta    TIMESTAMPTZ,          -- NULL = estado actual
  observaciones  TEXT,
  registrado_por TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estados_log_expediente ON expediente_estados_log(expediente_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────

ALTER TABLE studio_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_estados_log    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_total" ON studio_config          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON presupuestos           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON presupuesto_items      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON expedientes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON expediente_estados_log FOR ALL USING (true) WITH CHECK (true);
