// GAP R3 — Detección de transición menor → mayor de edad.
//
// Cuando un hijo cumple 18 mid-process, la cuota muta de "obligación
// oficiosa para hijo menor" a "alimentos a hijo mayor que estudia
// (art. 663 CCyCN, hasta los 25 años)" y deja de aplicar el cuidado
// personal sobre ese hijo. Este helper identifica:
//
//   • Hijos que VAN a cumplir 18 dentro de una ventana próxima
//     (default 90 días) — para preparar la transición.
//   • Hijos que YA cumplieron 18 hace poco (default 30 días) — por si
//     quedó pendiente actualizar régimen y acreditar estudios.
//
// La UI muestra un banner amber discreto en MatterDetail listando los
// hijos en cualquiera de los dos estados.

import { addYears, differenceInCalendarDays, parseISO } from 'date-fns';
import type { HijoCaso } from '../types';

export interface HijoProximoCumplir18 {
  hijo: HijoCaso;
  fechaCumple: Date;
  diasRestantes: number;
}

export interface HijoRecienCumplio18 {
  hijo: HijoCaso;
  fechaCumple: Date;
  diasDesde: number;
}

/**
 * Hijos del caso que cumplen 18 entre HOY y `dias` días en el futuro.
 * Excluye los que ya cumplieron 18 (esos van por `recienCumplio18`).
 */
export function proximosACumplir18(
  hijos: HijoCaso[],
  dias = 90,
  hoy: Date = new Date(),
): HijoProximoCumplir18[] {
  const out: HijoProximoCumplir18[] = [];
  for (const hijo of hijos) {
    if (!hijo.fechaNacimiento) continue;
    let fechaCumple: Date;
    try {
      fechaCumple = addYears(parseISO(hijo.fechaNacimiento), 18);
    } catch {
      continue;
    }
    const diasRestantes = differenceInCalendarDays(fechaCumple, hoy);
    if (diasRestantes >= 0 && diasRestantes <= dias) {
      out.push({ hijo, fechaCumple, diasRestantes });
    }
  }
  return out.sort((a, b) => a.diasRestantes - b.diasRestantes);
}

/**
 * Hijos que cumplieron 18 dentro de los últimos `ventanaDias` días —
 * para señalizar que la transición a alimentos art. 663 CCyCN puede
 * estar pendiente de gestionar.
 */
export function recienCumplio18(
  hijos: HijoCaso[],
  ventanaDias = 30,
  hoy: Date = new Date(),
): HijoRecienCumplio18[] {
  const out: HijoRecienCumplio18[] = [];
  for (const hijo of hijos) {
    if (!hijo.fechaNacimiento) continue;
    let fechaCumple: Date;
    try {
      fechaCumple = addYears(parseISO(hijo.fechaNacimiento), 18);
    } catch {
      continue;
    }
    const diasDesde = differenceInCalendarDays(hoy, fechaCumple);
    if (diasDesde > 0 && diasDesde <= ventanaDias) {
      out.push({ hijo, fechaCumple, diasDesde });
    }
  }
  return out.sort((a, b) => a.diasDesde - b.diasDesde);
}

/**
 * Edad en años cumplidos a la fecha. Útil para badges y filtros.
 * Devuelve null si la fecha no parsea.
 */
export function edadEnAnios(fechaNacimiento: string, hoy: Date = new Date()): number | null {
  if (!fechaNacimiento) return null;
  try {
    const nac = parseISO(fechaNacimiento);
    const dias = differenceInCalendarDays(hoy, nac);
    if (dias < 0) return null;
    return Math.floor(dias / 365.25);
  } catch {
    return null;
  }
}
