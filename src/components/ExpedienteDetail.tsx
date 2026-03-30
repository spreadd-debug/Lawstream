import React, { useState } from 'react';
import { Badge, Button } from './UI';
import { Expediente, EstadoTroncal, ExpedienteEstadoLog } from '../types';
import { cambiarEstadoExpediente } from '../lib/db';
import { ESTADOS_TRONCALES, SUBESTADOS, ESTADO_COLORS } from '../data/juzgados';
import { Scale, Building2, Hash, Calendar, Clock, ChevronDown, Check, Edit } from 'lucide-react';
import { format, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface ExpedienteDetailProps {
  expediente: Expediente;
  currentUser?: string;
  onUpdated: (updated: Expediente) => void;
  onEdit: () => void;
}

const CambiarEstadoModal: React.FC<{
  expedienteId: string;
  currentEstado: EstadoTroncal;
  currentUser?: string;
  onClose: () => void;
  onChanged: (nuevoEstado: EstadoTroncal, subestado?: string) => void;
}> = ({ expedienteId, currentEstado, currentUser, onClose, onChanged }) => {
  const [estado, setEstado] = useState<EstadoTroncal>(currentEstado);
  const [subestado, setSubestado] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);

  const subestadosList = SUBESTADOS[estado] ?? [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await cambiarEstadoExpediente(expedienteId, estado, subestado || undefined, observaciones || undefined, currentUser);
      onChanged(estado, subestado || undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-black text-lg">Cambiar Estado Procesal</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Estado troncal</label>
            <select
              value={estado}
              onChange={e => { setEstado(e.target.value as EstadoTroncal); setSubestado(''); }}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
            >
              {ESTADOS_TRONCALES.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {subestadosList.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Subestado</label>
              <select
                value={subestado}
                onChange={e => setSubestado(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
              >
                <option value="">— Sin subestado —</option>
                {subestadosList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1 block">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: Se notificó al cliente. Proveído del 28/03."
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none h-20"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="ghost" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Guardando...' : 'Confirmar cambio'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const ExpedienteDetail: React.FC<ExpedienteDetailProps> = ({ expediente, currentUser, onUpdated, onEdit }) => {
  const [showCambiarEstado, setShowCambiarEstado] = useState(false);
  const [showFullLog, setShowFullLog] = useState(false);

  const diasEnEstado = differenceInDays(new Date(), parseISO(expediente.estadoDesde));
  const estadoColor = ESTADO_COLORS[expediente.estadoTroncal];
  const log = expediente.estadosLog ?? [];

  const handleEstadoChanged = (nuevoEstado: EstadoTroncal, subestado?: string) => {
    const now = new Date().toISOString();
    onUpdated({
      ...expediente,
      estadoTroncal: nuevoEstado,
      subestado,
      estadoDesde: now,
    });
  };

  return (
    <div className="space-y-5">
      {/* Estado actual */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide', estadoColor)}>
              {expediente.estadoTroncal}
            </span>
            {expediente.subestado && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-muted text-muted-foreground border border-border">
                {expediente.subestado}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <Clock size={11} className="inline mr-1" />
            Hace {diasEnEstado === 0 ? 'menos de un día' : `${diasEnEstado} día${diasEnEstado !== 1 ? 's' : ''}`} en este estado
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit size={13} className="mr-1" /> Editar
          </Button>
          <Button size="sm" onClick={() => setShowCambiarEstado(true)}>
            Cambiar estado
          </Button>
        </div>
      </div>

      {/* Datos identificatorios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-muted/30 rounded-xl border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Carátula</p>
          <p className="text-sm font-bold leading-tight">{expediente.caratula}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl border border-border">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fuero / Juzgado</p>
          <p className="text-sm font-bold">{expediente.fuero}</p>
          {expediente.juzgado && <p className="text-xs text-muted-foreground mt-0.5">{expediente.juzgado}</p>}
        </div>
        {(expediente.nroReceptoria || expediente.nroJuzgado) && (
          <div className="p-3 bg-muted/30 rounded-xl border border-border sm:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Números de Expediente</p>
            <div className="flex gap-6">
              {expediente.nroReceptoria && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Receptoría</p>
                  <p className="text-sm font-black font-mono">{expediente.nroReceptoria}</p>
                </div>
              )}
              {expediente.nroJuzgado && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Juzgado</p>
                  <p className="text-sm font-black font-mono">{expediente.nroJuzgado}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MEV */}
      <div className={cn(
        'p-3 rounded-xl border',
        expediente.mevPresentado
          ? 'bg-blue-50 border-blue-200'
          : 'bg-muted/20 border-border'
      )}>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Mesa de Entrada Virtual</p>
        {expediente.mevPresentado ? (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold">
              <Check size={14} /> Presentado
            </div>
            {expediente.mevFecha && (
              <span className="text-blue-600 text-xs">
                {format(parseISO(expediente.mevFecha), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            )}
            {expediente.mevToken && (
              <span className="text-xs text-blue-500 font-mono bg-blue-100 px-2 py-0.5 rounded">
                Token: {expediente.mevToken}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No presentado en MEV aún</p>
        )}
      </div>

      {/* Timeline de estados */}
      {log.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowFullLog(!showFullLog)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown size={14} className={cn('transition-transform', showFullLog && 'rotate-180')} />
            Historial de estados ({log.length})
          </button>

          {showFullLog && (
            <div className="space-y-2 pl-3 border-l-2 border-border">
              {log.map((entry, i) => {
                const isActual = !entry.fechaHasta;
                const duracion = entry.fechaHasta
                  ? differenceInDays(parseISO(entry.fechaHasta), parseISO(entry.fechaDesde))
                  : null;

                return (
                  <div key={entry.id} className={cn(
                    'p-3 rounded-xl border text-sm',
                    isActual ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-border'
                  )}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide',
                          ESTADO_COLORS[entry.estadoTroncal]
                        )}>
                          {entry.estadoTroncal}
                        </span>
                        {entry.subestado && (
                          <span className="text-xs text-muted-foreground font-bold">· {entry.subestado}</span>
                        )}
                        {isActual && <span className="text-[10px] text-primary font-black uppercase">Actual</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(entry.fechaDesde), "d MMM yyyy", { locale: es })}
                        {duracion !== null && ` · ${duracion}d`}
                      </div>
                    </div>
                    {entry.observaciones && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic">{entry.observaciones}</p>
                    )}
                    {entry.registradoPor && (
                      <p className="text-[10px] text-muted-foreground mt-1">Por: {entry.registradoPor}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCambiarEstado && (
        <CambiarEstadoModal
          expedienteId={expediente.id}
          currentEstado={expediente.estadoTroncal}
          currentUser={currentUser}
          onClose={() => setShowCambiarEstado(false)}
          onChanged={handleEstadoChanged}
        />
      )}
    </div>
  );
};
