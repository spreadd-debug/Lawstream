import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { Perito, EspecialidadPerito, EstadoPerito } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { Plus, Trash2, Pencil, UserCheck, Mail, Phone, FileSignature, Clock, CheckCircle2, XCircle, Replace } from 'lucide-react';

interface PeritosPanelProps {
  matterId: string;
}

const ESPECIALIDAD_OPTS: { value: EspecialidadPerito; label: string }[] = [
  { value: 'contador',         label: 'Contador' },
  { value: 'psicologo',        label: 'Psicólogo' },
  { value: 'medico',           label: 'Médico' },
  { value: 'arquitecto',       label: 'Arquitecto' },
  { value: 'ingeniero',        label: 'Ingeniero' },
  { value: 'tasador',          label: 'Tasador' },
  { value: 'asistente_social', label: 'Asistente social' },
  { value: 'caligrafo',        label: 'Calígrafo' },
  { value: 'traductor',        label: 'Traductor' },
  { value: 'otra',             label: 'Otra' },
];

const ESTADO_OPTS: { value: EstadoPerito; label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'designado',          label: 'Designado',          color: 'text-blue-700 bg-blue-500/10 border-blue-500/30',         icon: FileSignature },
  { value: 'aceptado',           label: 'Aceptado',           color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30', icon: UserCheck },
  { value: 'informe_presentado', label: 'Informe presentado', color: 'text-teal-700 bg-teal-500/10 border-teal-500/30',         icon: CheckCircle2 },
  { value: 'rechazado',          label: 'Rechazado',          color: 'text-rose-700 bg-rose-500/10 border-rose-500/30',         icon: XCircle },
  { value: 'recusado',           label: 'Recusado',           color: 'text-amber-700 bg-amber-500/10 border-amber-500/30',      icon: XCircle },
  { value: 'sustituido',         label: 'Sustituido',         color: 'text-muted-foreground bg-muted/30 border-border/40',       icon: Replace },
];

const labelEstado = (e: EstadoPerito) => ESTADO_OPTS.find(o => o.value === e)?.label ?? e;
const labelEspecialidad = (e: EspecialidadPerito) => ESPECIALIDAD_OPTS.find(o => o.value === e)?.label ?? e;

export const PeritosPanel: React.FC<PeritosPanelProps> = ({ matterId }) => {
  const { peritos, hilos, handleCreatePerito, handleUpdatePerito, handleDeletePerito } = useAppContext();

  const peritosDelMatter = useMemo(
    () => peritos.filter(p => p.matterId === matterId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [peritos, matterId],
  );

  const hilosPericiales = useMemo(
    () => hilos.filter(h => h.matterId === matterId && h.tipo === 'pericial'),
    [hilos, matterId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Perito | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (p: Perito) => { setEditing(p); setIsFormOpen(true); };

  const onDelete = async (p: Perito) => {
    if (!window.confirm(`Eliminar al perito "${p.nombre}"?`)) return;
    await handleDeletePerito(p.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <UserCheck size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Peritos</h3>
            <p className="text-[11px] text-muted-foreground">Designados por el juzgado, con su ciclo procesal</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nuevo perito
        </Button>
      </div>

      {peritosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <UserCheck size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin peritos cargados. Cuando el juzgado designe uno (típico en pericias contables, psicológicas, tasaciones), agregálo acá para seguir su estado.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {peritosDelMatter.map(p => {
          const estadoInfo = ESTADO_OPTS.find(o => o.value === p.estado)!;
          const Icon = estadoInfo.icon;
          const hilo = hilos.find(h => h.id === p.hiloId);
          return (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4 hover:border-amber-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{p.nombre}</span>
                    <Badge variant="default" className="text-[9px]">{labelEspecialidad(p.especialidad)}</Badge>
                    {p.matricula && (
                      <span className="text-[10px] text-muted-foreground font-mono">Mat. {p.matricula}</span>
                    )}
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', estadoInfo.color)}>
                      <Icon size={11} />
                      {labelEstado(p.estado)}
                    </span>
                    {hilo && (
                      <span className="text-[10px] text-muted-foreground italic">
                        Hilo: <strong className="not-italic text-foreground/80">{hilo.nombre}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    {p.email && (
                      <span className="inline-flex items-center gap-1"><Mail size={11} />{p.email}</span>
                    )}
                    {p.telefono && (
                      <span className="inline-flex items-center gap-1"><Phone size={11} />{p.telefono}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
                    {p.fechaDesignado && (
                      <span className="inline-flex items-center gap-1"><Clock size={10} />Designado: {p.fechaDesignado}</span>
                    )}
                    {p.fechaAceptado && <span>Aceptado: {p.fechaAceptado}</span>}
                    {p.fechaInforme  && <span>Informe: {p.fechaInforme}</span>}
                  </div>

                  {p.notas && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 italic">{p.notas}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(p)}
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

      <PeritoForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editing={editing}
        matterId={matterId}
        hilosPericiales={hilosPericiales}
        onSave={async (data) => {
          if (editing) {
            await handleUpdatePerito(editing.id, data);
          } else {
            await handleCreatePerito({ ...data, matterId } as Omit<Perito, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

interface PeritoFormProps {
  isOpen: boolean;
  onClose: () => void;
  editing: Perito | null;
  matterId: string;
  hilosPericiales: { id: string; nombre: string }[];
  onSave: (data: Partial<Perito>) => Promise<void>;
}

const PeritoForm: React.FC<PeritoFormProps> = ({ isOpen, onClose, editing, hilosPericiales, onSave }) => {
  const [nombre, setNombre]                 = useState(editing?.nombre ?? '');
  const [especialidad, setEspecialidad]     = useState<EspecialidadPerito>(editing?.especialidad ?? 'contador');
  const [matricula, setMatricula]           = useState(editing?.matricula ?? '');
  const [email, setEmail]                   = useState(editing?.email    ?? '');
  const [telefono, setTelefono]             = useState(editing?.telefono ?? '');
  const [estado, setEstado]                 = useState<EstadoPerito>(editing?.estado ?? 'designado');
  const [fechaDesignado, setFechaDesignado] = useState(editing?.fechaDesignado ?? '');
  const [fechaAceptado, setFechaAceptado]   = useState(editing?.fechaAceptado  ?? '');
  const [fechaInforme, setFechaInforme]     = useState(editing?.fechaInforme   ?? '');
  const [hiloId, setHiloId]                 = useState(editing?.hiloId ?? '');
  const [notas, setNotas]                   = useState(editing?.notas  ?? '');
  const [saving, setSaving]                 = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setEspecialidad(editing?.especialidad ?? 'contador');
    setMatricula(editing?.matricula ?? '');
    setEmail(editing?.email    ?? '');
    setTelefono(editing?.telefono ?? '');
    setEstado(editing?.estado ?? 'designado');
    setFechaDesignado(editing?.fechaDesignado ?? '');
    setFechaAceptado(editing?.fechaAceptado   ?? '');
    setFechaInforme(editing?.fechaInforme     ?? '');
    setHiloId(editing?.hiloId ?? '');
    setNotas(editing?.notas   ?? '');
  }, [isOpen, editing]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nombre:         nombre.trim(),
        especialidad,
        matricula:      matricula.trim() || undefined,
        email:          email.trim()     || undefined,
        telefono:       telefono.trim()  || undefined,
        estado,
        fechaDesignado: fechaDesignado || undefined,
        fechaAceptado:  fechaAceptado  || undefined,
        fechaInforme:   fechaInforme   || undefined,
        hiloId:         hiloId         || undefined,
        notas:          notas.trim()   || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar perito' : 'Nuevo perito'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear perito')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nombre completo</Label>
          <Input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: CPN Raúl Martínez"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Especialidad</Label>
            <select
              value={especialidad}
              onChange={e => setEspecialidad(e.target.value as EspecialidadPerito)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {ESPECIALIDAD_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="T° 45 F° 234" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="perito@email.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="11 5555-5555" />
          </div>
        </div>

        <div>
          <Label>Estado actual</Label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoPerito)}
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
          >
            {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Fecha designado</Label>
            <Input type="date" value={fechaDesignado} onChange={e => setFechaDesignado(e.target.value)} />
          </div>
          <div>
            <Label>Aceptado</Label>
            <Input type="date" value={fechaAceptado} onChange={e => setFechaAceptado(e.target.value)} />
          </div>
          <div>
            <Label>Informe</Label>
            <Input type="date" value={fechaInforme} onChange={e => setFechaInforme(e.target.value)} />
          </div>
        </div>

        {hilosPericiales.length > 0 && (
          <div>
            <Label>Hilo de prueba (opcional)</Label>
            <select
              value={hiloId}
              onChange={e => setHiloId(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">— Sin hilo —</option>
              {hilosPericiales.map(h => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Asociá el perito al hilo pericial al que corresponde.
            </p>
          </div>
        )}

        <div>
          <Label>Notas (opcional)</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas operativas: visita pendiente, puntos de pericia, observaciones…"
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
};

export default PeritosPanel;
