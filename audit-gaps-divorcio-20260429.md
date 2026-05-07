# Audit de Lawstream — Diagnóstico de gaps para caso Ruiz / Colombo

**Fecha:** 2026-04-29
**Alcance:** solo diagnóstico. No se modifica código ni se implementa nada.
**Comparado contra:** [audit-gaps-divorcio-20260417.md](audit-gaps-divorcio-20260417.md) (caso García/Fernández).

---

## Contexto

Se simuló mentalmente el caso "Ruiz, Sebastián Nicolás y Colombo, Valentina s/ Divorcio" (CABA, presentación conjunta que muta a contencioso unilateral, separación de bienes, hija con TEA, hijo que cumple 18 mid-process, bienes en Uruguay e Italia, causa penal vinculada por vaciamiento, doble apelación cruzada, mora en compensación) contra el estado actual del código. Se leyeron:

- Modelo de datos: [supabase/schema.sql](supabase/schema.sql), [sql/016_eventos_plazos.sql](sql/016_eventos_plazos.sql)–[sql/040_admin_audit_y_firm_status.sql](sql/040_admin_audit_y_firm_status.sql).
- Tipos TS: [src/types.ts](src/types.ts).
- Motor de plazos: [src/lib/plazos.ts](src/lib/plazos.ts).
- Templates: [src/data/templates.ts](src/data/templates.ts) (fam-divorcio CABA 1-448, fam-divorcio-pba 461-914).
- UI: [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx), [src/components/SubProcesosPanel.tsx](src/components/SubProcesosPanel.tsx), [src/components/HilosPanel.tsx](src/components/HilosPanel.tsx), [src/components/PeritosPanel.tsx](src/components/PeritosPanel.tsx), [src/components/CompensacionPanel.tsx](src/components/CompensacionPanel.tsx), [src/components/CedulasPanel.tsx](src/components/CedulasPanel.tsx).
- Reglas: [src/lib/violencia.ts](src/lib/violencia.ts) (cruce GAP21), [src/lib/perencion.ts](src/lib/perencion.ts).

### Estado de gaps del audit anterior

Verificado en código actual: GAP 1 (sub-procesos vía `kind`/`parentMatterId`), 2 (`hiloId` en eventos + HilosPanel), 3 (etapa Prueba en CABA y PBA), 4 (kind='apelacion'), 5 (banner derivado parcialmente firme), 6 (tabla `peritos` + PeritosPanel), 7 (`cedulas` + `cedula_intentos`), 8 (`letrados_parte`), 9 (`compensaciones`+`cuotas_compensacion`), 10 (TipoEvento extendido a 28 tipos), 11 (UnidadArancelaria JUS/UMA), 12 (`honorarios_regulados`), 15 (`Archivado` en MatterStatus), 17 (HiloPrueba), 18 (etapa Ejecución condicional por flags), 19 (`cambio_representacion` + LetradoParte), 21 (`detectarCruceViolencia` + banner), 22 (`tipoPlazo: comun|individual`), 23 (`suspendido` con `diasTranscurridosAlSuspender`), 26 (banner medida en MatterDetail.tsx:405), 27 (`audiencia_testimonial`), 28 (filteredDocuments con search/status/category), 30 (`eventoId` en LegalDocument), 31 (`DocumentCategory` enum) están **resueltos**.

Quedan abiertos del audit anterior: GAP 13 (tasa de justicia, postergado por diseño), GAP 14 (matter.expediente legacy, mitigado por migración 031), GAP 16 (modo "autos para sentencia" — implementado parcialmente con `autosNivelAlerta` en MatterDetail.tsx:136, sí cumple el caso), GAP 20 (Consejero PBA forzado en unilateral — verificar manualmente si template lo exige), GAP 24 (PLAZOS_POR_EVENTO — sentencia hoy dispara apelación + aclaratoria pero sigue faltando "30 días para regular honorarios" y "5 días para inscripciones"), GAP 25 (seeds anuales), GAP 29 (perención single-threshold).

---

## Resumen ejecutivo

- **Total de gaps NUEVOS identificados (caso Ruiz/Colombo):** 23.
- **Distribución por criticidad:** ALTA: 9 · MEDIA: 9 · BAJA: 5.
- **Distribución por categoría:** Modelo de datos: 11 · Workflow y etapas: 5 · Tipos de evento: 3 · UI/UX: 3 · Notificaciones/Alertas: 1.
- **Top 5 críticos a resolver primero:** GAP R1 (hijos con discapacidad), GAP R2 (régimen parental por hijo), GAP R6 (mutación de tipo de divorcio), GAP R10 (demanda reconvencional), GAP R11 (apelaciones cruzadas con apelado_por).
- **Descartables / postergables:** GAP R7, R14, R17, R20, R21 — justificados al final.

---

## Inventario completo de gaps

### Categoría: Modelo de datos

#### GAP R1: Hijos sin campos de discapacidad / régimen especial / terapias
**Descripción:** los subFields del repeatable `hijos` cubren nombre, DNI, fecha de nacimiento, escolaridad y establecimiento; no contemplan condiciones de salud, certificaciones, terapias o necesidades especiales. Sin estos campos no se puede fundar régimen progresivo, atribución de vivienda con plazo extendido ni cuota diferenciada por hijo.
**Situación que lo revela:** Olivia Ruiz Colombo (8 años) tiene TEA nivel 1 desde 2022, asiste a TO 2x/sem ($280k), fonoaudiología 1x/sem ($150k) y AT escolar 4hs/día ($250k). Total $680.000/mes — base del incidente de aumento de cuota provisoria del 10/05/2026 y de la sentencia que fija residencia con la madre.
**Estado actual:** [src/data/templates.ts:107-122](src/data/templates.ts#L107-L122) define `hijos` con 5 subFields planos. Sin campos `tiene_certificado_discapacidad`, `diagnostico`, `prestadores`, `terapias[]`, `costo_terapias`, `acompañante_terapeutico`.
**Criticidad:** ALTA.
**Frecuencia estimada:** 5–8% de divorcios con hijos tienen al menos uno con CUD/ND, pero en esos casos es lo que define cuota, régimen y atribución.
**Dependencias:** habilita GAP R2 (régimen por hijo) y GAP R13 (cuota en especie).
**Categoría:** Modelo de datos.

#### GAP R2: Régimen parental único para todos los hijos (no individual)
**Descripción:** la propuesta reguladora tiene un solo `tipo_cuidado` y un solo `regimen_comunicacion` (textarea) para todo el grupo familiar. No es posible cargar regímenes distintos por hijo cuando las edades, situaciones o el resultado de la pericia psicológica difieren entre ellos.
**Situación que lo revela:** la propuesta inicial de los Ruiz/Colombo ya plantea **tres** regímenes distintos: alternado para Isabella (14), progresivo con la madre como residente principal para Olivia (8, TEA), y escucha del menor para Facundo (17 que cumple 18 en agosto y manifiesta querer vivir con el padre, art. 707 CCyCN). La sentencia del 20/02/2027 ratifica los tres regímenes diferenciados.
**Estado actual:** [src/data/templates.ts:194-199](src/data/templates.ts#L194-L199) tiene `tipo_cuidado` / `residencia_principal` / `regimen_comunicacion` como campos planos del caso. La estructura `repeatable` de `hijos` no admite régimen embebido.
**Criticidad:** ALTA.
**Frecuencia estimada:** 30–40% de divorcios con 2+ hijos donde hay diferencia de edad significativa o un hijo adolescente que opina.
**Dependencias:** depende de GAP R1 (datos de hijo) y de GAP R3 (mayoría de edad mid-process).
**Categoría:** Modelo de datos.

#### GAP R3: Sin transición automática "menor → mayor" durante el proceso
**Descripción:** cuando un hijo cumple 18 durante la tramitación, la cuota muta de "obligación oficiosa para hijo menor" a "alimentos a hijo mayor que estudia (art. 663 CCyCN, hasta 25 años)" y desaparece el cuidado personal sobre ese hijo. El sistema no detecta el evento ni lanza tareas de transición.
**Situación que lo revela:** Facundo Ruiz Colombo cumple 18 el 15/08/2026, en plena etapa probatoria. La sentencia del 20/02/2027 explícita el régimen del art. 663. No hay alerta automática previa, ni tarea de "verificar acreditación de estudios", ni cambio de status del hijo.
**Estado actual:** sin verificador en [src/lib/perencion.ts](src/lib/perencion.ts) ni en `tasks` autogeneradas. La fecha de nacimiento existe en `hijos[i].fecha_nacimiento` pero no se la consulta.
**Criticidad:** ALTA.
**Frecuencia estimada:** 15–20% de los divorcios con hijos donde al menos uno está entre 16 y 18 años al inicio.
**Dependencias:** habilita GAP R13 (cuota en especie/efectivo según hijo) y se cruza con GAP R2.
**Categoría:** Modelo de datos.

#### GAP R4: Sin soporte para bienes en jurisdicción extranjera
**Descripción:** el repeatable `bienes` carece de un campo `jurisdiccion_internacional` o `pais` y de la cadena asociada (exhorto / exequátur / sociedad interpuesta).
**Situación que lo revela:** Sebastián tiene apartamento en Punta del Este a nombre de Playa Serena S.A. (sociedad uruguaya unipersonal) — Hilo C requiere exhorto al Juzgado de Maldonado (informe llega 15/12/2026, 4 meses después). La sentencia abre trámite de exequátur ante autoridad uruguaya. Valentina tiene cuenta en Intesa Sanpaolo (Milán) con saldo €35.000 que requiere informativa internacional.
**Estado actual:** [src/data/templates.ts:215-227](src/data/templates.ts#L215-L227) define `tipo`/`descripcion`/`valor_estimado`/`titular`/`observaciones`. Sin `pais`, sin `via_societaria`, sin `requiere_exhorto`.
**Criticidad:** ALTA.
**Frecuencia estimada:** 10–15% en CABA con clientes de patrimonio medio-alto (RD del Este, Miami, Madrid, Italia son frecuentes).
**Dependencias:** se vincula a GAP R8 (tipo de evento "exhorto internacional") y GAP R9 (sociedad interpuesta).
**Categoría:** Modelo de datos.

#### GAP R5: Régimen patrimonial = separación de bienes no se propaga a checklist de Ejecución
**Descripción:** el campo `regimen_patrimonial` ofrece "Separación de bienes" como opción, pero la etapa Ejecución asume sociedad conyugal: hay tareas como "Determinar valuación de la participación societaria" o "Acordar adjudicación / cesión de cuotas" condicionadas únicamente a `ejec_sociedad`, no a si hubo o no comunidad. En separación de bienes no hay nada que partir; sólo se discuten compensación, atribución y deudas comunes.
**Situación que lo revela:** Ruiz/Colombo tienen separación de bienes desde la convención del 01/08/2015 (Escritura N° 456, Reg. Notarial 789). La sentencia no liquida sociedad conyugal: solo fija compensación, atribución y costas. Sin embargo el template seguirá ofreciendo "Inmuebles a transferir" en Ejecución, lo cual es jurídicamente erróneo en este régimen.
**Estado actual:** los `condition` de Ejecución en [src/data/templates.ts:384-419](src/data/templates.ts#L384-L419) no consultan `regimen_patrimonial`.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 5–10% de los matrimonios desde 2015 (CCyCN dejó la separación como opción real).
**Dependencias:** ninguna estructural; cambio de condiciones en template.
**Categoría:** Modelo de datos.

#### GAP R6: Sin mecanismo de mutación tipo de divorcio (conjunto → contencioso)
**Descripción:** un divorcio puede iniciarse de común acuerdo y mutar a contencioso unilateral si una parte retira la conformidad. Cambiar `caseData.tipo_divorcio` no reconfigura tareas pendientes/completadas, no recalcula etapas, no emite evento de mutación, no invalida el convenio parcial homologado.
**Situación que lo revela:** el 08/04/2026 Valentina retira conformidad y el divorcio muta de conjunto a contencioso unilateral promovido por Sebastián. El template tiene 9+ tareas con `condition: { tipo_divorcio, equals: 'Unilateral' }` y otras con `'De común acuerdo'` — al cambiar el flag, tareas ya completadas en la rama "conjunto" quedan inertes y aparecen tareas nuevas sin contexto histórico.
**Estado actual:** [src/lib/flowEngine.ts](src/lib/flowEngine.ts) y [src/lib/taskEngine.ts](src/lib/taskEngine.ts) regeneran tareas según `caseData` actual sin guardar memoria de la rama anterior. Sin tipo de evento `mutacion_tipo_divorcio`, sin marcadores de "tarea pertenece a rama X superada".
**Criticidad:** ALTA.
**Frecuencia estimada:** 15–20% de las presentaciones conjuntas se rompen antes de la sentencia.
**Dependencias:** atraviesa GAP R10 (reconvención: si la conjunta muta a contencioso, suele venir con reconvención).
**Categoría:** Workflow y etapas.

#### GAP R7: Convención matrimonial sin detalle estructurado (escritura, escribano, fecha)
**Descripción:** `regimen_patrimonial` es un select pero no hay campos para registrar la fecha de la convención, escribano interviniente, número de escritura y registro notarial.
**Situación que lo revela:** los Ruiz/Colombo firmaron convención el 01/08/2015 ante Esc. Reg. 789, escritura N° 456. Si en algún momento se discute validez de la convención (bastante común), esos datos son base de la prueba.
**Estado actual:** sin campos en [src/data/templates.ts:99-102](src/data/templates.ts#L99-L102).
**Criticidad:** BAJA.
**Frecuencia estimada:** 5% de los divorcios; informativo en su mayoría.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP R8: Sin tipos de evento "exhorto internacional" / "exequátur"
**Descripción:** los oficios internacionales (vía Cancillería o convenios) tienen ciclo y plazo distinto del oficio local. El exequátur es un trámite post-sentencia de reconocimiento ante autoridad extranjera.
**Situación que lo revela:** 15/12/2026 — llega exhorto Punta del Este al Juzgado de Maldonado tras 4 meses. 01/09/2027 — la sentencia firme abre trámite de exequátur en Uruguay para alcanzar al apartamento.
**Estado actual:** `TipoEvento` ([src/types.ts:730-759](src/types.ts#L730-L759)) cubre `oficio_provisto` / `oficio_diligenciado` genéricos. No hay `exhorto_internacional`, `exhorto_contestado`, `exequatur_iniciado`, `exequatur_obtenido`. PLAZOS_POR_EVENTO no contempla los rangos largos del exhorto consular.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 10–15% en CABA con patrimonio internacional.
**Dependencias:** depende de GAP R4 (bienes en exterior).
**Categoría:** Tipos de evento.

#### GAP R9: Sin modelado de sociedad interpuesta / velo societario
**Descripción:** en patrimonio medio-alto es habitual que un bien esté nominalmente a nombre de una sociedad cuyo único accionista es uno de los cónyuges. Esto cambia el régimen probatorio (hay que correr el velo) y la ejecución (no se ejecuta el bien, se ejecuta la participación).
**Situación que lo revela:** Playa Serena S.A. (Uruguay) — único accionista Sebastián, tenedora del apartamento de Punta del Este (U$S 280.000 → tasado 310.000). Hay que probar la transparencia para que el bien entre al patrimonio considerado. Análogo: SRL Centro Cardiovascular Ruiz & Asociados con MediConsult SAS interpuesta para vaciamiento.
**Estado actual:** ningún campo. El bien se carga como "Inmueble en Punta del Este" y el `titular` no admite "Sociedad interpuesta — accionista X".
**Criticidad:** MEDIA.
**Frecuencia estimada:** 8–12% de los divorcios con patrimonio relevante; alto impacto cuando aparece.
**Dependencias:** se vincula a GAP R4 (bienes en exterior) y a GAP R12 (causa penal vinculada por vaciamiento).
**Categoría:** Modelo de datos.

#### GAP R10: Sin modelo de demanda reconvencional
**Descripción:** la reconvención es una contrademanda planteada por el demandado en el mismo escrito de contestación. Tiene pretensiones propias y a su vez genera traslado al actor para contestar. No hay tipo de evento ni distinción entre demanda principal y reconvencional.
**Situación que lo revela:** 02/05/2026 — Valentina contesta con demanda reconvencional pidiendo compensación + atribución + costas. Genera traslado a Sebastián. La sentencia tendrá que pronunciarse sobre demanda y reconvención por separado.
**Estado actual:** `TipoEvento` no incluye `demanda_reconvencional` ni `contestacion_reconvencion`. Ningún campo de matter ni de evento distingue principal de reconvencional. PLAZOS_POR_EVENTO no la mapea.
**Criticidad:** ALTA.
**Frecuencia estimada:** 25–35% de los contenciosos civiles/familia (cualquier contestación con pretensión propia).
**Dependencias:** vincula con GAP R6 (mutación de tipo) — la conjunta rota suele traer reconvención.
**Categoría:** Tipos de evento.

#### GAP R11: Apelaciones-hijo sin campo "apelado por" → invisibles las apelaciones cruzadas
**Descripción:** el modelo actual permite múltiples apelaciones-hijo con `aspectos_apelados[]`, pero no distingue quién es el apelante de cada una (cliente o contraria). Cuando ambas partes apelan el mismo punto, el banner derivado en MatterDetail.tsx:115 hace `flatMap + Set` sobre los aspectos y borra la distinción.
**Situación que lo revela:** 25/02/2027 — Sebastián apela compensación + atribución vivienda. 01/03/2027 — Valentina contra-apela compensación (insuficiente). Hay **doble apelación parcial** sobre el mismo aspecto. La UI no puede expresar "Sebastián apela por monto bajo, Valentina apela por monto alto"; sólo muestra "Compensación apelada".
**Estado actual:** `Matter.aspectosApelados: AspectoApelado[]` ([src/types.ts:73](src/types.ts#L73)) sin campo `apeladoPor`. La migración 029 no lo incluye.
**Criticidad:** ALTA.
**Frecuencia estimada:** 30–40% de las apelaciones en familia tienen contra-apelación de la otra parte (efecto bilateral).
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP R12: Sin vínculo a "causa penal relacionada"
**Descripción:** un caso civil/familia puede tener una causa penal paralela cuyo resultado impacta en lo civil. El modelo de matter no admite cross-fuero: solo `MatterType: Laboral|Familia|Daños|Comercial|Sucesiones|Civil`, sin `Penal` y sin tabla `causas_relacionadas`.
**Situación que lo revela:** 20/02/2026 — Valentina presenta denuncia penal por vaciamiento patrimonial de la SRL (art. 173 CP) que tramita en otro fuero pero impacta directamente en la pericia contable y en la valuación patrimonial del divorcio. La causa penal sigue su propio ciclo y ambos abogados deben coordinarse.
**Estado actual:** sin tabla, sin enum. Workaround: usar `IncidenteTipo: 'otro'` o crear matter aparte sin vínculo.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 5–10% de los divorcios con patrimonio empresarial.
**Dependencias:** se vincula con GAP R9 (sociedad interpuesta) y GAP R15 (medidas patrimoniales).
**Categoría:** Modelo de datos.

#### GAP R13: Cuota alimentaria sin distinción efectivo / especie ni desglose por concepto
**Descripción:** la propuesta y la sentencia describen la cuota como "$X mensuales" pero la ejecución concreta tiene un componente en efectivo y otro en pago directo a profesionales (colegio, prepaga, terapeuta, AT). Sin separar, no se puede trackear cumplimiento por concepto ni reaccionar a un colegio impago.
**Situación que lo revela:** cuota provisoria 05/06/2026: $2.000.000 efectivo + $800.000 pago directo de terapias. Sentencia 20/02/2027: $3.200.000 + colegios + OSDE 410 + terapias Olivia. Si Sebastián paga el efectivo pero deja de pagar OSDE, no hay forma estructurada de avisarlo.
**Estado actual:** `cuota_porcentaje` (text) y `cuota_gastos_compartidos` (textarea libre) en [src/data/templates.ts:204-208](src/data/templates.ts#L204-L208). Sin tabla `cuotas_alimentarias` con desglose efectivo/especie y tracking de cumplimiento por concepto.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 60–70% de las cuotas en clase media-alta tienen componente en especie; en clase media tradicional es 100% efectivo.
**Dependencias:** depende de GAP R1 (terapias para Olivia ya cargadas como concepto).
**Categoría:** Modelo de datos.

#### GAP R14: Inversiones financieras / valuación patrimonial variable sin snapshot temporal
**Descripción:** los bienes tienen un único `valor_estimado` (string libre) sin fecha. No se puede registrar evolución (ej. portfolio que se revaluó o se realizó en partes durante el proceso) — dato relevante para detectar vaciamiento o desplazamientos patrimoniales.
**Situación que lo revela:** Bull Market — cartera al 31/12/2025: U$S 42.000; al 30/09/2026: U$S 28.000 (vendió U$S 14k durante el proceso). HSBC — al 01/10/2026 informa transferencia U$S 30.000 a Uruguay en noviembre 2025 (anterior a la presentación, signo de planificación).
**Estado actual:** `bienes[].valor_estimado` único.
**Criticidad:** BAJA.
**Frecuencia estimada:** ocasional; resoluble con notas o eventos sucesivos.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP R15: Medidas cautelares patrimoniales (inhibición + veedor) no encajan en el modelo de incidente
**Descripción:** el modelo `IncidenteTipo` tiene `medida_cautelar` como tipo genérico pero no hay campos estructurados para inhibición general (sobre qué bienes, fecha de traba, fecha de levantamiento parcial/total) ni para "veedor judicial" (rol distinto al perito; reporta periódicamente, tiene su propia regulación de honorarios).
**Situación que lo revela:** 28/02/2026 Valentina pide inhibición general de bienes contra Sebastián + intervención judicial de la SRL con designación de veedor. Concedida el 05/03/2026. La inhibición se levanta parcialmente al ejecutarse la 1ª cuota y se mantiene la intervención hasta cobro total.
**Estado actual:** `IncidenteTipo` ([src/types.ts:87-94](src/types.ts#L87-L94)). Sin entidad `Veedor` análoga a `Perito`, sin tracking estructurado de inhibición.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 8–12% de los divorcios con patrimonio empresarial.
**Dependencias:** se vincula con GAP R12 (causa penal vinculada).
**Categoría:** Modelo de datos.

#### GAP R16: Compensación sin tasa moratoria diferenciada del interés compensatorio
**Descripción:** la tabla `compensaciones.tasa_interes_anual` modela el interés "sobre saldo" (tipo compensatorio del 6% anual del caso). Pero al haber mora, suele aplicar interés moratorio adicional (típicamente tasa activa o tasa pasiva BCRA). No hay campo para esto ni cálculo de adicional al pagar tarde.
**Situación que lo revela:** sentencia: U$S 120.000 en 12 cuotas + 6% anual sobre saldo. La 3ª cuota cae en mora (01/12/2027), intimación judicial 5 días, paga el 18/12/2027 con intereses moratorios — el sistema sólo registra `monto_pagado` sin distinguir capital, interés compensatorio del período e interés moratorio del retraso.
**Estado actual:** [sql/023_compensacion_economica.sql:33](sql/023_compensacion_economica.sql#L33) tiene una sola tasa.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 30–40% de las compensaciones con cuotas tienen al menos una mora.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP R17: Sin canon locativo compensatorio diferido (programable a futuro)
**Descripción:** la atribución de vivienda puede traer aparejado canon locativo a partir de un mes futuro, no inmediato. No hay forma de programar una obligación periódica que arranque en el mes 13.
**Situación que lo revela:** Cámara 15/08/2027 modifica sentencia y fija canon de U$S 800/mes desde el mes 13 de la atribución (= 13/09/2028). Es una obligación futura distinta de la compensación.
**Estado actual:** `compensaciones.fecha_primera_cuota` arranca desde una fecha pero no se modela como "obligación periódica de canon"; el campo `ejec_atribucion_vivienda` solo dispara tareas, sin tracking económico.
**Criticidad:** BAJA.
**Frecuencia estimada:** 5% — niche.
**Dependencias:** podría reusar tabla compensaciones con flag `tipo: canon_atribucion`.
**Categoría:** Modelo de datos.

#### GAP R18: Convivencia activa al momento de presentar — fecha separación de hecho opcional sin lógica
**Descripción:** el campo `fecha_separacion_hecho` está como `type: date` simple, opcional. No distingue entre "ya separados de hecho desde X" y "todavía conviven, separados de cama desde Y". Tampoco modela la mudanza posterior.
**Situación que lo revela:** al presentar el 15/01/2026 los Ruiz/Colombo aún conviven en Juncal 2245 (habitaciones separadas desde julio 2025). Sebastián se muda recién el 18/01/2026 — 3 días post-presentación. Si el sistema fuerza fecha previa, se carga mal.
**Estado actual:** [src/data/templates.ts:101](src/data/templates.ts#L101) campo único date.
**Criticidad:** BAJA.
**Frecuencia estimada:** 15–20% de las presentaciones conjuntas se hacen sin separación de hecho consumada.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

#### GAP R19: Doble nacionalidad / extranjero en cónyuge contrario
**Descripción:** `conyuge2_nacionalidad` es text simple. No admite múltiples nacionalidades ni señaliza implicancias (jurisdicción internacional, exhorto a país de la nacionalidad).
**Situación que lo revela:** Valentina tiene nacionalidad argentina/italiana. Tener pasaporte UE puede impactar en posibilidades de residencia, traslado de hijos al exterior y exhortos.
**Estado actual:** campo text simple.
**Criticidad:** BAJA.
**Frecuencia estimada:** 8–12% en CABA por inmigración italiana/española.
**Dependencias:** ninguna.
**Categoría:** Modelo de datos.

---

### Categoría: Workflow y etapas

#### GAP R20: Recusación de perito sin sub-incidente con plazo propio
**Descripción:** el modelo `Perito` tiene estado `recusado` (binario) pero la recusación es un sub-incidente con su propio ciclo: planteo → traslado al perito (3 días) → eventual prueba → resolución del juez → posible apelación. El estado del perito NO es lineal: puede ir aceptado → recusado → aceptado si rechazan recusación.
**Situación que lo revela:** 28/08/2026 Sebastián recusa a CPN Adriana Leguizamón. 10/09 juez rechaza recusación (12 días procesales). La perito vuelve a estar activa, presenta informe el 25/10. El sistema actual no puede distinguir "recusación pendiente" de "recusación rechazada" del estado intermedio.
**Estado actual:** [src/types.ts:815-821](src/types.ts#L815-L821) `EstadoPerito` lineal. Sin sub-modelo de recusación.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 15–20% de las pericias se recusan al menos una vez.
**Dependencias:** ninguna.
**Categoría:** Workflow y etapas.

#### GAP R21: Audiencia de escucha del menor (art. 707 CCyCN) no diferenciada
**Descripción:** la escucha del niño/adolescente en audiencia es un acto procesal con régimen específico (no es testimonial; el juez dialoga sin contradictorio, suele ser sin las partes). Hoy cae en `audiencia_celebrada` o `audiencia_testimonial`.
**Situación que lo revela:** Facundo (17) es escuchado en audiencia art. 707 y manifiesta que quiere vivir con el padre. Es base directa de la sentencia.
**Estado actual:** sin tipo `audiencia_escucha_menor`.
**Criticidad:** BAJA.
**Frecuencia estimada:** 25–30% de los divorcios con hijos preadolescentes/adolescentes.
**Dependencias:** ninguna.
**Categoría:** Tipos de evento.

#### GAP R22: Homologación parcial en audiencia art. 438 no se modela como estado
**Descripción:** un convenio puede homologarse parcialmente: el juez homologa los puntos acordados (p.ej. cuidado personal y cuota) y deja abiertos los discutidos (compensación y vivienda). Hoy se trata como audiencia única "celebrada" sin distinguir.
**Situación que lo revela:** 12/03/2026 — audiencia art. 438. Ratifican voluntad de divorciarse, **homologan parcialmente** régimen + cuota; compensación + vivienda quedan pendientes para sentencia. El campo `nivel_acuerdo: total | parcial | sin acuerdo` existe en la propuesta pero no se conecta con el resultado de la audiencia ni con qué puntos quedaron firmes.
**Estado actual:** template no diferencia. Sin campo `puntos_homologados[]`.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 20–30% de las audiencias art. 438 producen acuerdo parcial.
**Dependencias:** ninguna.
**Categoría:** Workflow y etapas.

#### GAP R23: Prueba ofrecida vs admitida — no se registra resolución de admisión por hilo
**Descripción:** el `EstadoHilo` admite `rechazado` pero no captura los datos de la resolución (motivo, fecha, recurribilidad, si es total o parcial). Tampoco distingue, dentro de un hilo testimonial con varios testigos, si hubo admisión parcial (algunos testigos sí, otros no).
**Situación que lo revela:** 18/07/2026 Valentina ofrece testimonial vecina; 01/08/2026 juez **rechaza** por impertinente y admite el resto. El hilo "Testimoniales actora" no es atómico — un testigo se rechaza, dos se admiten.
**Estado actual:** [src/types.ts:781](src/types.ts#L781) `EstadoHilo` plano. Sin campo `resolucion_admision` con detalle. Sin nivel de testigo individual.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 30–40% de los ofrecimientos de prueba tienen al menos un punto rechazado.
**Dependencias:** podría conectarse con GAP R20 (recusación, similar sub-incidente).
**Categoría:** Workflow y etapas.

---

### Categoría: UI / UX

#### GAP R24: Sin alerta proactiva "hijo cumple 18 en menos de N días"
**Descripción:** la fecha de nacimiento de cada hijo está en `caseData.hijos[i].fecha_nacimiento` pero ningún job o vista la consulta. Cuando un hijo cumple 18 mid-process, el equipo se entera al ver el calendario.
**Situación que lo revela:** Facundo cumple 18 el 15/08/2026, en plena etapa probatoria. Idealmente la app debería avisar 60–90 días antes para preparar la transición a alimentos art. 663 (acreditación de estudios) y desactivar régimen de cuidado.
**Estado actual:** sin job, sin alert. `PerencionAlerts` no cubre esto.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 15–20% de divorcios con hijos donde alguno está cerca de los 18.
**Dependencias:** depende de GAP R3.
**Categoría:** Notificaciones/Alertas.

#### GAP R25: Hero card de matter no muestra banner de inhibición / cautelar patrimonial vigente
**Descripción:** el banner de medida de violencia (MatterDetail.tsx:405) cubre el caso "violencia familiar". Para inhibición general de bienes, intervención judicial o veedor designado, no hay banner equivalente. El abogado tiene que entrar al sub-proceso para verlos.
**Situación que lo revela:** del 05/03/2026 al 01/09/2027 hay inhibición general vigente sobre Sebastián. El cliente puede pedir liberar fondos para una operación urgente y el abogado debe responder rápido. Sin banner permanente, es fácil olvidarlo.
**Estado actual:** no hay banner para medidas patrimoniales.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 8–12% de divorcios con patrimonio relevante.
**Dependencias:** depende de GAP R15 (estructura de medida patrimonial).
**Categoría:** UI/UX.

#### GAP R26: Doble cliente / co-presentación conjunta — modelo asume cliente único
**Descripción:** `matter.client` es un solo string. En presentación conjunta inicial los dos cónyuges pueden firmar conjuntamente con sus respectivos letrados. Hoy se carga "Ruiz" o "Colombo" como cliente y el otro queda solo en `caseData.conyuge2_nombre`. Cuando muta a contencioso (GAP R6), no hay rastro de la situación previa.
**Situación que lo revela:** del 10/01/2026 al 08/04/2026 Sebastián fue cliente del estudio y Valentina tenía letrada propia (Carolina Monti, T° 78 F° 345 CPACF), pero al mismo tiempo ambos firmaron presentación conjunta. Esa dualidad no es expresable en el modelo actual.
**Estado actual:** `matter.client: string`. No hay tabla `matter_parties`.
**Criticidad:** MEDIA.
**Frecuencia estimada:** 100% de las presentaciones conjuntas; ~25–30% de los divorcios totales.
**Dependencias:** se vincula con GAP R6.
**Categoría:** Modelo de datos.

---

## Top 5 gaps críticos a resolver primero

1. **GAP R6 — Mutación de tipo de divorcio (conjunto → contencioso).** Es el nudo del caso: si no se resuelve, la app pierde memoria de la rama anterior, deja tareas zombi, no genera evento de mutación y desconfigura el flow. Frecuencia 15–20% de las conjuntas. Bloquea modelado correcto del caso entero.

2. **GAP R10 — Demanda reconvencional.** Universal en familia y civil. Sin tipo de evento ni distinción demanda principal/reconvención no hay forma de mapear el ciclo plazo-traslado-contestación de la pretensión recíproca, ni de saber sobre qué debe pronunciarse la sentencia. Frecuencia 25–35% de los contenciosos.

3. **GAP R1 — Hijos con discapacidad / régimen especial / terapias.** En los pocos casos donde aplica, es lo que define **todo**: cuota, régimen, atribución de vivienda. Sin estos campos el sistema da malos consejos y obliga a saltar a notas libres. Frecuencia 5–8% pero alto impacto por caso.

4. **GAP R2 — Régimen parental por hijo (no único).** Habilitado por R1. Muy frecuente con 2+ hijos de edades disímiles (30–40% de los divorcios con dos o más hijos). La sentencia se pronuncia hijo por hijo; el sistema debe seguirla.

5. **GAP R11 — Apelaciones cruzadas con `apelado_por`.** El modelo actual borra la distinción entre apelantes cuando ambos apelan el mismo aspecto. Doble apelación parcial es 30–40% de las apelaciones en familia. Cambio puntual en migración 029 + UI.

**Notas de orden:** GAP R6 → R10 (la conjunta rota suele venir con reconvención). GAP R1 → R2 → R3 (datos de hijo → régimen por hijo → transición 18). GAP R4 → R8 → R9 (bienes en exterior → exhorto/exequátur → sociedad interpuesta) son una sub-cadena patrimonio internacional que se puede tomar como bloque o postergar.

---

## Gaps descartables o postergables

- **GAP R7 (convención matrimonial detallada).** Dato informativo. Notas libres alcanzan hasta que aparezca un caso donde se discuta la convención misma.
- **GAP R14 (snapshot patrimonial variable).** Ocasional; se puede reusar el timeline de eventos para registrar revaluaciones.
- **GAP R17 (canon locativo diferido).** Niche — 5% de los casos. Workaround: crear compensación con `fechaPrimeraCuota` futura cuando aparezca.
- **GAP R20 (recusación como sub-incidente).** Resoluble con un evento `recusacion_perito` y un campo `recusacion_resolucion` en el perito hasta tener volumen.
- **GAP R21 (audiencia escucha menor).** Cosmético: cae bien en `audiencia_celebrada` con metadata `subtipo: escucha_art_707`.

---

## Preguntas abiertas

1. **Régimen por hijo (GAP R2):** ¿se modela embebiendo régimen en el subField del repeatable `hijos`, o se crea una tabla relacional `hijo_regimen` con FK al matter? La segunda opción permite trackear cambios de régimen post-sentencia y es más extensible, pero rompe el patrón actual de caseData JSON.
2. **Mutación tipo de divorcio (GAP R6):** al cambiar `tipo_divorcio` de "De común acuerdo" a "Unilateral", ¿se preserva el historial de tareas completadas en la rama anterior (auditadas pero invisibles) o se generan nuevamente desde cero perdiendo trabajo? Decisión de diseño.
3. **Apelaciones cruzadas (GAP R11):** cuando ambas partes apelan el mismo aspecto, ¿es 1 sub-proceso de Cámara con 2 apelantes (mejor para refleja el expediente real, una sola Sala resuelve) o 2 sub-procesos hermanos? Si 1 con dos apelantes, hay que crear array `apelantes[]` con quién y qué aspecto cada uno.
4. **Causa penal vinculada (GAP R12):** ¿se modela como matter con `MatterType: 'Penal'` (agregando el tipo) y un campo `causa_civil_relacionada_id`, o como una tabla más liviana `causas_relacionadas` (tipo, jurisdicción, juzgado, estado, sin sub-procesos)? La primera es full-feature, la segunda es un puente.
5. **Doble cliente / presentación conjunta (GAP R26):** ¿se mantiene `matter.client` como cliente principal y se agrega tabla `matter_parties` para los demás (con rol cliente_propio | otra_parte | co-presentante), o se reescribe el campo? Lo segundo es invasivo.
6. **Bienes en exterior + exequátur (GAP R4 + R8):** ¿se trata como atributo de bien (`pais`) más eventos (`exhorto_internacional`, `exequatur_*`) sin tablas nuevas, o se crea entidad `tramite_internacional` con su propio ciclo? La segunda es más limpia para múltiples bienes en distintos países.
7. **Régimen separación de bienes en Ejecución (GAP R5):** ¿simplemente agregar `condition: { regimen_patrimonial, equals: 'Comunidad de ganancias' }` a las tareas de partición/liquidación, o crear etapas Ejecución divergentes según régimen? Lo primero es trivial; lo segundo es más prolijo.
8. **Veedor judicial (GAP R15):** ¿reusa la entidad `Perito` con una nueva especialidad `'veedor'`, o se crea entidad propia? El veedor reporta periódicamente (no entrega un solo dictamen como el perito) y suele ser por meses/años — su ciclo es distinto.
