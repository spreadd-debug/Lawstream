import React, { useRef, useState } from 'react';
import { Card, Badge, Button, Input, Drawer } from './UI';
import { LegalDocument, Matter, DocumentStatus } from '../types';
import {
  FileText,
  Search,
  Plus,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Upload,
  ChevronDown,
  Briefcase,
  User,
  Zap,
  FileWarning,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { DocumentForm } from './DocumentForm';

interface DocumentosGlobalProps {
  documents: LegalDocument[];
  matters: Matter[];
  onUpdateDocument: (id: string, changes: Partial<LegalDocument>) => void;
  onAddDocument: (doc: Omit<LegalDocument, 'id'>) => void;
}

const STATUS_OPTIONS: DocumentStatus[] = [
  'Faltante',
  'Solicitado',
  'Recibido',
  'En revisión',
  'Aprobado',
  'Listo para presentar',
  'Presentado',
];

export const DocumentosGlobal = ({ documents, matters, onUpdateDocument, onAddDocument }: DocumentosGlobalProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterCriticality, setFilterCriticality] = useState<string>('Todos');
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);

  const filteredDocuments = documents.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.matterTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.client?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'Todos' || d.status === filterStatus;
    const matchesCriticality = filterCriticality === 'Todos' || d.criticality === filterCriticality;
    return matchesSearch && matchesStatus && matchesCriticality;
  });

  const stats = {
    criticosFaltantes: documents.filter(d => d.criticality === 'Crítico' && (d.status === 'Faltante' || d.status === 'Solicitado')).length,
    bloqueantes: documents.filter(d => d.blocksProgress && d.status !== 'Presentado' && d.status !== 'Aprobado').length,
    listos: documents.filter(d => d.status === 'Listo para presentar').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <FileText className="text-primary" size={28} />
            Flujo Documental
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Control de criticidad, bloqueos y estados de validación operativa.
          </p>
        </div>
        <Button
          className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2 text-[10px] font-black uppercase tracking-widest"
          onClick={() => setIsNewDocOpen(true)}
        >
          <Plus size={16} />
          Nuevo Documento
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DocStatCard label="Críticos Faltantes" count={stats.criticosFaltantes} variant="error" icon={AlertTriangle} description="Documentos esenciales no recibidos" />
        <DocStatCard label="Bloquean Avance" count={stats.bloqueantes} variant="warning" icon={ShieldAlert} description="Frenan el siguiente paso del asunto" />
        <DocStatCard label="Listos para Presentar" count={stats.listos} variant="success" icon={CheckCircle} description="Validados y pendientes de envío" />
      </div>

      {/* Filters */}
      <Card className="p-5 border border-border/50 bg-card/30 rounded-2xl">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
            <Input
              placeholder="Buscar por documento, asunto o cliente..."
              className="pl-12 h-12 bg-background/50 border-border/40 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/30">
              {['Todos', 'Crítico', 'Recomendado'].map(crit => (
                <button
                  key={crit}
                  onClick={() => setFilterCriticality(crit)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    filterCriticality === crit
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {crit}
                </button>
              ))}
            </div>
            <select
              className="h-12 px-4 rounded-xl bg-background/50 border border-border/40 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Todos los Estados</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Document List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map(doc => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onUpdateStatus={(id, status) => onUpdateDocument(id, { status, updatedAt: new Date().toISOString() })}
              onUploadFile={(id) => onUpdateDocument(id, { status: 'Recibido', updatedAt: new Date().toISOString() })}
            />
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
            <FileWarning size={48} className="mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">No se encontraron documentos</p>
          </div>
        )}
      </div>

      {/* New Document Drawer */}
      <Drawer isOpen={isNewDocOpen} onClose={() => setIsNewDocOpen(false)} title="Nuevo Documento" size="md" preventBackdropClose>
        <DocumentForm
          matters={matters}
          onSave={doc => { onAddDocument(doc); setIsNewDocOpen(false); }}
          onCancel={() => setIsNewDocOpen(false)}
        />
      </Drawer>
    </div>
  );
};

/* ── DocStatCard ── */
const DocStatCard = ({ label, count, variant, icon: Icon, description }: any) => {
  const variants: Record<string, string> = {
    error: 'border-rose-500/20 bg-rose-500/[0.02] text-rose-600',
    warning: 'border-amber-500/20 bg-amber-500/[0.02] text-amber-600',
    success: 'border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-600',
  };
  return (
    <Card className={cn('p-5 border-2 rounded-2xl transition-all hover:scale-[1.02]', variants[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</div>
          <div className="text-3xl font-black tracking-tighter">{count}</div>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">{description}</p>
        </div>
        <div className="p-3 rounded-xl bg-background/80 border border-current/10 shadow-sm">
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
};

/* ── DocumentRow ── */
interface DocumentRowProps {
  doc: LegalDocument;
  onUpdateStatus: (id: string, status: DocumentStatus) => void;
  onUploadFile: (id: string, filename: string) => void;
}

const statusStyles: Record<DocumentStatus, string> = {
  'Faltante': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'Solicitado': 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  'Recibido': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'En revisión': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Aprobado': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Listo para presentar': 'bg-primary text-primary-foreground border-primary shadow-sm',
  'Presentado': 'bg-slate-900 text-white border-slate-900',
};

const criticalityStyles: Record<string, string> = {
  'Crítico': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  'Recomendado': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  'Opcional': 'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

const DocumentRow: React.FC<DocumentRowProps> = ({ doc, onUpdateStatus, onUploadFile }) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStatusChange = (newStatus: DocumentStatus) => {
    onUpdateStatus(doc.id, newStatus);
    setIsEditingStatus(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadFile(doc.id, file.name);
    // reset so same file can be selected again
    e.target.value = '';
  };

  const canUpload = doc.status === 'Faltante' || doc.status === 'Solicitado' || doc.status === 'Recibido';

  return (
    <Card className="p-5 border border-border/50 hover:border-primary/30 hover:bg-muted/10 transition-all group rounded-2xl overflow-hidden relative">
      {doc.blocksProgress && doc.status !== 'Presentado' && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Status (editable) + Criticality */}
        <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-44 shrink-0">
          {/* Status badge — click to change */}
          <div className="relative">
            {isEditingStatus ? (
              <select
                autoFocus
                className="w-full h-8 px-2 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={doc.status}
                onChange={e => handleStatusChange(e.target.value as DocumentStatus)}
                onBlur={() => setIsEditingStatus(false)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setIsEditingStatus(true)}
                className={cn(
                  'w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80',
                  statusStyles[doc.status]
                )}
                title="Click para cambiar estado"
              >
                <span>{doc.status}</span>
                <ChevronDown size={10} />
              </button>
            )}
          </div>

          <Badge className={cn('text-[9px] font-black uppercase tracking-widest py-1 justify-center rounded-lg border', criticalityStyles[doc.criticality])}>
            {doc.criticality}
          </Badge>
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black tracking-tight text-foreground group-hover:text-primary transition-colors truncate">
              {doc.name}
            </h3>
            {doc.blocksProgress && doc.status !== 'Presentado' && (
              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest text-rose-600 border-rose-200 bg-rose-50 flex items-center gap-1 shrink-0">
                <ShieldAlert size={10} />
                Bloquea
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-foreground/80">
              <Briefcase size={12} className="text-primary/60" />
              {doc.matterTitle}
            </div>
            {doc.client && (
              <div className="flex items-center gap-1.5">
                <User size={12} />
                {doc.client}
              </div>
            )}
            {doc.responsible && (
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-amber-500" />
                {doc.responsible}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-6 lg:w-72 shrink-0 justify-between lg:justify-end">
          {doc.associatedAction && (
            <div className="text-right hidden sm:block">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Acción Vinculada</div>
              <div className="text-[11px] font-black text-primary flex items-center justify-end gap-1.5 max-w-[140px] truncate">
                <ArrowUpRight size={14} />
                {doc.associatedAction}
              </div>
            </div>
          )}

          <div className="text-right">
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Actualización</div>
            <div className="text-xs font-black flex items-center justify-end gap-1.5 text-foreground">
              <Clock size={14} className="text-muted-foreground" />
              {doc.updatedAt ? format(parseISO(doc.updatedAt), 'd MMM, HH:mm', { locale: es }) : 'PENDIENTE'}
            </div>
          </div>

          {/* Upload button */}
          {canUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                title="Subir archivo"
              >
                <Upload size={20} />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
