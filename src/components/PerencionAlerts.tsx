import React, { useMemo } from 'react';
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { Card } from './UI';
import { cn } from '../lib/utils';
import { calculatePerencionAlerts, PerencionAlert } from '../lib/perencion';
import { Matter, Expediente } from '../types';

interface PerencionAlertsProps {
  matters: Matter[];
  expedientes: Expediente[];
  onNavigateToMatter?: (matterId: string) => void;
  compact?: boolean;
}

export const PerencionAlerts: React.FC<PerencionAlertsProps> = ({
  matters,
  expedientes,
  onNavigateToMatter,
  compact = false,
}) => {
  const alerts = useMemo(
    () => calculatePerencionAlerts(matters, expedientes),
    [matters, expedientes]
  );

  if (alerts.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
          {alerts.length} expediente{alerts.length > 1 ? 's' : ''} en riesgo de perención
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-rose-600" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600">
          Alerta de Perención
        </h3>
        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {alerts.map(alert => (
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
              </div>
              <div className="text-right shrink-0">
                <div className={cn(
                  'text-xs font-black',
                  alert.severity === 'critical' ? 'text-rose-600' : 'text-amber-600',
                )}>
                  {alert.daysUntilPerencion > 0
                    ? `${alert.daysUntilPerencion} días`
                    : 'VENCIDO'
                  }
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  {alert.monthsInactive} meses sin mov.
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
  );
};
