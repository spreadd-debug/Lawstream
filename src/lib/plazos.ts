import { addDays, isWeekend, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { supabase } from './supabase';
import type { Jurisdiccion, TipoEvento, Plazo, Feriado } from '../types';

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

// ─────────────────────────────────────────────────────────────────
// Tabla de plazos procesales típicos
// ─────────────────────────────────────────────────────────────────
// Cuando el abogado elige un tipo de evento, se sugieren los plazos
// que éste dispara. El valor es configurable por el estudio en el futuro.

export const PLAZOS_POR_EVENTO: Record<TipoEvento, PlazoSugerido[]> = {
  traslado: [
    { tipo: 'Contestar traslado', dias: 15, diasHabiles: true, descripcion: 'Art. 150 CPCCN / 354 CPCC PBA' },
  ],
  oficio_provisto: [
    { tipo: 'Diligenciar oficio', dias: 10, diasHabiles: true, descripcion: 'Plazo ordinario de diligenciamiento' },
  ],
  oficio_diligenciado: [],
  resolucion: [
    { tipo: 'Interponer recurso de reposición', dias: 3, diasHabiles: true, descripcion: 'Art. 239 CPCCN' },
    { tipo: 'Interponer recurso de apelación',  dias: 5, diasHabiles: true, descripcion: 'Art. 244 CPCCN' },
  ],
  sentencia: [
    { tipo: 'Apelar sentencia', dias: 5, diasHabiles: true, descripcion: 'Art. 244 CPCCN — plazo de apelación' },
  ],
  proveido: [],
  audiencia_fijada: [],
  audiencia_celebrada: [],
  audiencia_suspendida: [],
  presentacion_propia: [],
  presentacion_contraria: [
    { tipo: 'Contestar presentación de la contraria', dias: 5, diasHabiles: true, descripcion: 'Traslado simple' },
  ],
  pericia_designada: [
    { tipo: 'Proponer puntos de pericia', dias: 5, diasHabiles: true, descripcion: 'Antes de la aceptación del perito' },
  ],
  pericia_presentada: [
    { tipo: 'Impugnar pericia', dias: 5, diasHabiles: true, descripcion: 'Art. 473 CPCCN' },
  ],
  notificacion_recibida: [
    { tipo: 'Plazo general de respuesta', dias: 5, diasHabiles: true, descripcion: 'Verificar plazo específico según contenido' },
  ],
  autos_para_sentencia: [],
  recurso_interpuesto: [
    { tipo: 'Fundar recurso', dias: 5, diasHabiles: true, descripcion: 'Memorial de agravios' },
  ],
  otro: [],
};

/** Sugeridos sin efectos secundarios — útil para previsualizaciones UI. */
export function getPlazosSugeridosPara(tipo: TipoEvento): PlazoSugerido[] {
  return PLAZOS_POR_EVENTO[tipo] || [];
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
  { tipo: 'traslado',              label: 'Traslado',                   descripcionCorta: 'Dispara plazo de contestación' },
  { tipo: 'resolucion',            label: 'Resolución',                 descripcionCorta: 'Dispara plazo de recurso' },
  { tipo: 'sentencia',             label: 'Sentencia',                  descripcionCorta: 'Dispara plazo de apelación' },
  { tipo: 'proveido',              label: 'Proveído',                   descripcionCorta: 'Provisión genérica' },
  { tipo: 'oficio_provisto',       label: 'Oficio provisto',            descripcionCorta: 'Oficio salió del juzgado' },
  { tipo: 'oficio_diligenciado',   label: 'Oficio diligenciado',        descripcionCorta: 'Oficio respondido' },
  { tipo: 'audiencia_fijada',      label: 'Audiencia fijada',           descripcionCorta: 'Recordatorio, sin plazo automático' },
  { tipo: 'audiencia_celebrada',   label: 'Audiencia celebrada',        descripcionCorta: 'Se realizó la audiencia' },
  { tipo: 'audiencia_suspendida',  label: 'Audiencia suspendida',       descripcionCorta: 'Queda a nueva fecha' },
  { tipo: 'presentacion_propia',   label: 'Presentación propia',        descripcionCorta: 'Escrito que presentamos' },
  { tipo: 'presentacion_contraria',label: 'Presentación contraria',     descripcionCorta: 'Escrito de la contraparte' },
  { tipo: 'pericia_designada',     label: 'Pericia designada',          descripcionCorta: 'Perito aceptó el cargo' },
  { tipo: 'pericia_presentada',    label: 'Pericia presentada',         descripcionCorta: 'Dispara plazo de impugnación' },
  { tipo: 'notificacion_recibida', label: 'Notificación recibida',      descripcionCorta: 'Cédula o ministerio ley' },
  { tipo: 'autos_para_sentencia',  label: 'Autos para sentencia',       descripcionCorta: 'Causa en espera de sentencia' },
  { tipo: 'recurso_interpuesto',   label: 'Recurso interpuesto',        descripcionCorta: 'Dispara plazo de fundamentación' },
  { tipo: 'otro',                  label: 'Otro',                       descripcionCorta: 'Movimiento no tipificado' },
];

export function labelDeTipoEvento(tipo: TipoEvento): string {
  return TIPOS_EVENTO.find(t => t.tipo === tipo)?.label || tipo;
}
