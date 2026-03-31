import React, { useMemo } from 'react';
import { useAppContext } from '../lib/AppContext';
import { Card } from '../components/UI';
import { cn } from '../lib/utils';
import {
  BarChart3,
  Briefcase,
  Heart,
  Filter,
  Users,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────

const pct = (n: number, total: number) =>
  total === 0 ? 0 : Math.round((n / total) * 100);

const SectionLabel = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
      {label}
    </h2>
  </div>
);

const StatCard = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) => (
  <Card className="p-5">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
      {label}
    </p>
    <p className={cn('text-3xl font-black', color)}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

const HBar = ({
  label,
  count,
  max,
  colorClass,
}: {
  label: string;
  count: number;
  max: number;
  colorClass: string;
}) => {
  const width = max === 0 ? 0 : Math.max((count / max) * 100, count > 0 ? 4 : 0);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground text-right">{label}</span>
      <div className="flex-1 h-7 bg-muted/40 rounded-lg overflow-hidden">
        <div
          className={cn('h-full rounded-lg transition-all', colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-black">{count}</span>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────

export const ReportesPage = () => {
  const { matters, consultations, tasks, profiles } = useAppContext();

  // ── Section 1: Resumen General ───────────────────────────────────
  const causasActivas = useMemo(
    () => matters.filter((m) => m.status === 'Activo').length,
    [matters],
  );

  const leadsDelMes = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth();
    return consultations.filter((c) => {
      const d = new Date(c.date);
      return d.getFullYear() === y && d.getMonth() === mo;
    }).length;
  }, [consultations]);

  const tasaConversion = useMemo(() => {
    const nonArchived = consultations.filter((c) => c.status !== 'Archivada');
    const accepted = nonArchived.filter((c) => c.status === 'Aceptada');
    return pct(accepted.length, nonArchived.length);
  }, [consultations]);

  const tareasPendientes = useMemo(
    () => tasks.filter((t) => t.status === 'Pendiente').length,
    [tasks],
  );

  // ── Section 2: Causas por Estado ─────────────────────────────────
  const statusGroups = useMemo(() => {
    const map: Record<string, number> = { Activo: 0, Suspendido: 0, Cerrado: 0, Pausado: 0 };
    matters.forEach((m) => {
      if (map[m.status] !== undefined) map[m.status]++;
    });
    return map;
  }, [matters]);

  const statusMax = useMemo(() => Math.max(...Object.values(statusGroups) as number[], 1), [statusGroups]);

  // ── Section 3: Causas por Tipo ───────────────────────────────────
  const typeGroups = useMemo(() => {
    const types = ['Laboral', 'Familia', 'Daños', 'Comercial', 'Sucesiones', 'Civil'] as const;
    const map: Record<string, number> = {};
    types.forEach((t) => (map[t] = 0));
    matters.forEach((m) => {
      if (map[m.type] !== undefined) map[m.type]++;
    });
    return map;
  }, [matters]);

  const typeMax = useMemo(() => Math.max(...Object.values(typeGroups) as number[], 1), [typeGroups]);

  // ── Section 4: Carga de Trabajo ──────────────────────────────────
  // Tasks don't have an assignee field, so we count pending tasks
  // linked to matters the profile is responsible for.
  const workloadFinal = useMemo(() => {
    const active = profiles.filter((p) => p.isActive);
    const matterIdsByResponsible = new Map<string, Set<string>>();
    matters.forEach((m) => {
      if (!matterIdsByResponsible.has(m.responsible))
        matterIdsByResponsible.set(m.responsible, new Set());
      matterIdsByResponsible.get(m.responsible)!.add(m.id);
    });

    return active
      .map((p) => {
        const matterIds = matterIdsByResponsible.get(p.fullName) ?? new Set<string>();
        return {
          name: p.fullName,
          role: p.role,
          activeMatters: matters.filter(
            (m) => m.responsible === p.fullName && m.status === 'Activo',
          ).length,
          pendingTasks: tasks.filter(
            (t) => t.status === 'Pendiente' && t.matterId && matterIds.has(t.matterId),
          ).length,
        };
      })
      .sort((a, b) => b.activeMatters - a.activeMatters);
  }, [profiles, matters, tasks]);

  // ── Section 5: Salud ─────────────────────────────────────────────
  const healthGroups = useMemo(() => {
    const map: Record<string, number> = { Sano: 0, Trabado: 0, Roto: 0, 'En espera': 0 };
    matters.forEach((m) => {
      if (map[m.health] !== undefined) map[m.health]++;
    });
    return map;
  }, [matters]);

  // ── Section 6: Pipeline de Consultas ─────────────────────────────
  const pipeline = useMemo(() => {
    const stages = [
      'Nueva',
      'Contactada',
      'Esperando info',
      'Evaluando viabilidad',
      'Presupuestada',
      'Aceptada',
      'Rechazada',
    ] as const;
    const map: Record<string, number> = {};
    stages.forEach((s) => (map[s] = 0));
    consultations.forEach((c) => {
      if (map[c.status] !== undefined) map[c.status]++;
    });
    return stages.map((s) => ({ stage: s, count: map[s] }));
  }, [consultations]);

  const pipelineMax = useMemo(
    () => Math.max(...pipeline.map((p) => p.count), 1),
    [pipeline],
  );

  // ── Color maps ───────────────────────────────────────────────────
  const statusColors: Record<string, string> = {
    Activo: 'bg-emerald-500',
    Suspendido: 'bg-amber-500',
    Cerrado: 'bg-muted-foreground/40',
    Pausado: 'bg-sky-500',
  };

  const typeColors: Record<string, string> = {
    Laboral: 'bg-emerald-500',
    Familia: 'bg-rose-500',
    'Daños': 'bg-amber-500',
    Comercial: 'bg-sky-500',
    Sucesiones: 'bg-violet-500',
    Civil: 'bg-indigo-500',
  };

  const healthConfig: { key: string; color: string; textColor: string }[] = [
    { key: 'Sano', color: 'bg-emerald-500/10 border-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'Trabado', color: 'bg-amber-500/10 border-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' },
    { key: 'Roto', color: 'bg-rose-500/10 border-rose-500/20', textColor: 'text-rose-600 dark:text-rose-400' },
    { key: 'En espera', color: 'bg-sky-500/10 border-sky-500/20', textColor: 'text-sky-600 dark:text-sky-400' },
  ];

  const pipelineColors: Record<string, string> = {
    Nueva: 'bg-sky-500',
    Contactada: 'bg-indigo-500',
    'Esperando info': 'bg-violet-500',
    'Evaluando viabilidad': 'bg-amber-500',
    Presupuestada: 'bg-orange-500',
    Aceptada: 'bg-emerald-500',
    Rechazada: 'bg-rose-500',
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Reportes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Métricas clave del estudio
        </p>
      </div>

      {/* ── Section 1: Resumen General ──────────────────────────── */}
      <section>
        <SectionLabel icon={BarChart3} label="Resumen General" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Causas Activas"
            value={causasActivas}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Leads del Mes"
            value={leadsDelMes}
            color="text-sky-600 dark:text-sky-400"
          />
          <StatCard
            label="Tasa de Conversión"
            value={`${tasaConversion}%`}
            sub={`Aceptadas / no archivadas`}
            color="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            label="Tareas Pendientes"
            value={tareasPendientes}
            color="text-amber-600 dark:text-amber-400"
          />
        </div>
      </section>

      {/* ── Section 2: Causas por Estado ────────────────────────── */}
      <section>
        <SectionLabel icon={Briefcase} label="Causas por Estado" />
        <Card className="p-6 space-y-3">
          {Object.entries(statusGroups).map(([status, count]) => (
            <HBar
              key={status}
              label={status}
              count={count as number}
              max={statusMax}
              colorClass={statusColors[status] ?? 'bg-primary'}
            />
          ))}
        </Card>
      </section>

      {/* ── Section 3: Causas por Tipo ──────────────────────────── */}
      <section>
        <SectionLabel icon={BarChart3} label="Causas por Tipo" />
        <Card className="p-6 space-y-3">
          {Object.entries(typeGroups).map(([type, count]) => (
            <HBar
              key={type}
              label={type}
              count={count as number}
              max={typeMax}
              colorClass={typeColors[type] ?? 'bg-primary'}
            />
          ))}
        </Card>
      </section>

      {/* ── Section 4: Carga de Trabajo ─────────────────────────── */}
      <section>
        <SectionLabel icon={Users} label="Carga de Trabajo por Abogado" />
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Nombre
                </th>
                <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Rol
                </th>
                <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Causas Activas
                </th>
                <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Tareas Pendientes
                </th>
              </tr>
            </thead>
            <tbody>
              {workloadFinal.map((w) => (
                <tr key={w.name} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3 font-medium">{w.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{w.role}</td>
                  <td className="px-5 py-3 text-center font-black">{w.activeMatters}</td>
                  <td className="px-5 py-3 text-center font-black">{w.pendingTasks}</td>
                </tr>
              ))}
              {workloadFinal.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted-foreground">
                    Sin perfiles activos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* ── Section 5: Salud del Estudio ────────────────────────── */}
      <section>
        <SectionLabel icon={Heart} label="Salud del Estudio" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {healthConfig.map(({ key, color, textColor }) => (
            <Card key={key} className={cn('p-5 border', color)}>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                {key}
              </p>
              <p className={cn('text-3xl font-black', textColor)}>
                {healthGroups[key] ?? 0}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Section 6: Pipeline de Consultas ────────────────────── */}
      <section>
        <SectionLabel icon={Filter} label="Pipeline de Consultas" />
        <Card className="p-6 space-y-3">
          {pipeline.map(({ stage, count }) => (
            <HBar
              key={stage}
              label={stage}
              count={count}
              max={pipelineMax}
              colorClass={pipelineColors[stage] ?? 'bg-primary'}
            />
          ))}
        </Card>
      </section>
    </div>
  );
};
