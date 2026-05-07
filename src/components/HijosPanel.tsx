import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  HijoCaso,
  EstadoCud,
  AcompananteTerapeutico,
  ESTADO_CUD_LABELS,
  ACOMPANANTE_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { addYears } from 'date-fns';
import {
  Plus, Pencil, Trash2, Baby, AlertCircle, Calendar, GraduationCap,
  Heart, Scale, Sparkles,
} from 'lucide-react';
import { edadEnAnios } from '../lib/hijosTransicion';

interface HijosPanelProps {
  matterId: string;
}

// Misma lista de opciones que usa el template global de régimen para
// mantener consistencia entre la propuesta unificada y el override por hijo.
const REGIMEN_CUIDADO_OPTS = [
  'Compartido con residencia principal en uno',
  'Compartido alternado',
  'Compartido indistinto',
  'Unipersonal a favor del cliente',
  'Unipersonal a favor del otro',
  'Por determinar',
];

const RESIDENCIA_OPTS = [
  'Domicilio del cónyuge 1 (cliente)',
  'Domicilio del cónyuge 2',
  'Alternado',
  'Por determinar',
];

const tieneRegimenPropio = (h: HijoCaso): boolean =>
  !!(h.regimenCuidado || h.residenciaPrincipal || h.regimenComunicacion || h.motivoRegimenDistinto);

export const HijosPanel: React.FC<HijosPanelProps> = ({ matterId }) => {
  const { hijos, matters, handleCreateHijoCaso, handleUpdateHijoCaso, handleDeleteHijoCaso } = useAppContext();

  // Si este matter es sub-proceso (incidente / apelación), los hijos viven
  // en el expediente raíz (el matter principal del divorcio). El panel lee
  // de ambos y al crear un hijo nuevo lo asocia al matter raíz, no al
  // sub-proceso — así un incidente de aumento de cuota no duplica datos.
  const matter = matters.find(m => m.id === matterId);
  const parentMatterId = matter?.parentMatterId;
  const rootMatterId = parentMatterId ?? matterId;
  const rootMatter = matters.find(m => m.id === rootMatterId);
  const esSubProceso = !!parentMatterId;

  // GAP UX-16: extraemos el régimen general del caso (vive en caseData del
  // matter raíz, cargado desde la ficha de Instrucción) para mostrarlo como
  // referencia al editar el régimen propio de un hijo. Sin esto el usuario
  // tenía que recordar o ir al tab Flujo a buscarlo.
  const regimenGeneral = useMemo(() => {
    const cd = rootMatter?.caseData ?? {};
    const tipoCuidado         = cd.tipo_cuidado?.trim();
    const residenciaPrincipal = cd.residencia_principal?.trim();
    const regimenComunicacion = cd.regimen_comunicacion?.trim();
    const regimenVacaciones   = cd.regimen_vacaciones?.trim();
    if (!tipoCuidado && !residenciaPrincipal && !regimenComunicacion && !regimenVacaciones) {
      return null;
    }
    return { tipoCuidado, residenciaPrincipal, regimenComunicacion, regimenVacaciones };
  }, [rootMatter]);

  const hijosDelMatter = useMemo(() => {
    const ids = parentMatterId ? new Set([matterId, parentMatterId]) : new Set([matterId]);
    return hijos.filter(h => ids.has(h.matterId)).sort((a, b) => a.orden - b.orden);
  }, [hijos, matterId, parentMatterId]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<HijoCaso | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (h: HijoCaso) => { setEditing(h); setIsFormOpen(true); };

  const onDelete = async (h: HijoCaso) => {
    if (!window.confirm(`Eliminar a ${h.nombre} del caso? Esta acción no afecta otros datos del matter.`)) return;
    await handleDeleteHijoCaso(h.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Baby size={16} className="text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Hijos</h3>
            <p className="text-[11px] text-muted-foreground">
              Datos individuales, salud y régimen propio. Las alertas de cumple 18 se calculan automáticamente.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nuevo hijo
        </Button>
      </div>

      {esSubProceso && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-2.5 text-[11px] text-violet-800 dark:text-violet-200 flex items-start gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>
            Los hijos pertenecen al expediente principal — los cambios que hagas acá se ven también desde el caso padre y desde otros sub-procesos.
          </span>
        </div>
      )}

      {hijosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Baby size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            No hay hijos cargados en este caso. Cargá los datos de cada hijo/a — incluyendo discapacidad, terapias y régimen propio cuando corresponda.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {hijosDelMatter.map(h => (
          <HijoCard
            key={h.id}
            hijo={h}
            onEdit={() => openEdit(h)}
            onDelete={() => onDelete(h)}
          />
        ))}
      </div>

      <HijoForm
        isOpen={isFormOpen}
        editing={editing}
        nextOrden={hijosDelMatter.length}
        regimenGeneral={regimenGeneral}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateHijoCaso(editing.id, data);
          } else {
            await handleCreateHijoCaso({ ...data, matterId: rootMatterId } as Omit<HijoCaso, 'id' | 'createdAt' | 'updatedAt'>);
          }
        }}
      />
    </div>
  );
};

// ─── Card individual de un hijo ─────────────────────────────────

const HijoCard: React.FC<{
  hijo: HijoCaso;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ hijo: h, onEdit, onDelete }) => {
  const edad = edadEnAnios(h.fechaNacimiento);
  const fechaCumple18 = (() => {
    try { return addYears(parseISO(h.fechaNacimiento), 18); } catch { return null; }
  })();
  const diasACumplir18 = fechaCumple18
    ? differenceInCalendarDays(fechaCumple18, new Date())
    : null;

  // GAP UX-18: si la transición ya fue gestionada, suprimimos los chips
  // de "cumple 18" — el régimen ya está adaptado.
  const cumple18Pronto = !h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 >= 0 && diasACumplir18 <= 90;
  const recienCumplio18 = !h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 < 0 && diasACumplir18 >= -30;
  const transicionGestionadaRelevante = !!h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 >= -365 && diasACumplir18 <= 90;
  const conRegimenPropio = tieneRegimenPropio(h);
  const tieneSaludEspecial = !!(h.tieneCud === 'si' || h.tieneCud === 'en_tramite' || h.diagnostico || h.terapiasDesc);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-sky-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{h.nombre}</span>
            {edad !== null && (
              <Badge variant="outline" className="text-[9px]">
                {edad} {edad === 1 ? 'año' : 'años'}
              </Badge>
            )}
            {h.dni && (
              <span className="text-[10px] text-muted-foreground font-mono">DNI {h.dni}</span>
            )}
            {tieneSaludEspecial && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-500/10 border-rose-500/30">
                <Heart size={11} />
                {h.tieneCud === 'si' ? 'CUD' : h.tieneCud === 'en_tramite' ? 'CUD en trámite' : 'Salud especial'}
              </span>
            )}
            {conRegimenPropio && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-500/10 border-violet-500/30">
                <Scale size={11} />
                Régimen propio
              </span>
            )}
            {cumple18Pronto && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 border-amber-500/30">
                <Sparkles size={11} />
                Cumple 18 en {diasACumplir18} {diasACumplir18 === 1 ? 'día' : 'días'}
              </span>
            )}
            {recienCumplio18 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-500/15 border-amber-500/40">
                <Sparkles size={11} />
                Recién cumplió 18
              </span>
            )}
            {transicionGestionadaRelevante && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
                title="La transición a mayoría de edad fue marcada como gestionada — el banner R3 no aparece para este hijo."
              >
                <Heart size={11} />
                Transición 18 OK
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {format(parseISO(h.fechaNacimiento), "d 'de' MMMM yyyy", { locale: es })}
            </span>
            {h.escolaridad && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap size={11} />
                {h.escolaridad}{h.establecimiento ? ` · ${h.establecimiento}` : ''}
              </span>
            )}
          </div>

          {h.diagnostico && (
            <div className="text-[11px] text-foreground/90 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
              <span className="font-bold text-rose-700">Diagnóstico:</span> {h.diagnostico}
              {h.acompananteTerapeutico && h.acompananteTerapeutico !== 'no' && (
                <span className="text-muted-foreground"> · AT {ACOMPANANTE_LABELS[h.acompananteTerapeutico].toLowerCase()}</span>
              )}
            </div>
          )}
          {h.terapiasDesc && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-3">
              <span className="not-italic font-bold text-foreground/70">Terapias:</span> {h.terapiasDesc}
            </p>
          )}
          {h.coberturaEspecial && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground/70">Cobertura:</span> {h.coberturaEspecial}
            </p>
          )}

          {conRegimenPropio && (
            <div className="text-[11px] text-foreground/90 bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2 space-y-0.5">
              {h.regimenCuidado && (
                <div><span className="font-bold text-violet-700">Cuidado:</span> {h.regimenCuidado}</div>
              )}
              {h.residenciaPrincipal && (
                <div><span className="font-bold text-violet-700">Residencia:</span> {h.residenciaPrincipal}</div>
              )}
              {h.regimenComunicacion && (
                <div className="text-muted-foreground line-clamp-2">
                  <span className="font-bold text-violet-700 not-italic">Comunicación:</span> {h.regimenComunicacion}
                </div>
              )}
              {h.motivoRegimenDistinto && (
                <div className="text-muted-foreground italic line-clamp-2">
                  <AlertCircle size={11} className="inline -mt-0.5 mr-1" />
                  {h.motivoRegimenDistinto}
                </div>
              )}
            </div>
          )}

          {h.notas && (
            <p className="text-[11px] text-muted-foreground italic">{h.notas}</p>
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

// ─── Form modal ─────────────────────────────────────────────────

interface RegimenGeneral {
  tipoCuidado?: string;
  residenciaPrincipal?: string;
  regimenComunicacion?: string;
  regimenVacaciones?: string;
}

interface HijoFormProps {
  isOpen: boolean;
  editing: HijoCaso | null;
  nextOrden: number;
  regimenGeneral: RegimenGeneral | null;
  onClose: () => void;
  onSave: (data: Partial<HijoCaso>) => Promise<void>;
}

const HijoForm: React.FC<HijoFormProps> = ({ isOpen, editing, nextOrden, regimenGeneral, onClose, onSave }) => {
  const [nombre, setNombre]                       = useState('');
  const [dni, setDni]                             = useState('');
  const [fechaNacimiento, setFechaNacimiento]     = useState('');
  const [escolaridad, setEscolaridad]             = useState('');
  const [establecimiento, setEstablecimiento]     = useState('');
  const [tieneCud, setTieneCud]                   = useState<EstadoCud | ''>('');
  const [diagnostico, setDiagnostico]             = useState('');
  const [terapiasDesc, setTerapiasDesc]           = useState('');
  const [acompanante, setAcompanante]             = useState<AcompananteTerapeutico | ''>('');
  const [coberturaEspecial, setCoberturaEspecial] = useState('');
  const [regimenCuidado, setRegimenCuidado]       = useState('');
  const [residenciaPrincipal, setResidenciaPrincipal] = useState('');
  const [regimenComunicacion, setRegimenComunicacion] = useState('');
  const [motivoRegimenDistinto, setMotivoRegimenDistinto] = useState('');
  const [transicion18Gestionada, setTransicion18Gestionada] = useState(false);
  const [notas, setNotas]                         = useState('');
  const [saving, setSaving]                       = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setDni(editing?.dni ?? '');
    setFechaNacimiento(editing?.fechaNacimiento ?? '');
    setEscolaridad(editing?.escolaridad ?? '');
    setEstablecimiento(editing?.establecimiento ?? '');
    setTieneCud(editing?.tieneCud ?? '');
    setDiagnostico(editing?.diagnostico ?? '');
    setTerapiasDesc(editing?.terapiasDesc ?? '');
    setAcompanante(editing?.acompananteTerapeutico ?? '');
    setCoberturaEspecial(editing?.coberturaEspecial ?? '');
    setRegimenCuidado(editing?.regimenCuidado ?? '');
    setResidenciaPrincipal(editing?.residenciaPrincipal ?? '');
    setRegimenComunicacion(editing?.regimenComunicacion ?? '');
    setMotivoRegimenDistinto(editing?.motivoRegimenDistinto ?? '');
    setTransicion18Gestionada(editing?.transicion18Gestionada ?? false);
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = nombre.trim().length > 0 && fechaNacimiento.trim().length > 0;

  const buildPayload = () => ({
    nombre:                 nombre.trim(),
    dni:                    dni.trim()             || undefined,
    fechaNacimiento:        fechaNacimiento,
    escolaridad:            escolaridad.trim()     || undefined,
    establecimiento:        establecimiento.trim() || undefined,
    tieneCud:               (tieneCud || undefined) as EstadoCud | undefined,
    diagnostico:            diagnostico.trim()     || undefined,
    terapiasDesc:           terapiasDesc.trim()    || undefined,
    acompananteTerapeutico: (acompanante || undefined) as AcompananteTerapeutico | undefined,
    coberturaEspecial:      coberturaEspecial.trim()      || undefined,
    regimenCuidado:         regimenCuidado          || undefined,
    residenciaPrincipal:    residenciaPrincipal     || undefined,
    regimenComunicacion:    regimenComunicacion.trim() || undefined,
    motivoRegimenDistinto:  motivoRegimenDistinto.trim() || undefined,
    transicion18Gestionada: transicion18Gestionada,
    notas:                  notas.trim()           || undefined,
    ...(editing ? {} : { orden: nextOrden }),
  });

  // GAP UX-15: limpia campos individuales del hijo (los que cambian persona
  // a persona) y conserva los del establecimiento — cargar 3 hermanos
  // típicamente comparte colegio/escolaridad pero no nombre, DNI, salud ni
  // régimen propio.
  const resetParaSiguiente = () => {
    setNombre('');
    setDni('');
    setFechaNacimiento('');
    setTieneCud('');
    setDiagnostico('');
    setTerapiasDesc('');
    setAcompanante('');
    setCoberturaEspecial('');
    setRegimenCuidado('');
    setResidenciaPrincipal('');
    setRegimenComunicacion('');
    setMotivoRegimenDistinto('');
    setTransicion18Gestionada(false);
    setNotas('');
    // escolaridad y establecimiento se conservan a propósito.
  };

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave(buildPayload());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave(buildPayload());
      resetParaSiguiente();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar ${editing.nombre}` : 'Nuevo hijo'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          {!editing && (
            <Button
              variant="outline"
              onClick={handleSaveAndAddAnother}
              disabled={saving || !puedeGuardar}
              title="Guardar este hijo y dejar el formulario abierto para cargar otro (mantiene escolaridad y establecimiento)"
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear hijo')}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── Datos básicos ── */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Datos básicos</h4>
          <div>
            <Label>Nombre completo *</Label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Apellido, Nombre"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>DNI</Label>
              <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="12.345.678" />
            </div>
            <div>
              <Label>Fecha de nacimiento *</Label>
              <Input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Escolaridad</Label>
              <Input value={escolaridad} onChange={e => setEscolaridad(e.target.value)} placeholder="Ej: 5° grado" />
            </div>
            <div>
              <Label>Establecimiento</Label>
              <Input value={establecimiento} onChange={e => setEstablecimiento(e.target.value)} placeholder="Nombre del colegio" />
            </div>
          </div>
        </section>

        {/* ── Salud y terapias (R1) ── */}
        <section className="space-y-3 border-t border-border/40 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-700">Salud y terapias</h4>
              <p className="text-[11px] text-muted-foreground">Solo cuando aplique. Estos datos sostienen pedidos de régimen especial, atribución de vivienda y cuota diferenciada.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>¿Tiene CUD?</Label>
              <select
                value={tieneCud}
                onChange={e => setTieneCud(e.target.value as EstadoCud | '')}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="">No aplica / sin dato</option>
                <option value="si">{ESTADO_CUD_LABELS.si}</option>
                <option value="no">{ESTADO_CUD_LABELS.no}</option>
                <option value="en_tramite">{ESTADO_CUD_LABELS.en_tramite}</option>
              </select>
            </div>
            <div>
              <Label>Acompañante terapéutico</Label>
              <select
                value={acompanante}
                onChange={e => setAcompanante(e.target.value as AcompananteTerapeutico | '')}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="">No aplica / sin dato</option>
                <option value="escolar">{ACOMPANANTE_LABELS.escolar}</option>
                <option value="domiciliario">{ACOMPANANTE_LABELS.domiciliario}</option>
                <option value="no">{ACOMPANANTE_LABELS.no}</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Diagnóstico</Label>
            <Input value={diagnostico} onChange={e => setDiagnostico(e.target.value)} placeholder='Ej: "TEA nivel 1", "Síndrome de Down", etc.' />
          </div>
          <div>
            <Label>Terapias (prestador, frecuencia, costo)</Label>
            <Textarea
              value={terapiasDesc}
              onChange={e => setTerapiasDesc(e.target.value)}
              placeholder="Ej: TO con Lic. Pérez 2x/sem $280.000/mes; Fonoaudiología con Lic. Gómez 1x/sem $150.000/mes; AT escolar 4hs/día $250.000/mes."
              className="min-h-[80px]"
            />
          </div>
          <div>
            <Label>Cobertura especial</Label>
            <Input
              value={coberturaEspecial}
              onChange={e => setCoberturaEspecial(e.target.value)}
              placeholder="Ej: Ley 24.901, OSDE 410, IOMA con régimen especial"
            />
          </div>
        </section>

        {/* ── Régimen propio (R2) ── */}
        <section className="space-y-3 border-t border-border/40 pt-5">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700">Régimen propio del hijo</h4>
            <p className="text-[11px] text-muted-foreground">Opcional. Solo cargar si este hijo tiene un régimen distinto al unificado del caso (ej. recomendación del equipo terapéutico, edad, opinión del menor).</p>
          </div>

          {/* GAP UX-16: mini-resumen del régimen general del caso, como
              referencia para decidir qué overridear. Lee de caseData del
              matter raíz (cargado desde la ficha de Instrucción). */}
          {regimenGeneral && (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-[11px] space-y-0.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Régimen general del caso (referencia)
              </div>
              {regimenGeneral.tipoCuidado && (
                <div><span className="font-bold text-foreground/80">Cuidado:</span> <span className="text-foreground/90">{regimenGeneral.tipoCuidado}</span></div>
              )}
              {regimenGeneral.residenciaPrincipal && (
                <div><span className="font-bold text-foreground/80">Residencia:</span> <span className="text-foreground/90">{regimenGeneral.residenciaPrincipal}</span></div>
              )}
              {regimenGeneral.regimenComunicacion && (
                <div className="line-clamp-2"><span className="font-bold text-foreground/80">Comunicación:</span> <span className="text-foreground/90">{regimenGeneral.regimenComunicacion}</span></div>
              )}
              {regimenGeneral.regimenVacaciones && (
                <div className="line-clamp-2"><span className="font-bold text-foreground/80">Vacaciones:</span> <span className="text-foreground/90">{regimenGeneral.regimenVacaciones}</span></div>
              )}
              <p className="text-[10px] text-muted-foreground italic mt-1">
                Dejá los campos en blanco para que este hijo siga el régimen general. Cargá solo lo que difiere.
              </p>
            </div>
          )}
          <div>
            <Label>Cuidado personal (override)</Label>
            <select
              value={regimenCuidado}
              onChange={e => setRegimenCuidado(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">Usar régimen general</option>
              {REGIMEN_CUIDADO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <Label>Residencia principal (override)</Label>
            <select
              value={residenciaPrincipal}
              onChange={e => setResidenciaPrincipal(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">Usar régimen general</option>
              {RESIDENCIA_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <Label>Régimen de comunicación (override)</Label>
            <Textarea
              value={regimenComunicacion}
              onChange={e => setRegimenComunicacion(e.target.value)}
              placeholder="Ej: Régimen progresivo: dos meses con visitas diurnas de 4hs los sábados, luego pernoctes alternos."
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label>Motivo del régimen distinto</Label>
            <Textarea
              value={motivoRegimenDistinto}
              onChange={e => setMotivoRegimenDistinto(e.target.value)}
              placeholder="Ej: Recomendación del equipo terapéutico (TEA, cambio gradual de rutinas)."
              className="min-h-[60px]"
            />
          </div>
        </section>

        {/* ── Transición a mayoría de edad gestionada (GAP UX-18) ── */}
        <section className="border-t border-border/40 pt-5">
          <label className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
            <input
              type="checkbox"
              checked={transicion18Gestionada}
              onChange={e => setTransicion18Gestionada(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <div className="text-[11px] text-amber-800 dark:text-amber-200 space-y-0.5">
              <span className="font-bold">Transición a mayoría de edad gestionada</span>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                Marcá cuando ya adaptaste el régimen para este hijo (deshabilitar cuidado, dejar solo alimentos art. 663 CCyCN). Mientras esté marcado, el banner de "cumple 18" no aparece para este hijo aunque la fecha lo justifique.
              </p>
            </div>
          </label>
        </section>

        {/* ── Notas ── */}
        <section className="border-t border-border/40 pt-5">
          <Label>Notas internas</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Cualquier información adicional relevante."
            className="min-h-[60px]"
          />
        </section>
      </div>
    </Modal>
  );
};
