-- 008: Módulo Laboral completo — CABA y Provincia de Buenos Aires
-- Ley 27.802 de Modernización Laboral (sancionada 27/2/2026, publicada 6/3/2026)
-- ALERTA: 82 artículos suspendidos cautelarmente al 30/3/2026

-- ═══════════════════════════════════════════════════════════
-- 1. VERSION NORMATIVA — Tabla de vigencia de reglas
--    OBLIGATORIA: sin esta tabla no se puede saber si un
--    artículo está vigente o suspendido cautelarmente.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS version_normativa (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  articulo        text NOT NULL,
  ley             text NOT NULL,
  descripcion     text,
  estado          text NOT NULL DEFAULT 'VIGENTE'
                    CHECK (estado IN ('VIGENTE', 'SUSPENDIDA_CAUTELAR', 'PENDIENTE_REGLAMENTACION', 'DEROGADA')),
  vigente_desde   date,
  vigente_hasta   date,
  jurisdiccion    text NOT NULL DEFAULT 'NACIONAL'
                    CHECK (jurisdiccion IN ('NACIONAL', 'CABA', 'PBA', 'TODAS')),
  fuente          text,
  afecta_modulo   text NOT NULL DEFAULT 'TODOS'
                    CHECK (afecta_modulo IN ('ENCUADRE', 'EXTINCION', 'LIQUIDACION', 'PLATAFORMAS', 'SINDICAL', 'TODOS')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Seed: artículos clave afectados por la cautelar del 30/3/2026
INSERT INTO version_normativa (articulo, ley, descripcion, estado, vigente_desde, jurisdiccion, fuente, afecta_modulo) VALUES
  ('art. 23',    'Ley 27.802', 'Presunción de contrato de trabajo (reformado)', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'ENCUADRE'),
  ('art. 245',   'Ley 27.802', 'Indemnización por despido sin justa causa (reformado)', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'EXTINCION'),
  ('art. 276',   'Ley 27.802', 'Actualización de créditos laborales IPC+3%', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'LIQUIDACION'),
  ('arts. 30-31','Ley 27.802', 'Tercerización y solidaridad (reformado)', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'ENCUADRE'),
  ('Título XII', 'Ley 27.802', 'Régimen de trabajadores de plataformas digitales', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'PLATAFORMAS'),
  ('arts. sindic.','Ley 27.802','Normas sindicales (tutela, asambleas, CCT)', 'SUSPENDIDA_CAUTELAR', '2026-03-06', 'NACIONAL', 'Cautelar Juzgado Nacional del Trabajo, 30/3/2026', 'SINDICAL'),
  ('art. 245',   'Ley 20.744', 'Indemnización por antigüedad (texto original LCT)', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'EXTINCION'),
  ('art. 232',   'Ley 20.744', 'Preaviso', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'EXTINCION'),
  ('art. 233',   'Ley 20.744', 'Integración mes de despido', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'EXTINCION'),
  ('art. 80',    'Ley 20.744', 'Certificado de trabajo', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'EXTINCION'),
  ('art. 55',    'Ley 20.744', 'Omisión de registro - presunción', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'ENCUADRE'),
  ('art. 278',   'Ley 20.744', 'Actualización de créditos (texto original)', 'VIGENTE', '1976-09-21', 'NACIONAL', 'LCT texto ordenado', 'LIQUIDACION'),
  ('arts. 8-15', 'Ley 24.013', 'Multas por empleo no registrado', 'VIGENTE', '1991-12-17', 'NACIONAL', 'Ley Nacional de Empleo', 'ENCUADRE'),
  ('art. 1',     'Ley 25.323', 'Incremento indemnizatorio por falta de registro', 'VIGENTE', '2000-10-18', 'NACIONAL', 'Ley 25.323', 'EXTINCION'),
  ('art. 2',     'Ley 25.323', 'Incremento 50% por falta de pago', 'VIGENTE', '2000-10-18', 'NACIONAL', 'Ley 25.323', 'EXTINCION')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 2. CASOS LABORALES — Tabla principal del módulo
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS casos_laborales (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       text NOT NULL,
  matter_id       uuid NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  jurisdiccion    text NOT NULL CHECK (jurisdiccion IN ('CABA', 'PBA')),
  tipo_caso       text NOT NULL
                    CHECK (tipo_caso IN ('DESPIDO', 'DIFERENCIAS', 'NO_REGISTRADO', 'ART', 'SINDICAL', 'PLATAFORMA')),
  modulos_activos text[] DEFAULT '{}',
  estado          text NOT NULL DEFAULT 'encuadre'
                    CHECK (estado IN ('encuadre', 'telegramas', 'seclo', 'juicio', 'sentencia', 'ejecucion', 'cerrado')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_casos_laborales_matter ON casos_laborales(matter_id);

-- ═══════════════════════════════════════════════════════════
-- 3. ENCUADRES LABORALES — Clasificación del vínculo (M1)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS encuadres_laborales (
  id                          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id                     uuid NOT NULL REFERENCES casos_laborales(id) ON DELETE CASCADE,
  clasificacion_dependencia   text NOT NULL DEFAULT 'DEPENDIENTE'
                                CHECK (clasificacion_dependencia IN ('DEPENDIENTE', 'BORDERLINE', 'INDEPENDIENTE')),
  hay_tercerizacion           boolean DEFAULT false,
  hay_grupo_economico         boolean DEFAULT false,
  hay_plataforma              boolean DEFAULT false,
  cct_aplicable               text,
  teoria_del_caso             text,
  datos_de_encuadre           jsonb DEFAULT '{}',
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 4. TELEGRAMAS — Intercambio epistolar (M7)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS telegramas (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id         uuid NOT NULL REFERENCES casos_laborales(id) ON DELETE CASCADE,
  tipo            text NOT NULL
                    CHECK (tipo IN ('INTIMACION_REGISTRACION', 'DIFERENCIAS', 'NOTIFICACION_DESPIDO', 'RENUNCIA', 'RESPUESTA', 'OTRO')),
  enviado_por     text NOT NULL CHECK (enviado_por IN ('TRABAJADOR', 'EMPLEADOR')),
  fecha_envio     date,
  fecha_recepcion date,
  contenido       text,
  respondido      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegramas_caso ON telegramas(caso_id);

-- ═══════════════════════════════════════════════════════════
-- 5. SECLO TRAMITES — Solo CABA (M7b)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS seclo_tramites (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id               uuid NOT NULL REFERENCES casos_laborales(id) ON DELETE CASCADE,
  numero_tramite        text,
  conciliador           text,
  fecha_audiencia       date,
  oferta_empleador      numeric(15,2),
  calculo_interno       numeric(15,2),
  diferencia            numeric(15,2),
  resultado             text CHECK (resultado IN ('ACUERDO', 'FRACASO', 'INCOMPARECENCIA')),
  acuerdo_homologado    boolean DEFAULT false,
  fecha_homologacion    date,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 6. LIQUIDACIONES LABORALES — Motor art. 245 (M4/M8)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS liquidaciones_laborales (
  id                            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id                       uuid NOT NULL REFERENCES casos_laborales(id) ON DELETE CASCADE,
  fecha_ingreso                 date NOT NULL,
  fecha_egreso                  date NOT NULL,
  antiguedad_anios              int,
  mejor_remuneracion            numeric(15,2),
  incluye_variables             boolean DEFAULT false,
  indemnizacion_art_245         numeric(15,2),
  preaviso                      numeric(15,2),
  integracion_mes               numeric(15,2),
  sac_preaviso                  numeric(15,2),
  sac_proporcional              numeric(15,2),
  vacaciones_proporcional       numeric(15,2),
  dias_trabajados               numeric(15,2),
  multa_art_2_ley_25323         numeric(15,2),
  multa_art_80                  numeric(15,2),
  multas_ley_24013              numeric(15,2),
  otros_rubros                  jsonb DEFAULT '{}',
  total                         numeric(15,2),
  actualizado_con               text CHECK (actualizado_con IN ('IPC', 'IPC_3', 'OTRO')),
  tasa_interes_anual            numeric(5,2),
  nota_cautelar                 text DEFAULT 'Art. 245 LCT: aplicar texto original (Ley 20.744). Reforma Ley 27.802 suspendida cautelarmente al 30/3/2026.',
  version_normativa_art_245_id  uuid REFERENCES version_normativa(id),
  created_at                    timestamptz DEFAULT now(),
  updated_at                    timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- 7. EXPEDIENTES LABORALES — Tracking judicial (M8)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expedientes_laborales (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  caso_id           uuid NOT NULL REFERENCES casos_laborales(id) ON DELETE CASCADE,
  jurisdiccion      text NOT NULL CHECK (jurisdiccion IN ('CABA', 'PBA')),
  juzgado           text,
  numero_expediente text,
  caratula          text,
  estado_procesal   text NOT NULL DEFAULT 'demanda'
                      CHECK (estado_procesal IN ('demanda', 'contestacion', 'prueba', 'vista_de_causa', 'sentencia', 'apelacion', 'ejecucion')),
  fecha_sentencia   date,
  monto_sentencia   numeric(15,2),
  cuotas_pago       int,
  tipo_empresa      text CHECK (tipo_empresa IN ('GRAN_EMPRESA', 'MIPYME')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- RLS + Políticas permisivas (mismo patrón que schema.sql)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE version_normativa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos_laborales         ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuadres_laborales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegramas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE seclo_tramites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedientes_laborales   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso_total" ON version_normativa       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON casos_laborales         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON encuadres_laborales     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON telegramas              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON seclo_tramites          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON liquidaciones_laborales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "acceso_total" ON expedientes_laborales   FOR ALL USING (true) WITH CHECK (true);
