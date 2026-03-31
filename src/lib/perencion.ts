/**
 * Alerta de perención de instancia — Lawstream
 *
 * Si un expediente no tiene movimiento por 6 meses (primera instancia),
 * se extingue el proceso. Lawstream genera alerta a los 5 meses.
 */

import { Matter, Expediente } from '../types';
import { differenceInMonths, differenceInDays, parseISO } from 'date-fns';

export interface PerencionAlert {
  matterId: string;
  matterTitle: string;
  client: string;
  responsible: string;
  expedienteId: string;
  caratula: string;
  lastMovement: string; // ISO date
  monthsInactive: number;
  daysUntilPerencion: number;
  severity: 'warning' | 'critical'; // warning = 5 meses, critical = 5.5+
}

/**
 * Calcula alertas de perención para todos los expedientes activos.
 * Retorna solo aquellos con 5+ meses sin movimiento.
 */
export function calculatePerencionAlerts(
  matters: Matter[],
  expedientes: Expediente[],
): PerencionAlert[] {
  const now = new Date();
  const alerts: PerencionAlert[] = [];

  for (const exp of expedientes) {
    // Solo expedientes activos (no cerrados ni sin presentar)
    if (exp.estadoTroncal === 'Sin presentar') continue;
    if (exp.estadoTroncal === 'Paralizado') continue; // ya está paralizado, otra alerta

    const matter = matters.find(m => m.id === exp.matterId);
    if (!matter || matter.status === 'Cerrado') continue;

    // Fecha del último movimiento: el más reciente entre estadoDesde y updatedAt
    const lastMovement = exp.estadoDesde || exp.updatedAt;
    const lastDate = parseISO(lastMovement);
    const months = differenceInMonths(now, lastDate);

    if (months >= 5) {
      // 6 meses = 183 días aprox
      const totalDaysInactive = differenceInDays(now, lastDate);
      const daysUntilPerencion = Math.max(0, 183 - totalDaysInactive);

      alerts.push({
        matterId: matter.id,
        matterTitle: matter.title,
        client: matter.client,
        responsible: matter.responsible,
        expedienteId: exp.id,
        caratula: exp.caratula,
        lastMovement,
        monthsInactive: months,
        daysUntilPerencion,
        severity: months >= 5.5 || daysUntilPerencion <= 15 ? 'critical' : 'warning',
      });
    }
  }

  return alerts.sort((a, b) => a.daysUntilPerencion - b.daysUntilPerencion);
}
