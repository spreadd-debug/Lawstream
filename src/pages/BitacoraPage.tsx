import React, { useEffect, useState, useMemo } from 'react';
import { fetchAuditLog } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { AuditLogEntry, AuditAction, AuditEntityType } from '../types';
import { Card } from '../components/UI';
import { cn } from '../lib/utils';
import {
  ScrollText,
  Briefcase,
  Users,
  Inbox,
  CheckSquare,
  FileText,
  UserPlus,
  LogIn,
  LogOut,
  Milestone,
  ChevronDown,
  Filter,
  RefreshCw,
  UserCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Baby,
  GitMerge,
  Coins,
  Network,
  TrendingUp,
  Link2,
  ShieldAlert,
  Eye,
  Wallet,
  Sparkles,
  Flag,
} from 'lucide-react';

// ── Action metadata ────────────────────────────────────────────────

const ACTION_META: Record<AuditAction, { label: string; icon: React.ElementType; color: string }> = {
  crear_asunto:            { label: 'Creó asunto',              icon: Briefcase,   color: 'text-emerald-600' },
  editar_asunto:           { label: 'Editó asunto',             icon: Briefcase,   color: 'text-blue-600' },
  cerrar_asunto:           { label: 'Cerró asunto',             icon: Briefcase,   color: 'text-amber-600' },
  crear_cliente:           { label: 'Creó cliente',             icon: Users,       color: 'text-emerald-600' },
  editar_cliente:          { label: 'Editó cliente',            icon: Users,       color: 'text-blue-600' },
  crear_consulta:          { label: 'Creó consulta',            icon: Inbox,       color: 'text-emerald-600' },
  cambiar_estado_consulta: { label: 'Cambió estado consulta',   icon: Inbox,       color: 'text-violet-600' },
  crear_tarea:             { label: 'Creó tarea',               icon: CheckSquare, color: 'text-emerald-600' },
  editar_tarea:            { label: 'Editó tarea',              icon: CheckSquare, color: 'text-blue-600' },
  completar_tarea:         { label: 'Completó tarea',           icon: CheckSquare, color: 'text-emerald-700' },
  crear_documento:         { label: 'Creó documento',           icon: FileText,    color: 'text-emerald-600' },
  editar_documento:        { label: 'Editó documento',          icon: FileText,    color: 'text-blue-600' },
  asignar_abogados:        { label: 'Asignó abogados',          icon: UserPlus,    color: 'text-violet-600' },
  invitar_usuario:         { label: 'Invitó usuario',           icon: UserPlus,    color: 'text-emerald-600' },
  editar_usuario:          { label: 'Editó usuario',            icon: UserCircle,  color: 'text-blue-600' },
  desactivar_usuario:      { label: 'Desactivó usuario',        icon: UserCircle,  color: 'text-red-600' },
  crear_hito:              { label: 'Creó hito',                icon: Milestone,   color: 'text-emerald-600' },
  editar_hito:             { label: 'Editó hito',               icon: Milestone,   color: 'text-blue-600' },
  crear_evento:            { label: 'Registró evento',          icon: Calendar,    color: 'text-emerald-600' },
  editar_evento:           { label: 'Editó evento',             icon: Calendar,    color: 'text-blue-600' },
  eliminar_evento:         { label: 'Eliminó evento',           icon: Calendar,    color: 'text-red-600' },
  crear_plazo:             { label: 'Creó plazo',               icon: Clock,       color: 'text-emerald-600' },
  cumplir_plazo:           { label: 'Cumplió plazo',            icon: Clock,       color: 'text-emerald-700' },
  cancelar_plazo:          { label: 'Canceló plazo',            icon: Clock,       color: 'text-amber-600' },
  crear_hijo:              { label: 'Cargó hijo',               icon: Baby,        color: 'text-emerald-600' },
  editar_hijo:             { label: 'Editó hijo',               icon: Baby,        color: 'text-blue-600' },
  eliminar_hijo:           { label: 'Eliminó hijo',             icon: Baby,        color: 'text-red-600' },
  mutar_tipo_divorcio:     { label: 'Mutó tipo de divorcio',    icon: Briefcase,   color: 'text-violet-600' },
  deshacer_mutacion_tipo_divorcio: { label: 'Deshizo mutación tipo divorcio', icon: RefreshCw, color: 'text-amber-600' },
  crear_reconvencion:      { label: 'Cargó reconvención',       icon: GitMerge,    color: 'text-emerald-600' },
  editar_reconvencion:     { label: 'Editó reconvención',       icon: GitMerge,    color: 'text-blue-600' },
  eliminar_reconvencion:   { label: 'Eliminó reconvención',     icon: GitMerge,    color: 'text-red-600' },
  crear_bien:                  { label: 'Cargó bien',                  icon: Coins,       color: 'text-emerald-600' },
  editar_bien:                 { label: 'Editó bien',                  icon: Coins,       color: 'text-blue-600' },
  eliminar_bien:               { label: 'Eliminó bien',                icon: Coins,       color: 'text-red-600' },
  crear_valuacion:             { label: 'Registró valuación',          icon: TrendingUp,  color: 'text-emerald-600' },
  eliminar_valuacion:          { label: 'Eliminó valuación',           icon: TrendingUp,  color: 'text-red-600' },
  crear_sociedad_interpuesta:  { label: 'Cargó sociedad interpuesta',  icon: Network,     color: 'text-emerald-600' },
  editar_sociedad_interpuesta: { label: 'Editó sociedad interpuesta',  icon: Network,     color: 'text-blue-600' },
  eliminar_sociedad_interpuesta: { label: 'Eliminó sociedad interpuesta', icon: Network,  color: 'text-red-600' },
  crear_causa_relacionada:    { label: 'Vinculó causa relacionada',  icon: Link2,       color: 'text-emerald-600' },
  editar_causa_relacionada:   { label: 'Editó causa relacionada',    icon: Link2,       color: 'text-blue-600' },
  eliminar_causa_relacionada: { label: 'Desvinculó causa relacionada', icon: Link2,     color: 'text-red-600' },
  crear_cautelar:    { label: 'Cargó cautelar',    icon: ShieldAlert, color: 'text-emerald-600' },
  editar_cautelar:   { label: 'Editó cautelar',    icon: ShieldAlert, color: 'text-blue-600' },
  eliminar_cautelar: { label: 'Eliminó cautelar',  icon: ShieldAlert, color: 'text-red-600' },
  crear_veedor:      { label: 'Designó veedor',    icon: Eye,         color: 'text-emerald-600' },
  editar_veedor:     { label: 'Editó veedor',      icon: Eye,         color: 'text-blue-600' },
  eliminar_veedor:   { label: 'Eliminó veedor',    icon: Eye,         color: 'text-red-600' },
  crear_cuota_alimentaria:    { label: 'Cargó cuota alimentaria',    icon: Wallet,    color: 'text-emerald-600' },
  editar_cuota_alimentaria:   { label: 'Editó cuota alimentaria',    icon: Wallet,    color: 'text-blue-600' },
  eliminar_cuota_alimentaria: { label: 'Eliminó cuota alimentaria',  icon: Wallet,    color: 'text-red-600' },
  crear_concepto_especie:     { label: 'Cargó concepto en especie',  icon: Sparkles,  color: 'text-emerald-600' },
  editar_concepto_especie:    { label: 'Editó concepto en especie',  icon: Sparkles,  color: 'text-blue-600' },
  eliminar_concepto_especie:  { label: 'Eliminó concepto en especie', icon: Sparkles, color: 'text-red-600' },
  crear_controversia:         { label: 'Cargó controversia',         icon: Flag,      color: 'text-emerald-600' },
  editar_controversia:        { label: 'Editó controversia',         icon: Flag,      color: 'text-blue-600' },
  eliminar_controversia:      { label: 'Eliminó controversia',       icon: Flag,      color: 'text-red-600' },
  judicializar_controversia:  { label: 'Judicializó controversia',   icon: Flag,      color: 'text-violet-600' },
  login:                   { label: 'Inició sesión',            icon: LogIn,       color: 'text-muted-foreground' },
  logout:                  { label: 'Cerró sesión',             icon: LogOut,      color: 'text-muted-foreground' },
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  matter: 'Asuntos',
  client: 'Clientes',
  consultation: 'Consultas',
  task: 'Tareas',
  document: 'Documentos',
  profile: 'Usuarios',
  assignment: 'Asignaciones',
  milestone: 'Hitos',
  session: 'Sesiones',
  evento: 'Eventos',
  plazo: 'Plazos',
  hijo_caso: 'Hijos',
  reconvencion: 'Reconvenciones',
  bien: 'Bienes',
  bien_valuacion: 'Valuaciones',
  sociedad_interpuesta: 'Sociedades interpuestas',
  causa_relacionada: 'Causas relacionadas',
  cautelar: 'Cautelares',
  veedor: 'Veedores',
  cuota_alimentaria: 'Cuotas alimentarias',
  concepto_especie: 'Conceptos en especie',
  controversia: 'Controversias',
};

// ── Helpers ────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const isSameDay = (a: string, b: string) =>
  new Date(a).toDateString() === new Date(b).toDateString();

// ── Page ───────────────────────────────────────────────────────────

export const BitacoraPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { profiles } = useAppContext();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [filterEntity, setFilterEntity] = useState<AuditEntityType | ''>('');
  const [filterActor, setFilterActor] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const PAGE_SIZE = 80;

  const loadEntries = async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await fetchAuditLog({
        limit: PAGE_SIZE,
        offset,
        entityType: filterEntity || undefined,
        actorId: filterActor || undefined,
      });
      if (append) {
        setEntries(prev => [...prev, ...data]);
      } else {
        setEntries(data);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error cargando bitácora:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadEntries(0);
  }, [filterEntity, filterActor]);

  // Client-side text filter
  const filtered = useMemo(() => {
    if (!filterSearch.trim()) return entries;
    const q = filterSearch.toLowerCase();
    return entries.filter(e =>
      e.actorName.toLowerCase().includes(q) ||
      (e.entityLabel ?? '').toLowerCase().includes(q) ||
      ACTION_META[e.action]?.label.toLowerCase().includes(q)
    );
  }, [entries, filterSearch]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; items: AuditLogEntry[] }[] = [];
    for (const entry of filtered) {
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, entry.createdAt)) {
        last.items.push(entry);
      } else {
        groups.push({ date: entry.createdAt, items: [entry] });
      }
    }
    return groups;
  }, [filtered]);

  const activeProfiles = profiles.filter(p => p.isActive);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <ScrollText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-black text-foreground">Bitácora</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Registro de actividad del estudio</p>
          </div>
        </div>
        <button
          onClick={() => loadEntries(0)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar en bitácora..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="px-3 py-2 bg-muted/50 border border-border/50 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/30 outline-none transition-all"
          />

          {/* Entity type filter */}
          <div className="relative">
            <select
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value as AuditEntityType | '')}
              className="w-full appearance-none px-3 py-2 pr-8 bg-muted/50 border border-border/50 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="">Todas las entidades</option>
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {/* Actor filter */}
          <div className="relative">
            <select
              value={filterActor}
              onChange={e => setFilterActor(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-8 bg-muted/50 border border-border/50 rounded-lg text-sm outline-none cursor-pointer"
            >
              <option value="">Todos los usuarios</option>
              {activeProfiles.map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ScrollText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay registros de actividad</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-background px-1">
                  {formatDate(group.date)}
                </div>
                <div className="flex-1 h-[1px] bg-border" />
              </div>

              {/* Entries */}
              <div className="space-y-1">
                {group.items.map(entry => {
                  const meta = ACTION_META[entry.action] || { label: entry.action, icon: ScrollText, color: 'text-muted-foreground' };
                  const Icon = meta.icon;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      {/* Icon */}
                      <div className={cn('mt-0.5 p-1.5 rounded-lg bg-muted', meta.color)}>
                        <Icon size={14} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">{entry.actorName}</span>
                          <span className={cn('text-sm', meta.color)}>{meta.label}</span>
                          {entry.entityLabel && (
                            <span className="text-sm text-foreground font-medium truncate max-w-[280px]">
                              {entry.entityLabel}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.action === 'asignar_abogados' && entry.details.abogados ? (
                              <span>Equipo: {(entry.details.abogados as string[]).join(', ')}</span>
                            ) : entry.action === 'cambiar_estado_consulta' && entry.details.newStatus ? (
                              <span>Nuevo estado: {entry.details.newStatus as string}</span>
                            ) : entry.action === 'crear_asunto' && entry.details.type ? (
                              <span>{entry.details.type as string} — {entry.details.client as string}</span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        {formatTime(entry.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                onClick={() => loadEntries(entries.length, true)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <ChevronDown size={16} />
                )}
                Cargar más
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
