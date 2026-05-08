// GAP UX-33 — Panel de controversias del caso.
//
// Hechos extrajudiciales que generan conflicto: vacaciones, mudanza
// unilateral, decisiones del cónyuge sobre los chicos, plata movida sin
// avisar, etc. Estructurados con categoría + posición de cada parte +
// plazo crítico opcional + estado.
//
// Render:
//   • Cards abiertas / negociando arriba, ordenadas por urgencia
//     (vencida → inminente → próxima → media → sin plazo).
//   • Cards cerradas (acordada / judicializada / desistida) en bloque
//     colapsado al final.
//   • Form modal para crear/editar.
//
// "Judicializar" cambia el estado a 'judicializada' y registra un evento
// en el timeline procesal con tipo 'controversia_judicializada'. La
// creación del sub-proceso real (incidente) la sigue haciendo el abogado
// desde el panel de Sub-procesos — la traza queda en metadata del evento.

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  Controversia,
  CategoriaControversia,
  EstadoControversia,
  CATEGORIA_CONTROVERSIA_LABELS,
  ESTADO_CONTROVERSIA_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, AlertCircle, CalendarClock, Gavel, ChevronDown, ChevronRight, Flag,
} from 'lucide-react';
import {
  diasHastaPlazo,
  severidadControversia,
  estaAbierta,
  ordenarControversias,
  SeveridadControversia,
} from '../lib/controversias';

interface ControversiasPanelProps {
  matterId: string;
}

const SEVERIDAD_TONE: Record<SeveridadControversia, string> = {
  vencida:   'border-rose-500/40 bg-rose-500/10',
  inminente: 'border-rose-500/30 bg-rose-500/5',
  proxima:   'border-amber-500/40 bg-amber-500/5',
  media:     'border-border/60 bg-card',
  sin_plazo: 'border-border/60 bg-card',
};

const CATEGORIAS_OPTS: CategoriaControversia[] = [
  'vacaciones', 'cuota_alimentaria', 'regimen_comunicacion', 'mudanza',
  'bienes', 'comunicacion', 'salud', 'educacion', 'otra',
];

const ESTADOS_OPTS: EstadoControversia[] = [
  'abierta', 'negociando', 'acordada', 'judicializada', 'desistida',
];

export const ControversiasPanel: React.FC<ControversiasPanelProps> = ({ matterId }) => {
  const {
    controversias,
    handleCreateControversia, handleUpdateControversia, handleDeleteControversia,
    handleCreateEvento,
  } = useAppContext();

  const delMatter = useMemo(
    () => controversias.filter(c => c.matterId === matterId),
    [controversias, matterId],
  );
  const abiertas = useMemo(
    () => ordenarControversias(delMatter.filter(estaAbierta)),
    [delMatter],
  );
  const cerradas = useMemo(
    () => ordenarControversias(delMatter.filter(c => !estaAbierta(c))),
    [delMatter],
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<Controversia | null>(null);
  const [showCerradas, setShowCerradas] = useState(false);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: Controversia) => { setEditing(c); setFormOpen(true); };

  const onDelete = async (c: Controversia) => {
    if (!window.confirm(`Eliminar la controversia "${c.titulo}"?`)) return;
    await handleDeleteControversia(c.id);
  };

  // Marcar como judicializada — además registra evento en timeline procesal.
  const onJudicializar = async (c: Controversia) => {
    if (!window.confirm(`Marcar "${c.titulo}" como judicializada? Se registra en el timeline procesal y queda link bidireccional.`)) return;
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      const evento = await handleCreateEvento({
        matterId:        c.matterId,
        fecha:           hoy,
        tipo:            'controversia_judicializada' as any,
        titulo:          `Controversia judicializada: ${c.titulo}`,
        descripcion:     `Categoría: ${CATEGORIA_CONTROVERSIA_LABELS[c.categoria]}. Hecho del ${c.fechaHecho}. Se inicia trámite judicial.`,
        origen:          'manual',
        documentosUrls:  c.documentosUrls,
        metadata:        { controversiaId: c.id, categoria: c.categoria },
      } as any);
      await handleUpdateControversia(c.id, {
        estado:         'judicializada',
        eventoOrigenId: evento?.id ?? undefined,
      });
    } catch (err) {
      console.error('[ControversiasPanel] Error judicializando:', err);
      window.alert('No se pudo marcar como judicializada. Mirá la consola.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Flag size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Controversias del caso</h3>
            <p className="text-[11px] text-muted-foreground">
              Hechos extrajudiciales con plazo o impacto procesal — vacaciones, mudanza, decisiones unilaterales, plata movida. Se priorizan por urgencia.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} /> Nueva controversia
        </Button>
      </div>

      {abiertas.length === 0 && cerradas.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <Flag size={22} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Sin controversias cargadas. Cuando aparezca un conflicto entre las partes (ej. la contraparte avisa que se lleva los chicos
            de vacaciones, anuncia una mudanza, deja de pagar el colegio), registralo acá para no perderle la pista.
          </p>
        </div>
      )}

      {abiertas.length > 0 && (
        <div className="space-y-2">
          {abiertas.map(c => (
            <ControversiaCard
              key={c.id}
              controversia={c}
              onEdit={() => openEdit(c)}
              onDelete={() => onDelete(c)}
              onJudicializar={() => onJudicializar(c)}
            />
          ))}
        </div>
      )}

      {cerradas.length > 0 && (
        <div className="border-t border-border/40 pt-3">
          <button
            onClick={() => setShowCerradas(s => !s)}
            className="w-full text-left flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-muted/30 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              {showCerradas ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Controversias cerradas ({cerradas.length})
            </span>
          </button>
          {showCerradas && (
            <div className="space-y-2 mt-2">
              {cerradas.map(c => (
                <ControversiaCard
                  key={c.id}
                  controversia={c}
                  onEdit={() => openEdit(c)}
                  onDelete={() => onDelete(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ControversiaForm
        isOpen={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateControversia(editing.id, data);
          } else {
            await handleCreateControversia({
              ...data,
              matterId,
              documentosUrls: data.documentosUrls ?? [],
            } as Omit<Controversia, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Card individual ───────────────────────────────────────────

const ControversiaCard: React.FC<{
  controversia: Controversia;
  onEdit: () => void;
  onDelete: () => void;
  /** Solo se pasa cuando la controversia está abierta. */
  onJudicializar?: () => void;
}> = ({ controversia: c, onEdit, onDelete, onJudicializar }) => {
  const [expanded, setExpanded] = useState(false);
  const sev      = severidadControversia(c);
  const dias     = diasHastaPlazo(c.plazoCritico);
  const abierta  = estaAbierta(c);
  const tono     = abierta ? SEVERIDAD_TONE[sev] : 'border-border/40 bg-muted/20 opacity-80';

  // Texto del countdown.
  const countdown = (() => {
    if (dias === null) return null;
    if (dias < 0)  return `Plazo vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
    if (dias === 0) return 'Plazo vence hoy';
    if (dias === 1) return 'Plazo vence mañana';
    return `Plazo en ${dias} días`;
  })();

  const tonoCountdown =
    sev === 'vencida'   ? 'text-rose-700 dark:text-rose-300 font-black' :
    sev === 'inminente' ? 'text-rose-700 dark:text-rose-300 font-bold' :
    sev === 'proxima'   ? 'text-amber-700 dark:text-amber-300 font-bold' :
    'text-muted-foreground';

  return (
    <div className={cn('rounded-2xl border p-3 transition-colors', tono)}>
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 min-w-0 text-left space-y-1"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{c.titulo}</span>
            <Badge variant="outline" className="text-[9px]">{CATEGORIA_CONTROVERSIA_LABELS[c.categoria]}</Badge>
            <Badge variant="outline" className={cn(
              'text-[9px]',
              c.estado === 'abierta'        && 'border-rose-500/40 text-rose-700',
              c.estado === 'negociando'     && 'border-amber-500/40 text-amber-700',
              c.estado === 'acordada'       && 'border-emerald-500/40 text-emerald-700',
              c.estado === 'judicializada'  && 'border-violet-500/40 text-violet-700',
              c.estado === 'desistida'      && 'border-border/40 text-muted-foreground',
            )}>
              {ESTADO_CONTROVERSIA_LABELS[c.estado]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={11} />
              Hecho del {format(parseISO(c.fechaHecho), "d MMM yyyy", { locale: es })}
            </span>
            {countdown && abierta && (
              <span className={cn('inline-flex items-center gap-1', tonoCountdown)}>
                <AlertCircle size={11} />
                {countdown}
                {c.plazoCritico && <span className="font-normal opacity-70"> · {format(parseISO(c.plazoCritico), 'd MMM', { locale: es })}</span>}
              </span>
            )}
          </div>
          {!expanded && c.descripcion && (
            <p className="text-[11px] text-foreground/80 line-clamp-1">{c.descripcion}</p>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {onJudicializar && (
            <button
              onClick={onJudicializar}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-violet-500/40 bg-violet-500/5 text-violet-700 hover:bg-violet-500/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
              title="Marcar como judicializada — registra evento en el timeline procesal"
            >
              <Gavel size={11} /> Judicializar
            </button>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30 mt-3 pt-3 space-y-2 text-[12px]">
          {c.descripcion && (
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Hecho</div>
              <p className="text-foreground/90 whitespace-pre-wrap">{c.descripcion}</p>
            </div>
          )}
          {(c.posicionCliente || c.posicionContraparte) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {c.posicionCliente && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Posición cliente</div>
                  <p className="text-foreground/90">{c.posicionCliente}</p>
                </div>
              )}
              {c.posicionContraparte && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2 py-1.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-rose-700">Posición contraparte</div>
                  <p className="text-foreground/90">{c.posicionContraparte}</p>
                </div>
              )}
            </div>
          )}
          {c.notas && (
            <p className="text-[11px] text-muted-foreground italic">{c.notas}</p>
          )}
          {c.documentosUrls && c.documentosUrls.length > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {c.documentosUrls.length} adjunto{c.documentosUrls.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Form modal ────────────────────────────────────────────────

interface ControversiaFormProps {
  isOpen: boolean;
  editing: Controversia | null;
  onClose: () => void;
  onSave: (data: Partial<Controversia>) => Promise<void>;
}

const ControversiaForm: React.FC<ControversiaFormProps> = ({ isOpen, editing, onClose, onSave }) => {
  const [categoria, setCategoria]                   = useState<CategoriaControversia>('vacaciones');
  const [titulo, setTitulo]                         = useState('');
  const [fechaHecho, setFechaHecho]                 = useState('');
  const [descripcion, setDescripcion]               = useState('');
  const [posicionCliente, setPosicionCliente]       = useState('');
  const [posicionContraparte, setPosicionContraparte] = useState('');
  const [plazoCritico, setPlazoCritico]             = useState('');
  const [estado, setEstado]                         = useState<EstadoControversia>('abierta');
  const [notas, setNotas]                           = useState('');
  const [saving, setSaving]                         = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setCategoria(editing?.categoria ?? 'vacaciones');
    setTitulo(editing?.titulo ?? '');
    setFechaHecho(editing?.fechaHecho ?? new Date().toISOString().slice(0, 10));
    setDescripcion(editing?.descripcion ?? '');
    setPosicionCliente(editing?.posicionCliente ?? '');
    setPosicionContraparte(editing?.posicionContraparte ?? '');
    setPlazoCritico(editing?.plazoCritico ?? '');
    setEstado(editing?.estado ?? 'abierta');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = titulo.trim().length > 0 && fechaHecho.trim().length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave({
        categoria,
        titulo:              titulo.trim(),
        fechaHecho,
        descripcion:         descripcion.trim()         || undefined,
        posicionCliente:     posicionCliente.trim()     || undefined,
        posicionContraparte: posicionContraparte.trim() || undefined,
        plazoCritico:        plazoCritico               || undefined,
        estado,
        notas:               notas.trim()               || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar controversia' : 'Nueva controversia'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear controversia')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría *</Label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaControversia)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {CATEGORIAS_OPTS.map(cat => (
                <option key={cat} value={cat}>{CATEGORIA_CONTROVERSIA_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Estado</Label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoControversia)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {ESTADOS_OPTS.map(s => (
                <option key={s} value={s}>{ESTADO_CONTROVERSIA_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Título *</Label>
          <Input
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder='Ej: "Nico se lleva los chicos a Mar del Plata"'
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha del hecho *</Label>
            <Input type="date" value={fechaHecho} onChange={e => setFechaHecho(e.target.value)} />
          </div>
          <div>
            <Label>Plazo crítico</Label>
            <Input type="date" value={plazoCritico} onChange={e => setPlazoCritico(e.target.value)} />
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Opcional — fecha tope para resolver. Activa el banner de urgencia.
            </p>
          </div>
        </div>

        <div>
          <Label>Descripción del hecho</Label>
          <Textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Qué pasó, cuándo, cómo se enteró el cliente."
            className="min-h-[70px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Posición del cliente</Label>
            <Textarea
              value={posicionCliente}
              onChange={e => setPosicionCliente(e.target.value)}
              placeholder="Qué pretende el cliente."
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label>Posición de la contraparte</Label>
            <Textarea
              value={posicionContraparte}
              onChange={e => setPosicionContraparte(e.target.value)}
              placeholder="Qué pretende la otra parte (si se conoce)."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <div>
          <Label>Notas internas</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Cualquier dato extra del expediente o estrategia."
            className="min-h-[50px]"
          />
        </div>
      </div>
    </Modal>
  );
};
