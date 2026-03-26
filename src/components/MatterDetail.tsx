import React, { useState } from 'react';
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
  PhoneCall,
  Send,
  Gavel,
  Coins,
  Activity as ActivityIcon
} from 'lucide-react';
import { Matter, TimelineEvent, Task, LegalDocument } from '../types';
import { Badge, Card, Button, Modal, Input, Textarea, Select } from './UI';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MatterDetailProps {
  matter: Matter;
  timeline: TimelineEvent[];
  tasks: Task[];
  documents: LegalDocument[];
  onBack: () => void;
  onNewAction: () => void;
  onEditMatter: () => void;
}

import { ACTION_ICONS } from '../constants';

export const MatterDetail = ({ matter, timeline, tasks, documents, onBack, onNewAction, onEditMatter }: MatterDetailProps) => {
  const [isRequestDocOpen, setIsRequestDocOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const missingDocs = documents.filter(d => d.status === 'Faltante');
  const criticalTasks = tasks.filter(t => t.priority === 'Alta' && t.status !== 'Completada');
  const displayedTasks = showAllTasks ? tasks : criticalTasks.slice(0, 3);
  const displayedTimeline = showAllHistory ? timeline : timeline.slice(0, 3);
  
  const ActionIcon = matter.nextActionType ? ACTION_ICONS[matter.nextActionType] : Zap;
  
  // Mock milestones for the "Próximos Hitos" section
  const nextMilestones = [
    { id: '1', label: 'Revisión Interna', date: '2024-04-15', status: 'pending' },
    { id: '2', label: 'Presentación Escrito', date: '2024-04-20', status: 'upcoming' },
    { id: '3', label: 'Audiencia Preliminar', date: '2024-05-10', status: 'upcoming' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header - Compact & Clear */}
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
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/50">{matter.type}</Badge>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Exp: {matter.expediente || 'S/D'}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter leading-[0.9]">{matter.title}</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">{matter.client}</p>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-[10px] font-black uppercase tracking-widest h-11 px-6 rounded-xl"
              onClick={onEditMatter}
            >
              Editar Caso
            </Button>
            <Button 
              onClick={onNewAction}
              variant="primary" 
              size="sm" 
              className="text-[10px] font-black uppercase tracking-widest h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-xl shadow-primary/20"
            >
              <Plus size={16} className="mr-2" />
              Nueva Acción
            </Button>
          </div>
        </div>
      </div>

      {/* HERO OPERATIVO - The Control Center */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Health & Next Action (Primary Focus) */}
        <div className={cn(
          "lg:col-span-5 p-10 flex flex-col justify-between min-h-[300px] relative overflow-hidden",
          matter.health === 'Roto' ? 'bg-rose-600 text-white' : 
          matter.health === 'Trabado' ? 'bg-amber-500 text-white' :
          matter.health === 'En espera' ? 'bg-sky-600 text-white' :
          'bg-slate-900 text-white'
        )}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                {matter.health === 'Sano' ? <CheckCircle2 size={20} /> : 
                 matter.health === 'Trabado' ? <PauseCircle size={20} /> :
                 matter.health === 'Roto' ? <ShieldAlert size={20} /> :
                 <Clock size={20} />}
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">Salud del Asunto: {matter.health}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Próxima Acción</span>
                {matter.nextActionType && (
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/20 text-white/70 h-4 px-1.5">
                    {matter.nextActionType.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl backdrop-blur-md border mt-1 shrink-0",
                  !matter.nextAction ? "bg-rose-500/20 border-rose-500/40 text-rose-100 animate-pulse" : "bg-white/10 border-white/20"
                )}>
                  <ActionIcon size={24} />
                </div>
                <div className="space-y-3">
                  <h2 className={cn(
                    "text-3xl md:text-4xl font-black tracking-tight leading-tight",
                    !matter.nextAction && "text-rose-100/90"
                  )}>
                    {matter.nextAction || 'Sin próxima acción'}
                  </h2>
                  {!matter.nextAction && (
                    <Button 
                      onClick={onNewAction}
                      variant="primary" 
                      size="sm" 
                      className="bg-white text-rose-600 hover:bg-white/90 border-none text-[10px] font-black uppercase tracking-widest h-9 px-4 rounded-lg shadow-lg"
                    >
                      <Plus size={14} className="mr-2" />
                      Definir Acción Ahora
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between pt-8">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Fecha de Seguimiento</span>
              <div className={cn(
                "text-2xl font-black tracking-tighter flex items-center gap-2",
                !matter.nextActionDate && "text-rose-200/60"
              )}>
                <Calendar size={20} className="opacity-50" />
                {matter.nextActionDate ? format(parseISO(matter.nextActionDate), "d 'de' MMMM", { locale: es }) : 'Sin fecha definida'}
              </div>
              {!matter.nextActionDate && (
                <p className="text-[9px] font-bold text-rose-100/40 uppercase tracking-widest">Falta estructura operativa</p>
              )}
            </div>
            {matter.priority === 'Alta' && (
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                Prioridad Alta
              </div>
            )}
          </div>
          
          {/* Decorative Background Icon */}
          <Zap size={240} className="absolute -bottom-20 -right-20 opacity-5 pointer-events-none" />
        </div>

        {/* Blockage & Responsibility (Secondary Focus) */}
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 bg-card">
          {/* Blockage Section */}
          <div className="p-10 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between group hover:bg-muted/30 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <AlertCircle size={16} className={cn(matter.blockage ? "text-rose-500" : "text-muted-foreground opacity-30")} />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Bloqueo Actual</span>
              </div>
              <p className={cn(
                "text-xl font-bold tracking-tight leading-snug",
                matter.blockage ? "text-foreground" : "text-muted-foreground italic opacity-40"
              )}>
                {matter.blockage || 'Sin bloqueos detectados'}
              </p>
            </div>
            <div className="pt-6">
              <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest h-8 px-3 border border-border/50 opacity-0 group-hover:opacity-100 transition-all">Reportar Bloqueo</Button>
            </div>
          </div>

          {/* Responsibility & Activity Section */}
          <div className="p-10 flex flex-col justify-between space-y-8">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-lg",
                matter.responsible === 'Sin asignar' || !matter.responsible 
                  ? "bg-rose-500/10 text-rose-600 border-2 border-dashed border-rose-500/30 shadow-none" 
                  : "bg-primary text-primary-foreground shadow-primary/20"
              )}>
                {matter.responsible && matter.responsible !== 'Sin asignar' 
                  ? matter.responsible.split(' ').map(n => n[0]).join('') 
                  : <User size={20} />}
              </div>
              <div>
                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Responsable</div>
                <div className={cn(
                  "text-base font-bold",
                  (matter.responsible === 'Sin asignar' || !matter.responsible) ? "text-rose-600" : "text-foreground"
                )}>
                  {matter.responsible || 'Sin asignar'}
                </div>
                {(matter.responsible === 'Sin asignar' || !matter.responsible) && (
                  <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-1">Asignar para activar</button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Última Actividad</div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-foreground/80 leading-relaxed">
                    {timeline[0]?.title || 'Sin actividad reciente'}
                    <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-50">
                      Hace {format(parseISO(timeline[0]?.date || matter.lastActivity), "d 'días'", { locale: es })}
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Estado documental</div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-1000" 
                      style={{ width: `${Math.round((documents.filter(d => d.status === 'Presentado' || d.status === 'Aprobado').length / documents.length) * 100) || 0}%` }} 
                    />
                  </div>
                  <span className="text-[10px] font-black text-white">
                    {Math.round((documents.filter(d => d.status === 'Presentado' || d.status === 'Aprobado').length / documents.length) * 100) || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN OPERATIONAL CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Flow & Action */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* DOCUMENTACIÓN OPERATIVA - Integrated Flow */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Documentación Requerida</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-rose-500/20 text-rose-600 bg-rose-500/5">
                  {documents.filter(d => d.blocksProgress && d.status !== 'Presentado').length} Bloqueos
                </Badge>
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
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <DocumentMatterItem key={doc.id} doc={doc} />
                ))
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
                  <FileSearch size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No hay documentos sugeridos</p>
                  <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest mt-1">Podés cargar la estructura manualmente</p>
                  <Button variant="outline" size="sm" className="mt-6 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl">Cargar Documento</Button>
                </div>
              )}
            </div>
          </section>

          {/* TAREAS CRÍTICAS */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Checklist Inicial</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-black uppercase tracking-widest"
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? 'Ver menos' : 'Ver todas'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {displayedTasks.length > 0 ? (
                displayedTasks.map(task => (
                  <Card key={task.id} className="p-5 flex items-center gap-6 group hover:border-rose-500/30 transition-all bg-card border-border shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-bold text-foreground tracking-tight">{task.title}</span>
                        <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Bloqueante</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                        <span className="flex items-center gap-1.5"><Clock size={12} /> Vence: {format(parseISO(task.dueDate), 'd MMM', { locale: es })}</span>
                        <span className="flex items-center gap-1.5"><User size={12} /> {matter.responsible.split(' ').pop()}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all">Resolver</Button>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center border border-border/50 rounded-2xl bg-muted/5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-40">No hay tareas críticas pendientes</p>
                </div>
              )}
            </div>
          </section>

          {/* ÚLTIMOS MOVIMIENTOS - Operational Timeline */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Última Actividad</h3>
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
                      <p className="text-[10px] font-medium uppercase tracking-widest mt-1">Todavía no se registraron actividades en este asunto</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-6 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl">Registrar Primer Movimiento</Button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - Context & Secondary Info */}
        <div className="lg:col-span-4 space-y-12">
          
          {/* PRÓXIMOS HITOS */}
          <section className="space-y-6">
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
              {nextMilestones.length > 0 ? (
                nextMilestones.map(milestone => (
                  <div key={milestone.id} className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        milestone.status === 'pending' ? "bg-amber-500" : "bg-slate-300"
                      )} />
                      <span className="text-xs font-bold text-foreground/80">{milestone.label}</span>
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                      {format(parseISO(milestone.date), 'd MMM', { locale: es })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border border-border/50 rounded-2xl bg-muted/5">
                  <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">No hay hitos programados</p>
                  <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-2">Programar Hitos</button>
                </div>
              )}
            </div>
          </section>

          {/* DATOS DEL CASO & DESCRIPCIÓN */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Datos del Asunto</h3>
            <Card className="p-6 bg-muted/30 border-border space-y-6">
              <div className="space-y-4">
                <div className="text-xs text-foreground/70 leading-relaxed italic">
                  "{matter.description || 'Sin descripción narrativa.'}"
                </div>
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

          {/* VÍNCULOS RÁPIDOS */}
          <section className="space-y-6">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Consolas Externas</h3>
            <div className="grid grid-cols-1 gap-2">
              <QuickLink icon={ExternalLink} label="PJN - Consulta de causas" />
              <QuickLink icon={MessageSquare} label="WhatsApp Cliente" />
              <QuickLink icon={Paperclip} label="Carpeta Drive" />
            </div>
          </section>

          {/* BITÁCORA DE CONTROL */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Bitácora de Control</h3>
            <div className="bg-slate-900 text-white p-6 rounded-[2rem] space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <MessageSquare size={48} />
              </div>
              <p className="text-xs font-bold leading-relaxed opacity-90 italic relative z-10">"El cliente llamó preocupado por los tiempos. Recordar mencionar que la feria judicial retrasó los plazos."</p>
              <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Dr. Darín</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Hace 2 días</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Modals for Quick Actions */}
      <Modal
        isOpen={isRequestDocOpen}
        onClose={() => setIsRequestDocOpen(false)}
        title="Solicitar Documentación"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Documento</label>
            <Input placeholder="Ej: Poder Especial, Copia de DNI..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Criticidad</label>
              <Select options={['Crítico', 'Recomendado', 'Opcional']} defaultValue="Crítico" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable</label>
              <Select options={['Cliente', 'Estudio', 'Tercero']} defaultValue="Cliente" />
            </div>
          </div>
          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" id="blocks" className="rounded border-border" />
            <label htmlFor="blocks" className="text-xs font-bold text-foreground">Bloquea el avance del asunto</label>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsRequestDocOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => setIsRequestDocOpen(false)}>Solicitar Documento</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        title="Agregar Hito del Camino"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Hito</label>
            <Input placeholder="Ej: Audiencia de Conciliación" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Estimada</label>
            <Input type="date" />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddMilestoneOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={() => setIsAddMilestoneOpen(false)}>Agregar Hito</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const DocumentMatterItem: React.FC<{ doc: LegalDocument }> = ({ doc }) => {
  const statusStyles = {
    'Faltante': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    'Solicitado': 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    'Recibido': 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    'En revisión': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'Aprobado': 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    'Listo para presentar': 'text-primary-foreground bg-primary border-primary',
    'Presentado': 'text-white bg-slate-900 border-slate-900',
  };

  const criticalityLabels = {
    'Crítico': 'Crítico',
    'Recomendado': 'Rec.',
    'Opcional': 'Opt.'
  };

  return (
    <Card className={cn(
      "p-4 border border-border/50 flex items-center justify-between group hover:border-primary/30 transition-all rounded-2xl relative overflow-hidden",
      doc.blocksProgress && doc.status !== 'Presentado' && "bg-rose-500/[0.01]"
    )}>
      {doc.blocksProgress && doc.status !== 'Presentado' && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
      )}
      
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
          statusStyles[doc.status]
        )}>
          {doc.status === 'Presentado' || doc.status === 'Aprobado' ? <CheckCircle2 size={18} /> : <FileText size={18} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-foreground truncate tracking-tight">{doc.name}</span>
            {doc.criticality === 'Crítico' && (
              <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">Crítico</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{doc.status}</span>
            {doc.blocksProgress && doc.status !== 'Presentado' && (
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                <ShieldAlert size={10} />
                Bloquea Avance
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {doc.updatedAt && (
          <div className="text-right hidden sm:block">
            <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Actualizado</div>
            <div className="text-[10px] font-bold text-foreground">{format(parseISO(doc.updatedAt), 'd MMM', { locale: es })}</div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
          <MoreHorizontal size={16} />
        </Button>
      </div>
    </Card>
  );
};

const ChecklistItem = ({ label, type, critical, status }: { label: string, type: string, critical?: boolean, status: 'missing' | 'pending' | 'completed' }) => (
  <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors group">
    <div className="flex items-center gap-4">
      <div className={cn(
        "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
        status === 'completed' ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground border border-border"
      )}>
        {status === 'completed' ? <CheckCircle2 size={14} /> : <div className="w-2 h-2 rounded-full bg-current opacity-20" />}
      </div>
      <div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-sm font-bold tracking-tight",
            status === 'completed' ? "text-muted-foreground line-through opacity-50" : "text-foreground"
          )}>
            {label}
          </span>
          {critical && status !== 'completed' && (
            <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Crítico</Badge>
          )}
        </div>
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-40">{type}</div>
      </div>
    </div>
    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
      {status === 'completed' ? 'Reabrir' : 'Resolver'}
    </Button>
  </div>
);

const HealthBadge = ({ health }: { health: Matter['health'] }) => {
  const styles = {
    'Sano': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Trabado': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Roto': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'En espera': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  };

  return (
    <span className={cn(
      'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border',
      styles[health]
    )}>
      {health}
    </span>
  );
};

const QuickLink = ({ icon: Icon, label }: { icon: any, label: string }) => (
  <button className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md transition-all group">
    <div className="flex items-center gap-4">
      <Icon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm font-bold text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
    </div>
    <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
  </button>
);

const DocStatusCard = ({ label, count, variant }: { label: string, count: number, variant: 'error' | 'warning' | 'success' }) => (
  <div className={cn(
    'p-6 rounded-2xl border flex items-center justify-between shadow-sm',
    variant === 'error' ? 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400' :
    variant === 'warning' ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400' :
    'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
  )}>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">{label}</span>
    <span className="text-2xl font-black tracking-tighter">{count}</span>
  </div>
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
