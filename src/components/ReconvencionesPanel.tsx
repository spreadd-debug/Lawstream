// GAP R10 — Panel de reconvenciones del caso.
//
// Lista las contrademandas planteadas por el demandado contra el actor
// (típicamente la contraparte contra nuestro cliente, pero también el
// caso inverso). Muestra estado del ciclo procesal y pretensiones
// reclamadas como tags, similar a aspectos_apelados.

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  Reconvencion,
  PresentadaPor,
  PretensionReconvencion,
  EstadoReconvencion,
  PRETENSION_LABELS,
  ESTADO_RECONVENCION_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, GitMerge, Scale, AlertCircle, CheckCircle2,
  Clock, MinusCircle, FileText,
} from 'lucide-react';

interface ReconvencionesPanelProps {
  matterId: string;
}

const PRETENSION_OPTS: PretensionReconvencion[] = [
  'compensacion_economica',
  'atribucion_vivienda',
  'cuota_alimentaria',
  'regimen_comunicacion',
  'tenencia',
  'costas',
  'honorarios',
  'danos_perjuicios',
  'nulidad',
  'otra',
];

const ESTADO_META: Record<EstadoReconvencion, { color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  pendiente_traslado:     { color: 'text-amber-700 bg-amber-500/10 border-amber-500/30',    icon: Clock },
  traslado_corrido:       { color: 'text-blue-700 bg-blue-500/10 border-blue-500/30',       icon: FileText },
  contestada:             { color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  resuelta_por_sentencia: { color: 'text-teal-700 bg-teal-500/10 border-teal-500/30',       icon: Scale },
  desistida:              { color: 'text-muted-foreground bg-muted/30 border-border/40',    icon: MinusCircle },
};

export const ReconvencionesPanel: React.FC<ReconvencionesPanelProps> = ({ matterId }) => {
  const { reconvenciones, handleCreateReconvencion, handleUpdateReconvencion, handleDeleteReconvencion } = useAppContext();

  const recsDelMatter = useMemo(
    () => reconvenciones.filter(r => r.matterId === matterId).sort((a, b) => b.fechaPresentacion.localeCompare(a.fechaPresentacion)),
    [reconvenciones, matterId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reconvencion | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (r: Reconvencion) => { setEditing(r); setIsFormOpen(true); };

  const onDelete = async (r: Reconvencion) => {
    if (!window.confirm(`Eliminar la reconvención del ${r.fechaPresentacion}? Esta acción no afecta los eventos vinculados.`)) return;
    await handleDeleteReconvencion(r.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
            <GitMerge size={16} className="text-fuchsia-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Reconvenciones</h3>
            <p className="text-[11px] text-muted-foreground">
              Contrademandas en el mismo expediente. Tramitan junto con la principal pero tienen ciclo y pretensiones propias.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nueva reconvención
        </Button>
      </div>

      {recsDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <GitMerge size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            No hay reconvenciones cargadas. Cuando una parte conteste planteando contrademanda, agregála acá para trackear el plazo de contestación y las pretensiones.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {recsDelMatter.map(r => (
          <ReconvencionCard
            key={r.id}
            reconvencion={r}
            onEdit={() => openEdit(r)}
            onDelete={() => onDelete(r)}
          />
        ))}
      </div>

      <ReconvencionForm
        isOpen={isFormOpen}
        editing={editing}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateReconvencion(editing.id, data);
          } else {
            await handleCreateReconvencion({ ...data, matterId } as Omit<Reconvencion, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Card individual ──────────────────────────────────────────────

const ReconvencionCard: React.FC<{
  reconvencion: Reconvencion;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ reconvencion: r, onEdit, onDelete }) => {
  const meta = ESTADO_META[r.estado];
  const Icon = meta.icon;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-fuchsia-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">
              Reconvención de {r.presentadaPor === 'cliente' ? 'mi parte' : 'la contraparte'}
            </span>
            <Badge variant="outline" className="text-[9px]">
              {format(parseISO(r.fechaPresentacion), "d MMM yyyy", { locale: es })}
            </Badge>
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', meta.color)}>
              <Icon size={11} />
              {ESTADO_RECONVENCION_LABELS[r.estado]}
            </span>
          </div>

          {r.pretensiones.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.pretensiones.map(p => (
                <span key={p} className="px-2 py-0.5 rounded-md bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300 text-[10px] font-bold">
                  {PRETENSION_LABELS[p]}
                </span>
              ))}
            </div>
          )}

          {r.montoReclamado && (
            <p className="text-[11px] text-foreground/90">
              <span className="font-bold text-fuchsia-700">Monto reclamado:</span> {r.montoReclamado}
            </p>
          )}
          {r.pretensionDesc && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-3">
              {r.pretensionDesc}
            </p>
          )}
          {r.notas && (
            <p className="text-[11px] text-muted-foreground italic">{r.notas}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Form modal ───────────────────────────────────────────────────

interface ReconvencionFormProps {
  isOpen: boolean;
  editing: Reconvencion | null;
  onClose: () => void;
  onSave: (data: Partial<Reconvencion>) => Promise<void>;
}

const ReconvencionForm: React.FC<ReconvencionFormProps> = ({ isOpen, editing, onClose, onSave }) => {
  const [presentadaPor, setPresentadaPor]       = useState<PresentadaPor>('contraparte');
  const [fechaPresentacion, setFechaPresentacion] = useState('');
  const [fechaTrasladoCorrido, setFechaTrasladoCorrido] = useState('');
  const [pretensiones, setPretensiones]         = useState<PretensionReconvencion[]>([]);
  const [montoReclamado, setMontoReclamado]     = useState('');
  const [pretensionDesc, setPretensionDesc]     = useState('');
  const [estado, setEstado]                     = useState<EstadoReconvencion>('pendiente_traslado');
  const [notas, setNotas]                       = useState('');
  const [saving, setSaving]                     = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setPresentadaPor(editing?.presentadaPor ?? 'contraparte');
    setFechaPresentacion(editing?.fechaPresentacion ?? new Date().toISOString().slice(0, 10));
    setFechaTrasladoCorrido(editing?.fechaTrasladoCorrido ?? '');
    setPretensiones(editing?.pretensiones ?? []);
    setMontoReclamado(editing?.montoReclamado ?? '');
    setPretensionDesc(editing?.pretensionDesc ?? '');
    setEstado(editing?.estado ?? 'pendiente_traslado');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const togglePretension = (p: PretensionReconvencion) => {
    setPretensiones(curr =>
      curr.includes(p) ? curr.filter(x => x !== p) : [...curr, p],
    );
  };

  const puedeGuardar = fechaPresentacion.trim().length > 0 && pretensiones.length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave({
        presentadaPor,
        fechaPresentacion,
        // GAP UX-28: solo guardar la fecha de traslado corrido cuando aplica.
        // Si el usuario rebaja el estado, limpiar la fecha vieja para no
        // mostrarla como vigente en el banner.
        fechaTrasladoCorrido: estado === 'traslado_corrido'
          ? (fechaTrasladoCorrido.trim() || undefined)
          : undefined,
        pretensiones,
        montoReclamado: montoReclamado.trim() || undefined,
        pretensionDesc: pretensionDesc.trim() || undefined,
        estado,
        notas:          notas.trim()          || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar reconvención' : 'Nueva reconvención'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear reconvención')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Presentada por *</Label>
            <select
              value={presentadaPor}
              onChange={e => setPresentadaPor(e.target.value as PresentadaPor)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="contraparte">La contraparte (contra mi cliente)</option>
              <option value="cliente">Mi cliente (contra la otra parte)</option>
            </select>
          </div>
          <div>
            <Label>Fecha de presentación *</Label>
            <Input
              type="date"
              value={fechaPresentacion}
              onChange={e => setFechaPresentacion(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Pretensiones reclamadas *</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {PRETENSION_OPTS.map(p => {
              const checked = pretensiones.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePretension(p)}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg border text-[12px] font-bold transition-colors',
                    checked
                      ? 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-800 dark:text-fuchsia-200'
                      : 'border-border/40 bg-background text-foreground/70 hover:border-border',
                  )}
                >
                  {checked ? '✓ ' : ''}{PRETENSION_LABELS[p]}
                </button>
              );
            })}
          </div>
          {pretensiones.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic mt-1">Seleccioná al menos una pretensión.</p>
          )}
        </div>

        <div>
          <Label>Monto reclamado (si aplica)</Label>
          <Input
            value={montoReclamado}
            onChange={e => setMontoReclamado(e.target.value)}
            placeholder="Ej: U$S 200.000 (compensación) o $2.000.000/mes por 60 meses"
          />
        </div>

        <div>
          <Label>Descripción / fundamento</Label>
          <Textarea
            value={pretensionDesc}
            onChange={e => setPretensionDesc(e.target.value)}
            placeholder='Ej: Reclama compensación art. 441 CCyCN por dedicación al cuidado de hijos durante 11 años + atribución del depto Juncal por 3 años o hasta que Isabella cumpla 18.'
            className="min-h-[80px]"
          />
        </div>

        <div>
          <Label>Estado del ciclo</Label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value as EstadoReconvencion)}
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
          >
            <option value="pendiente_traslado">{ESTADO_RECONVENCION_LABELS.pendiente_traslado}</option>
            <option value="traslado_corrido">{ESTADO_RECONVENCION_LABELS.traslado_corrido}</option>
            <option value="contestada">{ESTADO_RECONVENCION_LABELS.contestada}</option>
            <option value="resuelta_por_sentencia">{ESTADO_RECONVENCION_LABELS.resuelta_por_sentencia}</option>
            <option value="desistida">{ESTADO_RECONVENCION_LABELS.desistida}</option>
          </select>
        </div>

        {/* GAP UX-28: cuando el estado es traslado_corrido, pedir la fecha
            del traslado para poder calcular el vencimiento de contestación. */}
        {estado === 'traslado_corrido' && (
          <div>
            <Label>Fecha del traslado corrido *</Label>
            <Input
              type="date"
              value={fechaTrasladoCorrido}
              onChange={e => setFechaTrasladoCorrido(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Día en que el juzgado corrió el traslado. Se usa para calcular el vencimiento del plazo de contestación (15 días hábiles, art. 357 + 338 CPCCN / 356 + 337 CPCC PBA).
            </p>
          </div>
        )}

        <div>
          <Label>Notas internas</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Cualquier observación interna sobre la reconvención."
            className="min-h-[60px]"
          />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 text-[11px] text-fuchsia-800 dark:text-fuchsia-200">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Recordá registrar también el evento <strong>"Demanda reconvencional"</strong> en el timeline procesal — eso dispara el plazo automático de contestación (15 días, art. 358 CPCCN).
          </span>
        </div>
      </div>
    </Modal>
  );
};
