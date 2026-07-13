# Patrón "datos vivos": todo dato asociado a una persona o cosa

## Principio

Toda la información que maneja el estudio está relacionada a **alguien** (cliente, hijo,
contraparte, letrado, perito) o a **algo** (un bien, un expediente). Un dato que queda como
texto libre, desconectado de la entidad a la que pertenece, se re-tipea una y otra vez, se
desincroniza y no se puede reusar en escritos. Regla práctica:

> Si un dato ya existe en una entidad, el formulario que lo necesita lo **deriva/pre-carga**
> desde esa entidad — nunca lo vuelve a pedir como texto libre.

## El patrón (cómo se implementa)

Tres mecanismos, según el caso:

1. **FK + derivación en el form.** El registro referencia a la entidad por id (ej.
   `CuotaConceptoEspecie.hijoId`). Al elegir la entidad, el form pre-carga los campos desde
   sus datos estructurados. No destructivo: solo completa lo vacío, queda editable.
   - Ejemplo: `src/lib/conceptoDesdeHijo.ts` → `ConceptoForm` en
     `src/components/CuotasAlimentariasPanel.tsx` (colegio ← `establecimiento`, obra social ←
     `coberturaEspecial`).

2. **Picker de reuso.** Cuando el dato ya se cargó en otra parte (misma entidad tipo), un
   modal deja elegir e incorporar esos registros en vez de re-tipearlos.
   - Ejemplo: `TraerGastosHijoModal` (mismo archivo) trae a la cuota los gastos que ya se
     cargaron en la ficha del hijo (viven como `CuotaConceptoEspecie` con `hijoId`).

3. **Bridge bidireccional caseData ↔ entidad.** Cuando un dato vive históricamente como texto
   en `matter.caseData` (fichas/plantillas) pero corresponde a una entidad, un bridge lo
   sincroniza en ambos sentidos.
   - Ejemplo: `src/lib/letradoBridge.ts` (caseData `conyuge2_abogado` ↔ `LetradoParte`),
     usado en `src/components/MatterDetail.tsx`.

Y para que el dato estructurado **llegue a los escritos**: un mapa placeholder → resolver.
   - Ejemplo: `BIEN_AUTOFILL_MAP` en `src/components/Plantillas.tsx` (Bien.atributos →
     `{{MATRICULA}}`, `{{NOMENCLATURA}}`, dominio de vehículo, etc.).

## Aplicado hasta ahora

- **Bien** (patrimonio): atributos estructurados por tipo → auto-fill en oficios de embargo.
- **Letrado de la contraparte**: bridge instrucciones ↔ expediente + matrícula estructurada.
- **Hijo → cuota alimentaria** (este pase): la cuota consume los datos del hijo (pre-carga) y
  sus gastos ya cargados (picker) en vez de pedirlos de nuevo.

## Backlog (próximos pases, por prioridad)

1. **Contraparte como entidad real.** Hoy es texto suelto en `caseData.conyuge2_*` /
   `contraparte_*`, capturado en `src/components/EntrevistaModal.tsx` y volcado a caseData en
   `src/components/CrearAsunto.tsx`. No existe una entidad "persona" para la contraparte:
   nombre, DNI/CUIT y domicilio flotan como strings. Candidato a una entidad persona
   reutilizable (o extender `Client`) + bridge como el del letrado.
2. **Abogado externo de causas relacionadas.** `src/components/CausasRelacionadasPanel.tsx`
   guarda `abogadoExternoNombre` / `abogadoExternoContacto` como texto libre. Candidato a
   `LetradoParte` con un flag de "externo", o al menos estructura (nombre + matrícula +
   contacto).
3. **Placeholders de solo-lectura en caseData** (`alimentante_empleador`, `empleador_cuit`,
   etc.). Baja prioridad: se leen para plantillas y rara vez se editan; migrar cuando exista
   la entidad correspondiente.

## Regla para features nuevas

Antes de agregar un textbox que describe a una persona o cosa, preguntar: **¿esta entidad ya
existe?** Si existe, referenciarla por id y derivar el dato. Si no existe y el dato es
importante, crear la entidad. Texto libre solo para datos que genuinamente no pertenecen a
ninguna entidad.
