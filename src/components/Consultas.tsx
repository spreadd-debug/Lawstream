import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from './UI';
import { Consultation, Presupuesto, UserProfile } from '../types';
import {
  Search,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  UserPlus,
  ChevronRight,
  Clock,
  X,
  FileText,
  User,
  ExternalLink,
  Zap,
  AlertCircle,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  StickyNote,
  Send,
  Trash2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { fetchPresupuestoByConsultation, updateConsultation, fetchConsultaValor } from '../lib/db';
import { PresupuestoEditor } from './PresupuestoEditor';
import { PresupuestoDetail } from './PresupuestoDetail';
import { NuevaConsultaForm } from './NuevaConsultaForm';

interface ConsultasProps {
  consultations: Consultation[];
  profiles?: UserProfile[];
  onConvertToMatter: (data: any) => void;
  onUpdateConsultation?: (id: string, changes: Partial<Consultation>) => void;
  onCreateConsultation?: (data: Omit<Consultation, 'id'>) => Promise<void>;
}

// ── StatusBadge ──────────────────────────────────────────────────
// Defined here (before pipeline) so it can be used inside ConsultationPipeline

const StatusBadge = ({ status }: { status: Consultation['status'] }) => {
  const styles: Record<string, string> = {
    'Nueva': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'Contactada': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    'Esperando info': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Evaluando viabilidad': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    'Presupuestada': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Aceptada': 'bg-emerald-600 text-white border-emerald-600',
    'Rechazada': 'bg-muted text-muted-foreground border-border',
    'Archivada': 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.15em] border text-center',
      styles[status]
    )}>
      {status}
    </span>
  );
};

// ── Próxima acción automática por estado ─────────────────────────

export const NEXT_STEP_BY_STATUS: Record<Consultation['status'], string> = {
  'Nueva':                'Agendar entrevista inicial',
  'Contactada':           'Realizar entrevista y cobrar consulta',
  'Esperando info':       'Esperar documentación del cliente',
  'Evaluando viabilidad': 'Elaborar presupuesto de honorarios',
  'Presupuestada':        'Aguardar respuesta del cliente',
  'Aceptada':             'Convertir en asunto y comenzar',
  'Rechazada':            'Consulta cerrada',
  'Archivada':            'Consulta archivada',
};

// ── Pipeline stages ──────────────────────────────────────────────

const PIPELINE_STAGES: { key: Consultation['status']; label: string }[] = [
  { key: 'Nueva',                label: 'Nueva' },
  { key: 'Contactada',           label: 'Contactada' },
  { key: 'Evaluando viabilidad', label: 'Evaluando' },
  { key: 'Presupuestada',        label: 'Presupuestada' },
  { key: 'Aceptada',             label: 'Aceptada' },
];

const STATUS_TO_STAGE_IDX: Record<string, number> = {
  'Nueva': 0,
  'Contactada': 1,
  'Esperando info': 1,
  'Evaluando viabilidad': 2,
  'Presupuestada': 3,
  'Aceptada': 4,
};

interface PipelineProps {
  consultation: Consultation;
  onStatusChange: (s: Consultation['status']) => void;
  onOpenPresupuesto: () => void;
  onConvertToMatter: () => void;
  onMarkFeePaid: (formaPago: 'Efectivo' | 'Transferencia') => void;
  onUnmarkFeePaid: () => void;
}

const ConsultationPipeline: React.FC<PipelineProps> = ({
  consultation, onStatusChange, onOpenPresupuesto, onConvertToMatter, onMarkFeePaid, onUnmarkFeePaid,
}) => {
  const [showManual, setShowManual]           = useState(false);
  const [interviewMethod, setInterviewMethod] = useState<'Efectivo' | 'Transferencia'>('Transferencia');

  const isClosed = consultation.status === 'Rechazada' || consultation.status === 'Archivada';
  const stageIdx = STATUS_TO_STAGE_IDX[consultation.status] ?? 0;

  // En Contactada, la entrevista es el paso bloqueante
  const needsInterview = consultation.status === 'Contactada' && !consultation.consultationFeePaid;

  if (isClosed) {
    return (
      <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={consultation.status} />
          <span className="text-xs font-bold text-muted-foreground">Esta consulta está cerrada.</span>
        </div>
        <button
          onClick={() => onStatusChange('Nueva')}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
        >
          <RotateCcw size={12} /> Reactivar consulta
        </button>
      </div>
    );
  }

  type NextAction = {
    desc: string;
    label: string;
    action: () => void;
    secondary?: { label: string; action: () => void } | null;
    danger?: { label: string; action: () => void };
  };

  const getNextAction = (): NextAction | null => {
    if (needsInterview) return null; // bloqueado — se muestra el form de entrevista

    switch (consultation.status) {
      case 'Nueva':
        return {
          desc: 'El primer paso es establecer contacto con el potencial cliente.',
          label: 'Marcar como Contactada',
          action: () => onStatusChange('Contactada'),
        };
      case 'Contactada':
        // Acá solo llega si ya pagó la entrevista
        return {
          desc: 'Entrevista realizada y cobrada. Pasá a evaluar la viabilidad del caso.',
          label: 'Pasar a Evaluación del caso',
          action: () => onStatusChange('Evaluando viabilidad'),
        };
      case 'Esperando info':
        return {
          desc: 'El cliente va a aportar información adicional. Cuando la tengas, evaluá el caso.',
          label: 'Comenzar Evaluación del caso',
          action: () => onStatusChange('Evaluando viabilidad'),
        };
      case 'Evaluando viabilidad':
        return {
          desc: 'Elaborá el presupuesto de honorarios para presentar al cliente (Ley 14.967).',
          label: 'Preparar Presupuesto de Honorarios',
          action: onOpenPresupuesto,
        };
      case 'Presupuestada':
        return {
          desc: 'El presupuesto fue presentado al cliente. ¿Cuál fue su respuesta?',
          label: 'El cliente aceptó',
          action: () => onStatusChange('Aceptada'),
          danger: { label: 'El cliente rechazó', action: () => onStatusChange('Rechazada') },
        };
      case 'Aceptada':
        return {
          desc: 'Todo listo. Podés crear el asunto judicial y comenzar a trabajar.',
          label: 'Convertir en Asunto',
          action: onConvertToMatter,
        };
      default:
        return null;
    }
  };

  const next = getNextAction();

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-start">
        {PIPELINE_STAGES.map((stage, i) => (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
              <div className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all',
                i < stageIdx  ? 'bg-primary border-primary text-white' :
                i === stageIdx ? 'bg-primary/10 border-primary text-primary ring-2 ring-primary/20 ring-offset-1' :
                'bg-muted border-border text-muted-foreground opacity-40'
              )}>
                {i < stageIdx ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-[8px] font-black uppercase tracking-wider text-center leading-tight',
                i === stageIdx ? 'text-primary' : i < stageIdx ? 'text-foreground/60' : 'text-muted-foreground opacity-40'
              )}>
                {stage.label}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={cn(
                'h-0.5 mt-3.5 transition-all',
                i < stageIdx ? 'bg-primary' : 'bg-border opacity-40'
              )} style={{ flex: 1 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Paso bloqueante: entrevista inicial */}
      {needsInterview && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-2xl space-y-4">
          <div className="flex items-start gap-2">
            <ArrowRight size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                Registrar entrevista inicial
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-0.5 leading-relaxed">
                Confirmá si la entrevista fue realizada y cobrada para continuar con el caso.
              </p>
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Método de cobro</p>
            <div className="flex gap-2">
              {(['Efectivo', 'Transferencia'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setInterviewMethod(m)}
                  className={cn(
                    'flex-1 py-2 rounded-xl border text-xs font-black transition-all',
                    interviewMethod === m
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-border bg-background text-muted-foreground hover:border-amber-400'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => onMarkFeePaid(interviewMethod)}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black gap-2"
            size="sm"
          >
            <CheckCircle2 size={14} /> Confirmar entrevista cobrada ({interviewMethod})
          </Button>
        </div>
      )}

      {/* Entrevista ya cobrada — badge compacto */}
      {consultation.status !== 'Nueva' && consultation.consultationFeePaid && (
        <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Entrevista cobrada
            </span>
            {consultation.consultationFeeFormaPago && (
              <span className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wider">
                · {consultation.consultationFeeFormaPago}
              </span>
            )}
            {consultation.consultationFeeSnapshot && (
              <span className="text-[9px] font-bold text-emerald-600/70">
                · ${consultation.consultationFeeSnapshot.toLocaleString('es-AR')}
              </span>
            )}
          </div>
          <button
            onClick={onUnmarkFeePaid}
            className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors underline"
          >
            deshacer
          </button>
        </div>
      )}

      {/* Next action card */}
      {next && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
          <div className="flex items-start gap-2">
            <ArrowRight size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-foreground leading-relaxed">{next.desc}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              onClick={next.action}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              {next.label}
            </Button>
            {next.secondary && (
              <Button onClick={next.secondary.action} variant="outline" size="sm" className="w-full text-xs">
                {next.secondary.label}
              </Button>
            )}
            {next.danger && (
              <Button
                onClick={next.danger.action}
                variant="outline"
                size="sm"
                className="w-full text-rose-600 border-rose-200 hover:bg-rose-500/5 dark:border-rose-900 text-xs"
              >
                {next.danger.label}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Manual status toggle */}
      <button
        onClick={() => setShowManual(v => !v)}
        className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight size={10} className={cn('transition-transform', showManual && 'rotate-90')} />
        Cambiar estado manualmente
      </button>
      {showManual && (
        <div className="flex flex-wrap gap-1.5">
          {(['Nueva', 'Contactada', 'Esperando info', 'Evaluando viabilidad', 'Presupuestada', 'Aceptada', 'Rechazada', 'Archivada'] as Consultation['status'][]).map(s => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                'transition-all',
                consultation.status === s ? 'ring-2 ring-primary ring-offset-1 rounded' : 'opacity-50 hover:opacity-80'
              )}
            >
              <StatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────

export const Consultas = ({ consultations, profiles = [], onConvertToMatter, onUpdateConsultation, onCreateConsultation }: ConsultasProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todas');
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [loadingPresupuesto, setLoadingPresupuesto] = useState(false);
  const [showPresupuestoForm, setShowPresupuestoForm] = useState(false);
  const [showNuevaConsulta, setShowNuevaConsulta]     = useState(false);
  const [noteInput, setNoteInput]                     = useState('');
  const [savingNote, setSavingNote]                   = useState(false);

  useEffect(() => {
    setNoteInput('');
    if (!selectedConsultation) { setPresupuesto(null); return; }
    setLoadingPresupuesto(true);
    fetchPresupuestoByConsultation(selectedConsultation.id)
      .then(setPresupuesto)
      .finally(() => setLoadingPresupuesto(false));
  }, [selectedConsultation?.id]);

  const handleMarkFeePaid = async (consultation: Consultation, formaPago: 'Efectivo' | 'Transferencia') => {
    const feeSnapshot = await fetchConsultaValor();
    const changes: Partial<Consultation> = {
      consultationFeePaid:        true,
      consultationFeeSnapshot:    feeSnapshot || undefined,
      consultationFeeFormaPago:   formaPago,
      // Ahora que la entrevista está cobrada, el siguiente paso es avanzar a evaluación
      nextStep: 'Pasar a Evaluación de viabilidad del caso',
    };
    await updateConsultation(consultation.id, changes);
    const updated = { ...consultation, ...changes };
    setSelectedConsultation(updated);
    onUpdateConsultation?.(consultation.id, changes);
  };

  const handleUnmarkFeePaid = async (consultation: Consultation) => {
    const changes: Partial<Consultation> = {
      consultationFeePaid:        false,
      consultationFeeSnapshot:    undefined,
      consultationFeeFormaPago:   undefined,
      // Al deshacer, volver al nextStep del estado actual
      nextStep: NEXT_STEP_BY_STATUS[consultation.status],
    };
    await updateConsultation(consultation.id, changes);
    const updated = { ...consultation, ...changes };
    setSelectedConsultation(updated);
    onUpdateConsultation?.(consultation.id, changes);
  };

  const handleAddNote = async (consultation: Consultation) => {
    const text = noteInput.trim();
    if (!text) return;
    setSavingNote(true);
    try {
      const now    = new Date();
      const stamp  = format(now, "dd/MM HH:mm", { locale: es });
      const entry  = `[${stamp}] ${text}`;
      const updated_notes = [...(consultation.notes ?? []), entry];
      await updateConsultation(consultation.id, { notes: updated_notes });
      const updated = { ...consultation, notes: updated_notes };
      setSelectedConsultation(updated);
      onUpdateConsultation?.(consultation.id, { notes: updated_notes });
      setNoteInput('');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (consultation: Consultation, idx: number) => {
    const updated_notes = (consultation.notes ?? []).filter((_, i) => i !== idx);
    await updateConsultation(consultation.id, { notes: updated_notes });
    const updated = { ...consultation, notes: updated_notes };
    setSelectedConsultation(updated);
    onUpdateConsultation?.(consultation.id, { notes: updated_notes });
  };

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                         (c.type?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = filterStatus === 'Todas' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    nuevas: consultations.filter(c => c.status === 'Nueva').length,
    enProceso: consultations.filter(c => ['Contactada', 'Esperando info', 'Evaluando viabilidad'].includes(c.status)).length,
    presupuestadas: consultations.filter(c => c.status === 'Presupuestada').length,
  };

  const handleConvert = (consultation: Consultation) => {
    onConvertToMatter({
      title:             consultation.description || `Asunto: ${consultation.name}`,
      client:            consultation.name,
      clientEmail:       consultation.email,
      clientPhone:       consultation.phone,
      type:              consultation.type || 'Civil',
      description:       consultation.description,
      fromConsultationId: consultation.id,
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto relative">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Bandeja de Consultas</h1>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
            Gestión de leads y nuevos asuntos potenciales
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          onClick={() => setShowNuevaConsulta(true)}
        >
          <Plus size={16} />
          <span>Nueva Consulta</span>
        </Button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Nuevas" count={stats.nuevas} color="rose" />
        <StatCard label="En Seguimiento" count={stats.enProceso} color="amber" />
        <StatCard label="Presupuestadas" count={stats.presupuestadas} color="sky" />
      </div>

      {/* Filters & Search */}
      <Card className="p-4 border border-border bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="Buscar por nombre, tema o descripción..." 
              className="pl-10 bg-background/50 border-border/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {['Todas', 'Nueva', 'Contactada', 'Esperando info', 'Presupuestada', 'Aceptada', 'Rechazada'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap border",
                  filterStatus === status 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {filteredConsultations.length > 0 ? (
          filteredConsultations.map((consultation) => (
            <ConsultationItem 
              key={consultation.id} 
              consultation={consultation} 
              onClick={() => setSelectedConsultation(consultation)}
              onConvert={() => handleConvert(consultation)}
            />
          ))
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/5">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="text-muted-foreground/30" size={40} />
            </div>
            {filterStatus === 'Todas' && !searchTerm ? (
              <>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Todavía no hay consultas</h3>
                <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto mt-2">
                  Empezá registrando la primera consulta de un potencial cliente.
                </p>
                <Button
                  className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-10 px-6 rounded-xl text-[11px] font-black uppercase tracking-widest"
                  onClick={() => setShowNuevaConsulta(true)}
                >
                  <Plus size={14} />
                  Nueva Consulta
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Sin resultados</h3>
                <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto mt-2">
                  {searchTerm
                    ? `No hay consultas que coincidan con "${searchTerm}".`
                    : `No hay consultas en estado "${filterStatus}".`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-8 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl"
                  onClick={() => { setSearchTerm(''); setFilterStatus('Todas'); }}
                >
                  Ver todas las consultas
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Consultation Detail Drawer */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setSelectedConsultation(null)}
          />
          <div className="relative w-full max-w-xl bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <header className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black tracking-tight">{selectedConsultation.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selectedConsultation.status} />
                  {selectedConsultation.type && (
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{selectedConsultation.type}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedConsultation(null)}
                className="p-2 hover:bg-muted rounded-full transition-colors ml-2 shrink-0"
              >
                <X size={20} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* ── Pipeline flow ── */}
              <ConsultationPipeline
                consultation={selectedConsultation}
                onStatusChange={async (s) => {
                  const nextStep = NEXT_STEP_BY_STATUS[s];
                  await updateConsultation(selectedConsultation.id, { status: s, nextStep });
                  const updated = { ...selectedConsultation, status: s, nextStep };
                  setSelectedConsultation(updated);
                  onUpdateConsultation?.(selectedConsultation.id, { status: s, nextStep });
                }}
                onOpenPresupuesto={() => setShowPresupuestoForm(true)}
                onConvertToMatter={() => handleConvert(selectedConsultation)}
                onMarkFeePaid={(m) => handleMarkFeePaid(selectedConsultation, m)}
                onUnmarkFeePaid={() => handleUnmarkFeePaid(selectedConsultation)}
              />

              {/* Data Sufficiency Check */}
              {(!selectedConsultation.description || !selectedConsultation.type || !selectedConsultation.email) && (
                <section className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Datos incompletos</span>
                  </div>
                  <div className="space-y-1.5">
                    {!selectedConsultation.description && <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-wide">• Falta descripción del caso</p>}
                    {!selectedConsultation.type && <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-wide">• Falta definir rama del derecho</p>}
                    {!selectedConsultation.email && <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-wide">• Falta email del cliente</p>}
                  </div>
                </section>
              )}

              {/* Presupuesto de honorarios */}
              {['Evaluando viabilidad', 'Presupuestada', 'Aceptada'].includes(selectedConsultation.status) && (
                <section className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Presupuesto · Ley 14.967
                  </label>
                  {loadingPresupuesto ? (
                    <div className="p-4 text-xs text-muted-foreground">Cargando...</div>
                  ) : presupuesto ? (
                    <PresupuestoDetail
                      presupuesto={presupuesto}
                      onUpdated={setPresupuesto}
                      onEdit={() => setShowPresupuestoForm(true)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowPresupuestoForm(true)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                    >
                      <DollarSign size={18} className="text-muted-foreground group-hover:text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">Crear presupuesto de honorarios</p>
                        <p className="text-xs text-muted-foreground">BONO CAO, honorarios en IUS, otros bonos</p>
                      </div>
                    </button>
                  )}
                </section>
              )}

              {/* Diagnóstico y Solución (Evaluando viabilidad+) */}
              {['Evaluando viabilidad', 'Presupuestada', 'Aceptada'].includes(selectedConsultation.status) && (
                <section className="space-y-3 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                    <FileText size={10} /> Registro de la entrevista
                  </label>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Diagnóstico del caso</span>
                      <textarea
                        value={selectedConsultation.diagnostico || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const updated = { ...selectedConsultation, diagnostico: val };
                          setSelectedConsultation(updated);
                          onUpdateConsultation?.(selectedConsultation.id, { diagnostico: val });
                        }}
                        onBlur={async () => {
                          await updateConsultation(selectedConsultation.id, { diagnostico: selectedConsultation.diagnostico });
                        }}
                        placeholder="¿Cuál es el problema que trajo el cliente?"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none h-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Solución propuesta</span>
                      <textarea
                        value={selectedConsultation.solucionPropuesta || ''}
                        onChange={async (e) => {
                          const val = e.target.value;
                          const updated = { ...selectedConsultation, solucionPropuesta: val };
                          setSelectedConsultation(updated);
                          onUpdateConsultation?.(selectedConsultation.id, { solucionPropuesta: val });
                        }}
                        onBlur={async () => {
                          await updateConsultation(selectedConsultation.id, { solucionPropuesta: selectedConsultation.solucionPropuesta });
                        }}
                        placeholder="¿Qué se le dijo al cliente? ¿Qué vía se sugirió?"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none h-16 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Atendido por</span>
                      {profiles && profiles.length > 0 ? (
                        <select
                          value={selectedConsultation.atendidoPor || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            const updated = { ...selectedConsultation, atendidoPor: val };
                            setSelectedConsultation(updated);
                            onUpdateConsultation?.(selectedConsultation.id, { atendidoPor: val });
                            await updateConsultation(selectedConsultation.id, { atendidoPor: val });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="">Seleccionar...</option>
                          {profiles.map(p => (
                            <option key={p.id} value={p.fullName}>{p.fullName} — {p.role}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={selectedConsultation.atendidoPor || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = { ...selectedConsultation, atendidoPor: val };
                            setSelectedConsultation(updated);
                            onUpdateConsultation?.(selectedConsultation.id, { atendidoPor: val });
                          }}
                          onBlur={async () => {
                            await updateConsultation(selectedConsultation.id, { atendidoPor: selectedConsultation.atendidoPor });
                          }}
                          placeholder="Nombre del abogado..."
                          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50"
                        />
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Summary Section */}
              <section className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resumen de la Consulta</label>
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <p className="text-sm font-medium leading-relaxed italic">
                    "{selectedConsultation.description || 'Sin descripción detallada'}"
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1.5 py-1 px-3">
                    <FileText size={12} />
                    {selectedConsultation.type || 'Sin Rama Definida'}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 py-1 px-3">
                    <Calendar size={12} />
                    Ingreso: {format(parseISO(selectedConsultation.date), 'PPP', { locale: es })}
                  </Badge>
                </div>
              </section>

              {/* Contact Section */}
              <section className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Datos de Contacto</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Phone size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Teléfono</span>
                      <span className="text-xs font-bold">{selectedConsultation.phone || 'No registrado'}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Mail size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Email</span>
                      <span className="text-xs font-bold">{selectedConsultation.email || 'No registrado'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Operational Section */}
              <section className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gestión Interna</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Responsable</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                        <User size={12} className="text-muted-foreground" />
                      </div>
                      <span className="text-xs font-bold">{selectedConsultation.responsible || 'Sin asignar'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Próxima Acción</span>
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock size={14} />
                      <span className="text-xs font-bold">{selectedConsultation.nextStep}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Notes Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <StickyNote size={13} className="text-muted-foreground" />
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Notas del caso
                  </label>
                </div>

                {/* Input */}
                <div className="space-y-2">
                  <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        void handleAddNote(selectedConsultation);
                      }
                    }}
                    placeholder="Anotá lo que dice el cliente, observaciones del caso, próximos pasos… (Ctrl+Enter para guardar)"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleAddNote(selectedConsultation)}
                    disabled={savingNote || !noteInput.trim()}
                    className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Send size={12} />
                    {savingNote ? 'Guardando...' : 'Agregar nota'}
                  </Button>
                </div>

                {/* Notes list */}
                {selectedConsultation.notes && selectedConsultation.notes.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {[...selectedConsultation.notes].reverse().map((note, ridx) => {
                      const idx = selectedConsultation.notes!.length - 1 - ridx;
                      // Parse "[DD/MM HH:mm] text" format
                      const match = note.match(/^\[([^\]]+)\]\s(.+)$/s);
                      const stamp = match ? match[1] : null;
                      const text  = match ? match[2] : note;
                      return (
                        <div
                          key={idx}
                          className="group relative p-3 bg-muted/20 border border-border/50 rounded-xl hover:border-border transition-colors"
                        >
                          {stamp && (
                            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1">
                              {stamp}
                            </p>
                          )}
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                          <button
                            onClick={() => handleDeleteNote(selectedConsultation, idx)}
                            className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                            title="Eliminar nota"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic text-center py-3">
                    Aún no hay notas. Usá este espacio durante la entrevista.
                  </p>
                )}
              </section>
            </div>

            <footer className="p-6 border-t border-border bg-muted/20 space-y-4">
              {presupuesto && presupuesto.paymentStatus !== 'Pagado' && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-amber-700 leading-tight">
                    El presupuesto de honorarios aún no fue pagado. Se recomienda confirmar el pago antes de iniciar el asunto.
                  </p>
                </div>
              )}
              {!presupuesto && ['Evaluando viabilidad', 'Presupuestada', 'Aceptada'].includes(selectedConsultation.status) && (
                <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <Zap size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-primary leading-tight">
                    Al convertir en asunto, se creará una estructura operativa heredando los datos del cliente y la descripción de la consulta.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedConsultation(null)}
                >
                  Cerrar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                  onClick={() => handleConvert(selectedConsultation)}
                >
                  <UserPlus size={16} />
                  <span>Convertir en Asunto</span>
                </Button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Presupuesto Editor Modal */}
      {showPresupuestoForm && selectedConsultation && (
        <PresupuestoEditor
          consultationId={selectedConsultation.id}
          clientName={selectedConsultation.name}
          clientEmail={selectedConsultation.email}
          clientPhone={selectedConsultation.phone}
          onClose={() => setShowPresupuestoForm(false)}
          onSaved={(saved) => {
            setPresupuesto(saved);
            setShowPresupuestoForm(false);
          }}
        />
      )}

      {/* Nueva Consulta Modal */}
      {showNuevaConsulta && (
        <NuevaConsultaForm
          profiles={profiles}
          onClose={() => setShowNuevaConsulta(false)}
          onSave={async (data) => {
            await onCreateConsultation?.(data);
            setShowNuevaConsulta(false);
          }}
        />
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  count: number;
  color: 'rose' | 'amber' | 'sky';
}

const StatCard: React.FC<StatCardProps> = ({ label, count, color }) => {
  const colors = {
    rose: 'text-rose-600 bg-rose-500/5 border-rose-500/20',
    amber: 'text-amber-600 bg-amber-500/5 border-amber-500/20',
    sky: 'text-sky-600 bg-sky-500/5 border-sky-500/20',
  };

  return (
    <Card className={cn("p-4 border flex items-center justify-between", colors[color])}>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="text-2xl font-black tracking-tighter">{count}</div>
    </Card>
  );
};

interface ConsultationItemProps {
  consultation: Consultation;
  onClick: () => void;
  onConvert: () => void;
}

const ConsultationItem: React.FC<ConsultationItemProps> = ({ consultation, onClick, onConvert }) => {
  return (
    <Card 
      onClick={onClick}
      className="p-4 border border-border hover:bg-muted/30 transition-all group cursor-pointer relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        {/* Status & Date */}
        <div className="flex items-center gap-4 lg:w-40 shrink-0">
          <StatusBadge status={consultation.status} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <Calendar size={12} />
              {format(parseISO(consultation.date), 'd MMM', { locale: es })}
            </div>
            {consultation.type && (
              <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-0.5">{consultation.type}</span>
            )}
          </div>
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground truncate text-base tracking-tight group-hover:text-primary transition-colors">
              {consultation.name}
            </h3>
            <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border">
              {consultation.origin}
            </span>
            {consultation.consultationFeePaid && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-black uppercase tracking-wider text-emerald-600 border border-emerald-500/20">
                Entrevista ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground">
            <div className="flex items-center gap-1">
              <Phone size={10} />
              <span>{consultation.phone || '--'}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={10} />
              <span>{consultation.responsible || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        {/* Next Action */}
        <div className="flex-[1.2] bg-muted/50 rounded-xl p-3 border border-border/50">
          <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5">
            <Clock size={10} />
            Próxima Acción
          </div>
          <div className="text-xs font-bold text-foreground flex items-center justify-between">
            <span className="truncate">{consultation.nextStep}</span>
            <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 border-l border-border/50 pl-4">
          <button 
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-all" 
            title="Ver Detalle"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <ExternalLink size={18} />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-all" 
            title="Contactar WhatsApp"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <MessageSquare size={18} />
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
            title="Convertir en Asunto"
            onClick={(e) => { e.stopPropagation(); onConvert(); }}
          >
            <UserPlus size={18} />
          </button>
        </div>
      </div>
    </Card>
  );
};

