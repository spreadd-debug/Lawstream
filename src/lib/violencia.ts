// GAP 21 — detección de cruce entre medida de protección vigente
// y régimen de comunicación propuesto/contrapropuesto.
//
// Regla básica:
//   • Si hay medida vigente (descripción + vigencia >= hoy o sin fecha
//     pero con descripción y organismo) Y existe un régimen de
//     comunicación cargado → flag de revisión.
//
// Heurística adicional ("amplio"):
//   • Si el texto del régimen contiene palabras clave de un régimen
//     amplio (pernoctes, fines de semana alternos, vacaciones, sin
//     restricción) → flag MÁS FUERTE: probable inconsistencia.
//
// La regla NO bloquea la edición. Sólo señaliza. La decisión final
// (¿hay cruce real o el régimen contempla la medida?) la toma el
// abogado. El objetivo es evitar el caso del audit: que un régimen
// amplio se acepte sin advertir que hay prohibición de acercamiento
// vigente.

import { differenceInCalendarDays, parseISO } from 'date-fns';

const PALABRAS_AMPLIO = [
  'amplio',
  'amplia',
  'pernocte',
  'pernoctar',
  'pernoctan',
  'fines de semana',
  'fin de semana',
  'fds',
  'vacaciones',
  'feriados largos',
  'sin restricci',
  'libre',
  'a discreci',
  'a voluntad',
];

export interface CruceViolencia {
  /** Hay al menos un cruce a revisar. */
  hayCruce: boolean;
  /** El régimen propuesto luce "amplio" — flag más fuerte. */
  regimenLuceAmplio: boolean;
  /** Texto corto para mostrar en banner / inline. */
  motivo: string;
  /** Fecha de vigencia de la medida (si la hay). */
  medidaVigenciaHasta?: string;
  /** Descripción de la medida. */
  medidaDescripcion?: string;
  /** Si la medida está vencida (pero igual cargada). */
  medidaVencida: boolean;
}

/**
 * Detecta cruce entre medida de protección y régimen de comunicación.
 * Lee de `caseData` (JSONB del matter) las claves estándar:
 *  - medida_descripcion
 *  - medida_tipo_denuncia (organismo: OVD, juzgado, comisaría...)
 *  - medida_vigencia_hasta (YYYY-MM-DD)
 *  - regimen_comunicacion (texto libre)
 */
export function detectarCruceViolencia(
  caseData: Record<string, string> | undefined,
): CruceViolencia {
  const cd = caseData ?? {};
  const medidaDescripcion = cd.medida_descripcion?.trim();
  const medidaOrganismo = cd.medida_tipo_denuncia?.trim();
  const medidaVigenciaHasta = cd.medida_vigencia_hasta?.trim();
  const regimen = cd.regimen_comunicacion?.trim();

  const tieneMedida = !!(medidaDescripcion || medidaOrganismo || medidaVigenciaHasta);
  const medidaVencida = !!(medidaVigenciaHasta && differenceInCalendarDays(parseISO(medidaVigenciaHasta), new Date()) < 0);
  const medidaActiva = tieneMedida && !medidaVencida;

  if (!medidaActiva || !regimen || regimen.length === 0) {
    return {
      hayCruce: false,
      regimenLuceAmplio: false,
      motivo: '',
      medidaVigenciaHasta,
      medidaDescripcion,
      medidaVencida,
    };
  }

  // Hay medida activa y régimen propuesto. Evaluar si luce amplio.
  const regimenLower = regimen.toLowerCase();
  const regimenLuceAmplio = PALABRAS_AMPLIO.some(p => regimenLower.includes(p));

  const motivo = regimenLuceAmplio
    ? 'El régimen propuesto luce amplio (incluye pernoctes / fines de semana / vacaciones) mientras hay medida de protección vigente. Posible inconsistencia.'
    : 'Hay medida de protección vigente y régimen de comunicación cargado. Revisar consistencia entre ambos.';

  return {
    hayCruce: true,
    regimenLuceAmplio,
    motivo,
    medidaVigenciaHasta,
    medidaDescripcion,
    medidaVencida: false,
  };
}
