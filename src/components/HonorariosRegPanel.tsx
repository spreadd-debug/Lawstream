import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { HonorarioRegulado, TipoHonorarioRegulado, EstadoHonorarioRegulado, UnidadArancelaria } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { Scale, Plus, Trash2, Pencil, FileSignature, CheckCircle2, XCircle, Hammer, AlertTriangle, MinusCircle, Bell } from 'lucide-react';

interface HonorariosRegPanelProps {
  matterId: string;
}

const TIPO_OPTS: { value: TipoHonorarioRegulado; label: string }[] = [
  { value: 'letrado_propio',    label: 'Letrado propio (mi parte)' },
  { value: 'letrado_contrario', label: 'Letrado contrario' },
  { value: 'perito',            label: 'Perito' },
  { value: 'mediador',          label: 'Mediador' },
  { value: 'otro',              label: 'Otro' },
];

const ESTADO_OPTS: { value: EstadoHonorarioRegulado; label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'regulado',     label: 'Regulado',     color: 'text-blue-700 bg-blue-500/10 border-blue-500/30',         icon: FileSignature },
  { value: 'apelado',      label: 'Apelado',      color: 'text-amber-700 bg-amber-500/10 border-amber-500/30',      icon: AlertTriangle },
  { value: 'firme',        label: 'Firme',        color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  { value: 'en_ejecucion', label: 'En ejecución', color: 'text-violet-700 bg-violet-500/10 border-violet-500/30',   icon: Hammer },
  { value: 'cobrado',      label: 'Cobrado',      color: 'text-teal-700 bg-teal-500/10 border-teal-500/30',         icon: CheckCircle2 },
  { value: 'incobrable',   label: 'Incobrable',   color: 'text-muted-foreground bg-muted/30 border-border/40',       icon: MinusCircle },
];

const labelTipo = (t: TipoHonorarioRegulado) => TIPO_OPTS.find(o => o.value === t)?.label ?? t;
const labelEstado = (e: EstadoHonorarioRegulado) => ESTADO_OPTS.find(o => o.value === e)?.label ?? e;

const formatPesos = (v: number) =>
  `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const HonorariosRegPanel: React.FC<HonorariosRegPanelProps> = ({ matterId }) => {
  const { honorariosRegulados, handleCreateHonorarioRegulado, handleUpdateHonorarioRegulado, handleDeleteHonorarioRegulado } = useAppContext();

  const honorariosDelMatter = useMemo(
    () => honorariosRegulados
      .filter(h => h.matterId === matterId)
      .sort((a, b) => (b.fechaRegulacion ?? b.createdAt).localeCompare(a.fechaRegulacion ?? a.createdAt)),
    [honorariosRegulados, matterId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing]       = useState<HonorarioRegulado | null>(null);

  const openNew  = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (h: HonorarioRegulado) => { setEditing(h); setIsFormOpen(true); };

  const onDelete = async (h: HonorarioRegulado) => {
    if (!window.confirm(`Eliminar el honorario regulado de "${h.profesional}" (${formatPesos(h.montoPesos)})?`)) return;
    await handleDeleteHonorarioRegulado(h.id);
  };

  // Agregados para chips de resumen
  const totalRegulado     = honorariosDelMatter.reduce((s, h) => s + h.montoPesos, 0);
  const totalCobrado      = honorariosDelMatter.filter(h => h.estado === 'cobrado').reduce((s, h) => s + h.montoPesos, 0);
  const enEjecucion       = honorariosDelMatter.filter(h => h.estado === 'en_ejecucion').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Scale size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Honorarios regulados</h3>
            <p className="text-[11px] text-muted-foreground">Regulación judicial de honorarios — distinto del presupuesto al cliente</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nueva regulación
        </Button>
      </div>

      {honorariosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Scale size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin honorarios regulados. Cuando el juez fije honorarios al cierre del juicio
            (típicamente con costas a la contraparte), agregálos acá para seguir su firmeza
            y cobro.
          </p>
        </div>
      )}

      {honorariosDelMatter.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-card p-2 border border-border/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Regulado total</p>
            <p className="text-sm font-bold text-foreground">{formatPesos(totalRegulado)}</p>
          </div>
          <div className="rounded-lg bg-card p-2 border border-border/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Cobrado</p>
            <p className="text-sm font-bold text-emerald-700">{formatPesos(totalCobrado)}</p>
          </div>
          <div className={cn(
            "rounded-lg p-2 border",
            enEjecucion > 0 ? "bg-violet-500/10 border-violet-500/30" : "bg-card border-border/40",
          )}>
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">En ejecución</p>
            <p className={cn("text-sm font-bold", enEjecucion > 0 ? "text-violet-700" : "text-foreground")}>{enEjecucion}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {honorariosDelMatter.map(h => {
          const estadoInfo = ESTADO_OPTS.find(o => o.value === h.estado)!;
          const Icon = estadoInfo.icon;
          return (
            <div key={h.id} className="rounded-2xl border border-border/60 bg-card p-4 hover:border-amber-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{h.profesional}</span>
                    <Badge variant="default" className="text-[9px]">{labelTipo(h.tipo)}</Badge>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', estadoInfo.color)}>
                      <Icon size={11} />
                      {labelEstado(h.estado)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-[12px] font-bold text-foreground/90">
                    <span>{h.cantidadUnidades} {h.unidad}</span>
                    <span className="text-muted-foreground/60">×</span>
                    <span>{formatPesos(h.valorUnidadSnapshot)}</span>
                    <span className="text-muted-foreground/60">=</span>
                    <span className="text-amber-700">{formatPesos(h.montoPesos)}</span>
                  </div>

                  {h.obligadoAPagar && (
                    <div className="text-[11px] text-muted-foreground mt-1">
                      <strong>Obligado a pagar:</strong> {h.obligadoAPagar}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium flex-wrap">
                    {h.fechaRegulacion   && <span>Regulado: {h.fechaRegulacion}</span>}
                    {h.fechaNotificacion && <span>Notificado: {h.fechaNotificacion}</span>}
                    {h.fechaFirmeza      && <span>Firme: {h.fechaFirmeza}</span>}
                    {h.fechaCobro        && <span>Cobrado: {h.fechaCobro}</span>}
                  </div>

                  {h.apeladoPor && (
                    <p className="text-[11px] text-amber-700 italic mt-1">
                      <strong>Apelado por:</strong> {h.apeladoPor}
                    </p>
                  )}
                  {h.notas && (
                    <p className="text-[11px] text-muted-foreground italic mt-1">{h.notas}</p>
                  )}
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

      <HonorarioForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editing={editing}
        matterId={matterId}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateHonorarioRegulado(editing.id, data);
          } else {
            await handleCreateHonorarioRegulado({ ...data, matterId } as Omit<HonorarioRegulado, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Form crear/editar honorario regulado ────────────────────

const HonorarioForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  editing: HonorarioRegulado | null;
  matterId: string;
  onSave: (data: Partial<HonorarioRegulado>) => Promise<void>;
}> = ({ isOpen, onClose, editing, onSave }) => {
  const [profesional, setProfesional]                 = useState(editing?.profesional ?? '');
  const [tipo, setTipo]                               = useState<TipoHonorarioRegulado>(editing?.tipo ?? 'letrado_propio');
  const [cantidad, setCantidad]                       = useState(editing?.cantidadUnidades?.toString() ?? '');
  const [unidad, setUnidad]                           = useState<UnidadArancelaria>(editing?.unidad ?? 'JUS');
  const [valorUnidad, setValorUnidad]                 = useState(editing?.valorUnidadSnapshot?.toString() ?? '');
  const [estado, setEstado]                           = useState<EstadoHonorarioRegulado>(editing?.estado ?? 'regulado');
  const [obligadoAPagar, setObligadoAPagar]           = useState(editing?.obligadoAPagar ?? '');
  const [fechaRegulacion, setFechaRegulacion]         = useState(editing?.fechaRegulacion ?? '');
  const [fechaNotificacion, setFechaNotificacion]     = useState(editing?.fechaNotificacion ?? '');
  const [fechaFirmeza, setFechaFirmeza]               = useState(editing?.fechaFirmeza ?? '');
  const [fechaCobro, setFechaCobro]                   = useState(editing?.fechaCobro ?? '');
  const [apeladoPor, setApeladoPor]                   = useState(editing?.apeladoPor ?? '');
  const [notas, setNotas]                             = useState(editing?.notas ?? '');
  const [saving, setSaving]                           = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setProfesional(editing?.profesional ?? '');
    setTipo(editing?.tipo ?? 'letrado_propio');
    setCantidad(editing?.cantidadUnidades?.toString() ?? '');
    setUnidad(editing?.unidad ?? 'JUS');
    setValorUnidad(editing?.valorUnidadSnapshot?.toString() ?? '');
    setEstado(editing?.estado ?? 'regulado');
    setObligadoAPagar(editing?.obligadoAPagar ?? '');
    setFechaRegulacion(editing?.fechaRegulacion ?? '');
    setFechaNotificacion(editing?.fechaNotificacion ?? '');
    setFechaFirmeza(editing?.fechaFirmeza ?? '');
    setFechaCobro(editing?.fechaCobro ?? '');
    setApeladoPor(editing?.apeladoPor ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const cantNum  = parseFloat(cantidad);
  const valorNum = parseFloat(valorUnidad);
  const monto    = !isNaN(cantNum) && !isNaN(valorNum) ? cantNum * valorNum : 0;
  const valido   = profesional.trim() !== '' && !isNaN(cantNum) && cantNum > 0 && !isNaN(valorNum) && valorNum > 0;

  const handleSubmit = async () => {
    if (!valido) return;
    setSaving(true);
    try {
      await onSave({
        profesional:         profesional.trim(),
        tipo,
        cantidadUnidades:    cantNum,
        unidad,
        valorUnidadSnapshot: valorNum,
        montoPesos:          monto,
        estado,
        obligadoAPagar:      obligadoAPagar.trim() || undefined,
        fechaRegulacion:     fechaRegulacion   || undefined,
        fechaNotificacion:   fechaNotificacion || undefined,
        fechaFirmeza:        fechaFirmeza      || undefined,
        fechaCobro:          fechaCobro        || undefined,
        apeladoPor:          apeladoPor.trim() || undefined,
        notas:               notas.trim()      || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar honorario regulado' : 'Nueva regulación de honorarios'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !valido}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Profesional / Beneficiario</Label>
            <Input value={profesional} onChange={e => setProfesional(e.target.value)} placeholder="Ej: Dra. Laura García" />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as TipoHonorarioRegulado)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {TIPO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="80"
            />
          </div>
          <div>
            <Label>Unidad</Label>
            <select
              value={unidad}
              onChange={e => setUnidad(e.target.value as UnidadArancelaria)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="JUS">JUS</option>
              <option value="UMA">UMA</option>
            </select>
          </div>
          <div>
            <Label>Valor de la unidad ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valorUnidad}
              onChange={e => setValorUnidad(e.target.value)}
              placeholder="25000"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Snapshot al momento de la regulación.
            </p>
          </div>
        </div>

        {valido && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs">
            Monto regulado: <strong className="text-amber-800">{formatPesos(monto)}</strong>
            {' '}({cantNum} {unidad} × {formatPesos(valorNum)})
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado</Label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoHonorarioRegulado)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {ESTADO_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Obligado a pagar</Label>
            <Input
              value={obligadoAPagar}
              onChange={e => setObligadoAPagar(e.target.value)}
              placeholder="Ej: Diego Fernández (contraparte)"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha regulación</Label>
            <Input type="date" value={fechaRegulacion} onChange={e => setFechaRegulacion(e.target.value)} />
          </div>
          <div>
            <Label>Fecha notificación</Label>
            <Input type="date" value={fechaNotificacion} onChange={e => setFechaNotificacion(e.target.value)} />
          </div>
          <div>
            <Label>Fecha firmeza</Label>
            <Input type="date" value={fechaFirmeza} onChange={e => setFechaFirmeza(e.target.value)} />
          </div>
          <div>
            <Label>Fecha cobro</Label>
            <Input type="date" value={fechaCobro} onChange={e => setFechaCobro(e.target.value)} />
          </div>
        </div>

        {(estado === 'apelado' || apeladoPor) && (
          <div>
            <Label>Apelado por</Label>
            <Input
              value={apeladoPor}
              onChange={e => setApeladoPor(e.target.value)}
              placeholder="Ej: el obligado al pago"
            />
          </div>
        )}

        <div>
          <Label>Notas (opcional)</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Detalles, fojas, contexto…"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
};

export default HonorariosRegPanel;
