import React, { useMemo, useState } from 'react';
import { Card, Button, Badge } from './UI';
import { useAppContext } from '../lib/AppContext';
import { EventoForm } from './EventoForm';
import { labelDeTipoEvento, urgenciaDePlazo, diasRestantes } from '../lib/plazos';
import type { EventoExpediente, Matter, Plazo } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Clock, Calendar, CheckCircle2, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TimelinePanelProps {
  matter: Matter;
}

const URGENCIA_STYLES: Record<ReturnType<typeof urgenciaDePlazo>, { badge: string; border: string }> = {
  vencido:  { badge: 'bg-destructive/15 text-destructive',      border: 'border-destructive/40' },
  critico:  { badge: 'bg-red-500/15 text-red-600',              border: 'border-red-400/40' },
  proximo:  { badge: 'bg-amber-500/15 text-amber-600',          border: 'border-amber-400/40' },
  normal:   { badge: 'bg-muted text-muted-foreground',          border: 'border-border/60' },
};

const ESTADO_PLAZO_META: Record<Plazo['estado'], { label: string; className: string }> = {
  activo:    { label: 'Activo',    className: 'bg-primary/15 text-primary' },
  cumplido:  { label: 'Cumplido',  className: 'bg-emerald-500/15 text-emerald-600' },
  vencido:   { label: 'Vencido',   className: 'bg-destructive/15 text-destructive' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground line-through' },
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ matter }) => {
  const { eventos, plazos, handleCumplirPlazo, handleCancelarPlazo, handleDeleteEvento } = useAppContext();
  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);

  const matterEventos = useMemo(
    () => eventos
      .filter(e => e.matterId === matter.id)
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [eventos, matter.id],
  );

  const matterPlazos = useMemo(
    () => plazos.filter(p => p.matterId === matter.id),
    [plazos, matter.id],
  );

  const plazosPorEvento = useMemo(() => {
    const map = new Map<string, Plazo[]>();
    for (const p of matterPlazos) {
      if (!p.eventoOrigenId) continue;
      const arr = map.get(p.eventoOrigenId) || [];
      arr.push(p);
      map.set(p.eventoOrigenId, arr);
    }
    return map;
  }, [matterPlazos]);

  const plazosSueltos = useMemo(
    () => matterPlazos.filter(p => !p.eventoOrigenId && p.estado === 'activo'),
    [matterPlazos],
  );

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-black uppercase tracking-widest text-foreground">Timeline del expediente</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Movimientos registrados y plazos procesales derivados
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsEventoFormOpen(true)}>
          <Plus size={14} className="mr-1.5" />
          Registrar evento
        </Button>
      </div>

      {plazosSueltos.length > 0 && (
        <section>
          <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">Plazos manuales activos</h4>
          <div className="grid gap-2">
            {plazosSueltos.map(p => (
              <PlazoRow
                key={p.id}
                plazo={p}
                onCumplir={() => handleCumplirPlazo(p.id)}
                onCancelar={() => handleCancelarPlazo(p.id)}
              />
            ))}
          </div>
        </section>
      )}

      {matterEventos.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Clock size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Sin eventos registrados</p>
          <p className="text-xs text-muted-foreground mt-1">
            Registrá el primer movimiento del expediente y Lawstream calculará los plazos automáticamente.
          </p>
        </Card>
      ) : (
        <ol className="relative space-y-4 pl-6 border-l-2 border-border/60">
          {matterEventos.map(ev => (
            <EventoRow
              key={ev.id}
              evento={ev}
              plazos={plazosPorEvento.get(ev.id) || []}
              onDelete={() => handleDeleteEvento(ev.id)}
              onCumplirPlazo={(id) => handleCumplirPlazo(id)}
              onCancelarPlazo={(id) => handleCancelarPlazo(id)}
            />
          ))}
        </ol>
      )}

      <EventoForm
        isOpen={isEventoFormOpen}
        onClose={() => setIsEventoFormOpen(false)}
        matterId={matter.id}
      />
    </div>
  );
};

const EventoRow: React.FC<{
  evento: EventoExpediente;
  plazos: Plazo[];
  onDelete: () => void;
  onCumplirPlazo: (id: string) => void;
  onCancelarPlazo: (id: string) => void;
}> = ({ evento, plazos, onDelete, onCumplirPlazo, onCancelarPlazo }) => {
  const fechaLabel = (() => {
    try { return format(parseISO(evento.fecha), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return evento.fecha; }
  })();

  return (
    <li className="relative">
      <span className="absolute -left-[30px] top-2 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <Calendar size={11} />
              <span>{fechaLabel}</span>
              <Badge variant="default">{labelDeTipoEvento(evento.tipo)}</Badge>
              {evento.jurisdiccion && (
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70">
                  {evento.jurisdiccion}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-foreground mt-1">{evento.titulo}</h4>
            {evento.descripcion && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{evento.descripcion}</p>
            )}
          </div>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
            title="Eliminar evento"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {plazos.length > 0 && (
          <div className="pt-3 border-t border-border/60 space-y-2">
            {plazos.map(p => (
              <PlazoRow
                key={p.id}
                plazo={p}
                onCumplir={() => onCumplirPlazo(p.id)}
                onCancelar={() => onCancelarPlazo(p.id)}
                compact
              />
            ))}
          </div>
        )}
      </Card>
    </li>
  );
};

const PlazoRow: React.FC<{
  plazo: Plazo;
  onCumplir: () => void;
  onCancelar: () => void;
  compact?: boolean;
}> = ({ plazo, onCumplir, onCancelar, compact }) => {
  const urg = urgenciaDePlazo(plazo);
  const restantes = diasRestantes(plazo.fechaVencimiento);
  const estado = ESTADO_PLAZO_META[plazo.estado];
  const styles = URGENCIA_STYLES[urg];

  const fechaLabel = (() => {
    try { return format(parseISO(plazo.fechaVencimiento), "d MMM yyyy", { locale: es }); }
    catch { return plazo.fechaVencimiento; }
  })();

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap',
        compact ? 'bg-muted/30' : 'bg-card',
        styles.border,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {urg === 'vencido' || urg === 'critico' ? (
          <AlertTriangle size={14} className="text-destructive shrink-0" />
        ) : (
          <Clock size={14} className="text-primary shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground truncate">{plazo.tipo}</span>
            <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', estado.className)}>
              {estado.label}
            </span>
            {plazo.estado === 'activo' && (
              <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', styles.badge)}>
                {urg === 'vencido'
                  ? `Vencido hace ${Math.abs(restantes)}d`
                  : restantes === 0
                    ? 'Vence hoy'
                    : `${restantes}d restantes`}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Vence {fechaLabel} · {plazo.dias} días {plazo.diasHabiles ? 'hábiles' : 'corridos'} · {plazo.jurisdiccion}
          </div>
          {plazo.descripcion && (
            <div className="text-[10px] text-muted-foreground/80 mt-0.5 italic">{plazo.descripcion}</div>
          )}
        </div>
      </div>

      {plazo.estado === 'activo' && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onCumplir}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg transition-all"
            title="Marcar cumplido"
          >
            <CheckCircle2 size={12} />
            Cumplido
          </button>
          <button
            onClick={onCancelar}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted px-2.5 py-1.5 rounded-lg transition-all"
            title="Cancelar plazo"
          >
            <XCircle size={12} />
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};

export default TimelinePanel;
