/**
 * Alertas de perención e inactividad — Lawstream
 *
 * GAP 29 — la regla de "6 meses sin movimiento" del CPCCN art. 310 inc. 2
 * sólo aplica a juicios de conocimiento de PRIMERA INSTANCIA. Otros
 * contextos tienen umbrales distintos:
 *
 *   • Cámara / 2da instancia (kind='apelacion')   → 3 meses (art. 310 inc. 3)
 *   • Sumario / Sumarísimo (tipoProceso)          → 3 meses (art. 310 inc. 1)
 *   • Trámite ejecutivo / cautelar                → 3 meses (no usado aún)
 *
 * Además, hay un caso especial:
 *   • Autos para sentencia → NO corre perención (no hay carga procesal de
 *     impulso para las partes), pero sí merece SEGUIMIENTO porque el
 *     juzgado podría estar atrasado. Alerta a 60 d y 90 d. Severidad y
 *     copy distintos al de perención.
 *
 * La función toma los eventos del expediente para detectar el último
 * evento relevante (autos_para_sentencia) y decidir el contexto.
 */

import { Matter, Expediente, EventoExpediente } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

export type PerencionContexto =
  | 'primera_instancia'   // 6 meses (default ordinario)
  | 'sumario'             // 3 meses (sumario / sumarísimo)
  | 'camara'              // 3 meses (segunda instancia)
  | 'espera_sentencia';   // No es perención — es seguimiento a 60/90 d

export interface PerencionAlert {
  matterId: string;
  matterTitle: string;
  client: string;
  responsible: string;
  expedienteId: string;
  caratula: string;
  lastMovement: string;             // ISO date
  daysInactive: number;
  /** Días hasta vencer el umbral (puede ser negativo si ya pasó). */
  daysUntilThreshold: number;
  /** Severidad de la alerta. */
  severity: 'warning' | 'critical';
  /** Contexto procesal que determina el umbral aplicado. */
  contexto: PerencionContexto;
  /** Texto legible para mostrar en la UI (ej: "Cámara · 90 días"). */
  motivo: string;
}

/** Umbrales en días por contexto. */
const UMBRAL_DIAS: Record<PerencionContexto, { warning: number; critical: number }> = {
  primera_instancia: { warning: 150, critical: 168 }, // 5 m / 5.5 m de 183
  sumario:           { warning: 75,  critical: 84 },  // ~2.5 m / ~2.8 m de 91
  camara:            { warning: 75,  critical: 84 },
  espera_sentencia:  { warning: 60,  critical: 90 },
};

const TOTAL_DIAS: Record<PerencionContexto, number> = {
  primera_instancia: 183,  // 6 meses
  sumario:           91,   // 3 meses
  camara:            91,
  espera_sentencia:  120,  // referencia de seguimiento, no es perención
};

const CONTEXTO_LABEL: Record<PerencionContexto, string> = {
  primera_instancia: 'Primera instancia (6 meses)',
  sumario:           'Sumario / Sumarísimo (3 meses)',
  camara:            'Cámara (3 meses)',
  espera_sentencia:  'Esperando sentencia',
};

function detectarContexto(matter: Matter, eventos: EventoExpediente[]): PerencionContexto {
  // Apelación → Cámara
  if (matter.kind === 'apelacion') return 'camara';

  // Último evento — si es autos_para_sentencia, modo espera.
  const eventosDelMatter = eventos
    .filter(e => e.matterId === matter.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimo = eventosDelMatter[0];
  if (ultimo && ultimo.tipo === 'autos_para_sentencia') return 'espera_sentencia';

  // Tipo de proceso
  if (matter.tipoProceso === 'sumario' || matter.tipoProceso === 'sumarisimo') {
    return 'sumario';
  }

  return 'primera_instancia';
}

/**
 * Calcula alertas de perención / seguimiento por inactividad.
 *
 * Para perencion (primera_instancia | sumario | camara) emite alertas
 * cuando el caso está cerca o pasó el plazo legal.
 *
 * Para espera_sentencia no es perención — emite alerta de seguimiento
 * cuando el juzgado lleva mucho sin moverse.
 */
export function calculatePerencionAlerts(
  matters: Matter[],
  expedientes: Expediente[],
  eventos: EventoExpediente[] = [],
): PerencionAlert[] {
  const now = new Date();
  const alerts: PerencionAlert[] = [];

  for (const exp of expedientes) {
    if (exp.estadoTroncal === 'Sin presentar') continue;
    if (exp.estadoTroncal === 'Paralizado') continue;

    const matter = matters.find(m => m.id === exp.matterId);
    if (!matter || matter.status === 'Cerrado' || matter.status === 'Archivado') continue;

    const contexto = detectarContexto(matter, eventos);
    const umbral = UMBRAL_DIAS[contexto];
    const total = TOTAL_DIAS[contexto];

    // El "último movimiento" es el más reciente entre estadoDesde, updatedAt
    // y la fecha del último evento del expediente.
    const eventosDelMatter = eventos
      .filter(e => e.matterId === matter.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const ultimoEvento = eventosDelMatter[0];
    const candidates = [exp.estadoDesde, exp.updatedAt, ultimoEvento?.fecha].filter(Boolean) as string[];
    const lastMovement = candidates.sort().slice(-1)[0] ?? exp.updatedAt;

    const lastDate = parseISO(lastMovement);
    const daysInactive = differenceInDays(now, lastDate);

    if (daysInactive < umbral.warning) continue;

    const daysUntilThreshold = total - daysInactive;
    const severity: 'warning' | 'critical' =
      daysInactive >= umbral.critical || daysUntilThreshold <= 15 ? 'critical' : 'warning';

    let motivo: string;
    if (contexto === 'espera_sentencia') {
      motivo = `${daysInactive} días en autos para sentencia. Considerar pronto despacho.`;
    } else {
      motivo = `${CONTEXTO_LABEL[contexto]} — ${daysInactive} días sin movimiento.`;
    }

    alerts.push({
      matterId: matter.id,
      matterTitle: matter.title,
      client: matter.client,
      responsible: matter.responsible,
      expedienteId: exp.id,
      caratula: exp.caratula,
      lastMovement,
      daysInactive,
      daysUntilThreshold,
      severity,
      contexto,
      motivo,
    });
  }

  // Críticos primero, luego por días restantes.
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return a.daysUntilThreshold - b.daysUntilThreshold;
  });
}

export const PERENCION_CONTEXTO_LABELS = CONTEXTO_LABEL;
