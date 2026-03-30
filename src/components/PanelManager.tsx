import React, { useState, useMemo } from 'react';
import { Card, Badge, Button } from './UI';
import { Matter, LegalDocument, Consultation, UserProfile } from '../types';
import {
  Users, Briefcase, AlertCircle, Clock, ShieldAlert, PauseCircle,
  TrendingUp, BarChart3, ArrowRight, ChevronDown, ChevronUp,
  FileWarning, CheckCircle2, Scale
} from 'lucide-react';
import { isPast, isToday, parseISO, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface PanelManagerProps {
  matters: Matter[];
  documents: LegalDocument[];
  consultations: Consultation[];
  profiles: UserProfile[];
  onSelectMatter: (id: string) => void;
}

interface AttorneyStats {
  profile: UserProfile;
  total: number;
  activos: number;
  vencidos: number;
  rotos: number;
  trabados: number;
  enEspera: number;
  sanos: number;
  alta: number;
  docsCriticos: number;
  matters: Matter[];
}

export const PanelManager = ({ matters, documents, consultations, profiles, onSelectMatter }: PanelManagerProps) => {
  const [expandedAttorney, setExpandedAttorney] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'vencidos' | 'total' | 'rotos'>('vencidos');

  const activeMatters = matters.filter(m => m.status !== 'Cerrado');

  // Stats globales
  const globalStats = useMemo(() => {
    const overdue = activeMatters.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate)));
    const today = activeMatters.filter(m => m.nextActionDate && isToday(parseISO(m.nextActionDate)));
    const broken = activeMatters.filter(m => m.health === 'Roto');
    const stuck = activeMatters.filter(m => m.health === 'Trabado');
    const healthy = activeMatters.filter(m => m.health === 'Sano');
    const closed30d = matters.filter(m => m.status === 'Cerrado' && m.lastActivity && differenceInDays(new Date(), parseISO(m.lastActivity)) <= 30);
    const critDocs = documents.filter(d => d.criticality === 'Crítico' && (d.status === 'Faltante' || d.status === 'Solicitado'));

    const consultasAceptadas = consultations.filter(c => c.status === 'Aceptada').length;
    const consultasTotal = consultations.length;
    const conversionRate = consultasTotal > 0 ? Math.round((consultasAceptadas / consultasTotal) * 100) : 0;

    // Distribución por tipo
    const byType: Record<string, number> = {};
    activeMatters.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    return {
      total: activeMatters.length,
      overdue: overdue.length,
      today: today.length,
      broken: broken.length,
      stuck: stuck.length,
      healthy: healthy.length,
      closed30d: closed30d.length,
      critDocs: critDocs.length,
      conversionRate,
      byType,
      healthRate: activeMatters.length > 0 ? Math.round((healthy.length / activeMatters.length) * 100) : 0,
    };
  }, [activeMatters, documents, consultations, matters]);

  // Stats por abogado
  const attorneyStats = useMemo(() => {
    const activeProfiles = profiles.filter(p => p.isActive);
    const stats: AttorneyStats[] = activeProfiles.map(profile => {
      const myMatters = activeMatters.filter(m => m.responsible === profile.fullName);
      const myDocs = documents.filter(d => d.responsible === profile.fullName);
      return {
        profile,
        total: myMatters.length,
        activos: myMatters.length,
        vencidos: myMatters.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate))).length,
        rotos: myMatters.filter(m => m.health === 'Roto').length,
        trabados: myMatters.filter(m => m.health === 'Trabado').length,
        enEspera: myMatters.filter(m => m.health === 'En espera').length,
        sanos: myMatters.filter(m => m.health === 'Sano').length,
        alta: myMatters.filter(m => m.priority === 'Alta').length,
        docsCriticos: myDocs.filter(d => d.criticality === 'Crítico' && (d.status === 'Faltante' || d.status === 'Solicitado')).length,
        matters: myMatters,
      };
    });

    // También incluir responsables que no tienen perfil (datos legacy)
    const profileNames = new Set(activeProfiles.map(p => p.fullName));
    const unmatchedResponsibles = new Set<string>();
    activeMatters.forEach(m => {
      if (!profileNames.has(m.responsible)) unmatchedResponsibles.add(m.responsible);
    });
    unmatchedResponsibles.forEach(name => {
      const myMatters = activeMatters.filter(m => m.responsible === name);
      const myDocs = documents.filter(d => d.responsible === name);
      stats.push({
        profile: { id: name, fullName: name, email: '', role: 'Abogado', initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(), isActive: true },
        total: myMatters.length,
        activos: myMatters.length,
        vencidos: myMatters.filter(m => m.nextActionDate && isPast(parseISO(m.nextActionDate)) && !isToday(parseISO(m.nextActionDate))).length,
        rotos: myMatters.filter(m => m.health === 'Roto').length,
        trabados: myMatters.filter(m => m.health === 'Trabado').length,
        enEspera: myMatters.filter(m => m.health === 'En espera').length,
        sanos: myMatters.filter(m => m.health === 'Sano').length,
        alta: myMatters.filter(m => m.priority === 'Alta').length,
        docsCriticos: myDocs.filter(d => d.criticality === 'Crítico' && (d.status === 'Faltante' || d.status === 'Solicitado')).length,
        matters: myMatters,
      });
    });

    // Ordenar
    return stats
      .filter(s => s.total > 0)
      .sort((a, b) => {
        if (sortBy === 'vencidos') return b.vencidos - a.vencidos || b.rotos - a.rotos;
        if (sortBy === 'rotos') return b.rotos - a.rotos || b.vencidos - a.vencidos;
        return b.total - a.total;
      });
  }, [activeMatters, documents, profiles, sortBy]);

  // Sin asignar
  const unassigned = activeMatters.filter(m => !m.responsible || m.responsible.trim() === '');

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-foreground">Panel del Estudio</h1>
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
          Vista gerencial — carga de trabajo y métricas operativas
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KPICard label="Asuntos Activos" value={globalStats.total} icon={Briefcase} />
        <KPICard label="Salud del Estudio" value={`${globalStats.healthRate}%`} icon={TrendingUp} variant={globalStats.healthRate >= 70 ? 'success' : globalStats.healthRate >= 40 ? 'warning' : 'error'} />
        <KPICard label="Vencidos" value={globalStats.overdue} icon={AlertCircle} variant={globalStats.overdue > 0 ? 'error' : 'success'} />
        <KPICard label="Cerrados (30d)" value={globalStats.closed30d} icon={CheckCircle2} variant="success" />
        <KPICard label="Conversión" value={`${globalStats.conversionRate}%`} icon={BarChart3} />
      </div>

      {/* Distribution by type */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Scale size={18} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Distribución por Rama</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(globalStats.byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3 border border-border/50">
                <span className="text-sm font-bold text-foreground">{type}</span>
                <span className="text-lg font-black text-primary">{count}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  ({Math.round((count / globalStats.total) * 100)}%)
                </span>
              </div>
            ))}
        </div>
      </Card>

      {/* Attorney Workload */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">Carga por Abogado</h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                {attorneyStats.length} miembros con asuntos asignados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span>Ordenar:</span>
            {(['vencidos', 'rotos', 'total'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  'px-2 py-1 rounded-lg transition-colors capitalize',
                  sortBy === key ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {attorneyStats.map(stat => (
            <AttorneyCard
              key={stat.profile.id}
              stat={stat}
              isExpanded={expandedAttorney === stat.profile.id}
              onToggle={() => setExpandedAttorney(expandedAttorney === stat.profile.id ? null : stat.profile.id)}
              onSelectMatter={onSelectMatter}
            />
          ))}
        </div>

        {unassigned.length > 0 && (
          <Card className="p-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {unassigned.length} asunto{unassigned.length > 1 ? 's' : ''} sin responsable asignado
              </span>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────

const KPICard = ({ label, value, icon: Icon, variant = 'default' }: {
  label: string;
  value: number | string;
  icon: any;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) => {
  const styles = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-rose-600 dark:text-rose-400',
  };

  return (
    <Card className="p-4 flex flex-col justify-between h-28">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-muted border border-border/50">
          <Icon size={18} className="text-muted-foreground" />
        </div>
        <div className={cn('text-2xl font-black tracking-tighter', styles[variant])}>{value}</div>
      </div>
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground leading-none">{label}</div>
    </Card>
  );
};

const AttorneyCard = ({ stat, isExpanded, onToggle, onSelectMatter }: {
  stat: AttorneyStats;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectMatter: (id: string) => void;
}) => {
  const healthPercent = stat.total > 0 ? Math.round((stat.sanos / stat.total) * 100) : 0;
  const hasProblems = stat.vencidos > 0 || stat.rotos > 0;

  return (
    <Card className={cn('transition-all', hasProblems && 'border-amber-500/30')}>
      {/* Header */}
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors">
        <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shrink-0">
          {stat.profile.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate">{stat.profile.fullName}</span>
            <Badge variant="outline">{stat.profile.role}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>{stat.total} asuntos</span>
            <span className="opacity-30">|</span>
            <span>{stat.alta} prioridad alta</span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="hidden md:flex items-center gap-4">
          <MiniStat label="Vencidos" value={stat.vencidos} variant={stat.vencidos > 0 ? 'error' : 'default'} />
          <MiniStat label="Rotos" value={stat.rotos} variant={stat.rotos > 0 ? 'error' : 'default'} />
          <MiniStat label="Trabados" value={stat.trabados} variant={stat.trabados > 0 ? 'warning' : 'default'} />
          <MiniStat label="Sanos" value={stat.sanos} variant="success" />
        </div>

        {/* Health bar */}
        <div className="hidden lg:flex flex-col items-end gap-1 w-24">
          <span className="text-[10px] font-bold text-muted-foreground">{healthPercent}% sano</span>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                healthPercent >= 70 ? 'bg-emerald-500' : healthPercent >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        <div className="text-muted-foreground">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded: matter list */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/20">
          {/* Mobile mini stats */}
          <div className="md:hidden flex items-center gap-3 p-3 border-b border-border/50">
            <MiniStat label="Vencidos" value={stat.vencidos} variant={stat.vencidos > 0 ? 'error' : 'default'} />
            <MiniStat label="Rotos" value={stat.rotos} variant={stat.rotos > 0 ? 'error' : 'default'} />
            <MiniStat label="Trabados" value={stat.trabados} variant={stat.trabados > 0 ? 'warning' : 'default'} />
            <MiniStat label="Sanos" value={stat.sanos} variant="success" />
          </div>

          <div className="divide-y divide-border/50">
            {stat.matters
              .sort((a, b) => {
                // Vencidos primero, luego rotos, luego por prioridad
                const aOverdue = a.nextActionDate && isPast(parseISO(a.nextActionDate)) && !isToday(parseISO(a.nextActionDate)) ? 1 : 0;
                const bOverdue = b.nextActionDate && isPast(parseISO(b.nextActionDate)) && !isToday(parseISO(b.nextActionDate)) ? 1 : 0;
                if (bOverdue !== aOverdue) return bOverdue - aOverdue;
                const healthOrder = { 'Roto': 3, 'Trabado': 2, 'En espera': 1, 'Sano': 0 };
                return (healthOrder[b.health] || 0) - (healthOrder[a.health] || 0);
              })
              .map(matter => {
                const isOverdue = matter.nextActionDate && isPast(parseISO(matter.nextActionDate)) && !isToday(parseISO(matter.nextActionDate));
                return (
                  <button
                    key={matter.id}
                    onClick={() => onSelectMatter(matter.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      matter.health === 'Roto' ? 'bg-rose-500' :
                      matter.health === 'Trabado' ? 'bg-amber-500' :
                      matter.health === 'En espera' ? 'bg-sky-400' :
                      'bg-emerald-500'
                    )} />

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{matter.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {matter.client} — {matter.type}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle size={12} />
                          Vencido
                        </span>
                      )}
                      <HealthBadgeMini health={matter.health} />
                      <PriorityDot priority={matter.priority} />
                      <ArrowRight size={14} className="text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </Card>
  );
};

const MiniStat = ({ label, value, variant = 'default' }: { label: string; value: number; variant?: 'default' | 'success' | 'warning' | 'error' }) => {
  const colors = {
    default: 'text-muted-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="text-center">
      <div className={cn('text-lg font-black', colors[variant])}>{value}</div>
      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</div>
    </div>
  );
};

const HealthBadgeMini = ({ health }: { health: Matter['health'] }) => {
  const styles = {
    'Sano': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'Trabado': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'Roto': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'En espera': 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-[0.1em] border', styles[health])}>
      {health}
    </span>
  );
};

const PriorityDot = ({ priority }: { priority: Matter['priority'] }) => {
  const colors = { Alta: 'bg-rose-500', Media: 'bg-amber-500', Baja: 'bg-emerald-500' };
  return <div className={cn('w-2.5 h-2.5 rounded-full', colors[priority])} title={`Prioridad ${priority}`} />;
};
