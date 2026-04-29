/**
 * Resolución de número de expediente — Lawstream (GAP 14)
 *
 * Histórica deuda técnica: existían DOS fuentes de verdad para el número
 * de expediente:
 *   • Columna legacy `matters.expediente` (TEXT) — heredada de antes de
 *     que existiera la tabla expedientes.
 *   • Tabla `expedientes` con campos estructurados (nroReceptoria,
 *     nroJuzgado, caratula, fuero, juzgado, etc.).
 *
 * La tabla `expedientes` es la fuente CANÓNICA. La columna legacy queda
 * por compatibilidad con datos históricos hasta que la migración 031
 * los consolide y eventualmente la borremos en una migración futura.
 *
 * Uso: en cualquier UI que muestre "número de expediente", llamar a
 * `resolveExpedienteNumero(matter, expediente)` para obtener el número
 * canónico. La función prioriza la tabla y cae al campo legacy sólo si
 * la tabla no tiene nada.
 */

import { Matter, Expediente } from '../types';

/**
 * Devuelve el número de expediente "para mostrar" priorizando la tabla
 * expedientes sobre la columna legacy `matter.expediente`.
 * Orden de preferencia: nroJuzgado → nroReceptoria → matter.expediente.
 */
export function resolveExpedienteNumero(
  matter: Pick<Matter, 'expediente'>,
  expediente?: Expediente | null,
): string | undefined {
  if (expediente?.nroJuzgado) return expediente.nroJuzgado;
  if (expediente?.nroReceptoria) return expediente.nroReceptoria;
  return matter.expediente?.trim() || undefined;
}

/**
 * Versión que recibe la lista global de expedientes en lugar de uno solo.
 * Útil cuando un componente itera sobre matters sin tener cargado el
 * expediente correspondiente.
 */
export function resolveExpedienteNumeroFromList(
  matter: Pick<Matter, 'id' | 'expediente'>,
  expedientes: Expediente[],
): string | undefined {
  const exp = expedientes.find(e => e.matterId === matter.id);
  return resolveExpedienteNumero(matter, exp);
}

/**
 * ¿Tiene número de expediente cargado en cualquiera de las dos fuentes?
 * Útil para badges "sin judicializar".
 */
export function hasExpedienteNumero(
  matter: Pick<Matter, 'id' | 'expediente'>,
  expedientes: Expediente[],
): boolean {
  return resolveExpedienteNumeroFromList(matter, expedientes) !== undefined;
}
