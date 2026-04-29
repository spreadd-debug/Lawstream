import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle2,
  MoreHorizontal,
  Paperclip,
  MessageSquare,
  History,
  CheckSquare,
  Info,
  ExternalLink,
  Plus,
  ChevronRight,
  Zap,
  PauseCircle,
  ShieldAlert,
  AlertCircle,
  FileSearch,
  Scale,
  Coins,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Ban,
  Send,
  Layers,
  Archive,
} from 'lucide-react';
import { Matter, TimelineEvent, Task, LegalDocument, Expediente, MatterMilestone, FlowSnapshot, INCIDENTE_TIPO_LABELS, ASPECTO_APELADO_LABELS } from '../types';
import { Badge, Card, Button, Modal, Input, Textarea, Select } from './UI';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { fetchExpediente } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { ExpedienteForm } from './ExpedienteForm';
import { ExpedienteDetail } from './ExpedienteDetail';
import { ESTADO_COLORS } from '../data/juzgados';
import { findTemplate, MATTER_TEMPLATES } from '../data/templates';
import { StageFicha } from './StageFicha';
import { getFlowSnapshot } from '../lib/flowEngine';
import { findTemplateForTask } from '../lib/taskTemplateMatch';
import { useNavigate } from 'react-router-dom';
import { ACTION_ICONS } from '../constants';
import { CommunicationsLog } from './CommunicationsLog';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { ClientAccountStatement } from './ClientAccountStatement';
import { TimelinePanel } from './TimelinePanel';
import { HilosPanel } from './HilosPanel';
import { PeritosPanel } from './PeritosPanel';
import { CompensacionPanel } from './CompensacionPanel';
import { LetradosPanel } from './LetradosPanel';
import { HonorariosRegPanel } from './HonorariosRegPanel';
import { SubProcesosPanel } from './SubProcesosPanel';
import { CedulasPanel } from './CedulasPanel';
import { urgenciaDePlazo, diasRestantes } from '../lib/plazos';
import { detectarCruceViolencia } from '../lib/violencia';

interface MatterDetailProps {
  matter: Matter;
  timeline: TimelineEvent[];
  tasks: Task[];
  documents: LegalDocument[];
  milestones: MatterMilestone[];
  profiles?: { fullName: string }[];
  onBack: () => void;
  onNewAction: () => void;
  onEditMatter: () => void;
  onCompleteMilestone?: (id: string) => void;
  onCompleteTask?: (taskId: string) => void;
  onReopenTask?: (taskId: string) => void;
  onUpdateMatter?: (changes: Partial<Matter>) => void;
  onUpdateDocument?: (docId: string, changes: Partial<LegalDocument>) => void;
  onAddDocument?: (doc: Omit<LegalDocument, 'id'>) => void;
  onAddMilestone?: (ms: Omit<MatterMilestone, 'id'>) => void;
  currentUser: string;
  currentUserRole: string;
}

export const MatterDetail = ({
  matter, timeline, tasks, documents, milestones, profiles,
  onBack, onNewAction, onEditMatter, onCompleteMilestone, onCompleteTask, onReopenTask,
  onUpdateMatter, onUpdateDocument, onAddDocument, onAddMilestone,
  currentUser, currentUserRole,
}: MatterDetailProps) => {
  const navigate = useNavigate();
  const { clients, matters: allMatters, plazos: allPlazos, eventos: allEventos, handleEditMatter, setEditMatterFocusField, handleArchiveMatter } = useAppContext();
  // GAP 1 — sub-procesos: si este matter tiene padre, mostramos breadcrumb.
  const parentMatter = matter.parentMatterId ? allMatters.find(m => m.id === matter.parentMatterId) : undefined;
  const isSubProceso = matter.kind === 'incidente' || matter.kind === 'apelacion';
  const subProcesoLabel = matter.kind === 'apelacion'
    ? 'Apelación'
    : matter.kind === 'incidente'
      ? `Incidente${matter.incidenteTipo ? ' · ' + INCIDENTE_TIPO_LABELS[matter.incidenteTipo] : ''}`
      : null;

  // GAP 5 — parcialmente firme. Estado DERIVADO: si este matter es principal
  // y tiene al menos una apelación-hija con estado != Cerrado/Archivado,
  // está parcialmente firme. Listamos los aspectos de cada apelación abierta.
  const apelacionesAbiertas = !isSubProceso
    ? allMatters.filter(m =>
        m.parentMatterId === matter.id
        && m.kind === 'apelacion'
        && m.status !== 'Cerrado'
        && m.status !== 'Archivado'
      )
    : [];
  const aspectosApeladosAbiertos = Array.from(new Set(
    apelacionesAbiertas.flatMap(a => a.aspectosApelados ?? [])
  ));
  const parcialmenteFirme = apelacionesAbiertas.length > 0;
  const clientObj = clients.find(c => c.name === matter.client);

  // Casos legados anteriores a la migración 017 pueden tener jurisdicción NULL.
  // El motor de plazos va a fallar apenas se intente registrar un evento, así
  // que señalizamos de manera permanente hasta que se complete.
  const jurisdiccionFaltante = !matter.jurisdiccion;

  // Eventos de este asunto, más reciente primero — para detectar "autos para sentencia".
  const matterEventos = allEventos
    .filter(e => e.matterId === matter.id)
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoEvento = matterEventos[0];
  const isAutosParaSentencia = ultimoEvento?.tipo === 'autos_para_sentencia';
  const diasDesdeAutos = isAutosParaSentencia
    ? differenceInCalendarDays(new Date(), parseISO(ultimoEvento!.fecha))
    : 0;
  const autosNivelAlerta: 'normal' | 'amarillo' | 'rojo' =
    diasDesdeAutos >= 90 ? 'rojo' : diasDesdeAutos >= 60 ? 'amarillo' : 'normal';

  // Datos de violencia familiar / medida cautelar — sección del formulario Instrucción.
  const cd = matter.caseData ?? {};
  const medidaDescripcion = cd.medida_descripcion?.trim();
  const medidaOrganismo = cd.medida_tipo_denuncia?.trim();
  const medidaFecha = cd.medida_fecha?.trim();
  const medidaVigenciaHasta = cd.medida_vigencia_hasta?.trim();
  const tieneMedida = !!(medidaDescripcion || medidaOrganismo || medidaVigenciaHasta);
  const medidaVencida = !!(medidaVigenciaHasta && differenceInCalendarDays(parseISO(medidaVigenciaHasta), new Date()) < 0);

  // GAP 21 — detección de cruce entre medida vigente y régimen propuesto.
  const cruceViolencia = detectarCruceViolencia(cd);

  // Plazos activos de este asunto, ordenados por vencimiento — más urgentes primero.
  const matterPlazosActivos = allPlazos
    .filter(p => p.matterId === matter.id && p.estado === 'activo')
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const nextPlazo = matterPlazosActivos[0];
  const nextPlazoUrg = nextPlazo ? urgenciaDePlazo(nextPlazo) : null;
  const nextPlazoDias = nextPlazo ? diasRestantes(nextPlazo.fechaVencimiento) : null;

  // Modal state
  const [isRequestDocOpen, setIsRequestDocOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isBlockageOpen, setIsBlockageOpen] = useState(false);
  const [isResponsableOpen, setIsResponsableOpen] = useState(false);
  const [blockageText, setBlockageText] = useState(matter.blockage || '');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expediente, setExpediente] = useState<Expediente | null | undefined>(undefined);
  const [showExpedienteForm, setShowExpedienteForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCriticality, setNewDocCriticality] = useState<'Crítico' | 'Recomendado' | 'Opcional'>('Crítico');
  const [newDocBlocks, setNewDocBlocks] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [docMenuOpen, setDocMenuOpen] = useState<string | null>(null);
  const [fichaOpenStage, setFichaOpenStage] = useState<string | null>(null);

  // New navigation state
  const [activeTab, setActiveTab] = useState<'flujo' | 'timeline' | 'hilos' | 'cobranzas' | 'expediente' | 'comunicaciones'>('flujo');
  const [viewingStage, setViewingStage] = useState<string | null>(null);

  // Pre-filled communication message (from "Solicitar datos" button)
  const [commPrefill, setCommPrefill] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchExpediente(matter.id).then(setExpediente);
  }, [matter.id]);

  // Flow engine
  const template = (matter.flowTemplateId && MATTER_TEMPLATES.find(t => t.id === matter.flowTemplateId)) || findTemplate(matter.type, matter.subtype);
  const flow: FlowSnapshot = getFlowSnapshot(matter, template, tasks, documents);

  // Lookup satisfiedBy from template for a given task (by title + etapa)
  const getSatisfiedBy = (task: Task) => {
    if (task.satisfiedBy) return task.satisfiedBy;
    if (!template?.stages) return undefined;
    const stage = template.stages.find(s => s.name === task.etapa);
    if (!stage) return undefined;
    const def = stage.tasks.find(t => t.task === task.title);
    return def?.satisfiedBy;
  };

  // Handler: "Solicitar datos" — generates message and switches to comunicaciones tab
  const handleRequestData = (taskTitle: string, missingFields: { key: string; label: string }[]) => {
    const listado = missingFields.map(f => `  - ${f.label}`).join('\n');
    const msg = `Estimado/a ${matter.client},\n\nPara poder avanzar con su trámite "${matter.title}", necesitamos que nos facilite la siguiente información:\n\n${listado}\n\nQuedamos a disposición ante cualquier consulta.\nSaludos cordiales.`;
    setCommPrefill(msg);
    setActiveTab('comunicaciones');
  };

  // Stage navigation
  const hasStages = flow.stages.length > 0;
  const selectedStage = viewingStage || flow.currentStage || '';
  const isViewingCurrentStage = !viewingStage || viewingStage === flow.currentStage;

  // Tasks filtered by stage
  const stageTasks = hasStages && selectedStage
    ? tasks.filter(t => t.etapa === selectedStage)
    : tasks;
  const stageBlockingPending = stageTasks.filter(t => t.bloqueante && t.status !== 'Completada');
  const stageNonBlockingPending = stageTasks.filter(t => !t.bloqueante && t.status !== 'Completada');
  const stageCompletedTasks = stageTasks.filter(t => t.status === 'Completada');

  // Documents filtered by stage (using associatedAction which stores stage name)
  const stageDocs = hasStages && selectedStage
    ? documents.filter(d => d.associatedAction === selectedStage)
    : documents;
  const stageDocsWithoutStage = hasStages && selectedStage
    ? documents.filter(d => !d.associatedAction)
    : [];
  const allStageDocs = [...stageDocs, ...stageDocsWithoutStage];

  // Blocking counts (stage-aware for Flujo, global for hero)
  const stageBlockingDocsCount = allStageDocs.filter(d => d.blocksProgress && d.status !== 'Presentado' && d.status !== 'Recibido' && d.status !== 'Aprobado' && (d.status as string) !== 'No aplica').length;
  const globalBlockingDocsCount = documents.filter(d => d.blocksProgress && d.status !== 'Presentado' && d.status !== 'Recibido' && d.status !== 'Aprobado' && (d.status as string) !== 'No aplica').length;
  const blockingDocsCount = globalBlockingDocsCount;
  const totalBlockingCount = stageBlockingPending.length + stageBlockingDocsCount;

  // Next stage
  const currentStageIdx = flow.stages.findIndex(s => s.status === 'current');
  const nextStageName = currentStageIdx >= 0 && currentStageIdx < flow.stages.length - 1
    ? flow.stages[currentStageIdx + 1].name
    : null;

  // Stage ficha info
  const selectedTemplateStage = template?.stages?.find(s => s.name === selectedStage);
  const hasStageFicha = !!selectedTemplateStage?.fichaFields;
  const fichaKeys = hasStageFicha ? selectedTemplateStage!.fichaFields!.flatMap(s => s.fields.map(f => f.key)) : [];
  const fichaFilled = fichaKeys.filter(k => {
    const v = matter.caseData?.[k];
    if (!v) return false;
    try { const arr = JSON.parse(v); return Array.isArray(arr) && arr.length > 0; } catch { return v.trim().length > 0; }
  }).length;

  const displayedTimeline = showAllHistory ? timeline : timeline.slice(0, 3);
  const ActionIcon = matter.nextActionType ? ACTION_ICONS[matter.nextActionType] : Zap;

  const docsResolved = documents.filter(d => d.status === 'Presentado' || d.status === 'Aprobado' || d.status === 'Recibido' || (d.status as string) === 'No aplica');
  const docCompletionPct = Math.round(
    (docsResolved.length / Math.max(documents.length, 1)) * 100
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">

      {/* ═══════════════════════ BREADCRUMB SUB-PROCESO ═══════════════════════ */}
      {/* Si este matter es incidente/apelación, mostramos arriba un link al padre. */}
      {isSubProceso && parentMatter && (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-violet-500/40 bg-violet-500/10">
          <button
            onClick={() => navigate(`/asuntos/${parentMatter.id}`)}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al caso principal
          </button>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-[11px] text-foreground/80 truncate">
            <span className="font-bold">{subProcesoLabel}</span>
            {' de '}
            <span className="font-bold">{parentMatter.title}</span>
          </span>
        </div>
      )}

      {/* ═══════════════════════ BANNER PARCIALMENTE FIRME (GAP 5) ═══════════════════════ */}
      {parcialmenteFirme && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <Scale size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Sentencia parcialmente firme
            </span>
            {aspectosApeladosAbiertos.length > 0 ? (
              <p className="text-sm font-bold text-foreground">
                Apelados: {aspectosApeladosAbiertos.map(a => ASPECTO_APELADO_LABELS[a]).join(', ')}.
                <span className="font-normal text-muted-foreground"> El resto quedó firme.</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-foreground">
                Hay {apelacionesAbiertas.length} apelación{apelacionesAbiertas.length === 1 ? '' : 'es'} en trámite — sin aspectos detallados.
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {apelacionesAbiertas.length === 1
                ? 'Hay 1 sub-proceso de Cámara en trámite.'
                : `Hay ${apelacionesAbiertas.length} sub-procesos de Cámara en trámite.`}
              {' '}Verlos en tab Expediente → Sub-procesos.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ BANNER JURISDICCIÓN FALTANTE ═══════════════════════ */}
      {/* Caso legado sin jurisdicción: se ve arriba del stepper para que sea imposible
          ignorarlo. Convive con el banner de violencia si ambos aplican. */}
      {jurisdiccionFaltante && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Jurisdicción sin cargar
            </span>
            <p className="text-sm font-bold text-foreground">
              Este caso no tiene jurisdicción cargada. El cálculo de plazos, la generación de tareas y algunos templates no funcionarán correctamente hasta que la completes.
            </p>
          </div>
          <button
            onClick={() => {
              setEditMatterFocusField?.('jurisdiccion');
              handleEditMatter(matter.id);
            }}
            className="shrink-0 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Completar jurisdicción
          </button>
        </div>
      )}

      {/* ═══════════════════════ BANNER VIOLENCIA FAMILIAR ═══════════════════════ */}
      {tieneMedida && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl border shadow-sm',
            medidaVencida
              ? 'bg-rose-500/5 border-rose-500/30'
              : 'bg-rose-500/10 border-rose-500/40'
          )}
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
                Caso con medida de protección vigente
              </span>
              {medidaVencida && (
                <Badge variant="warning" className="text-[8px]">Vencida — sugerir renovación</Badge>
              )}
            </div>
            <p className="text-sm font-bold text-foreground">
              {medidaDescripcion || 'Medida de protección registrada'}
            </p>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
              {medidaOrganismo && <span>Organismo: <strong className="text-foreground/80">{medidaOrganismo}</strong></span>}
              {medidaFecha && <span>Denuncia: <strong className="text-foreground/80">{format(parseISO(medidaFecha), "d 'de' MMMM yyyy", { locale: es })}</strong></span>}
              {medidaVigenciaHasta && (
                <span>
                  Vigencia hasta:{' '}
                  <strong className={cn(
                    medidaVencida ? 'text-amber-600' : 'text-foreground/80'
                  )}>
                    {format(parseISO(medidaVigenciaHasta), "d 'de' MMMM yyyy", { locale: es })}
                  </strong>
                </span>
              )}
            </div>

            {/* GAP 21 — sub-bloque cruce con régimen propuesto. */}
            {cruceViolencia.hayCruce && (
              <div className={cn(
                'mt-3 p-3 rounded-xl border-2 border-dashed',
                cruceViolencia.regimenLuceAmplio
                  ? 'border-rose-600/60 bg-rose-600/10'
                  : 'border-amber-500/60 bg-amber-500/10'
              )}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className={cn(
                    'shrink-0 mt-0.5',
                    cruceViolencia.regimenLuceAmplio ? 'text-rose-700' : 'text-amber-700'
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      cruceViolencia.regimenLuceAmplio
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-amber-700 dark:text-amber-300'
                    )}>
                      {cruceViolencia.regimenLuceAmplio
                        ? '⚠ Posible inconsistencia — revisar urgente'
                        : 'Revisar consistencia'}
                    </span>
                    <p className="text-xs text-foreground/90 mt-1">
                      {cruceViolencia.motivo}
                    </p>
                    {cd.regimen_comunicacion && (
                      <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">
                        Régimen cargado: "{cd.regimen_comunicacion}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-[10px] font-black w-fit uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={14} />
          Volver al Control
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/50">{matter.type}</Badge>
              {isSubProceso && subProcesoLabel && (
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/10">
                  {subProcesoLabel}
                </Badge>
              )}
              {expediente ? (
                <>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                    Exp: {expediente.nroJuzgado || expediente.nroReceptoria || 'Sin número'}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide',
                    ESTADO_COLORS[expediente.estadoTroncal]
                  )}>
                    {expediente.estadoTroncal}
                    {expediente.subestado ? ` · ${expediente.subestado}` : ''}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Sin expediente judicial</span>
              )}
            </div>
            <h1
              title={matter.title}
              className="text-2xl md:text-4xl font-black text-foreground tracking-tighter leading-[0.95] line-clamp-2"
            >{matter.title}</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">{matter.client}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick access icons */}
            <button
              title="Consultar PJN"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <ExternalLink size={16} />
            </button>
            <button
              title="WhatsApp Cliente"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
            >
              <MessageSquare size={16} />
            </button>
            <button
              title="Carpeta Drive"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-amber-600 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
            >
              <Paperclip size={16} />
            </button>
            <button
              title="Movimientos financieros"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
              onClick={() => setActiveTab('expediente')}
            >
              <Coins size={16} />
            </button>
            <div className="w-px h-8 bg-border mx-1" />
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl"
              onClick={onEditMatter}
            >
              Editar Caso
            </Button>
            <Button
              onClick={onNewAction}
              variant="primary"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-xl shadow-primary/20"
            >
              <Plus size={16} className="mr-2" />
              Nueva Acción
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════ STEPPER HORIZONTAL ═══════════════════ */}
      {hasStages && (
        <section className="space-y-3">
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <div className="flex items-center min-w-max">
              {flow.stages.map((stage, idx) => (
                <React.Fragment key={stage.name}>
                  <button
                    onClick={() => {
                      setViewingStage(stage.name === flow.currentStage ? null : stage.name);
                      setActiveTab('flujo');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap",
                      selectedStage === stage.name && "bg-primary/5 ring-1 ring-primary/20",
                      stage.status === 'pending' && "opacity-50 hover:opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border-2 transition-all",
                      stage.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                      stage.status === 'current' ? "bg-primary border-primary text-primary-foreground" :
                      "bg-muted border-border text-muted-foreground"
                    )}>
                      {stage.status === 'completed' ? <CheckCircle2 size={14} /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-xs font-bold tracking-tight",
                      stage.status === 'completed' ? "text-emerald-700 dark:text-emerald-400" :
                      stage.status === 'current' ? "text-foreground" :
                      "text-muted-foreground"
                    )}>
                      {stage.name}
                    </span>
                    {stage.status === 'current' && viewingStage && viewingStage !== stage.name && (
                      <span className="text-[7px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Actual</span>
                    )}
                  </button>
                  {idx < flow.stages.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 shrink-0",
                      stage.status === 'completed' ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 rounded-full" style={{ width: `${flow.progress}%` }} />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">{flow.progress}%</span>
          </div>
        </section>
      )}

      {/* ═══════════════════ HERO COMPACT ═══════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border rounded-[2rem] overflow-hidden shadow-xl">
        {/* Left: Modo "Autos para sentencia" — en espera pasiva */}
        {isAutosParaSentencia && (
          <div className="lg:col-span-7 p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">En espera de sentencia</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  Caso en espera de sentencia
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                  Última actividad: {format(parseISO(ultimoEvento!.fecha), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <p className="text-xs text-white/70 pt-2">
                  Consultar MEV periódicamente para detectar la sentencia.
                </p>
              </div>

              {(autosNivelAlerta === 'amarillo' || autosNivelAlerta === 'rojo') && (
                <div className={cn(
                  'flex items-start gap-2 p-3 rounded-xl backdrop-blur-md border',
                  autosNivelAlerta === 'rojo'
                    ? 'bg-rose-500/20 border-rose-300/40'
                    : 'bg-amber-500/20 border-amber-300/40'
                )}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold leading-snug">
                    {autosNivelAlerta === 'rojo'
                      ? `Más de ${diasDesdeAutos} días desde autos para sentencia. Considerar presentar pronto despacho.`
                      : `${diasDesdeAutos} días desde autos para sentencia — hacer seguimiento.`}
                  </p>
                </div>
              )}
            </div>

            <div className="relative z-10 flex items-end justify-between pt-6">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Días en espera</span>
                <div className="text-3xl font-black tracking-tighter flex items-center gap-2">
                  <Calendar size={18} className="opacity-50" />
                  {diasDesdeAutos} {diasDesdeAutos === 1 ? 'día' : 'días'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {matter.priority === 'Alta' && (
                  <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Prioridad Alta
                  </div>
                )}
              </div>
            </div>

            <Clock size={180} className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none" />
          </div>
        )}

        {/* Left: Health & Next Action */}
        {!isAutosParaSentencia && (
        <div className={cn(
          "lg:col-span-7 p-8 flex flex-col justify-between relative overflow-hidden",
          flow.health === 'Roto' ? 'bg-rose-600 text-white' :
          flow.health === 'Trabado' ? 'bg-amber-500 text-white' :
          flow.health === 'En espera' ? 'bg-sky-600 text-white' :
          'bg-slate-900 text-white'
        )}>
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                {flow.health === 'Sano' ? <CheckCircle2 size={16} /> :
                 flow.health === 'Trabado' ? <PauseCircle size={16} /> :
                 flow.health === 'Roto' ? <ShieldAlert size={16} /> :
                 <Clock size={16} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Salud: {flow.health}</span>
              {flow.health !== matter.health && (
                <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Auto</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Próxima Acción</span>
                {flow.currentStage && (
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/20 text-white/70 h-4 px-1.5">
                    {flow.currentStage}
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl backdrop-blur-md border mt-0.5 shrink-0",
                  !(flow.nextAction || matter.nextAction) ? "bg-rose-500/20 border-rose-500/40 text-rose-100 animate-pulse" : "bg-white/10 border-white/20"
                )}>
                  <ActionIcon size={20} />
                </div>
                <div className="space-y-2">
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-black tracking-tight leading-tight",
                    !(flow.nextAction || matter.nextAction) && "text-rose-100/90"
                  )}>
                    {flow.nextAction || matter.nextAction || 'Sin próxima acción'}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!matter.nextAction && (
                      <Button
                        onClick={onNewAction}
                        variant="primary"
                        size="sm"
                        className="bg-white text-rose-600 hover:bg-white/90 border-none text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg shadow-lg"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Definir Acción
                      </Button>
                    )}
                    {(flow.nextAction || matter.nextAction) && (
                      <button
                        onClick={() => {
                          setActiveTab('flujo');
                          if (hasStageFicha) setFichaOpenStage(selectedStage);
                        }}
                        className="px-5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest"
                      >
                        Resolver →
                      </button>
                    )}
                    {(() => {
                      const actionText = flow.nextAction || matter.nextAction;
                      const matched = actionText ? findTemplateForTask(actionText, matter.type as any) : null;
                      return matched ? (
                        <Button
                          onClick={() => navigate(`/plantillas?template=${matched.id}&matter=${matter.id}`)}
                          variant="primary"
                          size="sm"
                          className="bg-white/15 text-white hover:bg-white/25 border border-white/20 text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg backdrop-blur-md"
                        >
                          <FileText size={14} className="mr-1.5" />
                          Generar con Plantilla
                        </Button>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between pt-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Seguimiento</span>
              <div className={cn(
                "text-xl font-black tracking-tighter flex items-center gap-2",
                !matter.nextActionDate && "text-rose-200/60"
              )}>
                <Calendar size={16} className="opacity-50" />
                {matter.nextActionDate ? format(parseISO(matter.nextActionDate), "d 'de' MMMM", { locale: es }) : 'Sin fecha'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {matter.priority === 'Alta' && (
                <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Prioridad Alta
                </div>
              )}
              {nextPlazo && (
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    'px-3 py-1.5 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border',
                    nextPlazoUrg === 'vencido' || nextPlazoUrg === 'critico'
                      ? 'bg-rose-500/20 border-rose-400/30 hover:bg-rose-500/30'
                      : nextPlazoUrg === 'proximo'
                        ? 'bg-amber-500/20 border-amber-300/30 hover:bg-amber-500/30'
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                  )}
                  title={`${nextPlazo.tipo} — vence ${nextPlazo.fechaVencimiento}`}
                >
                  <Clock size={12} />
                  {matterPlazosActivos.length > 1 ? `${matterPlazosActivos.length} plazos · ` : 'Plazo · '}
                  {nextPlazoUrg === 'vencido'
                    ? `Vencido ${Math.abs(nextPlazoDias!)}d`
                    : nextPlazoDias === 0
                      ? 'Vence hoy'
                      : `${nextPlazoDias}d`}
                </button>
              )}
              {totalBlockingCount > 0 && nextStageName && (
                <button
                  onClick={() => setActiveTab('flujo')}
                  className="px-3 py-1.5 bg-rose-500/20 backdrop-blur-md border border-rose-400/30 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert size={12} />
                  {totalBlockingCount} bloqueo{totalBlockingCount !== 1 ? 's' : ''} → {nextStageName}
                </button>
              )}
            </div>
          </div>

          <Zap size={180} className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none" />
        </div>
        )}

        {/* Right: Responsable & Status */}
        <div className="lg:col-span-5 p-8 bg-card flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shadow-lg",
              matter.responsible === 'Sin asignar' || !matter.responsible
                ? "bg-rose-500/10 text-rose-600 border-2 border-dashed border-rose-500/30 shadow-none"
                : "bg-primary text-primary-foreground shadow-primary/20"
            )}>
              {matter.responsible && matter.responsible !== 'Sin asignar'
                ? matter.responsible.split(' ').map(n => n[0]).join('')
                : <User size={18} />}
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Responsable</div>
              <div className={cn(
                "text-sm font-bold",
                (matter.responsible === 'Sin asignar' || !matter.responsible) ? "text-rose-600" : "text-foreground"
              )}>
                {matter.responsible || 'Sin asignar'}
              </div>
              {(matter.responsible === 'Sin asignar' || !matter.responsible) && (
                <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-0.5" onClick={onEditMatter}>Asignar</button>
              )}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Última Actividad</div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-bold text-foreground/80 leading-relaxed">
                {timeline[0]?.title || 'Sin actividad reciente'}
                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-50">
                  {timeline[0]?.date
                    ? format(parseISO(timeline[0].date), "d 'de' MMMM", { locale: es })
                    : '—'}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Estado documental</div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-1000"
                  style={{ width: `${docCompletionPct}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-foreground">{docCompletionPct}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest h-8 w-fit border border-border/50"
              onClick={() => { setBlockageText(matter.blockage || ''); setIsBlockageOpen(true); }}
            >
              <AlertCircle size={12} className="mr-1.5" />
              {matter.blockage ? 'Ver Bloqueo' : 'Reportar Bloqueo'}
            </Button>

            {matter.status !== 'Archivado' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[9px] font-black uppercase tracking-widest h-8 w-fit border border-border/50"
                onClick={() => {
                  if (window.confirm(`¿Archivar "${matter.title}"? El caso pasará a estado Archivado y dejará de aparecer en listas activas. El histórico se preserva.`)) {
                    handleArchiveMatter(matter.id);
                  }
                }}
              >
                <Archive size={12} className="mr-1.5" />
                Archivar caso
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TABS ═══════════════════════ */}
      <div>
        <div className="flex border-b border-border overflow-x-auto">
          {([
            { key: 'flujo' as const, label: 'Flujo', icon: Zap },
            { key: 'timeline' as const, label: 'Timeline', icon: Clock },
            { key: 'hilos' as const, label: 'Prueba (hilos y peritos)', icon: Layers },
            { key: 'cobranzas' as const, label: 'Cobranzas', icon: Coins },
            { key: 'expediente' as const, label: 'Expediente', icon: FileText },
            { key: 'comunicaciones' as const, label: 'Comunicaciones', icon: MessageSquare },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key !== 'comunicaciones') setCommPrefill(undefined); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap shrink-0",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────── TAB: FLUJO ─────────── */}
        {activeTab === 'flujo' && (
          <div className="py-8 space-y-8">
            {/* Stage summary */}
            {hasStages && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-foreground uppercase tracking-widest">
                    {selectedStage}
                  </h3>
                  <span className="text-sm text-muted-foreground font-bold">
                    {stageCompletedTasks.length} de {stageTasks.length} tareas completadas
                    {stageBlockingDocsCount > 0 && ` — ${stageBlockingDocsCount} doc${stageBlockingDocsCount !== 1 ? 's' : ''} pendiente${stageBlockingDocsCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {!isViewingCurrentStage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] font-black uppercase tracking-widest h-8 rounded-lg"
                    onClick={() => setViewingStage(null)}
                  >
                    ← Volver a etapa actual
                  </Button>
                )}
              </div>
            )}

            {/* Stage ficha button */}
            {hasStageFicha && (
              <button
                onClick={() => setFichaOpenStage(selectedStage)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all",
                  fichaFilled === fichaKeys.length && fichaFilled > 0
                    ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
                    : fichaFilled > 0
                    ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                )}
              >
                <FileText size={18} className={cn(
                  fichaFilled === fichaKeys.length && fichaFilled > 0 ? "text-emerald-600" :
                  fichaFilled > 0 ? "text-amber-600" : "text-primary"
                )} />
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold">{selectedTemplateStage?.fichaTitle || selectedStage}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-3">
                    {fichaFilled}/{fichaKeys.length} campos
                  </span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            )}

            {/* Blocking tasks */}
            {stageBlockingPending.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Tareas Bloqueantes</h4>
                  <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                    {stageBlockingPending.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {stageBlockingPending.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      matter={matter}
                      navigate={navigate}
                      onComplete={onCompleteTask}
                      onReopen={onReopenTask}
                      hasFicha={hasStageFicha}
                      onOpenFicha={hasStageFicha ? () => setFichaOpenStage(selectedStage) : undefined}
                      satisfiedBy={getSatisfiedBy(task)}
                      onRequestData={handleRequestData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other pending tasks */}
            {stageNonBlockingPending.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-primary rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Otras Tareas</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {stageNonBlockingPending.map(task => (
                    <TaskCard key={task.id} task={task} matter={matter} navigate={navigate} onComplete={onCompleteTask} onReopen={onReopenTask} satisfiedBy={getSatisfiedBy(task)} onRequestData={handleRequestData} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed tasks */}
            {stageCompletedTasks.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Completadas</h4>
                  <span className="text-[10px] font-black text-muted-foreground opacity-50">{stageCompletedTasks.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {stageCompletedTasks.map(task => (
                    <TaskCard key={task.id} task={task} matter={matter} navigate={navigate} onComplete={onCompleteTask} onReopen={onReopenTask} satisfiedBy={getSatisfiedBy(task)} onRequestData={handleRequestData} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {stageTasks.length === 0 && hasStages && (
              <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
                <CheckSquare size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No hay tareas para esta etapa</p>
              </div>
            )}

            {/* Documents */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-primary rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Documentación Requerida</h4>
                </div>
                <div className="flex items-center gap-2">
                  {blockingDocsCount > 0 && (
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-rose-500/20 text-rose-600 bg-rose-500/5">
                      {blockingDocsCount} Bloqueo{blockingDocsCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => setIsRequestDocOpen(true)}
                  >
                    <Plus size={14} />
                    Solicitar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {allStageDocs.length > 0 ? (
                  allStageDocs.map(doc => (
                    <DocumentMatterItem
                      key={doc.id}
                      doc={doc}
                      menuOpen={docMenuOpen === doc.id}
                      onToggleMenu={() => setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)}
                      onChangeStatus={(docId, status) => { onUpdateDocument?.(docId, { status }); setDocMenuOpen(null); }}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
                    <FileSearch size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No hay documentos para esta etapa</p>
                    <Button variant="outline" size="sm" className="mt-4 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl" onClick={() => setIsRequestDocOpen(true)}>Cargar Documento</Button>
                  </div>
                )}
              </div>
            </section>

            {/* CTA: advance to next stage */}
            {isViewingCurrentStage && nextStageName && (
              <div className={cn(
                "p-6 rounded-2xl border space-y-4",
                totalBlockingCount > 0 ? "bg-primary/5 border-primary/20" : "bg-emerald-500/5 border-emerald-500/20"
              )}>
                <div className="flex items-center gap-3">
                  <Zap size={20} className={totalBlockingCount > 0 ? "text-primary" : "text-emerald-500"} />
                  <h4 className="text-sm font-black uppercase tracking-widest text-foreground">
                    Para avanzar a {nextStageName}
                  </h4>
                </div>

                {totalBlockingCount > 0 ? (
                  <>
                    <div className="space-y-2 pl-8">
                      {stageBlockingPending.length > 0 && (
                        <p className="text-sm text-foreground/80 flex items-center gap-2">
                          <span className="w-4 h-4 rounded border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          </span>
                          {stageBlockingPending.length} tarea{stageBlockingPending.length !== 1 ? 's' : ''} bloqueante{stageBlockingPending.length !== 1 ? 's' : ''} pendiente{stageBlockingPending.length !== 1 ? 's' : ''}
                        </p>
                      )}
                      {stageBlockingDocsCount > 0 && (
                        <p className="text-sm text-foreground/80 flex items-center gap-2">
                          <span className="w-4 h-4 rounded border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          </span>
                          {stageBlockingDocsCount} documento{stageBlockingDocsCount !== 1 ? 's' : ''} cr\u00edtico{stageBlockingDocsCount !== 1 ? 's' : ''} faltante{stageBlockingDocsCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Complet\u00e1 los requisitos para habilitar el avance
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between pl-8">
                    <p className="text-sm font-bold text-foreground">
                      Sin bloqueos — listo para avanzar
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg"
                      onClick={() => {
                        // Advance to next stage by completing current stage tasks
                        // For now, just navigate to next stage view
                        const nextIdx = flow.stages.findIndex(s => s.name === nextStageName);
                        if (nextIdx >= 0) {
                          setViewingStage(nextStageName);
                        }
                      }}
                    >
                      Avanzar a {nextStageName} →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─────────── TAB: TIMELINE ─────────── */}
        {activeTab === 'timeline' && (
          <TimelinePanel matter={matter} />
        )}

        {/* ─────────── TAB: HILOS Y PERITOS ─────────── */}
        {activeTab === 'hilos' && (
          <div className="py-8 space-y-10">
            <HilosPanel matterId={matter.id} />
            <div className="border-t border-border/40" />
            <PeritosPanel matterId={matter.id} />
          </div>
        )}

        {/* ─────────── TAB: COBRANZAS ─────────── */}
        {activeTab === 'cobranzas' && (
          <div className="py-8 space-y-10">
            <CompensacionPanel matterId={matter.id} />
            <div className="border-t border-border/40" />
            <HonorariosRegPanel matterId={matter.id} />
          </div>
        )}

        {/* ─────────── TAB: EXPEDIENTE ─────────── */}
        {activeTab === 'expediente' && (
          <div className="py-8 space-y-10">
            {/* Sub-procesos (incidentes y apelaciones) — GAP 1.
                Solo lo mostramos en casos principales para evitar anidamiento. */}
            {!isSubProceso && (
              <section>
                <SubProcesosPanel
                  matter={matter}
                  onOpenMatter={(id) => navigate(`/asuntos/${id}`)}
                />
              </section>
            )}

            {/* Letrados de la parte / contraparte */}
            <section>
              <LetradosPanel matterId={matter.id} />
            </section>

            {/* Cédulas de notificación con intentos (GAP 7) */}
            <section className="border-t border-border/40 pt-8">
              <CedulasPanel matterId={matter.id} />
            </section>

            {/* Datos del Asunto */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Datos del Asunto</h3>
              <Card className="p-6 bg-muted/30 border-border space-y-4">
                <div className="text-xs text-foreground/70 leading-relaxed italic">
                  "{matter.description || 'Sin descripción narrativa.'}"
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tipo</div>
                    <div className="text-xs font-bold text-foreground">{matter.type}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Prioridad</div>
                    <div className="text-xs font-bold text-foreground">{matter.priority}</div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Expediente Judicial */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Expediente Judicial</h3>
              {expediente === undefined ? (
                <div className="p-4 text-xs text-muted-foreground">Cargando...</div>
              ) : expediente ? (
                <Card className="p-5 bg-muted/30 border-border">
                  <ExpedienteDetail
                    expediente={expediente}
                    onUpdated={setExpediente}
                    onEdit={() => setShowExpedienteForm(true)}
                  />
                </Card>
              ) : (
                <button
                  onClick={() => setShowExpedienteForm(true)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Scale size={20} className="text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Crear expediente judicial</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Carátula, fuero, juzgado, MEV y seguimiento</p>
                  </div>
                </button>
              )}
            </section>

            {/* Documentación completa */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Documentación Completa</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest gap-2"
                  onClick={() => setIsRequestDocOpen(true)}
                >
                  <Plus size={14} />
                  Solicitar
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {documents.length > 0 ? (
                  documents.map(doc => (
                    <DocumentMatterItem
                      key={doc.id}
                      doc={doc}
                      menuOpen={docMenuOpen === doc.id}
                      onToggleMenu={() => setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)}
                      onChangeStatus={(docId, status) => { onUpdateDocument?.(docId, { status }); setDocMenuOpen(null); }}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center border border-border/50 rounded-2xl bg-muted/5">
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Sin documentos cargados</p>
                  </div>
                )}
              </div>
            </section>

            {/* Approval workflow */}
            <ApprovalWorkflow
              documents={documents}
              currentUserRole={currentUserRole}
              currentUserName={currentUser}
              onApprove={async (docId) => { onUpdateDocument?.(docId, { status: 'Aprobado' }); }}
              onReject={async (docId) => { onUpdateDocument?.(docId, { status: 'Faltante' }); }}
              onRequestApproval={async (docId) => { onUpdateDocument?.(docId, { status: 'En revisión' }); }}
            />

            {/* Hitos del Camino */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Hitos del Camino</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[8px] font-black uppercase tracking-widest border border-border/50"
                  onClick={() => setIsAddMilestoneOpen(true)}
                >
                  Agregar Hito
                </Button>
              </div>
              <div className="space-y-3">
                {milestones.length > 0 ? (
                  milestones.map(milestone => (
                    <div
                      key={milestone.id}
                      className={cn(
                        "p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all",
                        milestone.status === 'Completado' && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          milestone.status === 'Completado' ? "bg-emerald-500" :
                          milestone.status === 'En curso' ? "bg-amber-500" :
                          "bg-slate-300"
                        )} />
                        <div>
                          <span className={cn(
                            "text-xs font-bold text-foreground/80",
                            milestone.status === 'Completado' && "line-through"
                          )}>{milestone.label}</span>
                          {milestone.etapa && (
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{milestone.etapa}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.targetDate && (
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                            {format(parseISO(milestone.targetDate), 'd MMM', { locale: es })}
                          </span>
                        )}
                        {milestone.status !== 'Completado' && onCompleteMilestone && (
                          <button
                            onClick={() => onCompleteMilestone(milestone.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/10 hover:text-emerald-500 rounded transition-all"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-border/50 rounded-2xl bg-muted/5">
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">No hay hitos programados</p>
                    <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-2" onClick={() => setIsAddMilestoneOpen(true)}>Programar Hitos</button>
                  </div>
                )}
              </div>
            </section>

            {/* Consolas Externas */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Consolas Externas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <QuickLink
                  icon={ExternalLink}
                  label="Consultar PJN"
                  description="Poder Judicial de la Nación"
                  iconColor="text-primary bg-primary/10"
                />
                <QuickLink
                  icon={MessageSquare}
                  label="WhatsApp Cliente"
                  description="Conversación directa"
                  iconColor="text-emerald-600 bg-emerald-500/10"
                />
                <QuickLink
                  icon={Paperclip}
                  label="Carpeta Drive"
                  description="Documentación en Drive"
                  iconColor="text-amber-600 bg-amber-500/10"
                />
              </div>
            </section>

            {/* Bitácora de Control */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Bitácora de Control</h3>
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <MessageSquare size={48} />
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-90 italic relative z-10">"Sin notas aún."</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/40">{matter.responsible || '—'}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/40">—</div>
                </div>
              </div>
            </section>

            {/* Movimientos financieros */}
            <ClientAccountStatement clientName={matter.client} />
          </div>
        )}

        {/* ─────────── TAB: COMUNICACIONES ─────────── */}
        {activeTab === 'comunicaciones' && (
          <div className="py-8 space-y-8">
            <CommunicationsLog
              matterId={matter.id}
              currentUser={currentUser}
              initialContent={commPrefill}
              initialCanal={commPrefill ? 'WhatsApp' : undefined}
              clientPhone={clientObj?.phone}
              clientEmail={clientObj?.email}
            />

            {/* Timeline / Historial de Actividad */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                  <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Historial de Actividad</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest"
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? 'Ver menos' : 'Historial Completo'}
                </Button>
              </div>

              <div className="space-y-0 border-l-2 border-border ml-3 pl-8">
                {displayedTimeline.length > 0 ? (
                  displayedTimeline.map((event, idx) => (
                    <div key={event.id} className="relative pb-10 last:pb-0">
                      <div className={cn(
                        "absolute -left-[41px] top-0 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center z-10",
                        idx === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <TimelineIcon type={event.type} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                            {format(parseISO(event.date), "d 'de' MMMM", { locale: es })}
                          </span>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{event.user}</span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground tracking-tight">{event.title}</h4>
                        {event.description && <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{event.description}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-left">
                    <div className="flex items-center gap-4 text-muted-foreground/40">
                      <History size={32} strokeWidth={1} />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-widest">Sin últimos movimientos</p>
                        <p className="text-[10px] font-medium uppercase tracking-widest mt-1">Todavía no se registraron actividades</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-6 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl" onClick={onNewAction}>Registrar Primer Movimiento</Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* ExpedienteForm Modal */}
      {showExpedienteForm && (
        <ExpedienteForm
          matter={matter}
          existing={expediente ?? undefined}
          onClose={() => setShowExpedienteForm(false)}
          onSaved={(saved) => {
            setExpediente(saved);
            setShowExpedienteForm(false);
          }}
        />
      )}

      {/* Stage Ficha Modal */}
      {fichaOpenStage && (() => {
        const tplStage = template?.stages?.find(s => s.name === fichaOpenStage);
        if (!tplStage?.fichaFields) return null;
        return (
          <StageFicha
            isOpen={true}
            onClose={() => setFichaOpenStage(null)}
            fichaTitle={tplStage.fichaTitle || fichaOpenStage}
            stageName={fichaOpenStage}
            sections={tplStage.fichaFields}
            currentData={matter.caseData || {}}
            onSave={(newData) => {
              onUpdateMatter?.({ caseData: { ...(matter.caseData || {}), ...newData } } as Partial<Matter>);
            }}
          />
        );
      })()}

      {/* Solicitar Documentación Modal */}
      <Modal
        isOpen={isRequestDocOpen}
        onClose={() => setIsRequestDocOpen(false)}
        title="Solicitar Documentación"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Documento</label>
            <Input placeholder="Ej: Poder Especial, Copia de DNI..." value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Criticidad</label>
              <select
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={newDocCriticality}
                onChange={(e) => setNewDocCriticality(e.target.value as any)}
              >
                <option value="Crítico">Crítico</option>
                <option value="Recomendado">Recomendado</option>
                <option value="Opcional">Opcional</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" id="blocks" className="rounded border-border" checked={newDocBlocks} onChange={(e) => setNewDocBlocks(e.target.checked)} />
            <label htmlFor="blocks" className="text-xs font-bold text-foreground">Bloquea el avance del asunto</label>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsRequestDocOpen(false)}>Cancelar</Button>
            <Button className="flex-1" disabled={!newDocName.trim()} onClick={() => {
              onAddDocument?.({
                matterId: matter.id,
                matterTitle: matter.title,
                client: matter.client,
                responsible: matter.responsible,
                name: newDocName.trim(),
                status: 'Solicitado',
                criticality: newDocCriticality,
                blocksProgress: newDocBlocks,
                updatedAt: new Date().toISOString(),
              });
              setNewDocName(''); setNewDocCriticality('Crítico'); setNewDocBlocks(false);
              setIsRequestDocOpen(false);
            }}>Solicitar Documento</Button>
          </div>
        </div>
      </Modal>

      {/* Reportar Bloqueo Modal */}
      <Modal
        isOpen={isBlockageOpen}
        onClose={() => setIsBlockageOpen(false)}
        title="Reportar Bloqueo"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción del bloqueo</label>
            <Textarea
              placeholder="Ej: Esperando contestación de demanda..."
              value={blockageText}
              onChange={(e) => setBlockageText(e.target.value)}
              rows={3}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => {
              onUpdateMatter?.({ blockage: undefined, health: matter.health === 'Trabado' ? 'Sano' : matter.health });
              setIsBlockageOpen(false);
            }}>Limpiar Bloqueo</Button>
            <Button className="flex-1" disabled={!blockageText.trim()} onClick={() => {
              onUpdateMatter?.({ blockage: blockageText.trim(), health: 'Trabado' });
              setIsBlockageOpen(false);
            }}>Guardar Bloqueo</Button>
          </div>
        </div>
      </Modal>

      {/* Cambiar Responsable Modal */}
      <Modal
        isOpen={isResponsableOpen}
        onClose={() => setIsResponsableOpen(false)}
        title="Cambiar Responsable"
      >
        <div className="space-y-2 py-4">
          {(profiles || []).map(p => (
            <button
              key={p.fullName}
              onClick={() => { onUpdateMatter?.({ responsible: p.fullName }); setIsResponsableOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                p.fullName === matter.responsible ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                {p.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm font-bold">{p.fullName}</span>
              {p.fullName === matter.responsible && <CheckCircle2 size={14} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </Modal>

      {/* Agregar Hito Modal */}
      <Modal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        title="Agregar Hito del Camino"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Hito</label>
            <Input placeholder="Ej: Audiencia de Conciliación" value={newMilestoneLabel} onChange={(e) => setNewMilestoneLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Estimada</label>
            <Input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddMilestoneOpen(false)}>Cancelar</Button>
            <Button className="flex-1" disabled={!newMilestoneLabel.trim()} onClick={() => {
              onAddMilestone?.({
                matterId: matter.id,
                label: newMilestoneLabel.trim(),
                orden: milestones.length + 1,
                status: 'Pendiente',
                targetDate: newMilestoneDate || undefined,
              });
              setNewMilestoneLabel(''); setNewMilestoneDate('');
              setIsAddMilestoneOpen(false);
            }}>Agregar Hito</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════ SUB-COMPONENTS ═══════════════════════ */

const TaskCard: React.FC<{
  task: Task;
  matter: Matter;
  navigate: (path: string) => void;
  onComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onOpenFicha?: () => void;
  hasFicha?: boolean;
  satisfiedBy?: { key: string; label: string }[];
  onRequestData?: (taskTitle: string, missing: { key: string; label: string }[]) => void;
}> = ({ task, matter, navigate, onComplete, onReopen, onOpenFicha, hasFicha, satisfiedBy, onRequestData }) => {
  const isCompleted = task.status === 'Completada';
  const caseData = matter.caseData ?? {};

  // Compute satisfaction status
  const satisfaction = satisfiedBy && satisfiedBy.length > 0 ? (() => {
    const filled = satisfiedBy.filter(f => caseData[f.key] && caseData[f.key].trim() !== '' && caseData[f.key] !== '[]');
    const missing = satisfiedBy.filter(f => !caseData[f.key] || caseData[f.key].trim() === '' || caseData[f.key] === '[]');
    return { filled, missing, allDone: missing.length === 0 };
  })() : null;

  return (
    <Card className={cn(
      "p-4 flex items-center gap-4 group transition-all",
      isCompleted
        ? "bg-muted/30 border-border/30 opacity-60"
        : task.bloqueante
        ? "hover:border-rose-500/30 bg-card border-border shadow-sm"
        : "hover:border-primary/30 bg-card border-border shadow-sm"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isCompleted ? "bg-emerald-500/10 text-emerald-600" :
        task.bloqueante ? "bg-rose-500/10 text-rose-600" :
        "bg-primary/10 text-primary"
      )}>
        {isCompleted ? <CheckCircle2 size={20} /> : task.bloqueante ? <AlertCircle size={20} /> : <CheckSquare size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-sm font-bold tracking-tight",
            isCompleted && "line-through text-muted-foreground"
          )}>{task.title}</span>
          {task.bloqueante && !isCompleted && (
            <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Bloqueante</Badge>
          )}
        </div>
        {/* Satisfaction indicator */}
        {satisfaction && !isCompleted && (
          satisfaction.allDone ? (
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 tracking-wide">Datos completos</span>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenFicha?.(); }}
              className="flex items-center gap-1.5 mt-1 group/sat hover:opacity-80 transition-opacity text-left"
            >
              <AlertCircle size={11} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-amber-600 tracking-wide">
                Falta: {satisfaction.missing.map(f => f.label).join(', ')}
              </span>
            </button>
          )
        )}
        {/* Auto-completed by system */}
        {isCompleted && task.completedBy === 'Sistema' && (
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-wide">Completada automáticamente</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
          {task.dueDate && (
            <span className="flex items-center gap-1"><Clock size={10} /> {format(parseISO(task.dueDate), 'd MMM', { locale: es })}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Show "Completar datos" button if ficha available AND there are missing fields */}
        {!isCompleted && hasFicha && onOpenFicha && satisfaction && !satisfaction.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
            onClick={(e) => { e.stopPropagation(); onOpenFicha(); }}
          >
            <FileText size={12} className="mr-1.5" />
            Completar datos
          </Button>
        )}
        {/* Show "Solicitar datos" button to send a message requesting missing data */}
        {!isCompleted && satisfaction && !satisfaction.allDone && onRequestData && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
            onClick={(e) => { e.stopPropagation(); onRequestData(task.title, satisfaction.missing); }}
          >
            <Send size={12} className="mr-1.5" />
            Solicitar datos
          </Button>
        )}
        {/* Show "Completar datos" if ficha but no satisfiedBy tracking */}
        {!isCompleted && hasFicha && onOpenFicha && !satisfaction && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
            onClick={(e) => { e.stopPropagation(); onOpenFicha(); }}
          >
            <FileText size={12} className="mr-1.5" />
            Completar datos
          </Button>
        )}
        {/* Show "Marcar resuelta" if all data is filled */}
        {!isCompleted && satisfaction?.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 transition-all"
            onClick={(e) => { e.stopPropagation(); onComplete?.(task.id); }}
          >
            <CheckCircle2 size={12} className="mr-1.5" />
            Marcar resuelta
          </Button>
        )}
        {!isCompleted && (() => {
          const matched = findTemplateForTask(task.title, matter.type as any);
          return matched ? (
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-primary/30 text-primary hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); navigate(`/plantillas?template=${matched.id}&matter=${matter.id}`); }}
            >
              <FileText size={12} className="mr-1.5" />
              Generar
            </Button>
          ) : null;
        })()}
        {!isCompleted && !satisfaction?.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => { e.stopPropagation(); onComplete?.(task.id); }}
          >
            Resolver
          </Button>
        )}
        {isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => { e.stopPropagation(); onReopen?.(task.id); }}
          >
            Reabrir
          </Button>
        )}
      </div>
    </Card>
  );
};

const DOC_STATUS_FLOW: LegalDocument['status'][] = ['Faltante', 'Solicitado', 'Recibido', 'En revisión', 'Aprobado', 'Listo para presentar', 'Presentado'];

const DocumentMatterItem: React.FC<{
  doc: LegalDocument;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangeStatus?: (docId: string, status: LegalDocument['status']) => void;
}> = ({ doc, menuOpen, onToggleMenu, onChangeStatus }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusStyles = {
    'Faltante': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    'Solicitado': 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    'Recibido': 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    'En revisión': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'Aprobado': 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    'Listo para presentar': 'text-primary-foreground bg-primary border-primary',
    'Presentado': 'text-white bg-slate-900 border-slate-900',
  };

  const isMissing = doc.status === 'Faltante' || doc.status === 'Solicitado';
  const isReceived = doc.status === 'Recibido' || doc.status === 'Aprobado' || doc.status === 'Presentado';
  const isNoAplica = doc.status === 'No aplica';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mark as received when file is selected
      onChangeStatus?.(doc.id, 'Recibido');
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className={cn(
      "p-4 border border-border/50 group hover:border-primary/30 transition-all rounded-2xl relative",
      doc.blocksProgress && !isReceived && !isNoAplica && "border-l-4 border-l-rose-500 bg-rose-500/[0.01]",
      isNoAplica && "opacity-50",
      isReceived && "border-l-4 border-l-emerald-500"
    )}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
        onChange={handleFileUpload}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            statusStyles[doc.status] || statusStyles['Faltante']
          )}>
            {isReceived ? <CheckCircle2 size={18} /> : isNoAplica ? <Ban size={18} /> : <FileText size={18} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn(
                "text-sm font-bold text-foreground truncate tracking-tight",
                isNoAplica && "line-through text-muted-foreground"
              )}>{doc.name}</span>
              {doc.criticality === 'Crítico' && !isNoAplica && (
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">Cr\u00edtico</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{doc.status}</span>
              {doc.blocksProgress && !isReceived && !isNoAplica && (
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert size={10} />
                  Bloquea Avance
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {doc.updatedAt && (
            <div className="text-right hidden sm:block mr-2">
              <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Actualizado</div>
              <div className="text-[10px] font-bold text-foreground">{format(parseISO(doc.updatedAt), 'd MMM', { locale: es })}</div>
            </div>
          )}

          {/* Action buttons — always visible when missing */}
          {isMissing && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all"
              >
                <Upload size={12} />
                Subir
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, 'Recibido'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg transition-all"
              >
                <CheckCircle2 size={12} />
                Recibido
              </button>
            </>
          )}

          {/* Received/approved actions */}
          {isReceived && (
            <>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Eye size={12} />
                Ver
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <RefreshCw size={12} />
                Reemplazar
              </button>
            </>
          )}

          {/* 3-dot menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
            >
              <MoreHorizontal size={16} />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-52 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cambiar estado</div>
                {DOC_STATUS_FLOW.map(s => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, s); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-muted/50 transition-colors",
                      s === doc.status ? "text-primary bg-primary/5" : "text-foreground"
                    )}
                  >
                    {s === doc.status ? `\u2713 ${s}` : s}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, 'No aplica' as any); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-muted/50 transition-colors text-muted-foreground",
                    doc.status === 'No aplica' && "text-primary bg-primary/5"
                  )}
                >
                  {doc.status === 'No aplica' ? '\u2713 No aplica' : 'Marcar como no aplica'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const QuickLink = ({ icon: Icon, label, description, iconColor }: { icon: any, label: string, description: string, iconColor: string }) => (
  <button className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm transition-all group cursor-pointer">
    <div className="flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconColor)}>
        <Icon size={17} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label} →</p>
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1 shrink-0" />
  </button>
);

const TimelineIcon = ({ type }: { type: TimelineEvent['type'] }) => {
  switch (type) {
    case 'creation': return <Plus size={20} />;
    case 'call': return <MessageSquare size={20} />;
    case 'doc_received': return <Paperclip size={20} />;
    case 'task_created': return <CheckSquare size={20} />;
    case 'draft': return <FileText size={20} />;
    case 'presentation': return <ExternalLink size={20} />;
    default: return <Info size={20} />;
  }
};
