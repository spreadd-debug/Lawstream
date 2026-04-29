  -- 030 · Cédulas con múltiples intentos (GAP 7)
  -- Ejecutar en: Supabase Dashboard → SQL Editor → New query
  --
  -- Una cédula es una notificación judicial a un destinatario en un domicilio.
  -- En la práctica el oficial notificador puede necesitar varios intentos para
  -- localizar al destinatario (nadie atiende, domicilio cerrado, rehúsa recibir).
  -- Hoy se cargan como eventos sueltos sin agrupación; con esto modelamos:
  --
  --   • cedulas         → 1 por cada cédula emitida
  --   • cedula_intentos → 1..N por cédula, cada intento con fecha + resultado
  --
  -- El estado de la cédula es DERIVADO del último intento:
  --   - sin intentos                → 'pendiente'
  --   - último resultado exitoso    → 'notificada'
  --   - último resultado fallido    → 'en_diligenciamiento'
  --   - marcada manualmente         → 'devuelta_sin_notificar' / 'vencida'
  --
  -- Para no atar la lógica a la DB, el estado lo computa el front. Acá sólo
  -- guardamos un campo `estado_manual` para los casos "devuelta" / "vencida"
  -- que el usuario decide explícitamente.

  -- ══════════════════════════════════════════════════════════════
  -- 1. TABLA cedulas
  -- ══════════════════════════════════════════════════════════════

  CREATE TABLE IF NOT EXISTS cedulas (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id       UUID         NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    tipo            TEXT         NOT NULL DEFAULT 'traslado' CHECK (tipo IN (
      'demanda',
      'traslado',
      'audiencia',
      'sentencia',
      'citacion_testimonial',
      'intimacion',
      'oficio',
      'otro'
    )),
    destinatario    TEXT         NOT NULL,                     -- nombre del notificado
    domicilio       TEXT         NOT NULL,                     -- domicilio donde se diligencia
    objeto          TEXT,                                       -- breve descripción de qué se notifica
    fecha_emision   DATE,                                       -- cuándo se emitió la cédula
    estado_manual   TEXT         CHECK (estado_manual IS NULL OR estado_manual IN (
      'devuelta_sin_notificar',
      'vencida'
    )),
    notas           TEXT,
    created_by      UUID         REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_cedulas_matter ON cedulas(matter_id);

  -- ══════════════════════════════════════════════════════════════
  -- 2. TABLA cedula_intentos
  -- ══════════════════════════════════════════════════════════════

  CREATE TABLE IF NOT EXISTS cedula_intentos (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula_id       UUID         NOT NULL REFERENCES cedulas(id) ON DELETE CASCADE,
    fecha           DATE         NOT NULL,
    resultado       TEXT         NOT NULL CHECK (resultado IN (
      'notificado_personalmente',
      'notificado_bajo_puerta',
      'nadie_atiende',
      'domicilio_cerrado',
      'domicilio_inexistente',
      'rehusa_recibir',
      'datos_erroneos',
      'fallecido',
      'otro'
    )),
    hora            TIME,                                       -- opcional
    notas           TEXT,
    created_by      UUID         REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_cedula_intentos_cedula ON cedula_intentos(cedula_id);
  CREATE INDEX IF NOT EXISTS idx_cedula_intentos_fecha  ON cedula_intentos(cedula_id, fecha DESC);

  -- ══════════════════════════════════════════════════════════════
  -- 3. TRIGGER updated_at en cedulas
  -- ══════════════════════════════════════════════════════════════

  DROP TRIGGER IF EXISTS trg_cedulas_updated ON cedulas;
  CREATE TRIGGER trg_cedulas_updated
    BEFORE UPDATE ON cedulas
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

  -- ══════════════════════════════════════════════════════════════
  -- 4. RLS — hereda visibilidad del matter
  -- ══════════════════════════════════════════════════════════════

  ALTER TABLE cedulas         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE cedula_intentos ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "cedulas_select" ON cedulas FOR SELECT USING (
    public.user_is_active() AND public.can_see_matter(matter_id)
  );
  CREATE POLICY "cedulas_insert" ON cedulas FOR INSERT WITH CHECK (
    public.user_is_active() AND public.can_see_matter(matter_id)
  );
  CREATE POLICY "cedulas_update" ON cedulas FOR UPDATE USING (
    public.user_is_active() AND public.can_see_matter(matter_id)
  );
  CREATE POLICY "cedulas_delete" ON cedulas FOR DELETE USING (
    public.user_is_active() AND public.can_see_matter(matter_id)
  );

  -- Intentos: validamos via JOIN al matter de la cédula.
  CREATE POLICY "cedula_intentos_select" ON cedula_intentos FOR SELECT USING (
    public.user_is_active() AND EXISTS (
      SELECT 1 FROM cedulas c WHERE c.id = cedula_intentos.cedula_id AND public.can_see_matter(c.matter_id)
    )
  );
  CREATE POLICY "cedula_intentos_insert" ON cedula_intentos FOR INSERT WITH CHECK (
    public.user_is_active() AND EXISTS (
      SELECT 1 FROM cedulas c WHERE c.id = cedula_intentos.cedula_id AND public.can_see_matter(c.matter_id)
    )
  );
  CREATE POLICY "cedula_intentos_update" ON cedula_intentos FOR UPDATE USING (
    public.user_is_active() AND EXISTS (
      SELECT 1 FROM cedulas c WHERE c.id = cedula_intentos.cedula_id AND public.can_see_matter(c.matter_id)
    )
  );
  CREATE POLICY "cedula_intentos_delete" ON cedula_intentos FOR DELETE USING (
    public.user_is_active() AND EXISTS (
      SELECT 1 FROM cedulas c WHERE c.id = cedula_intentos.cedula_id AND public.can_see_matter(c.matter_id)
    )
  );

  -- ══════════════════════════════════════════════════════════════
  -- 5. Diagnóstico
  -- ══════════════════════════════════════════════════════════════

  SELECT 'cedulas' AS tabla, COUNT(*) AS filas FROM cedulas
  UNION ALL
  SELECT 'cedula_intentos', COUNT(*) FROM cedula_intentos;
