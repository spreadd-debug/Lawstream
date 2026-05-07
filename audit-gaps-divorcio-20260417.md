# Audit de Lawstream — Diagnóstico de gaps para divorcio judicializado complejo

**Fecha:** 2026-04-17
**Alcance:** solo diagnóstico. No se modifica código ni se implementa nada.

---

## Contexto

Se simuló mentalmente el caso "Martínez c/ Fernández s/ Divorcio" (PBA, unilateral, con violencia familiar previa, 4 hilos de prueba paralelos, incidente de alimentos provisorios, apelación parcial y ejecución) contra el estado actual del código. Se leyeron:

- Modelo de datos Supabase: [supabase/schema.sql](supabase/schema.sql), [supabase/migration_financiero_judicial.sql](supabase/migration_financiero_judicial.sql), [sql/006_flow_engine.sql](sql/006_flow_engine.sql)–[sql/016_eventos_plazos.sql](sql/016_eventos_plazos.sql).
- Tipos TS: [src/types.ts](src/types.ts).
- Motor de plazos: [src/lib/plazos.ts](src/lib/plazos.ts).
- Templates de flujo: [src/data/templates.ts](src/data/templates.ts) (divorcio CABA líneas 3-343, PBA 345-707, urgencia 1041+).
- Motor de flow: [src/lib/flowEngine.ts](src/lib/flowEngine.ts), [src/lib/taskEngine.ts](src/lib/taskEngine.ts).
- UI detalle: [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx), [src/components/TimelinePanel.tsx](src/components/TimelinePanel.tsx), [src/components/CrearAsunto.tsx](src/components/CrearAsunto.tsx), [src/components/CommunicationsLog.tsx](src/components/CommunicationsLog.tsx).

---

## Resumen ejecutivo

- **Total de gaps identificados:** 31.
- **Distribución por criticidad:** ALTA: 14 · MEDIA: 12 · BAJA: 5.
- **Distribución por categoría:** Modelo de datos: 11 · Workflow y etapas: 6 · Motor de plazos: 4 · Tipos de evento: 3 · UI/UX: 4 · Documentos: 2 · Notificaciones/Alertas: 1.
- **Top 5 críticos a resolver primero:** GAP 1 (incidentes), GAP 2 (hilos paralelos), GAP 3 (etapa Prueba), GAP 6 (Perito), GAP 10 (tipos de evento faltantes). Ver justificación al final.
- **Descartables / postergables:** GAP 13, 14, 15, 25, 27 — justificados al final.

---

## Inventario completo de gaps

### Categoría: Modelo de datos

#### GAP 1: Sin modelo de incidentes / sub-procesos
**Descripción:** el caso madre puede tener tramitaciones paralelas que corren en "cuerda separada" con su propio ciclo (traslado → contestación → resolución), pero no son un caso independiente.
**Situación que lo revela:** 18/09/2025 — apertura del incidente de alimentos provisorios que tramita dentro del mismo expediente y resuelve el 22/10/2025 con cuota de $320.000.
**Estado actual:** no existe tabla `incidentes` ni relación parent-child entre `matters`. El workaround sería crear otro matter suelto, pero se pierde vinculación, se duplican datos del cliente y queda fuera del timeline del caso madre.
**Criticidad:** ALTA.
**Frecuencia estimada:** 60–70% de los divorcios con hijos menores. Universal en familia (alimentos provisorios, tenencia cautelar, exclusión de hogar, autorizaciones de viaje).
**Dependencias:** desbloquea visualización parent-child en Timeline (GAP 2) y Cámara como sub-proceso (GAP 4).
**Categoría:** Modelo de datos.

#### GAP 2: Timeline no visualiza hilos paralelos
**Descripción:** durante la etapa probatoria hay varias pericias, testimoniales e informativas corriendo en paralelo. El Timeline actual los muestra como una lista cronológica única sin agrupación por "hilo".
**Situación que lo revela:** entre 12/08 y 10/11/2025 corren simultáneamente Hilo A (pericial contable SRL), Hilo B (tasadora inmueble), Hilo C (3 tandas de testimoniales) e Hilo D (3 oficios informativos). En la UI actual los eventos se entremezclan sin forma de seguir un hilo.
**Estado actual:** `TimelinePanel.tsx` ordena eventos por fecha. No hay agrupación, coloreado por hilo, ni filtro por tipo de prueba.
**Criticidad:** ALTA.
**Frecuencia estimada:** 100% de divorcios que se abren a prueba (40–50% de los contenciosos).
**Dependencias:** ideal resolver después de GAP 17 (modelado de prueba / hilos).
**Categoría:** UI/UX.

#### GAP 3: Sin etapa "Prueba/Probatoria" en templates familia
**Descripción:** el stepper de divorcio CABA/PBA va Inicio → Demanda → Audiencia → Sentencia → Ejecución. No hay etapa intermedia de Prueba.
**Situación que lo revela:** 20/06/2025 "se abre la causa a prueba por 30 días". El caso entra en un período de ~4 meses de actividad probatoria que el sistema no modela como etapa.
**Estado actual:** tanto `fam-divorcio` como `fam-divorcio-pba` saltan directamente de Audiencia a Sentencia. Sólo el módulo laboral tiene estado `'prueba'` en `ExpedienteLaboral`.
**Criticidad:** ALTA.
**Frecuencia estimada:** 40–50% de los divorcios (los contenciosos donde no hay acuerdo).
**Dependencias:** habilita GAP 2 (visualización hilos) y GAP 17.
**Categoría:** Workflow y etapas.

#### GAP 4: Sin sub-proceso "Cámara/Apelación"
**Descripción:** la apelación parcial abre un nuevo ciclo procesal en segunda instancia (expresión de agravios → contestación → elevación → autos → sentencia de Cámara) que el sistema no modela.
**Situación que lo revela:** 27/02 – 15/07/2026 — Diego apela compensación económica. Fase completa de Cámara que la app no tiene cómo representar.
**Estado actual:** en familia no existe etapa ni sub-proceso de Cámara. En laboral hay estado `'apelacion'` pero sin flow propio.
**Criticidad:** ALTA.
**Frecuencia estimada:** 30–40% de los divorcios contenciosos llegan a Cámara.
**Dependencias:** depende de GAP 1 (modelo de sub-procesos).
**Categoría:** Workflow y etapas.

#### GAP 5: Sin estado "parcialmente firme"
**Descripción:** tras una apelación parcial, parte de la sentencia queda firme y parte sigue discutiéndose en Cámara.
**Situación que lo revela:** 27/02/2026 — Diego apela solo la compensación económica. El resto (disolución del vínculo, cuota definitiva, atribución de vivienda, costas) queda firme, pero el caso no puede estar "firme + apelado" a la vez.
**Estado actual:** `matter.status` es `Activo | Suspendido | Cerrado | Pausado` — binario respecto a firmeza.
**Criticidad:** ALTA.
**Frecuencia estimada:** 60–70% de los divorcios apelados tienen apelación parcial.
**Dependencias:** requiere GAP 4 (Cámara como sub-proceso).
**Categoría:** Modelo de datos.

#### GAP 6: Sin entidad "Perito" con estado
**Descripción:** los peritos tienen ciclo de vida (sorteado → aceptado → visita/labor → informe presentado → impugnación → pedido de explicaciones → contestación) y datos persistentes (nombre, especialidad, matrícula, contacto).
**Situación que lo revela:** Hilo A — CPN Raúl Martínez designado 12/08, acepta 25/08, presenta informe 15/10, se pide explicaciones 28/10, contesta 10/11. Hilo B — Arq. Marta Gómez con ciclo similar.
**Estado actual:** sólo existen tipos de evento `pericia_designada` / `pericia_presentada` y datos del perito sueltos en `metadata (JSONB)` del evento. Sin tabla, sin estado, sin trazabilidad.
**Criticidad:** ALTA.
**Frecuencia estimada:** 70–80% de los divorcios contenciosos tienen al menos una pericia.
**Dependencias:** relacionado con GAP 10 (faltan tipos de evento para pericia).
**Categoría:** Modelo de datos.

#### GAP 7: Sin entidad "Cédula" con múltiples intentos
**Descripción:** una cédula puede requerir varios intentos de diligenciamiento; cada intento tiene fecha, resultado y notas.
**Situación que lo revela:** 28/02/2025 primer intento a Diego (nadie atiende), 04/03/2025 segundo intento (notificado en persona).
**Estado actual:** se registran como dos eventos separados (`oficio_provisto` + `oficio_diligenciado`) sin agrupación. Sin tabla `cedulas` ni concepto de "intento".
**Criticidad:** MEDIA.
**Frecuencia estimada:** 30–40% de las cédulas necesitan más de un intento.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 8: Sin entidad "Parte" ni "Letrado contrario" con historial
**Descripción:** las partes y sus letrados tienen datos estructurados y cambian en el tiempo.
**Situación que lo revela:** 30/05/2025 — Kasmir renuncia, asume Dr. Sebastián Vera. Laura necesita saber quién es el apoderado vigente y consultar el histórico (Kasmir T° 45 F° 234 CASI).
**Estado actual:** `conyuge2_abogado` y `conyuge2_abogado_matricula` viven como strings en `matter.caseData` (JSONB). Sobrescribirlos borra el dato anterior. El `audit_log` global preserva el cambio pero sólo el Socio lo ve y no está integrado a la UI del caso.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 20–30% de los casos tienen cambio de letrado contrario; 100% necesitan datos estructurados del letrado.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 9: Sin tracking de cuotas de compensación económica
**Descripción:** compensaciones se pagan en cuotas con calendario (frecuencia, intereses, mora, cumplimiento).
**Situación que lo revela:** 20/02/2026 — sentencia fija compensación de $50M en 24 cuotas mensuales. El caso sigue vivo hasta completar el cobro.
**Estado actual:** la Propuesta Reguladora captura los campos (`compensacion_monto`, `compensacion_tipo`, `compensacion_plazo`) pero no hay tabla de cuotas, calendario, ni tracking de pagos post-sentencia.
**Criticidad:** ALTA.
**Frecuencia estimada:** 20–30% de divorcios con patrimonio relevante piden compensación.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 10: Tipos de evento incompletos
**Descripción:** faltan varios tipos de evento que aparecen en el caso y no están en el enum `TipoEvento`.
**Situación que lo revela:** a lo largo del caso se necesitan: `aceptación de cargo de perito` (25/08), `pedido de explicaciones` (28/10), `contestación de explicaciones` (10/11), `audiencia testimonial` diferenciada de `audiencia_celebrada` (15/09, 22/09, 15/10), `ofrecimiento de prueba` (10/07), `autos para alegar` y `autos para sentencia` (15/11, 01/12), `expresión de agravios` (10/03) / `contestación de agravios` (25/03), `elevación a Cámara` (15/04), `regulación de honorarios` (20/09), `cambio de representación letrada` (30/05).
**Estado actual:** `TipoEvento` en [src/types.ts:587-605](src/types.ts#L587-L605) sólo cubre 15 tipos + "otro". Todo lo anterior quedaría forzado a `otro` o `resolucion`, perdiendo disparos automáticos de plazos.
**Criticidad:** ALTA.
**Frecuencia estimada:** universal — aparecen en casi todos los contenciosos.
**Dependencias:** GAP 6 (Perito) y GAP 17 (prueba estructurada) los consumen.
**Categoría:** Tipos de evento.

#### GAP 11: Sin distinción entre UMAs e IUS
**Descripción:** PBA regula honorarios en UMAs (Unidad de Medida Arancelaria provincial) y CABA en IUS.
**Situación que lo revela:** 20/01/2025 presupuesto 15 UMAs (PBA). 20/09/2026 regulación 80/50 UMAs actor/demandado.
**Estado actual:** el sistema sólo maneja IUS (`studio_config.ius_valor`, `presupuesto_items.cantidad_ius`, snapshot en presupuesto). Presupuestos en jurisdicción PBA quedan mal denominados.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 40–50% de los casos si el estudio opera en PBA.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 12: Sin tracking de honorarios regulados y su cobro
**Descripción:** honorarios regulados por el juez son distintos del presupuesto inicial con el cliente; tienen su propio ciclo (regulación → apelación → firmeza → ejecución → cobro).
**Situación que lo revela:** 20/09/2026 regulación 80 UMAs actor. 15/10/2026 se presenta ejecución de honorarios regulados contra Diego.
**Estado actual:** `presupuestos` tracking sólo cobro al cliente propio. No hay entidad para honorarios regulados judicialmente ni flujo de ejecución.
**Criticidad:** ALTA.
**Frecuencia estimada:** 100% de los casos con sentencia + costas generan honorarios regulados.
**Dependencias:** relaciona con GAP 11 (UMAs).
**Categoría:** Modelo de datos.

#### GAP 13: Sin tracking de tasas de justicia
**Descripción:** al iniciar la demanda se paga tasa de justicia; el sistema no la registra.
**Situación que lo revela:** 02/02/2025 pago de tasa junto con la presentación de demanda.
**Estado actual:** no hay campo ni tabla. Podría esconderse en un ítem de presupuesto pero sin tipificación.
**Criticidad:** BAJA.
**Frecuencia estimada:** 100% de los casos, pero es un dato informativo — no bloquea flujo.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 14: Matter.expediente vs tabla expedientes — redundancia
**Descripción:** `matter.expediente` (TEXT) y la tabla `expedientes` (1-a-1 con carátula, fuero, juzgado, estados) coexisten.
**Situación que lo revela:** al registrar el número de expediente 25.673/2025 (14/02) no queda claro dónde va.
**Estado actual:** dos fuentes de verdad. La columna `matter.expediente` probablemente sea pre-existente antes de crear la tabla y no fue depurada.
**Criticidad:** BAJA.
**Frecuencia estimada:** no afecta funcionalidad pero genera inconsistencia en exports y búsquedas.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP 15: Sin estado "Archivado" explícito
**Descripción:** un caso archivado judicialmente (post-ejecución cumplida) es un estado distinto de "Cerrado".
**Situación que lo revela:** 20/11/2026 — resolución de archivo del expediente.
**Estado actual:** `MatterStatus` sólo tiene `Activo | Suspendido | Cerrado | Pausado`. "Cerrado" se usa para cualquier finalización.
**Criticidad:** BAJA.
**Frecuencia estimada:** bajo impacto — sólo afecta reportes de archivo.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

---

### Categoría: Workflow y etapas

#### GAP 16: Sin "modo espera" diferenciado para autos para sentencia
**Descripción:** cuando el caso queda "a sentencia", el próximo movimiento depende del juzgado — no hay acción que el abogado pueda hacer más que esperar. Hoy se confunde con un caso "pausado" o "en espera".
**Situación que lo revela:** 01/12/2025 — autos para sentencia. Laura pregunta "¿qué hacemos?" y la respuesta es "esperar hasta 20/02/2026".
**Estado actual:** sólo `matter.health: 'En espera'` (genérico para espera de contraparte, de juzgado, etc.) y `matter.status: 'Pausado'`. No hay visualización específica en el hero card de MatterDetail.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 100% de los casos llegan a esta fase.
**Dependencias:** ninguna.
**Categoría:** Workflow y etapas.

#### GAP 17: Sin modelado de "ofrecimiento de prueba" ni hilos como entidad
**Descripción:** la etapa probatoria se estructura en ofrecimiento → resolución de admisión → producción (por hilo) → cierre. Cada hilo (pericial X, testimonial Y, informativa Z) es una entidad con estado propio.
**Situación que lo revela:** 10/07 ofrecimiento de Laura (5 hilos), 15/07 ofrecimiento de Diego (incluye pericial psicológica impugnada), 05/08 resolución admitiendo/rechazando prueba, luego 4 hilos corriendo en paralelo hasta 15/11.
**Estado actual:** no hay entidad "hilo de prueba". Los eventos sueltos no se agrupan.
**Criticidad:** ALTA.
**Frecuencia estimada:** 40–50% — divorcios contenciosos que se abren a prueba.
**Dependencias:** es el pre-requisito lógico de GAP 2 y GAP 3.
**Categoría:** Workflow y etapas.

#### GAP 18: Checklist de ejecución de sentencia insuficiente
**Descripción:** la etapa de ejecución en divorcio incluye múltiples trámites estructurados que el checklist actual apenas toca.
**Situación que lo revela:** 10/09/2026 — escritura de atribución de vivienda + Formulario 08 del automotor + división cuenta conjunta + liquidación SRL + cobro de compensación + inscripción en Registro Civil + ejecución de honorarios.
**Estado actual:** [templates.ts:310-323](src/data/templates.ts#L310-L323) sólo incluye 4 tareas genéricas ("Verificar inscripción Registro Civil", "Inscribir transferencias", "Liquidación sociedad conyugal", "Archivar"). No hay checklist detallado por tipo de bien/trámite.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 80–90% de los divorcios con patrimonio.
**Dependencias:** se vincula con GAP 9 (cuotas compensación) y GAP 12 (honorarios regulados).
**Categoría:** Workflow y etapas.

#### GAP 19: Cambio de representación letrada no es evento con tracking
**Descripción:** cambiar el letrado contrario debería generar un evento, disparar tareas ("Verificar poder del nuevo letrado", "Actualizar datos") y preservar el histórico del letrado anterior.
**Situación que lo revela:** 30/05/2025 — Kasmir renuncia, asume Vera. Hoy sólo se sobrescribe `conyuge2_abogado` en `caseData`.
**Estado actual:** sin tipo de evento, sin tabla de letrados históricos. Sólo `audit_log` general.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 20–30% de los casos tienen cambio.
**Dependencias:** relacionado con GAP 8 (entidad letrado) y GAP 10 (tipo de evento).
**Categoría:** Workflow y etapas.

#### GAP 20: Bifurcación PBA no fuerza Consejero de Familia cuando corresponde
**Descripción:** el template `fam-divorcio-pba` tiene "Consejería de Familia" como etapa, pero el flujo no la exige siempre. En divorcio unilateral PBA sigue siendo etapa previa obligatoria salvo urgencia documentada.
**Situación que lo revela:** este caso es unilateral PBA y sin embargo el timeline salta directo a audiencia ante juez. Verificar si el template está activando bien la etapa de Consejero.
**Estado actual:** el template sí incluye la etapa pero pudiera estar mal condicionada o el equipo la saltó manualmente. Revisar.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 100% de los divorcios unilaterales PBA.
**Dependencias:** ninguna.
**Categoría:** Workflow y etapas (posible gap de configuración, no de código).

#### GAP 21: Violencia familiar no bloquea propuestas de régimen amplio de la contraparte
**Descripción:** si hay medida cautelar de prohibición de acercamiento vigente, cualquier propuesta de régimen de comunicación amplio con los hijos es inconsistente y debería disparar alerta.
**Situación que lo revela:** 25/03/2025 — Diego contrapropone régimen amplio ignorando la medida de prohibición prorrogada hasta 15/10/2025. El abogado de Laura debe detectar el cruce manualmente.
**Estado actual:** los datos existen (`medida_vigencia_hasta`, `regimen_comunicacion`) pero no hay regla de consistencia ni alerta.
**Criticidad:** ALTA (impacto directo en calidad jurídica y protección del cliente).
**Frecuencia estimada:** 10–15% de los divorcios tienen violencia previa; en esos casos es crítico.
**Dependencias:** ninguna.
**Categoría:** Workflow y etapas.

---

### Categoría: Motor de plazos

#### GAP 22: Sin distinción plazo común vs individual
**Descripción:** un plazo común corre desde el último notificado; un plazo individual desde cada notificación.
**Situación que lo revela:** 15/11/2025 — autos para alegar, 6 días hábiles de plazo **común**. Si uno de los letrados es notificado después, el plazo recalcula para ambos.
**Estado actual:** `plazos` trata todos los vencimientos igual. No hay campo `tipo_plazo: 'comun' | 'individual'`.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 30–40% de los casos tienen al menos un plazo común (alegatos, traslados múltiples).
**Dependencias:** ninguna.
**Categoría:** Motor de plazos.

#### GAP 23: Sin plazos suspendidos/reanudados
**Descripción:** plazos pueden suspenderse (feria, licencia, incidente) y reanudarse, acumulando días ya transcurridos.
**Situación que lo revela:** 15/01 – 15/02/2026 — feria judicial de verano. Cualquier plazo que cruce queda suspendido y retoma el 16/02.
**Estado actual:** `plazos.estado` sólo admite `activo | cumplido | vencido | cancelado`. No hay `suspendido`, ni campos de reanudación, ni cálculo automático de extensión por solape con feria.
**Criticidad:** ALTA.
**Frecuencia estimada:** 50–60% de casos con ciclos largos cruzan al menos una feria.
**Dependencias:** ninguna.
**Categoría:** Motor de plazos.

#### GAP 24: PLAZOS_POR_EVENTO incompleto
**Descripción:** el mapa evento → plazos sugeridos no cubre todos los plazos reales que dispara una sentencia u otros eventos clave.
**Situación que lo revela:** 20/02/2026 sentencia → hoy sólo dispara "5 días apelación". Falta "30 días para regular honorarios", "10 días para librar oficios de inscripción", "5 días aclaratoria". Otros eventos (resolución de regulación → apelación honorarios 5 días; pericia presentada → pedido explicaciones 5 días) tampoco están.
**Estado actual:** [src/lib/plazos.ts:139-175](src/lib/plazos.ts#L139-L175) con mapa incompleto.
**Criticidad:** ALTA.
**Frecuencia estimada:** universal.
**Dependencias:** depende de GAP 10 (tipos de evento faltantes).
**Categoría:** Motor de plazos.

#### GAP 25: Seeds de feriados no cubren PBA feria de verano completa
**Descripción:** en PBA la feria judicial de verano históricamente corre desde el 1 al último día de enero, pero según la SCBA puede extenderse la primera semana de febrero según año. El caso plantea feria 15/01 – 15/02/2026, lo que supera las seeds actuales.
**Situación que lo revela:** entre 01/02 y 15/02/2026 los plazos deberían seguir suspendidos.
**Estado actual:** seeds en [sql/016_eventos_plazos.sql:156-219](sql/016_eventos_plazos.sql#L156-L219) cubren enero 01-31 y receso invernal 13-24 julio. Verificar cada año real.
**Criticidad:** MEDIA (depende de la configuración anual de la SCBA).
**Frecuencia estimada:** anual; debe mantenerse.
**Dependencias:** ninguna.
**Categoría:** Motor de plazos.

---

### Categoría: UI / UX

#### GAP 26: Hero card no muestra banner permanente de violencia familiar
**Descripción:** cuando el caso tiene medida cautelar vigente, la UI debería exhibirla de forma visible durante todo el ciclo, no sólo en la tarea de evaluación inicial.
**Situación que lo revela:** el caso tiene OVD + medida prorrogada hasta 15/10/2025 — dato crítico a lo largo de 11 meses de tramitación.
**Estado actual:** `templates.ts` tiene la sección de violencia en la ficha de Instrucción, `autoCompleteIf: { key: 'hay_urgencia' }` marca la tarea como completa, pero no hay banner permanente en la hero card ni en otros tabs.
**Criticidad:** ALTA.
**Frecuencia estimada:** 10–15% de los casos con violencia previa (alto impacto por caso).
**Dependencias:** ninguna.
**Categoría:** UI/UX.

#### GAP 27: Sin audiencia testimonial diferenciada en Timeline
**Descripción:** una audiencia testimonial tiene atributos propios (lista de testigos, quién compareció, quién faltó, si se pidió supletoria) que el Timeline no distingue de una audiencia común.
**Situación que lo revela:** 15/09 comparecen 3 testigos de Laura. 22/09 sólo comparece 1 de 2 de Diego. 05/10 se pide citar al ausente. 15/10 supletoria.
**Estado actual:** todo es `audiencia_celebrada` genérico.
**Criticidad:** BAJA.
**Frecuencia estimada:** 40–50% de los contenciosos con prueba testimonial.
**Dependencias:** relacionado con GAP 17 (hilos) y GAP 10 (tipos de evento).
**Categoría:** UI/UX.

#### GAP 28: Sin búsqueda de documento dentro del caso
**Descripción:** en un caso con 11+ meses de tramitación y decenas de documentos, debería poder buscarse por nombre, categoría o fecha.
**Situación que lo revela:** Laura pregunta por la tasación del inmueble (05/10/2025) — el abogado tiene que scrollear toda la lista.
**Estado actual:** `DocumentosGlobal.tsx` y `DocumentForm.tsx` muestran lista pero sin buscador potente dentro del caso.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 60–70% de los casos con volumen alto.
**Dependencias:** ninguna.
**Categoría:** UI/UX.

#### GAP 29: Alerta de perención demasiado genérica
**Descripción:** `PerencionAlerts` dispara en 6 meses sin movimiento. Ciertos hitos (autos para sentencia, Cámara) tienen umbrales distintos; otros requieren distintos criterios de "movimiento".
**Situación que lo revela:** el caso está en autos para sentencia del 01/12/2025 al 20/02/2026 (~3 meses). No es perención pero sí un lapso que merece seguimiento.
**Estado actual:** [src/lib/perencion.ts](src/lib/perencion.ts) único umbral.
**Criticidad:** BAJA.
**Frecuencia estimada:** usage ocasional.
**Dependencias:** relacionado con GAP 16 (modo espera).
**Categoría:** Notificaciones/Alertas.

---

### Categoría: Documentos

#### GAP 30: Vínculo documento-evento es TEXT libre
**Descripción:** `documents.associated_action` es un string suelto sin FK a `eventos_expediente`. No hay garantía referencial ni navegación desde un evento a sus documentos.
**Situación que lo revela:** informe pericial contable (15/10/2025) debería quedar vinculado al evento `pericia_presentada` específico y al hilo A.
**Estado actual:** campo libre. Se puede buscar manualmente pero no navegar.
**Criticidad:** MEDIA.
**Frecuencia estimada:** universal cuando se quiere correlacionar evento ↔ documento.
**Dependencias:** ninguna.
**Categoría:** Documentos.

#### GAP 31: Sin categorías estructuradas de documento (escrito / resolución / pericia / oficio / cédula)
**Descripción:** `documents.category` es TEXT sin enum. Impide filtrar por tipo jurídico.
**Situación que lo revela:** buscar "todos los escritos presentados" o "todas las resoluciones" no es directo.
**Estado actual:** categoría libre.
**Criticidad:** MEDIA.
**Frecuencia estimada:** cuando se consulta el expediente completo.
**Dependencias:** ninguna.
**Categoría:** Documentos.

---

## Top 5 gaps críticos a resolver primero

1. **GAP 1 — Sin modelo de incidentes/sub-procesos.** Es el fundamento para modelar alimentos provisorios, cautelares paralelas y Cámara (GAP 4). Sin esto, el 60–70% de los divorcios con hijos pierde un eje central del seguimiento.
2. **GAP 3 — Sin etapa Prueba/Probatoria.** Salta de Audiencia a Sentencia, cuando la prueba es ~4 meses de actividad crítica. Sin esta etapa, el stepper miente.
3. **GAP 10 — Tipos de evento incompletos.** Caen en `otro` por lo menos 10 tipos críticos. Sin éstos, el motor de plazos (GAP 24) no dispara nada y el timeline no tiene semántica.
4. **GAP 21 — Violencia familiar sin cruce de consistencia.** Es el único gap con impacto directo en protección del cliente. Un error aquí tiene consecuencias jurídicas y humanas serias.
5. **GAP 17 — Hilos de prueba como entidad.** Habilita visualización (GAP 2) y estructuración de la etapa. 40–50% de los divorcios lo necesitan.

Notas de orden: GAP 1 → GAP 4 → GAP 5 (encadenados por el modelo parent-child). GAP 10 → GAP 6, GAP 17 y GAP 24 (dependen del enum de eventos).

---

## Gaps descartables o postergables

- **GAP 13 (tasas de justicia).** Dato informativo. Puede dejarse como string en notas hasta tener un módulo contable completo.
- **GAP 14 (matter.expediente vs tabla expedientes).** Cleanup cosmético; no bloquea nada. Resolver en deuda técnica.
- **GAP 15 (estado "Archivado").** Bajo impacto. `Cerrado` con nota es suficiente por ahora.
- **GAP 25 (seeds feria PBA).** Es configuración anual, no feature. Resolver con una tarea recurrente de actualización anual.
- **GAP 27 (audiencia testimonial diferenciada).** Puede resolverse con subtipos en metadata JSONB mientras no se modele GAP 17.

---

## Preguntas abiertas

1. **Bifurcación PBA + Consejero de Familia:** verificar si el template `fam-divorcio-pba` hoy fuerza la etapa de Consejero para divorcios unilaterales o si es opcional. Si es opcional, ¿fue decisión de diseño o gap?
2. **Matter.expediente vs expedientes:** ¿cuál es la fuente de verdad actual? ¿El código lee ambos? (potencial inconsistencia).
3. **Audiencia suspendida → nueva fecha:** ¿cómo se vincula el evento suspendido con el celebrado posterior? Hoy parecen eventos sueltos sin relación.
4. **Cuándo promover una consulta que viene con urgencia a template `fam-proteccion-urgente`:** ¿hay flujo "convertir a urgente" o la consulta debe haberse etiquetado así desde el inicio?
5. **Audit log de cambios en caseData:** ¿guarda el diff completo de `caseData` o sólo el evento del matter?
6. **Storage de archivos:** el modelo de documentos es sólo metadatos. ¿Hay bucket Supabase Storage configurado o es una decisión pendiente?
7. **MEV PBA:** la infraestructura de `scraper_mev` está preparada en `eventos_expediente.origen`, pero no hay código. ¿Roadmap o futuro incierto?
