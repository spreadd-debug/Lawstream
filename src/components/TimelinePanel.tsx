import React, { useMemo, useState } from 'react';
import { Card, Button, Badge, Modal, Input, Label, Textarea } from './UI';
import { useAppContext } from '../lib/AppContext';
import { EventoForm } from './EventoForm';
import { labelDeTipoEvento, urgenciaDePlazo, diasRestantes } from '../lib/plazos';
import type { EventoExpediente, Matter, Plazo, HiloPrueba } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Clock, Calendar, CheckCircle2, XCircle, AlertTriangle, Trash2, Layers, PauseCircle, PlayCircle, Users, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

// Paleta estable para diferenciar hilos en el timeline. Cada hilo recibe
// siempre el mismo color (basado en hash del id), así un mismo hilo se
// reconoce visualmente entre eventos. Las clases se incluyen literales
// para que el JIT de Tailwind las recoja en build.
const HILO_COLORS: Array<{ dot: string; ring: string; text: string; bg: string; border: string }> = [
  { dot: 'bg-violet-500',  ring: 'ring-violet-500/30',  text: 'text-violet-700',  bg: 'bg-violet-500/10',  border: 'border-l-violet-500' },
  { dot: 'bg-blue-500',    ring: 'ring-blue-500/30',    text: 'text-blue-700',    bg: 'bg-blue-500/10',    border: 'border-l-blue-500' },
  { dot: 'bg-teal-500',    ring: 'ring-teal-500/30',    text: 'text-teal-700',    bg: 'bg-teal-500/10',    border: 'border-l-teal-500' },
  { dot: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-700', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
  { dot: 'bg-amber-500',   ring: 'ring-amber-500/30',   text: 'text-amber-700',   bg: 'bg-amber-500/10',   border: 'border-l-amber-500' },
  { dot: 'bg-rose-500',    ring: 'ring-rose-500/30',    text: 'text-rose-700',    bg: 'bg-rose-500/10',    border: 'border-l-rose-500' },
  { dot: 'bg-pink-500',    ring: 'ring-pink-500/30',    text: 'text-pink-700',    bg: 'bg-pink-500/10',    border: 'border-l-pink-500' },
  { dot: 'bg-sky-500',     ring: 'ring-sky-500/30',     text: 'text-sky-700',     bg: 'bg-sky-500/10',     border: 'border-l-sky-500' },
];

function colorForHilo(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return HILO_COLORS[Math.abs(hash) % HILO_COLORS.length];
}

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
  activo:     { label: 'Activo',     className: 'bg-primary/15 text-primary' },
  suspendido: { label: 'Suspendido', className: 'bg-amber-500/15 text-amber-700' },
  cumplido:   { label: 'Cumplido',   className: 'bg-emerald-500/15 text-emerald-600' },
  vencido:    { label: 'Vencido',    className: 'bg-destructive/15 text-destructive' },
  cancelado:  { label: 'Cancelado',  className: 'bg-muted text-muted-foreground line-through' },
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ matter }) => {
  const { eventos, plazos, hilos, handleCumplirPlazo, handleCancelarPlazo, handleSuspenderPlazo, handleReanudarPlazo, handleActualizarUltimaNotificacion, handleDeleteEvento } = useAppContext();
  const [isEventoFormOpen, setIsEventoFormOpen] = useState(false);
  // Filtro por hilo: 'all' (todos), 'sin' (sin hilo) o el id de un hilo concreto.
  const [filtroHilo, setFiltroHilo] = useState<string>('all');

  const matterHilos = useMemo(
    () => hilos.filter(h => h.matterId === matter.id),
    [hilos, matter.id],
  );

  const matterEventos = useMemo(
    () => eventos
      .filter(e => e.matterId === matter.id)
      .slice()
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [eventos, matter.id],
  );

  // Eventos visibles según el filtro de hilo activo.
  const eventosVisibles = useMemo(() => {
    if (filtroHilo === 'all') return matterEventos;
    if (filtroHilo === 'sin') return matterEventos.filter(e => !e.hiloId);
    return matterEventos.filter(e => e.hiloId === filtroHilo);
  }, [matterEventos, filtroHilo]);

  // Conteo de eventos por hilo para mostrarlo en los chips.
  const conteoPorHilo = useMemo(() => {
    const map: Record<string, number> = { sin: 0 };
    for (const e of matterEventos) {
      if (e.hiloId) map[e.hiloId] = (map[e.hiloId] ?? 0) + 1;
      else map.sin += 1;
    }
    return map;
  }, [matterEventos]);

  const hilosById = useMemo(() => {
    const map = new Map<string, HiloPrueba>();
    for (const h of matterHilos) map.set(h.id, h);
    return map;
  }, [matterHilos]);

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
    () => matterPlazos.filter(p => !p.eventoOrigenId && (p.estado === 'activo' || p.estado === 'suspendido')),
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
                onSuspender={(motivo, fecha) => handleSuspenderPlazo(p.id, motivo, fecha)}
                onReanudar={(fecha) => handleReanudarPlazo(p.id, fecha)}
                onNuevaNotificacion={(fecha) => handleActualizarUltimaNotificacion(p.id, fecha)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Filtro por hilo — solo se muestra si hay al menos un hilo cargado. */}
      {matterHilos.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
            <Layers size={11} />
            Filtrar por hilo
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FiltroChip
              activo={filtroHilo === 'all'}
              onClick={() => setFiltroHilo('all')}
              label={`Todos (${matterEventos.length})`}
            />
            {conteoPorHilo.sin > 0 && (
              <FiltroChip
                activo={filtroHilo === 'sin'}
                onClick={() => setFiltroHilo('sin')}
                label={`Sin hilo (${conteoPorHilo.sin})`}
              />
            )}
            {matterHilos.map(h => {
              const c = colorForHilo(h.id);
              const count = conteoPorHilo[h.id] ?? 0;
              return (
                <FiltroChip
                  key={h.id}
                  activo={filtroHilo === h.id}
                  onClick={() => setFiltroHilo(h.id)}
                  label={`${h.nombre} (${count})`}
                  dotClass={c.dot}
                  activeBgClass={c.bg}
                  activeTextClass={c.text}
                />
              );
            })}
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
      ) : eventosVisibles.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-muted-foreground">No hay eventos que coincidan con este filtro.</p>
          <button
            onClick={() => setFiltroHilo('all')}
            className="text-[11px] font-bold text-primary hover:underline mt-2"
          >
            Mostrar todos
          </button>
        </Card>
      ) : (
        <ol className="relative space-y-4 pl-6 border-l-2 border-border/60">
          {eventosVisibles.map(ev => (
            <EventoRow
              key={ev.id}
              evento={ev}
              hilo={ev.hiloId ? hilosById.get(ev.hiloId) : undefined}
              plazos={plazosPorEvento.get(ev.id) || []}
              onDelete={() => handleDeleteEvento(ev.id)}
              onCumplirPlazo={(id) => handleCumplirPlazo(id)}
              onCancelarPlazo={(id) => handleCancelarPlazo(id)}
              onSuspenderPlazo={(id, motivo, fecha) => handleSuspenderPlazo(id, motivo, fecha)}
              onReanudarPlazo={(id, fecha) => handleReanudarPlazo(id, fecha)}
              onNuevaNotificacionPlazo={(id, fecha) => handleActualizarUltimaNotificacion(id, fecha)}
              onClickHilo={(id) => setFiltroHilo(id)}
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
  hilo?: HiloPrueba;
  plazos: Plazo[];
  onDelete: () => void;
  onCumplirPlazo: (id: string) => void;
  onCancelarPlazo: (id: string) => void;
  onSuspenderPlazo: (id: string, motivo: string, fecha: string) => void;
  onReanudarPlazo: (id: string, fecha: string) => void;
  onNuevaNotificacionPlazo: (id: string, fecha: string) => void;
  onClickHilo: (id: string) => void;
}> = ({ evento, hilo, plazos, onDelete, onCumplirPlazo, onCancelarPlazo, onSuspenderPlazo, onReanudarPlazo, onNuevaNotificacionPlazo, onClickHilo }) => {
  const fechaLabel = (() => {
    try { return format(parseISO(evento.fecha), "d 'de' MMMM yyyy", { locale: es }); }
    catch { return evento.fecha; }
  })();

  const hiloColor = hilo ? colorForHilo(hilo.id) : null;

  return (
    <li className="relative">
      <span
        className={cn(
          'absolute -left-[30px] top-2 w-3 h-3 rounded-full ring-4 ring-card',
          hiloColor ? hiloColor.dot : 'bg-primary',
        )}
      />
      <Card
        className={cn(
          'p-4 space-y-3',
          hiloColor && `border-l-4 ${hiloColor.border}`,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex-wrap">
              <Calendar size={11} />
              <span>{fechaLabel}</span>
              <Badge variant="default">{labelDeTipoEvento(evento.tipo)}</Badge>
              {evento.jurisdiccion && (
                <span className="text-[9px] font-bold uppercase text-muted-foreground/70">
                  {evento.jurisdiccion}
                </span>
              )}
              {hilo && hiloColor && (
                <button
                  onClick={() => onClickHilo(hilo.id)}
                  title={`Filtrar timeline por hilo "${hilo.nombre}"`}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-80',
                    hiloColor.bg,
                    hiloColor.text,
                  )}
                >
                  <Layers size={9} />
                  {hilo.nombre}
                </button>
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
                onSuspender={(motivo, fecha) => onSuspenderPlazo(p.id, motivo, fecha)}
                onReanudar={(fecha) => onReanudarPlazo(p.id, fecha)}
                onNuevaNotificacion={(fecha) => onNuevaNotificacionPlazo(p.id, fecha)}
                compact
              />
            ))}
          </div>
        )}
      </Card>
    </li>
  );
};

// Chip de filtro reutilizable. Si recibe `dotClass` muestra un punto de color
// a la izquierda del label (para los chips de hilo, no para "Todos" / "Sin hilo").
const FiltroChip: React.FC<{
  activo: boolean;
  onClick: () => void;
  label: string;
  dotClass?: string;
  activeBgClass?: string;
  activeTextClass?: string;
}> = ({ activo, onClick, label, dotClass, activeBgClass, activeTextClass }) => (
  <button
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all',
      activo
        ? cn(
            'border-transparent shadow-sm',
            activeBgClass ?? 'bg-primary/10',
            activeTextClass ?? 'text-primary',
          )
        : 'border-border/50 bg-card/50 text-muted-foreground hover:border-border hover:text-foreground',
    )}
  >
    {dotClass && <span className={cn('w-2 h-2 rounded-full', dotClass)} />}
    {label}
  </button>
);

const PlazoRow: React.FC<{
  plazo: Plazo;
  onCumplir: () => void;
  onCancelar: () => void;
  onSuspender: (motivo: string, fecha: string) => void;
  onReanudar: (fecha: string) => void;
  onNuevaNotificacion: (fecha: string) => void;
  compact?: boolean;
}> = ({ plazo, onCumplir, onCancelar, onSuspender, onReanudar, onNuevaNotificacion, compact }) => {
  const urg = urgenciaDePlazo(plazo);
  const restantes = diasRestantes(plazo.fechaVencimiento);
  const estado = ESTADO_PLAZO_META[plazo.estado];
  const styles = URGENCIA_STYLES[urg];
  const [suspenderOpen, setSuspenderOpen] = useState(false);
  const [reanudarOpen, setReanudarOpen]   = useState(false);
  const [nuevaNotifOpen, setNuevaNotifOpen] = useState(false);
  const isComun = plazo.tipoPlazo === 'comun';

  const fechaLabel = (() => {
    try { return format(parseISO(plazo.fechaVencimiento), "d MMM yyyy", { locale: es }); }
    catch { return plazo.fechaVencimiento; }
  })();

  const isSuspendido = plazo.estado === 'suspendido';
  // Cuando está suspendido, NO mostramos el badge de urgencia (no corre el plazo)
  // y forzamos el border al amber.
  const borderClass = isSuspendido ? 'border-amber-500/40' : styles.border;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap',
        compact ? 'bg-muted/30' : 'bg-card',
        borderClass,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isSuspendido ? (
          <PauseCircle size={14} className="text-amber-600 shrink-0" />
        ) : urg === 'vencido' || urg === 'critico' ? (
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
            {isSuspendido && plazo.diasTranscurridosAlSuspender !== undefined && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700">
                {plazo.diasTranscurridosAlSuspender}/{plazo.dias}d transcurridos
              </span>
            )}
            {isComun && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-700"
                title="Plazo común — corre desde la última notificación entre las partes"
              >
                <Users size={9} />
                Común
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {isSuspendido
              ? <>Pausado desde {plazo.suspendidoDesde} · {plazo.dias} días {plazo.diasHabiles ? 'hábiles' : 'corridos'} · {plazo.jurisdiccion}</>
              : <>Vence {fechaLabel} · {plazo.dias} días {plazo.diasHabiles ? 'hábiles' : 'corridos'} · {plazo.jurisdiccion}</>
            }
          </div>
          {plazo.descripcion && (
            <div className="text-[10px] text-muted-foreground/80 mt-0.5 italic">{plazo.descripcion}</div>
          )}
          {isSuspendido && plazo.motivoSuspension && (
            <div className="text-[10px] text-amber-700 mt-0.5">
              <strong>Motivo:</strong> {plazo.motivoSuspension}
            </div>
          )}
          {isComun && plazo.fechaUltimaNotificacion && (
            <div className="text-[10px] text-violet-700 mt-0.5">
              <strong>Última notificación:</strong> {plazo.fechaUltimaNotificacion}
            </div>
          )}
        </div>
      </div>

      {plazo.estado === 'activo' && (
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          <button
            onClick={onCumplir}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg transition-all"
            title="Marcar cumplido"
          >
            <CheckCircle2 size={12} />
            Cumplido
          </button>
          {isComun && (
            <button
              onClick={() => setNuevaNotifOpen(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700 hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg transition-all"
              title="Registrar nueva notificación (recalcula vencimiento)"
            >
              <Bell size={12} />
              Nueva notif.
            </button>
          )}
          <button
            onClick={() => setSuspenderOpen(true)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-lg transition-all"
            title="Suspender plazo"
          >
            <PauseCircle size={12} />
            Suspender
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

      {isSuspendido && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setReanudarOpen(true)}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-2.5 py-1.5 rounded-lg transition-all"
            title="Reanudar plazo"
          >
            <PlayCircle size={12} />
            Reanudar
          </button>
        </div>
      )}

      <SuspenderModal
        isOpen={suspenderOpen}
        onClose={() => setSuspenderOpen(false)}
        plazo={plazo}
        onConfirm={(motivo, fecha) => { onSuspender(motivo, fecha); setSuspenderOpen(false); }}
      />
      <ReanudarModal
        isOpen={reanudarOpen}
        onClose={() => setReanudarOpen(false)}
        plazo={plazo}
        onConfirm={(fecha) => { onReanudar(fecha); setReanudarOpen(false); }}
      />
      <NuevaNotificacionModal
        isOpen={nuevaNotifOpen}
        onClose={() => setNuevaNotifOpen(false)}
        plazo={plazo}
        onConfirm={(fecha) => { onNuevaNotificacion(fecha); setNuevaNotifOpen(false); }}
      />
    </div>
  );
};

// ─── Modales de suspender / reanudar ────────────────────────────

const SuspenderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plazo: Plazo;
  onConfirm: (motivo: string, fecha: string) => void;
}> = ({ isOpen, onClose, plazo, onConfirm }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha]   = useState(today);

  React.useEffect(() => {
    if (!isOpen) return;
    setMotivo('');
    setFecha(today);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Suspender plazo"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(motivo, fecha)}>Suspender</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Pausa el plazo <strong className="text-foreground">"{plazo.tipo}"</strong> de {plazo.dias} días.
          Lawstream calcula los días hábiles ya transcurridos y los preserva
          para reanudar correctamente más adelante.
        </p>
        <div>
          <Label>Fecha de suspensión</Label>
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">
            Día desde el cual el plazo deja de correr. Por defecto, hoy.
          </p>
        </div>
        <div>
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: licencia médica del perito · feria extraordinaria · acuerdo de partes…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
};

const ReanudarModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plazo: Plazo;
  onConfirm: (fecha: string) => void;
}> = ({ isOpen, onClose, plazo, onConfirm }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [fecha, setFecha] = useState(today);
  const transcurridos = plazo.diasTranscurridosAlSuspender ?? 0;
  const restantes = Math.max(0, plazo.dias - transcurridos);

  React.useEffect(() => {
    if (!isOpen) return;
    setFecha(today);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reanudar plazo"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(fecha)}>Reanudar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Reanuda el plazo <strong className="text-foreground">"{plazo.tipo}"</strong>.
          Quedan <strong className="text-foreground">{restantes} día{restantes === 1 ? '' : 's'} hábil{restantes === 1 ? '' : 'es'}</strong>
          {' '}por correr ({transcurridos}/{plazo.dias} ya transcurridos antes de la suspensión).
          Lawstream calculará la nueva fecha de vencimiento desde la fecha que indiques.
        </p>
        <div>
          <Label>Fecha de reanudación</Label>
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">
            Día desde el cual vuelve a correr el plazo. Por defecto, hoy.
          </p>
        </div>
      </div>
    </Modal>
  );
};

const NuevaNotificacionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  plazo: Plazo;
  onConfirm: (fecha: string) => void;
}> = ({ isOpen, onClose, plazo, onConfirm }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [fecha, setFecha] = useState(plazo.fechaUltimaNotificacion ?? plazo.fechaInicio);

  React.useEffect(() => {
    if (!isOpen) return;
    setFecha(plazo.fechaUltimaNotificacion ?? plazo.fechaInicio);
  }, [isOpen, plazo.fechaUltimaNotificacion, plazo.fechaInicio]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva notificación (plazo común)"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onConfirm(fecha)}>Recalcular</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          El plazo <strong className="text-foreground">"{plazo.tipo}"</strong> es de tipo <strong>común</strong>:
          corre desde la <strong>última notificación</strong> entre las partes.
          Si entró una notificación posterior, registrala acá y Lawstream
          recalcula el vencimiento desde esa fecha (con los {plazo.dias} días
          {plazo.diasHabiles ? ' hábiles' : ' corridos'} originales).
        </p>
        <div>
          <Label>Fecha de la última notificación</Label>
          <Input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            max={today}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Vencimiento actual: <strong className="text-foreground">{plazo.fechaVencimiento}</strong>.
            Al guardar se recalcula desde la nueva fecha.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default TimelinePanel;
