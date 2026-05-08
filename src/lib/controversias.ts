// GAP UX-33 — Helper de severidad y ordering para controversias.
//
// La severidad se calcula sobre el plazo crítico:
//   - 'vencida'    → plazo ya pasó (negativo)
//   - 'inminente'  → plazo en ≤ 3 días
//   - 'proxima'    → plazo en ≤ 7 días
//   - 'media'      → plazo en > 7 días
//   - 'sin_plazo'  → no hay plazo crítico cargado
//
// Para ordenar controversias en el panel:
//   abiertas (vencida → inminente → próxima → media → sin_plazo)
//     → cerradas al final, agrupadas.

import { Controversia, EstadoControversia, ESTADO_CONTROVERSIA_ABIERTOS } from '../types';

export type SeveridadControversia =
  | 'vencida' | 'inminente' | 'proxima' | 'media' | 'sin_plazo';

const PRIORIDAD_SEVERIDAD: Record<SeveridadControversia, number> = {
  vencida:   0,
  inminente: 1,
  proxima:   2,
  media:     3,
  sin_plazo: 4,
};

const PRIORIDAD_ESTADO: Record<EstadoControversia, number> = {
  abierta:        0,
  negociando:     1,
  judicializada:  2,
  acordada:       3,
  desistida:      4,
};

export function diasHastaPlazo(plazoIso: string | undefined): number | null {
  if (!plazoIso) return null;
  const plazo = new Date(plazoIso + 'T00:00:00');
  if (Number.isNaN(plazo.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((plazo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function severidadControversia(c: Controversia): SeveridadControversia {
  // Las cerradas (acordada / desistida / judicializada) no se pintan
  // por urgencia — pero igual devolvemos su severidad calculada por si
  // algún consumer la necesita.
  const dias = diasHastaPlazo(c.plazoCritico);
  if (dias === null) return 'sin_plazo';
  if (dias < 0)      return 'vencida';
  if (dias <= 3)     return 'inminente';
  if (dias <= 7)     return 'proxima';
  return 'media';
}

export function estaAbierta(c: Controversia): boolean {
  return ESTADO_CONTROVERSIA_ABIERTOS.includes(c.estado);
}

export function ordenarControversias(items: Controversia[]): Controversia[] {
  return [...items].sort((a, b) => {
    // 1. Abiertas / negociando primero.
    const estadoA = PRIORIDAD_ESTADO[a.estado];
    const estadoB = PRIORIDAD_ESTADO[b.estado];
    if (estadoA !== estadoB) return estadoA - estadoB;
    // 2. Por severidad (vencida → sin_plazo).
    const sevA = PRIORIDAD_SEVERIDAD[severidadControversia(a)];
    const sevB = PRIORIDAD_SEVERIDAD[severidadControversia(b)];
    if (sevA !== sevB) return sevA - sevB;
    // 3. Por fecha del hecho descendente (más reciente arriba).
    return b.fechaHecho.localeCompare(a.fechaHecho);
  });
}

// La controversia "más urgente" abierta — la usa el banner del header.
export function controversiaMasUrgenteAbierta(items: Controversia[]): Controversia | null {
  const abiertas = items.filter(estaAbierta);
  if (abiertas.length === 0) return null;
  const ordenadas = ordenarControversias(abiertas);
  return ordenadas[0] ?? null;
}

// Severidad agregada del matter — para el chip del resumen UX-9.
//   - 'critica' si hay alguna vencida o inminente.
//   - 'alta'    si hay alguna próxima (≤ 7 días).
//   - 'media'   si hay alguna abierta sin plazo o con plazo > 7 días.
//   - 'sin_alerta' si no hay controversias abiertas.
export type SeveridadAgregadaControversias = 'critica' | 'alta' | 'media' | 'sin_alerta';

export function severidadAgregadaControversias(
  items: Controversia[],
): SeveridadAgregadaControversias {
  const abiertas = items.filter(estaAbierta);
  if (abiertas.length === 0) return 'sin_alerta';
  let tieneCritica = false;
  let tieneAlta    = false;
  for (const c of abiertas) {
    const s = severidadControversia(c);
    if (s === 'vencida' || s === 'inminente') tieneCritica = true;
    else if (s === 'proxima')                 tieneAlta = true;
  }
  if (tieneCritica) return 'critica';
  if (tieneAlta)    return 'alta';
  return 'media';
}
