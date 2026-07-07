import { MatterTemplate } from '../types';

export const MATTER_TEMPLATES: MatterTemplate[] = [
  // ═══════════════════════════════════════════════════════════
  // FAMILIA
  // ═══════════════════════════════════════════════════════════

  {
    // ═══════════════════════════════════════════════════════════
    // DIVORCIO — CABA (Juzgado Nacional en lo Civil)
    // Art. 437-438 CCyCN. Divorcio incausado.
    // CABA: no hay Consejero de Familia. Mediación de cuestiones
    // conexas por Ley 26.589 (el divorcio en sí está excluido).
    // Bilateral: presentación conjunta con convenio → audiencia
    //   art. 438 (formalidad) → homologación → sentencia rápida.
    // Unilateral: demanda + traslado + contestación/contrapropuesta
    //   + audiencia art. 438 negociación + sentencia.
    // ═══════════════════════════════════════════════════════════
    id: 'fam-divorcio',
    name: 'Divorcio (CABA)',
    rama: 'Familia',
    subtipo: 'Divorcio',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Divorcio ante Juzgado Nacional en lo Civil (CABA). Flujo adaptativo según tipo: bilateral (presentación conjunta) o unilateral (demanda con traslado).',
    stages: [
      // ── ETAPA 1: INICIO ──────────────────────────────────────
      {
        name: 'Inicio',
        tasks: [
          {
            task: 'Verificar datos del matrimonio (fecha, hijos, bienes)',
            priority: 'crítico',
            bloqueante: true,
            satisfiedBy: [
              { key: 'fecha_matrimonio', label: 'Fecha de matrimonio' },
              { key: 'registro_civil', label: 'Registro Civil' },
              { key: 'acta_numero', label: 'Acta N°' },
              { key: 'hijos_menores', label: 'Hijos menores' },
              { key: 'bienes_gananciales', label: 'Bienes gananciales' },
            ],
          },
          {
            // Si el alta se hizo con tipo_divorcio = 'Por definir' (caso típico:
            // todavía no se sabe si la contraparte va a firmar conjunto), la
            // tarea sigue pendiente hasta que se decida — el sentinel NO la
            // auto-completa.
            task: 'Determinar si es unilateral o de común acuerdo',
            priority: 'crítico',
            bloqueante: true,
            autoCompleteIf: { key: 'tipo_divorcio', excludeValues: ['Por definir'] },
          },
          {
            task: 'Verificar datos personales de ambos cónyuges',
            priority: 'crítico',
            bloqueante: true,
            satisfiedBy: [
              { key: 'conyuge1_nombre', label: 'Nombre cónyuge 1' },
              { key: 'conyuge1_dni', label: 'DNI cónyuge 1' },
              { key: 'conyuge1_domicilio', label: 'Domicilio cónyuge 1' },
              { key: 'conyuge2_nombre', label: 'Nombre cónyuge 2' },
              { key: 'conyuge2_dni', label: 'DNI cónyuge 2' },
              { key: 'conyuge2_domicilio', label: 'Domicilio cónyuge 2' },
            ],
          },
          { task: 'Evaluar existencia de convenio regulador previo', priority: 'recomendado' },
          {
            task: 'Identificar bienes gananciales y propios',
            priority: 'recomendado',
            satisfiedBy: [
              { key: 'bienes_gananciales', label: 'Bienes gananciales' },
              { key: 'regimen_patrimonial', label: 'Régimen patrimonial' },
            ],
          },
          {
            // GAP UX-31: prompt explícito en la etapa de instrucción para
            // que el abogado evalúe pedir cautelares preventivas. La señal
            // automática vive en lib/cautelaresSugeridas.ts (banner cuando
            // hay pasivo grande de la contraparte sin cautelar), pero la
            // tarea aparece siempre porque la decisión es contextual y
            // exige análisis activo aunque no haya señales obvias.
            task: 'Evaluar cautelares patrimoniales preventivas (inhibición general, embargo) si hay señales de vaciamiento — préstamos nuevos de la contraparte, transferencias, sociedades opacas, etc.',
            priority: 'recomendado',
          },
          {
            task: 'Evaluar urgencia por violencia familiar',
            priority: 'crítico',
            bloqueante: true,
            autoCompleteIf: { key: 'hay_urgencia' },
            satisfiedBy: [
              { key: 'hay_urgencia', label: 'Hay urgencia/violencia' },
            ],
          },
        ],
        documents: [
          { name: 'Acta de matrimonio (actualizada)', required: true },
          { name: 'DNI de ambas partes', required: true },
          { name: 'Partidas de nacimiento de hijos menores', required: true },
          { name: 'Constancia de domicilio', required: false },
          { name: 'Títulos de propiedad de bienes', required: false },
        ],
        milestone: 'Instrucción completa',
        fichaTitle: 'Instrucción del Caso',
        fichaFields: [
          {
            title: 'Datos del Matrimonio',
            icon: 'Calendar',
            fields: [
              { key: 'registro_civil', label: 'Registro Civil', type: 'text', placeholder: 'Ej: Registro Civil de CABA' },
              { key: 'registro_civil_circunscripcion', label: 'Circunscripción', type: 'text', placeholder: 'Ej: 7ª' },
              { key: 'acta_numero', label: 'Acta N°', type: 'text', placeholder: 'Ej: 234' },
              { key: 'acta_tomo', label: 'Tomo', type: 'text', placeholder: 'Ej: 2B' },
              { key: 'regimen_patrimonial', label: 'Régimen patrimonial', type: 'select', options: ['Comunidad de ganancias', 'Separación de bienes', 'Sin convención matrimonial'] },
              { key: 'fecha_separacion_hecho', label: 'Fecha de separación de hecho', type: 'date' },
            ],
          },
          {
            title: 'Hijos en Común',
            icon: 'User',
            fields: [
              {
                key: 'hijos_panel_info',
                label: 'Hijos del caso',
                type: 'info',
                tone: 'info',
                body: 'Los datos de cada hijo (incluyendo discapacidad, terapias y régimen propio) se gestionan en el tab "Hijos" del caso. Allí cargás, editás y ves alertas automáticas de cumple 18.',
              },
            ],
          },
          {
            title: 'Datos Laborales — Cónyuge 1 (Cliente)',
            icon: 'Briefcase',
            fields: [
              { key: 'conyuge1_nacionalidad', label: 'Nacionalidad', type: 'text', placeholder: 'Argentina' },
              { key: 'conyuge1_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
              { key: 'conyuge1_profesion', label: 'Profesión / Ocupación', type: 'text', placeholder: 'Ej: Ingeniero en sistemas' },
              { key: 'conyuge1_situacion_laboral', label: 'Situación laboral', type: 'select', options: ['Empleado en relación de dependencia', 'Monotributista', 'Autónomo', 'Desempleado', 'Jubilado/Pensionado', 'Otro'] },
              { key: 'conyuge1_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Nombre de empresa o actividad' },
              { key: 'conyuge1_ingreso_mensual', label: 'Ingreso mensual neto', type: 'money' },
            ],
          },
          {
            // Datos personales básicos del otro cónyuge. Se pre-populan
            // con lo que el abogado cargó en el Step 1 del wizard (textbox
            // libre). Acá el domicilio se completa con el formato
            // estructurado requerido para escritos y cédulas.
            title: 'Datos del Otro Cónyuge',
            icon: 'UserPlus',
            fields: [
              { key: 'conyuge2_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Apellido, Nombre' },
              { key: 'conyuge2_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
              { key: 'conyuge2_domicilio', label: 'Domicilio actual', type: 'domicilio' },
              { key: 'conyuge2_abogado', label: 'Abogado/a de la contraparte', type: 'text', placeholder: 'Dr/Dra. Nombre' },
              { key: 'conyuge2_abogado_matricula', label: 'Matrícula (T°/F°/Colegio)', type: 'matricula' },
            ],
          },
          {
            title: 'Datos Laborales — Cónyuge 2',
            icon: 'Briefcase',
            fields: [
              { key: 'conyuge2_nacionalidad', label: 'Nacionalidad', type: 'text', placeholder: 'Argentina' },
              { key: 'conyuge2_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
              { key: 'conyuge2_profesion', label: 'Profesión / Ocupación', type: 'text', placeholder: 'Ej: Diseñadora gráfica' },
              { key: 'conyuge2_situacion_laboral', label: 'Situación laboral', type: 'select', options: ['Empleado en relación de dependencia', 'Monotributista', 'Autónomo', 'Desempleado', 'Jubilado/Pensionado', 'Otro'] },
              { key: 'conyuge2_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Nombre de empresa o actividad' },
              { key: 'conyuge2_ingreso_mensual', label: 'Ingreso mensual neto', type: 'money' },
            ],
          },
          {
            title: 'Violencia Familiar / Medidas de Protección',
            icon: 'AlertCircle',
            fields: [
              { key: 'medida_tipo_denuncia', label: 'Tipo / Organismo de denuncia', type: 'text', placeholder: 'Ej: OVD (Oficina de Violencia Doméstica)' },
              { key: 'medida_fecha', label: 'Fecha de denuncia/medida', type: 'date' },
              { key: 'medida_descripcion', label: 'Medida vigente', type: 'text', placeholder: 'Ej: Prohibición de acercamiento' },
              { key: 'medida_vigencia_hasta', label: 'Vigencia hasta', type: 'date' },
            ],
          },
        ],
      },
      // ── ETAPA 2: DEMANDA ─────────────────────────────────────
      // Bilateral: presentación conjunta con convenio regulador firmado por ambos.
      // Unilateral: demanda unilateral + propuesta reguladora + mediación
      //   de cuestiones conexas (Ley 26.589) + cédula de notificación.
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar propuesta reguladora (hijos, bienes, vivienda)', priority: 'crítico', bloqueante: true },
          // Bilateral: presentación conjunta firmada por ambos cónyuges y sus letrados
          { task: 'Preparar presentación conjunta de divorcio', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          { task: 'Obtener firma de ambos cónyuges y letrados en la presentación', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          // Unilateral: demanda individual + trámites de notificación
          { task: 'Preparar demanda unilateral de divorcio', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Mediación de cuestiones conexas (alimentos, bienes) — Ley 26.589', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Presentar demanda ante Juzgado Nacional en lo Civil', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Preparar cédula de notificación al otro cónyuge', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Diligenciar cédula y acreditar notificación', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Esperar plazo de traslado — 5 días (contestación/contrapropuesta)', priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Calcular compensación económica si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Propuesta reguladora firmada', required: true },
          { name: 'Escrito de demanda / Presentación conjunta', required: true },
          { name: 'Constancia de mediación (cuestiones conexas)', required: false },
          { name: 'Cédula de notificación diligenciada', required: false },
          { name: 'Bono de derecho fijo (CPACF)', required: true },
        ],
        milestone: 'Demanda presentada',
        fichaTitle: 'Propuesta Reguladora',
        fichaFields: [
          {
            title: 'Régimen Parental',
            icon: 'User',
            fields: [
              { key: 'tipo_cuidado', label: 'Tipo de cuidado personal', type: 'select', options: ['Compartido con residencia principal en uno', 'Compartido alternado', 'Compartido indistinto', 'Unipersonal a favor del cliente', 'Unipersonal a favor del otro', 'Por determinar'] },
              { key: 'residencia_principal', label: 'Residencia principal de los hijos', type: 'select', options: ['Domicilio del cónyuge 1 (cliente)', 'Domicilio del cónyuge 2', 'Alternado', 'Por determinar'] },
              { key: 'regimen_comunicacion', label: 'Régimen de comunicación propuesto', type: 'textarea', placeholder: 'Días, horarios, pernoctes. Ej: Miércoles 17-20hs, fines de semana alternos viernes a domingo 20hs...' },
              { key: 'regimen_vacaciones', label: 'Régimen de vacaciones', type: 'textarea', placeholder: 'Ej: Mitades de invierno y verano, alternando Navidad y Año Nuevo...' },
            ],
          },
          {
            title: 'Cuota Alimentaria',
            icon: 'FileText',
            fields: [
              { key: 'cuota_porcentaje', label: 'Porcentaje de ingresos propuesto', type: 'text', placeholder: 'Ej: 25%' },
              { key: 'cuota_gastos_compartidos', label: 'Gastos compartidos (colegio, obra social, etc.)', type: 'textarea', placeholder: 'Detallar qué gastos se comparten y en qué proporción...' },
              { key: 'obra_social', label: 'Obra social / Prepaga de los hijos', type: 'text', placeholder: 'Ej: OSDE 310' },
              { key: 'actividades_extracurriculares', label: 'Actividades extracurriculares', type: 'textarea', placeholder: 'Ej: Fútbol (hijo), Ballet (hija)...' },
            ],
          },
          {
            title: 'Bienes y Deudas',
            icon: 'Building2',
            fields: [
              {
                key: 'patrimonio_panel_info',
                label: 'Patrimonio del caso',
                type: 'info',
                tone: 'info',
                body: 'Los bienes (activos), deudas (pasivos), valuaciones históricas y sociedades interpuestas se gestionan en el tab "Patrimonio" del caso. Soporta país, sociedad uruguaya/extranjera que titulariza el bien y snapshots temporales para detectar evolución patrimonial.',
              },
            ],
          },
          {
            title: 'Compensación Económica',
            icon: 'Briefcase',
            fields: [
              { key: 'reclama_compensacion', label: '¿Se reclama compensación económica?', type: 'select', options: ['Sí', 'No', 'Por evaluar'] },
              { key: 'compensacion_fundamento', label: 'Fundamento del reclamo', type: 'textarea', placeholder: 'Ej: Art. 441 CCyCN — desequilibrio patrimonial por dedicación al cuidado de hijos...' },
              { key: 'compensacion_tipo', label: 'Forma pretendida', type: 'select', options: ['Suma única', 'Renta mensual por tiempo determinado', 'Ambas (principal y subsidiaria)', 'Por determinar'] },
              { key: 'compensacion_monto', label: 'Monto reclamado', type: 'text', placeholder: 'Ej: $25.000.000 o $600.000/mes' },
              { key: 'compensacion_plazo', label: 'Plazo (si es renta)', type: 'text', placeholder: 'Ej: 36 meses' },
            ],
          },
          {
            title: 'Acuerdo entre Partes',
            icon: 'FileText',
            fields: [
              { key: 'nivel_acuerdo', label: 'Nivel de acuerdo', type: 'select', options: ['Acuerdo total', 'Acuerdo parcial', 'Sin acuerdo'] },
              { key: 'puntos_en_conflicto', label: 'Puntos en conflicto (si hay)', type: 'textarea', placeholder: 'Ej: Discuten compensación económica y división de bienes...' },
            ],
          },
        ],
      },
      // ── ETAPA 3: AUDIENCIA ART. 438 ──────────────────────────
      // Bilateral: audiencia de formalidad, el juez homologa el convenio.
      // Unilateral: audiencia de negociación, intento de acuerdo sobre
      //   efectos (hijos, bienes). Divorcio se decreta igual.
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia art. 438 CCyCN', priority: 'crítico', bloqueante: true },
          // Unilateral: verificar que la contraparte fue notificada
          { task: 'Verificar notificación fehaciente a contraparte', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          // Unilateral: analizar contrapropuesta si la hubo
          { task: 'Analizar contrapropuesta reguladora (si fue presentada)', priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Revisar puntos pendientes del convenio', priority: 'recomendado' },
          // Bilateral: confirmar asistencia de ambos cónyuges + letrados
          { task: 'Confirmar asistencia de ambos cónyuges y letrados', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
        ],
        documents: [
          { name: 'Cédula de notificación de audiencia', required: true },
        ],
        milestone: 'Audiencia celebrada',
      },
      // ── ETAPA 4: PRUEBA ──────────────────────────────────────
      // Solo aplica en divorcio UNILATERAL con puntos en disputa
      // (régimen de comunicación, bienes gananciales, compensación
      // económica, alimentos definitivos). En bilateral con convenio
      // homologado se salta directo a sentencia.
      {
        name: 'Prueba',
        tasks: [
          { task: 'Ofrecer prueba (testimonial, pericial, informativa, documental)', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Verificar resolución que abre la causa a prueba',                priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Producir prueba pericial (designación, aceptación, dictamen)',   priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Producir prueba testimonial (audiencias de testigos)',           priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Diligenciar oficios informativos',                                priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Confeccionar pliego de posiciones (si hay absolución)',          priority: 'opcional', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Presentar alegato (al cerrarse el período probatorio)',          priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
        ],
        documents: [
          { name: 'Escrito de ofrecimiento de prueba',  required: false },
          { name: 'Pliego de pericia',                  required: false },
          { name: 'Informe pericial',                   required: false },
          { name: 'Pliego de posiciones',               required: false },
          { name: 'Alegato',                            required: false },
        ],
        milestone: 'Etapa probatoria cerrada',
      },
      // ── ETAPA 5: SENTENCIA ───────────────────────────────────
      // Al recibir la sentencia, el abogado completa la ficha indicando
      // qué resolvió el juez y qué tramitaciones quedan para ejecución.
      // Esos flags activan tareas específicas en la etapa siguiente (GAP 18).
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar dictado de sentencia de divorcio', priority: 'crítico', bloqueante: true },
          { task: 'Verificar homologación del convenio regulador', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          { task: 'Notificarse de la sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Pedir testimonio de la sentencia (firme)', priority: 'crítico' },
          { task: 'Completar ficha de Sentencia (qué resolvió el juez y qué queda por ejecutar)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia de divorcio', required: true },
          { name: 'Testimonio de sentencia firme', required: true },
          { name: 'Convenio regulador homologado', required: false },
        ],
        milestone: 'Sentencia dictada',
        fichaTitle: 'Resumen de la Sentencia',
        fichaFields: [
          {
            title: 'Resultado de la sentencia',
            icon: 'FileText',
            fields: [
              { key: 'sentencia_fecha', label: 'Fecha de la sentencia', type: 'date' },
              { key: 'sentencia_firme', label: '¿Sentencia firme?', type: 'select', options: ['Sí', 'No', 'Parcialmente firme (apelación abierta)'] },
              { key: 'sentencia_costas', label: 'Costas', type: 'select', options: ['Por su orden', 'A la contraria', 'Al cliente', 'Distribuidas', 'No corresponde'] },
              { key: 'sentencia_compensacion_otorgada', label: 'Compensación económica', type: 'select', options: ['Otorgada', 'Rechazada', 'No reclamada'] },
            ],
          },
          {
            title: 'Trámites pendientes para ejecución',
            icon: 'Building2',
            fields: [
              {
                key: 'ejec_info',
                label: 'Importante — leer antes de cargar',
                type: 'info',
                tone: 'amber',
                body: 'Marcá "No aplica" en cada trámite que NO corresponda en este caso. Si dejás un campo vacío (sin elegir opción), la app mostrará por defecto todas las tareas relacionadas en la etapa Ejecución, asumiendo que pueden hacer falta. Solo se ocultan cuando elegís "No aplica" explícitamente.',
              },
              { key: 'ejec_inmuebles', label: 'Inmuebles a transferir / inscribir', type: 'select', options: ['No aplica', 'Sí — uno', 'Sí — varios'] },
              { key: 'ejec_automotores', label: 'Automotores a transferir (Form 08)', type: 'select', options: ['No aplica', 'Sí — uno', 'Sí — varios'] },
              { key: 'ejec_cuentas', label: 'Cuentas bancarias conjuntas a dividir', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_sociedad', label: 'Sociedad comercial a liquidar', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_atribucion_vivienda', label: 'Atribución de vivienda con plazo', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_compensacion_a_cobrar', label: '¿Hay compensación a cobrar/pagar?', type: 'select', options: ['No aplica', 'Sí — el cliente cobra', 'Sí — el cliente paga'] },
              { key: 'ejec_honorarios_a_ejecutar', label: '¿Hay honorarios regulados a ejecutar a la contraria?', type: 'select', options: ['No aplica', 'Sí'] },
            ],
          },
        ],
      },
      // ── ETAPA 6: EJECUCIÓN ───────────────────────────────────
      // Checklist DETALLADO condicional según los flags cargados en la
      // ficha de Sentencia (GAP 18). Un divorcio simple sin patrimonio
      // sólo verá las tareas básicas (Registro Civil + archivo). Los
      // casos con patrimonio van desplegando tareas según corresponda.
      {
        name: 'Ejecución',
        tasks: [
          // ─── INSCRIPCIÓN REGISTRO CIVIL (siempre) ───
          { task: 'Librar oficio al Registro Civil para inscribir la sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Diligenciar oficio en Registro Civil', priority: 'crítico', bloqueante: true },
          { task: 'Verificar inscripción marginal en el acta de matrimonio', priority: 'crítico', bloqueante: true },
          { task: 'Pedir nueva acta de matrimonio con la marginal', priority: 'recomendado' },

          // ─── INMUEBLES ───
          { task: 'Identificar inmuebles a transferir e individualizar matrículas', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Tramitar escritura de adjudicación / partición ante escribano', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Librar oficio al Registro de la Propiedad Inmueble (RPI)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Verificar inscripción en RPI', priority: 'crítico', condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },

          // ─── ATRIBUCIÓN DE VIVIENDA con plazo ───
          { task: 'Anotar plazo de atribución de vivienda en el seguimiento', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_atribucion_vivienda', equals: 'Sí' } },
          { task: 'Inscribir gravamen / anotación de atribución en RPI (art. 444 CCyCN)', priority: 'recomendado', condition: { key: 'ejec_atribucion_vivienda', equals: 'Sí' } },

          // ─── AUTOMOTORES ───
          { task: 'Tramitar Formulario 08 ante el Registro Automotor (DNRPA)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_automotores', notEquals: 'No aplica' } },
          { task: 'Verificar transferencia inscripta en DNRPA', priority: 'crítico', condition: { key: 'ejec_automotores', notEquals: 'No aplica' } },

          // ─── CUENTAS BANCARIAS ───
          { task: 'Librar oficio al banco para informar saldos y movimientos', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_cuentas', equals: 'Sí' } },
          { task: 'Acordar y ejecutar la división de cuentas conjuntas', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_cuentas', equals: 'Sí' } },
          { task: 'Cierre o transferencia de titularidad de cuentas', priority: 'recomendado', condition: { key: 'ejec_cuentas', equals: 'Sí' } },

          // ─── SOCIEDAD COMERCIAL ───
          { task: 'Determinar valuación de la participación societaria (balance / pericia)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_sociedad', equals: 'Sí' } },
          { task: 'Acordar adjudicación / cesión de cuotas o acciones', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_sociedad', equals: 'Sí' } },
          { task: 'Inscripción de cesión ante IGJ / Registro Público de Comercio', priority: 'crítico', condition: { key: 'ejec_sociedad', equals: 'Sí' } },

          // ─── COMPENSACIÓN ECONÓMICA ───
          { task: 'Iniciar tracking de cuotas de compensación (módulo Cobranzas)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_compensacion_a_cobrar', notEquals: 'No aplica' } },
          { task: 'Configurar calendario de pagos y alertas de mora', priority: 'recomendado', condition: { key: 'ejec_compensacion_a_cobrar', notEquals: 'No aplica' } },

          // ─── HONORARIOS REGULADOS ───
          { task: 'Notificar la regulación de honorarios a la contraria', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },
          { task: 'Esperar firmeza de la regulación (5 días apelación)', priority: 'crítico', condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },
          { task: 'Iniciar ejecución de honorarios (módulo Cobranzas)', priority: 'crítico', condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },

          // ─── CIERRE ───
          { task: 'Confirmar todos los trámites de ejecución completados', priority: 'crítico', bloqueante: true },
          { task: 'Archivar expediente y actualizar estado del caso', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Constancia de inscripción Registro Civil', required: true },
          { name: 'Escrituras de transferencia de bienes', required: false },
          { name: 'Formulario 08 (DNRPA)', required: false },
          { name: 'Constancia de cierre de cuentas bancarias', required: false },
          { name: 'Inscripción de cesión ante IGJ', required: false },
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
    hitosProyectados: ['Instrucción completa', 'Demanda presentada', 'Audiencia celebrada', 'Etapa probatoria cerrada', 'Sentencia firme', 'Divorcio ejecutado'],
    bloqueantesTipicos: ['Falta acta de matrimonio actualizada', 'Contraparte no notificada', 'Convenio sin firma de ambos'],
    proximaAccionSugerida: 'Solicitar acta de matrimonio actualizada al Registro Civil',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
    notasOperativas: 'CABA: Juzgado Nacional en lo Civil. No hay Consejero de Familia. Mediación obligatoria solo para cuestiones conexas (Ley 26.589), no para el divorcio en sí. Bilateral resuelve en 15-45 días. Unilateral 2-4 meses.',
  },

  // ═══════════════════════════════════════════════════════════
  // DIVORCIO — PROVINCIA DE BUENOS AIRES (Juzgado de Familia)
  // Art. 437-438 CCyCN + Ley 14.442 (Fuero de Familia PBA).
  // PBA: etapa previa obligatoria ante Consejero de Familia
  // (art. 24 Ley 14.442) antes de llegar al juez.
  // Bilateral: presentación conjunta → Consejero homologa o
  //   eleva → audiencia (breve) → sentencia.
  // Unilateral: demanda → Consejero intenta conciliación →
  //   si no hay acuerdo → audiencia ante juez → sentencia.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'fam-divorcio-pba',
    name: 'Divorcio (PBA)',
    rama: 'Familia',
    subtipo: 'Divorcio',
    jurisdiccion: 'PBA',
    via: 'Ordinaria',
    etapaInicial: 'Inicio',
    descripcion: 'Divorcio ante Juzgado de Familia de PBA (Ley 14.442). Incluye etapa previa obligatoria ante Consejero de Familia.',
    stages: [
      // ── ETAPA 1: INICIO ──────────────────────────────────────
      {
        name: 'Inicio',
        tasks: [
          {
            task: 'Verificar datos del matrimonio (fecha, hijos, bienes)',
            priority: 'crítico',
            bloqueante: true,
            satisfiedBy: [
              { key: 'fecha_matrimonio', label: 'Fecha de matrimonio' },
              { key: 'registro_civil', label: 'Registro Civil' },
              { key: 'acta_numero', label: 'Acta N°' },
              { key: 'hijos_menores', label: 'Hijos menores' },
              { key: 'bienes_gananciales', label: 'Bienes gananciales' },
            ],
          },
          {
            // Si el alta se hizo con tipo_divorcio = 'Por definir' (caso típico:
            // todavía no se sabe si la contraparte va a firmar conjunto), la
            // tarea sigue pendiente hasta que se decida — el sentinel NO la
            // auto-completa.
            task: 'Determinar si es unilateral o de común acuerdo',
            priority: 'crítico',
            bloqueante: true,
            autoCompleteIf: { key: 'tipo_divorcio', excludeValues: ['Por definir'] },
          },
          {
            task: 'Verificar datos personales de ambos cónyuges',
            priority: 'crítico',
            bloqueante: true,
            satisfiedBy: [
              { key: 'conyuge1_nombre', label: 'Nombre cónyuge 1' },
              { key: 'conyuge1_dni', label: 'DNI cónyuge 1' },
              { key: 'conyuge1_domicilio', label: 'Domicilio cónyuge 1' },
              { key: 'conyuge2_nombre', label: 'Nombre cónyuge 2' },
              { key: 'conyuge2_dni', label: 'DNI cónyuge 2' },
              { key: 'conyuge2_domicilio', label: 'Domicilio cónyuge 2' },
            ],
          },
          { task: 'Evaluar existencia de convenio regulador previo', priority: 'recomendado' },
          {
            task: 'Identificar bienes gananciales y propios',
            priority: 'recomendado',
            satisfiedBy: [
              { key: 'bienes_gananciales', label: 'Bienes gananciales' },
              { key: 'regimen_patrimonial', label: 'Régimen patrimonial' },
            ],
          },
          {
            // GAP UX-31: prompt explícito en la etapa de instrucción para
            // que el abogado evalúe pedir cautelares preventivas. La señal
            // automática vive en lib/cautelaresSugeridas.ts (banner cuando
            // hay pasivo grande de la contraparte sin cautelar), pero la
            // tarea aparece siempre porque la decisión es contextual y
            // exige análisis activo aunque no haya señales obvias.
            task: 'Evaluar cautelares patrimoniales preventivas (inhibición general, embargo) si hay señales de vaciamiento — préstamos nuevos de la contraparte, transferencias, sociedades opacas, etc.',
            priority: 'recomendado',
          },
          {
            task: 'Evaluar urgencia por violencia familiar',
            priority: 'crítico',
            bloqueante: true,
            autoCompleteIf: { key: 'hay_urgencia' },
            satisfiedBy: [
              { key: 'hay_urgencia', label: 'Hay urgencia/violencia' },
            ],
          },
          { task: 'Identificar Juzgado de Familia competente (departamento judicial)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Acta de matrimonio (actualizada)', required: true },
          { name: 'DNI de ambas partes', required: true },
          { name: 'Partidas de nacimiento de hijos menores', required: true },
          { name: 'Constancia de domicilio', required: false },
          { name: 'Títulos de propiedad de bienes', required: false },
        ],
        milestone: 'Instrucción completa',
        fichaTitle: 'Instrucción del Caso',
        fichaFields: [
          {
            title: 'Datos del Matrimonio',
            icon: 'Calendar',
            fields: [
              { key: 'registro_civil', label: 'Registro Civil', type: 'text', placeholder: 'Ej: Registro Civil de La Plata' },
              { key: 'registro_civil_circunscripcion', label: 'Circunscripción', type: 'text', placeholder: 'Ej: 3ª' },
              { key: 'acta_numero', label: 'Acta N°', type: 'text', placeholder: 'Ej: 234' },
              { key: 'acta_tomo', label: 'Tomo', type: 'text', placeholder: 'Ej: 2B' },
              { key: 'regimen_patrimonial', label: 'Régimen patrimonial', type: 'select', options: ['Comunidad de ganancias', 'Separación de bienes', 'Sin convención matrimonial'] },
              { key: 'fecha_separacion_hecho', label: 'Fecha de separación de hecho', type: 'date' },
              { key: 'departamento_judicial', label: 'Departamento judicial', type: 'select', options: ['La Plata', 'Lomas de Zamora', 'San Martín', 'San Isidro', 'Morón', 'Mercedes', 'Quilmes', 'La Matanza', 'Bahía Blanca', 'Mar del Plata', 'Junín', 'Pergamino', 'Necochea', 'Azul', 'Dolores', 'San Nicolás', 'Zárate-Campana', 'Trenque Lauquen', 'Otro'] },
            ],
          },
          {
            title: 'Hijos en Común',
            icon: 'User',
            fields: [
              {
                key: 'hijos_panel_info',
                label: 'Hijos del caso',
                type: 'info',
                tone: 'info',
                body: 'Los datos de cada hijo (incluyendo discapacidad, terapias y régimen propio) se gestionan en el tab "Hijos" del caso. Allí cargás, editás y ves alertas automáticas de cumple 18.',
              },
            ],
          },
          {
            title: 'Datos Laborales — Cónyuge 1 (Cliente)',
            icon: 'Briefcase',
            fields: [
              { key: 'conyuge1_nacionalidad', label: 'Nacionalidad', type: 'text', placeholder: 'Argentina' },
              { key: 'conyuge1_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
              { key: 'conyuge1_profesion', label: 'Profesión / Ocupación', type: 'text', placeholder: 'Ej: Ingeniero en sistemas' },
              { key: 'conyuge1_situacion_laboral', label: 'Situación laboral', type: 'select', options: ['Empleado en relación de dependencia', 'Monotributista', 'Autónomo', 'Desempleado', 'Jubilado/Pensionado', 'Otro'] },
              { key: 'conyuge1_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Nombre de empresa o actividad' },
              { key: 'conyuge1_ingreso_mensual', label: 'Ingreso mensual neto', type: 'money' },
            ],
          },
          {
            title: 'Datos del Otro Cónyuge',
            icon: 'UserPlus',
            fields: [
              { key: 'conyuge2_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Apellido, Nombre' },
              { key: 'conyuge2_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
              { key: 'conyuge2_domicilio', label: 'Domicilio actual', type: 'domicilio' },
              { key: 'conyuge2_abogado', label: 'Abogado/a de la contraparte', type: 'text', placeholder: 'Dr/Dra. Nombre' },
              { key: 'conyuge2_abogado_matricula', label: 'Matrícula (T°/F°/Colegio)', type: 'matricula' },
            ],
          },
          {
            title: 'Datos Laborales — Cónyuge 2',
            icon: 'Briefcase',
            fields: [
              { key: 'conyuge2_nacionalidad', label: 'Nacionalidad', type: 'text', placeholder: 'Argentina' },
              { key: 'conyuge2_fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
              { key: 'conyuge2_profesion', label: 'Profesión / Ocupación', type: 'text', placeholder: 'Ej: Diseñadora gráfica' },
              { key: 'conyuge2_situacion_laboral', label: 'Situación laboral', type: 'select', options: ['Empleado en relación de dependencia', 'Monotributista', 'Autónomo', 'Desempleado', 'Jubilado/Pensionado', 'Otro'] },
              { key: 'conyuge2_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Nombre de empresa o actividad' },
              { key: 'conyuge2_ingreso_mensual', label: 'Ingreso mensual neto', type: 'money' },
            ],
          },
          {
            title: 'Violencia Familiar / Medidas de Protección',
            icon: 'AlertCircle',
            fields: [
              { key: 'medida_tipo_denuncia', label: 'Tipo / Organismo de denuncia', type: 'text', placeholder: 'Ej: Comisaría de la Mujer / Juzgado de Paz' },
              { key: 'medida_fecha', label: 'Fecha de denuncia/medida', type: 'date' },
              { key: 'medida_descripcion', label: 'Medida vigente', type: 'text', placeholder: 'Ej: Exclusión del hogar' },
              { key: 'medida_vigencia_hasta', label: 'Vigencia hasta', type: 'date' },
            ],
          },
        ],
      },
      // ── ETAPA 2: DEMANDA ─────────────────────────────────────
      // PBA: la demanda se presenta ante el Juzgado de Familia.
      // No hay mediación previa obligatoria para divorcio en PBA
      // (art. 4 Ley 13.951 excluye "acciones de estado").
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar propuesta reguladora (hijos, bienes, vivienda)', priority: 'crítico', bloqueante: true },
          // Bilateral
          { task: 'Preparar presentación conjunta de divorcio', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          { task: 'Obtener firma de ambos cónyuges y letrados en la presentación', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          // Unilateral
          { task: 'Preparar demanda unilateral de divorcio', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Presentar demanda ante Juzgado de Familia', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Calcular compensación económica si corresponde', priority: 'recomendado' },
          { task: 'Abonar tasa de justicia y aportes colegiales (CALP)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Propuesta reguladora firmada', required: true },
          { name: 'Escrito de demanda / Presentación conjunta', required: true },
          { name: 'Bono ley y aportes CALP', required: true },
        ],
        milestone: 'Demanda presentada',
        fichaTitle: 'Propuesta Reguladora',
        fichaFields: [
          {
            title: 'Régimen Parental',
            icon: 'User',
            fields: [
              { key: 'tipo_cuidado', label: 'Tipo de cuidado personal', type: 'select', options: ['Compartido con residencia principal en uno', 'Compartido alternado', 'Compartido indistinto', 'Unipersonal a favor del cliente', 'Unipersonal a favor del otro', 'Por determinar'] },
              { key: 'residencia_principal', label: 'Residencia principal de los hijos', type: 'select', options: ['Domicilio del cónyuge 1 (cliente)', 'Domicilio del cónyuge 2', 'Alternado', 'Por determinar'] },
              { key: 'regimen_comunicacion', label: 'Régimen de comunicación propuesto', type: 'textarea', placeholder: 'Días, horarios, pernoctes. Ej: Miércoles 17-20hs, fines de semana alternos viernes a domingo 20hs...' },
              { key: 'regimen_vacaciones', label: 'Régimen de vacaciones', type: 'textarea', placeholder: 'Ej: Mitades de invierno y verano, alternando Navidad y Año Nuevo...' },
            ],
          },
          {
            title: 'Cuota Alimentaria',
            icon: 'FileText',
            fields: [
              { key: 'cuota_porcentaje', label: 'Porcentaje de ingresos propuesto', type: 'text', placeholder: 'Ej: 25%' },
              { key: 'cuota_gastos_compartidos', label: 'Gastos compartidos (colegio, obra social, etc.)', type: 'textarea', placeholder: 'Detallar qué gastos se comparten y en qué proporción...' },
              { key: 'obra_social', label: 'Obra social / Prepaga de los hijos', type: 'text', placeholder: 'Ej: IOMA' },
              { key: 'actividades_extracurriculares', label: 'Actividades extracurriculares', type: 'textarea', placeholder: 'Ej: Fútbol (hijo), Ballet (hija)...' },
            ],
          },
          {
            title: 'Bienes y Deudas',
            icon: 'Building2',
            fields: [
              {
                key: 'patrimonio_panel_info',
                label: 'Patrimonio del caso',
                type: 'info',
                tone: 'info',
                body: 'Los bienes (activos), deudas (pasivos), valuaciones históricas y sociedades interpuestas se gestionan en el tab "Patrimonio" del caso. Soporta país, sociedad uruguaya/extranjera que titulariza el bien y snapshots temporales para detectar evolución patrimonial.',
              },
            ],
          },
          {
            title: 'Compensación Económica',
            icon: 'Briefcase',
            fields: [
              { key: 'reclama_compensacion', label: '¿Se reclama compensación económica?', type: 'select', options: ['Sí', 'No', 'Por evaluar'] },
              { key: 'compensacion_fundamento', label: 'Fundamento del reclamo', type: 'textarea', placeholder: 'Ej: Art. 441 CCyCN — desequilibrio patrimonial...' },
              { key: 'compensacion_tipo', label: 'Forma pretendida', type: 'select', options: ['Suma única', 'Renta mensual por tiempo determinado', 'Ambas (principal y subsidiaria)', 'Por determinar'] },
              { key: 'compensacion_monto', label: 'Monto reclamado', type: 'text', placeholder: 'Ej: $25.000.000 o $600.000/mes' },
              { key: 'compensacion_plazo', label: 'Plazo (si es renta)', type: 'text', placeholder: 'Ej: 36 meses' },
            ],
          },
          {
            title: 'Acuerdo entre Partes',
            icon: 'FileText',
            fields: [
              { key: 'nivel_acuerdo', label: 'Nivel de acuerdo', type: 'select', options: ['Acuerdo total', 'Acuerdo parcial', 'Sin acuerdo'] },
              { key: 'puntos_en_conflicto', label: 'Puntos en conflicto (si hay)', type: 'textarea', placeholder: 'Ej: Discuten compensación económica y división de bienes...' },
            ],
          },
        ],
      },
      // ── ETAPA 3: CONSEJERO DE FAMILIA (PBA exclusivo) ────────
      // Ley 14.442 art. 24: etapa previa obligatoria.
      // El Consejero intenta conciliación y puede homologar acuerdos.
      // Si no hay acuerdo, eleva a conocimiento del juez.
      {
        name: 'Consejero de Familia',
        tasks: [
          { task: 'Asistir a citación ante Consejero de Familia', priority: 'crítico', bloqueante: true },
          // Bilateral: Consejero revisa convenio y puede homologar directamente
          { task: 'Presentar convenio regulador al Consejero para homologación', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          // Unilateral: Consejero notifica a contraparte e intenta conciliación
          { task: 'Notificación a contraparte por Consejero de Familia', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Audiencia de conciliación ante Consejero', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Evaluar resultado de etapa previa (acuerdo / sin acuerdo)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Acta de audiencia ante Consejero de Familia', required: true },
          { name: 'Resolución de elevación a conocimiento (si sin acuerdo)', required: false },
        ],
        milestone: 'Etapa previa ante Consejero completada',
        fichaTitle: 'Etapa Previa — Consejero',
        fichaFields: [
          {
            title: 'Resultado de la Etapa Previa',
            icon: 'FileText',
            fields: [
              { key: 'consejero_nombre', label: 'Consejero de Familia asignado', type: 'text', placeholder: 'Nombre del Consejero' },
              { key: 'consejero_fecha_audiencia', label: 'Fecha de audiencia ante Consejero', type: 'date' },
              { key: 'consejero_resultado', label: 'Resultado', type: 'select', options: ['Acuerdo total homologado', 'Acuerdo parcial', 'Sin acuerdo — elevado a conocimiento', 'Incomparecencia de contraparte'] },
              { key: 'consejero_observaciones', label: 'Observaciones', type: 'textarea', placeholder: 'Puntos acordados, pendientes, etc.' },
            ],
          },
        ],
      },
      // ── ETAPA 4: AUDIENCIA ANTE JUEZ ─────────────────────────
      // Bilateral con acuerdo homologado: puede ser breve o innecesaria.
      // Unilateral / sin acuerdo: audiencia art. 438 ante juez de Familia.
      {
        name: 'Audiencia',
        tasks: [
          { task: 'Preparar cliente para audiencia ante Juez de Familia', priority: 'crítico', bloqueante: true },
          // Unilateral: audiencia de negociación plena
          { task: 'Analizar contrapropuesta reguladora (si fue presentada)', priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Revisar puntos pendientes del convenio', priority: 'recomendado' },
          // Bilateral: confirmar asistencia
          { task: 'Confirmar asistencia de ambos cónyuges y letrados', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
        ],
        documents: [
          { name: 'Cédula de notificación de audiencia', required: true },
        ],
        milestone: 'Audiencia ante Juez celebrada',
      },
      // ── ETAPA 5: PRUEBA ──────────────────────────────────────
      // Solo aplica en divorcio UNILATERAL con puntos en disputa.
      // En bilateral con convenio homologado por el Consejero o el Juez
      // se salta directo a sentencia.
      {
        name: 'Prueba',
        tasks: [
          { task: 'Ofrecer prueba (testimonial, pericial, informativa, documental)', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Verificar resolución que abre la causa a prueba',                priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Producir prueba pericial (designación, aceptación, dictamen)',   priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Producir prueba testimonial (audiencias de testigos)',           priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Diligenciar oficios informativos',                                priority: 'recomendado', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Confeccionar pliego de posiciones (si hay absolución)',          priority: 'opcional', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
          { task: 'Presentar alegato (al cerrarse el período probatorio)',          priority: 'crítico', condition: { key: 'tipo_divorcio', equals: 'Unilateral' } },
        ],
        documents: [
          { name: 'Escrito de ofrecimiento de prueba',  required: false },
          { name: 'Pliego de pericia',                  required: false },
          { name: 'Informe pericial',                   required: false },
          { name: 'Pliego de posiciones',               required: false },
          { name: 'Alegato',                            required: false },
        ],
        milestone: 'Etapa probatoria cerrada',
      },
      // ── ETAPA 6: SENTENCIA ───────────────────────────────────
      // Idem CABA: ficha que dispara las tareas de la etapa Ejecución (GAP 18).
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar dictado de sentencia de divorcio', priority: 'crítico', bloqueante: true },
          { task: 'Verificar homologación del convenio regulador', priority: 'crítico', bloqueante: true, condition: { key: 'tipo_divorcio', equals: 'De común acuerdo' } },
          { task: 'Notificarse de la sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Pedir testimonio de la sentencia (firme)', priority: 'crítico' },
          { task: 'Completar ficha de Sentencia (qué resolvió el juez y qué queda por ejecutar)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia de divorcio', required: true },
          { name: 'Testimonio de sentencia firme', required: true },
          { name: 'Convenio regulador homologado', required: false },
        ],
        milestone: 'Sentencia dictada',
        fichaTitle: 'Resumen de la Sentencia',
        fichaFields: [
          {
            title: 'Resultado de la sentencia',
            icon: 'FileText',
            fields: [
              { key: 'sentencia_fecha', label: 'Fecha de la sentencia', type: 'date' },
              { key: 'sentencia_firme', label: '¿Sentencia firme?', type: 'select', options: ['Sí', 'No', 'Parcialmente firme (apelación abierta)'] },
              { key: 'sentencia_costas', label: 'Costas', type: 'select', options: ['Por su orden', 'A la contraria', 'Al cliente', 'Distribuidas', 'No corresponde'] },
              { key: 'sentencia_compensacion_otorgada', label: 'Compensación económica', type: 'select', options: ['Otorgada', 'Rechazada', 'No reclamada'] },
            ],
          },
          {
            title: 'Trámites pendientes para ejecución',
            icon: 'Building2',
            fields: [
              {
                key: 'ejec_info',
                label: 'Importante — leer antes de cargar',
                type: 'info',
                tone: 'amber',
                body: 'Marcá "No aplica" en cada trámite que NO corresponda en este caso. Si dejás un campo vacío (sin elegir opción), la app mostrará por defecto todas las tareas relacionadas en la etapa Ejecución, asumiendo que pueden hacer falta. Solo se ocultan cuando elegís "No aplica" explícitamente.',
              },
              { key: 'ejec_inmuebles', label: 'Inmuebles a transferir / inscribir', type: 'select', options: ['No aplica', 'Sí — uno', 'Sí — varios'] },
              { key: 'ejec_automotores', label: 'Automotores a transferir (Form 08)', type: 'select', options: ['No aplica', 'Sí — uno', 'Sí — varios'] },
              { key: 'ejec_cuentas', label: 'Cuentas bancarias conjuntas a dividir', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_sociedad', label: 'Sociedad comercial a liquidar', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_atribucion_vivienda', label: 'Atribución de vivienda con plazo', type: 'select', options: ['No aplica', 'Sí'] },
              { key: 'ejec_compensacion_a_cobrar', label: '¿Hay compensación a cobrar/pagar?', type: 'select', options: ['No aplica', 'Sí — el cliente cobra', 'Sí — el cliente paga'] },
              { key: 'ejec_honorarios_a_ejecutar', label: '¿Hay honorarios regulados a ejecutar a la contraria?', type: 'select', options: ['No aplica', 'Sí'] },
            ],
          },
        ],
      },
      // ── ETAPA 7: EJECUCIÓN ───────────────────────────────────
      // Mismo checklist condicional que CABA (GAP 18). En PBA el oficio
      // va a la Dirección Provincial del Registro de las Personas y los
      // inmuebles se inscriben en el Registro de la Propiedad PBA.
      {
        name: 'Ejecución',
        tasks: [
          // ─── INSCRIPCIÓN REGISTRO CIVIL (siempre) ───
          { task: 'Librar oficio a la Dirección Provincial del Registro de las Personas (PBA)', priority: 'crítico', bloqueante: true },
          { task: 'Diligenciar oficio en el Registro Civil PBA', priority: 'crítico', bloqueante: true },
          { task: 'Verificar inscripción marginal en el acta de matrimonio', priority: 'crítico', bloqueante: true },
          { task: 'Pedir nueva acta de matrimonio con la marginal', priority: 'recomendado' },

          // ─── INMUEBLES ───
          { task: 'Identificar inmuebles a transferir e individualizar matrículas', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Tramitar escritura de adjudicación / partición ante escribano', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Librar oficio al Registro de la Propiedad Inmueble PBA (RPP-PBA)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },
          { task: 'Verificar inscripción en RPP-PBA', priority: 'crítico', condition: { key: 'ejec_inmuebles', notEquals: 'No aplica' } },

          // ─── ATRIBUCIÓN DE VIVIENDA con plazo ───
          { task: 'Anotar plazo de atribución de vivienda en el seguimiento', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_atribucion_vivienda', equals: 'Sí' } },
          { task: 'Inscribir gravamen / anotación de atribución en RPP-PBA (art. 444 CCyCN)', priority: 'recomendado', condition: { key: 'ejec_atribucion_vivienda', equals: 'Sí' } },

          // ─── AUTOMOTORES ───
          { task: 'Tramitar Formulario 08 ante el Registro Automotor (DNRPA)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_automotores', notEquals: 'No aplica' } },
          { task: 'Verificar transferencia inscripta en DNRPA', priority: 'crítico', condition: { key: 'ejec_automotores', notEquals: 'No aplica' } },

          // ─── CUENTAS BANCARIAS ───
          { task: 'Librar oficio al banco para informar saldos y movimientos', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_cuentas', equals: 'Sí' } },
          { task: 'Acordar y ejecutar la división de cuentas conjuntas', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_cuentas', equals: 'Sí' } },
          { task: 'Cierre o transferencia de titularidad de cuentas', priority: 'recomendado', condition: { key: 'ejec_cuentas', equals: 'Sí' } },

          // ─── SOCIEDAD COMERCIAL ───
          { task: 'Determinar valuación de la participación societaria (balance / pericia)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_sociedad', equals: 'Sí' } },
          { task: 'Acordar adjudicación / cesión de cuotas o acciones', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_sociedad', equals: 'Sí' } },
          { task: 'Inscripción de cesión ante DPPJ PBA / Registro Público de Comercio', priority: 'crítico', condition: { key: 'ejec_sociedad', equals: 'Sí' } },

          // ─── COMPENSACIÓN ECONÓMICA ───
          { task: 'Iniciar tracking de cuotas de compensación (módulo Cobranzas)', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_compensacion_a_cobrar', notEquals: 'No aplica' } },
          { task: 'Configurar calendario de pagos y alertas de mora', priority: 'recomendado', condition: { key: 'ejec_compensacion_a_cobrar', notEquals: 'No aplica' } },

          // ─── HONORARIOS REGULADOS ───
          { task: 'Notificar la regulación de honorarios a la contraria', priority: 'crítico', bloqueante: true, condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },
          { task: 'Esperar firmeza de la regulación (5 días apelación)', priority: 'crítico', condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },
          { task: 'Iniciar ejecución de honorarios (módulo Cobranzas)', priority: 'crítico', condition: { key: 'ejec_honorarios_a_ejecutar', equals: 'Sí' } },

          // ─── CIERRE ───
          { task: 'Confirmar todos los trámites de ejecución completados', priority: 'crítico', bloqueante: true },
          { task: 'Archivar expediente y actualizar estado del caso', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Constancia de inscripción Registro Civil', required: true },
          { name: 'Escrituras de transferencia de bienes', required: false },
          { name: 'Formulario 08 (DNRPA)', required: false },
          { name: 'Constancia de cierre de cuentas bancarias', required: false },
          { name: 'Inscripción de cesión ante DPPJ PBA', required: false },
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
    hitosProyectados: ['Instrucción completa', 'Demanda presentada', 'Consejero de Familia', 'Audiencia celebrada', 'Etapa probatoria cerrada', 'Sentencia firme', 'Divorcio ejecutado'],
    bloqueantesTipicos: ['Falta acta de matrimonio actualizada', 'Contraparte no notificada', 'Convenio sin firma de ambos', 'Incomparecencia ante Consejero'],
    proximaAccionSugerida: 'Solicitar acta de matrimonio actualizada al Registro Civil',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
    notasOperativas: 'PBA: Juzgado de Familia (Ley 14.442). Etapa previa OBLIGATORIA ante Consejero de Familia (art. 24). No hay mediación previa para divorcio (Ley 13.951 excluye acciones de estado). Bilateral puede resolverse rápido si Consejero homologa. Unilateral 2-5 meses según departamento judicial.',
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
  // LABORAL — CABA y Provincia de Buenos Aires
  // Ley 27.802 de Modernización Laboral (parcialmente cautelar)
  // ═══════════════════════════════════════════════════════════

  // ─── DESPIDO — CABA (con SECLO obligatorio) ───────────────
  {
    id: 'lab-despido-caba',
    name: 'Despido (CABA)',
    rama: 'Laboral',
    subtipo: 'Despido',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Despido sin causa o con causa controvertida — CABA. Flujo con SECLO obligatorio. ⚠ Art. 245 Ley 27.802 CAUTELAR: aplicar LCT original.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Definir jurisdicción: verificar domicilio del empleador en CABA', priority: 'crítico', bloqueante: true },
          { task: 'Clasificar vínculo: dependencia, tercerización o grupo económico', priority: 'crítico', bloqueante: true },
          { task: 'Verificar fecha de ingreso, categoría y CCT aplicable', priority: 'crítico', bloqueante: true },
          { task: 'Auditar registración: comparar alta ARCA vs fecha real de ingreso', priority: 'crítico', bloqueante: true },
          { task: 'Comparar salario registrado vs salario real percibido', priority: 'crítico', bloqueante: true },
          { task: 'Identificar defectos registrales (fecha, salario, categoría)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Recibos de sueldo (últimos 12 meses)', required: true },
          { name: 'Alta en ARCA/AFIP', required: true },
          { name: 'Certificado de servicios (Art. 80 LCT)', required: true },
        ],
        milestone: 'Encuadre del vínculo completo',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL de intimación por registración/diferencias/despido', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero (TCL gratuito)', priority: 'crítico', bloqueante: true },
          { task: 'Registrar fecha de envío y seguimiento de respuesta', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar respuesta del empleador (si la hay) dentro de los 30 días', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de despido / intimación', required: true },
          { name: 'Acuse de recibo del telegrama', required: true },
          { name: 'Respuesta del empleador (si existe)', required: false },
        ],
        milestone: 'Intercambio telegráfico completo',
      },
      {
        name: 'SECLO',
        tasks: [
          { task: 'Iniciar trámite SECLO virtual en Portal de Abogados', priority: 'crítico', bloqueante: true },
          { task: 'Verificar matriculación en CPACF (obligatoria para SECLO)', priority: 'crítico', bloqueante: true },
          { task: 'Preparar liquidación interna para comparar con oferta', priority: 'crítico', bloqueante: true },
          { task: 'Asistir a audiencia virtual (10 días hábiles desde inicio)', priority: 'crítico', bloqueante: true },
          { task: 'Comparar oferta del empleador vs cálculo interno', priority: 'recomendado' },
          { task: 'Evaluar acuerdo o registrar acta de fracaso', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Formulario de inicio SECLO', required: true },
          { name: 'Constancia de audiencia SECLO', required: true },
          { name: 'Acta de acuerdo o fracaso SECLO', required: true },
        ],
        milestone: 'SECLO resuelto (acuerdo homologado o fracaso)',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Calcular liquidación final art. 245 LCT (⚠ CAUTELAR: usar texto original)', priority: 'crítico', bloqueante: true },
          { task: 'Verificar rubros reclamables: antigüedad, preaviso, integración, SAC, vacaciones', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar multas Ley 25.323 arts. 1° y 2° + Ley 24.013 si corresponde', priority: 'crítico', bloqueante: true },
          { task: 'Redactar demanda laboral ante Juzgado Nacional del Trabajo', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda con liquidación detallada', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar riesgo de pluspetición (⚠ CAUTELAR: Ley 27.802 reforma costas)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Constancia SECLO (cierre sin acuerdo)', required: true },
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación detallada con rubros', required: true },
          { name: 'Prueba documental (recibos, telegramas, certificados)', required: true },
        ],
        milestone: 'Demanda presentada en juzgado',
      },
      {
        name: 'Prueba y vista',
        tasks: [
          { task: 'Ofrecer prueba: documental, testimonial, informativa, pericial contable', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar oficios a AFIP, ANSES, banco y empleador', priority: 'recomendado' },
          { task: 'Preparar cliente para audiencia de vista de causa', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar propuesta de conciliación si la hay', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Ofrecimiento de prueba', required: true },
          { name: 'Oficios librados', required: false },
          { name: 'Pericia contable', required: false },
        ],
        milestone: 'Prueba producida y vista de causa',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia y regulación de honorarios', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar sentencia con actualización (⚠ CAUTELAR: art. 276 IPC+3%)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recurso de apelación ante Cámara Nacional si corresponde', priority: 'recomendado' },
          { task: 'Calcular costas y honorarios', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia de primera instancia', required: true },
          { name: 'Liquidación post-sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Iniciar ejecución de sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Verificar depósito bancario del empleador', priority: 'crítico', bloqueante: true },
          { task: 'Controlar plan de cuotas si aplica (⚠ CAUTELAR: 6 cuotas gran empresa, 12 MIPYME)', priority: 'recomendado' },
          { task: 'Confirmar cobro total y cierre del caso', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de depósito / transferencia', required: true },
        ],
        milestone: 'Cobro ejecutado — caso cerrado',
      },
    ],
    checklistBase: [
      { task: 'Verificar jurisdicción CABA', priority: 'crítico' },
      { task: 'Encuadrar vínculo laboral', priority: 'crítico' },
      { task: 'Auditar registración', priority: 'crítico' },
      { task: 'Enviar TCL de intimación', priority: 'crítico' },
      { task: 'Tramitar SECLO (obligatorio CABA)', priority: 'crítico' },
      { task: 'Calcular liquidación art. 245 (⚠ CAUTELAR)', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Recibos de sueldo (últimos 12)', required: true },
      { name: 'Certificado de servicios (Art. 80)', required: true },
      { name: 'Telegrama de despido / intimación', required: true },
      { name: 'Alta ARCA/AFIP', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'SECLO', 'Demanda', 'Prueba', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Faltan recibos de sueldo', 'SECLO sin cerrar', 'Falta alta ARCA', 'Art. 245 bajo cautelar'],
    proximaAccionSugerida: 'Encuadrar vínculo y auditar registración',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
    notasOperativas: '⚠ LEY 27.802 CAUTELAR: Art. 245 (indemnización), art. 276 (IPC+3%), pluspetición. Usar texto original LCT (Ley 20.744). SECLO es obligatorio en CABA — sin constancia de fracaso no se puede demandar.',
  },

  // ─── DESPIDO — PBA (sin SECLO, demanda directa) ──────────
  {
    id: 'lab-despido-pba',
    name: 'Despido (PBA)',
    rama: 'Laboral',
    subtipo: 'Despido',
    jurisdiccion: 'PBA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Despido sin causa o con causa controvertida — Provincia de Buenos Aires. Sin SECLO, demanda directa ante Tribunal del Trabajo colegiado. ⚠ Paradoja normativa: Ley 15.057 vigente pero no operativa, Ley 11.653 derogada pero aplicada.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Definir jurisdicción: verificar domicilio del empleador en PBA', priority: 'crítico', bloqueante: true },
          { task: 'Clasificar vínculo: dependencia, tercerización o grupo económico', priority: 'crítico', bloqueante: true },
          { task: 'Verificar fecha de ingreso, categoría y CCT aplicable', priority: 'crítico', bloqueante: true },
          { task: 'Auditar registración: comparar alta ARCA vs fecha real de ingreso', priority: 'crítico', bloqueante: true },
          { task: 'Comparar salario registrado vs salario real percibido', priority: 'crítico', bloqueante: true },
          { task: 'Confirmar competencia provincial (domicilio o lugar de tareas en PBA)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Recibos de sueldo (últimos 12 meses)', required: true },
          { name: 'Alta en ARCA/AFIP', required: true },
          { name: 'Certificado de servicios (Art. 80 LCT)', required: true },
        ],
        milestone: 'Encuadre del vínculo completo',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL de intimación (no obligatorio en PBA pero estratégicamente clave)', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero (TCL gratuito)', priority: 'crítico', bloqueante: true },
          { task: 'Registrar intercambio y evaluar respuesta del empleador', priority: 'recomendado' },
          { task: 'Construir base del caso pre-judicial con el intercambio', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de despido / intimación', required: true },
          { name: 'Acuse de recibo del telegrama', required: true },
          { name: 'Respuesta del empleador (si existe)', required: false },
        ],
        milestone: 'Intercambio telegráfico completo',
      },
      {
        name: 'Demanda directa',
        tasks: [
          { task: 'Calcular liquidación final art. 245 LCT (⚠ CAUTELAR: usar texto original)', priority: 'crítico', bloqueante: true },
          { task: 'Verificar rubros reclamables: antigüedad, preaviso, integración, SAC, vacaciones', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar multas Ley 25.323 y Ley 24.013 si corresponde', priority: 'crítico', bloqueante: true },
          { task: 'Redactar demanda ante Tribunal del Trabajo (colegiado, 3 jueces)', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda — proceso oral y público, actuación exenta de tasas', priority: 'crítico', bloqueante: true },
          { task: 'Preparar estrategia probatoria para vista de causa oral', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación detallada con rubros', required: true },
          { name: 'Prueba documental (recibos, telegramas, certificados)', required: true },
        ],
        milestone: 'Demanda presentada ante Tribunal del Trabajo',
      },
      {
        name: 'Vista de causa',
        tasks: [
          { task: 'Preparar cliente para audiencia oral y pública ante Tribunal', priority: 'crítico', bloqueante: true },
          { task: 'Producir prueba testimonial y pericial en audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar posibilidad de conciliación ante el Tribunal (art. 25 Ley 11.653)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Ofrecimiento de prueba', required: true },
          { name: 'Pericia contable (si se ofreció)', required: false },
        ],
        milestone: 'Vista de causa celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia del Tribunal del Trabajo', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar sentencia (⚠ CAUTELAR: art. 276 IPC+3% aplica al fondo LCT, no al proceso provincial)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recursos limitados (instancia única — Ley 15.057 no operativa)', priority: 'recomendado' },
          { task: 'Calcular regulación de honorarios', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia del Tribunal del Trabajo', required: true },
          { name: 'Liquidación post-sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Iniciar ejecución de sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Trabar embargo de haberes y bienes si corresponde', priority: 'recomendado' },
          { task: 'Verificar cobro y cerrar caso', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de depósito / transferencia', required: true },
        ],
        milestone: 'Cobro ejecutado — caso cerrado',
      },
    ],
    checklistBase: [
      { task: 'Verificar jurisdicción PBA', priority: 'crítico' },
      { task: 'Encuadrar vínculo laboral', priority: 'crítico' },
      { task: 'Auditar registración', priority: 'crítico' },
      { task: 'Enviar TCL de intimación', priority: 'crítico' },
      { task: 'Calcular liquidación art. 245 (⚠ CAUTELAR)', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Recibos de sueldo (últimos 12)', required: true },
      { name: 'Certificado de servicios (Art. 80)', required: true },
      { name: 'Telegrama de despido / intimación', required: true },
      { name: 'Alta ARCA/AFIP', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'Demanda', 'Vista de causa', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Faltan recibos de sueldo', 'Falta alta ARCA', 'Art. 245 bajo cautelar'],
    proximaAccionSugerida: 'Encuadrar vínculo y auditar registración',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
    notasOperativas: '⚠ PBA: NO existe SECLO. Demanda directa ante Tribunal del Trabajo (3 jueces). Paradoja normativa: Ley 15.057 vigente no operativa / Ley 11.653 derogada pero aplicada. ⚠ Art. 245 Ley 27.802 CAUTELAR.',
  },

  // ─── DIFERENCIAS SALARIALES — CABA ────────────────────────
  {
    id: 'lab-diferencias-caba',
    name: 'Diferencias salariales (CABA)',
    rama: 'Laboral',
    subtipo: 'Diferencias salariales',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Reclamo por diferencias salariales, horas extra, ius variandi — CABA. Relación vigente o extinguida. SECLO obligatorio.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Verificar jurisdicción CABA y CCT aplicable', priority: 'crítico', bloqueante: true },
          { task: 'Comparar salario básico y variables vs escala del CCT', priority: 'crítico', bloqueante: true },
          { task: 'Auditar jornada pactada vs jornada real (horas extra)', priority: 'crítico', bloqueante: true },
          { task: 'Identificar ítems remunerativos vs no remunerativos', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar modificaciones funcionales (ius variandi)', priority: 'recomendado' },
          { task: 'Revisar sanciones y suspensiones si las hay', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Recibos de sueldo (período reclamado)', required: true },
          { name: 'Escala salarial del CCT vigente', required: true },
          { name: 'Registro de jornada (si existe)', required: false },
        ],
        milestone: 'Planilla de diferencias armada',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL intimando pago de diferencias salariales', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero', priority: 'crítico', bloqueante: true },
          { task: 'Registrar respuesta del empleador', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de intimación por diferencias', required: true },
          { name: 'Acuse de recibo', required: true },
        ],
        milestone: 'Intimación por diferencias enviada',
      },
      {
        name: 'SECLO',
        tasks: [
          { task: 'Iniciar trámite SECLO virtual', priority: 'crítico', bloqueante: true },
          { task: 'Presentar planilla de diferencias como base del reclamo', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar oferta del empleador vs cálculo propio', priority: 'recomendado' },
          { task: 'Registrar resultado: acuerdo homologado o acta de fracaso', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia de audiencia SECLO', required: true },
          { name: 'Acta de acuerdo o fracaso', required: true },
        ],
        milestone: 'SECLO resuelto',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda por diferencias salariales ante Juzgado Nacional del Trabajo', priority: 'crítico', bloqueante: true },
          { task: 'Adjuntar liquidación detallada de diferencias período a período', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia SECLO (fracaso)', required: true },
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación de diferencias detallada', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Prueba y vista',
        tasks: [
          { task: 'Ofrecer prueba pericial contable para determinar diferencias', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar oficios a AFIP y banco por depósitos reales', priority: 'recomendado' },
          { task: 'Preparar audiencia de vista de causa', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Ofrecimiento de prueba', required: true },
          { name: 'Pericia contable', required: false },
        ],
        milestone: 'Prueba producida',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar con actualización (⚠ CAUTELAR: art. 276 IPC+3%)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar apelación si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Ejecutar sentencia y verificar cobro', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Armar planilla de diferencias', priority: 'crítico' },
      { task: 'Enviar TCL por diferencias', priority: 'crítico' },
      { task: 'Tramitar SECLO', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Recibos de sueldo', required: true },
      { name: 'Escala salarial CCT', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'SECLO', 'Demanda', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Faltan recibos del período', 'SECLO sin cerrar', 'Escala CCT no identificada'],
    proximaAccionSugerida: 'Armar planilla de diferencias salariales',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  // ─── DIFERENCIAS SALARIALES — PBA ─────────────────────────
  {
    id: 'lab-diferencias-pba',
    name: 'Diferencias salariales (PBA)',
    rama: 'Laboral',
    subtipo: 'Diferencias salariales',
    jurisdiccion: 'PBA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Reclamo por diferencias salariales, horas extra, ius variandi — PBA. Sin SECLO, demanda directa ante Tribunal del Trabajo.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Verificar jurisdicción PBA y CCT aplicable', priority: 'crítico', bloqueante: true },
          { task: 'Comparar salario básico y variables vs escala del CCT', priority: 'crítico', bloqueante: true },
          { task: 'Auditar jornada pactada vs jornada real (horas extra)', priority: 'crítico', bloqueante: true },
          { task: 'Identificar ítems remunerativos vs no remunerativos', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar ius variandi y suspensiones', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Recibos de sueldo (período reclamado)', required: true },
          { name: 'Escala salarial del CCT vigente', required: true },
        ],
        milestone: 'Planilla de diferencias armada',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL intimando pago de diferencias', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero', priority: 'crítico', bloqueante: true },
          { task: 'Registrar respuesta del empleador', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de intimación', required: true },
          { name: 'Acuse de recibo', required: true },
        ],
        milestone: 'Intimación enviada',
      },
      {
        name: 'Demanda directa',
        tasks: [
          { task: 'Redactar demanda ante Tribunal del Trabajo', priority: 'crítico', bloqueante: true },
          { task: 'Adjuntar liquidación detallada de diferencias', priority: 'crítico', bloqueante: true },
          { task: 'Presentar demanda — proceso oral, exento de tasas', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación de diferencias', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Vista de causa',
        tasks: [
          { task: 'Preparar audiencia oral ante Tribunal colegiado', priority: 'crítico', bloqueante: true },
          { task: 'Producir prueba pericial contable', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar conciliación ante el Tribunal', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Pericia contable', required: false },
        ],
        milestone: 'Vista de causa celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia del Tribunal', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar sentencia', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Ejecutar sentencia y verificar cobro', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Armar planilla de diferencias', priority: 'crítico' },
      { task: 'Enviar TCL por diferencias', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Recibos de sueldo', required: true },
      { name: 'Escala salarial CCT', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'Demanda', 'Vista de causa', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Faltan recibos del período', 'Escala CCT no identificada'],
    proximaAccionSugerida: 'Armar planilla de diferencias salariales',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  // ─── NO REGISTRADO — CABA ────────────────────────────────
  {
    id: 'lab-no-registrado-caba',
    name: 'No registrado (CABA)',
    rama: 'Laboral',
    subtipo: 'No registrado',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Reclamo por empleo no registrado o deficientemente registrado — CABA. Multas Ley 24.013 + Ley 25.323. SECLO obligatorio.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Reconstruir historia laboral: fecha real de inicio, salario real, tareas', priority: 'crítico', bloqueante: true },
          { task: 'Comparar situación formal vs real (alta ARCA, recibos, aportes)', priority: 'crítico', bloqueante: true },
          { task: 'Identificar testigos clave y pruebas de la relación (chats, mails, fotos)', priority: 'crítico', bloqueante: true },
          { task: 'Determinar si es no registrado total o parcial (fecha/sueldo adulterado)', priority: 'crítico', bloqueante: true },
          { task: 'Calcular aportes omitidos al sistema de seguridad social', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Prueba de la relación (chats, emails, fotos, testigos)', required: true },
          { name: 'Recibos de sueldo (si existen)', required: false },
          { name: 'Informe de aportes ANSES/ARCA', required: false },
        ],
        milestone: 'Historia laboral reconstruida',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL intimando registración correcta (arts. 8-10 Ley 24.013)', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero con detalle de fecha real e ingreso real', priority: 'crítico', bloqueante: true },
          { task: 'Aguardar 30 días corridos para respuesta/cumplimiento', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar considerarse despedido si no cumple (despido indirecto)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de intimación por registración', required: true },
          { name: 'Acuse de recibo', required: true },
        ],
        milestone: 'Intimación de registración enviada',
      },
      {
        name: 'SECLO',
        tasks: [
          { task: 'Iniciar trámite SECLO con reclamo integral', priority: 'crítico', bloqueante: true },
          { task: 'Incluir multas Ley 24.013 + Ley 25.323 en el reclamo', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar oferta vs cálculo interno', priority: 'recomendado' },
          { task: 'Registrar resultado', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Acta SECLO', required: true },
        ],
        milestone: 'SECLO resuelto',
      },
      {
        name: 'Demanda',
        tasks: [
          { task: 'Redactar demanda con narrativa cronológica de la relación no registrada', priority: 'crítico', bloqueante: true },
          { task: 'Incluir multas arts. 8, 9, 10, 11 y 15 Ley 24.013 según corresponda', priority: 'crítico', bloqueante: true },
          { task: 'Incluir multa art. 1° Ley 25.323 por falta de registración', priority: 'crítico', bloqueante: true },
          { task: 'Reclamar certificados art. 80 + multa Ley 25.345', priority: 'recomendado' },
          { task: 'Presentar demanda con toda la prueba de la relación', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Constancia SECLO (fracaso)', required: true },
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación con multas', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Prueba y vista',
        tasks: [
          { task: 'Ofrecer prueba testimonial (clave en casos de no registro)', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar informes a AFIP/ARCA y ANSES', priority: 'crítico', bloqueante: true },
          { task: 'Preparar vista de causa', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Ofrecimiento de prueba', required: true },
        ],
        milestone: 'Prueba producida',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar apelación', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Ejecutar sentencia y verificar cobro', priority: 'crítico', bloqueante: true },
          { task: 'Remitir informe a ARCA para regularización', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Reconstruir historia laboral', priority: 'crítico' },
      { task: 'Enviar TCL intimando registración', priority: 'crítico' },
      { task: 'Tramitar SECLO', priority: 'crítico' },
      { task: 'Calcular multas Ley 24.013', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Prueba de la relación', required: true },
      { name: 'Telegrama de intimación', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'SECLO', 'Demanda', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Falta prueba de la relación', 'SECLO sin cerrar', 'Testigos no identificados'],
    proximaAccionSugerida: 'Reconstruir historia laboral y reunir pruebas',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
  },

  // ─── NO REGISTRADO — PBA ─────────────────────────────────
  {
    id: 'lab-no-registrado-pba',
    name: 'No registrado (PBA)',
    rama: 'Laboral',
    subtipo: 'No registrado',
    jurisdiccion: 'PBA',
    via: 'Ordinaria',
    etapaInicial: 'Encuadre',
    descripcion: 'Reclamo por empleo no registrado o deficientemente registrado — PBA. Sin SECLO, demanda directa. Multas Ley 24.013 + Ley 25.323.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Reconstruir historia laboral: fecha real, salario real, tareas', priority: 'crítico', bloqueante: true },
          { task: 'Comparar situación formal vs real', priority: 'crítico', bloqueante: true },
          { task: 'Identificar testigos y pruebas de la relación', priority: 'crítico', bloqueante: true },
          { task: 'Determinar si es no registrado total o parcial', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Prueba de la relación', required: true },
        ],
        milestone: 'Historia laboral reconstruida',
      },
      {
        name: 'Telegramas',
        tasks: [
          { task: 'Redactar TCL intimando registración', priority: 'crítico', bloqueante: true },
          { task: 'Enviar telegrama obrero', priority: 'crítico', bloqueante: true },
          { task: 'Aguardar respuesta / vencimiento de plazo', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Telegrama de intimación', required: true },
          { name: 'Acuse de recibo', required: true },
        ],
        milestone: 'Intimación enviada',
      },
      {
        name: 'Demanda directa',
        tasks: [
          { task: 'Redactar demanda con narrativa cronológica ante Tribunal del Trabajo', priority: 'crítico', bloqueante: true },
          { task: 'Incluir multas Ley 24.013 + Ley 25.323', priority: 'crítico', bloqueante: true },
          { task: 'Presentar con toda la prueba de la relación', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de demanda', required: true },
          { name: 'Liquidación con multas', required: true },
        ],
        milestone: 'Demanda presentada',
      },
      {
        name: 'Vista de causa',
        tasks: [
          { task: 'Producir prueba testimonial en audiencia oral', priority: 'crítico', bloqueante: true },
          { task: 'Solicitar informes a AFIP/ARCA y ANSES', priority: 'crítico', bloqueante: true },
        ],
        documents: [],
        milestone: 'Vista de causa celebrada',
      },
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Verificar sentencia del Tribunal', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia', required: true },
        ],
        milestone: 'Sentencia firme',
      },
      {
        name: 'Ejecución',
        tasks: [
          { task: 'Ejecutar sentencia y verificar cobro', priority: 'crítico', bloqueante: true },
          { task: 'Remitir informe a ARCA', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Cobro ejecutado',
      },
    ],
    checklistBase: [
      { task: 'Reconstruir historia laboral', priority: 'crítico' },
      { task: 'Enviar TCL intimando registración', priority: 'crítico' },
      { task: 'Calcular multas Ley 24.013', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Prueba de la relación', required: true },
      { name: 'Telegrama de intimación', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Telegramas', 'Demanda', 'Vista de causa', 'Sentencia', 'Cobro'],
    bloqueantesTipicos: ['Falta prueba de la relación', 'Testigos no identificados'],
    proximaAccionSugerida: 'Reconstruir historia laboral y reunir pruebas',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
  },

  // ─── ART / ACCIDENTES Y ENFERMEDADES — Carril LRT ────────
  {
    id: 'lab-art-caba',
    name: 'ART / Accidente laboral (CABA)',
    rama: 'Laboral',
    subtipo: 'ART / Accidente',
    jurisdiccion: 'CABA',
    via: 'Especial (LRT)',
    etapaInicial: 'Denuncia',
    descripcion: 'Accidente de trabajo o enfermedad profesional — Trámite ante ART y Comisión Médica. Carril separado (Ley 24.557 de Riesgos del Trabajo). No afectado directamente por cautelar Ley 27.802.',
    stages: [
      {
        name: 'Denuncia',
        tasks: [
          { task: 'Verificar denuncia ante la ART (o empleador autoasegurado)', priority: 'crítico', bloqueante: true },
          { task: 'Registrar fecha de denuncia y tipo de contingencia (accidente / enfermedad)', priority: 'crítico', bloqueante: true },
          { task: 'Obtener alta médica o constancia de tratamiento en curso', priority: 'crítico', bloqueante: true },
          { task: 'Recopilar estudios médicos e incapacidad determinada', priority: 'crítico', bloqueante: true },
          { task: 'Verificar si la ART rechazó el siniestro', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Denuncia ante ART', required: true },
          { name: 'Estudios médicos / historia clínica', required: true },
          { name: 'Certificado de alta médica o tratamiento', required: false },
          { name: 'Rechazo de ART (si existe)', required: false },
        ],
        milestone: 'Denuncia registrada y documentación médica completa',
      },
      {
        name: 'Comisión Médica',
        tasks: [
          { task: 'Determinar competencia: Comisión Médica jurisdiccional o Central', priority: 'crítico', bloqueante: true },
          { task: 'Presentar trámite ante Comisión Médica (SRT)', priority: 'crítico', bloqueante: true },
          { task: 'Asistir a audiencia médica con estudios completos', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar dictamen de incapacidad (% y prestaciones)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar incompatibilidades LCT/LRT si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Formulario de presentación ante Comisión Médica', required: true },
          { name: 'Dictamen de Comisión Médica', required: true },
        ],
        milestone: 'Dictamen de Comisión Médica obtenido',
      },
      {
        name: 'Recurso / Demanda',
        tasks: [
          { task: 'Evaluar estrategia: apelar dictamen vs demanda judicial directa', priority: 'crítico', bloqueante: true },
          { task: 'Si recurso: apelar ante Comisión Médica Central', priority: 'recomendado' },
          { task: 'Si demanda: redactar demanda por reparación integral (art. 1740 CCyCN)', priority: 'recomendado' },
          { task: 'Evaluar acumulación con reclamo LCT si hay despido', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Recurso o escrito de demanda', required: true },
        ],
        milestone: 'Vía elegida e iniciada',
      },
      {
        name: 'Resolución',
        tasks: [
          { task: 'Verificar resolución (dictamen final, sentencia o acuerdo)', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar prestaciones: ILP, ILT, prestaciones en especie', priority: 'crítico', bloqueante: true },
          { task: 'Verificar cobro de indemnización', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Resolución final / Sentencia', required: true },
          { name: 'Liquidación de prestaciones', required: true },
        ],
        milestone: 'Caso resuelto',
      },
    ],
    checklistBase: [
      { task: 'Verificar denuncia ante ART', priority: 'crítico' },
      { task: 'Reunir estudios médicos', priority: 'crítico' },
      { task: 'Tramitar Comisión Médica', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Denuncia ante ART', required: true },
      { name: 'Estudios médicos', required: true },
    ],
    hitosProyectados: ['Denuncia', 'Comisión Médica', 'Recurso/Demanda', 'Resolución'],
    bloqueantesTipicos: ['ART rechazó siniestro', 'Faltan estudios médicos', 'Comisión Médica pendiente'],
    proximaAccionSugerida: 'Verificar denuncia y reunir documentación médica',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  // ─── ART / ACCIDENTES — PBA (Tribunales del Trabajo, instancia única) ────
  {
    id: 'lab-art-pba',
    name: 'ART / Accidente laboral (PBA)',
    rama: 'Laboral',
    subtipo: 'ART / Accidente',
    jurisdiccion: 'PBA',
    via: 'Especial (LRT)',
    etapaInicial: 'Denuncia',
    descripcion: 'Accidente de trabajo o enfermedad profesional — PBA. Denuncia → Triage → Comisión Médica jurisdiccional → Post-dictamen → Revisión judicial ante Tribunal del Trabajo (instancia única, Ley 15.057). Ley 24.557 / Ley 27.348.',
    stages: [
      {
        name: 'Denuncia',
        tasks: [
          { task: 'Verificar denuncia ante la ART (o empleador autoasegurado)', priority: 'crítico', bloqueante: true },
          { task: 'Registrar fecha de denuncia y tipo de contingencia (accidente / enfermedad / in itinere)', priority: 'crítico', bloqueante: true },
          { task: 'Recopilar estudios médicos disponibles e historia clínica', priority: 'crítico', bloqueante: true },
          { task: 'Registrar estado actual del trabajador (en tratamiento, con alta, sin prestaciones, etc.)', priority: 'crítico', bloqueante: true },
          { task: 'Verificar si la ART aceptó, rechazó o no se expidió sobre el siniestro', priority: 'crítico', bloqueante: true },
          { task: 'Verificar si hubo ILT (incapacidad laboral temporaria) y si fue abonada', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Denuncia ante ART (formulario o constancia)', required: true },
          { name: 'Estudios médicos / historia clínica', required: true },
          { name: 'Recibos de sueldo (últimos 12 meses)', required: false },
          { name: 'Notificación de rechazo de ART (si existe)', required: false },
          { name: 'Constancia de ILT abonada o no abonada', required: false },
        ],
        milestone: 'Denuncia verificada y situación del trabajador documentada',
      },
      {
        name: 'Triage y clasificación',
        tasks: [
          { task: 'Clasificar tipo de trámite ante Comisión Médica', priority: 'crítico', bloqueante: true },
          { task: 'Determinar plazo aplicable según tipo de trámite (rechazo, divergencia, reingreso, etc.)', priority: 'crítico', bloqueante: true },
          { task: 'Determinar canal de inicio (SRT ventanilla única / presentación directa)', priority: 'crítico', bloqueante: true },
          { task: 'Verificar si requiere patrocinio letrado obligatorio', priority: 'crítico', bloqueante: true },
          { task: 'Identificar formulario correspondiente al tipo de trámite', priority: 'crítico', bloqueante: true },
          { task: 'Determinar Comisión Médica competente (por domicilio del trabajador o lugar del hecho)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar si corresponde acción civil por reparación integral como carril paralelo (art. 1740 CCyCN)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Formulario SRT según tipo de trámite', required: true },
          { name: 'Certificado médico actualizado', required: true },
          { name: 'Dictamen o informe previo de ART (si existe)', required: false },
        ],
        milestone: 'Trámite clasificado: tipo, plazo, canal, formulario y comisión médica definidos',
      },
      {
        name: 'Comisión Médica',
        tasks: [
          { task: 'Presentar trámite ante Comisión Médica jurisdiccional PBA', priority: 'crítico', bloqueante: true },
          { task: 'Verificar admisibilidad formal y sorteo de fecha de audiencia', priority: 'crítico', bloqueante: true },
          { task: 'Asistir a audiencia médica con estudios completos y patrocinio letrado', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar dictamen: % de incapacidad, prestaciones reconocidas, causalidad', priority: 'crítico', bloqueante: true },
          { task: 'Registrar si el dictamen es favorable, parcialmente favorable o desfavorable', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Formulario de presentación ante Comisión Médica', required: true },
          { name: 'Poder o carta poder para el letrado', required: true },
          { name: 'Estudios médicos actualizados para la audiencia', required: true },
          { name: 'Dictamen de Comisión Médica', required: true },
        ],
        milestone: 'Dictamen de Comisión Médica obtenido',
      },
      {
        name: 'Post-dictamen',
        tasks: [
          { task: 'Evaluar resultado del dictamen y definir estrategia (consentir, impugnar o recurrir)', priority: 'crítico', bloqueante: true },
          { task: 'Si consentir: verificar notificación a ART y plazo de pago de prestaciones', priority: 'recomendado' },
          { task: 'Si aclaratoria: presentar pedido de aclaratoria ante la misma Comisión Médica', priority: 'recomendado' },
          { task: 'Si rectificatoria: presentar pedido de rectificación por error material', priority: 'recomendado' },
          { task: 'Si revocatoria: presentar recurso de revocatoria ante la misma Comisión Médica', priority: 'recomendado' },
          { task: 'Si apelación: presentar recurso ante Comisión Médica Central (evaluar procedencia)', priority: 'recomendado' },
          { task: 'Si revisión judicial: preparar presentación ante Tribunal del Trabajo PBA', priority: 'recomendado' },
          { task: 'Verificar plazos de cada recurso y dejar constancia de notificación del dictamen', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Escrito de recurso elegido (aclaratoria / rectificatoria / revocatoria / apelación)', required: false },
          { name: 'Dictamen de Comisión Médica Central (si se apeló)', required: false },
          { name: 'Constancia de notificación del dictamen', required: true },
        ],
        milestone: 'Estrategia post-dictamen definida y ejecutada',
      },
      {
        name: 'Revisión judicial / acción laboral ordinaria PBA',
        tasks: [
          { task: 'Presentar recurso de revisión judicial ante Tribunal del Trabajo competente (Ley 15.057)', priority: 'crítico', bloqueante: true },
          { task: 'Preparar prueba para audiencia de vista de causa (instancia única)', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar acumulación con reclamo por despido o diferencias salariales si corresponde', priority: 'recomendado' },
          { task: 'Ofrecer pericia médica si se discute % de incapacidad', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de demanda / recurso de revisión ante Tribunal del Trabajo', required: true },
          { name: 'Cédula de notificación', required: true },
          { name: 'Ofrecimiento de prueba', required: true },
        ],
        milestone: 'Revisión judicial iniciada ante Tribunal del Trabajo PBA',
      },
      {
        name: 'Resolución',
        tasks: [
          { task: 'Verificar sentencia del Tribunal del Trabajo (instancia única)', priority: 'crítico', bloqueante: true },
          { task: 'Liquidar prestaciones: ILP, ILT, prestaciones en especie, intereses', priority: 'crítico', bloqueante: true },
          { task: 'Verificar cobro de indemnización / prestaciones', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recurso extraordinario ante SCBA si corresponde', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Sentencia del Tribunal del Trabajo', required: true },
          { name: 'Liquidación de prestaciones aprobada', required: true },
        ],
        milestone: 'Caso resuelto',
      },
    ],
    checklistBase: [
      { task: 'Verificar denuncia ante ART', priority: 'crítico' },
      { task: 'Clasificar tipo de trámite (triage)', priority: 'crítico' },
      { task: 'Reunir estudios médicos', priority: 'crítico' },
      { task: 'Tramitar Comisión Médica', priority: 'crítico' },
      { task: 'Definir estrategia post-dictamen', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Denuncia ante ART', required: true },
      { name: 'Estudios médicos', required: true },
      { name: 'Formulario SRT según tipo de trámite', required: true },
    ],
    hitosProyectados: ['Denuncia', 'Triage y clasificación', 'Comisión Médica', 'Post-dictamen', 'Revisión judicial PBA', 'Resolución'],
    bloqueantesTipicos: ['ART rechazó siniestro', 'Faltan estudios médicos', 'Comisión Médica pendiente', 'Plazo de recurso vencido', 'Dictamen desfavorable sin impugnación'],
    proximaAccionSugerida: 'Verificar denuncia y documentar situación del trabajador',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
  },

  // ─── SINDICAL / COLECTIVO ─────────────────────────────────
  {
    id: 'lab-sindical',
    name: 'Sindical / Colectivo',
    rama: 'Laboral',
    subtipo: 'Sindical',
    jurisdiccion: 'CABA',
    via: 'Especial',
    etapaInicial: 'Encuadre',
    descripcion: 'Conflicto sindical o colectivo: tutela sindical, prácticas desleales, asambleas, CCT. ⚠ CAUTELAR PARCIAL: normas sindicales de Ley 27.802 suspendidas. Alto riesgo normativo.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: 'Identificar sindicato con personería gremial y representación', priority: 'crítico', bloqueante: true },
          { task: 'Verificar si hay candidatura u oficialización pendiente', priority: 'crítico', bloqueante: true },
          { task: 'Determinar tipo de conflicto: tutela, práctica desleal, medida de fuerza', priority: 'crítico', bloqueante: true },
          { task: 'Revisar CCT vigente y ultraactividad', priority: 'recomendado' },
          { task: '⚠ Verificar estado cautelar de normas sindicales Ley 27.802', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Resolución de personería gremial del sindicato', required: true },
          { name: 'Acta de asamblea / elección (si aplica)', required: false },
          { name: 'CCT vigente', required: true },
        ],
        milestone: 'Conflicto encuadrado',
      },
      {
        name: 'Acción',
        tasks: [
          { task: 'Redactar escrito de exclusión de tutela o acción de amparo sindical', priority: 'crítico', bloqueante: true },
          { task: 'Presentar denuncia por práctica desleal si corresponde', priority: 'recomendado' },
          { task: 'Evaluar medida cautelar de no innovar / reinstalación', priority: 'recomendado' },
          { task: 'Mapear el conflicto colectivo y actores involucrados', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de acción sindical', required: true },
          { name: 'Medida cautelar (si se solicitó)', required: false },
        ],
        milestone: 'Acción sindical iniciada',
      },
      {
        name: 'Resolución',
        tasks: [
          { task: 'Verificar resolución judicial o administrativa', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recursos', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Resolución / Sentencia', required: true },
        ],
        milestone: 'Caso resuelto',
      },
    ],
    checklistBase: [
      { task: 'Verificar personería gremial', priority: 'crítico' },
      { task: 'Determinar tipo de conflicto', priority: 'crítico' },
      { task: 'Verificar estado cautelar Ley 27.802', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'Resolución de personería gremial', required: true },
      { name: 'CCT vigente', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Acción', 'Resolución'],
    bloqueantesTipicos: ['Normas sindicales bajo cautelar', 'Falta personería gremial'],
    proximaAccionSugerida: 'Encuadrar conflicto y verificar estado cautelar',
    fechaSeguimientoSugeridaDays: 3,
    prioridadSugerida: 'Alta',
    notasOperativas: '⚠ CAUTELAR: Normas sindicales de Ley 27.802 suspendidas. Alto riesgo normativo. Implementar cuando se estabilice la jurisprudencia.',
  },

  // ─── PLATAFORMAS DIGITALES (Título XII Ley 27.802) ────────
  {
    id: 'lab-plataformas',
    name: 'Plataformas digitales',
    rama: 'Laboral',
    subtipo: 'Plataformas',
    jurisdiccion: 'CABA',
    via: 'Especial',
    etapaInicial: 'Encuadre',
    descripcion: 'Trabajadores de plataformas digitales (movilidad/reparto) — Título XII Ley 27.802. ⚠ CAUTELAR PARCIAL: todo el Título XII suspendido. Evaluar si aplica régimen de dependencia clásica.',
    stages: [
      {
        name: 'Encuadre',
        tasks: [
          { task: '⚠ Verificar estado cautelar del Título XII Ley 27.802 (plataformas)', priority: 'crítico', bloqueante: true },
          { task: 'Clasificar: ¿régimen plataformas (Ley 27.802) o dependencia clásica (LCT)?', priority: 'crítico', bloqueante: true },
          { task: 'Identificar tipo de plataforma: movilidad o reparto', priority: 'crítico', bloqueante: true },
          { task: 'Verificar libertad de conexión real vs control de la plataforma', priority: 'crítico', bloqueante: true },
          { task: 'Recopilar logs de conexión, pagos y comunicaciones de la app', priority: 'crítico', bloqueante: true },
          { task: 'Detectar desvíos de independencia (exclusividad, sanciones, control)', priority: 'recomendado' },
        ],
        documents: [
          { name: 'DNI del trabajador', required: true },
          { name: 'Capturas de la app (pagos, conexión, mensajes)', required: true },
          { name: 'Términos y condiciones de la plataforma', required: true },
          { name: 'Constancia de seguro de accidentes (si existe)', required: false },
        ],
        milestone: 'Clasificación del vínculo definida',
      },
      {
        name: 'Reclamo',
        tasks: [
          { task: 'Si dependencia clásica: seguir flujo de Despido CABA o PBA', priority: 'recomendado' },
          { task: 'Si régimen plataformas: evaluar reclamo por suspensión de cuenta', priority: 'recomendado' },
          { task: 'Redactar intimación / demanda según encuadre elegido', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar riesgos regulatorios por estado cautelar', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Escrito de reclamo / demanda', required: true },
        ],
        milestone: 'Reclamo iniciado',
      },
      {
        name: 'Resolución',
        tasks: [
          { task: 'Verificar resolución', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar precedentes judiciales sobre plataformas', priority: 'recomendado' },
        ],
        documents: [
          { name: 'Resolución / Sentencia', required: true },
        ],
        milestone: 'Caso resuelto',
      },
    ],
    checklistBase: [
      { task: 'Verificar cautelar Título XII', priority: 'crítico' },
      { task: 'Clasificar vínculo: plataforma vs dependencia', priority: 'crítico' },
      { task: 'Reunir logs de conexión', priority: 'crítico' },
    ],
    documentosBase: [
      { name: 'DNI del trabajador', required: true },
      { name: 'Capturas de la app', required: true },
      { name: 'TyC de la plataforma', required: true },
    ],
    hitosProyectados: ['Encuadre', 'Reclamo', 'Resolución'],
    bloqueantesTipicos: ['Título XII bajo cautelar total', 'Clasificación incierta', 'Falta logs de conexión'],
    proximaAccionSugerida: 'Verificar estado cautelar y clasificar vínculo',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Media',
    notasOperativas: '⚠ CAUTELAR: Todo el Título XII de Ley 27.802 está suspendido. Si el trabajador funciona como dependiente clásico, reconducir al flujo de Despido. Implementar régimen específico cuando se estabilice.',
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

  // ═══════════════════════════════════════════════════════════
  // CÁMARA / APELACIÓN — sub-proceso de segunda instancia (GAP 4)
  // Auto-aplicado al crear sub-proceso con kind='apelacion'.
  // Etapas: Agravios → Traslado → Elevación → Autos → Sentencia → Devolución.
  // Aplica a CUALQUIER rama (familia, civil, comercial, daños) — el flow
  // de Cámara es el mismo. Por eso rama='Familia' es nominal y findTemplate
  // se resuelve directo por id desde handleCreateSubProceso.
  // ═══════════════════════════════════════════════════════════
  {
    id: 'cam-apelacion-civil',
    name: 'Apelación (Cámara)',
    rama: 'Familia',
    subtipo: 'Apelación',
    jurisdiccion: 'CABA',
    via: 'Ordinaria',
    etapaInicial: 'Agravios',
    descripcion: 'Sub-proceso de segunda instancia. Cubre el ciclo desde la concesión del recurso hasta la devolución a primera instancia. Reusable para cualquier rama (civil, familia, comercial, daños).',
    stages: [
      // ── ETAPA 1: AGRAVIOS ────────────────────────────────────
      {
        name: 'Agravios',
        tasks: [
          { task: 'Estudiar sentencia y aspectos apelables', priority: 'crítico', bloqueante: true },
          { task: 'Identificar errores in iudicando / in procedendo', priority: 'crítico' },
          { task: 'Redactar expresión de agravios', priority: 'crítico', bloqueante: true },
          { task: 'Verificar plazo de fundamentación (5/10 días según recurso)', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Expresión de agravios', required: true },
        ],
        milestone: 'Agravios presentados',
      },
      // ── ETAPA 2: TRASLADO ────────────────────────────────────
      {
        name: 'Traslado',
        tasks: [
          { task: 'Notificar agravios a la contraria', priority: 'crítico' },
          { task: 'Recibir contestación de agravios (10 días art. 259 CPCCN / 254 CPCC PBA)', priority: 'recomendado' },
          { task: 'Evaluar si replicar (sólo en hechos nuevos)', priority: 'opcional' },
        ],
        documents: [
          { name: 'Contestación de agravios (de la contraria)', required: false },
        ],
        milestone: 'Traslado contestado',
      },
      // ── ETAPA 3: ELEVACIÓN ───────────────────────────────────
      {
        name: 'Elevación',
        tasks: [
          { task: 'Verificar elevación a Cámara', priority: 'crítico' },
          { task: 'Solicitar copias / verificar foliatura', priority: 'recomendado' },
          { task: 'Tomar nota de Sala asignada y juzgado de Cámara', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Expediente elevado',
      },
      // ── ETAPA 4: AUTOS EN CÁMARA ─────────────────────────────
      {
        name: 'Autos',
        tasks: [
          { task: 'Notificación de autos en Cámara', priority: 'crítico' },
          { task: 'Plazo de aclaraciones u observaciones (3 días)', priority: 'opcional' },
          { task: 'Esperar sorteo y vocal preopinante', priority: 'opcional' },
        ],
        documents: [],
        milestone: 'Autos para sentencia (Cámara)',
      },
      // ── ETAPA 5: SENTENCIA ───────────────────────────────────
      {
        name: 'Sentencia',
        tasks: [
          { task: 'Notificarse de la sentencia de Cámara', priority: 'crítico', bloqueante: true },
          { task: 'Evaluar recurso extraordinario federal (10 días art. 257 CPCCN)', priority: 'crítico' },
          { task: 'Evaluar aclaratoria si hay error material (3 días)', priority: 'opcional' },
          { task: 'Comunicar resultado al cliente', priority: 'crítico', bloqueante: true },
        ],
        documents: [
          { name: 'Sentencia de Cámara', required: true },
        ],
        milestone: 'Sentencia de Cámara dictada',
      },
      // ── ETAPA 6: DEVOLUCIÓN ──────────────────────────────────
      {
        name: 'Devolución',
        tasks: [
          { task: 'Verificar devolución del expediente a primera instancia', priority: 'recomendado' },
          { task: 'Cerrar el sub-proceso de apelación', priority: 'recomendado' },
        ],
        documents: [],
        milestone: 'Apelación cerrada',
      },
    ],
    checklistBase: [
      { task: 'Estudiar sentencia apelada', priority: 'crítico' },
      { task: 'Redactar expresión de agravios', priority: 'crítico' },
      { task: 'Recibir y estudiar contestación', priority: 'recomendado' },
      { task: 'Notificarse de sentencia de Cámara', priority: 'crítico' },
      { task: 'Evaluar recurso extraordinario federal', priority: 'recomendado' },
    ],
    documentosBase: [
      { name: 'Expresión de agravios', required: true },
      { name: 'Sentencia de Cámara', required: true },
    ],
    hitosProyectados: ['Agravios presentados', 'Traslado contestado', 'Expediente elevado', 'Autos para sentencia', 'Sentencia de Cámara', 'Apelación cerrada'],
    bloqueantesTipicos: ['Vencimiento del plazo de fundamentación', 'Falta sorteo de Sala', 'Demora en sentencia de Cámara'],
    proximaAccionSugerida: 'Redactar expresión de agravios',
    fechaSeguimientoSugeridaDays: 5,
    prioridadSugerida: 'Alta',
    notasOperativas: 'Sub-proceso reusable para cualquier rama. Las etapas siguen el ciclo del CPCCN/CPCC PBA. Si la apelación es PBA, los plazos del juicio sumario son distintos — el motor de plazos los resuelve por la jurisdicción y tipo_proceso del padre.',
  },
];

/** Find template by rama + subtipo (case-insensitive partial match).
 *  Para Laboral, el parámetro `jurisdiccion` (CABA/PBA) determina qué
 *  variante del template se usa, ya que el flujo procesal difiere. */
export function findTemplate(rama: string, subtipo?: string, jurisdiccion?: string): MatterTemplate | undefined {
  if (subtipo) {
    const sub = subtipo.toLowerCase();
    // Si hay jurisdicción, buscar match exacto (rama + subtipo + jurisdiccion)
    if (jurisdiccion) {
      const jur = jurisdiccion.toUpperCase().includes('PBA') || jurisdiccion.toLowerCase().includes('provincia')
        ? 'PBA' : jurisdiccion.toUpperCase();
      const exactMatch = MATTER_TEMPLATES.find(
        t => t.rama === rama
          && t.subtipo.toLowerCase().includes(sub)
          && t.jurisdiccion === jur
      );
      if (exactMatch) return exactMatch;
    }
    // Sin jurisdicción: primer match por rama + subtipo
    const match = MATTER_TEMPLATES.find(
      t => t.rama === rama && t.subtipo.toLowerCase().includes(sub)
    );
    if (match) return match;
  }
  // Fallback: first template for that rama
  return MATTER_TEMPLATES.find(t => t.rama === rama);
}

/** Subtypes available per matter type, derived from templates.
 *  Labels are clean (sin jurisdicción), deduplicados por subtipo. */
export const SUBTYPES_BY_TYPE: Record<string, { value: string; label: string }[]> =
  MATTER_TEMPLATES.reduce((acc, t) => {
    if (!acc[t.rama]) acc[t.rama] = [];
    if (!acc[t.rama].find(s => s.value === t.subtipo)) {
      acc[t.rama].push({ value: t.subtipo, label: t.subtipo });
    }
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);

/** Jurisdicciones disponibles por rama, derivadas de templates.
 *  Solo se incluyen ramas que tienen más de una jurisdicción. */
export const JURISDICTIONS_BY_TYPE: Record<string, string[]> =
  MATTER_TEMPLATES.reduce((acc, t) => {
    if (!acc[t.rama]) acc[t.rama] = [];
    if (!acc[t.rama].includes(t.jurisdiccion)) {
      acc[t.rama].push(t.jurisdiccion);
    }
    return acc;
  }, {} as Record<string, string[]>);

/** Subtipos disponibles para una rama+jurisdicción específica */
export function getSubtypesForJurisdiction(rama: string, jurisdiccion: string): { value: string; label: string }[] {
  const seen = new Set<string>();
  const result: { value: string; label: string }[] = [];
  for (const t of MATTER_TEMPLATES) {
    if (t.rama === rama && t.jurisdiccion === jurisdiccion && !seen.has(t.subtipo)) {
      seen.add(t.subtipo);
      result.push({ value: t.subtipo, label: t.subtipo });
    }
  }
  return result;
}

/* ═══════════════════════════════════════════════════════════
   WIZARD FIELDS — Campos específicos por materia
   Cada template puede definir secciones de datos que se piden
   en el wizard de alta según la materia seleccionada.
   ═══════════════════════════════════════════════════════════ */

export interface WizardFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea' | 'repeatable' | 'domicilio';
  placeholder?: string;
  options?: string[];      // for select type
  required?: boolean;
  subFields?: WizardFieldDef[];  // for repeatable type — defines fields per item
  addLabel?: string;             // for repeatable type — button label e.g. "Agregar hijo"
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
        { key: 'conyuge1_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Apellido, Nombre', required: true },
        { key: 'conyuge1_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'conyuge1_domicilio', label: 'Domicilio actual', type: 'domicilio' },
      ],
    },
    // GAP UX-3: la sección "Datos del Otro Cónyuge" se movió al Step 1
    // del wizard de creación (CrearAsunto.tsx). Se piden junto al cliente
    // porque en presentación conjunta el cónyuge 2 es co-presentante.
    {
      title: 'Situación',
      icon: 'FileText',
      fields: [
        // GAP UX-2: tipo_divorcio movido al Step 1 del wizard de creación
        // (decisión estructural — define todo el flujo). Se pregunta en
        // CrearAsunto.tsx con UI dedicada al lado de "Materia: Divorcio".
        { key: 'fecha_matrimonio', label: 'Fecha de matrimonio (si la sabe)', type: 'date' },
        { key: 'hijos_menores', label: 'Cantidad de hijos menores', type: 'number', placeholder: '0' },
        { key: 'bienes_gananciales', label: '¿Hay bienes gananciales a liquidar?', type: 'select', options: ['Sí', 'No', 'Por determinar'] },
        { key: 'hay_urgencia', label: '¿Hay urgencia o violencia?', type: 'select', options: ['No', 'Sí — denuncia/medida vigente', 'Sí — sin denuncia aún'] },
        { key: 'urgencia_detalle', label: 'Detalle de urgencia (si corresponde)', type: 'textarea', placeholder: 'Describir brevemente la situación de urgencia...' },
      ],
    },
  ],

  'fam-divorcio-pba': [
    {
      title: 'Datos del Cónyuge (Cliente)',
      icon: 'User',
      fields: [
        { key: 'conyuge1_nombre', label: 'Nombre completo', type: 'text', placeholder: 'Apellido, Nombre', required: true },
        { key: 'conyuge1_dni', label: 'DNI', type: 'text', placeholder: '12.345.678' },
        { key: 'conyuge1_domicilio', label: 'Domicilio actual', type: 'domicilio' },
      ],
    },
    // GAP UX-3: la sección "Datos del Otro Cónyuge" se movió al Step 1
    // del wizard de creación (CrearAsunto.tsx).
    {
      title: 'Situación',
      icon: 'FileText',
      fields: [
        // GAP UX-2: tipo_divorcio movido al Step 1 del wizard de creación
        // (decisión estructural — define todo el flujo). Se pregunta en
        // CrearAsunto.tsx con UI dedicada al lado de "Materia: Divorcio".
        { key: 'fecha_matrimonio', label: 'Fecha de matrimonio (si la sabe)', type: 'date' },
        { key: 'hijos_menores', label: 'Cantidad de hijos menores', type: 'number', placeholder: '0' },
        { key: 'bienes_gananciales', label: '¿Hay bienes gananciales a liquidar?', type: 'select', options: ['Sí', 'No', 'Por determinar'] },
        { key: 'departamento_judicial', label: 'Departamento judicial', type: 'select', options: ['La Plata', 'Lomas de Zamora', 'San Martín', 'San Isidro', 'Morón', 'Mercedes', 'Quilmes', 'La Matanza', 'Bahía Blanca', 'Mar del Plata', 'Junín', 'Pergamino', 'Necochea', 'Azul', 'Dolores', 'San Nicolás', 'Zárate-Campana', 'Trenque Lauquen', 'Otro'], required: true },
        { key: 'hay_urgencia', label: '¿Hay urgencia o violencia?', type: 'select', options: ['No', 'Sí — denuncia/medida vigente', 'Sí — sin denuncia aún'] },
        { key: 'urgencia_detalle', label: 'Detalle de urgencia (si corresponde)', type: 'textarea', placeholder: 'Describir brevemente la situación de urgencia...' },
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
        { key: 'alimentante_domicilio', label: 'Domicilio conocido', type: 'domicilio' },
        { key: 'alimentante_empleador', label: 'Empleador / Actividad', type: 'text', placeholder: 'Empresa o actividad independiente' },
        { key: 'alimentante_ingreso_estimado', label: 'Ingreso mensual estimado', type: 'money' },
      ],
    },
    {
      title: 'Situación Actual',
      icon: 'FileText',
      fields: [
        { key: 'tipo_alimentos', label: 'Tipo de alimentos', type: 'select', options: ['Para hijos menores', 'Para hijos mayores (hasta 25)', 'Para cónyuge', 'Para parientes'], required: true },
        { key: 'paga_actualmente', label: '¿Paga algo actualmente?', type: 'select', options: ['Sí, cuota regular', 'Sí, montos irregulares', 'No paga nada'] },
        { key: 'monto_actual', label: 'Monto actual (si paga)', type: 'money' },
        { key: 'gastos_mensuales', label: 'Total de gastos mensuales del menor', type: 'money' },
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
        { key: 'otro_progenitor_domicilio', label: 'Domicilio', type: 'domicilio' },
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
        { key: 'otro_progenitor_domicilio', label: 'Domicilio', type: 'domicilio' },
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
        { key: 'progenitor_domicilio', label: 'Domicilio conocido', type: 'domicilio' },
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
        { key: 'victima_domicilio', label: 'Domicilio actual', type: 'domicilio', required: true },
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
        { key: 'agresor_domicilio', label: 'Domicilio', type: 'domicilio' },
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
        { key: 'adoptante_domicilio', label: 'Domicilio', type: 'domicilio', required: true },
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

  // ─── LABORAL: Secciones comunes reutilizadas por template ID ───

  'lab-despido-caba': [
    {
      title: 'Jurisdicción y Encuadre',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
        { key: 'clasificacion_vinculo', label: 'Clasificación del vínculo', type: 'select', options: ['Dependiente clásico', 'Tercerización / solidaridad', 'Grupo económico', 'Borderline (a determinar)'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'domicilio' },
        { key: 'categoria', label: 'Categoría laboral (según CCT)', type: 'text', placeholder: 'Ej: Administrativo A...' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio legal (CABA)', type: 'domicilio', required: true },
        { key: 'empleador_actividad', label: 'Actividad principal', type: 'text' },
        { key: 'tipo_empresa', label: 'Tipo de empresa', type: 'select', options: ['Gran empresa', 'MIPYME'] },
      ],
    },
    {
      title: 'Datos de la Relación Laboral',
      icon: 'Briefcase',
      fields: [
        { key: 'fecha_ingreso', label: 'Fecha real de ingreso', type: 'date', required: true },
        { key: 'fecha_ingreso_registrada', label: 'Fecha registrada en ARCA (si difiere)', type: 'date' },
        { key: 'fecha_egreso', label: 'Fecha de egreso', type: 'date', required: true },
        { key: 'tipo_despido', label: 'Tipo de extinción', type: 'select', options: ['Despido sin causa', 'Despido con causa controvertida', 'Despido indirecto', 'Mutuo acuerdo (art. 241)', 'Renuncia forzada'], required: true },
        { key: 'remuneracion', label: 'Mejor remuneración mensual, normal y habitual', type: 'money' },
        { key: 'remuneracion_registrada', label: 'Remuneración registrada en recibo (si difiere)', type: 'money' },
        { key: 'registrado', label: '¿Estaba correctamente registrado?', type: 'select', options: ['Sí, correctamente', 'Parcialmente (fecha o sueldo adulterado)', 'No registrado (en negro)'], required: true },
        { key: 'cct', label: 'Convenio colectivo aplicable', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
  ],

  'lab-despido-pba': [
    {
      title: 'Jurisdicción y Encuadre',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
        { key: 'clasificacion_vinculo', label: 'Clasificación del vínculo', type: 'select', options: ['Dependiente clásico', 'Tercerización / solidaridad', 'Grupo económico', 'Borderline (a determinar)'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'domicilio' },
        { key: 'categoria', label: 'Categoría laboral (según CCT)', type: 'text', placeholder: 'Ej: Administrativo A...' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio legal (Provincia de Buenos Aires)', type: 'domicilio', required: true },
        { key: 'empleador_actividad', label: 'Actividad principal', type: 'text' },
        { key: 'tipo_empresa', label: 'Tipo de empresa', type: 'select', options: ['Gran empresa', 'MIPYME'] },
      ],
    },
    {
      title: 'Datos de la Relación Laboral',
      icon: 'Briefcase',
      fields: [
        { key: 'fecha_ingreso', label: 'Fecha real de ingreso', type: 'date', required: true },
        { key: 'fecha_ingreso_registrada', label: 'Fecha registrada en ARCA (si difiere)', type: 'date' },
        { key: 'fecha_egreso', label: 'Fecha de egreso', type: 'date', required: true },
        { key: 'tipo_despido', label: 'Tipo de extinción', type: 'select', options: ['Despido sin causa', 'Despido con causa controvertida', 'Despido indirecto', 'Mutuo acuerdo (art. 241)', 'Renuncia forzada'], required: true },
        { key: 'remuneracion', label: 'Mejor remuneración mensual, normal y habitual', type: 'money' },
        { key: 'remuneracion_registrada', label: 'Remuneración registrada en recibo (si difiere)', type: 'money' },
        { key: 'registrado', label: '¿Estaba correctamente registrado?', type: 'select', options: ['Sí, correctamente', 'Parcialmente (fecha o sueldo adulterado)', 'No registrado (en negro)'], required: true },
        { key: 'cct', label: 'Convenio colectivo aplicable', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
  ],

  'lab-diferencias-caba': [
    {
      title: 'Jurisdicción',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'categoria', label: 'Categoría laboral', type: 'text' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio legal', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos de las Diferencias',
      icon: 'Briefcase',
      fields: [
        { key: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', required: true },
        { key: 'relacion_vigente', label: '¿La relación está vigente?', type: 'select', options: ['Sí, aún trabaja', 'No, ya fue despedido/renunció'], required: true },
        { key: 'remuneracion_actual', label: 'Remuneración actual/última', type: 'money' },
        { key: 'remuneracion_segun_cct', label: 'Remuneración según CCT', type: 'money' },
        { key: 'tipo_diferencia', label: 'Tipo de diferencia', type: 'select', options: ['Salario básico inferior al CCT', 'Horas extra no pagadas', 'Ítems no remunerativos fraudulentos', 'Ius variandi (cambio de funciones/horario)', 'Múltiples'], required: true },
        { key: 'periodo_reclamo', label: 'Período reclamado', type: 'text', placeholder: 'Ej: Enero 2024 a Diciembre 2025' },
        { key: 'cct', label: 'CCT aplicable', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
  ],

  'lab-diferencias-pba': [
    {
      title: 'Jurisdicción',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'categoria', label: 'Categoría laboral', type: 'text' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio legal (PBA)', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos de las Diferencias',
      icon: 'Briefcase',
      fields: [
        { key: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date', required: true },
        { key: 'relacion_vigente', label: '¿La relación está vigente?', type: 'select', options: ['Sí, aún trabaja', 'No, ya fue despedido/renunció'], required: true },
        { key: 'remuneracion_actual', label: 'Remuneración actual/última', type: 'money' },
        { key: 'remuneracion_segun_cct', label: 'Remuneración según CCT', type: 'money' },
        { key: 'tipo_diferencia', label: 'Tipo de diferencia', type: 'select', options: ['Salario básico inferior al CCT', 'Horas extra no pagadas', 'Ítems no remunerativos fraudulentos', 'Ius variandi', 'Múltiples'], required: true },
        { key: 'periodo_reclamo', label: 'Período reclamado', type: 'text', placeholder: 'Ej: Enero 2024 a Diciembre 2025' },
        { key: 'cct', label: 'CCT aplicable', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
  ],

  'lab-no-registrado-caba': [
    {
      title: 'Jurisdicción',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social / Nombre', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT (si se conoce)', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio conocido', type: 'domicilio' },
        { key: 'empleador_actividad', label: 'Actividad', type: 'text' },
      ],
    },
    {
      title: 'Situación de Registro',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_no_registro', label: 'Tipo de defecto', type: 'select', options: ['Totalmente no registrado (en negro)', 'Fecha de ingreso adulterada', 'Salario registrado inferior al real', 'Categoría inferior a la real', 'Múltiples defectos'], required: true },
        { key: 'fecha_ingreso_real', label: 'Fecha real de ingreso', type: 'date', required: true },
        { key: 'fecha_ingreso_registrada', label: 'Fecha registrada (si existe)', type: 'date' },
        { key: 'salario_real', label: 'Salario real percibido', type: 'money', required: true },
        { key: 'salario_registrado', label: 'Salario registrado (si existe)', type: 'money' },
        { key: 'tiene_recibos', label: '¿Tiene recibos de sueldo?', type: 'select', options: ['Sí, todos', 'Algunos', 'Ninguno'] },
        { key: 'prueba_disponible', label: 'Prueba de la relación disponible', type: 'textarea', placeholder: 'Ej: chats de WhatsApp, emails, testigos, fotos, transferencias bancarias...' },
      ],
    },
  ],

  'lab-no-registrado-pba': [
    {
      title: 'Jurisdicción',
      icon: 'Scale',
      fields: [
        { key: 'jurisdiccion_laboral', label: 'Jurisdicción', type: 'select', options: ['CABA', 'Provincia de Buenos Aires'], required: true },
      ],
    },
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Empleador',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social / Nombre', type: 'text', required: true },
        { key: 'empleador_cuit', label: 'CUIT (si se conoce)', type: 'text', placeholder: '30-12345678-9' },
        { key: 'empleador_domicilio', label: 'Domicilio conocido (PBA)', type: 'domicilio' },
        { key: 'empleador_actividad', label: 'Actividad', type: 'text' },
      ],
    },
    {
      title: 'Situación de Registro',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_no_registro', label: 'Tipo de defecto', type: 'select', options: ['Totalmente no registrado (en negro)', 'Fecha de ingreso adulterada', 'Salario registrado inferior al real', 'Categoría inferior a la real', 'Múltiples defectos'], required: true },
        { key: 'fecha_ingreso_real', label: 'Fecha real de ingreso', type: 'date', required: true },
        { key: 'fecha_ingreso_registrada', label: 'Fecha registrada (si existe)', type: 'date' },
        { key: 'salario_real', label: 'Salario real percibido', type: 'money', required: true },
        { key: 'salario_registrado', label: 'Salario registrado (si existe)', type: 'money' },
        { key: 'tiene_recibos', label: '¿Tiene recibos de sueldo?', type: 'select', options: ['Sí, todos', 'Algunos', 'Ninguno'] },
        { key: 'prueba_disponible', label: 'Prueba de la relación disponible', type: 'textarea', placeholder: 'Ej: chats, emails, testigos, fotos, transferencias...' },
      ],
    },
  ],

  'lab-art-caba': [
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Empleador y ART',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social del empleador', type: 'text', required: true },
        { key: 'art_nombre', label: 'ART (aseguradora de riesgos)', type: 'text', required: true },
        { key: 'art_nro_siniestro', label: 'Nro. de siniestro', type: 'text' },
        { key: 'empleador_autoasegurado', label: '¿Empleador autoasegurado?', type: 'select', options: ['No', 'Sí'] },
      ],
    },
    {
      title: 'Datos del Accidente / Enfermedad',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_contingencia', label: 'Tipo de contingencia', type: 'select', options: ['Accidente de trabajo', 'Accidente in itinere', 'Enfermedad profesional'], required: true },
        { key: 'fecha_siniestro', label: 'Fecha del siniestro / primera manifestación', type: 'date', required: true },
        { key: 'descripcion_siniestro', label: 'Descripción del siniestro', type: 'textarea', placeholder: 'Qué pasó, dónde, cómo...', required: true },
        { key: 'lesiones', label: 'Lesiones / diagnóstico', type: 'textarea', placeholder: 'Descripción de lesiones o enfermedad...' },
        { key: 'incapacidad_porcentaje', label: 'Incapacidad determinada (%)', type: 'text', placeholder: 'Si se determinó...' },
        { key: 'art_rechazo', label: '¿La ART rechazó el siniestro?', type: 'select', options: ['No', 'Sí, rechazó', 'Parcialmente (reconoció menor incapacidad)'] },
        { key: 'alta_medica', label: 'Estado del alta médica', type: 'select', options: ['En tratamiento', 'Alta médica con incapacidad', 'Alta médica sin incapacidad', 'Pendiente'] },
      ],
    },
  ],

  'lab-art-pba': [
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
        { key: 'trabajador_domicilio', label: 'Domicilio (PBA)', type: 'domicilio', required: true },
      ],
    },
    {
      title: 'Datos del Empleador y ART',
      icon: 'Building2',
      fields: [
        { key: 'empleador_nombre', label: 'Razón social del empleador', type: 'text', required: true },
        { key: 'art_nombre', label: 'ART (aseguradora de riesgos)', type: 'text', required: true },
        { key: 'art_nro_siniestro', label: 'Nro. de siniestro', type: 'text' },
        { key: 'empleador_autoasegurado', label: '¿Empleador autoasegurado?', type: 'select', options: ['No', 'Sí'] },
      ],
    },
    {
      title: 'Datos del Accidente / Enfermedad',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_contingencia', label: 'Tipo de contingencia', type: 'select', options: ['Accidente de trabajo', 'Accidente in itinere', 'Enfermedad profesional'], required: true },
        { key: 'fecha_siniestro', label: 'Fecha del siniestro / primera manifestación', type: 'date', required: true },
        { key: 'descripcion_siniestro', label: 'Descripción del siniestro', type: 'textarea', placeholder: 'Qué pasó, dónde, cómo...', required: true },
        { key: 'lesiones', label: 'Lesiones / diagnóstico', type: 'textarea', placeholder: 'Descripción de lesiones o enfermedad...' },
        { key: 'incapacidad_porcentaje', label: 'Incapacidad determinada (%)', type: 'text', placeholder: 'Si ya se determinó...' },
        { key: 'estado_trabajador', label: 'Situación actual del trabajador', type: 'select', options: ['En tratamiento por ART', 'Alta médica otorgada', 'Sin prestaciones / ART no responde', 'Rechazado por ART', 'Reingreso a tratamiento solicitado'], required: true },
      ],
    },
    {
      title: 'Clasificación del trámite (Triage)',
      icon: 'Target',
      fields: [
        { key: 'tipo_tramite_art', label: 'Tipo de trámite ante Comisión Médica', type: 'select', options: ['Rechazo de contingencia', 'Enfermedad no listada (Baremo)', 'Divergencia en alta médica', 'Divergencia en prestaciones', 'Reingreso a tratamiento', 'Divergencia en grado de incapacidad'], required: true },
        { key: 'art_rechazo_detalle', label: 'Detalle del rechazo o divergencia', type: 'textarea', placeholder: 'Qué rechazó o en qué difieren...' },
      ],
    },
  ],

  'lab-sindical': [
    {
      title: 'Datos del Trabajador / Representante',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'cargo_sindical', label: 'Cargo sindical (si aplica)', type: 'text', placeholder: 'Delegado, Secretario, Candidato...' },
      ],
    },
    {
      title: 'Datos del Sindicato',
      icon: 'Building2',
      fields: [
        { key: 'sindicato_nombre', label: 'Nombre del sindicato', type: 'text', required: true },
        { key: 'sindicato_personeria', label: '¿Tiene personería gremial?', type: 'select', options: ['Sí', 'No, solo inscripción simple'], required: true },
        { key: 'cct_vigente', label: 'CCT vigente', type: 'text', placeholder: 'CCT Nº...' },
      ],
    },
    {
      title: 'Datos del Conflicto',
      icon: 'AlertCircle',
      fields: [
        { key: 'tipo_conflicto', label: 'Tipo de conflicto', type: 'select', options: ['Exclusión de tutela sindical', 'Práctica desleal del empleador', 'Práctica desleal del sindicato', 'Medida de fuerza / huelga', 'Elecciones sindicales', 'Negociación colectiva / CCT', 'Otro'], required: true },
        { key: 'tutela_vigente', label: '¿Hay tutela sindical vigente?', type: 'select', options: ['Sí, delegado electo', 'Sí, candidato oficializado', 'No', 'Por determinar'] },
        { key: 'medida_vigente', label: '¿Hay medida cautelar vigente?', type: 'select', options: ['Sí', 'No'] },
        { key: 'descripcion_conflicto', label: 'Descripción del conflicto', type: 'textarea', placeholder: 'Resumen de la situación...', required: true },
      ],
    },
  ],

  'lab-plataformas': [
    {
      title: 'Datos del Trabajador',
      icon: 'User',
      fields: [
        { key: 'trabajador_nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'trabajador_dni', label: 'DNI', type: 'text', required: true },
        { key: 'trabajador_cuil', label: 'CUIL', type: 'text', placeholder: '20-12345678-9' },
      ],
    },
    {
      title: 'Datos de la Plataforma',
      icon: 'Building2',
      fields: [
        { key: 'plataforma_nombre', label: 'Nombre de la plataforma', type: 'text', required: true, placeholder: 'Ej: Rappi, PedidosYa, Uber, Cabify...' },
        { key: 'tipo_plataforma', label: 'Tipo de plataforma', type: 'select', options: ['Reparto / delivery', 'Movilidad / transporte', 'Servicios profesionales', 'Otro'], required: true },
        { key: 'razon_social', label: 'Razón social (si se conoce)', type: 'text' },
      ],
    },
    {
      title: 'Situación del Vínculo',
      icon: 'AlertCircle',
      fields: [
        { key: 'libertad_conexion', label: '¿Tiene libertad de conexión real?', type: 'select', options: ['Sí, se conecta cuando quiere', 'Parcial (penalizaciones por no conectarse)', 'No, horarios obligatorios'], required: true },
        { key: 'exclusividad', label: '¿Trabaja en exclusiva para esta plataforma?', type: 'select', options: ['Sí', 'No, usa varias plataformas'] },
        { key: 'motivo_reclamo', label: 'Motivo del reclamo', type: 'select', options: ['Suspensión / bloqueo de cuenta', 'Despido encubierto (baja de la app)', 'Reclamo salarial / tarifario', 'Accidente de trabajo sin cobertura', 'Reconocimiento de relación de dependencia', 'Otro'], required: true },
        { key: 'cuenta_suspendida', label: '¿Le suspendieron la cuenta?', type: 'select', options: ['Sí', 'No'] },
        { key: 'tiene_seguro_accidentes', label: '¿Tiene seguro de accidentes?', type: 'select', options: ['Sí, provisto por la plataforma', 'Sí, propio', 'No'] },
        { key: 'descripcion_situacion', label: 'Descripción de la situación', type: 'textarea', placeholder: 'Resumen de la situación y evidencia disponible...' },
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
        { key: 'contraparte_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Contrato',
      icon: 'FileText',
      fields: [
        { key: 'tipo_contrato', label: 'Tipo de contrato', type: 'text', placeholder: 'Ej: Compraventa, Locación, Servicios...', required: true },
        { key: 'fecha_contrato', label: 'Fecha del contrato', type: 'date' },
        { key: 'objeto_contrato', label: 'Objeto del contrato', type: 'textarea', placeholder: 'Breve descripción de lo pactado...' },
        { key: 'monto_reclamado', label: 'Monto reclamado estimado', type: 'money' },
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
        { key: 'deudor_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Título Ejecutivo',
      icon: 'FileText',
      fields: [
        { key: 'tipo_titulo', label: 'Tipo de título', type: 'select', options: ['Pagaré', 'Cheque', 'Factura conformada', 'Contrato con cláusula ejecutiva', 'Otro'], required: true },
        { key: 'monto_capital', label: 'Monto de capital', type: 'money', required: true },
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
        { key: 'librador_domicilio', label: 'Domicilio', type: 'domicilio' },
      ],
    },
    {
      title: 'Datos del Cheque',
      icon: 'FileText',
      fields: [
        { key: 'nro_cheque', label: 'Número de cheque', type: 'text', required: true },
        { key: 'banco_girado', label: 'Banco girado', type: 'text', required: true },
        { key: 'monto_cheque', label: 'Monto', type: 'money', required: true },
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
        { key: 'causante_ultimo_domicilio', label: 'Último domicilio', type: 'domicilio', required: true },
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

// ── AUTO-CARÁTULA ──────────────────────────────────────────
// Formato estándar: "Actor c/ Demandado s/ objeto"
// Se genera automáticamente con los datos del wizard.

interface CaratulaConfig {
  actor: string;          // key de caseData para el actor
  demandado?: string;     // key de caseData para el demandado (si aplica)
  demandado2?: string;    // segundo demandado (ej: ART)
  objeto: string | ((caseData: Record<string, string>) => string);
  actorFallback?: 'client'; // usar nombre del cliente como actor
}

const CARATULA_MAP: Record<string, CaratulaConfig> = {
  // ── LABORAL ──
  'lab-despido-caba':       { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'despido' },
  'lab-despido-pba':        { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'despido' },
  'lab-diferencias-caba':   { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'diferencias salariales' },
  'lab-diferencias-pba':    { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'diferencias salariales' },
  'lab-no-registrado-caba': { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'empleo no registrado' },
  'lab-no-registrado-pba':  { actor: 'trabajador_nombre', demandado: 'empleador_nombre', objeto: 'empleo no registrado' },
  'lab-art-caba':           { actor: 'trabajador_nombre', demandado: 'empleador_nombre', demandado2: 'art_nombre', objeto: 'accidente de trabajo' },
  'lab-art-pba':            { actor: 'trabajador_nombre', demandado: 'empleador_nombre', demandado2: 'art_nombre', objeto: 'accidente de trabajo' },
  'lab-sindical':           { actor: 'trabajador_nombre', demandado: 'sindicato_nombre', objeto: (d) => d.tipo_conflicto?.toLowerCase() || 'conflicto sindical' },
  'lab-plataformas':        { actor: 'trabajador_nombre', demandado: 'plataforma_nombre', objeto: (d) => d.motivo_reclamo?.toLowerCase() || 'reclamo laboral' },

  // ── FAMILIA ──
  // GAP UX-5: actorFallback='client' permite previsualizar la carátula
  // desde el Step 1 del wizard, cuando todavía no se cargó conyuge1_nombre
  // pero sí el cliente principal (que conceptualmente es el cónyuge 1).
  'fam-divorcio':           { actor: 'conyuge1_nombre', actorFallback: 'client', demandado: 'conyuge2_nombre', objeto: 'divorcio' },
  'fam-divorcio-pba':       { actor: 'conyuge1_nombre', actorFallback: 'client', demandado: 'conyuge2_nombre', objeto: 'divorcio' },
  'fam-alimentos':          { actor: 'hijo_nombre', demandado: 'alimentante_nombre', objeto: 'alimentos' },
  'fam-cuidado':            { actor: 'nino_nombre', actorFallback: 'client', demandado: 'otro_progenitor_nombre', objeto: 'cuidado personal' },
  'fam-comunicacion':       { actor: 'nino_nombre', actorFallback: 'client', demandado: 'otro_progenitor_nombre', objeto: 'régimen de comunicación' },
  'fam-filiacion':          { actor: 'persona_nombre', demandado: 'progenitor_nombre', objeto: (d) => d.tipo_filiacion?.toLowerCase() || 'filiación' },
  'fam-proteccion-urgente': { actor: 'victima_nombre', demandado: 'agresor_nombre', objeto: 'protección contra la violencia familiar' },
  'fam-adopcion':           { actor: 'adoptante_nombre', objeto: 'adopción' },

  // ── DAÑOS ──
  'dan-accidente-transito': { actor: 'victima_nombre', demandado: 'responsable_nombre', objeto: 'daños y perjuicios' },

  // ── COMERCIAL ──
  'com-incumplimiento':     { actor: '_client_', actorFallback: 'client', demandado: 'contraparte_nombre', objeto: 'incumplimiento contractual' },
  'com-cobro-ejecutivo':    { actor: '_client_', actorFallback: 'client', demandado: 'deudor_nombre', objeto: 'cobro ejecutivo' },
  'com-ejecucion-cheque':   { actor: '_client_', actorFallback: 'client', demandado: 'librador_nombre', objeto: 'cobro ejecutivo' },

  // ── SUCESIONES ──
  'suc-ab-intestato':       { actor: 'causante_nombre', objeto: 'sucesión ab intestato' },
};

export function buildCaratula(
  templateId: string,
  caseData: Record<string, string>,
  clientName: string
): string | null {
  const config = CARATULA_MAP[templateId];
  if (!config) return null;

  const actor = config.actor === '_client_'
    ? clientName
    : (caseData[config.actor]?.trim() || (config.actorFallback === 'client' ? clientName : ''));
  if (!actor) return null;

  const objeto = typeof config.objeto === 'function'
    ? config.objeto(caseData)
    : config.objeto;

  let demandado = config.demandado ? caseData[config.demandado]?.trim() : '';
  if (config.demandado2) {
    const dem2 = caseData[config.demandado2]?.trim();
    if (dem2) demandado = demandado ? `${demandado} y ${dem2}` : dem2;
  }

  if (demandado) {
    return `${actor} c/ ${demandado} s/ ${objeto}`;
  }
  return `${actor} s/ ${objeto}`;
}
