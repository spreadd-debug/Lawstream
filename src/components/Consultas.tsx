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
  onToggleFeePaid: () => void;
}

const ConsultationPipeline: React.FC<PipelineProps> = ({
  consultation, onStatusChange, onOpenPresupuesto, onConvertToMatter, onToggleFeePaid,
}) => {
  const [showManual, setShowManual] = useState(false);
  const isClosed = consultation.status === 'Rechazada' || consultation.status === 'Archivada';
  const stageIdx = STATUS_TO_STAGE_IDX[consultation.status] ?? 0;

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
    switch (consultation.status) {
      case 'Nueva':
        return {
          desc: 'El primer paso es establecer contacto con el potencial cliente.',
          label: 'Marcar como Contactada',
          action: () => onStatusChange('Contactada'),
        };
      case 'Contactada':
        return {
          desc: 'Realizá la entrevista inicial para conocer el caso en detalle.',
          label: 'Pasar a Evaluación del caso',
          action: () => onStatusChange('Evaluando viabilidad'),
          secondary: !consultation.consultationFeePaid
            ? { label: '+ Registrar entrevista cobrada', action: onToggleFeePaid }
            : null,
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
  const [showNuevaConsulta, setShowNuevaConsulta] = useState(false);

  useEffect(() => {
    if (!selectedConsultation) { setPresupuesto(null); return; }
    setLoadingPresupuesto(true);
    fetchPresupuestoByConsultation(selectedConsultation.id)
      .then(setPresupuesto)
      .finally(() => setLoadingPresupuesto(false));
  }, [selectedConsultation?.id]);

  const handleToggleFeePaid = async (consultation: Consultation) => {
    const newVal = !consultation.consultationFeePaid;
    // Al cobrar, guardar snapshot del valor actual; al descobrar, borrar snapshot
    const feeSnapshot = newVal ? await fetchConsultaValor() : undefined;
    const changes: Partial<Consultation> = {
      consultationFeePaid: newVal,
      ...(newVal ? { consultationFeeSnapshot: feeSnapshot || undefined } : { consultationFeeSnapshot: undefined }),
    };
    await updateConsultation(consultation.id, changes);
    const updated = { ...consultation, ...changes };
    setSelectedConsultation(updated);
    onUpdateConsultation?.(consultation.id, changes);
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
      title: consultation.description || `Asunto: ${consultation.name}`,
      client: consultation.name,
      type: consultation.type || 'Civil',
      description: consultation.description,
      fromConsultationId: consultation.id
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
                  await updateConsultation(selectedConsultation.id, { status: s });
                  const updated = { ...selectedConsultation, status: s };
                  setSelectedConsultation(updated);
                  onUpdateConsultation?.(selectedConsultation.id, { status: s });
                }}
                onOpenPresupuesto={() => setShowPresupuestoForm(true)}
                onConvertToMatter={() => handleConvert(selectedConsultation)}
                onToggleFeePaid={() => handleToggleFeePaid(selectedConsultation)}
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

              {/* Entrevista paga */}
              <section className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entrevista inicial</label>
                <button
                  onClick={() => handleToggleFeePaid(selectedConsultation)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                    selectedConsultation.consultationFeePaid
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
                      : 'bg-muted/30 border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    selectedConsultation.consultationFeePaid
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-muted-foreground'
                  )}>
                    {selectedConsultation.consultationFeePaid && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="text-xs font-bold">
                    {selectedConsultation.consultationFeePaid ? 'Entrevista cobrada ✓' : 'Marcar entrevista como cobrada'}
                  </span>
                </button>
              </section>

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
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notas de Seguimiento</label>
                <div className="space-y-2">
                  {selectedConsultation.notes?.map((note, idx) => (
                    <div key={idx} className="text-xs p-3 bg-muted/20 rounded-lg border border-border/30">
                      {note}
                    </div>
                  )) || <p className="text-xs text-muted-foreground italic">No hay notas registradas.</p>}
                </div>
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

