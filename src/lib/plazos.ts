import { addDays, isWeekend, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { supabase } from './supabase';
import type { Jurisdiccion, TipoEvento, TipoProceso, Plazo, Feriado, Matter } from '../types';

/**
 * Resuelve la jurisdicción procesal ('caba' | 'pba' | 'nacional') a partir del
 * matter. Lee preferentemente la columna top-level `matter.jurisdiccion`
 * (agregada en migración 017). Si no está — caso legado — cae al legacy
 * `matter.caseData.jurisdiccion`.
 *
 * Falla ruidosamente si el matter no tiene jurisdicción en ningún lado:
 * asumir "nacional" por defecto puede llevar a calcular vencimientos con el
 * calendario de feriados equivocado y hacer que el abogado pierda un plazo
 * sin darse cuenta.
 */
export function resolveJurisdiccion(
  matter: Pick<Matter, 'id' | 'caseData' | 'jurisdiccion'>,
): Jurisdiccion {
  const raw =
    (matter.jurisdiccion as string | undefined) ??
    (matter.caseData as any)?.jurisdiccion;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      `El asunto ${matter.id} no tiene jurisdicción definida. ` +
      `Editá el caso y cargá la jurisdicción antes de registrar eventos con plazos.`,
    );
  }
  const norm = raw.trim().toLowerCase();
  if (norm === 'caba') return 'caba';
  if (norm === 'pba' || norm === 'provincia de buenos aires') return 'pba';
  if (norm === 'nacional') return 'nacional';
  throw new Error(
    `Jurisdicción no reconocida en el asunto ${matter.id}: "${raw}". ` +
    `Valores válidos: caba, pba, nacional.`,
  );
}

/** True si el matter tiene jurisdicción cargada (top-level o legacy caseData). */
export function hasJurisdiccion(
  matter: Pick<Matter, 'caseData' | 'jurisdiccion'>,
): boolean {
  const raw =
    (matter.jurisdiccion as string | undefined) ??
    (matter.caseData as any)?.jurisdiccion;
  if (!raw || typeof raw !== 'string' || !raw.trim()) return false;
  const norm = raw.trim().toLowerCase();
  return norm === 'caba' || norm === 'pba' || norm === 'nacional' || norm === 'provincia de buenos aires';
}

export interface PlazoConfig {
  fechaInicio: Date;
  dias: number;
  diasHabiles: boolean;
  jurisdiccion: Jurisdiccion;
}

/**
 * Definición de un plazo sugerido que dispara un tipo de evento.
 * El abogado puede aceptarlo, editarlo o descartarlo al crear el evento.
 */
export interface PlazoSugerido {
  tipo: string;
  dias: number;
  diasHabiles: boolean;
  descripcion: string;
}

// ─────────────────────────────────────────────────────────────────
// Cache de feriados — se lee una sola vez por sesión y por jurisdicción
// ─────────────────────────────────────────────────────────────────

let feriadosCache: Map<Jurisdiccion, Set<string>> | null = null;
let feriadosCachePromise: Promise<void> | null = null;

async function loadFeriadosCache(): Promise<void> {
  if (feriadosCache) return;
  if (feriadosCachePromise) return feriadosCachePromise;

  feriadosCachePromise = (async () => {
    const { data, error } = await supabase
      .from('feriados')
      .select('fecha, jurisdiccion_aplica');

    if (error) {
      console.error('[plazos] error cargando feriados:', error);
      feriadosCache = new Map();
      return;
    }

    const cache = new Map<Jurisdiccion, Set<string>>([
      ['caba', new Set()],
      ['pba', new Set()],
      ['nacional', new Set()],
    ]);

    for (const row of data || []) {
      const fecha = row.fecha as string;
      const jur = row.jurisdiccion_aplica as string;
      if (jur === 'todas') {
        cache.get('caba')!.add(fecha);
        cache.get('pba')!.add(fecha);
        cache.get('nacional')!.add(fecha);
      } else if (jur === 'caba' || jur === 'pba' || jur === 'nacional') {
        cache.get(jur)!.add(fecha);
      }
    }

    feriadosCache = cache;
  })();

  return feriadosCachePromise;
}

/** Fuerza recarga en la próxima llamada (ej: tras agregar feriados nuevos). */
export function resetFeriadosCache(): void {
  feriadosCache = null;
  feriadosCachePromise = null;
}

/**
 * Calcula la fecha de vencimiento sumando N días hábiles o corridos,
 * saltando feriados y ferias judiciales según la jurisdicción.
 *
 * Convención: se cuenta desde el día SIGUIENTE al evento (día 0 = fecha del evento,
 * día 1 = primer día hábil posterior).
 */
export async function calcularVencimiento(config: PlazoConfig): Promise<Date> {
  if (!config.diasHabiles) {
    return addDays(config.fechaInicio, config.dias);
  }

  await loadFeriadosCache();
  const feriadosSet = feriadosCache?.get(config.jurisdiccion) || new Set<string>();

  let fecha = config.fechaInicio;
  let diasContados = 0;

  while (diasContados < config.dias) {
    fecha = addDays(fecha, 1);
    if (isWeekend(fecha)) continue;
    if (feriadosSet.has(format(fecha, 'yyyy-MM-dd'))) continue;
    diasContados++;
  }

  return fecha;
}

/** Variante sincrónica que usa el cache ya cargado. Si no está cargado, asume sólo fines de semana. */
export function calcularVencimientoSync(
  config: PlazoConfig,
  feriadosSet?: Set<string>,
): Date {
  if (!config.diasHabiles) {
    return addDays(config.fechaInicio, config.dias);
  }

  const set = feriadosSet || feriadosCache?.get(config.jurisdiccion) || new Set<string>();

  let fecha = config.fechaInicio;
  let diasContados = 0;

  while (diasContados < config.dias) {
    fecha = addDays(fecha, 1);
    if (isWeekend(fecha)) continue;
    if (set.has(format(fecha, 'yyyy-MM-dd'))) continue;
    diasContados++;
  }

  return fecha;
}

/** Devuelve el set de fechas feriadas para una jurisdicción. Carga cache si hace falta. */
export async function getFeriadosSet(jurisdiccion: Jurisdiccion): Promise<Set<string>> {
  await loadFeriadosCache();
  return feriadosCache?.get(jurisdiccion) || new Set();
}

/**
 * Cuenta los días hábiles entre `desde` (exclusivo) y `hasta` (inclusivo),
 * salteando fines de semana y feriados/feria de la jurisdicción.
 *
 * Útil al SUSPENDER un plazo: necesitamos saber cuántos días hábiles ya
 * transcurrieron entre la fechaInicio del plazo y la fecha de suspensión,
 * para preservar ese conteo y reanudar correctamente.
 *
 * Convención: igual que `calcularVencimiento`, no se cuenta el día `desde`
 * (es el día del evento, día 0). Se empieza a contar desde `desde + 1`.
 */
export async function diasHabilesEntre(
  desde: Date,
  hasta: Date,
  jurisdiccion: Jurisdiccion,
): Promise<number> {
  await loadFeriadosCache();
  const feriadosSet = feriadosCache?.get(jurisdiccion) || new Set<string>();
  if (hasta <= desde) return 0;

  let count = 0;
  let cursor = addDays(desde, 1);
  while (cursor <= hasta) {
    if (!isWeekend(cursor) && !feriadosSet.has(format(cursor, 'yyyy-MM-dd'))) {
      count++;
    }
    cursor = addDays(cursor, 1);
  }
  return count;
}

// ─────────────────────────────────────────────────────────────────
// Tabla de plazos procesales típicos
// ─────────────────────────────────────────────────────────────────
//
// DISEÑO: cada entrada tiene un `default` (juicio ordinario, cualquier
// jurisdicción) y opcionalmente overrides por tipo de proceso (sumarísimo)
// o por combinación jurisdicción+proceso (caso único del sumario PBA).
//
// VERIFICACIÓN de equivalencia CABA vs PBA en ordinario civil (2026-04-24):
//   CPCCN y CPCC PBA coinciden en todos los plazos procesales comunes — PBA
//   replicó los días del código nacional. Las diferencias REALES aparecen
//   solo por tipo de proceso (sumarísimo: plazos más cortos) o por existencia
//   de un tipo de proceso propio (sumario: exclusivo PBA).
//
//   Fuentes consultadas:
//    • CPCCN arts. 150, 239, 244, 246, 259, 260, 338, 346, 473, 482, 498.
//    • CPCC PBA (Ley 7425) arts. 150, 238, 244, 246, 254, 260, 337, 344,
//      473, 480, 484 (sumario), 496 (sumarísimo).
//
// PRECEDENCIA al resolver: porJurisdiccionYProceso > porTipoProceso > default.

export interface PlazosConVariantes {
  /** Plazos por defecto (juicio ordinario, cualquier jurisdicción). */
  default: PlazoSugerido[];
  /** Overrides por tipo de proceso. Aplica en todas las jurisdicciones. */
  porTipoProceso?: Partial<Record<TipoProceso, PlazoSugerido[]>>;
  /** Overrides combinados jurisdicción+proceso. Precedencia más alta.
   *  Actualmente el único caso real es 'pba:sumario' — el juicio sumario
   *  existe solo en PBA. */
  porJurisdiccionYProceso?: Partial<Record<`${Jurisdiccion}:${TipoProceso}`, PlazoSugerido[]>>;
}

export const PLAZOS_POR_EVENTO: Record<TipoEvento, PlazosConVariantes> = {
  traslado: {
    default: [
      { tipo: 'Contestar traslado', dias: 15, diasHabiles: true, descripcion: 'Art. 338 CPCCN / 337 CPCC PBA — juicio ordinario' },
    ],
    porTipoProceso: {
      sumarisimo: [
        { tipo: 'Contestar traslado', dias: 5, diasHabiles: true, descripcion: 'Art. 498 CPCCN / 496 CPCC PBA — sumarísimo' },
      ],
    },
    porJurisdiccionYProceso: {
      'pba:sumario': [
        { tipo: 'Contestar traslado', dias: 10, diasHabiles: true, descripcion: 'Art. 484 CPCC PBA — juicio sumario (solo PBA)' },
      ],
    },
  },
  oficio_provisto: {
    default: [
      { tipo: 'Diligenciar oficio', dias: 10, diasHabiles: true, descripcion: 'Plazo ordinario de diligenciamiento' },
    ],
  },
  oficio_diligenciado: { default: [] },
  resolucion: {
    default: [
      { tipo: 'Interponer recurso de reposición', dias: 3, diasHabiles: true, descripcion: 'Art. 239 CPCCN / 238 CPCC PBA' },
      { tipo: 'Interponer recurso de apelación',  dias: 5, diasHabiles: true, descripcion: 'Art. 244 CPCCN / CPCC PBA' },
    ],
  },
  sentencia: {
    default: [
      { tipo: 'Apelar sentencia',     dias: 5, diasHabiles: true, descripcion: 'Art. 244 CPCCN / CPCC PBA — plazo de apelación' },
      { tipo: 'Pedir aclaratoria',    dias: 3, diasHabiles: true, descripcion: 'Art. 166 inc. 2 CPCCN / 166 CPCC PBA — corrección de errores materiales o aclaración' },
    ],
  },
  proveido: { default: [] },
  ofrecimiento_prueba: { default: [] },
  audiencia_fijada: { default: [] },
  audiencia_celebrada: { default: [] },
  audiencia_suspendida: { default: [] },
  audiencia_testimonial: { default: [] },
  presentacion_propia: { default: [] },
  presentacion_contraria: {
    default: [
      { tipo: 'Contestar presentación de la contraria', dias: 5, diasHabiles: true, descripcion: 'Traslado simple' },
    ],
  },
  pericia_designada: {
    default: [
      { tipo: 'Proponer puntos de pericia', dias: 5, diasHabiles: true, descripcion: 'Antes de la aceptación del perito' },
    ],
  },
  aceptacion_perito: { default: [] },
  pericia_presentada: {
    default: [
      { tipo: 'Impugnar pericia',          dias: 5, diasHabiles: true, descripcion: 'Art. 473 CPCCN / CPCC PBA — observar/impugnar el dictamen' },
      { tipo: 'Pedir explicaciones',       dias: 5, diasHabiles: true, descripcion: 'Art. 473 CPCCN / CPCC PBA — solicitar al juez que el perito amplíe o aclare' },
    ],
  },
  pedido_explicaciones: { default: [] },
  contestacion_explicaciones: { default: [] },
  notificacion_recibida: {
    default: [
      { tipo: 'Plazo general de respuesta', dias: 5, diasHabiles: true, descripcion: 'Verificar plazo específico según contenido' },
    ],
  },
  autos_para_alegar: {
    default: [
      { tipo: 'Presentar alegato', dias: 6, diasHabiles: true, descripcion: 'Art. 482 CPCCN / 480 CPCC PBA — plazo común' },
    ],
  },
  autos_para_sentencia: { default: [] },
  regulacion_honorarios: {
    default: [
      { tipo: 'Apelar regulación', dias: 5, diasHabiles: true, descripcion: 'Art. 244 CPCCN / ley 27.423 art. 22 — PBA ley 14.967 art. 57' },
    ],
  },
  recurso_interpuesto: {
    default: [
      { tipo: 'Fundar recurso', dias: 5, diasHabiles: true, descripcion: 'Memorial de agravios — art. 246 CPCCN / CPCC PBA (recurso en relación)' },
    ],
    porTipoProceso: {
      sumarisimo: [
        { tipo: 'Fundar recurso', dias: 3, diasHabiles: true, descripcion: 'Art. 498 CPCCN / 496 CPCC PBA — sumarísimo' },
      ],
    },
  },
  expresion_agravios: {
    default: [
      { tipo: 'Contestar agravios', dias: 10, diasHabiles: true, descripcion: 'Art. 259 CPCCN / 254 CPCC PBA — traslado libre' },
    ],
    porTipoProceso: {
      sumarisimo: [
        { tipo: 'Contestar agravios', dias: 3, diasHabiles: true, descripcion: 'Art. 498 CPCCN / 496 CPCC PBA — sumarísimo' },
      ],
    },
    porJurisdiccionYProceso: {
      'pba:sumario': [
        { tipo: 'Contestar agravios', dias: 5, diasHabiles: true, descripcion: 'CPCC PBA — juicio sumario' },
      ],
    },
  },
  contestacion_agravios: { default: [] },
  elevacion_camara: { default: [] },
  cambio_representacion: { default: [] },
  otro: { default: [] },
};

/**
 * Devuelve los plazos sugeridos para un tipo de evento, considerando la
 * jurisdicción y el tipo de proceso del caso. Aplica precedencia:
 *   porJurisdiccionYProceso > porTipoProceso > default.
 *
 * Si `tipoProceso` no se pasa, asume 'ordinario' (el caso dominante).
 */
export function getPlazosSugeridosPara(
  tipo: TipoEvento,
  jurisdiccion: Jurisdiccion,
  tipoProceso: TipoProceso = 'ordinario',
): PlazoSugerido[] {
  const entry = PLAZOS_POR_EVENTO[tipo];
  if (!entry) return [];
  const keyCombinada = `${jurisdiccion}:${tipoProceso}` as const;
  return (
    entry.porJurisdiccionYProceso?.[keyCombinada] ??
    entry.porTipoProceso?.[tipoProceso] ??
    entry.default
  );
}

/** Label legible del tipo de proceso — para hints y banners de UI. */
export function labelTipoProceso(tipo: TipoProceso): string {
  if (tipo === 'ordinario') return 'juicio ordinario';
  if (tipo === 'sumario') return 'juicio sumario';
  return 'juicio sumarísimo';
}

// ─────────────────────────────────────────────────────────────────
// Helpers de presentación
// ─────────────────────────────────────────────────────────────────

/** Estado de urgencia según días restantes. Útil para colorear tarjetas. */
export type UrgenciaPlazo = 'vencido' | 'critico' | 'proximo' | 'normal';

export function urgenciaDePlazo(plazo: Pick<Plazo, 'fechaVencimiento' | 'estado'>): UrgenciaPlazo {
  if (plazo.estado !== 'activo') return 'normal';
  const diff = differenceInCalendarDays(parseISO(plazo.fechaVencimiento), new Date());
  if (diff < 0) return 'vencido';
  if (diff <= 3) return 'critico';
  if (diff <= 7) return 'proximo';
  return 'normal';
}

export function diasRestantes(fechaVencimiento: string): number {
  return differenceInCalendarDays(parseISO(fechaVencimiento), new Date());
}

// ─────────────────────────────────────────────────────────────────
// Metadata presentacional de los tipos de evento
// ─────────────────────────────────────────────────────────────────

export interface TipoEventoDef {
  tipo: TipoEvento;
  label: string;
  descripcionCorta: string;
}

export const TIPOS_EVENTO: TipoEventoDef[] = [
  { tipo: 'traslado',                  label: 'Traslado',                     descripcionCorta: 'Dispara plazo de contestación' },
  { tipo: 'resolucion',                label: 'Resolución',                   descripcionCorta: 'Dispara plazo de recurso' },
  { tipo: 'oficio_provisto',           label: 'Oficio provisto',              descripcionCorta: 'Oficio salió del juzgado' },
  { tipo: 'oficio_diligenciado',       label: 'Oficio diligenciado',          descripcionCorta: 'Oficio respondido' },
  { tipo: 'proveido',                  label: 'Proveído',                     descripcionCorta: 'Provisión genérica' },
  { tipo: 'ofrecimiento_prueba',       label: 'Ofrecimiento de prueba',       descripcionCorta: 'Se ofrece la prueba de la parte' },
  { tipo: 'audiencia_fijada',          label: 'Audiencia fijada',             descripcionCorta: 'Recordatorio, sin plazo automático' },
  { tipo: 'audiencia_celebrada',       label: 'Audiencia celebrada',          descripcionCorta: 'Se realizó la audiencia' },
  { tipo: 'audiencia_suspendida',      label: 'Audiencia suspendida',         descripcionCorta: 'Queda a nueva fecha' },
  { tipo: 'audiencia_testimonial',     label: 'Audiencia testimonial',        descripcionCorta: 'Audiencia de testigos' },
  { tipo: 'presentacion_propia',       label: 'Presentación propia',          descripcionCorta: 'Escrito que presentamos' },
  { tipo: 'presentacion_contraria',    label: 'Presentación contraria',       descripcionCorta: 'Escrito de la contraparte' },
  { tipo: 'pericia_designada',         label: 'Pericia designada',            descripcionCorta: 'Juzgado designa perito' },
  { tipo: 'aceptacion_perito',         label: 'Aceptación de perito',         descripcionCorta: 'Perito aceptó el cargo' },
  { tipo: 'pericia_presentada',        label: 'Pericia presentada',           descripcionCorta: 'Dispara plazo de impugnación' },
  { tipo: 'pedido_explicaciones',      label: 'Pedido de explicaciones',      descripcionCorta: 'Se piden explicaciones al perito' },
  { tipo: 'contestacion_explicaciones',label: 'Contestación de explicaciones',descripcionCorta: 'Perito contesta las explicaciones' },
  { tipo: 'notificacion_recibida',     label: 'Notificación recibida',        descripcionCorta: 'Cédula o ministerio ley' },
  { tipo: 'autos_para_alegar',         label: 'Autos para alegar',            descripcionCorta: 'Dispara plazo de alegatos' },
  { tipo: 'autos_para_sentencia',      label: 'Autos para sentencia',         descripcionCorta: 'Causa en espera de sentencia' },
  { tipo: 'sentencia',                 label: 'Sentencia',                    descripcionCorta: 'Dispara plazo de apelación' },
  { tipo: 'regulacion_honorarios',     label: 'Regulación de honorarios',     descripcionCorta: 'Dispara plazo de apelación de regulación' },
  { tipo: 'recurso_interpuesto',       label: 'Recurso interpuesto',          descripcionCorta: 'Dispara plazo de fundamentación' },
  { tipo: 'expresion_agravios',        label: 'Expresión de agravios',        descripcionCorta: 'Se funda la apelación' },
  { tipo: 'contestacion_agravios',     label: 'Contestación de agravios',     descripcionCorta: 'Se contestan los agravios' },
  { tipo: 'elevacion_camara',          label: 'Elevación a Cámara',           descripcionCorta: 'El expediente sube a Cámara' },
  { tipo: 'cambio_representacion',     label: 'Cambio de representación',     descripcionCorta: 'Renuncia o cesión de patrocinio' },
  { tipo: 'otro',                      label: 'Otro',                         descripcionCorta: 'Movimiento no tipificado' },
];

export function labelDeTipoEvento(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find(t => t.tipo === tipo)?.label || tipo;
}
