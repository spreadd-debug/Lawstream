import { LegalTemplate } from '../types';

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  // ═══════════════════════════════════════════════════
  // LABORAL
  // ═══════════════════════════════════════════════════
  {
    id: 'lab-despido-incausado',
    title: 'Demanda por Despido Incausado',
    category: 'Laboral',
    subcategory: 'Despido',
    description: 'Demanda laboral por despido sin justa causa. Incluye reclamo de indemnizaciones por antigüedad, preaviso, integración del mes, SAC proporcional y vacaciones.',
    tags: ['despido', 'indemnización', 'art. 245', 'LCT', 'preaviso'],
    legalBasis: 'Arts. 232, 233, 245, 246 LCT (Ley 20.744); Ley 25.323; Ley 25.345 art. 80',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre completo del actor', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del actor', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del actor', type: 'text' },
      { key: 'DEMANDADO', label: 'Razón social del demandado', type: 'text' },
      { key: 'CUIT_DEMANDADO', label: 'CUIT del demandado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del demandado', type: 'text' },
      { key: 'FECHA_INGRESO', label: 'Fecha de ingreso', type: 'date' },
      { key: 'FECHA_DESPIDO', label: 'Fecha de despido', type: 'date' },
      { key: 'CATEGORIA', label: 'Categoría laboral', type: 'text' },
      { key: 'CONVENIO', label: 'Convenio colectivo aplicable', type: 'text' },
      { key: 'REMUNERACION', label: 'Mejor remuneración mensual, normal y habitual', type: 'money' },
      { key: 'MONTO_RECLAMO', label: 'Monto total del reclamo', type: 'money' },
      { key: 'JUZGADO', label: 'Juzgado / Tribunal', type: 'text', defaultValue: 'Juzgado Nacional de Primera Instancia del Trabajo' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF', type: 'text' },
    ],
    content: `INICIA DEMANDA LABORAL POR DESPIDO INCAUSADO

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} del C.P.A.C.F., abogado/a apoderado/a de {{ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, constituyendo domicilio procesal electrónico en el sistema Lex100, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar formal demanda laboral contra {{DEMANDADO}}, C.U.I.T. {{CUIT_DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, por la suma de PESOS {{MONTO_RECLAMO}} (\${{MONTO_RECLAMO}}), o lo que en más o en menos resulte de la prueba a producirse, con más sus intereses y costas, en concepto de las indemnizaciones derivadas del despido incausado del que fuera objeto mi mandante, conforme se detalla seguidamente.

II. HECHOS

Mi mandante ingresó a trabajar para la demandada con fecha {{FECHA_INGRESO}}, desempeñándose en la categoría de {{CATEGORIA}}, conforme al Convenio Colectivo de Trabajo {{CONVENIO}}.

Su mejor remuneración mensual, normal y habitual ascendía a la suma de PESOS {{REMUNERACION}} (\${{REMUNERACION}}).

Con fecha {{FECHA_DESPIDO}}, la demandada procedió a despedir a mi mandante de manera incausada, sin expresión de causa válida que justifique la extinción del contrato de trabajo, comunicando el distracto mediante telegrama laboral.

III. RUBROS RECLAMADOS

En virtud del despido injustificado, se reclaman los siguientes rubros:

a) Indemnización por antigüedad (art. 245 LCT): Corresponde una indemnización equivalente a un (1) mes de sueldo por cada año de servicio o fracción mayor de tres (3) meses, tomando como base la mejor remuneración mensual, normal y habitual devengada durante el último año.

b) Indemnización sustitutiva de preaviso (arts. 232 y 233 LCT): Corresponde el pago de la remuneración equivalente al plazo de preaviso omitido, más el SAC proporcional sobre el preaviso.

c) Integración del mes de despido (art. 233 LCT): Corresponde integrar los días faltantes del mes en que se produjo el despido.

d) SAC proporcional (art. 123 LCT): Corresponde el aguinaldo proporcional al tiempo trabajado en el semestre del distracto.

e) Vacaciones no gozadas proporcionales (art. 156 LCT): Corresponde la indemnización por vacaciones proporcionales al tiempo trabajado en el año del distracto.

f) Incremento indemnizatorio art. 2° Ley 25.323: Por falta de pago en tiempo y forma de las indemnizaciones por despido, se reclama el incremento del 50% previsto en dicha norma.

g) Certificados de trabajo art. 80 LCT / Ley 25.345: Se reclama la indemnización prevista por la falta de entrega de los certificados de trabajo en tiempo y forma.

IV. LIQUIDACIÓN

Se acompaña planilla de liquidación detallada como Anexo I, la que forma parte integrante de la presente demanda.

V. DERECHO

Fundo el derecho en los arts. 14 bis de la Constitución Nacional; arts. 9, 10, 63, 123, 156, 232, 233, 245, 246 de la Ley de Contrato de Trabajo (Ley 20.744); arts. 1° y 2° de la Ley 25.323; art. 45 de la Ley 25.345; y demás normas concordantes y complementarias.

VI. PRUEBA

Ofrezco la siguiente prueba:

a) Documental: Recibos de haberes, telegrama de despido, certificación de servicios.
b) Informativa: Oficios a AFIP, ANSES y entidad bancaria correspondiente.
c) Testimonial: Se reserva el derecho de ofrecer testigos en la oportunidad procesal correspondiente.
d) Pericial contable: A los fines de determinar los montos adeudados.

VII. PETITORIO

Por todo lo expuesto a V.S. solicito:
1. Se tenga por presentada la demanda, por parte y por constituido el domicilio procesal.
2. Se corra traslado de la demanda por el término de ley.
3. Oportunamente, se haga lugar a la demanda en todas sus partes, con costas a la demandada.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'lab-telegrama-intimacion',
    title: 'Telegrama de Intimación Laboral',
    category: 'Laboral',
    subcategory: 'Intimación',
    description: 'Telegrama obrero (TCL) para intimar al empleador al cumplimiento de obligaciones laborales: registración, pago de haberes adeudados, entrega de certificados.',
    tags: ['telegrama', 'intimación', 'TCL', 'art. 57', 'registración'],
    legalBasis: 'Arts. 57, 80 LCT; Ley 24.013 arts. 8, 9, 10, 11, 15; Ley 25.323 art. 1°',
    placeholders: [
      { key: 'TRABAJADOR', label: 'Nombre del trabajador', type: 'text' },
      { key: 'DNI', label: 'DNI del trabajador', type: 'text' },
      { key: 'EMPLEADOR', label: 'Razón social del empleador', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'FECHA_INGRESO_REAL', label: 'Fecha de ingreso real', type: 'date' },
      { key: 'FECHA_REGISTRADA', label: 'Fecha registrada (si difiere)', type: 'date' },
      { key: 'REMUNERACION_REAL', label: 'Remuneración real percibida', type: 'money' },
      { key: 'REMUNERACION_REGISTRADA', label: 'Remuneración registrada', type: 'money' },
    ],
    content: `INTIMO plazo 30 días corridos a que proceda a REGISTRAR correctamente la relación laboral, consignando como fecha real de ingreso el día {{FECHA_INGRESO_REAL}} (y no el {{FECHA_REGISTRADA}} falsamente registrado), y como remuneración real la suma de \${{REMUNERACION_REAL}} (y no los \${{REMUNERACION_REGISTRADA}} deficientemente registrados), todo ello bajo apercibimiento de considerarme gravemente injuriado y despedido por su exclusiva culpa, con derecho al cobro de las indemnizaciones de ley (arts. 232, 233, 245 LCT) más los incrementos de los arts. 8, 9, 10, 11 y 15 de la Ley 24.013 y art. 1° de la Ley 25.323. Asimismo intimo entrega de certificados art. 80 LCT bajo apercibimiento de Ley 25.345. Queda Ud. debidamente notificado. {{TRABAJADOR}}, DNI {{DNI}}.`,
  },

  {
    id: 'lab-telegrama-despido-indirecto',
    title: 'Telegrama de Despido Indirecto',
    category: 'Laboral',
    subcategory: 'Despido',
    description: 'Telegrama obrero (TCL) para notificar al empleador que el trabajador se considera despedido por su exclusiva culpa ante el incumplimiento de las obligaciones contractuales.',
    tags: ['telegrama', 'despido indirecto', 'TCL', 'art. 242', 'art. 246'],
    legalBasis: 'Arts. 242, 246 LCT (Ley 20.744); Ley 25.323 art. 2°; Ley 25.345 art. 80',
    placeholders: [
      { key: 'TRABAJADOR', label: 'Nombre del trabajador', type: 'text' },
      { key: 'DNI', label: 'DNI del trabajador', type: 'text' },
      { key: 'EMPLEADOR', label: 'Razón social del empleador', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'MOTIVOS', label: 'Motivos de la injuria (detalle)', type: 'textarea' },
    ],
    content: `Habiendo Ud. incumplido gravemente sus obligaciones contractuales y legales — {{MOTIVOS}} —, me considero gravemente injuriado/a y DESPEDIDO/A por su exclusiva culpa en los términos de los arts. 242 y 246 de la LCT. En consecuencia, intimo plazo de ley al pago de las indemnizaciones correspondientes: indemnización por antigüedad (art. 245 LCT), sustitutiva de preaviso (arts. 232/233 LCT), integración mes de despido, SAC proporcional, vacaciones proporcionales, con más el incremento del art. 2° Ley 25.323 en caso de falta de pago. Asimismo intimo entrega de certificados art. 80 LCT bajo apercibimiento de Ley 25.345. Queda Ud. debidamente notificado/a. {{TRABAJADOR}}, DNI {{DNI}}.`,
  },

  {
    id: 'lab-telegrama-diferencias',
    title: 'Telegrama de Intimación por Diferencias Salariales',
    category: 'Laboral',
    subcategory: 'Diferencias salariales',
    description: 'Telegrama obrero (TCL) para intimar al empleador al pago de diferencias salariales adeudadas por salario inferior al CCT, horas extra impagas u otros conceptos.',
    tags: ['telegrama', 'diferencias', 'TCL', 'salario', 'CCT', 'horas extra'],
    legalBasis: 'Arts. 103, 119, 201 LCT; CCT aplicable',
    placeholders: [
      { key: 'TRABAJADOR', label: 'Nombre del trabajador', type: 'text' },
      { key: 'DNI', label: 'DNI del trabajador', type: 'text' },
      { key: 'EMPLEADOR', label: 'Razón social del empleador', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'PERIODO', label: 'Período reclamado', type: 'text' },
      { key: 'CONCEPTO', label: 'Concepto de las diferencias', type: 'textarea' },
      { key: 'MONTO_ESTIMADO', label: 'Monto estimado de las diferencias', type: 'money' },
      { key: 'CCT', label: 'CCT aplicable', type: 'text' },
    ],
    content: `INTIMO plazo 30 días corridos a que proceda al pago de las DIFERENCIAS SALARIALES adeudadas correspondientes al período {{PERIODO}}, en concepto de: {{CONCEPTO}}, conforme la escala salarial del CCT {{CCT}}, por un monto estimado de PESOS {{MONTO_ESTIMADO}} (\${{MONTO_ESTIMADO}}), o lo que en más o en menos resulte de la liquidación definitiva, bajo apercibimiento de considerarme gravemente injuriado/a y despedido/a por su exclusiva culpa (arts. 242, 246 LCT), reclamando las indemnizaciones de ley con más los incrementos correspondientes. Queda Ud. debidamente notificado/a. {{TRABAJADOR}}, DNI {{DNI}}.`,
  },

  {
    id: 'lab-demanda-no-registrado',
    title: 'Demanda por Empleo No Registrado',
    category: 'Laboral',
    subcategory: 'No registrado',
    description: 'Demanda laboral por empleo no registrado o deficientemente registrado. Incluye multas de la Ley 24.013 y Ley 25.323, más indemnizaciones por despido indirecto si corresponde.',
    tags: ['no registrado', 'en negro', 'Ley 24.013', 'Ley 25.323', 'multas', 'registración'],
    legalBasis: 'Arts. 8, 9, 10, 11, 15 Ley 24.013; Art. 1° Ley 25.323; Arts. 232, 233, 245 LCT; Art. 80 LCT; Ley 25.345',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre completo del actor', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del actor', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del actor', type: 'text' },
      { key: 'DEMANDADO', label: 'Razón social del demandado', type: 'text' },
      { key: 'CUIT_DEMANDADO', label: 'CUIT del demandado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del demandado', type: 'text' },
      { key: 'FECHA_INGRESO_REAL', label: 'Fecha real de ingreso', type: 'date' },
      { key: 'FECHA_REGISTRADA', label: 'Fecha registrada (si hay)', type: 'date' },
      { key: 'REMUNERACION_REAL', label: 'Remuneración real percibida', type: 'money' },
      { key: 'REMUNERACION_REGISTRADA', label: 'Remuneración registrada (si hay)', type: 'money' },
      { key: 'MONTO_RECLAMO', label: 'Monto total del reclamo', type: 'money' },
      { key: 'JUZGADO', label: 'Juzgado / Tribunal', type: 'text', defaultValue: 'Juzgado Nacional de Primera Instancia del Trabajo' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF', type: 'text' },
    ],
    content: `INICIA DEMANDA LABORAL POR EMPLEO NO REGISTRADO

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} del C.P.A.C.F., abogado/a apoderado/a de {{ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, constituyendo domicilio procesal electrónico en el sistema Lex100, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar formal demanda laboral contra {{DEMANDADO}}, C.U.I.T. {{CUIT_DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, por la suma de PESOS {{MONTO_RECLAMO}} (\${{MONTO_RECLAMO}}), o lo que en más o en menos resulte de la prueba a producirse, con más sus intereses y costas, en concepto de las indemnizaciones y multas derivadas del empleo no registrado y/o deficientemente registrado del que fuera objeto mi mandante.

II. HECHOS

Mi mandante ingresó a trabajar para la demandada con fecha {{FECHA_INGRESO_REAL}}, percibiendo una remuneración real de PESOS {{REMUNERACION_REAL}} (\${{REMUNERACION_REAL}}). Sin embargo, la demandada registró la relación laboral con fecha {{FECHA_REGISTRADA}} y una remuneración de PESOS {{REMUNERACION_REGISTRADA}} (\${{REMUNERACION_REGISTRADA}}), consignando datos falsos que perjudican los derechos de mi mandante en materia de antigüedad, aportes previsionales y cálculo indemnizatorio.

Oportunamente se cursó telegrama obrero intimando la correcta registración, sin que la demandada diera cumplimiento en el plazo de ley.

III. RUBROS RECLAMADOS

a) Multa art. 8° Ley 24.013: Por registración con fecha de ingreso posterior a la real.
b) Multa art. 9° Ley 24.013: Por registración con remuneración inferior a la real.
c) Multa art. 10° Ley 24.013: Por falta total de registración (si corresponde).
d) Multa art. 15° Ley 24.013: Incremento por extinción del contrato.
e) Multa art. 1° Ley 25.323: Incremento indemnizatorio por falta de registración.
f) Indemnización por antigüedad (art. 245 LCT).
g) Indemnización sustitutiva de preaviso (arts. 232/233 LCT).
h) SAC proporcional, vacaciones proporcionales.
i) Certificados art. 80 LCT / multa Ley 25.345.

IV. LIQUIDACIÓN

Se acompaña planilla de liquidación detallada como Anexo I.

V. DERECHO

Arts. 14 bis CN; arts. 8, 9, 10, 11, 15 Ley 24.013; art. 1° Ley 25.323; art. 2° Ley 25.323; arts. 232, 233, 245 LCT; art. 80 LCT; art. 45 Ley 25.345.

VI. PRUEBA

a) Documental: Telegramas, recibos, capturas de comunicaciones, transferencias bancarias.
b) Testimonial: Se ofrecerá en la oportunidad procesal correspondiente.
c) Informativa: Oficios a AFIP/ARCA, ANSES, entidad bancaria.
d) Pericial contable: A los fines de acreditar la relación y los montos adeudados.

VII. PETITORIO

Por todo lo expuesto, a V.S. solicito:
1. Se tenga por presentada la demanda.
2. Se corra traslado por el término de ley.
3. Se haga lugar a la demanda con costas.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'lab-demanda-diferencias',
    title: 'Demanda por Diferencias Salariales',
    category: 'Laboral',
    subcategory: 'Diferencias salariales',
    description: 'Demanda laboral por diferencias salariales: salario inferior al CCT, horas extra no pagadas, ítems no remunerativos fraudulentos.',
    tags: ['diferencias', 'salario', 'CCT', 'horas extra', 'ius variandi'],
    legalBasis: 'Arts. 103, 119, 196, 201 LCT; CCT aplicable; Art. 2° Ley 25.323',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre completo del actor', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del actor', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del actor', type: 'text' },
      { key: 'DEMANDADO', label: 'Razón social del demandado', type: 'text' },
      { key: 'CUIT_DEMANDADO', label: 'CUIT del demandado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del demandado', type: 'text' },
      { key: 'FECHA_INGRESO', label: 'Fecha de ingreso', type: 'date' },
      { key: 'CATEGORIA', label: 'Categoría laboral', type: 'text' },
      { key: 'CONVENIO', label: 'CCT aplicable', type: 'text' },
      { key: 'PERIODO', label: 'Período reclamado', type: 'text' },
      { key: 'MONTO_RECLAMO', label: 'Monto total de diferencias', type: 'money' },
      { key: 'JUZGADO', label: 'Juzgado / Tribunal', type: 'text' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF', type: 'text' },
    ],
    content: `INICIA DEMANDA POR DIFERENCIAS SALARIALES

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} del C.P.A.C.F., abogado/a apoderado/a de {{ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar formal demanda contra {{DEMANDADO}}, C.U.I.T. {{CUIT_DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, por la suma de PESOS {{MONTO_RECLAMO}} (\${{MONTO_RECLAMO}}), o lo que en más o en menos resulte de la prueba, con más intereses y costas, en concepto de diferencias salariales correspondientes al período {{PERIODO}}.

II. HECHOS

Mi mandante presta/prestó servicios para la demandada desde el {{FECHA_INGRESO}}, bajo la categoría de {{CATEGORIA}} conforme al CCT {{CONVENIO}}.

Durante el período reclamado, la demandada abonó remuneraciones inferiores a las establecidas en la escala salarial del convenio colectivo aplicable, generando diferencias que fueron oportunamente intimadas sin resultado positivo.

III. RUBROS RECLAMADOS

a) Diferencias salariales por el período {{PERIODO}}, calculadas conforme escala salarial del CCT {{CONVENIO}}.
b) Incidencia de las diferencias sobre SAC, vacaciones y demás rubros.
c) Art. 2° Ley 25.323: Incremento del 50% por falta de pago (si corresponde por extinción).

IV. LIQUIDACIÓN

Se acompaña planilla de liquidación detallada como Anexo I, con detalle período a período de las diferencias.

V. DERECHO

Arts. 103, 119, 196, 201 LCT; CCT {{CONVENIO}}; Art. 2° Ley 25.323 (si corresponde).

VI. PRUEBA

a) Documental: Recibos de haberes, escala salarial del CCT.
b) Informativa: Oficios a AFIP, ANSES, entidad bancaria.
c) Pericial contable: Para determinar las diferencias exactas.
d) Testimonial: Se reserva el derecho de ofrecer testigos.

VII. PETITORIO

Solicito a V.S.:
1. Se tenga por presentada la demanda.
2. Se corra traslado por el término de ley.
3. Se haga lugar a la demanda con costas.

SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // FAMILIA
  // ═══════════════════════════════════════════════════
  {
    id: 'fam-divorcio-mutuo',
    title: 'Demanda de Divorcio',
    category: 'Familia',
    subcategory: 'Divorcio',
    description: 'Presentación de divorcio conforme al régimen del Código Civil y Comercial de la Nación. Puede ser unilateral o conjunto. Incluye propuesta reguladora.',
    tags: ['divorcio', 'art. 437', 'CCyCN', 'propuesta reguladora', 'convenio'],
    legalBasis: 'Arts. 437, 438, 439, 441, 442 CCyCN (Ley 26.994)',
    placeholders: [
      { key: 'PARTE_1', label: 'Nombre completo (Parte 1)', type: 'text' },
      { key: 'DNI_1', label: 'DNI (Parte 1)', type: 'text' },
      { key: 'NACIONALIDAD_1', label: 'Nacionalidad (Parte 1)', type: 'text', defaultValue: 'argentina' },
      { key: 'PROFESION_1', label: 'Profesión (Parte 1)', type: 'text' },
      { key: 'DOMICILIO_1', label: 'Domicilio (Parte 1)', type: 'text' },
      { key: 'PARTE_2', label: 'Nombre completo (Parte 2)', type: 'text' },
      { key: 'DNI_2', label: 'DNI (Parte 2)', type: 'text' },
      { key: 'NACIONALIDAD_2', label: 'Nacionalidad (Parte 2)', type: 'text', defaultValue: 'argentina' },
      { key: 'PROFESION_2', label: 'Profesión (Parte 2)', type: 'text' },
      { key: 'DOMICILIO_2', label: 'Domicilio (Parte 2)', type: 'text' },
      { key: 'FECHA_MATRIMONIO', label: 'Fecha de celebración del matrimonio', type: 'date' },
      { key: 'LUGAR_MATRIMONIO', label: 'Registro Civil donde se celebró', type: 'text' },
      { key: 'CIRCUNSCRIPCION', label: 'Circunscripción', type: 'text' },
      { key: 'ACTA_NUM', label: 'Número de acta', type: 'text' },
      { key: 'ACTA_TOMO', label: 'Tomo', type: 'text' },
      { key: 'REGIMEN_PATRIMONIAL', label: 'Régimen patrimonial', type: 'text', defaultValue: 'comunidad de ganancias' },
      { key: 'FECHA_SEPARACION', label: 'Fecha de separación de hecho', type: 'date' },
      { key: 'HIJOS', label: 'Datos de hijos menores', type: 'textarea', defaultValue: 'Sin hijos menores de edad' },
      { key: 'REGIMEN_CUIDADO', label: 'Régimen de cuidado personal propuesto', type: 'textarea' },
      { key: 'REGIMEN_COMUNICACION', label: 'Régimen de comunicación propuesto', type: 'textarea' },
      { key: 'CUOTA_ALIMENTARIA', label: 'Cuota alimentaria propuesta', type: 'textarea' },
      { key: 'BIENES', label: 'Detalle de bienes gananciales', type: 'textarea', defaultValue: 'Sin bienes gananciales a liquidar' },
      { key: 'DEUDAS', label: 'Detalle de deudas', type: 'textarea', defaultValue: 'Sin deudas comunes' },
      { key: 'COMPENSACION', label: 'Compensación económica (si se reclama)', type: 'textarea', defaultValue: 'No se reclama compensación económica' },
      { key: 'JUZGADO', label: 'Juzgado', type: 'text', defaultValue: 'Juzgado Nacional en lo Civil' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
      { key: 'LETRADO_MATRICULA', label: 'Matrícula del letrado (T°/F°)', type: 'text' },
    ],
    content: `SOLICITAN DIVORCIO

Señor Juez:

{{LETRADO}} ({{LETRADO_MATRICULA}}), en representación de {{PARTE_1}}, D.N.I. {{DNI_1}}, {{NACIONALIDAD_1}}, {{PROFESION_1}}, con domicilio real en {{DOMICILIO_1}}, y de {{PARTE_2}}, D.N.I. {{DNI_2}}, {{NACIONALIDAD_2}}, {{PROFESION_2}}, con domicilio real en {{DOMICILIO_2}}, a V.S. respetuosamente nos presentamos y decimos:

I. OBJETO

Que de conformidad con lo dispuesto por los artículos 437, 438 y concordantes del Código Civil y Comercial de la Nación, venimos a solicitar se decrete el DIVORCIO VINCULAR del matrimonio celebrado entre las partes.

II. DATOS DEL MATRIMONIO

Las partes contrajeron matrimonio con fecha {{FECHA_MATRIMONIO}}, ante el Registro del Estado Civil y Capacidad de las Personas de {{LUGAR_MATRIMONIO}}, Circunscripción {{CIRCUNSCRIPCION}}, según consta en el Acta N.° {{ACTA_NUM}}, Tomo {{ACTA_TOMO}}, cuya copia se adjunta. El régimen patrimonial aplicable es el de {{REGIMEN_PATRIMONIAL}}. Las partes se encuentran separadas de hecho desde el {{FECHA_SEPARACION}}.

III. HIJOS

{{HIJOS}}

IV. PROPUESTA REGULADORA

En cumplimiento del artículo 438 del CCyCN, se acompaña propuesta reguladora de los efectos del divorcio, que contempla:

a) Cuidado personal de los hijos menores:
{{REGIMEN_CUIDADO}}

b) Régimen de comunicación:
{{REGIMEN_COMUNICACION}}

c) Cuota alimentaria:
{{CUOTA_ALIMENTARIA}}

d) Distribución de los bienes de la sociedad conyugal:
{{BIENES}}

e) Deudas comunes:
{{DEUDAS}}

f) Compensación económica (arts. 441/442 CCyCN):
{{COMPENSACION}}

V. DERECHO

Arts. 437, 438, 439, 441, 442 y concordantes del Código Civil y Comercial de la Nación (Ley 26.994).

VI. PETITORIO

A V.S. solicitamos:
1. Se nos tenga por presentados, por parte y por constituido el domicilio procesal.
2. Se decrete el divorcio vincular del matrimonio de referencia.
3. Se apruebe la propuesta reguladora acompañada.
4. Se ordene la inscripción de la sentencia en el Registro Civil correspondiente.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'fam-alimentos',
    title: 'Demanda de Alimentos',
    category: 'Familia',
    subcategory: 'Alimentos',
    description: 'Demanda por fijación de cuota alimentaria a favor de hijos menores de edad. Incluye solicitud de cuota provisoria.',
    tags: ['alimentos', 'cuota alimentaria', 'art. 658', 'CCyCN', 'menores'],
    legalBasis: 'Arts. 658, 659, 660, 661, 662, 663, 664, 670 CCyCN; Art. 75 inc. 22 CN (CDN)',
    placeholders: [
      { key: 'PROGENITOR_ACTOR', label: 'Nombre del progenitor que demanda', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del progenitor actor', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del actor', type: 'text' },
      { key: 'PROGENITOR_DEMANDADO', label: 'Nombre del progenitor demandado', type: 'text' },
      { key: 'DNI_DEMANDADO', label: 'DNI del demandado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del demandado', type: 'text' },
      { key: 'HIJOS', label: 'Nombre, DNI y fecha de nacimiento de cada hijo', type: 'textarea' },
      { key: 'CUOTA_SOLICITADA', label: 'Monto o porcentaje de cuota solicitada', type: 'text' },
      { key: 'CUOTA_PROVISORIA', label: 'Monto de cuota provisoria solicitada', type: 'money' },
      { key: 'DETALLE_GASTOS', label: 'Detalle de gastos mensuales del/los menor/es', type: 'textarea' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INICIA DEMANDA POR FIJACIÓN DE CUOTA ALIMENTARIA — SOLICITA ALIMENTOS PROVISORIOS

Señor Juez:

{{LETRADO}}, en representación de {{PROGENITOR_ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, en ejercicio de la responsabilidad parental de los menores que se detallan, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a promover formal demanda de ALIMENTOS contra {{PROGENITOR_DEMANDADO}}, D.N.I. {{DNI_DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, a favor de los siguientes hijos menores de edad:

{{HIJOS}}

Solicito se fije una cuota alimentaria de {{CUOTA_SOLICITADA}}, o lo que V.S. estime justo y equitativo.

II. HECHOS

El demandado no cumple adecuadamente con su obligación alimentaria respecto de los hijos menores habidos en común. Los gastos mensuales de los menores son los siguientes:

{{DETALLE_GASTOS}}

III. SOLICITA ALIMENTOS PROVISORIOS

Atento la urgencia alimentaria y en los términos del art. 544 del CCyCN, solicito se fije con carácter provisorio una cuota alimentaria mensual de PESOS {{CUOTA_PROVISORIA}} (\${{CUOTA_PROVISORIA}}), pagadera del 1 al 10 de cada mes, hasta tanto se resuelva la cuestión de fondo.

IV. DERECHO

Arts. 658, 659, 660, 661, 662, 663, 664, 670 del Código Civil y Comercial de la Nación. Convención sobre los Derechos del Niño (art. 75 inc. 22 CN). Ley 26.061 de Protección Integral de Derechos de Niñas, Niños y Adolescentes.

V. PRUEBA

a) Documental: Partidas de nacimiento, constancias de gastos, comprobantes de ingresos.
b) Informativa: Oficios a AFIP, ANSES, BCRA (CENDEU), entidades bancarias.
c) Testimonial: Se reserva el derecho de ofrecer testigos.

VI. PETITORIO

A V.S. solicito:
1. Se tenga por interpuesta la demanda.
2. Se fije cuota alimentaria provisoria de manera urgente.
3. Se corra traslado de la demanda.
4. Oportunamente, se haga lugar a la demanda con costas.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'fam-regimen-comunicacion',
    title: 'Régimen de Comunicación (Visitas)',
    category: 'Familia',
    subcategory: 'Comunicación',
    description: 'Solicitud de fijación de régimen de comunicación entre el progenitor no conviviente y los hijos menores de edad.',
    tags: ['régimen de comunicación', 'visitas', 'art. 555', 'CCyCN', 'menores'],
    legalBasis: 'Arts. 555, 556, 557 CCyCN',
    placeholders: [
      { key: 'PROGENITOR', label: 'Nombre del progenitor solicitante', type: 'text' },
      { key: 'DNI', label: 'DNI del solicitante', type: 'text' },
      { key: 'DOMICILIO', label: 'Domicilio del solicitante', type: 'text' },
      { key: 'OTRO_PROGENITOR', label: 'Nombre del otro progenitor', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del otro progenitor', type: 'text' },
      { key: 'HIJOS', label: 'Nombre y edad de los hijos', type: 'textarea' },
      { key: 'REGIMEN_PROPUESTO', label: 'Régimen propuesto (días, horarios, vacaciones)', type: 'textarea', defaultValue: 'Fines de semana alternados de viernes 18:00 hs a domingo 20:00 hs.\nMiércoles de 17:00 a 20:00 hs.\nVacaciones: divididas por mitades.\nFechas especiales: en forma alternada.' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `SOLICITA FIJACIÓN DE RÉGIMEN DE COMUNICACIÓN

Señor Juez:

{{LETRADO}}, en representación de {{PROGENITOR}}, D.N.I. {{DNI}}, con domicilio real en {{DOMICILIO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a solicitar se fije un RÉGIMEN DE COMUNICACIÓN a favor de mi mandante respecto de los siguientes hijos menores de edad habidos con {{OTRO_PROGENITOR}}, con domicilio en {{DOMICILIO_DEMANDADO}}:

{{HIJOS}}

II. RÉGIMEN PROPUESTO

Se propone el siguiente régimen de comunicación:

{{REGIMEN_PROPUESTO}}

III. DERECHO

El derecho de comunicación entre padres e hijos es un derecho-deber que encuentra sustento en los arts. 555, 556, 557 del Código Civil y Comercial de la Nación, y en la Convención sobre los Derechos del Niño (art. 9.3), de jerarquía constitucional. El interés superior del niño (art. 3 CDN, art. 706 CCyCN) exige garantizar el contacto fluido con ambos progenitores.

IV. PETITORIO

A V.S. solicito:
1. Se tenga por presentada la solicitud.
2. Se fije audiencia a los fines de intentar un acuerdo.
3. Subsidiariamente, se fije el régimen de comunicación propuesto o el que V.S. estime adecuado al interés superior de los menores.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // DAÑOS
  // ═══════════════════════════════════════════════════
  {
    id: 'dan-accidente-transito',
    title: 'Demanda por Accidente de Tránsito',
    category: 'Daños',
    subcategory: 'Accidente de tránsito',
    description: 'Demanda por daños y perjuicios derivados de accidente de tránsito contra el conductor, propietario y aseguradora.',
    tags: ['accidente', 'tránsito', 'daños', 'art. 1757', 'CCyCN', 'citación en garantía'],
    legalBasis: 'Arts. 1716, 1717, 1721, 1722, 1757, 1758, 1769 CCyCN; Ley 17.418 art. 118',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre del actor (damnificado)', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del actor', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del actor', type: 'text' },
      { key: 'CONDUCTOR', label: 'Nombre del conductor demandado', type: 'text' },
      { key: 'PROPIETARIO', label: 'Nombre del propietario del vehículo', type: 'text' },
      { key: 'ASEGURADORA', label: 'Compañía aseguradora', type: 'text' },
      { key: 'POLIZA', label: 'Número de póliza', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del/los demandado/s', type: 'text' },
      { key: 'FECHA_HECHO', label: 'Fecha del accidente', type: 'date' },
      { key: 'LUGAR_HECHO', label: 'Lugar del accidente (calle, intersección, localidad)', type: 'text' },
      { key: 'DESCRIPCION_HECHO', label: 'Descripción del accidente', type: 'textarea' },
      { key: 'VEHICULO_ACTOR', label: 'Vehículo del actor (marca, modelo, dominio)', type: 'text' },
      { key: 'VEHICULO_DEMANDADO', label: 'Vehículo del demandado (marca, modelo, dominio)', type: 'text' },
      { key: 'LESIONES', label: 'Descripción de lesiones sufridas', type: 'textarea' },
      { key: 'MONTO_RECLAMO', label: 'Monto total reclamado', type: 'money' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INICIA DEMANDA POR DAÑOS Y PERJUICIOS — ACCIDENTE DE TRÁNSITO — CITA EN GARANTÍA

Señor Juez:

{{LETRADO}}, en representación de {{ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar demanda por DAÑOS Y PERJUICIOS contra {{CONDUCTOR}} (conductor) y {{PROPIETARIO}} (titular registral), ambos con domicilio en {{DOMICILIO_DEMANDADO}}, por la suma de PESOS {{MONTO_RECLAMO}} (\${{MONTO_RECLAMO}}) o lo que en más o en menos resulte de la prueba, con más intereses y costas, derivada del accidente de tránsito ocurrido el día {{FECHA_HECHO}}.

Asimismo, solicito se cite en garantía a {{ASEGURADORA}}, póliza N.° {{POLIZA}}, en los términos del art. 118 de la Ley 17.418.

II. HECHOS

El día {{FECHA_HECHO}}, en la intersección de {{LUGAR_HECHO}}, se produjo el accidente de tránsito que motiva la presente demanda.

{{DESCRIPCION_HECHO}}

El vehículo de mi mandante es un {{VEHICULO_ACTOR}}. El vehículo del demandado es un {{VEHICULO_DEMANDADO}}.

III. LESIONES

Como consecuencia directa del siniestro, mi mandante sufrió las siguientes lesiones:

{{LESIONES}}

IV. RUBROS RECLAMADOS

a) Daño patrimonial — Incapacidad sobreviniente: La disminución de aptitudes físicas que repercute en la capacidad productiva del actor.
b) Daño patrimonial — Gastos médicos, farmacéuticos y de traslado: Gastos realizados y por realizar.
c) Daño patrimonial — Daño material al vehículo: Reparación y/o desvalorización.
d) Daño patrimonial — Lucro cesante: Ingresos dejados de percibir durante la recuperación.
e) Daño moral (art. 1741 CCyCN): Por el padecimiento, angustia y alteración de la vida cotidiana.
f) Daño al proyecto de vida: Por la afectación de las actividades habituales y de esparcimiento.

V. RESPONSABILIDAD

La responsabilidad del demandado surge de lo dispuesto por el art. 1757 del CCyCN, que establece la responsabilidad objetiva del dueño y guardián de la cosa riesgosa. El conductor responde como guardián y el propietario como dueño (art. 1758 CCyCN). La responsabilidad es concurrente e indistinta.

VI. DERECHO

Arts. 1716, 1717, 1721, 1722, 1726, 1737, 1738, 1739, 1740, 1741, 1757, 1758, 1769 del Código Civil y Comercial de la Nación. Art. 118 de la Ley 17.418 (Seguros).

VII. PRUEBA

a) Documental: Exposición civil/policial, historia clínica, informes médicos, presupuestos de reparación, fotografías.
b) Informativa: Oficios a hospitales, clínicas, comisaría interviniente.
c) Testimonial: Se ofrecerán testigos presenciales.
d) Pericial médica: A fin de determinar la incapacidad del actor.
e) Pericial mecánica: A fin de determinar los daños al vehículo y la mecánica del hecho.

VIII. PETITORIO

A V.S. solicito:
1. Se tenga por presentada la demanda.
2. Se cite en garantía a {{ASEGURADORA}}.
3. Se corra traslado por el término de ley.
4. Oportunamente, se haga lugar a la demanda con costas.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // COMERCIAL
  // ═══════════════════════════════════════════════════
  {
    id: 'com-contrato-locacion',
    title: 'Contrato de Locación',
    category: 'Comercial',
    subcategory: 'Contratos',
    description: 'Contrato de locación de inmueble para uso comercial o habitacional conforme a la legislación vigente.',
    tags: ['contrato', 'locación', 'alquiler', 'ley 27.551', 'CCyCN'],
    legalBasis: 'Arts. 1187 a 1226 CCyCN; Ley 27.551 (Alquileres)',
    placeholders: [
      { key: 'LOCADOR', label: 'Nombre completo del locador', type: 'text' },
      { key: 'DNI_LOCADOR', label: 'DNI/CUIT del locador', type: 'text' },
      { key: 'DOMICILIO_LOCADOR', label: 'Domicilio del locador', type: 'text' },
      { key: 'LOCATARIO', label: 'Nombre completo del locatario', type: 'text' },
      { key: 'DNI_LOCATARIO', label: 'DNI/CUIT del locatario', type: 'text' },
      { key: 'DOMICILIO_LOCATARIO', label: 'Domicilio del locatario', type: 'text' },
      { key: 'INMUEBLE', label: 'Dirección del inmueble locado', type: 'text' },
      { key: 'DESTINO', label: 'Destino del inmueble', type: 'text', defaultValue: 'vivienda familiar' },
      { key: 'CANON_INICIAL', label: 'Canon locativo mensual inicial', type: 'money' },
      { key: 'PLAZO', label: 'Plazo de la locación (en meses)', type: 'number', defaultValue: '36' },
      { key: 'FECHA_INICIO', label: 'Fecha de inicio del contrato', type: 'date' },
      { key: 'DEPOSITO', label: 'Depósito en garantía', type: 'money' },
      { key: 'AJUSTE', label: 'Índice de ajuste y periodicidad', type: 'text', defaultValue: 'Índice Casa Propia (ICL) del BCRA, con ajuste anual' },
    ],
    content: `CONTRATO DE LOCACIÓN

En la Ciudad Autónoma de Buenos Aires, a los días del mes de _____ de 20__, entre {{LOCADOR}}, DNI/CUIT {{DNI_LOCADOR}}, con domicilio en {{DOMICILIO_LOCADOR}}, en adelante "EL LOCADOR", y {{LOCATARIO}}, DNI/CUIT {{DNI_LOCATARIO}}, con domicilio en {{DOMICILIO_LOCATARIO}}, en adelante "EL LOCATARIO", convienen en celebrar el presente contrato de locación sujeto a las siguientes cláusulas:

PRIMERA — OBJETO: EL LOCADOR da en locación a EL LOCATARIO, quien acepta, el inmueble sito en {{INMUEBLE}}, con destino exclusivo a {{DESTINO}}.

SEGUNDA — PLAZO: El plazo de la presente locación se establece en {{PLAZO}} meses, comenzando a regir el {{FECHA_INICIO}}. Vencido el plazo, se aplicarán las disposiciones del CCyCN sobre la continuación de la locación.

TERCERA — PRECIO: El canon locativo mensual se fija en la suma de PESOS {{CANON_INICIAL}} (\${{CANON_INICIAL}}) para el primer período, pagadero por mes adelantado del 1 al 10 de cada mes. El precio se ajustará conforme al {{AJUSTE}}, de acuerdo con lo previsto en la normativa vigente.

CUARTA — DEPÓSITO: EL LOCATARIO entrega en este acto la suma de PESOS {{DEPOSITO}} (\${{DEPOSITO}}) en concepto de depósito de garantía, equivalente a un mes de alquiler. El mismo será devuelto al momento de la restitución del inmueble, actualizado conforme a la normativa vigente y previa verificación del estado del inmueble.

QUINTA — SERVICIOS Y EXPENSAS: Serán a cargo de EL LOCATARIO las expensas ordinarias, y los servicios de luz, gas, agua y demás que se consuman en el inmueble. Las expensas extraordinarias serán a cargo de EL LOCADOR.

SEXTA — CONSERVACIÓN: EL LOCATARIO se obliga a mantener el inmueble en buen estado de conservación, devolvéndolo al vencimiento en las mismas condiciones en que lo recibió, salvo el deterioro producido por el uso normal y el paso del tiempo.

SÉPTIMA — PROHIBICIONES: EL LOCATARIO no podrá subalquilar ni ceder el presente contrato, total o parcialmente, sin el consentimiento escrito de EL LOCADOR.

OCTAVA — RESCISIÓN ANTICIPADA: EL LOCATARIO podrá rescindir anticipadamente el contrato conforme a lo previsto en el art. 1221 del CCyCN.

NOVENA — JURISDICCIÓN: Para todos los efectos derivados del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad Autónoma de Buenos Aires, renunciando a cualquier otro fuero o jurisdicción.

DÉCIMA — DOMICILIOS: Las partes constituyen domicilios en los indicados en el encabezamiento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.

En prueba de conformidad, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto.

_________________________          _________________________
       EL LOCADOR                        EL LOCATARIO`,
  },

  {
    id: 'com-ejecucion-pagare',
    title: 'Demanda Ejecutiva — Pagaré',
    category: 'Comercial',
    subcategory: 'Cobro ejecutivo',
    description: 'Demanda de ejecución de pagaré por vía ejecutiva. Solicita intimación de pago, embargo y ejecución del título.',
    tags: ['pagaré', 'ejecución', 'cobro', 'art. 520', 'CPCCN', 'título ejecutivo'],
    legalBasis: 'Arts. 520, 521, 523, 531 CPCCN; Arts. 30, 103, 104 Decreto-Ley 5965/63',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre del ejecutante', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI/CUIT del ejecutante', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del ejecutante', type: 'text' },
      { key: 'DEMANDADO', label: 'Nombre del ejecutado (librador)', type: 'text' },
      { key: 'DNI_DEMANDADO', label: 'DNI/CUIT del ejecutado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del ejecutado', type: 'text' },
      { key: 'MONTO_CAPITAL', label: 'Monto del capital del pagaré', type: 'money' },
      { key: 'FECHA_VENCIMIENTO', label: 'Fecha de vencimiento del pagaré', type: 'date' },
      { key: 'FECHA_LIBRAMIENTO', label: 'Fecha de libramiento del pagaré', type: 'date' },
      { key: 'LUGAR_PAGO', label: 'Lugar de pago', type: 'text', defaultValue: 'Ciudad Autónoma de Buenos Aires' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INICIA EJECUCIÓN — PREPARA VÍA EJECUTIVA

Señor Juez:

{{LETRADO}}, en representación de {{ACTOR}}, DNI/CUIT {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar juicio ejecutivo contra {{DEMANDADO}}, DNI/CUIT {{DNI_DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, por la suma de PESOS {{MONTO_CAPITAL}} (\${{MONTO_CAPITAL}}) en concepto de capital, con más los intereses moratorios, punitorios y costas del juicio, en virtud del pagaré que se acompaña como título ejecutivo.

II. TÍTULO EJECUTIVO

Se acompaña pagaré original librado con fecha {{FECHA_LIBRAMIENTO}}, con vencimiento el {{FECHA_VENCIMIENTO}}, por la suma de \${{MONTO_CAPITAL}}, lugar de pago: {{LUGAR_PAGO}}, que reúne los requisitos exigidos por el art. 101 y concordantes del Decreto-Ley 5965/63 y constituye título ejecutivo hábil en los términos del art. 523 inc. 5° del CPCCN.

III. DERECHO

Arts. 520, 521, 523 inc. 5°, 524, 529, 531 y concordantes del Código Procesal Civil y Comercial de la Nación. Decreto-Ley 5965/63 (Letra de Cambio y Pagaré).

IV. PETITORIO

A V.S. solicito:
1. Se me tenga por presentado, por parte y por constituido el domicilio.
2. Se libre mandamiento de intimación de pago y embargo por la suma reclamada con más la que V.S. presupueste para intereses y costas.
3. Se trabe embargo sobre bienes suficientes del ejecutado.
4. En caso de no oponerse excepciones o rechazadas las mismas, se dicte sentencia de remate y se mande llevar adelante la ejecución.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // SUCESIONES
  // ═══════════════════════════════════════════════════
  {
    id: 'suc-inicio-sucesion',
    title: 'Inicio de Proceso Sucesorio',
    category: 'Sucesiones',
    subcategory: 'Sucesión ab intestato',
    description: 'Escrito de inicio del proceso sucesorio ab intestato ante el juzgado civil. Solicita apertura, declaratoria de herederos e inventario.',
    tags: ['sucesión', 'declaratoria', 'herederos', 'art. 2335', 'CCyCN', 'ab intestato'],
    legalBasis: 'Arts. 2277, 2335, 2337, 2340 CCyCN; Arts. 689 a 735 CPCCN',
    placeholders: [
      { key: 'HEREDERO', label: 'Nombre del heredero presentante', type: 'text' },
      { key: 'DNI_HEREDERO', label: 'DNI del heredero', type: 'text' },
      { key: 'DOMICILIO_HEREDERO', label: 'Domicilio del heredero', type: 'text' },
      { key: 'VINCULO', label: 'Vínculo con el causante', type: 'text', defaultValue: 'hijo/a' },
      { key: 'CAUSANTE', label: 'Nombre completo del causante', type: 'text' },
      { key: 'DNI_CAUSANTE', label: 'DNI del causante', type: 'text' },
      { key: 'ULTIMO_DOMICILIO', label: 'Último domicilio del causante', type: 'text' },
      { key: 'FECHA_FALLECIMIENTO', label: 'Fecha de fallecimiento', type: 'date' },
      { key: 'OTROS_HEREDEROS', label: 'Otros herederos conocidos (nombre y vínculo)', type: 'textarea', defaultValue: 'No se conocen otros herederos.' },
      { key: 'BIENES', label: 'Bienes conocidos del acervo hereditario', type: 'textarea' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INICIA PROCESO SUCESORIO AB INTESTATO

Señor Juez:

{{LETRADO}}, en representación de {{HEREDERO}}, D.N.I. {{DNI_HEREDERO}}, con domicilio real en {{DOMICILIO_HEREDERO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a iniciar el proceso sucesorio ab intestato de {{CAUSANTE}}, D.N.I. {{DNI_CAUSANTE}}, fallecido/a el día {{FECHA_FALLECIMIENTO}}, con último domicilio en {{ULTIMO_DOMICILIO}}, solicitando se dicte declaratoria de herederos a favor de los sucesores legítimos.

II. VOCACIÓN HEREDITARIA

El presentante es {{VINCULO}} del causante, acreditando el vínculo con la documentación que se acompaña (partida de nacimiento y/o libreta de familia).

Otros herederos conocidos:
{{OTROS_HEREDEROS}}

III. BIENES

Se denuncian los siguientes bienes que componen el acervo hereditario:

{{BIENES}}

IV. DERECHO

Arts. 2277, 2278, 2335, 2337, 2339, 2340 y concordantes del Código Civil y Comercial de la Nación. Arts. 689 y siguientes del Código Procesal Civil y Comercial de la Nación.

V. PETITORIO

A V.S. solicito:
1. Se me tenga por presentado, por parte y por constituido el domicilio.
2. Se tenga por iniciado el proceso sucesorio.
3. Se publiquen edictos por tres (3) días en el Boletín Oficial y en un diario de amplia circulación (art. 2340 CCyCN).
4. Vencido el plazo de los edictos sin presentación de otros herederos, se dicte declaratoria de herederos.
5. Se ordene la inscripción de la declaratoria en los registros correspondientes.
6. Se apruebe el inventario y avalúo oportunamente.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // CIVIL
  // ═══════════════════════════════════════════════════
  {
    id: 'civ-amparo',
    title: 'Acción de Amparo',
    category: 'Civil',
    subcategory: 'Amparo',
    description: 'Acción de amparo contra actos u omisiones de autoridad pública o particulares que lesionen derechos constitucionales con arbitrariedad o ilegalidad manifiesta.',
    tags: ['amparo', 'art. 43', 'CN', 'ley 16.986', 'medida cautelar', 'constitucional'],
    legalBasis: 'Art. 43 CN; Ley 16.986; Arts. 1, 2, 3 Ley 16.986',
    placeholders: [
      { key: 'ACTOR', label: 'Nombre del amparista', type: 'text' },
      { key: 'DNI_ACTOR', label: 'DNI del amparista', type: 'text' },
      { key: 'DOMICILIO_ACTOR', label: 'Domicilio del amparista', type: 'text' },
      { key: 'DEMANDADO', label: 'Autoridad / organismo demandado', type: 'text' },
      { key: 'DOMICILIO_DEMANDADO', label: 'Domicilio del demandado', type: 'text' },
      { key: 'ACTO_LESIVO', label: 'Descripción del acto u omisión lesiva', type: 'textarea' },
      { key: 'DERECHO_AFECTADO', label: 'Derecho constitucional afectado', type: 'text' },
      { key: 'MEDIDA_CAUTELAR', label: 'Medida cautelar solicitada', type: 'textarea' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INTERPONE ACCIÓN DE AMPARO — SOLICITA MEDIDA CAUTELAR

Señor Juez:

{{LETRADO}}, en representación de {{ACTOR}}, D.N.I. {{DNI_ACTOR}}, con domicilio real en {{DOMICILIO_ACTOR}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo a interponer ACCIÓN DE AMPARO en los términos del artículo 43 de la Constitución Nacional y la Ley 16.986, contra {{DEMANDADO}}, con domicilio en {{DOMICILIO_DEMANDADO}}, en razón del acto/omisión que de manera manifiestamente ilegal y arbitraria lesiona el derecho constitucional a {{DERECHO_AFECTADO}} de mi mandante.

II. ADMISIBILIDAD

La presente acción resulta admisible toda vez que se verifican los requisitos del art. 43 de la Constitución Nacional y del art. 1 de la Ley 16.986:
a) Existe un acto u omisión de autoridad pública.
b) El mismo lesiona, restringe, altera o amenaza, con arbitrariedad o ilegalidad manifiesta, derechos y garantías reconocidos por la Constitución Nacional.
c) No existe otro medio judicial más idóneo.

III. HECHOS — ACTO LESIVO

{{ACTO_LESIVO}}

IV. DERECHO AFECTADO

El acto denunciado vulnera directamente el derecho constitucional a {{DERECHO_AFECTADO}}, consagrado en la Constitución Nacional y los tratados internacionales de derechos humanos con jerarquía constitucional (art. 75 inc. 22 CN).

V. SOLICITA MEDIDA CAUTELAR

Atento la verosimilitud del derecho invocado y el peligro en la demora, solicito se dicte como medida cautelar:

{{MEDIDA_CAUTELAR}}

VI. DERECHO

Art. 43 de la Constitución Nacional. Arts. 1, 2 y 3 de la Ley 16.986. Arts. 195, 230, 232 del CPCCN. Tratados internacionales con jerarquía constitucional (art. 75 inc. 22 CN).

VII. PETITORIO

A V.S. solicito:
1. Se tenga por interpuesta la acción de amparo.
2. Se haga lugar a la medida cautelar solicitada.
3. Se requiera informe circunstanciado al demandado (art. 8 Ley 16.986).
4. Oportunamente, se haga lugar al amparo y se declare la nulidad del acto lesivo.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'civ-medida-cautelar',
    title: 'Medida Cautelar Genérica',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Solicitud de medida cautelar genérica (innovativa o de no innovar). Aplicable cuando no se encuadra en las cautelares típicas.',
    tags: ['cautelar', 'medida', 'innovativa', 'no innovar', 'art. 232', 'CPCCN'],
    legalBasis: 'Arts. 195, 230, 232 CPCCN',
    placeholders: [
      { key: 'SOLICITANTE', label: 'Nombre del solicitante', type: 'text' },
      { key: 'DOMICILIO', label: 'Domicilio del solicitante', type: 'text' },
      { key: 'CONTRA', label: 'Contra quién se solicita', type: 'text' },
      { key: 'EXPEDIENTE', label: 'Expediente (si es incidental)', type: 'text', defaultValue: 'Se inicia con la presente' },
      { key: 'MEDIDA_SOLICITADA', label: 'Medida cautelar solicitada (descripción precisa)', type: 'textarea' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud del derecho', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela ofrecida', type: 'text', defaultValue: 'Caución juratoria' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `SOLICITA MEDIDA CAUTELAR — Art. 232 CPCCN

Señor Juez:

{{LETRADO}}, en representación de {{SOLICITANTE}}, con domicilio constituido en autos, en el marco de los autos "{{EXPEDIENTE}}", a V.S. respetuosamente me presento y digo:

I. OBJETO

Solicito a V.S. se sirva decretar la siguiente MEDIDA CAUTELAR contra {{CONTRA}}, en los términos del art. 232 del CPCCN:

{{MEDIDA_SOLICITADA}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece como contracautela: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 230, 232 y concordantes del Código Procesal Civil y Comercial de la Nación.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la medida cautelar solicitada inaudita parte.
2. Se fije la contracautela ofrecida.
3. Se libre el oficio / mandamiento correspondiente.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'civ-recurso-apelacion',
    title: 'Recurso de Apelación',
    category: 'Civil',
    subcategory: 'Recursos',
    description: 'Recurso de apelación contra sentencia o resolución interlocutoria. Incluye fundamentación de los agravios.',
    tags: ['apelación', 'recurso', 'agravios', 'art. 244', 'CPCCN', 'segunda instancia'],
    legalBasis: 'Arts. 242, 244, 245, 246, 253, 259, 265 CPCCN',
    placeholders: [
      { key: 'APELANTE', label: 'Nombre del apelante', type: 'text' },
      { key: 'EXPEDIENTE', label: 'Carátula del expediente', type: 'text' },
      { key: 'RESOLUCION', label: 'Resolución que se apela (fecha y descripción)', type: 'text' },
      { key: 'AGRAVIOS', label: 'Expresión de agravios (desarrollo)', type: 'textarea' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `INTERPONE RECURSO DE APELACIÓN — EXPRESA AGRAVIOS

Señor Juez:

{{LETRADO}}, en representación de {{APELANTE}}, en los autos "{{EXPEDIENTE}}", a V.S. respetuosamente me presento y digo:

I. OBJETO

Que en legal tiempo y forma vengo a interponer RECURSO DE APELACIÓN contra la resolución de fecha {{RESOLUCION}}, por causar a mi parte un agravio irreparable, solicitando su revocación por la Alzada.

II. PROCEDENCIA

El recurso es procedente conforme a los arts. 242 y 244 del CPCCN, por tratarse de una resolución que causa gravamen irreparable a mi parte y cuyo monto supera el mínimo previsto legalmente para la apelabilidad.

III. EXPRESIÓN DE AGRAVIOS

La resolución recurrida agravia a esta parte por cuanto:

{{AGRAVIOS}}

IV. DERECHO

Arts. 242, 244, 245, 246, 253, 259, 265 y concordantes del Código Procesal Civil y Comercial de la Nación.

V. PETITORIO

A V.S. solicito:
1. Se tenga por interpuesto en tiempo y forma el recurso de apelación.
2. Se conceda el recurso y se eleven los autos a la Alzada.
3. Oportunamente, la Excma. Cámara revoque la resolución apelada, con costas.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'lab-certificacion-servicios',
    title: 'Intimación Entrega de Certificados Art. 80',
    category: 'Laboral',
    subcategory: 'Certificados',
    description: 'Telegrama intimando al empleador a la entrega de los certificados de trabajo previstos en el art. 80 de la LCT, dentro de los 30 días de extinguido el vínculo.',
    tags: ['certificados', 'art. 80', 'LCT', 'ley 25.345', 'telegrama'],
    legalBasis: 'Art. 80 LCT; Art. 45 Ley 25.345; Decreto 146/01',
    placeholders: [
      { key: 'TRABAJADOR', label: 'Nombre del trabajador', type: 'text' },
      { key: 'DNI', label: 'DNI del trabajador', type: 'text' },
      { key: 'EMPLEADOR', label: 'Razón social del empleador', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'FECHA_EGRESO', label: 'Fecha de egreso', type: 'date' },
    ],
    content: `Habiendo transcurrido treinta (30) días desde la extinción de la relación laboral operada el {{FECHA_EGRESO}}, INTIMO plazo de dos (2) días hábiles a que proceda a hacer entrega de los certificados previstos en el art. 80 de la Ley de Contrato de Trabajo (certificado de servicios y remuneraciones, constancia de aportes previsionales, y certificación de servicios ante ANSES), bajo apercibimiento de reclamar la indemnización prevista en el art. 45 de la Ley 25.345 (equivalente a tres veces la mejor remuneración mensual, normal y habitual percibida). Queda Ud. debidamente notificado. {{TRABAJADOR}}, DNI {{DNI}}.`,
  },

  {
    id: 'suc-oficio-registros',
    title: 'Solicitud de Oficios a Registros',
    category: 'Sucesiones',
    subcategory: 'Oficios',
    description: 'Escrito solicitando al juez el libramiento de oficios a registros de la propiedad, automotor, AFIP y bancos para identificar bienes del acervo hereditario.',
    tags: ['oficio', 'registros', 'bienes', 'sucesión', 'inventario'],
    legalBasis: 'Arts. 2341, 2342, 2343 CCyCN; Art. 398 CPCCN',
    placeholders: [
      { key: 'EXPEDIENTE', label: 'Carátula del expediente sucesorio', type: 'text' },
      { key: 'CAUSANTE', label: 'Nombre del causante', type: 'text' },
      { key: 'DNI_CAUSANTE', label: 'DNI/CUIT del causante', type: 'text' },
      { key: 'FECHA_FALLECIMIENTO', label: 'Fecha de fallecimiento', type: 'date' },
      { key: 'JURISDICCION', label: 'Jurisdicción de los registros', type: 'text', defaultValue: 'Ciudad Autónoma de Buenos Aires y Provincia de Buenos Aires' },
      { key: 'LETRADO', label: 'Nombre del letrado', type: 'text' },
    ],
    content: `SOLICITA LIBRAMIENTO DE OFICIOS

Señor Juez:

{{LETRADO}}, en los autos "{{EXPEDIENTE}}", a V.S. respetuosamente me presento y digo:

I. OBJETO

Que a los fines de confeccionar el inventario y avalúo del acervo hereditario del causante {{CAUSANTE}}, D.N.I./C.U.I.T. {{DNI_CAUSANTE}}, fallecido/a el {{FECHA_FALLECIMIENTO}}, solicito se libren los siguientes oficios:

1. Al Registro de la Propiedad Inmueble de {{JURISDICCION}}, a fin de que informe sobre la existencia de bienes inmuebles inscriptos a nombre del causante.

2. Al Registro Nacional de la Propiedad del Automotor (DNRPA), a fin de que informe sobre la existencia de automotores inscriptos a nombre del causante.

3. A la Administración Federal de Ingresos Públicos (AFIP), a fin de que informe sobre la situación fiscal del causante y bienes registrados.

4. Al Banco Central de la República Argentina (BCRA — COELSA), a fin de que informe sobre cuentas bancarias y depósitos a nombre del causante.

5. A la Caja de Valores S.A. y al Mercado Abierto Electrónico, a fin de que informen sobre la existencia de títulos valores, acciones o participaciones societarias.

II. DERECHO

Arts. 2341, 2342, 2343 CCyCN. Art. 398 CPCCN.

III. PETITORIO

A V.S. solicito:
1. Se libren los oficios solicitados, autorizando al letrado firmante al diligenciamiento de los mismos.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // CAUTELARES (GAP UX-34)
  // ═══════════════════════════════════════════════════
  // Catálogo de medidas cautelares típicas — cada template está pensado
  // para que el abogado lo abra desde un matter concreto y la mayoría de
  // los placeholders se autocompleten con los datos del caso (partes,
  // expediente, jurisdicción). Los textos siguen la estructura clásica
  // del escrito argentino: I OBJETO · II VEROSIMILITUD · III PELIGRO ·
  // IV CONTRACAUTELA · V DERECHO · VI PETITORIO. Cuando aplica, se
  // incluyen los oficios accesorios al RPI / Registro Automotor / Banco.

  {
    id: 'cau-inhibicion-general-divorcio',
    title: 'Inhibición General de Bienes (Divorcio)',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Inhibición general contra el cónyuge para impedirle disponer o gravar bienes registrables mientras tramita el divorcio. Se traba en el Registro de la Propiedad Inmueble y en el Registro Automotor.',
    tags: ['cautelar', 'inhibición', 'divorcio', 'patrimonio ganancial', 'art. 228 CPCCN', 'art. 721 CCyCN'],
    legalBasis: 'Arts. 195, 198, 199, 207, 228 CPCCN; arts. 720, 721 CCyCN; ley 17.801 (RPI).',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Cónyuge solicitante (cliente)', type: 'text' },
      { key: 'DNI_SOLICITANTE', label: 'DNI del solicitante', type: 'text' },
      { key: 'DOMICILIO_SOLICITANTE', label: 'Domicilio real del solicitante', type: 'text' },
      { key: 'INHIBIDO', label: 'Cónyuge a inhibir (contraparte)', type: 'text' },
      { key: 'DNI_INHIBIDO', label: 'DNI del inhibido', type: 'text' },
      { key: 'DOMICILIO_INHIBIDO', label: 'Último domicilio conocido del inhibido', type: 'text' },
      { key: 'FECHA_MATRIMONIO', label: 'Fecha de matrimonio', type: 'date' },
      { key: 'LUGAR_MATRIMONIO', label: 'Registro Civil de celebración', type: 'text' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'HECHOS_PELIGRO', label: 'Hechos que justifican el peligro en la demora', type: 'textarea', defaultValue: 'En el último mes el cónyuge demandado contrajo deuda nueva sin justificación conocida, lo que hace temer el inminente vaciamiento patrimonial de la masa ganancial.' },
      { key: 'CONTRACAUTELA', label: 'Contracautela ofrecida', type: 'text', defaultValue: 'Caución juratoria atento al carácter familiar del proceso (art. 199 CPCCN)' },
    ],
    content: `SOLICITA INHIBICIÓN GENERAL DE BIENES — INAUDITA PARTE

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en mi carácter de letrado/a apoderado/a de {{SOLICITANTE}}, D.N.I. {{DNI_SOLICITANTE}}, con domicilio real en {{DOMICILIO_SOLICITANTE}} y constituyendo domicilio procesal electrónico en autos, en el marco de los autos "{{AUTOS}}" en trámite por ante el {{JUZGADO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo por el presente a solicitar, INAUDITA PARTE y con habilitación de días y horas inhábiles si fuere menester, se decrete INHIBICIÓN GENERAL DE BIENES contra {{INHIBIDO}}, D.N.I. {{DNI_INHIBIDO}}, con último domicilio conocido en {{DOMICILIO_INHIBIDO}}, debiendo librarse los oficios pertinentes a los registros públicos de bienes registrables (art. 228 CPCCN).

II. VEROSIMILITUD DEL DERECHO

Mi mandante contrajo matrimonio con el inhibido el {{FECHA_MATRIMONIO}} ante el {{LUGAR_MATRIMONIO}}. El matrimonio se rige por el régimen de comunidad de ganancias del art. 463 y ss. del Código Civil y Comercial, no habiendo las partes suscripto convención matrimonial alterando dicho régimen.

En el marco del presente proceso de divorcio se discute la liquidación de la comunidad ganancial, integrada — entre otros bienes — por aquellos cuya titularidad surge del expediente.

La verosimilitud del derecho surge de manera incontrastable de la copia certificada del acta de matrimonio que se acompañó como prueba documental al promover la demanda, que acredita la calidad de cónyuge de mi mandante y, por ende, su derecho a la mitad de los bienes gananciales (arts. 469, 498 CCyCN).

III. PELIGRO EN LA DEMORA

{{HECHOS_PELIGRO}}

La conducta del cónyuge demandado configura el periculum in mora exigido por el art. 195 CPCCN. De no decretarse la cautelar inaudita parte, el demandado tendría tiempo de disponer o gravar los bienes registrables que integran la masa ganancial, frustrando el resultado del juicio y tornando ilusoria la sentencia de liquidación.

IV. CONTRACAUTELA

Se ofrece como contracautela: {{CONTRACAUTELA}}.

V. DERECHO

Fundo el derecho en los arts. 195, 198, 199, 207 y 228 del CPCCN; arts. 463, 469, 498, 720 y 721 del CCyCN; ley 17.801; y demás normas concordantes.

VI. PETITORIO

A V.S. solicito:
1. Se tenga por presentado este escrito y por constituido el domicilio procesal electrónico.
2. Se decrete INAUDITA PARTE la INHIBICIÓN GENERAL DE BIENES contra {{INHIBIDO}}, D.N.I. {{DNI_INHIBIDO}}.
3. Se fije la contracautela ofrecida.
4. Se libre OFICIO al Registro de la Propiedad Inmueble (CABA y/o jurisdicción que corresponda) a fin de tomar razón de la inhibición decretada.
5. Se libre OFICIO al Registro Nacional de la Propiedad del Automotor a fin de tomar razón de la inhibición.
6. Se autorice al letrado firmante al diligenciamiento de los oficios.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-preventivo-inmueble',
    title: 'Embargo Preventivo de Inmueble',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Embargo preventivo sobre un inmueble determinado para asegurar el cobro de una acreencia. Se traba mediante oficio al Registro de la Propiedad Inmueble.',
    tags: ['cautelar', 'embargo', 'inmueble', 'art. 209 CPCCN', 'RPI'],
    legalBasis: 'Arts. 195, 198, 199, 207, 209, 210, 212, 218 CPCCN; ley 17.801.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante (acreedor)', type: 'text' },
      { key: 'DNI_SOLICITANTE', label: 'DNI/CUIT del solicitante', type: 'text' },
      { key: 'DOMICILIO_SOLICITANTE', label: 'Domicilio del solicitante', type: 'text' },
      { key: 'EMBARGADO', label: 'Persona a embargar (deudor)', type: 'text' },
      { key: 'DNI_EMBARGADO', label: 'DNI/CUIT del embargado', type: 'text' },
      { key: 'INMUEBLE_UBICACION', label: 'Ubicación del inmueble (calle, número, piso, depto, localidad)', type: 'textarea' },
      { key: 'MATRICULA', label: 'Matrícula registral', type: 'text' },
      { key: 'NOMENCLATURA', label: 'Nomenclatura catastral', type: 'text' },
      { key: 'MONTO', label: 'Monto a embargar (con intereses y costas)', type: 'money' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud del derecho', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela ofrecida', type: 'text', defaultValue: 'Caución real / juratoria — V.S. fijará el monto que estime corresponder' },
    ],
    content: `SOLICITA EMBARGO PREVENTIVO DE INMUEBLE — INAUDITA PARTE

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en representación de {{SOLICITANTE}}, D.N.I./C.U.I.T. {{DNI_SOLICITANTE}}, con domicilio real en {{DOMICILIO_SOLICITANTE}} y constituyendo domicilio procesal electrónico, en el marco de los autos "{{AUTOS}}" en trámite por ante el {{JUZGADO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Vengo a solicitar, INAUDITA PARTE, se decrete EMBARGO PREVENTIVO sobre el inmueble que a continuación se identifica, hasta cubrir la suma de PESOS {{MONTO}} (\${{MONTO}}) en concepto de capital, con más lo que V.S. presupueste para responder a intereses y costas.

INMUEBLE A EMBARGAR:
- Ubicación: {{INMUEBLE_UBICACION}}
- Matrícula: {{MATRICULA}}
- Nomenclatura catastral: {{NOMENCLATURA}}
- Titular registral: {{EMBARGADO}}, D.N.I./C.U.I.T. {{DNI_EMBARGADO}}.

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece como contracautela: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207, 209, 210, 212 y 218 del CPCCN; ley 17.801; y normas concordantes.

VI. PETITORIO

A V.S. solicito:
1. Se decrete INAUDITA PARTE el embargo preventivo sobre el inmueble identificado.
2. Se fije la contracautela.
3. Se libre OFICIO al Registro de la Propiedad Inmueble (jurisdicción del bien) a fin de tomar razón del embargo decretado, hasta cubrir la suma indicada con más sus accesorios.
4. Se autorice al letrado firmante al diligenciamiento del oficio.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-cuenta-bancaria',
    title: 'Embargo de Cuenta Bancaria',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Embargo preventivo o ejecutivo sobre fondos depositados en cuenta bancaria del deudor. Se traba mediante oficio a la entidad financiera con CBU específico o genérico al BCRA.',
    tags: ['cautelar', 'embargo', 'cuenta bancaria', 'CBU', 'art. 209 CPCCN'],
    legalBasis: 'Arts. 195, 198, 207, 209, 210 CPCCN; ley 21.526; comunicaciones BCRA.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'EMBARGADO', label: 'Persona a embargar', type: 'text' },
      { key: 'DNI_EMBARGADO', label: 'DNI/CUIT del embargado', type: 'text' },
      { key: 'BANCO', label: 'Banco (si se conoce)', type: 'text', defaultValue: 'Genérico — BCRA' },
      { key: 'CBU_O_CUENTA', label: 'CBU o número de cuenta (si se conoce)', type: 'text', defaultValue: 'Sobre todas las cuentas a nombre del demandado en el sistema financiero' },
      { key: 'MONTO', label: 'Monto a embargar', type: 'money' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA EMBARGO DE CUENTA BANCARIA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por la representación que invoco en {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete EMBARGO PREVENTIVO sobre los fondos existentes y/o futuros en la/s cuenta/s bancaria/s identificada/s a continuación, de titularidad de {{EMBARGADO}}, D.N.I./C.U.I.T. {{DNI_EMBARGADO}}, hasta cubrir la suma de PESOS {{MONTO}} (\${{MONTO}}) con más intereses y costas:

{{CBU_O_CUENTA}}

Banco: {{BANCO}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 207, 209, 210 CPCCN; ley 21.526.

VI. PETITORIO

A V.S. solicito:
1. Se decrete el embargo solicitado.
2. Se libre OFICIO al Banco indicado (o, en su defecto, al BCRA conforme art. 4° ley 21.526 a fin de individualizar todas las cuentas del demandado en el sistema financiero) a fin de retener fondos hasta cubrir el monto reclamado con más sus accesorios.
3. Se autorice al letrado firmante al diligenciamiento.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-sueldo-alimentos',
    title: 'Embargo de Sueldo (Alimentos)',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Embargo del salario del alimentante para asegurar el pago de la cuota alimentaria. El tope general es del 20% del salario neto, que puede ampliarse en casos de mora reiterada.',
    tags: ['cautelar', 'embargo', 'sueldo', 'alimentos', 'art. 660 CCyCN', 'art. 147 LCT'],
    legalBasis: 'Arts. 658, 660 CCyCN; art. 147 LCT; arts. 195, 209 CPCCN; dec. 484/87.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'PROGENITOR', label: 'Progenitor/a representante (cliente)', type: 'text' },
      { key: 'DNI_PROGENITOR', label: 'DNI del progenitor representante', type: 'text' },
      { key: 'HIJOS', label: 'Hijos beneficiarios (nombres y DNI)', type: 'textarea' },
      { key: 'ALIMENTANTE', label: 'Alimentante obligado', type: 'text' },
      { key: 'DNI_ALIMENTANTE', label: 'DNI/CUIL del alimentante', type: 'text' },
      { key: 'EMPLEADOR_ALIMENTANTE', label: 'Empleador del alimentante', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'MONTO_CUOTA', label: 'Monto mensual de la cuota fijada', type: 'money' },
      { key: 'PORCENTAJE_RETENCION', label: 'Porcentaje de retención solicitado', type: 'text', defaultValue: '20%' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'FECHA_RESOLUCION_CUOTA', label: 'Fecha de resolución que fijó la cuota', type: 'date' },
    ],
    content: `SOLICITA EMBARGO DE SUELDO POR INCUMPLIMIENTO DE CUOTA ALIMENTARIA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en representación de {{PROGENITOR}}, D.N.I. {{DNI_PROGENITOR}}, en su carácter de progenitor/a y representante legal de los menores beneficiarios de la cuota alimentaria fijada en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete EMBARGO sobre la remuneración mensual que percibe {{ALIMENTANTE}}, D.N.I./C.U.I.L. {{DNI_ALIMENTANTE}}, en relación de dependencia con {{EMPLEADOR_ALIMENTANTE}}, en una proporción equivalente al {{PORCENTAJE_RETENCION}} de su salario neto, monto que deberá retenerse y depositarse mensualmente a la orden de V.S. y como pertenecientes a estos autos, hasta cubrir la cuota alimentaria fijada de PESOS {{MONTO_CUOTA}} (\${{MONTO_CUOTA}}) mensuales y los conceptos en mora.

II. HECHOS Y VEROSIMILITUD

Por resolución del {{FECHA_RESOLUCION_CUOTA}} V.S. fijó cuota alimentaria provisoria a favor de los menores {{HIJOS}}, a cargo del alimentante {{ALIMENTANTE}}.

El alimentante ha incurrido en incumplimientos reiterados que vuelven necesaria la traba de la presente medida, a fin de asegurar el cobro mensual de la cuota.

III. PELIGRO EN LA DEMORA

La cuota alimentaria atiende a la subsistencia de los menores. Cualquier demora en el cobro afecta directamente su derecho a la salud, educación y vivienda. La verosimilitud del derecho está dada por la propia resolución que fijó la cuota.

IV. ALCANCE DE LA RETENCIÓN

Se solicita una retención del {{PORCENTAJE_RETENCION}} sobre la remuneración neta del alimentante, conforme art. 147 LCT y dec. 484/87, importe que el empleador deberá depositar a la orden del Tribunal entre el primer y quinto día hábil de cada mes, juntamente con copia del recibo de haberes correspondiente al período retenido.

V. DERECHO

Arts. 658 y 660 CCyCN; art. 147 LCT; arts. 195, 209 y conc. CPCCN; dec. 484/87.

VI. PETITORIO

A V.S. solicito:
1. Se decrete el embargo sobre el sueldo del alimentante en la proporción solicitada.
2. Se libre OFICIO al empleador {{EMPLEADOR_ALIMENTANTE}}, con domicilio en {{DOMICILIO_EMPLEADOR}}, a fin de que retenga y deposite mensualmente el importe correspondiente.
3. Se haga saber al empleador que la falta de cumplimiento de la orden lo hace solidariamente responsable por las sumas no retenidas.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-anotacion-litis',
    title: 'Anotación de Litis sobre Inmueble',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Anota en el Registro de la Propiedad Inmueble que sobre un determinado inmueble se ha trabado litis. No impide la disposición pero hace oponible la sentencia al adquirente. Útil cuando se discute la titularidad o un derecho real.',
    tags: ['cautelar', 'anotación de litis', 'inmueble', 'art. 229 CPCCN', 'RPI'],
    legalBasis: 'Arts. 195, 198, 207, 229 CPCCN; arts. 1893, 1902 CCyCN; ley 17.801.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'INMUEBLE_UBICACION', label: 'Ubicación del inmueble', type: 'textarea' },
      { key: 'MATRICULA', label: 'Matrícula registral', type: 'text' },
      { key: 'NOMENCLATURA', label: 'Nomenclatura catastral', type: 'text' },
      { key: 'TITULAR_REGISTRAL', label: 'Titular registral', type: 'text' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'OBJETO_LITIS', label: 'Objeto del juicio que se anotará en el Registro', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA ANOTACIÓN DE LITIS

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por la representación que invoco en {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete la ANOTACIÓN DE LITIS sobre el siguiente inmueble:
- Ubicación: {{INMUEBLE_UBICACION}}
- Matrícula: {{MATRICULA}}
- Nomenclatura catastral: {{NOMENCLATURA}}
- Titular registral: {{TITULAR_REGISTRAL}}.

II. VEROSIMILITUD DEL DERECHO Y OBJETO DE LA LITIS

En el presente juicio se discute: {{OBJETO_LITIS}}

La anotación de litis no afecta la disponibilidad del bien sino que torna oponible erga omnes la sentencia que recaiga, en los términos de los arts. 1893 y 1902 CCyCN.

III. PELIGRO EN LA DEMORA

De no decretarse la anotación, un eventual adquirente del inmueble podría invocar la condición de tercero de buena fe ajeno al pleito, frustrando la sentencia que en su momento se dicte.

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 207, 229 CPCCN; arts. 1893, 1902 CCyCN; ley 17.801.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la anotación de litis.
2. Se libre OFICIO al Registro de la Propiedad Inmueble correspondiente.
3. Se autorice al letrado firmante al diligenciamiento del oficio.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-no-innovar',
    title: 'Prohibición de Innovar',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Cautelar conservativa que ordena mantener el statu quo de una situación de hecho o de derecho. Útil cuando se pretende impedir actos materiales que alteren la situación litigiosa.',
    tags: ['cautelar', 'no innovar', 'statu quo', 'art. 230 CPCCN'],
    legalBasis: 'Arts. 195, 198, 199, 207, 230 CPCCN.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'CONTRA', label: 'Persona contra quien se dirige', type: 'text' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'STATU_QUO', label: 'Situación a mantener (statu quo)', type: 'textarea' },
      { key: 'ACTO_A_EVITAR', label: 'Acto que se pretende evitar', type: 'textarea' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA PROHIBICIÓN DE INNOVAR

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por la representación que invoco en {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete PROHIBICIÓN DE INNOVAR contra {{CONTRA}}, ordenándole abstenerse de realizar todo acto que altere la siguiente situación de hecho/derecho cuya conservación se requiere:

{{STATU_QUO}}

En particular, se solicita que el demandado se abstenga de:

{{ACTO_A_EVITAR}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207 y 230 CPCCN.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la prohibición de innovar solicitada.
2. Se notifique al demandado bajo apercibimiento de las sanciones del art. 239 CP y del art. 37 CPCCN (conminaciones pecuniarias).
3. Se fije la contracautela.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-prohibicion-contratar',
    title: 'Prohibición de Contratar',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Impide al demandado celebrar determinados contratos sobre bienes específicos. Procede cuando la ley lo establece o cuando es necesario para asegurar la ejecución forzada de los bienes.',
    tags: ['cautelar', 'prohibición de contratar', 'art. 231 CPCCN'],
    legalBasis: 'Arts. 195, 198, 199, 207, 231 CPCCN; ley 17.801.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'CONTRA', label: 'Persona contra quien se dirige', type: 'text' },
      { key: 'BIEN_DESCRIPCION', label: 'Bien sobre el que recae la prohibición', type: 'textarea' },
      { key: 'CONTRATOS_PROHIBIDOS', label: 'Contratos que se prohíben (locación, venta, etc.)', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA PROHIBICIÓN DE CONTRATAR

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por la representación de {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete PROHIBICIÓN DE CONTRATAR contra {{CONTRA}}, en relación al/los siguiente/s bien/es:

{{BIEN_DESCRIPCION}}

La prohibición alcanza a los siguientes contratos: {{CONTRATOS_PROHIBIDOS}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207, 231 CPCCN.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la prohibición de contratar solicitada.
2. Se libren los oficios pertinentes al Registro de la Propiedad Inmueble y/o demás registros que correspondan.
3. Se notifique al demandado bajo apercibimiento legal.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-intervencion-judicial-recaudadora',
    title: 'Intervención Judicial Recaudadora',
    category: 'Comercial',
    subcategory: 'Cautelares',
    description: 'Designación de un interventor recaudador que retiene un porcentaje de los ingresos brutos del demandado para garantizar el crédito del actor. Aplica sobre comercios, sociedades, profesionales con ingresos identificables.',
    tags: ['cautelar', 'intervención', 'recaudadora', 'art. 223 CPCCN'],
    legalBasis: 'Arts. 195, 198, 199, 222, 223, 224, 225 CPCCN.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante (acreedor)', type: 'text' },
      { key: 'SOCIEDAD', label: 'Sociedad / comercio a intervenir', type: 'text' },
      { key: 'CUIT_SOCIEDAD', label: 'CUIT de la sociedad', type: 'text' },
      { key: 'DOMICILIO_SOCIEDAD', label: 'Domicilio de la sociedad', type: 'text' },
      { key: 'MONTO_CREDITO', label: 'Monto del crédito a recaudar', type: 'money' },
      { key: 'PORCENTAJE_RECAUDACION', label: 'Porcentaje de recaudación solicitado', type: 'text', defaultValue: '10% de los ingresos brutos diarios' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'INSUFICIENCIA_OTRAS_MEDIDAS', label: 'Por qué otras medidas son insuficientes', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución real fijada por V.S.' },
    ],
    content: `SOLICITA INTERVENCIÓN JUDICIAL RECAUDADORA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por la representación de {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Vengo a solicitar la designación de un INTERVENTOR JUDICIAL RECAUDADOR sobre {{SOCIEDAD}}, C.U.I.T. {{CUIT_SOCIEDAD}}, con domicilio en {{DOMICILIO_SOCIEDAD}}, a fin de que retenga el {{PORCENTAJE_RECAUDACION}} con destino al pago de la acreencia de PESOS {{MONTO_CREDITO}} (\${{MONTO_CREDITO}}) reclamada en autos.

II. VEROSIMILITUD E INSUFICIENCIA DE OTRAS MEDIDAS

La verosimilitud surge de los instrumentos acompañados al iniciar la demanda y del estado actual del proceso.

{{INSUFICIENCIA_OTRAS_MEDIDAS}}

Conforme art. 223 CPCCN, la intervención recaudadora procede cuando otras medidas cautelares resultan insuficientes para asegurar el resultado del juicio.

III. PELIGRO EN LA DEMORA

La continuidad del giro comercial sin afectación de fondos a favor del crédito reclamado, sumada a las dificultades de cobro que la realidad económica impone, configuran el periculum in mora.

IV. ALCANCE DE LA INTERVENCIÓN

El interventor designado deberá:
a) Concurrir periódicamente al establecimiento o domicilio comercial.
b) Retener el {{PORCENTAJE_RECAUDACION}} de los ingresos brutos diarios.
c) Depositar las sumas retenidas a la orden de V.S. y como pertenecientes a estos autos.
d) Presentar informes periódicos al Tribunal.
e) En ningún caso intervenir en la administración ni alterar el normal giro de los negocios.

V. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

VI. DERECHO

Arts. 195, 198, 199, 222, 223, 224, 225 CPCCN.

VII. PETITORIO

A V.S. solicito:
1. Se decrete la intervención recaudadora solicitada.
2. Se designe interventor con las facultades enunciadas, fijándose sus honorarios provisorios.
3. Se libre mandamiento al designado y se notifique a la sociedad intervenida.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-intervencion-veedora',
    title: 'Intervención Judicial Veedora',
    category: 'Comercial',
    subcategory: 'Cautelares',
    description: 'Designación de un veedor judicial que vigila la administración y emite informes periódicos al Tribunal, sin desplazar a los administradores. Útil cuando hay sospecha de irregularidades o vaciamiento societario.',
    tags: ['cautelar', 'intervención', 'veedor', 'art. 224 CPCCN', 'sociedades'],
    legalBasis: 'Arts. 195, 198, 199, 222, 224 CPCCN; arts. 113-117 ley 19.550.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'SOCIEDAD', label: 'Sociedad a vigilar', type: 'text' },
      { key: 'CUIT_SOCIEDAD', label: 'CUIT de la sociedad', type: 'text' },
      { key: 'DOMICILIO_SOCIEDAD', label: 'Domicilio social', type: 'text' },
      { key: 'OBJETO_VIGILANCIA', label: 'Aspectos sobre los que recaerá la vigilancia', type: 'textarea' },
      { key: 'FRECUENCIA_INFORMES', label: 'Frecuencia de los informes', type: 'text', defaultValue: 'Quincenal' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'IRREGULARIDADES', label: 'Irregularidades o sospechas que justifican la medida', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA INTERVENCIÓN JUDICIAL — VEEDOR

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se designe VEEDOR JUDICIAL en la sociedad {{SOCIEDAD}}, C.U.I.T. {{CUIT_SOCIEDAD}}, con domicilio social en {{DOMICILIO_SOCIEDAD}}, a fin de que vigile su administración y emita informes con frecuencia {{FRECUENCIA_INFORMES}} al Tribunal, sin desplazar a los administradores legales.

La vigilancia debe alcanzar a los siguientes aspectos:

{{OBJETO_VIGILANCIA}}

II. VEROSIMILITUD DEL DERECHO

{{IRREGULARIDADES}}

III. PELIGRO EN LA DEMORA

La inacción en el control del órgano de administración puede consolidar las irregularidades denunciadas y afectar el patrimonio social, frustrando la sentencia.

IV. ALCANCE DE LA VIGILANCIA

El veedor deberá:
a) Tener acceso a libros sociales, contables y comerciales.
b) Presenciar reuniones de directorio y asambleas si V.S. lo dispone.
c) Emitir informes periódicos detallando observaciones.
d) NO sustituir las decisiones de los administradores.

V. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

VI. DERECHO

Arts. 195, 198, 199, 222, 224 CPCCN; arts. 113-117 ley 19.550.

VII. PETITORIO

A V.S. solicito:
1. Se designe veedor con las facultades indicadas.
2. Se fijen honorarios provisorios.
3. Se notifique a la sociedad y al órgano de administración.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-no-innovar-familia',
    title: 'Cautelar de No Innovar — Familia',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Cautelar específica para casos de familia: impide al otro progenitor alterar el statu quo de los hijos (mudanza, escolaridad, viaje, cambio de obra social) sin autorización judicial mientras tramita el juicio.',
    tags: ['cautelar', 'no innovar', 'familia', 'art. 706 CCyCN', 'interés superior del niño'],
    legalBasis: 'Arts. 195, 230 CPCCN; arts. 706, 707, 645, 642 CCyCN; CDN art. 3.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'PROGENITOR', label: 'Progenitor solicitante', type: 'text' },
      { key: 'OTRO_PROGENITOR', label: 'Otro progenitor', type: 'text' },
      { key: 'HIJOS', label: 'Hijos involucrados (nombres y edades)', type: 'textarea' },
      { key: 'STATU_QUO', label: 'Situación que se pide mantener', type: 'textarea' },
      { key: 'CONDUCTA_A_EVITAR', label: 'Conducta del otro progenitor que se pretende evitar', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'INTERES_SUPERIOR', label: 'Por qué la medida atiende al interés superior del niño', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria atento al carácter familiar (art. 199 CPCCN)' },
    ],
    content: `SOLICITA CAUTELAR DE NO INNOVAR — INTERÉS SUPERIOR DEL NIÑO

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en representación de {{PROGENITOR}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete CAUTELAR DE NO INNOVAR contra {{OTRO_PROGENITOR}}, ordenándole abstenerse de alterar la siguiente situación de los hijos comunes {{HIJOS}}:

{{STATU_QUO}}

En particular, se solicita que el otro progenitor se abstenga de:

{{CONDUCTA_A_EVITAR}}

II. VEROSIMILITUD DEL DERECHO

Mi mandante ostenta la responsabilidad parental conjunta de los menores conforme arts. 638 y ss. CCyCN. Las decisiones de relevancia respecto de la persona del hijo requieren consentimiento de ambos progenitores (arts. 645, 642 CCyCN).

III. PELIGRO EN LA DEMORA E INTERÉS SUPERIOR DEL NIÑO

{{INTERES_SUPERIOR}}

La conducta unilateral del otro progenitor afecta directamente la cotidianidad de los menores y su derecho a no ver alterada su situación de hecho de manera intempestiva. El art. 706 CCyCN consagra el principio de tutela judicial efectiva en cuestiones de familia, y el art. 3 de la Convención sobre los Derechos del Niño impone considerar primordialmente el interés superior del niño en toda medida.

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 230 CPCCN; arts. 706, 707, 645, 642 CCyCN; art. 3 CDN; ley 26.061.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la cautelar de no innovar solicitada.
2. Se notifique al otro progenitor bajo apercibimiento de las sanciones del art. 239 CP y art. 37 CPCCN.
3. Se corra vista al Defensor de Menores e Incapaces (art. 103 CCyCN).

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-autorizacion-viajar',
    title: 'Autorización Judicial para Viajar con Menores',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Autorización judicial supletoria para viajar al exterior o al interior con menores cuando el otro progenitor se niega injustificadamente o no se ubica. Procede como medida urgente en sede de familia.',
    tags: ['autorización', 'viaje', 'menores', 'art. 645 CCyCN', 'familia'],
    legalBasis: 'Arts. 645, 642, 706 CCyCN; arts. 195, 230 CPCCN; disposición DNM 2902/13.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'PROGENITOR', label: 'Progenitor solicitante', type: 'text' },
      { key: 'OTRO_PROGENITOR', label: 'Otro progenitor', type: 'text' },
      { key: 'HIJOS', label: 'Hijos a viajar (nombres, DNI, fecha nac.)', type: 'textarea' },
      { key: 'DESTINO', label: 'Destino del viaje', type: 'text' },
      { key: 'FECHA_SALIDA', label: 'Fecha de salida', type: 'date' },
      { key: 'FECHA_REGRESO', label: 'Fecha de regreso', type: 'date' },
      { key: 'MEDIO_TRANSPORTE', label: 'Medio de transporte', type: 'text' },
      { key: 'MOTIVO_VIAJE', label: 'Motivo del viaje', type: 'textarea' },
      { key: 'NEGATIVA_OTRO_PROGENITOR', label: 'Negativa o ausencia del otro progenitor', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
    ],
    content: `SOLICITA AUTORIZACIÓN JUDICIAL PARA VIAJAR CON MENORES — VÍA URGENTE

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en representación de {{PROGENITOR}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito a V.S. AUTORIZACIÓN JUDICIAL SUPLETORIA, en los términos del art. 645 último párrafo CCyCN, para que mi mandante pueda viajar con los hijos comunes:

{{HIJOS}}

con el siguiente itinerario:
- Destino: {{DESTINO}}
- Fecha de salida: {{FECHA_SALIDA}}
- Fecha de regreso: {{FECHA_REGRESO}}
- Medio de transporte: {{MEDIO_TRANSPORTE}}
- Motivo del viaje: {{MOTIVO_VIAJE}}

II. ANTECEDENTES Y NEGATIVA DEL OTRO PROGENITOR

{{NEGATIVA_OTRO_PROGENITOR}}

Conforme art. 645 CCyCN, el viaje de los menores al exterior requiere consentimiento de ambos progenitores. Ante la negativa o ausencia de uno de ellos, V.S. puede suplir esa voluntad cuando el viaje atiende al interés superior del niño y no aparece reñido con el régimen de comunicación vigente.

III. URGENCIA E INTERÉS SUPERIOR DEL NIÑO

La proximidad de la fecha de salida y la imposibilidad de obtener la autorización por la vía extrajudicial justifican la habilitación de la vía urgente del art. 706 CCyCN.

El viaje atiende al interés superior del niño en cuanto: forma parte de su esparcimiento, no afecta su escolaridad y se desarrolla durante un período en que los menores conviven con el progenitor solicitante.

IV. DERECHO

Arts. 645, 642, 706 CCyCN; arts. 195, 230 CPCCN; CDN art. 3; disposición DNM 2902/13.

V. PETITORIO

A V.S. solicito:
1. Se habilite la vía urgente y se otorgue la autorización solicitada.
2. Se libre certificación al efecto, con datos completos del viaje, para ser presentada ante la Dirección Nacional de Migraciones y/o autoridades fronterizas.
3. Se corra vista al Defensor de Menores (art. 103 CCyCN).

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-levantamiento',
    title: 'Levantamiento de Cautelar',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Escrito por el cual el afectado por una cautelar pide al juez que la levante por haber desaparecido los presupuestos que la justificaron, por exceso, o por haberse acreditado lo contrario.',
    tags: ['cautelar', 'levantamiento', 'art. 203 CPCCN', 'sustitución'],
    legalBasis: 'Arts. 203, 204, 205, 207 CPCCN.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'AFECTADO', label: 'Persona afectada por la cautelar (cliente)', type: 'text' },
      { key: 'CAUTELAR_DESCRIPCION', label: 'Cautelar a levantar (tipo, fecha de traba, registro)', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'MOTIVOS', label: 'Motivos del levantamiento (cesó el peligro / no hay verosimilitud / exceso / etc.)', type: 'textarea' },
    ],
    content: `SOLICITA LEVANTAMIENTO DE CAUTELAR

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, en representación de {{AFECTADO}}, parte afectada por la medida cautelar oportunamente trabada en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Vengo a solicitar el LEVANTAMIENTO de la siguiente medida cautelar:

{{CAUTELAR_DESCRIPCION}}

II. FUNDAMENTOS

{{MOTIVOS}}

Conforme art. 203 CPCCN, las medidas cautelares pueden ser levantadas en cualquier momento del proceso si se acredita que han desaparecido las circunstancias que las determinaron, o que su mantenimiento se torna excesivo.

III. DERECHO

Arts. 203, 204, 205, 207 CPCCN.

IV. PETITORIO

A V.S. solicito:
1. Se levante la cautelar individualizada.
2. Se libren los oficios de levantamiento al/los registro/s correspondiente/s.
3. Costas a la contraria conforme art. 208 CPCCN.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-caucion-sustitutiva',
    title: 'Sustitución por Caución Sustitutiva',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Pedido del afectado para que la cautelar se levante mediante el ofrecimiento de una garantía sustitutiva equivalente (depósito, fianza, seguro de caución).',
    tags: ['cautelar', 'sustitución', 'caución', 'art. 203 CPCCN'],
    legalBasis: 'Arts. 203, 204, 205, 207 CPCCN.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'AFECTADO', label: 'Persona afectada (cliente)', type: 'text' },
      { key: 'CAUTELAR_VIGENTE', label: 'Cautelar vigente', type: 'textarea' },
      { key: 'CAUCION_OFRECIDA', label: 'Caución sustitutiva ofrecida (descripción)', type: 'textarea' },
      { key: 'MONTO_CAUCION', label: 'Monto de la caución', type: 'money' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
    ],
    content: `OFRECE CAUCIÓN SUSTITUTIVA — SOLICITA LEVANTAMIENTO

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por {{AFECTADO}}, parte afectada en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Vengo a OFRECER CAUCIÓN SUSTITUTIVA en los términos del art. 203 CPCCN, a fin de que se LEVANTE la cautelar oportunamente decretada y trabada:

{{CAUTELAR_VIGENTE}}

II. CAUCIÓN OFRECIDA

Se ofrece la siguiente garantía sustitutiva, equivalente al alcance de la cautelar levantada:

{{CAUCION_OFRECIDA}}

Monto / valor: PESOS {{MONTO_CAUCION}} (\${{MONTO_CAUCION}}).

III. DERECHO

Art. 203 CPCCN. La caución sustitutiva ofrecida cumple igual finalidad de garantía que la medida actualmente trabada, sin perjuicio de los derechos del solicitante.

IV. PETITORIO

A V.S. solicito:
1. Se acepte la caución sustitutiva ofrecida.
2. Se levante la cautelar trabada.
3. Se libren los oficios de levantamiento correspondientes.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-reinscripcion-inhibicion',
    title: 'Reinscripción de Inhibición General',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Pedido para reinscribir la inhibición general de bienes antes de que opere la caducidad quinquenal del art. 207 CPCCN. Si la cautelar caduca, hay que volver a pedir y pagar otra vez.',
    tags: ['cautelar', 'reinscripción', 'inhibición', 'caducidad', 'art. 207 CPCCN'],
    legalBasis: 'Arts. 207, 228 CPCCN; ley 17.801; art. 37 dec. ley 6582/58.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'INHIBIDO', label: 'Persona inhibida', type: 'text' },
      { key: 'DNI_INHIBIDO', label: 'DNI/CUIT del inhibido', type: 'text' },
      { key: 'FECHA_INSCRIPCION_ORIGINAL', label: 'Fecha de la inscripción original', type: 'date' },
      { key: 'REGISTRO', label: 'Registro donde se inscribió originalmente', type: 'text' },
      { key: 'NUMERO_INSCRIPCION', label: 'Número de inscripción original (si se conoce)', type: 'text' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
    ],
    content: `SOLICITA REINSCRIPCIÓN DE INHIBICIÓN GENERAL DE BIENES

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Próximo a operar el plazo de caducidad quinquenal previsto en el art. 207 CPCCN, vengo a solicitar la REINSCRIPCIÓN de la inhibición general de bienes oportunamente decretada en estos autos contra {{INHIBIDO}}, D.N.I./C.U.I.T. {{DNI_INHIBIDO}}.

II. ANTECEDENTES

La inhibición fue inscripta originalmente con fecha {{FECHA_INSCRIPCION_ORIGINAL}} en el {{REGISTRO}} bajo el N° {{NUMERO_INSCRIPCION}}, en virtud del oficio oportunamente librado por V.S.

III. NECESIDAD DE LA REINSCRIPCIÓN

El proceso continúa en trámite y subsisten los presupuestos que motivaron la traba original (verosimilitud y peligro en la demora), por lo que corresponde reinscribir la cautelar antes de su caducidad para no requerir un nuevo decreto y traba.

IV. DERECHO

Arts. 207, 228 CPCCN; ley 17.801; art. 37 dec. ley 6582/58.

V. PETITORIO

A V.S. solicito:
1. Se ordene la reinscripción de la inhibición general de bienes.
2. Se libre OFICIO al/los registro/s correspondiente/s con anterioridad al vencimiento del plazo quinquenal.
3. Se autorice al letrado firmante al diligenciamiento.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-secuestro',
    title: 'Secuestro de Cosa Litigiosa',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Desapoderamiento físico de una cosa mueble que es objeto del litigio o que se encuentra en peligro. Se traba mediante mandamiento que ejecuta el oficial de justicia.',
    tags: ['cautelar', 'secuestro', 'art. 221 CPCCN', 'cosa mueble'],
    legalBasis: 'Arts. 195, 198, 199, 207, 221 CPCCN.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CPACF / CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CPACF / CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'TENEDOR', label: 'Persona en cuyo poder se encuentra la cosa', type: 'text' },
      { key: 'DOMICILIO_TENEDOR', label: 'Domicilio del tenedor', type: 'text' },
      { key: 'COSA_DESCRIPCION', label: 'Cosa a secuestrar (descripción precisa)', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'DEPOSITARIO', label: 'Depositario propuesto', type: 'text', defaultValue: 'Se solicita designación a sorteo' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución real fijada por V.S.' },
    ],
    content: `SOLICITA SECUESTRO DE COSA LITIGIOSA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}}, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete el SECUESTRO de la siguiente cosa mueble:

{{COSA_DESCRIPCION}}

actualmente en poder de {{TENEDOR}}, con domicilio en {{DOMICILIO_TENEDOR}}.

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

El art. 221 CPCCN autoriza el secuestro cuando el embargo no asegura por sí solo el derecho del solicitante.

IV. DESIGNACIÓN DE DEPOSITARIO

Depositario: {{DEPOSITARIO}}.

V. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

VI. DERECHO

Arts. 195, 198, 199, 207, 221 CPCCN.

VII. PETITORIO

A V.S. solicito:
1. Se decrete el secuestro inaudita parte.
2. Se libre MANDAMIENTO con habilitación de día y hora si fuere menester, autorizando el uso de la fuerza pública y allanamiento de domicilio si fuese necesario.
3. Se designe depositario.
4. Se fije la contracautela.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  // ═══════════════════════════════════════════════════
  // CAUTELARES — VARIANTES PBA (GAP UX-34)
  // ═══════════════════════════════════════════════════
  // Versiones para Provincia de Buenos Aires de las cautelares más
  // usadas. Diferencias respecto a las versiones CABA/Nación:
  //   • Cita CPCC PBA en lugar de CPCCN (números casi siempre iguales).
  //   • Mención al Colegio de Abogados de la Provincia (CALP) y no al
  //     CPACF — el placeholder TOMO/FOLIO se rellena con datos del CALP.
  //   • Domicilio procesal en sistema MEV de SCBA (no Lex100).
  //   • Oficios al RPI Provincia (La Plata) y Registro Automotor PBA.
  //   • Mención al Departamento Judicial competente en lugar de
  //     "Juzgado Nacional".

  {
    id: 'cau-inhibicion-general-divorcio-pba',
    title: 'Inhibición General de Bienes — Divorcio (PBA)',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Inhibición general contra el cónyuge en proceso de divorcio en Provincia de Buenos Aires. Oficios al Registro de la Propiedad Inmueble de PBA y al Registro Automotor.',
    tags: ['cautelar', 'inhibición', 'divorcio', 'PBA', 'art. 228 CPCC PBA', 'art. 721 CCyCN'],
    legalBasis: 'Arts. 195, 198, 199, 207, 228 CPCC PBA; arts. 720, 721 CCyCN; ley 17.801; Ley provincial 5708 (RPI PBA).',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Cónyuge solicitante (cliente)', type: 'text' },
      { key: 'DNI_SOLICITANTE', label: 'DNI del solicitante', type: 'text' },
      { key: 'DOMICILIO_SOLICITANTE', label: 'Domicilio real del solicitante', type: 'text' },
      { key: 'INHIBIDO', label: 'Cónyuge a inhibir (contraparte)', type: 'text' },
      { key: 'DNI_INHIBIDO', label: 'DNI del inhibido', type: 'text' },
      { key: 'DOMICILIO_INHIBIDO', label: 'Último domicilio conocido del inhibido', type: 'text' },
      { key: 'FECHA_MATRIMONIO', label: 'Fecha de matrimonio', type: 'date' },
      { key: 'LUGAR_MATRIMONIO', label: 'Registro Civil de celebración', type: 'text' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado de Familia interviniente (Departamento Judicial)', type: 'text' },
      { key: 'HECHOS_PELIGRO', label: 'Hechos que justifican el peligro en la demora', type: 'textarea', defaultValue: 'En el último mes el cónyuge demandado contrajo deuda nueva sin justificación conocida, lo que hace temer el inminente vaciamiento patrimonial de la masa ganancial.' },
      { key: 'CONTRACAUTELA', label: 'Contracautela ofrecida', type: 'text', defaultValue: 'Caución juratoria atento al carácter familiar del proceso (art. 199 CPCC PBA)' },
    ],
    content: `SOLICITA INHIBICIÓN GENERAL DE BIENES — INAUDITA PARTE

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, en mi carácter de letrado/a apoderado/a de {{SOLICITANTE}}, D.N.I. {{DNI_SOLICITANTE}}, con domicilio real en {{DOMICILIO_SOLICITANTE}} y constituyendo domicilio procesal electrónico en el sistema MEV de la SCBA, en el marco de los autos "{{AUTOS}}" en trámite por ante el {{JUZGADO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Que vengo por el presente a solicitar, INAUDITA PARTE y con habilitación de días y horas inhábiles si fuere menester, se decrete INHIBICIÓN GENERAL DE BIENES contra {{INHIBIDO}}, D.N.I. {{DNI_INHIBIDO}}, con último domicilio conocido en {{DOMICILIO_INHIBIDO}}, debiendo librarse los oficios pertinentes a los registros públicos de bienes registrables (art. 228 CPCC PBA).

II. VEROSIMILITUD DEL DERECHO

Mi mandante contrajo matrimonio con el inhibido el {{FECHA_MATRIMONIO}} ante el {{LUGAR_MATRIMONIO}}. El matrimonio se rige por el régimen de comunidad de ganancias del art. 463 y ss. del Código Civil y Comercial, no habiendo las partes suscripto convención matrimonial alterando dicho régimen.

En el marco del presente proceso de divorcio se discute la liquidación de la comunidad ganancial.

La verosimilitud del derecho surge del acta de matrimonio acompañada con la demanda, que acredita la calidad de cónyuge de mi mandante y su derecho a la mitad de los bienes gananciales (arts. 469, 498 CCyCN).

III. PELIGRO EN LA DEMORA

{{HECHOS_PELIGRO}}

La conducta del cónyuge demandado configura el periculum in mora del art. 195 CPCC PBA. De no decretarse la cautelar inaudita parte, el demandado tendría tiempo de disponer o gravar los bienes registrables que integran la masa ganancial, frustrando la sentencia de liquidación.

IV. CONTRACAUTELA

Se ofrece como contracautela: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207 y 228 del CPCC PBA; arts. 463, 469, 498, 720 y 721 del CCyCN; ley 17.801; ley provincial 5708; y demás normas concordantes.

VI. PETITORIO

A V.S. solicito:
1. Se tenga por presentado este escrito y por constituido el domicilio procesal electrónico.
2. Se decrete INAUDITA PARTE la INHIBICIÓN GENERAL DE BIENES contra {{INHIBIDO}}, D.N.I. {{DNI_INHIBIDO}}.
3. Se fije la contracautela ofrecida.
4. Se libre OFICIO al Registro de la Propiedad Inmueble de la Provincia de Buenos Aires (La Plata) a fin de tomar razón de la inhibición.
5. Se libre OFICIO al Registro Nacional de la Propiedad del Automotor a fin de tomar razón de la inhibición.
6. Se autorice al letrado firmante al diligenciamiento de los oficios.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-preventivo-inmueble-pba',
    title: 'Embargo Preventivo de Inmueble (PBA)',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Embargo preventivo sobre inmueble en jurisdicción de PBA. Oficio al Registro de la Propiedad Inmueble de la Provincia (La Plata).',
    tags: ['cautelar', 'embargo', 'inmueble', 'PBA', 'art. 209 CPCC PBA'],
    legalBasis: 'Arts. 195, 198, 199, 207, 209, 210, 212, 218 CPCC PBA; ley 17.801; ley provincial 5708.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante (acreedor)', type: 'text' },
      { key: 'DNI_SOLICITANTE', label: 'DNI/CUIT del solicitante', type: 'text' },
      { key: 'DOMICILIO_SOLICITANTE', label: 'Domicilio del solicitante', type: 'text' },
      { key: 'EMBARGADO', label: 'Persona a embargar (deudor)', type: 'text' },
      { key: 'DNI_EMBARGADO', label: 'DNI/CUIT del embargado', type: 'text' },
      { key: 'INMUEBLE_UBICACION', label: 'Ubicación del inmueble (calle, número, piso, depto, partido)', type: 'textarea' },
      { key: 'MATRICULA', label: 'Matrícula registral', type: 'text' },
      { key: 'NOMENCLATURA', label: 'Nomenclatura catastral', type: 'text' },
      { key: 'MONTO', label: 'Monto a embargar', type: 'money' },
      { key: 'AUTOS', label: 'Carátula del expediente', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado interviniente (Departamento Judicial)', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Fundamentos de la verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Fundamentos del peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución real / juratoria — V.S. fijará el monto que estime corresponder' },
    ],
    content: `SOLICITA EMBARGO PREVENTIVO DE INMUEBLE — INAUDITA PARTE

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, en representación de {{SOLICITANTE}}, D.N.I./C.U.I.T. {{DNI_SOLICITANTE}}, con domicilio real en {{DOMICILIO_SOLICITANTE}} y constituyendo domicilio procesal electrónico en el sistema MEV de la SCBA, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. respetuosamente me presento y digo:

I. OBJETO

Vengo a solicitar, INAUDITA PARTE, se decrete EMBARGO PREVENTIVO sobre el inmueble que a continuación se identifica, hasta cubrir la suma de PESOS {{MONTO}} (\${{MONTO}}) con más intereses y costas:

INMUEBLE A EMBARGAR:
- Ubicación: {{INMUEBLE_UBICACION}}
- Matrícula: {{MATRICULA}}
- Nomenclatura catastral: {{NOMENCLATURA}}
- Titular registral: {{EMBARGADO}}, D.N.I./C.U.I.T. {{DNI_EMBARGADO}}.

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207, 209, 210, 212 y 218 CPCC PBA; ley 17.801; ley provincial 5708.

VI. PETITORIO

A V.S. solicito:
1. Se decrete INAUDITA PARTE el embargo preventivo solicitado.
2. Se fije la contracautela.
3. Se libre OFICIO al Registro de la Propiedad Inmueble de la Provincia de Buenos Aires (La Plata).
4. Se autorice al letrado firmante al diligenciamiento.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-cuenta-bancaria-pba',
    title: 'Embargo de Cuenta Bancaria (PBA)',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Embargo sobre cuenta bancaria en proceso ante tribunales de PBA.',
    tags: ['cautelar', 'embargo', 'cuenta bancaria', 'PBA', 'art. 209 CPCC PBA'],
    legalBasis: 'Arts. 195, 198, 207, 209, 210 CPCC PBA; ley 21.526.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'EMBARGADO', label: 'Persona a embargar', type: 'text' },
      { key: 'DNI_EMBARGADO', label: 'DNI/CUIT del embargado', type: 'text' },
      { key: 'BANCO', label: 'Banco (si se conoce)', type: 'text', defaultValue: 'Genérico — BCRA' },
      { key: 'CBU_O_CUENTA', label: 'CBU o cuenta', type: 'text', defaultValue: 'Sobre todas las cuentas a nombre del demandado en el sistema financiero' },
      { key: 'MONTO', label: 'Monto a embargar', type: 'money' },
      { key: 'AUTOS', label: 'Carátula', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado (Depto. Judicial)', type: 'text' },
      { key: 'VEROSIMILITUD', label: 'Verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA EMBARGO DE CUENTA BANCARIA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito EMBARGO PREVENTIVO sobre los fondos en la/s cuenta/s de titularidad de {{EMBARGADO}}, D.N.I./C.U.I.T. {{DNI_EMBARGADO}}, hasta cubrir PESOS {{MONTO}} (\${{MONTO}}) con más intereses y costas:

{{CBU_O_CUENTA}}
Banco: {{BANCO}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 207, 209, 210 CPCC PBA; ley 21.526.

VI. PETITORIO

A V.S. solicito:
1. Se decrete el embargo solicitado.
2. Se libre OFICIO al Banco indicado o, en su defecto, al BCRA conforme art. 4° ley 21.526 a fin de individualizar y trabar las cuentas del demandado.
3. Se autorice al letrado al diligenciamiento.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-embargo-sueldo-alimentos-pba',
    title: 'Embargo de Sueldo — Alimentos (PBA)',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Embargo de salario por incumplimiento de cuota alimentaria en juzgados de Familia de PBA.',
    tags: ['cautelar', 'embargo', 'sueldo', 'alimentos', 'PBA', 'art. 660 CCyCN', 'ley 12569'],
    legalBasis: 'Arts. 658, 660 CCyCN; art. 147 LCT; arts. 195, 209 CPCC PBA; dec. 484/87; ley provincial 12569.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'PROGENITOR', label: 'Progenitor representante', type: 'text' },
      { key: 'DNI_PROGENITOR', label: 'DNI del progenitor', type: 'text' },
      { key: 'HIJOS', label: 'Hijos beneficiarios', type: 'textarea' },
      { key: 'ALIMENTANTE', label: 'Alimentante obligado', type: 'text' },
      { key: 'DNI_ALIMENTANTE', label: 'DNI/CUIL del alimentante', type: 'text' },
      { key: 'EMPLEADOR_ALIMENTANTE', label: 'Empleador', type: 'text' },
      { key: 'DOMICILIO_EMPLEADOR', label: 'Domicilio del empleador', type: 'text' },
      { key: 'MONTO_CUOTA', label: 'Monto mensual de la cuota', type: 'money' },
      { key: 'PORCENTAJE_RETENCION', label: 'Porcentaje a retener', type: 'text', defaultValue: '20%' },
      { key: 'AUTOS', label: 'Carátula', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado de Familia (Depto. Judicial)', type: 'text' },
      { key: 'FECHA_RESOLUCION_CUOTA', label: 'Fecha resolución cuota', type: 'date' },
    ],
    content: `SOLICITA EMBARGO DE SUELDO POR INCUMPLIMIENTO DE CUOTA ALIMENTARIA

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, por {{PROGENITOR}}, D.N.I. {{DNI_PROGENITOR}}, en su carácter de progenitor/a y representante legal de los menores beneficiarios, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito EMBARGO sobre la remuneración mensual de {{ALIMENTANTE}}, D.N.I./C.U.I.L. {{DNI_ALIMENTANTE}}, en relación de dependencia con {{EMPLEADOR_ALIMENTANTE}}, en una proporción equivalente al {{PORCENTAJE_RETENCION}} del salario neto, hasta cubrir la cuota alimentaria de PESOS {{MONTO_CUOTA}} (\${{MONTO_CUOTA}}) y los importes en mora.

II. HECHOS Y VEROSIMILITUD

Por resolución del {{FECHA_RESOLUCION_CUOTA}} V.S. fijó cuota alimentaria a favor de los menores {{HIJOS}}, a cargo del alimentante {{ALIMENTANTE}}.

El alimentante ha incurrido en incumplimientos reiterados que vuelven necesaria la traba de la presente medida.

III. PELIGRO EN LA DEMORA

La cuota alimentaria atiende a la subsistencia de los menores. La verosimilitud del derecho está dada por la propia resolución que fijó la cuota.

IV. ALCANCE DE LA RETENCIÓN

Se solicita una retención del {{PORCENTAJE_RETENCION}} sobre la remuneración neta del alimentante (art. 147 LCT y dec. 484/87), depósito a la orden del Tribunal entre el primer y quinto día hábil de cada mes con copia del recibo de haberes.

V. DERECHO

Arts. 658 y 660 CCyCN; art. 147 LCT; arts. 195, 209 CPCC PBA; dec. 484/87; ley provincial 12569.

VI. PETITORIO

A V.S. solicito:
1. Se decrete el embargo en la proporción solicitada.
2. Se libre OFICIO al empleador {{EMPLEADOR_ALIMENTANTE}}, con domicilio en {{DOMICILIO_EMPLEADOR}}.
3. Se haga saber al empleador que la falta de cumplimiento lo hace solidariamente responsable.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-anotacion-litis-pba',
    title: 'Anotación de Litis sobre Inmueble (PBA)',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Anotación de litis sobre inmueble en jurisdicción de PBA. Oficio al Registro de la Propiedad Inmueble de la Provincia.',
    tags: ['cautelar', 'anotación de litis', 'PBA', 'art. 229 CPCC PBA'],
    legalBasis: 'Arts. 195, 198, 207, 229 CPCC PBA; arts. 1893, 1902 CCyCN; ley 17.801; ley provincial 5708.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'INMUEBLE_UBICACION', label: 'Ubicación del inmueble', type: 'textarea' },
      { key: 'MATRICULA', label: 'Matrícula registral', type: 'text' },
      { key: 'NOMENCLATURA', label: 'Nomenclatura catastral', type: 'text' },
      { key: 'TITULAR_REGISTRAL', label: 'Titular registral', type: 'text' },
      { key: 'AUTOS', label: 'Carátula', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado (Depto. Judicial)', type: 'text' },
      { key: 'OBJETO_LITIS', label: 'Objeto del juicio', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA ANOTACIÓN DE LITIS

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete la ANOTACIÓN DE LITIS sobre el siguiente inmueble:
- Ubicación: {{INMUEBLE_UBICACION}}
- Matrícula: {{MATRICULA}}
- Nomenclatura catastral: {{NOMENCLATURA}}
- Titular registral: {{TITULAR_REGISTRAL}}.

II. VEROSIMILITUD DEL DERECHO Y OBJETO DE LA LITIS

En el presente juicio se discute: {{OBJETO_LITIS}}

La anotación de litis no afecta la disponibilidad sino que torna oponible erga omnes la sentencia que recaiga (arts. 1893, 1902 CCyCN).

III. PELIGRO EN LA DEMORA

De no decretarse la anotación, un eventual adquirente podría invocar la condición de tercero de buena fe ajeno al pleito.

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 207, 229 CPCC PBA; arts. 1893, 1902 CCyCN; ley 17.801; ley provincial 5708.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la anotación de litis.
2. Se libre OFICIO al Registro de la Propiedad Inmueble de la Provincia de Buenos Aires (La Plata).
3. Se autorice al letrado al diligenciamiento.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-no-innovar-pba',
    title: 'Prohibición de Innovar (PBA)',
    category: 'Civil',
    subcategory: 'Cautelares',
    description: 'Cautelar de no innovar en proceso ante tribunales de PBA.',
    tags: ['cautelar', 'no innovar', 'PBA', 'art. 230 CPCC PBA'],
    legalBasis: 'Arts. 195, 198, 199, 207, 230 CPCC PBA.',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'SOLICITANTE', label: 'Solicitante', type: 'text' },
      { key: 'CONTRA', label: 'Persona contra quien se dirige', type: 'text' },
      { key: 'AUTOS', label: 'Carátula', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado (Depto. Judicial)', type: 'text' },
      { key: 'STATU_QUO', label: 'Statu quo a mantener', type: 'textarea' },
      { key: 'ACTO_A_EVITAR', label: 'Acto que se pretende evitar', type: 'textarea' },
      { key: 'VEROSIMILITUD', label: 'Verosimilitud', type: 'textarea' },
      { key: 'PELIGRO_DEMORA', label: 'Peligro en la demora', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria' },
    ],
    content: `SOLICITA PROHIBICIÓN DE INNOVAR

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, por {{SOLICITANTE}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete PROHIBICIÓN DE INNOVAR contra {{CONTRA}}, ordenándole abstenerse de alterar la siguiente situación:

{{STATU_QUO}}

En particular, se solicita que el demandado se abstenga de:

{{ACTO_A_EVITAR}}

II. VEROSIMILITUD DEL DERECHO

{{VEROSIMILITUD}}

III. PELIGRO EN LA DEMORA

{{PELIGRO_DEMORA}}

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 198, 199, 207 y 230 CPCC PBA.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la prohibición de innovar.
2. Se notifique al demandado bajo apercibimiento del art. 239 CP y conminaciones del art. 37 CPCC PBA.
3. Se fije la contracautela.

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },

  {
    id: 'cau-no-innovar-familia-pba',
    title: 'Cautelar de No Innovar — Familia (PBA)',
    category: 'Familia',
    subcategory: 'Cautelares',
    description: 'Cautelar de no innovar en sede de Familia de PBA — para impedir conductas unilaterales del otro progenitor que afecten a los hijos.',
    tags: ['cautelar', 'no innovar', 'familia', 'PBA', 'interés superior del niño'],
    legalBasis: 'Arts. 195, 230 CPCC PBA; arts. 706, 707, 645, 642 CCyCN; CDN art. 3; ley provincial 13298 (promoción y protección de derechos de niños).',
    placeholders: [
      { key: 'LETRADO', label: 'Letrado/a firmante', type: 'text' },
      { key: 'TOMO', label: 'Tomo CALP', type: 'text' },
      { key: 'FOLIO', label: 'Folio CALP', type: 'text' },
      { key: 'PROGENITOR', label: 'Progenitor solicitante', type: 'text' },
      { key: 'OTRO_PROGENITOR', label: 'Otro progenitor', type: 'text' },
      { key: 'HIJOS', label: 'Hijos involucrados', type: 'textarea' },
      { key: 'STATU_QUO', label: 'Situación a mantener', type: 'textarea' },
      { key: 'CONDUCTA_A_EVITAR', label: 'Conducta a evitar', type: 'textarea' },
      { key: 'AUTOS', label: 'Carátula', type: 'text' },
      { key: 'JUZGADO', label: 'Juzgado de Familia (Depto. Judicial)', type: 'text' },
      { key: 'INTERES_SUPERIOR', label: 'Interés superior del niño', type: 'textarea' },
      { key: 'CONTRACAUTELA', label: 'Contracautela', type: 'text', defaultValue: 'Caución juratoria atento al carácter familiar (art. 199 CPCC PBA)' },
    ],
    content: `SOLICITA CAUTELAR DE NO INNOVAR — INTERÉS SUPERIOR DEL NIÑO

Señor Juez:

{{LETRADO}}, T.° {{TOMO}} F.° {{FOLIO}} CALP, en representación de {{PROGENITOR}}, en autos "{{AUTOS}}" ante el {{JUZGADO}}, a V.S. me presento y digo:

I. OBJETO

Solicito se decrete CAUTELAR DE NO INNOVAR contra {{OTRO_PROGENITOR}}, ordenándole abstenerse de alterar la siguiente situación de los hijos comunes {{HIJOS}}:

{{STATU_QUO}}

En particular, se solicita que el otro progenitor se abstenga de:

{{CONDUCTA_A_EVITAR}}

II. VEROSIMILITUD DEL DERECHO

Mi mandante ostenta la responsabilidad parental conjunta de los menores conforme arts. 638 y ss. CCyCN. Las decisiones de relevancia respecto de la persona del hijo requieren consentimiento de ambos progenitores (arts. 645, 642 CCyCN).

III. PELIGRO EN LA DEMORA E INTERÉS SUPERIOR DEL NIÑO

{{INTERES_SUPERIOR}}

El art. 706 CCyCN consagra la tutela judicial efectiva en cuestiones de familia. El art. 3 CDN y la ley provincial 13298 imponen considerar primordialmente el interés superior del niño.

IV. CONTRACAUTELA

Se ofrece: {{CONTRACAUTELA}}.

V. DERECHO

Arts. 195, 230 CPCC PBA; arts. 706, 707, 645, 642 CCyCN; art. 3 CDN; leyes 26.061 y provincial 13298.

VI. PETITORIO

A V.S. solicito:
1. Se decrete la cautelar de no innovar solicitada.
2. Se notifique al otro progenitor bajo apercibimiento del art. 239 CP y art. 37 CPCC PBA.
3. Se corra vista al Asesor de Incapaces (art. 103 CCyCN).

Proveer de conformidad.
SERÁ JUSTICIA.`,
  },
];
