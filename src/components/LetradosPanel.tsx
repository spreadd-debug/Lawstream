import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { LetradoParte, RolLetrado, EstadoLetrado } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { Scale, Plus, Trash2, Pencil, Replace, Mail, Phone, MapPin, Clock, CheckCircle2 } from 'lucide-react';

interface LetradosPanelProps {
  matterId: string;
}

const ROL_OPTS: { value: RolLetrado; label: string }[] = [
  { value: 'contraparte', label: 'Contraparte' },
  { value: 'tercero',     label: 'Tercero' },
  { value: 'fiscalia',    label: 'Fiscalía' },
  { value: 'defensoria',  label: 'Defensoría' },
  { value: 'otra',        label: 'Otra' },
];

const ESTADO_INFO: Record<EstadoLetrado, { label: string; color: string }> = {
  vigente:     { label: 'Vigente',     color: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' },
  renunciante: { label: 'Renunciante', color: 'text-amber-700 bg-amber-500/10 border-amber-500/30' },
  cesado:      { label: 'Cesado',      color: 'text-muted-foreground bg-muted/30 border-border/40' },
  sustituido:  { label: 'Sustituido',  color: 'text-muted-foreground bg-muted/30 border-border/40' },
};

const labelRol = (r: RolLetrado) => ROL_OPTS.find(o => o.value === r)?.label ?? r;

export const LetradosPanel: React.FC<LetradosPanelProps> = ({ matterId }) => {
  const { letrados, handleCreateLetrado, handleUpdateLetrado, handleDeleteLetrado, handleSustituirLetrado } = useAppContext();

  const letradosDelMatter = useMemo(
    () => letrados.filter(l => l.matterId === matterId),
    [letrados, matterId],
  );

  const vigentes = useMemo(
    () => letradosDelMatter.filter(l => l.estado === 'vigente').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [letradosDelMatter],
  );
  const historicos = useMemo(
    () => letradosDelMatter.filter(l => l.estado !== 'vigente').sort((a, b) => (b.fechaCese ?? b.updatedAt).localeCompare(a.fechaCese ?? a.updatedAt)),
    [letradosDelMatter],
  );

  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [editing, setEditing]               = useState<LetradoParte | null>(null);
  const [sustituirOf, setSustituirOf]       = useState<LetradoParte | null>(null);

  const openNew     = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit    = (l: LetradoParte) => { setEditing(l); setIsFormOpen(true); };
  const openSustituir = (l: LetradoParte) => setSustituirOf(l);

  const onDelete = async (l: LetradoParte) => {
    if (!window.confirm(`Eliminar al letrado "${l.nombre}"? Esta acción borra el registro completo. Si el letrado renunció, mejor usá "Sustituir" para preservar el histórico.`)) return;
    await handleDeleteLetrado(l.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Scale size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Letrados de la parte / contraparte</h3>
            <p className="text-[11px] text-muted-foreground">Datos estructurados con histórico de cambios</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nuevo letrado
        </Button>
      </div>

      {letradosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Scale size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin letrados cargados. Cuando conozcas al apoderado de la contraparte (típicamente al recibir la contestación de demanda), agregálo acá con su matrícula y datos de contacto.
          </p>
        </div>
      )}

      {/* Vigentes */}
      {vigentes.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Vigentes</div>
          {vigentes.map(l => (
            <LetradoCard
              key={l.id}
              letrado={l}
              onEdit={() => openEdit(l)}
              onDelete={() => onDelete(l)}
              onSustituir={() => openSustituir(l)}
            />
          ))}
        </div>
      )}

      {/* Histórico */}
      {historicos.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
            <Clock size={11} />
            Histórico ({historicos.length})
          </div>
          {historicos.map(l => (
            <LetradoCard
              key={l.id}
              letrado={l}
              onEdit={() => openEdit(l)}
              onDelete={() => onDelete(l)}
              historico
            />
          ))}
        </div>
      )}

      <LetradoForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editing={editing}
        matterId={matterId}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateLetrado(editing.id, data);
          } else {
            await handleCreateLetrado({ ...data, matterId } as Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />

      <SustituirModal
        isOpen={sustituirOf !== null}
        onClose={() => setSustituirOf(null)}
        actual={sustituirOf}
        matterId={matterId}
        onConfirm={async (nuevoLetrado, fechaCese, motivo) => {
          if (!sustituirOf) return;
          await handleSustituirLetrado(sustituirOf.id, nuevoLetrado, fechaCese, motivo);
          setSustituirOf(null);
        }}
      />
    </div>
  );
};

// ─── Card de un letrado ──────────────────────────────────────────

const LetradoCard: React.FC<{
  letrado: LetradoParte;
  onEdit: () => void;
  onDelete: () => void;
  onSustituir?: () => void;
  historico?: boolean;
}> = ({ letrado: l, onEdit, onDelete, onSustituir, historico }) => {
  const estadoInfo = ESTADO_INFO[l.estado];
  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-colors",
      historico ? "border-border/40 bg-muted/20 opacity-80" : "border-border/60 bg-card hover:border-indigo-500/30",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{l.nombre}</span>
            <Badge variant="default" className="text-[9px]">{labelRol(l.representaA)}</Badge>
            {l.matricula && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {l.matricula}{l.colegio ? ` · ${l.colegio}` : ''}
              </span>
            )}
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', estadoInfo.color)}>
              {estadoInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
            {l.email    && <span className="inline-flex items-center gap-1"><Mail   size={11} />{l.email}</span>}
            {l.telefono && <span className="inline-flex items-center gap-1"><Phone  size={11} />{l.telefono}</span>}
            {l.domicilioLegal && <span className="inline-flex items-center gap-1"><MapPin size={11} />{l.domicilioLegal}</span>}
          </div>

          {l.domicilioElectronico && (
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              CUIT/CUIL (PJN/MEV): {l.domicilioElectronico}
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
            {l.fechaDesignacion && <span>Designado: {l.fechaDesignacion}</span>}
            {l.fechaCese        && <span>Cese: {l.fechaCese}</span>}
          </div>

          {l.motivoCese && (
            <p className="text-[11px] text-muted-foreground italic mt-1.5">
              <strong>Motivo del cese:</strong> {l.motivoCese}
            </p>
          )}
          {l.notas && !l.motivoCese && (
            <p className="text-[11px] text-muted-foreground italic mt-1.5">{l.notas}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onSustituir && !historico && (
            <button
              onClick={onSustituir}
              className="p-1.5 rounded-md hover:bg-amber-500/10 text-muted-foreground hover:text-amber-700 transition-colors"
              title="Sustituir por nuevo letrado (preserva histórico)"
            >
              <Replace size={14} />
            </button>
          )}
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

// ─── Form crear/editar letrado ───────────────────────────────────

const LetradoForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  editing: LetradoParte | null;
  matterId: string;
  onSave: (data: Partial<LetradoParte>) => Promise<void>;
}> = ({ isOpen, onClose, editing, onSave }) => {
  const [nombre, setNombre]                             = useState(editing?.nombre ?? '');
  const [matricula, setMatricula]                       = useState(editing?.matricula ?? '');
  const [colegio, setColegio]                           = useState(editing?.colegio ?? '');
  const [email, setEmail]                               = useState(editing?.email ?? '');
  const [telefono, setTelefono]                         = useState(editing?.telefono ?? '');
  const [domicilioLegal, setDomicilioLegal]             = useState(editing?.domicilioLegal ?? '');
  const [domicilioElectronico, setDomicilioElectronico] = useState(editing?.domicilioElectronico ?? '');
  const [representaA, setRepresentaA]                   = useState<RolLetrado>(editing?.representaA ?? 'contraparte');
  const [estado, setEstado]                             = useState<EstadoLetrado>(editing?.estado ?? 'vigente');
  const [fechaDesignacion, setFechaDesignacion]         = useState(editing?.fechaDesignacion ?? '');
  const [fechaCese, setFechaCese]                       = useState(editing?.fechaCese ?? '');
  const [motivoCese, setMotivoCese]                     = useState(editing?.motivoCese ?? '');
  const [notas, setNotas]                               = useState(editing?.notas ?? '');
  const [saving, setSaving]                             = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setMatricula(editing?.matricula ?? '');
    setColegio(editing?.colegio ?? '');
    setEmail(editing?.email ?? '');
    setTelefono(editing?.telefono ?? '');
    setDomicilioLegal(editing?.domicilioLegal ?? '');
    setDomicilioElectronico(editing?.domicilioElectronico ?? '');
    setRepresentaA(editing?.representaA ?? 'contraparte');
    setEstado(editing?.estado ?? 'vigente');
    setFechaDesignacion(editing?.fechaDesignacion ?? '');
    setFechaCese(editing?.fechaCese ?? '');
    setMotivoCese(editing?.motivoCese ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const handleSubmit = async () => {
    if (!nombre.trim()) return;
    setSaving(true);
    try {
      await onSave({
        nombre:               nombre.trim(),
        matricula:            matricula.trim() || undefined,
        colegio:              colegio.trim()   || undefined,
        email:                email.trim()     || undefined,
        telefono:             telefono.trim()  || undefined,
        domicilioLegal:       domicilioLegal.trim()       || undefined,
        domicilioElectronico: domicilioElectronico.trim() || undefined,
        representaA,
        estado,
        fechaDesignacion: fechaDesignacion || undefined,
        fechaCese:        fechaCese        || undefined,
        motivoCese:       motivoCese.trim()    || undefined,
        notas:            notas.trim()         || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar letrado' : 'Nuevo letrado'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear letrado')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nombre completo</Label>
          <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Dr. Pedro Kasmir" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Matrícula</Label>
            <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="T° 45 F° 234" />
          </div>
          <div>
            <Label>Colegio</Label>
            <Input value={colegio} onChange={e => setColegio(e.target.value)} placeholder="CASI / CPACF / CALP" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="letrado@email.com" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="11 5555-5555" />
          </div>
        </div>

        <div>
          <Label>Domicilio legal</Label>
          <Input value={domicilioLegal} onChange={e => setDomicilioLegal(e.target.value)} placeholder="Av. de Mayo 1500, CABA" />
        </div>
        <div>
          <Label>Domicilio electrónico (CUIT/CUIL para PJN/MEV)</Label>
          <Input value={domicilioElectronico} onChange={e => setDomicilioElectronico(e.target.value)} placeholder="20-12345678-9" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Representa a</Label>
            <select
              value={representaA}
              onChange={e => setRepresentaA(e.target.value as RolLetrado)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {ROL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Estado</Label>
            <select
              value={estado}
              onChange={e => setEstado(e.target.value as EstadoLetrado)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="vigente">Vigente</option>
              <option value="renunciante">Renunciante</option>
              <option value="cesado">Cesado</option>
              <option value="sustituido">Sustituido</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha designación</Label>
            <Input type="date" value={fechaDesignacion} onChange={e => setFechaDesignacion(e.target.value)} />
          </div>
          <div>
            <Label>Fecha cese</Label>
            <Input
              type="date"
              value={fechaCese}
              onChange={e => setFechaCese(e.target.value)}
              disabled={estado === 'vigente'}
            />
          </div>
        </div>

        {estado !== 'vigente' && (
          <div>
            <Label>Motivo del cese</Label>
            <Input value={motivoCese} onChange={e => setMotivoCese(e.target.value)} placeholder="Renuncia, sustitución, fallecimiento…" />
          </div>
        )}

        <div>
          <Label>Notas (opcional)</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Notas operativas: estilo de litigio, contactos preferidos, antecedentes…"
            rows={2}
          />
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal "Sustituir por nuevo letrado" ─────────────────────────

const SustituirModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  actual: LetradoParte | null;
  matterId: string;
  onConfirm: (
    nuevoLetrado: Omit<LetradoParte, 'id' | 'createdAt' | 'updatedAt'>,
    fechaCese: string,
    motivo?: string,
  ) => Promise<void>;
}> = ({ isOpen, onClose, actual, matterId, onConfirm }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [nombre, setNombre]                 = useState('');
  const [matricula, setMatricula]           = useState('');
  const [colegio, setColegio]               = useState('');
  const [email, setEmail]                   = useState('');
  const [telefono, setTelefono]             = useState('');
  const [fechaCese, setFechaCese]           = useState(today);
  const [motivo, setMotivo]                 = useState('');
  const [saving, setSaving]                 = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre('');
    setMatricula('');
    setColegio(actual?.colegio ?? '');
    setEmail('');
    setTelefono('');
    setFechaCese(today);
    setMotivo('');
  }, [isOpen, actual]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!actual || !nombre.trim()) return;
    setSaving(true);
    try {
      await onConfirm({
        matterId,
        nombre:           nombre.trim(),
        matricula:        matricula.trim() || undefined,
        colegio:          colegio.trim()   || undefined,
        email:            email.trim()     || undefined,
        telefono:         telefono.trim()  || undefined,
        representaA:      actual.representaA,
        estado:           'vigente',
        fechaDesignacion: fechaCese,
      }, fechaCese, motivo);
    } finally {
      setSaving(false);
    }
  };

  if (!actual) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Sustituir letrado"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !nombre.trim()}>
            {saving ? 'Guardando…' : 'Confirmar sustitución'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <p className="text-[11px] text-muted-foreground">
            <strong className="text-foreground">{actual.nombre}</strong>
            {actual.matricula && <> ({actual.matricula})</>} pasará a estado
            <strong className="text-foreground"> "Sustituido"</strong> y se creará
            un nuevo letrado vigente con los datos de abajo. El histórico queda preservado.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha de cese</Label>
            <Input type="date" value={fechaCese} onChange={e => setFechaCese(e.target.value)} />
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Renuncia, sustitución…" />
          </div>
        </div>

        <div className="border-t border-border/40 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Datos del nuevo letrado</p>
          <div className="space-y-3">
            <div>
              <Label>Nombre completo</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Dr. Sebastián Vera" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Matrícula</Label>
                <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="T° 50 F° 123" />
              </div>
              <div>
                <Label>Colegio</Label>
                <Input value={colegio} onChange={e => setColegio(e.target.value)} placeholder="CASI" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={telefono} onChange={e => setTelefono(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LetradosPanel;
