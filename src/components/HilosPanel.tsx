import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { HiloPrueba, TipoHilo, OfrecidoPorHilo, EstadoHilo } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { Plus, Trash2, Pencil, Layers, Activity, CheckCircle2, XCircle, MinusCircle, FileSearch } from 'lucide-react';

interface HilosPanelProps {
  matterId: string;
}

const TIPO_OPTS: { value: TipoHilo; label: string }[] = [
  { value: 'pericial',    label: 'Pericial' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'informativa', label: 'Informativa' },
  { value: 'documental',  label: 'Documental' },
  { value: 'confesional', label: 'Confesional' },
  { value: 'otra',        label: 'Otra' },
];

const OFRECIDO_OPTS: { value: OfrecidoPorHilo; label: string }[] = [
  { value: 'propio',     label: 'Mi parte' },
  { value: 'contraria',  label: 'Contraparte' },
];

const ESTADO_OPTS: { value: EstadoHilo; label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'ofrecido',      label: 'Ofrecido',       color: 'text-blue-700 bg-blue-500/10 border-blue-500/30',       icon: FileSearch },
  { value: 'admitido',      label: 'Admitido',       color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  { value: 'rechazado',     label: 'Rechazado',      color: 'text-rose-700 bg-rose-500/10 border-rose-500/30',       icon: XCircle },
  { value: 'en_produccion', label: 'En producción',  color: 'text-amber-700 bg-amber-500/10 border-amber-500/30',    icon: Activity },
  { value: 'producido',     label: 'Producido',      color: 'text-teal-700 bg-teal-500/10 border-teal-500/30',       icon: CheckCircle2 },
  { value: 'desistido',     label: 'Desistido',      color: 'text-muted-foreground bg-muted/30 border-border/40',     icon: MinusCircle },
];

const labelEstado = (e: EstadoHilo) => ESTADO_OPTS.find(o => o.value === e)?.label ?? e;
const labelTipo   = (t: TipoHilo)   => TIPO_OPTS.find(o => o.value === t)?.label ?? t;
const labelOfrecido = (o: OfrecidoPorHilo) => OFRECIDO_OPTS.find(x => x.value === o)?.label ?? o;

export const HilosPanel: React.FC<HilosPanelProps> = ({ matterId }) => {
  const { hilos, eventos, handleCreateHilo, handleUpdateHilo, handleDeleteHilo } = useAppContext();
  const hilosDelMatter = useMemo(
    () => hilos.filter(h => h.matterId === matterId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [hilos, matterId],
  );
  const eventosCountByHilo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of eventos) {
      if (e.hiloId) map[e.hiloId] = (map[e.hiloId] ?? 0) + 1;
    }
    return map;
  }, [eventos]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<HiloPrueba | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (h: HiloPrueba) => { setEditing(h); setIsFormOpen(true); };

  const onDelete = async (h: HiloPrueba) => {
    const eventos = eventosCountByHilo[h.id] ?? 0;
    const msg = eventos > 0
      ? `Eliminar el hilo "${h.nombre}"? Hay ${eventos} evento${eventos === 1 ? '' : 's'} asociado${eventos === 1 ? '' : 's'} — quedarán sueltos (no se borran).`
      : `Eliminar el hilo "${h.nombre}"?`;
    if (!window.confirm(msg)) return;
    await handleDeleteHilo(h.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Layers size={16} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Hilos de prueba</h3>
            <p className="text-[11px] text-muted-foreground">Líneas paralelas de producción durante la etapa probatoria</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nuevo hilo
        </Button>
      </div>

      {hilosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Layers size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin hilos cargados. Cuando se ofrezca prueba, agregá un hilo por cada línea (ej. "Pericia contable", "Testimoniales actora", "Oficios a AFIP").
          </p>
        </div>
      )}

      <div className="space-y-2">
        {hilosDelMatter.map(h => {
          const estadoInfo = ESTADO_OPTS.find(o => o.value === h.estado)!;
          const Icon = estadoInfo.icon;
          const eventos = eventosCountByHilo[h.id] ?? 0;
          return (
            <div key={h.id} className="rounded-2xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{h.nombre}</span>
                    <Badge variant="default" className="text-[9px]">{labelTipo(h.tipo)}</Badge>
                    <Badge variant="default" className="text-[9px]">{labelOfrecido(h.ofrecidoPor)}</Badge>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', estadoInfo.color)}>
                      <Icon size={11} />
                      {labelEstado(h.estado)}
                    </span>
                  </div>
                  {h.descripcion && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">{h.descripcion}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground font-medium">
                    {h.fechaOfrecido   && <span>Ofrecido: {h.fechaOfrecido}</span>}
                    {h.fechaResolucion && <span>Resolución: {h.fechaResolucion}</span>}
                    {h.fechaProducido  && <span>Producido: {h.fechaProducido}</span>}
                    <span>Eventos: {eventos}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(h)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(h)}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <HiloForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editing={editing}
        matterId={matterId}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateHilo(editing.id, data);
          } else {
            await handleCreateHilo({ ...data, matterId } as Omit<HiloPrueba, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

interface HiloFormProps {
  isOpen: boolean;
  onClose: () => void;
  editing: HiloPrueba | null;
  matterId: string;
  onSave: (data: Partial<HiloPrueba>) => Promise<void>;
}

const HiloForm: React.FC<HiloFormProps> = ({ isOpen, onClose, editing, onSave }) => {
  const [nombre, setNombre]                   = useState(editing?.nombre ?? '');
  const [tipo, setTipo]                       = useState<TipoHilo>(editing?.tipo ?? 'pericial');
  const [ofrecidoPor, setOfrecidoPor]         = useState<OfrecidoPorHilo>(editing?.ofrecidoPor ?? 'propio');
  const [estado, setEstado]                   = useState<EstadoHilo>(editing?.estado ?? 'ofrecido');
  const [fechaOfrecido, setFechaOfrecido]     = useState(editing?.fechaOfrecido   ?? '');
  const [fechaResolucion, setFechaResolucion] = useState(editing?.fechaResolucion ?? '');
  const [fechaProducido, setFechaProducido]   = useState(editing?.fechaProducido  ?? '');
  const [descripcion, setDescripcion]         = useState(editing?.descripcion     ?? '');
  const [saving, setSaving]                   = useState(false);

  // Reset al abrir
  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setTipo(editing?.tipo ?? 'pericial');
    setOfrecidoPor(editing?.ofrecidoPor ?? 'propio');
    setEstado(editing?.estado ?? 'ofrecido');
    setFechaOfrecido(editing?.fechaOfrecido   ?? '');
    setFechaResolucion(editing?.fechaResolucion ?? '');
    setFechaProducido(editing?.fechaProducido  ?? '');
    setDescripcion(editing?.descripcion ?? '');
  }, [isOpen, editing]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        tipo,
        ofrecidoPor,
        estado,
        fechaOfrecido:   fechaOfrecido   || undefined,
        fechaResolucion: fechaResolucion || undefined,
        fechaProducido:  fechaProducido  || undefined,
        descripcion:     descripcion.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar hilo de prueba' : 'Nuevo hilo de prueba'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear hilo')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nombre del hilo</Label>
          <Input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Pericia contable de la SRL X"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoHilo)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {TIPO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Ofrecido por</Label>
            <select
              value={ofrecidoPor}
              onChange={e => setOfrecidoPor(e.target.value as OfrecidoPorHilo)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {OFRECIDO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <Label>Estado</Label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoHilo)}
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
          >
            {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Fecha ofrecido</Label>
            <Input type="date" value={fechaOfrecido} onChange={e => setFechaOfrecido(e.target.value)} />
          </div>
          <div>
            <Label>Resolución</Label>
            <Input type="date" value={fechaResolucion} onChange={e => setFechaResolucion(e.target.value)} />
          </div>
          <div>
            <Label>Producido</Label>
            <Input type="date" value={fechaProducido} onChange={e => setFechaProducido(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Descripción (opcional)</Label>
          <Textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Detalle de los puntos de pericia, lista de testigos, qué se pidió por oficio…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
};

export default HilosPanel;
