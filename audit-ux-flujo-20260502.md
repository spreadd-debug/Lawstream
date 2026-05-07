# Audit de UX/UI — Flujo Lawstream sobre el caso Ruiz/Colombo

**Fecha:** 2026-05-02
**Alcance:** revisión crítica del flujo completo desde la creación del matter hasta la ejecución de sentencia, usando el caso Ruiz/Colombo como vara. NO testea funcionalidad — la asume operativa. Detecta fricciones, mala jerarquía visual, datos pedidos en momento equivocado, redundancias, copys ambiguos y oportunidades de simplificación.

**Diferencia con audits anteriores (`audit-gaps-divorcio-*.md`):** los audits previos detectaron **gaps de modelado** (qué falta en la DB, qué no se puede representar). Este audit detecta **gaps de experiencia** (qué cuesta encontrar, qué confunde, qué es engorroso).

---

## Resumen ejecutivo

- **Total de fricciones detectadas:** 38.
- **Distribución por criticidad:** ALTA: 11 · MEDIA: 18 · BAJA: 9.
- **Distribución por categoría:** Wizard de creación: 8 · Cabecera del matter: 6 · Tab Hijos: 4 · Tab Patrimonio: 6 · Tab Reconvenciones: 2 · Sub-procesos / Apelaciones: 3 · Cuotas alimentarias: 4 · Eventos / Timeline: 3 · Bitácora: 2.
- **Top 5 a resolver primero:** UX-7 (jerarquía de banners en cabecera), UX-2 (tipo de divorcio en Step 1), UX-15 (tab Patrimonio sin overview), UX-23 (mutación divorcio sin "deshacer"), UX-30 (concept en especie sin botón claro).

---

## Categoría: Wizard de creación de asunto (Steps 1 a 5)

### UX-1: Tipo de proceso visible en Step 1 aunque siempre sea "Ordinario" en familia
**Descripción:** el bloque "Tipo de proceso" (Ordinario / Sumario / Sumarísimo) ocupa espacio en el Step 1 con un comentario "(opcional — default ordinario)". En divorcio, alimentos, cuidado y prácticamente todo familia, **es siempre ordinario**. Para el usuario que crea su 50° divorcio, ese bloque es ruido.
**Situación que lo revela:** crear el caso Ruiz/Colombo — el usuario tiene que vista evitar el bloque sin saber si es relevante.
**Estado actual:** [src/components/CrearAsunto.tsx](src/components/CrearAsunto.tsx) — bloque "Tipo de proceso" siempre visible.
**Criticidad:** BAJA.
**Frecuencia:** 99% de casos familia / civil ordinario.
**Categoría:** Wizard de creación.
**Recomendación:** colapsar el bloque cuando `type === 'Familia'` y `subtype !== 'Daños'`. Mostrar como link "Cambiar tipo de proceso" al pie del Step 1. En `Civil/Daños/Comercial` mantener visible.

### UX-2: "Tipo de divorcio" no se pregunta en Step 1
**Descripción:** la decisión "presentación conjunta vs unilateral" es **estructural** — define qué tareas se generan, qué template aplica, qué documentos pide. Hoy se pregunta en Step 2 (Datos del Caso) entre otros campos. Visualmente queda al mismo nivel que "Acta N°" o "Tomo".
**Situación que lo revela:** Ruiz/Colombo arranca como bilateral y muta a unilateral. Esa decisión es lo más relevante del caso entero — debería ser explícita y visible al inicio.
**Estado actual:** [src/data/templates.ts:3118](src/data/templates.ts#L3118) — `tipo_divorcio` en `wizardSections` del Step 2.
**Criticidad:** ALTA.
**Frecuencia:** 100% de divorcios.
**Categoría:** Wizard de creación.
**Recomendación:** elevar `tipo_divorcio` al Step 1 como toggle visual (dos cards grandes: "Presentación conjunta" / "Demanda unilateral") justo después de "Materia: Divorcio". Justificación: el branch determina todo el flujo posterior — no es "un dato más".

### UX-3: Datos del Cónyuge 2 dispersos en Step 2 cuando son co-presentantes
**Descripción:** en presentación conjunta el cónyuge 2 firma la demanda al mismo tiempo que el cliente. Sus datos (nombre, DNI, domicilio, letrado contrario) se piden en Step 2 mezclados con datos del matrimonio.
**Situación que lo revela:** en Ruiz/Colombo Sebastián y Valentina firman conjunto el 15/01/2026. Para validar quién firma, los datos del cónyuge 2 son tan obligatorios como los del cliente.
**Estado actual:** [src/data/templates.ts:138-148](src/data/templates.ts#L138-L148) — bloque "Datos Laborales — Cónyuge 2" en Step 2.
**Criticidad:** MEDIA.
**Frecuencia:** 100% de divorcios bilaterales (~25-30% de los divorcios).
**Categoría:** Wizard de creación.
**Recomendación:** cuando `tipo_divorcio === 'De común acuerdo'`, mover el sub-bloque "Datos básicos del Cónyuge 2" (nombre + DNI + domicilio) al Step 1 al lado del cliente principal. Datos laborales y abogado contrario quedan en Step 2.

### UX-4: "Resumen en vivo" lateral muestra workflow antes de elegir Materia — RESUELTO 2026-05-07
**Descripción:** el panel lateral derecho dice "Workflow activo: Divorcio (CABA), 6 etapas" en cuanto seleccionás tipo + jurisdicción, ANTES de que toques el botón "Divorcio" en Materia. Sugiere que ya elegiste cuando no.
**Situación que lo revela:** snapshot del DOM durante test E2E lo evidencia.
**Estado actual:** RESUELTO — el panel "Workflow activo" en [src/components/CrearAsunto.tsx](src/components/CrearAsunto.tsx) ahora se gatea por `activeTemplate && formData.subtype`. Hasta que el usuario elija Materia se muestra un placeholder gris "Workflow no determinado · Elegí Materia para activar el workflow" con ícono apagado. Cuando elige subtype, el bloque cambia a primary con animación fade-in/zoom y el nombre del template + cantidad de etapas. Sin formData.type tampoco se renderiza el placeholder (no hay nada útil que decir).
**Criticidad:** MEDIA.
**Frecuencia:** universal en cada creación.
**Categoría:** Wizard de creación.
**Recomendación:** mostrar "Workflow no determinado" con tono gris hasta que `formData.subtype` también esté seleccionado. Recién ahí pintar verde con el nombre del template.

### UX-5: Carátula auto-generada no se previsualiza en vivo
**Descripción:** el campo Carátula muestra "Se genera automáticamente en el próximo paso" pero el usuario no sabe qué carátula va a generar la app. Llega a Step 5 (Revisión) y se sorprende.
**Situación que lo revela:** universal — todo usuario quiere ver cómo va a quedar el título antes de comprometer.
**Estado actual:** [src/components/CrearAsunto.tsx:879-885](src/components/CrearAsunto.tsx#L879-L885) — placeholder estático.
**Criticidad:** BAJA.
**Frecuencia:** universal.
**Categoría:** Wizard de creación.
**Recomendación:** mostrar preview tentativo en el sidebar (ej. *"RUIZ, S. y COLOMBO, V. s/ Divorcio — Presentación conjunta"*) que se actualice en vivo conforme cargás cliente + cónyuge 2 + tipo. Generación lazy desde el mapa `caratulaTemplates` que ya existe.

### UX-6: Step "Datos del Caso" pide datos heterogéneos sin agrupar bien — RESUELTO 2026-05-07
**Descripción:** el Step 2 del wizard de divorcio CABA pide en una misma vista: datos del matrimonio + hijos (callout info) + bienes (callout info) + datos laborales de ambos cónyuges + violencia familiar + propuesta reguladora + compensación + acuerdo entre partes. Son ~40 campos en bloque vertical.
**Situación que lo revela:** crear el caso Ruiz/Colombo donde solo el `caseData` real tiene 30+ entries.
**Estado actual:** RESUELTO — cuando el template tiene ≥3 secciones (laboral, ART, accidente de tránsito, etc.), el Step 2 se renderiza con sub-pestañas: tab nav arriba (con icono + título + chip de "campos faltantes" o ✓ verde si está completa), solo se muestra la sección activa, y abajo hay nav "Sección anterior · 2/4 · Siguiente sección". Para 1-2 secciones se mantiene el render vertical (no aporta partir tan poco). Implementado en [src/components/CrearAsunto.tsx](src/components/CrearAsunto.tsx) (`activeWizardSectionIdx` + `camposFaltantesPorSeccion` + `useTabs` switch).
**Criticidad:** MEDIA.
**Frecuencia:** universal en divorcio.
**Categoría:** Wizard de creación.
**Recomendación:** dividir el Step 2 en sub-pestañas dentro del mismo step (Matrimonio · Cónyuges · Régimen · Propuesta · Violencia). Visualmente queda más manejable y la validación puede ser por sub-tab. Otra opción: hacer Steps 2.1, 2.2, 2.3 en lugar de 1 solo.

### UX-7: Validación del Step 2 exige TODOS los `required` antes de avanzar
**Descripción:** `validateStep(2)` exige que todos los campos `required` de todos los `wizardSections` estén completos. En la realidad muchos datos del divorcio se conocen post-entrevista pero el matter ya fue creado en la primera consulta.
**Situación que lo revela:** Ruiz consultó el 10/01/2026 y el estudio quería abrir el matter ese día con datos parciales (sabía que era divorcio bilateral pero no tenía DNI del cónyuge 2 todavía). El wizard lo bloquea.
**Estado actual:** [src/components/CrearAsunto.tsx:212-220](src/components/CrearAsunto.tsx#L212-L220) — validación estricta.
**Criticidad:** ALTA.
**Frecuencia:** 70% de los casos no tienen todos los datos al inicio.
**Categoría:** Wizard de creación.
**Recomendación:** distinguir `required` de **bloqueante para avanzar** vs **bloqueante para presentar**. Solo 4-5 campos críticos (cónyuges, tipo de divorcio, jurisdicción) deben bloquear el wizard. El resto se completa después desde la ficha de Instrucción.

### UX-8: Step "Operatividad" pide próxima acción que en divorcio se sabe del template — RESUELTO 2026-05-07
**Descripción:** el Step 3 (Operatividad) pide "Próxima Acción Inicial" como input libre. Pero el template ya tiene `proximaAccionSugerida: 'Solicitar acta de matrimonio actualizada al Registro Civil'`. La app la pre-completa pero el usuario tiene que confirmar.
**Situación que lo revela:** en divorcio bilateral la primera acción es típicamente "Verificar datos del matrimonio" o "Solicitar acta" — muy estándar.
**Estado actual:** RESUELTO — agregada fila de chips "Sugerencias" arriba del input "Próxima Acción Inicial" en [src/components/CrearAsunto.tsx](src/components/CrearAsunto.tsx). La primera chip viene del template activo (`proximaAccionSugerida`) y es específica del subtype/jurisdicción ("Solicitar acta de matrimonio…", "Recopilar recibos…", etc.). Las siguientes son genéricas que aplican a cualquier matter ("Estudiar expediente y documentación", "Agendar entrevista de seguimiento", "Solicitar IUS y bono CPACF"). Click rellena el input — si el valor coincide la chip se pinta primary. El input libre se mantiene como fallback para casos atípicos.
**Criticidad:** BAJA.
**Frecuencia:** universal.
**Categoría:** Wizard de creación.
**Recomendación:** ofrecer 3-4 botones de "próximas acciones típicas" del template + input libre como fallback. Menos tipear, más tiempo para pensar el caso real.

---

## Categoría: Cabecera del matter (banners + acciones)

### UX-9: Hasta 6 banners pueden apilarse en la cabecera
**Descripción:** según el estado del caso, se pueden ver al mismo tiempo: banner sub-proceso (parent) + banner parcialmente firme + banner jurisdicción faltante + banner violencia + banner cumple 18 + banner reconvención + banner exhorto + banner cautelar. En el caso Ruiz/Colombo post-sentencia con apelaciones cruzadas hay realísticamente 4 banners apilados.
**Situación que lo revela:** Ruiz/Colombo en mayo 2026: violencia (no aplica) + cumple 18 Facundo + reconvención pendiente + cautelares vigentes + exhorto pendiente >90 días. Son 4 banners simultáneos.
**Estado actual:** [src/components/MatterDetail.tsx:320-540](src/components/MatterDetail.tsx) — banners apilados verticalmente sin priorización.
**Criticidad:** ALTA.
**Frecuencia:** 30-40% de casos complejos.
**Categoría:** Cabecera del matter.
**Recomendación:** introducir un "centro de alertas" colapsado por default (botón rojo "4 alertas" arriba a la derecha) que se abre como panel lateral con los banners categorizados (procesales / patrimoniales / familiares). Solo el más crítico queda visible permanentemente.

### UX-10: Banner de "cumple 18" se muestra para hijos de cualquier hijo del matter sin diferenciar criticidad — RESUELTO 2026-05-07
**Descripción:** el banner amber R3 dispara igual cuando un hijo cumple 18 en 89 días que cuando cumplió ayer. La urgencia es distinta. Tampoco distingue si el caso ya está en ejecución (donde el cumple-18 puede ser irrelevante para los regímenes pasados).
**Estado actual:** RESUELTO — [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) calcula `transicionMayoriaSeveridad`: `'critica'` si hay alguno con `recienCumplio18` (ya cumplió) o `proximosCumplir.diasRestantes ≤ 30`; `'media'` para 31-90 días. El banner cambia de amber a rojo en el caso crítico (border, fondo, ícono y CTA). Por item: el chip de "en N días" se pinta rojo individualmente cuando ese hijo es crítico. La línea de "cumplió 18 hace N días" siempre va en rojo. Adicionalmente: si `matter.status === 'Cerrado' || 'Archivado'`, `hayTransicionMayoria` se evalúa en false y el banner desaparece. El resumen colapsado UX-9 escala su severidad/tono también.
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Cabecera del matter.
**Recomendación:** colorear el banner según urgencia (rojo si <30 días, amber 30-90, gris >90). Si el matter está en estado `Cerrado` o `Archivado`, ocultar el banner.

### UX-11: Banner de violencia familiar no diferencia entre "vigente" y "vencida" — RESUELTO 2026-05-07
**Descripción:** el banner sí distingue medida vencida con un sub-badge, pero la prominencia visual es la misma. Una medida vencida implica acción urgente (renovar) pero el banner se ve igual de "presente" que una vigente.
**Estado actual:** RESUELTO — [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) ahora calcula `diasDesdeVencimientoMedida` y bifurca el estilo del banner: vencida → rojo crítico (`border-2 border-rose-600/60 ring-1 bg-rose-500/15`), header "Renovar medida — vencida hace X días", botón rojo "Renovar medida" que abre el editor del matter; vigente → tono amber/informativo (`bg-amber-500/10 border-amber-500/40`), sin CTA. La línea de fecha también cambia ("Vencida el" vs "Vigencia hasta") y se pinta rojo cuando aplica. El resumen colapsado UX-9 escala a 'critica' cuando vencida y cambia el chip a "Violencia (vencida)".
**Criticidad:** MEDIA.
**Frecuencia:** 10-15% en casos con violencia previa.
**Categoría:** Cabecera del matter.
**Recomendación:** banner rojo con call-to-action explícito si está vencida ("Renovar medida — vencida hace X días"). Banner ámbar (informativo) si está vigente.

### UX-12: Tab "Hijos" solo aparece si `type === 'Familia'` pero no en sub-procesos de Familia — RESUELTO 2026-05-07
**Descripción:** un incidente de aumento de cuota (sub-proceso del divorcio) hereda lógicamente el contexto Familia. El código sí lo considera con `parentMatter?.type === 'Familia'`, pero la UI puede no mostrar el tab en otros sub-procesos donde el matter parent es Familia pero el sub-proceso es de otra naturaleza.
**Estado actual:** RESUELTO — `esFamilia` en [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) ahora hace walk completo del parent chain hasta encontrar uno con `type === 'Familia'`, con guard `Set` para ciclos. Fallback adicional: si el matter tiene `parentMatterId` setteado (sub-proceso) y el `incidenteTipo` pertenece al universo familiar (`alimentos_provisorios`, `tenencia_cautelar`, `exclusion_hogar`, `autorizacion_viaje`), se considera Familia incluso cuando el cache aún no resolvió el padre. Esto evita que el tab desaparezca por race conditions o por sub-procesos con type heredado distinto.
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Cabecera del matter.
**Recomendación:** validar la lógica con un test específico del sub-proceso "incidente de aumento" del Ruiz/Colombo.

### UX-13: Botón "Mutar tipo" solo visible para divorcio CABA/PBA — RESUELTO 2026-05-07 (decisión de diseño)
**Descripción:** el botón está condicionado a `flowTemplateId === 'fam-divorcio' || 'fam-divorcio-pba'`. Pero conceptualmente el `tipo_divorcio` también podría querer mutarse en otros templates (filiación contenciosa → consensual, alimentos provisorios → definitivos). La feature está atada a un nombre de template hardcodeado.
**Estado actual:** RESUELTO (decisión de diseño) — agregado comentario explícito en [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) donde está la condición `esDivorcioPrincipal`. Se mantiene hardcodeado a `fam-divorcio` / `fam-divorcio-pba` porque hoy son los únicos templates con flow bifurcado por un campo de `caseData`. Cuando aparezca un segundo template de naturaleza similar (filiación contenciosa↔consensual, alimentos provisorios↔definitivos), el plan documentado es introducir un metadato `flowBifurcable` en el template y reemplazar el `||` por una lookup. Mientras tanto el alcance acotado evita falsos positivos. Audit cerrado con anotación.
**Criticidad:** BAJA (por ahora).
**Frecuencia:** todo divorcio (alto en ese subset).
**Categoría:** Cabecera del matter.
**Recomendación:** dejar como está hoy (es preciso para el alcance), pero anotar que cuando aparezca un segundo template con flow bifurcado, refactorizar la condición.

### UX-14: Acciones en el header (Mutar tipo, Editar Caso, Nueva Acción) no tienen jerarquía clara — RESUELTO 2026-05-07
**Descripción:** los 3 botones del header tienen estilos distintos pero similares en altura/peso visual (dos outline + uno primary). El "Nueva Acción" es la acción más frecuente; "Mutar tipo" es excepcional. Visualmente compiten.
**Estado actual:** RESUELTO — header reorganizado en [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) con jerarquía explícita: (1) **"Nueva Acción"** queda primary prominente con shadow (acción más frecuente), (2) **"Editar Caso"** outline neutro secundario, (3) **"Mutar tipo de divorcio"** + **"Archivar caso"** pasaron a un menú overflow `⋯` (`<details>` nativo, sin polyfills), (4) excepción out-of-menu: "Definir tipo" cuando `tipo_divorcio === 'Por definir'` (decisión estructural pendiente, prominente violeta) y "Deshacer mutación" en ventana de 24h (border ámbar, alta visibilidad). El menú overflow no se renderiza si no hay opciones aplicables.
**Criticidad:** BAJA.
**Frecuencia:** universal.
**Categoría:** Cabecera del matter.
**Recomendación:** "Nueva Acción" prominente (azul/teal grande), "Editar Caso" secundario (outline), "Mutar tipo" dentro de un menú overflow `⋯` con otras acciones excepcionales (cerrar caso, archivar, mutar).

---

## Categoría: Tab Hijos

### UX-15: No hay manera fácil de cargar 3 hijos seguidos — RESUELTO 2026-05-07
**Descripción:** después de crear un hijo el modal cierra. Si vas a cargar 3 (Facundo, Isabella, Olivia), tenés que hacer "Nuevo hijo" → llenar → guardar → "Nuevo hijo" → llenar → guardar → ... 3 veces.
**Situación que lo revela:** Ruiz/Colombo tiene 3 hijos para cargar al iniciar el caso.
**Estado actual:** RESUELTO — agregado botón "Guardar y agregar otro" en `HijoForm` ([src/components/HijosPanel.tsx](src/components/HijosPanel.tsx)) y en `ConceptoForm` ([src/components/CuotasAlimentariasPanel.tsx](src/components/CuotasAlimentariasPanel.tsx)). Solo aparece al crear (no al editar). Después del save no cierra el modal y resetea los campos individuales conservando contexto compartido: en hijos preserva escolaridad y establecimiento; en conceptos preserva categoría, frecuencia, pagador, detalle del reparto y moneda. La responsabilidad de cerrar el modal pasó del parent al form para soportar el flujo.
**Criticidad:** MEDIA.
**Frecuencia:** ~50% de divorcios con hijos múltiples.
**Categoría:** Tab Hijos.
**Recomendación:** botón secundario "Guardar y agregar otro" que mantenga el modal abierto pero limpie campos. Útil también para conceptos en especie.

### UX-16: Régimen propio del hijo es un override, pero la UI no muestra cuál es el "régimen general" para comparar — RESUELTO 2026-05-07
**Descripción:** al cargar el régimen propio de Olivia (TEA) hay que pensar "esto es distinto al régimen general" pero la UI no muestra cuál es el régimen general activo. El usuario tiene que recordar o ir al tab Flujo a buscarlo.
**Estado actual:** RESUELTO — [src/components/HijosPanel.tsx](src/components/HijosPanel.tsx) ahora extrae `regimenGeneral` del `caseData` del matter raíz (`tipo_cuidado`, `residencia_principal`, `regimen_comunicacion`, `regimen_vacaciones`) y lo pasa al `HijoForm`. Arriba del bloque "Régimen propio del hijo" se renderiza un mini-card con border `bg-muted/20` mostrando los cuatro valores del régimen general como referencia, con hint "Dejá los campos en blanco para que este hijo siga el régimen general. Cargá solo lo que difiere." Si el régimen general no está cargado, no se muestra nada (no hay regreso vacío).
**Criticidad:** MEDIA.
**Frecuencia:** 30% de divorcios con 2+ hijos.
**Categoría:** Tab Hijos.
**Recomendación:** mostrar arriba del form de régimen propio un mini-resumen "Régimen general del caso: Compartido alternado · Comunicación: una semana con cada progenitor" como referencia.

### UX-17: La info de "salud y terapias" tiene un campo `terapias_desc` en textarea — RESUELTO 2026-05-07
**Descripción:** el detalle de terapias se escribe libre. Para Olivia: "TO con Lic. Pérez 2x/sem $280k; Fonoaudiología 1x/sem $150k; AT escolar 4hs/día $250k". Después en R13 (cuotas alimentarias) hay que cargar de nuevo cada uno como concepto en especie. Doble entrada del mismo dato.
**Situación que lo revela:** Ruiz/Colombo — terapias de Olivia se cargan en hijos.terapias_desc Y como conceptos en especie.
**Estado actual:** RESUELTO — agregado parser heurístico `parseTerapiasDesc()` en [src/components/CuotasAlimentariasPanel.tsx](src/components/CuotasAlimentariasPanel.tsx) que separa por `;` o salto de línea y extrae monto (con soporte de `$`, `U$S`/`USD`, `€`/`EUR`, sufijo `k`/`mil`), moneda, frecuencia (`mensual` default; detecta `anual`, `semestral`, `trimestral`, `quincenal`) y prestador (regex sobre `con Lic./Dr./Dra./Prof. <Apellido>`). Cada `CuotaCard` ahora tiene un botón rosa "Importar terapias" al lado de "+ Concepto", visible solo cuando hay al menos un hijo con `terapiasDesc`. Click abre `<ImportarTerapiasModal>` que: (1) lista los items parseados agrupados por hijo, (2) cada item es editable inline (concepto, monto, moneda, frecuencia) con checkbox, (3) muestra el prestador detectado como hint, (4) al confirmar, batch-crea los `cuotaConceptosEspecie` con `categoria: 'terapia'`, `pagador: 'obligado_directo'`, `hijoId` linkeado al hijo origen, en la cuota destino. Aclaración prominente: el parser es heurístico, el usuario revisa cada fila antes de importar.
**Criticidad:** MEDIA.
**Frecuencia:** 100% de casos con hijo discapacitado.
**Categoría:** Tab Hijos.
**Recomendación:** ofrecer botón "Importar terapias a cuota alimentaria" en el form de cuota — al click, parsea `terapias_desc` y crea conceptos en especie pre-cargados (con la imprecisión de un parser libre que el usuario puede ajustar). O al revés: cuando creás conceptos en especie con `hijo_id`, ofrecer "Sincronizar con la lista de terapias del hijo".

### UX-18: Banner R3 (cumple 18) no diferencia si el régimen del hijo ya está actualizado — RESUELTO 2026-05-07
**Descripción:** Facundo cumple 18 → banner R3 dispara. El usuario adapta el régimen (lo marca como "no aplica cuidado, solo alimentos art. 663"). Banner sigue ahí porque el cómputo es solo basado en fecha.
**Estado actual:** RESUELTO — agregada columna `transicion_18_gestionada BOOLEAN DEFAULT FALSE` en [sql/051_hijos_transicion_18_gestionada.sql](sql/051_hijos_transicion_18_gestionada.sql), campo `transicion18Gestionada?: boolean` en `HijoCaso` ([src/types.ts](src/types.ts)), mapping en `toHijoCaso`/`hijoCasoToRow` ([src/lib/db.ts](src/lib/db.ts)), checkbox amber en `HijoForm` ([src/components/HijosPanel.tsx](src/components/HijosPanel.tsx)) con copy "Transición a mayoría de edad gestionada — Marcá cuando ya adaptaste el régimen…". Helpers `proximosACumplir18` y `recienCumplio18` ([src/lib/hijosTransicion.ts](src/lib/hijosTransicion.ts)) ahora skipean los hijos con `transicion18Gestionada === true`. La `HijoCard` también suprime los chips "Cumple 18 en N" / "Recién cumplió 18" cuando está marcado y muestra en su lugar un chip emerald "Transición 18 OK" (visible para hijos en ventana ±365d alrededor del cumple 18, así no se muestra en menores chicos).
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Tab Hijos.
**Recomendación:** en el form del hijo, agregar checkbox "Transición a mayoría gestionada" que, una vez marcado, oculta el banner R3 para ese hijo. Persiste en `hijos_caso.transicion_18_gestionada BOOLEAN`.

---

## Categoría: Tab Patrimonio

### UX-19: Sin overview / dashboard del patrimonio
**Descripción:** el tab Patrimonio muestra 3 secciones secuenciales (Activos · Pasivos · Sociedades) pero no hay un resumen ejecutivo arriba ("Patrimonio neto del cliente: U$S 850.000 · 4 activos · 1 pasivo · 1 sociedad interpuesta"). Para casos con muchos bienes el usuario tiene que sumar mentalmente.
**Estado actual:** [src/components/BienesPanel.tsx](src/components/BienesPanel.tsx) — sin sección de resumen.
**Criticidad:** ALTA.
**Frecuencia:** universal en casos con patrimonio.
**Categoría:** Tab Patrimonio.
**Recomendación:** card de resumen arriba: "Activos U$S X · Pasivos U$S Y · Neto U$S Z (a fecha del último valuación)". Subtotal por moneda. Distinguir activos del cliente vs contraparte.

### UX-20: Sociedad interpuesta es una sub-sección al final, debería integrarse al flujo de carga del bien — RESUELTO 2026-05-07
**Descripción:** para cargar el apto de Punta del Este via Playa Serena, hay que: (a) crear primero la sociedad en la sección "Sociedades interpuestas", (b) volver arriba, (c) crear el bien y elegir la sociedad del dropdown. Es contraintuitivo cargar la sociedad sin contexto.
**Estado actual:** RESUELTO — [src/components/BienesPanel.tsx](src/components/BienesPanel.tsx): el dropdown de sociedad en `BienForm` ahora aparece **siempre** (antes solo si había sociedades cargadas) y al lado tiene un botón violeta `+ Nueva` que abre el `SociedadForm` encima del `BienForm` (modal anidado, ambos z-50). Cuando el usuario guarda la sociedad, el panel detecta que el origen fue el flujo de bien (`creandoSociedadDesdeBien`), captura el `id` retornado por `handleCreateSociedadInterpuesta`, lo pasa a `BienForm` via `nuevaSociedadIdSugerida`, y el form pre-selecciona la sociedad recién creada sin perder los demás datos cargados. El callback `onConsumirSociedadSugerida` limpia el flag tras consumirlo.
**Criticidad:** MEDIA.
**Frecuencia:** 8-12% de casos con patrimonio internacional.
**Categoría:** Tab Patrimonio.
**Recomendación:** en el form del bien, cuando seleccionás sociedad interpuesta, agregar opción "+ Crear sociedad nueva" que abre un mini-form inline (sin salir del flujo de carga del bien). La sección "Sociedades" queda como vista de gestión post-creación.

### UX-21: Valuaciones temporales se cargan haciendo click en el monto del bien — RESUELTO 2026-05-07
**Descripción:** el affordance "click en el monto" no es obvio. El usuario que quiere cargar un snapshot histórico (R14) busca un botón "Agregar valuación" y no lo encuentra rápido.
**Estado actual:** RESUELTO — el botón con el monto en [src/components/BienesPanel.tsx](src/components/BienesPanel.tsx) (`BienCard`) ahora tiene affordance reforzado: ícono `TrendingUp` chico en color emerald **pegado al monto**, border-bottom dashed que aparece en hover, y tooltip "Ver / agregar valuaciones históricas". El conteo de "N valuaciones registradas" también se vuelve clickable y abre el mismo modal. Sigue existiendo el botón aparte con el ícono `TrendingUp` a la derecha (tercera redundancia explícita).
**Criticidad:** MEDIA.
**Frecuencia:** 5-10% de casos donde se trackea evolución.
**Categoría:** Tab Patrimonio.
**Recomendación:** ícono explícito de "histórico" (TrendingUp) al lado del monto, hacer doble affordance. Tooltip "Ver/agregar valuaciones" al hover.

### UX-22: Cautelares y Veedores en otra sección visualmente desconectada de los bienes
**Descripción:** las cautelares afectan bienes específicos (vía `bien_id` o `sociedad_interpuesta_id`). Pero en la UI están en sección aparte abajo del todo. El usuario que mira el bien Juncal no ve que está bajo inhibición general.
**Situación que lo revela:** Ruiz/Colombo — Juncal está bajo inhibición general pero en su card del bien no aparece nada.
**Estado actual:** [src/components/BienesPanel.tsx](src/components/BienesPanel.tsx) y [src/components/CautelaresPanel.tsx](src/components/CautelaresPanel.tsx).
**Criticidad:** ALTA.
**Frecuencia:** 8-12% de casos con cautelares.
**Categoría:** Tab Patrimonio.
**Recomendación:** en la card del bien, agregar badge rojo "Bajo cautelar" con tooltip que muestre el tipo y fecha de traba. Click → scroll al detalle de la cautelar.

### UX-23: Veedor judicial mezclado en el panel de Cautelares aunque conceptualmente es un rol persona — RESUELTO 2026-05-07 (descubrimiento parcial, no movimiento estructural)
**Descripción:** el veedor es una persona designada (similar a perito). Hoy está como sub-sección de Cautelares. El usuario que busca "quién es el veedor designado en el caso" tiene que ir a Patrimonio → bajar → buscar.
**Estado actual:** RESUELTO — solución de descubrimiento sin reescribir la arquitectura. [src/components/HilosPanel.tsx](src/components/HilosPanel.tsx) ahora muestra al final del panel un bloque amber read-only "Veedores judiciales designados (N)" con nombres + matrícula + estado, cuando el caso tiene veedores cargados. El bloque aclara "Gestionalos desde Patrimonio → Cautelares" para indicar dónde se editan. Resuelve el caso de uso "buscar quién es el veedor del caso desde el tab Prueba" sin duplicar lógica de gestión. La movida estructural completa (refactorizar Veedor como rol-persona en un tab "Personas del expediente") queda anotada para cuando emerja un caso con suficientes roles-persona (peritos, traductores, intérpretes, veedores, custodios judiciales) que justifiquen el panel unificado.
**Criticidad:** MEDIA.
**Frecuencia:** 5-8% de casos con intervención.
**Categoría:** Tab Patrimonio.
**Recomendación:** mover veedores al tab "Prueba (hilos y peritos)" como tercera sección, junto a Hilos y Peritos. Es la entidad-persona del expediente. Mantener el vínculo cautelar↔veedor visualmente.

### UX-24: Pasivos no admiten valuaciones temporales — RESUELTO 2026-05-07
**Descripción:** una hipoteca o moratoria fiscal cambia de saldo en el tiempo. Hoy las valuaciones (`bien_valuaciones`) solo se ofrecen para activos en la UI; aunque la DB las admite para cualquier bien.
**Estado actual:** RESUELTO — `BienCard` y `ValuacionesModal` en [src/components/BienesPanel.tsx](src/components/BienesPanel.tsx) son agnósticos a `naturaleza` y ya soportaban valuaciones desde pasivos (el modal abre con `setValuacionesOpen(b)` en cualquier card; el ícono `TrendingUp` y el botón con el monto disparan la apertura). Lo único que faltaba era el copy: el header de la sección "Pasivos" ahora dice explícitamente "Click en el saldo para trackear evolución (los pasivos cambian de monto en el tiempo)". El refuerzo de affordance de UX-21 (ícono al lado del monto + border-bottom dashed) aplica también a los pasivos por reutilizar el mismo `BienCard`.
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Tab Patrimonio.
**Recomendación:** habilitar el modal de valuaciones también desde pasivos. Mismo componente.

---

## Categoría: Mutación de tipo de divorcio (R6)

### UX-25: No hay "deshacer" mutación
**Descripción:** una vez confirmada la mutación se cancelan tareas pendientes y se crean otras. Si el usuario cometió un error (mutó por accidente, o la contraparte después retira su retiro de conformidad), no hay forma de deshacer.
**Situación que lo revela:** error humano. Si Sebastián mutó a unilateral y al día siguiente Valentina vuelve a aceptar, el usuario querría revertir.
**Estado actual:** [src/components/MutarDivorcioModal.tsx](src/components/MutarDivorcioModal.tsx) — operación irreversible.
**Criticidad:** ALTA.
**Frecuencia:** poco común pero alto impacto cuando ocurre.
**Categoría:** Mutación.
**Recomendación:** botón "Deshacer mutación" que: (a) revierte `tipo_divorcio` al valor previo (lo guarda en metadata del evento), (b) re-pendientea tareas canceladas por esa mutación, (c) cancela las creadas. Validar que no hayan pasado >24h desde la mutación.

### UX-26: Preview de tareas a cancelar/crear no agrupa por etapa — RESUELTO 2026-05-07
**Descripción:** el preview muestra una lista plana de tareas "[etapa] título". Cuando hay 8+ tareas (caso típico) cuesta leer.
**Estado actual:** RESUELTO — agregado helper `agruparPorEtapa()` en [src/components/MutarDivorcioModal.tsx](src/components/MutarDivorcioModal.tsx) que preserva orden de aparición. Las dos listas (a cancelar, a crear) se renderizan agrupadas por etapa: cada etapa abre con sub-header "ETAPA · N" en color del bloque (rojo / emerald) y los items van como bullets indentados sin el prefijo "[etapa]" duplicado. Las tareas sin etapa caen en bucket "Sin etapa".
**Criticidad:** BAJA.
**Frecuencia:** universal en mutaciones.
**Categoría:** Mutación.
**Recomendación:** agrupar la lista por etapa (Demanda · Audiencia · Prueba · ...) con sub-headers.

---

## Categoría: Reconvención

### UX-27: La reconvención se carga como entidad independiente sin link al evento procesal que la originó — RESUELTO 2026-05-07
**Descripción:** cargás una reconvención con fecha de presentación, pero no creás un evento `demanda_reconvencional` automáticamente en el timeline. Quedan dos cosas para llenar (la reconvención y el evento) que reflejan el mismo hecho procesal.
**Situación que lo revela:** Ruiz/Colombo — Valentina reconviene 02/05/2026. El usuario carga la reconvención pero el timeline no muestra el hito.
**Estado actual:** RESUELTO — [src/components/ReconvencionesPanel.tsx](src/components/ReconvencionesPanel.tsx) ahora ofrece checkbox "Registrar también evento Demanda reconvencional en el timeline" pre-seleccionado al crear (no al editar). Al confirmar: crea primero el evento via `handleCreateEvento` (tipo `demanda_reconvencional`, fecha = `fechaPresentacion`, jurisdicción del matter, descripción = `pretensionDesc`, título incluye "Mi parte" / "Contraparte") y luego crea la reconvención con `eventoPresentacionId` linkeado al evento recién creado. Si la creación del evento falla, igual se crea la reconvención y se loggea el error (degradación grácil). En modo edición, si la reconvención ya tiene `eventoPresentacionId`, muestra confirmación verde "vinculada a un evento del timeline" en lugar del checkbox.
**Criticidad:** ALTA.
**Frecuencia:** universal en reconvenciones.
**Categoría:** Reconvención.
**Recomendación:** al crear la reconvención, ofrecer checkbox "Registrar también evento `demanda_reconvencional` en el timeline" pre-seleccionado. Al confirmar, crear evento + reconvención atómicamente y guardar el `evento_presentacion_id` en la reconvención.

### UX-28: Banner de reconvención pendiente no dice cuándo vence el plazo de contestación — RESUELTO 2026-05-07
**Descripción:** dice "pendiente de traslado" o "traslado corrido", pero no muestra la fecha límite real para contestar (15 días hábiles desde el traslado).
**Estado actual:** RESUELTO — agregada columna `fecha_traslado_corrido DATE` en [sql/050_reconvenciones_fecha_traslado.sql](sql/050_reconvenciones_fecha_traslado.sql), campo `fechaTrasladoCorrido` en `Reconvencion` ([src/types.ts](src/types.ts)), mapping en `toReconvencion`/`reconvencionToRow` ([src/lib/db.ts](src/lib/db.ts)), date-input condicional en `ReconvencionForm` ([src/components/ReconvencionesPanel.tsx](src/components/ReconvencionesPanel.tsx)) que aparece solo cuando estado = `traslado_corrido` (y se limpia al rebajar). En [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx): por cada reconvención con traslado_corrido + fecha cargada se calcula vencimiento (15 días hábiles, `calcularVencimientoSync` con la jurisdicción del matter); el banner muestra "Plazo de contestación vence el X — quedan N días"; cuando `dias <= 2` o vencido el banner se vuelve rojo crítico (border, fondo, ring + botón rojo); cuando ≤5 rojo medio; sin fecha cargada muestra hint "cargá la fecha del traslado para ver el vencimiento". El resumen colapsado de UX-9 escala su severidad a 'critica' / tono rose en este caso.
**Criticidad:** ALTA.
**Frecuencia:** universal en reconvenciones con traslado corrido.
**Categoría:** Reconvención.
**Recomendación:** cuando estado = `traslado_corrido`, mostrar "vence el [fecha calculada con plazos.ts]". Si <5 días, banner rojo. Si vencido, alerta crítica.

---

## Categoría: Sub-procesos / Apelaciones

### UX-29: Crear apelación no muestra preview de la sentencia que apela — RESUELTO 2026-05-07
**Descripción:** cuando creás un sub-proceso de apelación, marcás aspectos apelados (compensación, atribución, etc.) pero no ves cuáles son los valores fijados por la sentencia de origen para esos aspectos. El usuario tiene que recordar o ir a buscarlos.
**Estado actual:** RESUELTO — agregado `<SentenciaPreview parentMatter aspectos>` debajo de la grilla de aspectos en `CrearSubProcesoModal` ([src/components/SubProcesosPanel.tsx](src/components/SubProcesosPanel.tsx)). Por cada aspecto seleccionado lee `parentMatter.caseData` (compensación, atribución, comunicación, vacaciones, tipo cuidado, residencia, costas, sentencia_compensacion_otorgada) y para cuota alimentaria lista las cuotas relacionales del matter. Header muestra fecha de sentencia y estado si no está firme. Si no hay nada cargado avisa "verificá que la sentencia esté cargada antes de apelar".
**Criticidad:** MEDIA.
**Frecuencia:** universal en apelaciones.
**Categoría:** Sub-procesos.
**Recomendación:** en el modal de crear apelación, debajo de los aspectos seleccionados, mostrar mini-tabla: "Compensación: U$S 120.000 fijado por sentencia 20/02/2027 · Atribución vivienda: Valentina por 4 años...". Lo lee desde `caseData.sentencia_*` o eventos relacionados.

### UX-30: Apelaciones cruzadas se ven como dos cards separadas sin enfatizar la cruza — RESUELTO 2026-05-07
**Descripción:** Sebastián y Valentina apelan compensación → 2 cards distintas. Visualmente parecen dos apelaciones independientes. El audit que detecta cruza está en el footer del banner pero no en las cards.
**Estado actual:** RESUELTO — [src/components/SubProcesosPanel.tsx](src/components/SubProcesosPanel.tsx) calcula `gruposCruzados` (apelaciones del mismo matter que comparten al menos un aspecto Y tienen distinto `apeladoPor`). Cada cruza se renderiza en un bloque fucsia "Apelaciones cruzadas sobre [aspecto] · N apelantes" con las cards adentro y un texto "resolvelas en conjunto: cualquier modificación impacta a la otra". Las apelaciones sin cruza siguen abajo en "Otras apelaciones". Una misma apelación puede aparecer en múltiples bloques si cruza en varios aspectos.
**Criticidad:** MEDIA.
**Frecuencia:** 30-40% de las apelaciones.
**Categoría:** Sub-procesos.
**Recomendación:** cuando dos apelaciones del mismo matter comparten al menos un aspecto, agruparlas visualmente en un mini-bloque "Apelaciones cruzadas sobre Compensación económica" con dos sub-cards adentro.

### UX-31: Banner "parcialmente firme" no link directo a sub-procesos — RESUELTO 2026-05-07
**Descripción:** el banner amber dice "Hay 2 sub-procesos de Cámara en trámite. Verlos en tab Expediente → Sub-procesos." Es un texto, no un botón.
**Estado actual:** RESUELTO — el texto se convirtió en un CTA "Ver sub-procesos →" en [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx). El botón hace `setActiveTab('expediente')` y luego `scrollIntoView` al `id="subprocesos-section"` (`requestAnimationFrame` para esperar el render del tab). El layout del banner pasó a flex con texto a la izquierda y botón a la derecha.
**Criticidad:** BAJA.
**Frecuencia:** universal en parcialmente firme.
**Categoría:** Sub-procesos.
**Recomendación:** convertir en CTA: botón "Ver sub-procesos" que cambia activeTab a 'expediente' y scrollea a SubProcesosPanel.

---

## Categoría: Cuotas alimentarias (R13)

### UX-32: Cuotas dentro del tab Hijos compite con la lista de hijos — RESUELTO 2026-05-07
**Descripción:** scroll del tab Hijos: primero la lista de hijos con sus cards completas, después la sección de cuotas. Cuando hay 3 hijos con detalle (TEA, terapias, etc.) la lista ocupa toda la pantalla y el usuario no ve que hay cuotas debajo.
**Estado actual:** RESUELTO — [src/components/MatterDetail.tsx](src/components/MatterDetail.tsx) ahora renderiza sub-tabs adentro del tab Hijos: "Datos de los hijos (N)" / "Cuotas y obligaciones (N)" con badge de conteo. El estado vive en `hijosSubTab` y arranca en 'datos'. Solo un panel se renderiza por vez, eliminando la competencia por espacio vertical.
**Criticidad:** MEDIA.
**Frecuencia:** universal en familia.
**Categoría:** Cuotas alimentarias.
**Recomendación:** en lugar de apilarlas en el mismo tab, hacer un sub-tab dentro de Hijos: "Datos de los hijos" / "Cuotas y obligaciones". O mover cuotas a tab "Cobranzas" (que ya existe).

### UX-33: Conceptos en especie se cargan dentro de cada cuota — flujo no es claro — RESUELTO 2026-05-07
**Descripción:** después de crear una cuota, hay que hacer click en un botón chico "+ Concepto" dentro de la card. Es fácil de saltear si no sabés que existe.
**Estado actual:** RESUELTO — [src/components/CuotasAlimentariasPanel.tsx](src/components/CuotasAlimentariasPanel.tsx) guarda `cuotaRecienCreadaId` cuando se crea (no editar) una cuota. Aparece un banner emerald arriba de la lista con CTA "Agregar concepto" + "Más tarde". El primero abre directo el ConceptoForm con `conceptoCuotaId` pre-seteado al id de la cuota recién creada; el segundo descarta el banner. El banner desaparece automáticamente al accionar el CTA.
**Criticidad:** MEDIA.
**Frecuencia:** ~60-70% de cuotas tienen componente en especie.
**Categoría:** Cuotas alimentarias.
**Recomendación:** después de crear la cuota nueva, ofrecer al cierre del modal un toast con CTA "¿Agregar conceptos en especie?" → abre directo el modal de concepto. Aumenta tasa de carga completa.

### UX-34: Total estimado solo aparece si moneda y frecuencia coinciden — RESUELTO 2026-05-07
**Descripción:** si hay efectivo en ARS y un concepto en USD, el "Total estimado" no aparece (solo suma misma moneda). El usuario no sabe por qué no se calcula.
**Estado actual:** RESUELTO — [src/components/CuotasAlimentariasPanel.tsx](src/components/CuotasAlimentariasPanel.tsx) ahora calcula `hayMixtos` (al menos un concepto en distinta moneda/frecuencia que el efectivo). Dos casos: (a) si hay total parcial calculable + mixtos, el total aparece con sufijo amber "(excluye N concepto/s de moneda/frecuencia distinta)"; (b) si no hay total calculable pero sí conceptos cargados, aparece nota amber con `<AlertCircle>` "No se puede totalizar — los conceptos cargados están en monedas o frecuencias distintas a la del efectivo".
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Cuotas alimentarias.
**Recomendación:** mostrar mini-mensaje "No se puede totalizar — monedas/frecuencias mixtas" en lugar de ocultar la línea.

### UX-35: Ciclo de la cuota provisoria → modificada → definitiva no se ve como timeline — RESUELTO 2026-05-07
**Descripción:** cuando hay 2-3 cuotas históricas (provisoria, modificada, definitiva), aparecen como cards apiladas sin orden visual claro de qué reemplazó a qué.
**Estado actual:** RESUELTO — [src/components/CuotasAlimentariasPanel.tsx](src/components/CuotasAlimentariasPanel.tsx) calcula `historialCuotas` (orden cronológico ASC, marca como `vigente` la más reciente que no está extinguida). Cuando hay ≥2 cuotas se renderiza un mini-stepper horizontal scrolleable arriba de las cards: cada nodo muestra estado · fecha MM/yyyy · chip "VIGENTE" si aplica, separados por `<ChevronRight>`. Click en un nodo hace `scrollIntoView` a la card correspondiente (cada card recibió `id={cuota-${id}}` + `scroll-mt-4`).
**Criticidad:** BAJA.
**Frecuencia:** ~40% de divorcios contenciosos tienen >1 cuota.
**Categoría:** Cuotas alimentarias.
**Recomendación:** mini-stepper horizontal arriba de la sección: "Provisoria 06/2026 → Modificada 02/2027 (vigente)". Click en cada nodo abre la card correspondiente.

---

## Categoría: Eventos / Timeline

### UX-36: "Nueva acción" abre form de evento sin sugerir el tipo según contexto — RESUELTO 2026-05-07
**Descripción:** al crear un evento desde el botón "Nueva acción", el form pide elegir tipo de evento de una lista de 32+ tipos. No sugiere los más probables según el estado del matter.
**Estado actual:** RESUELTO — agregado `getSugerenciasEventoPorEtapa(currentStage)` en [src/lib/plazos.ts](src/lib/plazos.ts) que devuelve hasta 5 tipos típicos según substring de la etapa (Inicio/Demanda/Reconvención/Prueba/Alegatos/Sentencia/Apelación/Ejecución/Mediación). En [src/components/EventoForm.tsx](src/components/EventoForm.tsx) se renderiza una fila de chips arriba del select con "Sugeridos en {stage}: …", click setea `tipo`. El select completo sigue disponible debajo para casos atípicos.
**Criticidad:** MEDIA.
**Frecuencia:** universal cada vez que se carga un evento.
**Categoría:** Eventos / Timeline.
**Recomendación:** en el dropdown del form, mostrar arriba 3-5 "Tipos sugeridos según etapa actual" basados en el `currentStage` del matter (ej. en etapa Prueba sugerir `pericia_designada`, `aceptacion_perito`, `audiencia_testimonial`).

### UX-37: Eventos `mutacion_tipo_divorcio` y `cambio_representacion` no destacan en el timeline — RESUELTO 2026-05-07
**Descripción:** ambos eventos son cambios estructurales del caso pero en el timeline aparecen con el mismo estilo que un oficio cualquiera.
**Estado actual:** RESUELTO — [src/components/TimelinePanel.tsx](src/components/TimelinePanel.tsx) calcula `esEventoEstructural` para los tipos `mutacion_tipo_divorcio`, `deshacer_mutacion_tipo_divorcio` y `cambio_representacion`. Estos eventos reciben: dot rotado 45° en violeta (forma de diamante), card con `border-l-4 border-l-violet-500 bg-violet-500/5`, y badge violeta con ícono `<Diamond>` antes del label. Diferenciación visual inmediata sin ocultar el contenido.
**Criticidad:** BAJA.
**Frecuencia:** ocasional.
**Categoría:** Eventos / Timeline.
**Recomendación:** estilo distinto (borde violeta, ícono diamond) para eventos que mutan estructura del caso. Diferenciarlos visualmente del flujo procesal regular.

### UX-38: Exhortos internacionales no diferencian entrada vs salida — RESUELTO 2026-05-07
**Descripción:** el sistema modela `exhorto_internacional_librado` (sale) y `_contestado` (vuelve) pero no contempla el caso inverso (otro juzgado nos manda un exhorto y nosotros lo cumplimos).
**Estado actual:** RESUELTO — agregados los tipos `exhorto_internacional_recibido` y `exhorto_internacional_diligenciado` en [src/types.ts](src/types.ts) (union `TipoEvento`), [src/lib/plazos.ts](src/lib/plazos.ts) (entradas en `PLAZOS_POR_EVENTO` con default `[]` — sin plazo automático, lo fija la rogante; etiquetas en `TIPOS_EVENTO`). El form de evento y el timeline los muestran automáticamente porque consumen esos catálogos. La detección de exhortos pendientes existente (que opera sobre `librado` vs `contestado`) sigue intacta porque es outbound-only.
**Criticidad:** BAJA.
**Frecuencia:** raro pero existe.
**Categoría:** Eventos / Timeline.
**Recomendación:** agregar `exhorto_internacional_recibido` y `exhorto_internacional_diligenciado` para el caso inverso. Útil para estudios que también atienden exhortos consulares entrantes.

---

## Top 5 a resolver primero

1. **UX-9 — Jerarquía de banners en cabecera.** Hasta 6 banners apilados degradan la legibilidad. Centro de alertas colapsable.
2. **UX-2 — Tipo de divorcio en Step 1.** Es la decisión estructural más importante; mal ubicada en Step 2 entremedio.
3. **UX-19 — Patrimonio sin overview.** Cualquier caso con >3 bienes pierde visibilidad de números totales.
4. **UX-25 — Mutación divorcio sin "deshacer".** Operación irreversible que destruye trabajo si fue por error.
5. **UX-22 — Cautelares desconectadas visualmente del bien afectado.** El usuario que mira el bien Juncal no ve que está bajo inhibición general.

---

## Pendientes / próximos pasos

1. Recorrer en próxima iteración: tab Cobranzas (compensación + honorarios regulados), tab Comunicaciones, página Bitácora, página Reportes.
2. Auditar accesibilidad básica (a11y): contraste de banners, navegación con teclado, screen readers.
3. Auditar responsive — el tab Patrimonio con 3 secciones puede romper en mobile.
4. Revisar copys de errores y empty states (mucha duplicación entre paneles).

---

## Cómo trabajar este documento

Cada hallazgo tiene un ID único (UX-N). Cuando arranquemos a fixear, los abordamos en orden del Top 5 → resto por categoría. Para cada uno: implementación, validación visual contra el caso Ruiz/Colombo, ticking en este documento.
