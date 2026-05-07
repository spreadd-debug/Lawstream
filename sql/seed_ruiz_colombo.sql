-- ════════════════════════════════════════════════════════════════
-- SEED — Caso Ruiz / Colombo (testing end-to-end)
-- ════════════════════════════════════════════════════════════════
-- Inserta el caso completo del audit con todos los GAPs cubiertos:
--   • R1+R2+R3 — 3 hijos, Olivia con TEA y régimen propio, Facundo
--                cerca de cumplir 18.
--   • R4+R9+R14 — Juncal (AR) + Punta del Este (UY vía Playa Serena S.A.)
--                + cartera Bull Market con valuación temporal.
--   • R6 — evento de mutación de tipo de divorcio + tarea cancelada
--          de la rama "De común acuerdo".
--   • R8 — exhorto internacional librado >90 días sin contestación.
--   • R10 — reconvención de Valentina pendiente de traslado.
--   • R11 — apelaciones cruzadas (Sebastián + Valentina apelan
--          compensación).
--   • R12 — causa penal externa por vaciamiento.
--   • R13 — cuota provisoria (modificada) + cuota definitiva con
--          conceptos en especie por hijo.
--   • R15 — inhibición general trabada + intervención judicial +
--          veedor designado.
--
-- Ejecución:
--   • Pre-requisito: migraciones 041 → 049 corridas.
--   • Pre-requisito: estar logueado en Supabase Dashboard (el firm_id
--     se hereda automáticamente vía trigger trg_set_firm_id).
--   • Idempotente: si el matter "RUIZ, Sebastián..." ya existe, el
--     seed sale sin tocar nada.

DO $$
DECLARE
  v_responsible    TEXT;
  v_client_id      UUID;
  v_matter_id      UUID;
  v_hijo_facundo   UUID;
  v_hijo_isabella  UUID;
  v_hijo_olivia    UUID;
  v_sociedad_id    UUID;
  v_bien_juncal    UUID;
  v_bien_pde       UUID;
  v_bien_bullmkt   UUID;
  v_bien_amex      UUID;
  v_cautelar_inhib UUID;
  v_cautelar_inter UUID;
  v_cuota_prov     UUID;
  v_cuota_defi     UUID;
  v_evento_mutacion UUID;
  v_evento_exhorto  UUID;
  v_evento_sentencia UUID;
  v_apelacion_1    UUID;
  v_apelacion_2    UUID;
BEGIN
  -- Idempotencia: si ya existe el matter, salimos.
  IF EXISTS (SELECT 1 FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND title ILIKE '%COLOMBO%') THEN
    RAISE NOTICE '[seed] El caso Ruiz/Colombo ya existe — seed salteado.';
    RETURN;
  END IF;

  -- Responsible: usamos el nombre del user logueado si lo encontramos en
  -- profiles; caemos a placeholder si no.
  SELECT COALESCE(NULLIF(full_name, ''), 'Estudio')
  INTO v_responsible
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  IF v_responsible IS NULL THEN v_responsible := 'Estudio'; END IF;

  -- ════════════════════════════════════════════════════════════
  -- 1. CLIENTE
  -- ════════════════════════════════════════════════════════════
  INSERT INTO clients (name, email, phone, type, notes)
  VALUES (
    'Sebastián Nicolás Ruiz',
    'sebastian.ruiz@example.test',
    '+54 11 5555-1234',
    'Persona',
    'DNI 25.890.123 · 48 años · Médico cardiólogo · Socio Centro Cardiovascular Ruiz & Asociados S.R.L. · Empleado Hospital Italiano. Domicilio: Juncal 2245, 12° A, CABA.'
  )
  RETURNING id INTO v_client_id;

  -- ════════════════════════════════════════════════════════════
  -- 2. MATTER PRINCIPAL
  -- ════════════════════════════════════════════════════════════
  INSERT INTO matters (
    title, client, type, subtype, status, health, responsible,
    next_action, next_action_date, priority,
    jurisdiccion, tipo_proceso, kind, flow_template_id, current_stage,
    expediente, description,
    case_data
  ) VALUES (
    'RUIZ, Sebastián Nicolás y COLOMBO, Valentina s/ DIVORCIO — Presentación conjunta (mutado a unilateral)',
    'Sebastián Nicolás Ruiz',
    'Familia',
    'Divorcio',
    'Activo',
    'Trabado',
    v_responsible,
    'Seguimiento apelaciones cruzadas en Cámara Sala F',
    NOW() + INTERVAL '7 days',
    'Alta',
    'caba',
    'ordinario',
    'principal',
    'fam-divorcio',
    'Sentencia',
    '12.345/2026',
    'Divorcio iniciado en presentación conjunta el 15/01/2026 ante JNCiv N° 15. Mutó a contencioso unilateral promovido por Sebastián el 08/04/2026 (Valentina retiró conformidad). Régimen patrimonial: separación de bienes (convención 01/08/2015, Esc. 456 Reg. 789). Sentencia 20/02/2027 — apelaciones cruzadas en Cámara.',
    jsonb_build_object(
      'tipo_divorcio',                'Unilateral',
      'fecha_matrimonio',             '2008-03-22',
      'registro_civil',               'Registro Civil de CABA, Circunscripción 3ª',
      'acta_numero',                  '112',
      'acta_tomo',                    '1C',
      'regimen_patrimonial',          'Separación de bienes',
      'fecha_separacion_hecho',       '2026-01-18',
      'conyuge1_nombre',              'Sebastián Nicolás Ruiz',
      'conyuge1_dni',                 '25.890.123',
      'conyuge1_domicilio',           'Juncal 2245, 12° A, CABA',
      'conyuge1_nacionalidad',        'Argentina',
      'conyuge1_fecha_nacimiento',    '1977-08-03',
      'conyuge1_profesion',           'Médico cardiólogo',
      'conyuge1_situacion_laboral',   'Empleado en relación de dependencia',
      'conyuge1_empleador',           'Hospital Italiano + SRL Centro Cardiovascular Ruiz & Asociados',
      'conyuge1_ingreso_mensual',     '4200000',
      'conyuge2_nombre',              'Valentina Colombo',
      'conyuge2_dni',                 '27.654.321',
      'conyuge2_domicilio',           'Juncal 2245, 12° A, CABA (al momento de presentar)',
      'conyuge2_nacionalidad',        'Argentina/Italiana',
      'conyuge2_fecha_nacimiento',    '1981-03-11',
      'conyuge2_profesion',           'Lic. en Administración de Empresas',
      'conyuge2_situacion_laboral',   'Desempleado',
      'conyuge2_abogado',             'Dra. Carolina Monti',
      'conyuge2_abogado_matricula',   'T° 78 F° 345 CPACF',
      'medida_tipo_denuncia',         'Inhibición general (medida cautelar patrimonial)',
      'medida_fecha',                 '2026-03-05',
      'medida_descripcion',           'Inhibición general de bienes contra Sebastián + intervención judicial de la SRL con designación de veedor',
      'medida_vigencia_hasta',        '2027-09-01',
      'tipo_cuidado',                 'Compartido alternado',
      'residencia_principal',         'Alternado',
      'regimen_comunicacion',         'Una semana con cada progenitor (régimen alternado). Excepción: Olivia con régimen progresivo a casa del padre (recomendación equipo terapéutico).',
      'cuota_porcentaje',             'Cuota desglosada — ver tab Hijos / Cuotas alimentarias',
      'obra_social',                  'OSDE 410',
      'reclama_compensacion',         'Sí',
      'compensacion_fundamento',      'Art. 441 CCyCN — Valentina dejó carrera en 2015 para cuidar 3 hijos.',
      'compensacion_tipo',            'Ambas (principal y subsidiaria)',
      'compensacion_monto',           'U$S 200.000 única o $2.000.000/mes por 60 meses',
      'compensacion_plazo',           '60 meses subsidiaria',
      'nivel_acuerdo',                'Sin acuerdo',
      'puntos_en_conflicto',          'Compensación económica + atribución de vivienda + costas',
      'sentencia_fecha',              '2027-02-20',
      'sentencia_firme',              'Parcialmente firme (apelación abierta)',
      'sentencia_costas',             'Distribuidas',
      'sentencia_compensacion_otorgada','Otorgada',
      'ejec_inmuebles',               'Sí — varios',
      'ejec_atribucion_vivienda',     'Sí',
      'ejec_compensacion_a_cobrar',   'Sí — el cliente paga',
      'ejec_sociedad',                'Sí',
      'ejec_honorarios_a_ejecutar',   'Sí'
    )
  )
  RETURNING id INTO v_matter_id;

  RAISE NOTICE '[seed] Matter creado: %', v_matter_id;

  -- ════════════════════════════════════════════════════════════
  -- 3. HIJOS (R1+R2+R3)
  -- ════════════════════════════════════════════════════════════
  -- Facundo: cumple 18 el 15/06/2026 (próximo según fecha de hoy)
  INSERT INTO hijos_caso (matter_id, nombre, dni, fecha_nacimiento, escolaridad, establecimiento, orden)
  VALUES (v_matter_id, 'Facundo Ruiz Colombo', '50.456.789', '2008-06-15', '5° año', 'Colegio Nacional Buenos Aires', 0)
  RETURNING id INTO v_hijo_facundo;

  -- Isabella: 14 años, régimen alternado normal
  INSERT INTO hijos_caso (matter_id, nombre, dni, fecha_nacimiento, escolaridad, establecimiento, orden)
  VALUES (v_matter_id, 'Isabella Ruiz Colombo', '53.789.012', '2011-09-28', '3° año', 'Colegio Nacional Buenos Aires', 1)
  RETURNING id INTO v_hijo_isabella;

  -- Olivia: 8 años, TEA + régimen propio
  INSERT INTO hijos_caso (
    matter_id, nombre, dni, fecha_nacimiento, escolaridad, establecimiento,
    tiene_cud, diagnostico, terapias_desc, acompanante_terapeutico, cobertura_especial,
    regimen_cuidado, residencia_principal, regimen_comunicacion, motivo_regimen_distinto,
    orden
  ) VALUES (
    v_matter_id, 'Olivia Ruiz Colombo', '56.234.567', '2017-12-20', '3° grado', 'Colegio Northlands',
    'si',
    'TEA nivel 1 — diagnóstico 2022',
    'Terapia ocupacional con Lic. Pérez 2x/sem ($280.000/mes). Fonoaudiología con Lic. Gómez 1x/sem ($150.000/mes). Acompañante terapéutico escolar 4hs/día ($250.000/mes).',
    'escolar',
    'Ley 24.901, OSDE 410',
    'Compartido con residencia principal en uno',
    'Domicilio del cónyuge 2',
    'Régimen progresivo: 2 meses con visitas diurnas de 4hs los sábados, luego pernoctes alternos.',
    'Recomendación del equipo terapéutico (Lic. Gabriela Torres, pericia psicológica 10/11/2026): cambio gradual de rutinas por TEA.',
    2
  )
  RETURNING id INTO v_hijo_olivia;

  -- ════════════════════════════════════════════════════════════
  -- 4. SOCIEDAD INTERPUESTA (R9)
  -- ════════════════════════════════════════════════════════════
  INSERT INTO sociedades_interpuestas (
    matter_id, denominacion, tipo_societario, jurisdiccion, accionistas_desc, observaciones
  ) VALUES (
    v_matter_id,
    'Playa Serena S.A.',
    'SA',
    'Uruguay',
    'Único accionista: Sebastián Ruiz (100%). Constituida 2021 en Uruguay para titularizar el apartamento de Punta del Este.',
    'Sociedad uruguaya unipersonal. Único activo conocido: apartamento Punta del Este.'
  )
  RETURNING id INTO v_sociedad_id;

  -- ════════════════════════════════════════════════════════════
  -- 5. BIENES (R4 + R9 + R14)
  -- ════════════════════════════════════════════════════════════
  -- 5.1 Inmueble Juncal (Argentina, propio)
  INSERT INTO bienes (
    matter_id, naturaleza, tipo, descripcion, pais, titular_rol, titular_detalle,
    valor_actual, moneda_actual, fecha_valuacion_actual, caracter, observaciones
  ) VALUES (
    v_matter_id, 'activo', 'inmueble',
    'Departamento Juncal 2245, 12° "A", CABA, 180 m²',
    'Argentina', 'cliente', 'Sebastián Ruiz',
    430000, 'USD', '2026-10-05',
    'propio',
    'Adquirido 2007 (antes del matrimonio). Sin hipoteca. Tasación Arq. Fernando Díaz 05/10/2026: U$S 430.000.'
  )
  RETURNING id INTO v_bien_juncal;

  -- 5.2 Apartamento Punta del Este (Uruguay, vía sociedad)
  INSERT INTO bienes (
    matter_id, naturaleza, tipo, descripcion, pais, titular_rol, titular_detalle,
    valor_actual, moneda_actual, fecha_valuacion_actual,
    sociedad_interpuesta_id, observaciones
  ) VALUES (
    v_matter_id, 'activo', 'inmueble',
    'Apartamento Playa Serena, Punta del Este',
    'Uruguay', 'cliente', 'Vía sociedad Playa Serena S.A. (único accionista Sebastián)',
    310000, 'USD', '2026-12-15',
    v_sociedad_id,
    'Adquirido 2021 por U$S 280.000. Tasación uruguaya por exhorto al Juzgado de Maldonado: U$S 310.000 (15/12/2026).'
  )
  RETURNING id INTO v_bien_pde;

  -- 5.3 Cartera Bull Market (con vaciamiento patrimonial)
  INSERT INTO bienes (
    matter_id, naturaleza, tipo, descripcion, pais, titular_rol,
    valor_actual, moneda_actual, fecha_valuacion_actual, observaciones
  ) VALUES (
    v_matter_id, 'activo', 'inversion_financiera',
    'Portfolio CEDEARs y bonos — Bull Market Brokers',
    'Argentina', 'cliente',
    28000, 'USD', '2026-09-30',
    'Al 31/12/2025: U$S 42.000. Al 30/09/2026: U$S 28.000. Caída de U$S 14.000 durante el proceso — base para imputar vaciamiento patrimonial.'
  )
  RETURNING id INTO v_bien_bullmkt;

  -- 5.4 Pasivo: tarjeta AMEX
  INSERT INTO bienes (
    matter_id, naturaleza, tipo, descripcion, titular_rol, titular_detalle,
    valor_actual, moneda_actual, fecha_valuacion_actual
  ) VALUES (
    v_matter_id, 'pasivo', 'tarjeta_credito',
    'Tarjeta AMEX Sebastián Ruiz', 'cliente', 'Acreedor: American Express Argentina',
    3200000, 'ARS', CURRENT_DATE
  )
  RETURNING id INTO v_bien_amex;

  -- ════════════════════════════════════════════════════════════
  -- 6. VALUACIÓN HISTÓRICA Bull Market (R14 — vaciamiento)
  -- ════════════════════════════════════════════════════════════
  -- Snapshot anterior — la valuación actual ya está en bienes.valor_actual.
  INSERT INTO bien_valuaciones (bien_id, fecha, valor, moneda, fuente, notas)
  VALUES
    (v_bien_bullmkt, '2025-12-31', 42000, 'USD', 'Estado de cuenta Bull Market 31/12/2025', 'Cartera al cierre del año previo al divorcio.'),
    (v_bien_bullmkt, '2026-09-30', 28000, 'USD', 'Informe Bull Market 30/09/2026 (oficio judicial)', 'Caída de U$S 14.000 — vaciamiento patrimonial mid-process.');

  -- ════════════════════════════════════════════════════════════
  -- 7. CAUSA PENAL RELACIONADA (R12)
  -- ════════════════════════════════════════════════════════════
  INSERT INTO causas_relacionadas (
    matter_id, vinculacion, tipo_causa,
    caratula, fuero, juzgado, jurisdiccion,
    abogado_externo_nombre, abogado_externo_contacto,
    estado_externo, descripcion, impacto,
    fecha_inicio, fecha_ultimo_movimiento
  ) VALUES (
    v_matter_id, 'externa', 'penal',
    'Denuncia por vaciamiento patrimonial — Centro Cardiovascular Ruiz & Asociados S.R.L.',
    'Penal Económico', 'Juzgado N° 5', 'CABA',
    'Dra. Carolina Monti',
    'T° 78 F° 345 CPACF — letrada de Valentina Colombo',
    'en_instruccion',
    'Denuncia por vaciamiento (art. 173 inc. 7 CP). Imputa retiros irregulares de $15M en dic 2025 - ene 2026 + facturación a empresa fantasma "MediConsult SAS" (constituida 6 meses antes, sin empleados ni actividad — confirmado vía IGJ).',
    'Lo que se pruebe en penal afecta la pericia contable del divorcio (CPN Adriana Leguizamón, informe 25/10/2026 estima desvío de $22M) y la valuación de la participación societaria de Sebastián.',
    '2026-02-20', '2026-10-25'
  );

  -- ════════════════════════════════════════════════════════════
  -- 8. CAUTELARES (R15)
  -- ════════════════════════════════════════════════════════════
  -- 8.1 Inhibición general
  INSERT INTO cautelares (
    matter_id, tipo, contra_rol, contra_detalle, alcance, estado,
    fecha_solicitud, fecha_resolucion, fecha_traba,
    registro_inscripcion, caucion_tipo, observaciones
  ) VALUES (
    v_matter_id, 'inhibicion_general', 'cliente', 'Sebastián Ruiz, DNI 25.890.123',
    'Sobre todos los bienes registrables del demandado — solicitada por la contraparte como medida cautelar patrimonial vinculada a la denuncia penal.',
    'trabada',
    '2026-02-28', '2026-03-05', '2026-03-05',
    'Reg. de Inhibiciones CABA, fol. 234, 2026',
    'juratoria',
    'Solicitada por Valentina como contracautela del reclamo de compensación.'
  )
  RETURNING id INTO v_cautelar_inhib;

  -- 8.2 Intervención judicial sobre la SRL
  INSERT INTO cautelares (
    matter_id, tipo, contra_rol, contra_detalle, alcance,
    sociedad_interpuesta_id, estado,
    fecha_solicitud, fecha_resolucion, fecha_traba,
    caucion_tipo
  ) VALUES (
    v_matter_id, 'intervencion_judicial', 'cliente', 'SRL Centro Cardiovascular Ruiz & Asociados',
    'Intervención de la sociedad con designación de veedor — vigilancia continua de operaciones por sospecha de vaciamiento.',
    NULL, -- no apunta a Playa Serena (esa no fue intervenida) — quedó sin sociedad asociada porque la SRL no está cargada como sociedad_interpuesta.
    'trabada',
    '2026-02-28', '2026-03-05', '2026-03-05',
    'juratoria'
  )
  RETURNING id INTO v_cautelar_inter;

  -- ════════════════════════════════════════════════════════════
  -- 9. VEEDOR (R15)
  -- ════════════════════════════════════════════════════════════
  INSERT INTO veedores (
    matter_id, cautelar_id, nombre, especialidad, matricula, email,
    estado, alcance, frecuencia_informes,
    fecha_designacion, fecha_aceptacion, honorarios_desc
  ) VALUES (
    v_matter_id, v_cautelar_inter,
    'CPN Mariana Schvartzman',
    'contador',
    'T° 234 F° 567 CPCECABA',
    'mschvartzman@example.test',
    'aceptado',
    'Vigilar todas las operaciones del Centro Cardiovascular Ruiz & Asociados S.R.L. Reportar movimientos extraordinarios > $10M. Detectar y preservar evidencia de operaciones con MediConsult SAS.',
    'mensual',
    '2026-03-05', '2026-03-12',
    'Regulados al 5% del activo intervenido. Honorarios provisorios $400.000/mes.'
  );

  -- ════════════════════════════════════════════════════════════
  -- 10. RECONVENCIÓN (R10)
  -- ════════════════════════════════════════════════════════════
  INSERT INTO reconvenciones (
    matter_id, presentada_por, fecha_presentacion,
    pretensiones, monto_reclamado, pretension_desc,
    estado, fecha_inicio, fecha_ultimo_movimiento
  ) VALUES (
    v_matter_id, 'contraparte', '2026-05-02',
    ARRAY['compensacion_economica', 'atribucion_vivienda', 'costas']::TEXT[],
    'U$S 200.000 única o $2.000.000/mes por 60 meses',
    'Valentina reconviene reclamando: (a) compensación económica art. 441 CCyCN por dedicación al cuidado de 3 hijos durante 11 años; (b) atribución del depto Juncal por 3 años o hasta que Isabella cumpla 18, invocando estabilidad de Olivia (TEA); (c) costas a cargo de Sebastián.',
    'traslado_corrido',
    '2026-05-02', '2026-05-15'
  );

  -- ════════════════════════════════════════════════════════════
  -- 11. CUOTAS ALIMENTARIAS + CONCEPTOS EN ESPECIE (R13)
  -- ════════════════════════════════════════════════════════════
  -- 11.1 Cuota provisoria (modificada por la definitiva)
  INSERT INTO cuotas_alimentarias (
    matter_id, estado, obligado_rol, obligado_detalle,
    alcance, monto_efectivo, moneda, frecuencia, ajuste,
    fecha_vigencia_desde, fecha_vigencia_hasta,
    fundamento, notas
  ) VALUES (
    v_matter_id, 'modificada', 'cliente', 'Sebastián Ruiz',
    'todos_los_hijos', 2000000, 'ARS', 'mensual', 'ipc',
    '2026-06-05', '2027-02-19',
    'Resolución incidente alimentos provisorios 05/06/2026, fs. 87. Costas a Sebastián.',
    'Vigente del 05/06/2026 al 19/02/2027 — luego reemplazada por la cuota definitiva de la sentencia.'
  )
  RETURNING id INTO v_cuota_prov;

  -- Conceptos en especie de la provisoria
  INSERT INTO cuota_conceptos_especie (
    cuota_alimentaria_id, categoria, concepto, prestador,
    monto_estimado, moneda, frecuencia, pagador, hijo_id
  ) VALUES
    (v_cuota_prov, 'terapia',                 'Terapia ocupacional',     'Lic. Pérez',  280000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia),
    (v_cuota_prov, 'terapia',                 'Fonoaudiología',          'Lic. Gómez',  150000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia),
    (v_cuota_prov, 'acompanante_terapeutico', 'Acompañante terapéutico', NULL,          250000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia);

  -- 11.2 Cuota definitiva (vigente)
  INSERT INTO cuotas_alimentarias (
    matter_id, estado, obligado_rol, obligado_detalle,
    alcance, monto_efectivo, moneda, frecuencia, ajuste,
    fecha_vigencia_desde,
    fundamento
  ) VALUES (
    v_matter_id, 'definitiva', 'cliente', 'Sebastián Ruiz',
    'todos_los_hijos', 3200000, 'ARS', 'mensual', 'ipc',
    '2027-02-20',
    'Sentencia 20/02/2027, fs. 142. Cuota definitiva: $3.200.000 efectivo + colegios + OSDE 410 + terapias Olivia. Facundo: alimentos hasta fin estudios universitarios o 25 años (art. 663 CCyCN). Costas distribuidas 70% Sebastián / 30% Valentina.'
  )
  RETURNING id INTO v_cuota_defi;

  -- Conceptos en especie de la definitiva
  INSERT INTO cuota_conceptos_especie (
    cuota_alimentaria_id, categoria, concepto, prestador,
    monto_estimado, moneda, frecuencia, pagador, hijo_id
  ) VALUES
    (v_cuota_defi, 'colegio',                 'Colegio Nacional Buenos Aires (Facundo, Isabella)', 'Colegio Nacional', NULL, NULL, 'mensual', 'obligado_directo', NULL),
    (v_cuota_defi, 'colegio',                 'Colegio Northlands (Olivia)',          'Colegio Northlands', NULL, NULL, 'mensual', 'obligado_directo', v_hijo_olivia),
    (v_cuota_defi, 'prepaga',                 'OSDE 410 — los 3 hijos',               'OSDE',               NULL, NULL, 'mensual', 'obligado_directo', NULL),
    (v_cuota_defi, 'terapia',                 'Terapia ocupacional',                  'Lic. Pérez',        280000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia),
    (v_cuota_defi, 'terapia',                 'Fonoaudiología',                       'Lic. Gómez',        150000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia),
    (v_cuota_defi, 'acompanante_terapeutico', 'Acompañante terapéutico escolar',      NULL,                250000, 'ARS', 'mensual', 'obligado_directo', v_hijo_olivia);

  -- ════════════════════════════════════════════════════════════
  -- 12. EVENTOS CLAVE (timeline + R6 + R8)
  -- ════════════════════════════════════════════════════════════
  -- 12.1 Mutación tipo de divorcio (R6)
  INSERT INTO eventos_expediente (
    matter_id, fecha, tipo, titulo, descripcion, origen, jurisdiccion,
    documentos_urls, metadata
  ) VALUES (
    v_matter_id, '2026-04-08', 'mutacion_tipo_divorcio',
    'Mutación a "Unilateral"',
    'Valentina retiró conformidad al convenio en los puntos pendientes — el divorcio pasa de presentación conjunta a contencioso unilateral promovido por Sebastián.',
    'manual', 'caba',
    ARRAY[]::TEXT[],
    jsonb_build_object(
      'tipo_anterior',     'De común acuerdo',
      'tipo_nuevo',        'Unilateral',
      'motivo',            'Valentina retiró conformidad al convenio',
      'tareas_canceladas', 6,
      'tareas_creadas',    8
    )
  )
  RETURNING id INTO v_evento_mutacion;

  -- 12.2 Exhorto internacional librado (R8) — > 90 días sin contestación al hoy
  INSERT INTO eventos_expediente (
    matter_id, fecha, tipo, titulo, descripcion, origen, jurisdiccion,
    documentos_urls, metadata
  ) VALUES (
    v_matter_id, '2026-08-10', 'exhorto_internacional_librado',
    'Exhorto a Juzgado de Maldonado para tasación apto Punta del Este',
    'Hilo C de la prueba — exhorto internacional al Juzgado de Maldonado (Uruguay) para que perito tasador local valúe el apartamento de Punta del Este (Playa Serena S.A.).',
    'manual', 'caba',
    ARRAY[]::TEXT[],
    jsonb_build_object(
      'pais',              'Uruguay',
      'autoridad_destino', 'Juzgado de Maldonado',
      'via',               'Convenio La Haya 1965'
    )
  )
  RETURNING id INTO v_evento_exhorto;

  -- 12.3 Contestación del exhorto (15/12/2026) — el banner R8 ya no debería aparecer
  -- Pero para que el banner SÍ aparezca al testear, comentamos la contestación.
  -- Si querés cerrar el flujo completo, descomentá el siguiente INSERT:
  --
  -- INSERT INTO eventos_expediente (matter_id, fecha, tipo, titulo, descripcion, origen, jurisdiccion, documentos_urls)
  -- VALUES (v_matter_id, '2026-12-15', 'exhorto_internacional_contestado',
  --   'Llega exhorto contestado de Maldonado',
  --   'Tasación uruguaya: U$S 310.000.', 'manual', 'caba', ARRAY[]::TEXT[]);

  -- 12.4 Sentencia
  INSERT INTO eventos_expediente (
    matter_id, fecha, tipo, titulo, descripcion, origen, jurisdiccion, documentos_urls
  ) VALUES (
    v_matter_id, '2027-02-20', 'sentencia',
    'Sentencia de divorcio',
    'Sentencia: disuelve vínculo. Cuota definitiva $3.200.000 + colegios + OSDE + terapias Olivia. Cuidado Isabella alternado, Olivia residencia con madre + régimen progresivo, Facundo mayor elige. Atribución vivienda: a Valentina por 4 años o hasta Olivia 14, sin valor locativo. Compensación: U$S 120.000 en 12 cuotas + 6% anual. Costas 70/30.',
    'manual', 'caba', ARRAY[]::TEXT[]
  )
  RETURNING id INTO v_evento_sentencia;

  -- ════════════════════════════════════════════════════════════
  -- 13. APELACIONES CRUZADAS (R11)
  -- ════════════════════════════════════════════════════════════
  -- 13.1 Sebastián apela compensación + atribución (25/02/2027)
  INSERT INTO matters (
    title, client, type, status, health, responsible,
    next_action, next_action_date, priority, jurisdiccion, tipo_proceso,
    kind, parent_matter_id, aspectos_apelados, apelado_por,
    flow_template_id, current_stage, description
  ) VALUES (
    'Apelación Sebastián — compensación + atribución vivienda',
    'Sebastián Nicolás Ruiz', 'Familia', 'Activo', 'Sano', v_responsible,
    'Expresar agravios', '2027-04-20',
    'Alta', 'caba', 'ordinario',
    'apelacion', v_matter_id,
    ARRAY['compensacion_economica', 'atribucion_vivienda']::TEXT[],
    'cliente',
    'cam-apelacion-civil', 'Agravios',
    'Sebastián apela: (a) monto de la compensación es excesivo (U$S 120.000); (b) atribución de vivienda sobre Juncal le impide disponer de su bien propio.'
  )
  RETURNING id INTO v_apelacion_1;

  -- 13.2 Valentina contra-apela compensación (01/03/2027) — APELACIÓN CRUZADA
  INSERT INTO matters (
    title, client, type, status, health, responsible,
    next_action, next_action_date, priority, jurisdiccion, tipo_proceso,
    kind, parent_matter_id, aspectos_apelados, apelado_por,
    flow_template_id, current_stage, description
  ) VALUES (
    'Apelación Valentina — compensación insuficiente',
    'Sebastián Nicolás Ruiz', 'Familia', 'Activo', 'Sano', v_responsible,
    'Contestar agravios de la otra parte', '2027-04-25',
    'Alta', 'caba', 'ordinario',
    'apelacion', v_matter_id,
    ARRAY['compensacion_economica']::TEXT[],
    'contraparte',
    'cam-apelacion-civil', 'Agravios',
    'Valentina contra-apela compensación: U$S 120.000 es insuficiente respecto del reclamo original (U$S 200.000). Apelación cruzada sobre el mismo aspecto que la de Sebastián.'
  )
  RETURNING id INTO v_apelacion_2;

  RAISE NOTICE '[seed] Caso Ruiz/Colombo creado completo. Matter principal: %, apelaciones: % y %', v_matter_id, v_apelacion_1, v_apelacion_2;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[seed] Error: %. Rollback automático.', SQLERRM;
  RAISE;
END $$;

-- ════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO FINAL
-- ════════════════════════════════════════════════════════════════

SELECT 'matter principal'           AS entidad, COUNT(*)::TEXT AS cantidad FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal'
UNION ALL SELECT 'apelaciones (sub-procesos)', COUNT(*)::TEXT FROM matters WHERE kind = 'apelacion' AND parent_matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'hijos del caso',             COUNT(*)::TEXT FROM hijos_caso WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'sociedades interpuestas',    COUNT(*)::TEXT FROM sociedades_interpuestas WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'bienes',                     COUNT(*)::TEXT FROM bienes WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'valuaciones de bien',        COUNT(*)::TEXT FROM bien_valuaciones WHERE bien_id IN (SELECT id FROM bienes WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal'))
UNION ALL SELECT 'causas relacionadas',        COUNT(*)::TEXT FROM causas_relacionadas WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'cautelares',                 COUNT(*)::TEXT FROM cautelares WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'veedores',                   COUNT(*)::TEXT FROM veedores WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'reconvenciones',             COUNT(*)::TEXT FROM reconvenciones WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'cuotas alimentarias',        COUNT(*)::TEXT FROM cuotas_alimentarias WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal')
UNION ALL SELECT 'conceptos en especie',       COUNT(*)::TEXT FROM cuota_conceptos_especie WHERE cuota_alimentaria_id IN (SELECT id FROM cuotas_alimentarias WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal'))
UNION ALL SELECT 'eventos del expediente',     COUNT(*)::TEXT FROM eventos_expediente WHERE matter_id IN (SELECT id FROM matters WHERE title ILIKE 'RUIZ, Sebastián%' AND kind = 'principal');
