import React, { useMemo } from 'react';
import { AlertTriangle, Clock, ExternalLink, Hourglass } from 'lucide-react';
import { Card } from './UI';
import { cn } from '../lib/utils';
import { calculatePerencionAlerts, PERENCION_CONTEXTO_LABELS } from '../lib/perencion';
import { Matter, Expediente, EventoExpediente } from '../types';

interface PerencionAlertsProps {
  matters: Matter[];
  expedientes: Expediente[];
  eventos?: EventoExpediente[];
  onNavigateToMatter?: (matterId: string) => void;
  compact?: boolean;
}

export const PerencionAlerts: React.FC<PerencionAlertsProps> = ({
  matters,
  expedientes,
  eventos = [],
  onNavigateToMatter,
  compact = false,
}) => {
  const alerts = useMemo(
    () => calculatePerencionAlerts(matters, expedientes, eventos),
    [matters, expedientes, eventos],
  );

  if (alerts.length === 0) return null;

  // GAP 29 — separamos alertas reales de perención del seguimiento "espera de
  // sentencia" (que NO es perención sino aviso de juzgado lento).
  const perencionReal = alerts.filter(a => a.contexto !== 'espera_sentencia');
  const esperaSentencia = alerts.filter(a => a.contexto === 'espera_sentencia');

  if (compact) {
    const total = perencionReal.length + esperaSentencia.length;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {perencionReal.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              {perencionReal.length} expediente{perencionReal.length > 1 ? 's' : ''} en riesgo de perención
            </span>
          </div>
        )}
        {esperaSentencia.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
            <Hourglass size={14} className="text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
              {esperaSentencia.length} caso{esperaSentencia.length > 1 ? 's' : ''} esperando sentencia
            </span>
          </div>
        )}
        {total === 0 && null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {perencionReal.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600">
              Alerta de Perención
            </h3>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600">
              {perencionReal.length}
            </span>
          </div>

          <div className="space-y-2">
            {perencionReal.map(alert => (
              <Card
                key={alert.expedienteId}
                className={cn(
                  'p-4 border-l-4 cursor-pointer hover:bg-muted/30 transition-all',
                  alert.severity === 'critical'
                    ? 'border-l-rose-600 bg-rose-500/5'
                    : 'border-l-amber-500 bg-amber-500/5',
                )}
                onClick={() => onNavigateToMatter?.(alert.matterId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{alert.caratula}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      {alert.client} · {alert.responsible}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground/80 mt-1">
                      {PERENCION_CONTEXTO_LABELS[alert.contexto]}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      'text-xs font-black',
                      alert.severity === 'critical' ? 'text-rose-600' : 'text-amber-600',
                    )}>
                      {alert.daysUntilThreshold > 0
                        ? `${alert.daysUntilThreshold} días`
                        : 'VENCIDO'}
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      {alert.daysInactive} días inactivo
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  <span>Último movimiento: {new Date(alert.lastMovement).toLocaleDateString('es-AR')}</span>
                  <ExternalLink size={10} className="ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {esperaSentencia.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Hourglass size={16} className="text-sky-600" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-600">
              Esperando sentencia
            </h3>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-sky-500/10 text-sky-600">
              {esperaSentencia.length}
            </span>
          </div>

          <div className="space-y-2">
            {esperaSentencia.map(alert => (
              <Card
                key={alert.expedienteId}
                className={cn(
                  'p-4 border-l-4 cursor-pointer hover:bg-muted/30 transition-all',
                  alert.severity === 'critical'
                    ? 'border-l-sky-600 bg-sky-500/5'
                    : 'border-l-sky-400 bg-sky-500/5',
                )}
                onClick={() => onNavigateToMatter?.(alert.matterId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{alert.caratula}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                      {alert.client} · {alert.responsible}
                    </p>
                    <p className="text-[11px] text-foreground/80 mt-1">
                      {alert.motivo}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-sky-600">
                      {alert.daysInactive} días
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      en autos para sentencia
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  <span>Autos para sentencia: {new Date(alert.lastMovement).toLocaleDateString('es-AR')}</span>
                  <ExternalLink size={10} className="ml-auto" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
