import { MatterTemplate } from '../types';

export const MATTER_TEMPLATES: MatterTemplate[] = [
  // ═══════════════════════════════════════════════════════════
  // FAMILIA
  // ═══════════════════════════════════════════════════════════

  {
    id: 'fam-divorcio',
    name: 'Divorcio',
    rama: 'Familia',
    subtipo: 'Divorcio',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Proceso de divorcio vincular (unilateral o bilateral).',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Verificar datos del matrimonio (fecha, hijos, bienes)', priority: 'crítico', bloqueante: true },
          { task: 'Determinar si es unilateral o de común acuerdo', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar existencia de convenio regulador previo', priority: 'recomendado' },
          { task: 'Identificar bienes gananciales y propios', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Acta de matrimonio', required: true },
          { name: 'DNI de ambas partes', required: true },
          { name: 'Partidas de nacimiento de hijos menores', required: true },
          { name: 'Títulos de propiedad de bienes', required: false },
        ],
        milestone: 'Análisis inicial completo',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar propuesta reguladora (hijos, bienes, vivienda)', priority: 'crítico', bloqueante: true },
          { task: 'Preparar demanda de divorcio', priority: 'crítico', bloqueante: true },
          { task: 'Calcular compensación económica si corresponde', priority: 'recomendado' },
          { task: 'Verificar mediación previa obligatoria', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Propuesta reguladora firmada', required: true },
          { name: 'Constancia de mediación', required: true },
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Verificar notificaciones a contraparte', priority: 'crítico', bloqueante: true },
          { task: 'Revisar puntos pendientes del convenio', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Cédula de notificación', required: true },
        ],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia de divorcio', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar inscripción en Registro Civil', priority: 'crítico', bloqueante: true },
          { task: 'Inscribir transferencia de bienes si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia de divorcio', required: true },
          { name: 'Oficio al Registro Civil', required: true },
        ],
        milestone: 'Sentencia firme e inscripta',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Verificar inscripción de sentencia en Registro Civil', priority: 'crítico', bloqueante: true },
          { task: 'Ejecutar liquidación de bienes pendientes', priority: 'recomendado' },
          { task: 'Archivar expediente', priority: 'opcional' },
        ],
        documents: [
          { name: 'Constancia de inscripción Registro Civil', required: true },
        ],
        milestone: 'Divorcio ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Verificar datos del matrimonio', priority: 'crítico' },
      { task: 'Determinar tipo de divorcio', priority: 'crítico' },
      { task: 'Redactar propuesta reguladora', priority: 'crítico' },
      { task: 'Identificar bienes gananciales', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Acta de matrimonio', required: true },
      { name: 'DNI de ambas partes', required: true },
      { name: 'Partidas de nacimiento hijos', required: true },
      { name: 'Títulos de propiedad', required: false },
    ],
    hitosProyectados: ['Análisis inicial', 'Demanda presentada', 'Audiencia', 'Sentencia', 'Ejecución'],
    bloqueantesTipicos: ['Falta acta de matrimonio', 'Contraparte no notificada', 'Mediación pendiente'],
    proximaAccionSugerida: 'Solicitar acta de matrimonio actualizada',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'fam-alimentos',
    name: 'Alimentos',
    rama: 'Familia',
    subtipo: 'Alimentos',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Reclamo de cuota alimentaria (provisoria y definitiva).',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Determinar tipo de alimentos (hijos / parientes / cónyuge)', priority: 'crítico', bloqueante: true },
          { task: 'Recopilar recibos de sueldo / ingresos del alimentante', priority: 'crítico', bloqueante: true },
          { task: 'Calcular escenarios de cuota (provisoria y definitiva)', priority: 'recomendado' },
          { task: 'Evaluar gastos ordinarios y extraordinarios', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Partida de nacimiento del/los menor/es', required: true },
          { name: 'Recibos de sueldo del alimentante', required: true },
          { name: 'Detalle de gastos mensuales', required: true },
          { name: 'Cobertura médica actual', required: false },
        ],
        milestone: 'Cuantificación de cuota lista',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda de alimentos', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar cuota provisoria (medida cautelar)', priority: 'crítico', bloqueante: true },
          { task: 'Generar petitorio con escenarios de cuota', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación de cuota propuesta', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente con argumentos de cuota', priority: 'crítico', bloqueante: true },
          { task: 'Verificar notificación al alimentante', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Cédula de notificación', required: true },
        ],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar fijación de cuota definitiva', priority: 'crítico', bloqueante: true },
          { task: 'Registrar cuota y forma de pago', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia de alimentos', required: true },
        ],
        milestone: 'Cuota definitiva fijada',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Monitorear cumplimiento de cuota', priority: 'crítico', bloqueante: true },
          { task: 'Iniciar ejecución por incumplimiento si corresponde', priority: 'recomendado' },
          { task: 'Evaluar necesidad de aumento/reducción', priority: 'opcional' },
        ],
        documents: [
          { name: 'Planilla de incumplimientos', required: false },
        ],
        milestone: 'Cuota en cumplimiento',
      },
    ],
    checklistBase: [
      { task: 'Determinar tipo de alimentos', priority: 'crítico' },
      { task: 'Recopilar recibos de sueldo', priority: 'crítico' },
      { task: 'Calcular escenarios de cuota', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Partida de nacimiento', required: true },
      { name: 'Recibos de sueldo', required: true },
      { name: 'Detalle de gastos', required: true },
    ],
    hitosProyectados: ['Cuantificación', 'Demanda', 'Audiencia', 'Sentencia', 'Ejecución'],
    bloqueantesTipicos: ['Falta partida de nacimiento', 'Sin datos de ingresos del alimentante'],
    proximaAccionSugerida: 'Recopilar recibos de sueldo del alimentante',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'fam-cuidado',
    name: 'Cuidado personal (tenencia)',
    rama: 'Familia',
    subtipo: 'Cuidado',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Régimen de cuidado personal de hijos (monoparental/alternado/compartido).',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Evaluar centro de vida del niño', priority: 'crítico', bloqueante: true },
          { task: 'Determinar convivencia real actual', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar disponibilidad horaria de cada progenitor', priority: 'recomendado' },
          { task: 'Recabar opinión del niño si corresponde por edad', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Partida de nacimiento', required: true },
          { name: 'DNI del niño y progenitores', required: true },
          { name: 'Informe escolar', required: false },
          { name: 'Certificado médico/psicológico', required: false },
        ],
        milestone: 'Evaluación inicial completa',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda de cuidado personal', priority: 'crítico', bloqueante: true },
          { task: 'Proponer régimen comunicacional', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar plan de parentalidad', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Plan de parentalidad propuesto', required: false },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Verificar notificaciones', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Cédula de notificación', required: true },
        ],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar régimen fijado por sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Registrar calendario operativo', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Régimen fijado',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Monitorear cumplimiento del régimen', priority: 'recomendado' },
          { task: 'Registrar incumplimientos si los hay', priority: 'opcional' },
        ],
        documents: [],
        milestone: 'Régimen en cumplimiento',
      },
    ],
    checklistBase: [
      { task: 'Evaluar centro de vida', priority: 'crítico' },
      { task: 'Determinar convivencia real', priority: 'crítico' },
      { task: 'Redactar plan de parentalidad', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Partida de nacimiento', required: true },
      { name: 'DNI de las partes', required: true },
    ],
    hitosProyectados: ['Evaluación', 'Demanda', 'Audiencia', 'Sentencia', 'Ejecución'],
    bloqueantesTipicos: ['Falta partida de nacimiento', 'Opinión del niño pendiente'],
    proximaAccionSugerida: 'Evaluar centro de vida del niño',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'fam-comunicacion',
    name: 'Régimen de comunicación',
    rama: 'Familia',
    subtipo: 'Comunicación',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Establecimiento o modificación de régimen comunicacional con hijos.',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Evaluar régimen comunicacional actual', priority: 'crítico', bloqueante: true },
          { task: 'Determinar distancia entre domicilios', priority: 'recomendado' },
          { task: 'Evaluar edad y escolaridad del niño', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Partida de nacimiento', required: true },
          { name: 'DNI de las partes', required: true },
        ],
        milestone: 'Evaluación del régimen actual',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar propuesta de régimen comunicacional', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Régimen propuesto', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar régimen fijado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Régimen comunicacional fijado',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Monitorear cumplimiento', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Régimen en cumplimiento',
      },
    ],
    checklistBase: [
      { task: 'Evaluar régimen comunicacional actual', priority: 'crítico' },
      { task: 'Redactar propuesta de régimen', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'Partida de nacimiento', required: true },
      { name: 'DNI de las partes', required: true },
    ],
    hitosProyectados: ['Evaluación', 'Demanda', 'Audiencia', 'Sentencia', 'Ejecución'],
    bloqueantesTipicos: ['Progenitor no colabora', 'Falta partida'],
    proximaAccionSugerida: 'Evaluar régimen comunicacional actual',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Media',
  },

  {
    id: 'fam-filiacion',
    name: 'Filiación',
    rama: 'Familia',
    subtipo: 'Filiación',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Reconocimiento, reclamación, impugnación de filiación o prueba de ADN.',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Determinar tipo de filiación (reconocimiento / reclamación / impugnación)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar necesidad de prueba genética/ADN', priority: 'crítico', bloqueante: true },
          { task: 'Recopilar partidas y actas relevantes', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Partida de nacimiento', required: true },
          { name: 'DNI de las partes', required: true },
          { name: 'Actas del Registro Civil', required: true },
        ],
        milestone: 'Análisis de vínculo completo',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda de filiación', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar prueba de ADN si corresponde', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Coordinar extracción de ADN', priority: 'crítico', bloqueante: true },
          { task: 'Preparar alegatos', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Resultado de ADN', required: true },
        ],
        milestone: 'Prueba producida',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia de filiación', priority: 'crítico', bloqueante: true },
          { task: 'Inscribir en Registro Civil', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia', required: true },
          { name: 'Oficio al Registro Civil', required: true },
        ],
        milestone: 'Filiación resuelta e inscripta',
      },
    ],
    checklistBase: [
      { task: 'Determinar tipo de filiación', priority: 'crítico' },
      { task: 'Evaluar necesidad de ADN', priority: 'crítico' },
      { task: 'Recopilar partidas', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'Partida de nacimiento', required: true },
      { name: 'DNI de las partes', required: true },
      { name: 'Actas del Registro Civil', required: true },
    ],
    hitosProyectados: ['Análisis', 'Demanda', 'Prueba', 'Sentencia'],
    bloqueantesTipicos: ['Falta resultado ADN', 'Parte se niega a prueba genética'],
    proximaAccionSugerida: 'Determinar tipo de filiación',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'fam-proteccion-urgente',
    name: 'Protección urgente (violencia)',
    rama: 'Familia',
    subtipo: 'Protección urgente',
    jurisdiccion: 'CABA',
    via: 'Urgente',
    etapaInicial: 'Inicio',
    descripcion: 'Medidas de protección ante violencia familiar (exclusión, restricción, etc.).',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Triage de riesgo: evaluar urgencia', priority: 'crítico', bloqueante: true },
          { task: 'Documentar hechos, amenazas, convivencia', priority: 'crítico', bloqueante: true },
          { task: 'Identificar niños expuestos', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar necesidad de medida cautelar inmediata', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Denuncia policial o administrativa', required: true },
          { name: 'Certificado médico (lesiones)', required: false },
          { name: 'Capturas de amenazas (WhatsApp, etc.)', required: false },
        ],
        milestone: 'Triage de riesgo completado',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar presentación urgente', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar exclusión del hogar / restricción de acercamiento', priority: 'crítico', bloqueante: true },
          { task: 'Generar checklist de evidencia inmediata', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Presentación urgente', required: true },
          { name: 'Hoja de riesgo', required: true },
        ],
        milestone: 'Presentación urgente realizada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Verificar cumplimiento de medida cautelar', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar medidas definitivas dictadas', priority: 'crítico', bloqueante: true },
          { task: 'Registrar agenda de renovación/control', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Resolución judicial de medidas', required: true },
        ],
        milestone: 'Medidas de protección vigentes',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Monitorear vencimiento de medidas', priority: 'crítico', bloqueante: true },
          { task: 'Renovar medidas si corresponde', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Protección controlada',
      },
    ],
    checklistBase: [
      { task: 'Triage de riesgo', priority: 'crítico' },
      { task: 'Documentar hechos', priority: 'crítico' },
      { task: 'Solicitar medida cautelar', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'Denuncia policial', required: true },
      { name: 'Certificado médico', required: false },
    ],
    hitosProyectados: ['Triage', 'Presentación urgente', 'Audiencia', 'Medidas definitivas', 'Control'],
    bloqueantesTipicos: ['Falta denuncia policial', 'Riesgo activo sin medida cautelar'],
    proximaAccionSugerida: 'Triage de riesgo inmediato',
    fechaSeguimientoSugeridaDays: 1,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'fam-adopcion',
    name: 'Adopción',
    rama: 'Familia',
    subtipo: 'Adopción',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Consulta',
    descripcion: 'Proceso de adopción (simple, plena o de integración).',
    stages: [
      {
        name: 'Consulta',
        tasks: [
          { task: 'Clasificar tipo de adopción (simple / plena / integración)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar adoptabilidad', priority: 'crítico', bloqueante: true },
          { task: 'Verificar edad, vínculo previo, opinión del niño', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del adoptante', required: true },
          { name: 'Certificado de antecedentes penales', required: true },
          { name: 'Informe socioambiental', required: false },
        ],
        milestone: 'Clasificación y evaluación completa',
      },
      {
        name: 'Negociación',
        tasks: [
          { task: 'Validar documentación del adoptante', priority: 'crítico', bloqueante: true },
          { task: 'Preparar tablero de hitos del proceso', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Constancia de inscripción en registro de adoptantes', required: true },
        ],
        milestone: 'Documentación validada',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda de adopción', priority: 'crítico', bloqueante: true },
          { task: 'Generar escritos e informes requeridos', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar adoptante para audiencia', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Audiencia celebrada',
      },
      {
        name: 'Prueba',
        tasks: [
          { task: 'Coordinar informes psicológicos y sociales', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Informe psicológico', required: true },
          { name: 'Informe social', required: true },
        ],
        milestone: 'Pruebas producidas',
      },
      {
        name: 'Sentencia / Homologación',
        tasks: [
          { task: 'Verificar sentencia de adopción', priority: 'crítico', bloqueante: true },
          { task: 'Inscribir en Registro Civil', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia de adopción', required: true },
        ],
        milestone: 'Adopción homologada e inscripta',
      },
    ],
    checklistBase: [
      { task: 'Clasificar tipo de adopción', priority: 'crítico' },
      { task: 'Evaluar adoptabilidad', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del adoptante', required: true },
      { name: 'Antecedentes penales', required: true },
    ],
    hitosProyectados: ['Consulta', 'Documentación', 'Demanda', 'Audiencia', 'Prueba', 'Homologación'],
    bloqueantesTipicos: ['Falta inscripción en registro de adoptantes', 'Informes pendientes'],
    proximaAccionSugerida: 'Clasificar tipo de adopción',
    fechaSeguimientoSugeridaDays: 7,
    prioridadSugerida: 'Alta',
  },

  // ═══════════════════════════════════════════════════════════
  // LABORAL
  // ═══════════════════════════════════════════════════════════

  {
    id: 'lab-despido',
    name: 'Despido',
    rama: 'Laboral',
    subtipo: 'Despido',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Reclamo por despido sin causa o con causa controvertida.',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Verificar fecha de ingreso y categoría', priority: 'crítico', bloqueante: true },
          { task: 'Validar recibos de sueldo (últimos 12 meses)', priority: 'crítico', bloqueante: true },
          { task: 'Calcular liquidación final', priority: 'crítico', bloqueante: true },
          { task: 'Redactar y enviar TCL de intimación', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Recibos de sueldo (últimos 12)', required: true },
          { name: 'Certificado de servicios (Art. 80)', required: true },
          { name: 'Telegrama de despido', required: true },
          { name: 'DNI del trabajador', required: true },
        ],
        milestone: 'Intimación enviada',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Agotar instancia SECLO', priority: 'crítico', bloqueante: true },
          { task: 'Redactar demanda laboral', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda en juzgado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia SECLO (cierre sin acuerdo)', required: true },
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación detallada', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia de conciliación', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar propuesta de acuerdo si la hay', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Audiencia SECLO / conciliación',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia laboral', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recurso si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Iniciar ejecución de sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Verificar cobro', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Verificar fecha de ingreso', priority: 'crítico' },
      { task: 'Validar recibos de sueldo', priority: 'crítico' },
      { task: 'Cálculo de liquidación', priority: 'crítico' },
      { task: 'Enviar TCL de intimación', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'Recibos de sueldo (últimos 12)', required: true },
      { name: 'Certificado de servicios', required: true },
      { name: 'Telegrama de despido', required: true },
      { name: 'DNI del trabajador', required: true },
    ],
    hitosProyectados: ['Intimación', 'SECLO', 'Demanda', 'Audiencia', 'Sentencia'],
    bloqueantesTipicos: ['Faltan recibos de sueldo', 'SECLO sin cerrar'],
    proximaAccionSugerida: 'Redactar TCL de intimación',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
  },

  // ═══════════════════════════════════════════════════════════
  // DAÑOS
  // ═══════════════════════════════════════════════════════════

  {
    id: 'dan-accidente-transito',
    name: 'Accidente de tránsito',
    rama: 'Daños',
    subtipo: 'Accidente de tránsito',
    jurisdiccion: 'CABA',
    via: 'Mediación / Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Reclamo por daños y perjuicios derivados de accidente vial.',
    stages: [
      {
        name: 'Inicio',
        tasks: [
          { task: 'Recopilar denuncia y fotos del siniestro', priority: 'crítico', bloqueante: true },
          { task: 'Obtener presupuestos de reparación', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar historia clínica si hay lesiones', priority: 'recomendado' },
          { task: 'Verificar póliza de seguro de ambas partes', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Denuncia del siniestro', required: true },
          { name: 'Fotos del accidente', required: true },
          { name: 'Presupuestos de reparación', required: true },
          { name: 'Título automotor', required: true },
          { name: 'Póliza de seguro', required: false },
          { name: 'Historia clínica', required: false },
        ],
        milestone: 'Documentación del siniestro completa',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Agotar mediación obligatoria', priority: 'crítico', bloqueante: true },
          { task: 'Redactar demanda de daños', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de mediación', required: true },
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Coordinar pericias (mecánica, médica)', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Pericias realizadas',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recurso si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Ejecutar sentencia contra seguro o particular', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Denuncia del siniestro', priority: 'crítico' },
      { task: 'Fotos del siniestro', priority: 'crítico' },
      { task: 'Presupuestos de reparación', priority: 'crítico' },
      { task: 'Historia clínica', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Título automotor', required: true },
      { name: 'Licencia de conducir', required: true },
      { name: 'Póliza de seguro', required: true },
      { name: 'Fotos y videos', required: true },
    ],
    hitosProyectados: ['Documentación', 'Mediación', 'Demanda', 'Pericias', 'Sentencia'],
    bloqueantesTipicos: ['Faltan presupuestos', 'Mediación pendiente'],
    proximaAccionSugerida: 'Solicitar presupuestos de reparación',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  // ═══════════════════════════════════════════════════════════
  // COMERCIAL
  // ═══════════════════════════════════════════════════════════

  {
    id: 'com-incumplimiento',
    name: 'Incumplimiento contractual',
    rama: 'Comercial',
    subtipo: 'Incumplimiento contractual',
    jurisdiccion: 'CABA',
    via: 'Mediación / Ordinaria',
    etapaInicial: 'Análisis',
    descripcion: 'Reclamo por incumplimiento de contrato y anexos.',
    stages: [
      {
        name: 'Análisis',
        tasks: [
          { task: 'Revisar contrato y anexos', priority: 'crítico', bloqueante: true },
          { task: 'Identificar cláusula incumplida', priority: 'crítico', bloqueante: true },
          { task: 'Verificar intimación previa', priority: 'recomendado' },
          { task: 'Cuantificar perjuicio inicial', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Contrato firmado', required: true },
          { name: 'Anexos contractuales', required: true },
          { name: 'Facturas adeudadas', required: true },
          { name: 'Intercambio por mail o WhatsApp', required: false },
        ],
        milestone: 'Análisis contractual completo',
      },
      {
        name: 'Intimación / Negociación',
        tasks: [
          { task: 'Redactar carta documento de intimación', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar propuesta de acuerdo', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Carta documento', required: true },
        ],
        milestone: 'Intimación cursada',
      },
      {
        name: 'Mediación',
        tasks: [
          { task: 'Agotar mediación obligatoria', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de mediación', required: true },
        ],
        milestone: 'Mediación agotada',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda', priority: 'crítico', bloqueante: true },
          { task: 'Presentar en juzgado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
    ],
    checklistBase: [
      { task: 'Revisar contrato y anexos', priority: 'crítico' },
      { task: 'Identificar cláusula incumplida', priority: 'crítico' },
      { task: 'Verificar intimación previa', priority: 'recomendado' },
      { task: 'Cuantificar perjuicio inicial', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Contrato firmado', required: true },
      { name: 'Anexos contractuales', required: true },
      { name: 'Facturas adeudadas', required: true },
      { name: 'Intercambio por mail o WhatsApp', required: false },
    ],
    hitosProyectados: ['Análisis contractual', 'Intimación / negociación', 'Mediación o instancia previa', 'Demanda'],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Revisar contrato y anexos',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Media',
  },

  {
    id: 'com-cobro-ejecutivo',
    name: 'Cobro ejecutivo',
    rama: 'Comercial',
    subtipo: 'Cobro ejecutivo',
    jurisdiccion: 'CABA',
    via: 'Ejecutiva',
    etapaInicial: 'Preparación',
    descripcion: 'Cobro de sumas de dinero por vía ejecutiva.',
    stages: [
      {
        name: 'Preparación',
        tasks: [
          { task: 'Verificar título ejecutivo', priority: 'crítico', bloqueante: true },
          { task: 'Confirmar monto reclamable', priority: 'crítico', bloqueante: true },
          { task: 'Validar personería', priority: 'recomendado' },
          { task: 'Identificar domicilio del demandado', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Pagaré / cheque / título ejecutivo', required: true },
          { name: 'Liquidación del monto', required: true },
          { name: 'Poder', required: true },
          { name: 'Constancia de intimación si existe', required: false },
        ],
        milestone: 'Título verificado',
      },
      {
        name: 'Presentación ejecutiva',
        tasks: [
          { task: 'Redactar demanda ejecutiva', priority: 'crítico', bloqueante: true },
          { task: 'Presentar en juzgado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda ejecutiva', required: true },
        ],
        milestone: 'Demanda ejecutiva presentada',
      },
      {
        name: 'Mandamiento / Intimación',
        tasks: [
          { task: 'Verificar libramiento de mandamiento', priority: 'crítico', bloqueante: true },
          { task: 'Coordinar diligenciamiento', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Mandamiento librado',
      },
      {
        name: 'Embargo / Ejecución',
        tasks: [
          { task: 'Trabar embargo sobre bienes', priority: 'crítico', bloqueante: true },
          { task: 'Coordinar remate si corresponde', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Verificar título ejecutivo', priority: 'crítico' },
      { task: 'Confirmar monto reclamable', priority: 'crítico' },
      { task: 'Validar personería', priority: 'recomendado' },
      { task: 'Identificar domicilio del demandado', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Pagaré / cheque / título ejecutivo', required: true },
      { name: 'Liquidación del monto', required: true },
      { name: 'Poder', required: true },
      { name: 'Constancia de intimación si existe', required: false },
    ],
    hitosProyectados: ['Preparación de demanda', 'Presentación ejecutiva', 'Mandamiento / intimación', 'Embargo / ejecución'],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Verificar título ejecutivo',
    fechaSeguimientoSugeridaDays: 2,
    prioridadSugerida: 'Alta',
  },

  {
    id: 'com-ejecucion-cheque',
    name: 'Ejecución de cheque o pagaré',
    rama: 'Comercial',
    subtipo: 'Ejecución de cheque o pagaré',
    jurisdiccion: 'CABA',
    via: 'Ejecutiva',
    etapaInicial: 'Revisión',
    descripcion: 'Ejecución de títulos valores.',
    stages: [
      {
        name: 'Revisión',
        tasks: [
          { task: 'Validar ejecutabilidad del título', priority: 'crítico', bloqueante: true },
          { task: 'Identificar firmantes', priority: 'crítico', bloqueante: true },
          { task: 'Calcular capital e intereses', priority: 'recomendado' },
          { task: 'Confirmar estrategia de cobro', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Cheque o pagaré original', required: true },
          { name: 'Liquidación', required: true },
          { name: 'Poder', required: true },
          { name: 'Datos del librador / firmante', required: false },
        ],
        milestone: 'Título validado',
      },
      {
        name: 'Demanda ejecutiva',
        tasks: [
          { task: 'Redactar demanda ejecutiva', priority: 'crítico', bloqueante: true },
          { task: 'Presentar en juzgado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Embargo',
        tasks: [
          { task: 'Trabar embargo', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Embargo trabado',
      },
      {
        name: 'Cobro / Acuerdo',
        tasks: [
          { task: 'Coordinar cobro o acuerdo de pago', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Cobro realizado',
      },
    ],
    checklistBase: [
      { task: 'Validar ejecutabilidad del título', priority: 'crítico' },
      { task: 'Identificar firmantes', priority: 'crítico' },
      { task: 'Calcular capital e intereses', priority: 'recomendado' },
      { task: 'Confirmar estrategia de cobro', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Cheque o pagaré original', required: true },
      { name: 'Liquidación', required: true },
      { name: 'Poder', required: true },
      { name: 'Datos del librador / firmante', required: false },
    ],
    hitosProyectados: ['Revisión del título', 'Demanda ejecutiva', 'Embargo', 'Cobro / acuerdo'],
    bloqueantesTipicos: [],
    proximaAccionSugerida: 'Validar ejecutabilidad del título',
    fechaSeguimientoSugeridaDays: 2,
    prioridadSugerida: 'Alta',
  },

  // ═══════════════════════════════════════════════════════════
  // SUCESIONES
  // ═══════════════════════════════════════════════════════════

  {
    id: 'suc-ab-intestato',
    name: 'Sucesión ab-intestato',
    rama: 'Sucesiones',
    subtipo: 'Ab-intestato',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Apertura',
    descripcion: 'Sucesión sin testamento.',
    stages: [
      {
        name: 'Apertura',
        tasks: [
          { task: 'Recopilar partida de defunción y partidas de herederos', priority: 'crítico', bloqueante: true },
          { task: 'Identificar bienes del acervo hereditario', priority: 'crítico', bloqueante: true },
          { task: 'Obtener valuación fiscal de inmuebles', priority: 'recomendado' },
          { task: 'Presentar apertura del sucesorio', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Acta de defunción', required: true },
          { name: 'Partidas de nacimiento de herederos', required: true },
          { name: 'Títulos de propiedad', required: true },
          { name: 'Certificado de inhibiciones', required: false },
        ],
        milestone: 'Sucesorio abierto',
      },
      {
        name: 'Publicación de edictos',
        tasks: [
          { task: 'Publicar edictos en Boletín Oficial', priority: 'crítico', bloqueante: true },
          { task: 'Esperar plazo de publicación (30 días)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de publicación de edictos', required: true },
        ],
        milestone: 'Edictos publicados y vencidos',
      },
      {
        name: 'Declaratoria de herederos',
        tasks: [
          { task: 'Solicitar declaratoria de herederos', priority: 'crítico', bloqueante: true },
          { task: 'Verificar auto de declaratoria', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Auto de declaratoria', required: true },
        ],
        milestone: 'Declaratoria dictada',
      },
      {
        name: 'Inscripción de bienes',
        tasks: [
          { task: 'Preparar tracto abreviado de cada inmueble', priority: 'crítico', bloqueante: true },
          { task: 'Inscribir bienes en registros correspondientes', priority: 'crítico', bloqueante: true },
          { task: 'Archivar expediente', priority: 'opcional' },
        ],
        documents: [
          { name: 'Tracto abreviado', required: true },
          { name: 'Constancia de inscripción registral', required: true },
        ],
        milestone: 'Bienes inscriptos',
      },
    ],
    checklistBase: [
      { task: 'Partida de defunción', priority: 'crítico' },
      { task: 'Títulos de bienes', priority: 'crítico' },
      { task: 'Listado de herederos', priority: 'crítico' },
      { task: 'Valuación fiscal', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Acta de defunción', required: true },
      { name: 'Títulos de propiedad', required: true },
      { name: 'Partidas de nacimiento herederos', required: true },
      { name: 'Testamento (si hay)', required: false },
    ],
    hitosProyectados: ['Apertura Sucesorio', 'Publicación Edictos', 'Declaratoria Herederos', 'Inscripción Bienes'],
    bloqueantesTipicos: ['Falta partida de defunción', 'Herederos no ubicados'],
    proximaAccionSugerida: 'Solicitar informe de anotaciones personales',
    fechaSeguimientoSugeridaDays: 7,
    prioridadSugerida: 'Media',
  },
];

/** Find template by rama + subtipo (case-insensitive partial match) */
export function findTemplate(rama: string, subtipo?: string): MatterTemplate | undefined {
  if (subtipo) {
    const sub = subtipo.toLowerCase();
    const match = MATTER_TEMPLATES.find(
      t => t.rama === rama && t.subtipo.toLowerCase().includes(sub)
    );
    if (match) return match;
  }
  // Fallback: first template for that rama
  return MATTER_TEMPLATES.find(t => t.rama === rama);
}

/** Subtypes available per matter type, derived from templates */
export const SUBTYPES_BY_TYPE: Record<string, { value: string; label: string }[]> =
  MATTER_TEMPLATES.reduce((acc, t) => {
    if (!acc[t.rama]) acc[t.rama] = [];
    if (!acc[t.rama].find(s => s.value === t.subtipo)) {
      acc[t.rama].push({ value: t.subtipo, label: t.name });
    }
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);

/* ═══════════════════════════════════════════════════════════
   WIZARD FIELDS — Campos específicos por materia
   Cada template puede definir secciones de datos que se piden
   en el wizard de alta según la materia seleccionada.
   ═══════════════════════════════════════════════════════════ */

export interface WizardFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'textarea';
  placeholder?: string;
  options?: string[];      // for select type
  required?: boolean;
}

export interface WizardSection {
  title: string;
  icon: string;  // lucide icon name
  fields: WizardFieldDef[];
}

export const WIZARD_FIELDS_BY_TEMPLATE: Record<string, WizardSection[]> = {
  'fam-divorcio': [
    {
      title: 'Datos del Cónyuge (Cliente)',
      icon: 'User',
      fields: [
        { key: 'conyuge1_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Nombre del cónyuge cliente', required: true },
        { key: 'conyuge1_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'conyuge1_domicilio', label: 'Domicilio actual', type: 'text', placeholder: 'Dirección...' },
      ],
    },
    {
      title: 'Datos del Otro Cónyuge',
      icon: 'UserPlus',
      fields: [
        { key: 'conyuge2_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Nombre del otro cónyuge', required: true },
        { key: 'conyuge2_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'conyuge2_domicilio', label: 'Domicilio actual', type: 'text', placeholder: 'Dirección...' },
        { key: 'conyuge2_abogado', label: 'Abogado de la otra parte', type: 'text', placeholder: 'Si se conoce...' },
      ],
    },
    {
      title: 'Datos del Matrimonio',
      icon: 'Calendar',
      fields: [
        { key: 'fecha_matrimonio', label: 'Fecha de matrimonio', type: 'date', required: true },
        { key: 'registro_civil', label: 'Registro Civil donde se celebró', type: 'text', placeholder: 'Ej: RC Nº 5 CABA' },
        { key: 'tipo_divorcio', label: 'Tipo de divorcio', type: 'select', options: ['Unilateral', 'De común acuerdo'], required: true },
        { key: 'hijos_menores', label: 'Cantidad de hijos menores', type: 'number', placeholder: '0' },
        { key: 'bienes_gananciales', label: '¿Hay bienes gananciales a liquidar?', type: 'select', options: ['Sí', 'No', 'Por determinar'] },
      ],
    },
  ],

  'fam-alimentos': [
    {
      title: 'Datos del Alimentado (hijo/a)',
      icon: 'User',
      fields: [
        { key: 'hijo_nombre', label: 'Nombre completo del hijo/a', type: 'text', placeholder: 'Nombre completo', required: true },
        { key: 'hijo_dni', label: 'DNI del hijo/a', type: 'text', placeholder: '12.345.678' },
        { key: 'hijo_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
        { key: 'hijo_escolaridad', label: 'Escolaridad', type: 'select', options: ['Jardín', 'Primaria', 'Secundaria', 'Universidad', 'No escolarizado'] },
        { key: 'hijo_cobertura_medica', label: 'Cobertura médica', type: 'text', placeholder: 'Obra social / prepaga...' },
      ],
    },
    {
      title: 'Datos del Progenitor Alimentante',
      icon: 'UserPlus',
      fields: [
        { key: 'alimentante_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Nombre del alimentante', required: true },
        { key: 'alimentante_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'alimentante_domicilio', label: 'Domicilio conocido', type: 'text', placeholder: 'Dirección...' },
        { key: 'alimentante_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Empresa o actividad independiente' },
        { key: 'alimentante_ingreso_estimado', label: 'Ingreso mensual estimado', type: 'text', placeholder: '$...' },
      ],
    },
    {
      title: 'Situación Actual',
      icon: 'FileText',
      fields: [
        { key: 'tipo_alimentos', label: 'Tipo de alimentos', type: 'select', options: ['Para hijos menores', 'Para hijos mayores (hasta 25)', 'Para cónyuge', 'Para parientes'], required: true },
        { key: 'paga_actualmente', label: '¿Paga algo actualmente?', type: 'select', options: ['Sí, cuota regular', 'Sí, montos irregulares', 'No paga nada'] },
        { key: 'monto_actual', label: 'Monto actual (si paga)', type: 'text', placeholder: '$...' },
        { key: 'gastos_mensuales', label: 'Total de gastos mensuales del menor', type: 'text', placeholder: '$...' },
      ],
    },
  ],

  'fam-cuidado': [
    {
      title: 'Datos del Niño/a',
      icon: 'User',
      fields: [
        { key: 'nino_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'nino_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'nino_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
        { key: 'nino_escolaridad', label: 'Escuela / Nivel', type: 'text', placeholder: 'Nombre y nivel...' },
        { key: 'nino_centro_vida', label: 'Centro de vida actual', type: 'text', placeholder: 'Con quién vive y dónde...' },
      ],
    },
    {
      title: 'Datos del Otro Progenitor',
      icon: 'UserPlus',
      fields: [
        { key: 'otro_progenitor_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'otro_progenitor_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'otro_progenitor_domicilio', label: 'Domicilio', type: 'text' },
      ],
    },
    {
      title: 'Régimen Pretendido',
      icon: 'FileText',
      fields: [
        { key: 'regimen_actual', label: 'Convivencia actual', type: 'select', options: ['Vive con cliente', 'Vive con el otro progenitor', 'Alternado informal', 'Sin contacto'] },
        { key: 'regimen_pretendido', label: 'Régimen pretendido', type: 'select', options: ['Cuidado compartido alternado', 'Cuidado compartido indistinto', 'Cuidado unipersonal (a favor del cliente)'], required: true },
      ],
    },
  ],

  'fam-comunicacion': [
    {
      title: 'Datos del Niño/a',
      icon: 'User',
      fields: [
        { key: 'nino_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'nino_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
        { key: 'nino_escolaridad', label: 'Escuela / Nivel', type: 'text' },
      ],
    },
    {
      title: 'Datos del Otro Progenitor',
      icon: 'UserPlus',
      fields: [
        { key: 'otro_progenitor_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'otro_progenitor_domicilio', label: 'Domicilio', type: 'text' },
        { key: 'distancia_domicilios', label: 'Distancia entre domicilios', type: 'select', options: ['Misma ciudad', 'Otra ciudad cercana', 'Otra provincia', 'Otro país'] },
      ],
    },
    {
      title: 'Régimen Comunicacional',
      icon: 'Calendar',
      fields: [
        { key: 'regimen_actual', label: 'Régimen actual', type: 'select', options: ['Visitas regulares', 'Visitas esporádicas', 'Sin contacto', 'Impedimento de contacto'] },
        { key: 'frecuencia_pretendida', label: 'Frecuencia pretendida', type: 'text', placeholder: 'Ej: fines de semana alternados + miércoles...' },
      ],
    },
  ],

  'fam-filiacion': [
    {
      title: 'Datos de la Persona a Reconocer/Filiar',
      icon: 'User',
      fields: [
        { key: 'persona_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'persona_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date', required: true },
        { key: 'persona_dni', label: 'DNI', type: 'text' },
      ],
    },
    {
      title: 'Datos del Presunto Progenitor',
      icon: 'UserPlus',
      fields: [
        { key: 'progenitor_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'progenitor_dni', label: 'DNI', type: 'text' },
        { key: 'progenitor_domicilio', label: 'Domicilio conocido', type: 'text' },
      ],
    },
    {
      title: 'Tipo de Filiación',
      icon: 'FileText',
      fields: [
        { key: 'tipo_filiacion', label: 'Acción', type: 'select', options: ['Reconocimiento voluntario', 'Reclamación de filiación', 'Impugnación de filiación'], required: true },
        { key: 'adn_previo', label: '¿Hay prueba de ADN previa?', type: 'select', options: ['Sí', 'No'] },
      ],
    },
  ],

  'fam-proteccion-urgente': [
    {
      title: 'Datos de la Víctima',
      icon: 'User',
      fields: [
        { key: 'victima_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'victima_dni', label: 'DNI', type: 'text', required: true },
        { key: 'victima_domicilio', label: 'Domicilio actual', type: 'text', required: true },
        { key: 'victima_telefono', label: 'Teléfono de contacto', type: 'text', required: true },
        { key: 'menores_convivientes', label: 'Menores convivientes (cantidad)', type: 'number', placeholder: '0' },
      ],
    },
    {
      title: 'Datos del Agresor',
      icon: 'UserPlus',
      fields: [
        { key: 'agresor_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'agresor_dni', label: 'DNI', type: 'text' },
        { key: 'agresor_domicilio', label: 'Domicilio', type: 'text' },
        { key: 'vinculo', label: 'Vínculo con la víctima', type: 'select', options: ['Cónyuge', 'Ex-cónyuge', 'Conviviente', 'Ex-conviviente', 'Novio/a', 'Progenitor', 'Otro familiar'], required: true },
      ],
    },
    {
      title: 'Situación de Riesgo',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_violencia', label: 'Tipo de violencia', type: 'select', options: ['Física', 'Psicológica', 'Sexual', 'Económica', 'Simbólica', 'Múltiple'], required: true },
        { key: 'denuncia_policial', label: '¿Hay denuncia policial?', type: 'select', options: ['Sí', 'No', 'En trámite'] },
        { key: 'medida_vigente', label: '¿Hay medida vigente?', type: 'select', options: ['Sí', 'No'] },
        { key: 'riesgo_descripcion', label: 'Descripción de la situación', type: 'textarea', placeholder: 'Resumen breve de la situación de riesgo...', required: true },
      ],
    },
  ],

  'fam-adopcion': [
    {
      title: 'Datos del/los Adoptante/s',
      icon: 'User',
      fields: [
        { key: 'adoptante_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'adoptante_dni', label: 'DNI', type: 'text', required: true },
        { key: 'adoptante_domicilio', label: 'Domicilio', type: 'text', required: true },
        { key: 'adoptante_estado_civil', label: 'Estado civil', type: 'select', options: ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión convivencial'] },
      ],
    },
    {
      title: 'Datos del Niño/a (si se conocen)',
      icon: 'UserPlus',
      fields: [
        { key: 'nino_nombre', label: 'Nombre (si se conoce)', type: 'text' },
        { key: 'nino_edad', label: 'Edad', type: 'text' },
        { key: 'nino_situacion', label: 'Situación actual', type: 'text', placeholder: 'Hogar, familia sustituta...' },
      ],
    },
    {
      title: 'Estado del Proceso',
      icon: 'FileText',
      fields: [
        { key: 'tipo_adopcion', label: 'Tipo de adopción', type: 'select', options: ['Adopción plena', 'Adopción simple', 'Adopción de integración'], required: true },
        { key: 'inscrito_registro', label: '¿Inscripto en registro de adoptantes?', type: 'select', options: ['Sí', 'No', 'En trámite'], required: true },
        { key: 'nro_registro', label: 'Nro. de registro (si aplica)', type: 'text' },
      ],
    },
  ],

  'lab-despido': [
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'text' },
        { key: 'categoria', label: 'Categoría laboral', type: 'text', placeholder: 'Según CCT...' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio legal', type: 'text' },
        { key: 'empleador_actividad', label: 'Actividad', type: 'text' },
      ],
    },
    {
      title: 'Datos de la Relación Laboral',
      icon: 'Briefcase',
      fields: [
        { key: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', required: true },
        { key: 'fecha_egreso', label: 'Fecha de egreso', type: 'date', required: true },
        { key: 'tipo_despido', label: 'Tipo de despido', type: 'select', options: ['Sin causa', 'Con causa (injustificada)', 'Indirecto', 'Mutuo acuerdo (art. 241)', 'Renuncia forzada'], required: true },
        { key: 'remuneracion', label: 'Última remuneración bruta', type: 'text', placeholder: '$...' },
        { key: 'registrado', label: '¿Estaba registrado?', type: 'select', options: ['Sí, correctamente', 'Parcialmente (fecha o sueldo adulterado)', 'No registrado (en negro)'] },
        { key: 'cct', label: 'Convenio colectivo', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
  ],

  'dan-accidente-transito': [
    {
      title: 'Datos de la Víctima',
      icon: 'User',
      fields: [
        { key: 'victima_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'victima_dni', label: 'DNI', type: 'text', required: true },
        { key: 'victima_rol', label: 'Rol en el accidente', type: 'select', options: ['Conductor', 'Acompañante', 'Peatón', 'Ciclista', 'Motociclista'], required: true },
      ],
    },
    {
      title: 'Datos del Responsable / Aseguradora',
      icon: 'Building2',
      fields: [
        { key: 'responsable_nombre', label: 'Nombre del responsable', type: 'text' },
        { key: 'responsable_patente', label: 'Patente del vehículo', type: 'text', placeholder: 'ABC 123' },
        { key: 'aseguradora', label: 'Aseguradora', type: 'text', placeholder: 'Nombre de la compañía...' },
        { key: 'nro_siniestro', label: 'Nro. de siniestro', type: 'text' },
      ],
    },
    {
      title: 'Datos del Accidente',
      icon: 'AlertCircle',
      fields: [
        { key: 'fecha_accidente', label: 'Fecha del accidente', type: 'date', required: true },
        { key: 'lugar_accidente', label: 'Lugar', type: 'text', placeholder: 'Intersección / dirección...' },
        { key: 'lesiones', label: 'Lesiones sufridas', type: 'textarea', placeholder: 'Descripción de lesiones...' },
        { key: 'denuncia_policial', label: '¿Hay denuncia/exposición policial?', type: 'select', options: ['Sí', 'No'] },
      ],
    },
  ],

  'com-incumplimiento': [
    {
      title: 'Datos de la Contraparte',
      icon: 'Building2',
      fields: [
        { key: 'contraparte_nombre', label: 'Nombre / Razón social', type: 'text', required: true },
        { key: 'contraparte_cuit', label: 'CUIT', type: 'text' },
        { key: 'contraparte_domicilio', label: 'Domicilio', type: 'text' },
      ],
    },
    {
      title: 'Datos del Contrato',
      icon: 'FileText',
      fields: [
        { key: 'tipo_contrato', label: 'Tipo de contrato', type: 'text', placeholder: 'Ej: Compraventa, Locación, Servicios...', required: true },
        { key: 'fecha_contrato', label: 'Fecha del contrato', type: 'date' },
        { key: 'objeto_contrato', label: 'Objeto del contrato', type: 'textarea', placeholder: 'Breve descripción de lo pactado...' },
        { key: 'monto_reclamado', label: 'Monto reclamado estimado', type: 'text', placeholder: '$...' },
      ],
    },
  ],

  'com-cobro-ejecutivo': [
    {
      title: 'Datos del Deudor',
      icon: 'Building2',
      fields: [
        { key: 'deudor_nombre', label: 'Nombre / Razón social', type: 'text', required: true },
        { key: 'deudor_cuit', label: 'CUIT/DNI', type: 'text' },
        { key: 'deudor_domicilio', label: 'Domicilio', type: 'text' },
      ],
    },
    {
      title: 'Datos del Título Ejecutivo',
      icon: 'FileText',
      fields: [
        { key: 'tipo_titulo', label: 'Tipo de título', type: 'select', options: ['Pagaré', 'Cheque', 'Factura conformada', 'Contrato con cláusula ejecutiva', 'Otro'], required: true },
        { key: 'monto_capital', label: 'Monto de capital', type: 'text', placeholder: '$...', required: true },
        { key: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'date' },
        { key: 'moneda', label: 'Moneda', type: 'select', options: ['Pesos (ARS)', 'Dólares (USD)'] },
      ],
    },
  ],

  'com-ejecucion-cheque': [
    {
      title: 'Datos del Librador',
      icon: 'Building2',
      fields: [
        { key: 'librador_nombre', label: 'Nombre / Razón social', type: 'text', required: true },
        { key: 'librador_cuit', label: 'CUIT/DNI', type: 'text' },
        { key: 'librador_domicilio', label: 'Domicilio', type: 'text' },
      ],
    },
    {
      title: 'Datos del Cheque',
      icon: 'FileText',
      fields: [
        { key: 'nro_cheque', label: 'Número de cheque', type: 'text', required: true },
        { key: 'banco_girado', label: 'Banco girado', type: 'text', required: true },
        { key: 'monto_cheque', label: 'Monto', type: 'text', placeholder: '$...', required: true },
        { key: 'fecha_cheque', label: 'Fecha del cheque', type: 'date' },
        { key: 'motivo_rechazo', label: 'Motivo de rechazo', type: 'select', options: ['Sin fondos', 'Cuenta cerrada', 'Firma diferente', 'Denuncia de extravío', 'Otro'] },
      ],
    },
  ],

  'suc-ab-intestato': [
    {
      title: 'Datos del Causante',
      icon: 'User',
      fields: [
        { key: 'causante_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'causante_dni', label: 'DNI', type: 'text', required: true },
        { key: 'causante_fecha_fallecimiento', label: 'Fecha de fallecimiento', type: 'date', required: true },
        { key: 'causante_ultimo_domicilio', label: 'Último domicilio', type: 'text', required: true },
      ],
    },
    {
      title: 'Herederos Conocidos',
      icon: 'UserPlus',
      fields: [
        { key: 'herederos_descripcion', label: 'Herederos conocidos', type: 'textarea', placeholder: 'Nombre, vínculo y DNI de cada heredero...', required: true },
        { key: 'conyuge_superstite', label: '¿Hay cónyuge supérstite?', type: 'select', options: ['Sí', 'No'] },
      ],
    },
    {
      title: 'Bienes del Acervo',
      icon: 'Building2',
      fields: [
        { key: 'bienes_inmuebles', label: 'Bienes inmuebles', type: 'textarea', placeholder: 'Descripción de inmuebles (dirección, matrícula)...' },
        { key: 'bienes_muebles', label: 'Bienes muebles / registrables', type: 'textarea', placeholder: 'Vehículos, cuentas bancarias, inversiones...' },
        { key: 'deudas_conocidas', label: 'Deudas conocidas', type: 'textarea', placeholder: 'Si hay deudas...' },
      ],
    },
  ],
};
