import React, { useEffect, useState } from 'react';
import { GitBranch, Plus, ArrowUpRight, Gavel, FileText } from 'lucide-react';
import { Matter, IncidenteTipo, INCIDENTE_TIPO_LABELS, AspectoApelado, ASPECTO_APELADO_LABELS } from '../types';
import { Badge, Button, Card, Modal, Input, Textarea } from './UI';
import { useAppContext } from '../lib/AppContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface SubProcesosPanelProps {
  matter: Matter;
  onOpenMatter: (id: string) => void;
}

const STATUS_TONE: Record<string, string> = {
  Activo:     'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  Suspendido: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  Cerrado:    'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30',
  Archivado:  'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  Pausado:    'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

export const SubProcesosPanel = ({ matter, onOpenMatter }: SubProcesosPanelProps) => {
  const { matters, handleCreateSubProceso } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  // Hijos de este matter (incidentes y apelaciones).
  const hijos = matters.filter(m => m.parentMatterId === matter.id);
  const incidentes = hijos.filter(h => h.kind === 'incidente');
  const apelaciones = hijos.filter(h => h.kind === 'apelacion');

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center">
            <GitBranch size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              Sub-procesos
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Incidentes y apelaciones que tramitan en cuerda separada
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
          <Plus size={14} /> Nuevo sub-proceso
        </Button>
      </div>

      {hijos.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
          <p className="text-xs text-muted-foreground">
            No hay sub-procesos. Usá "Nuevo sub-proceso" para abrir un incidente
            (alimentos provisorios, tenencia cautelar, etc.) o una apelación.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentes.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Incidentes ({incidentes.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {incidentes.map(h => (
                  <SubProcesoCard key={h.id} matter={h} onOpen={() => onOpenMatter(h.id)} />
                ))}
              </div>
            </div>
          )}
          {apelaciones.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Apelaciones ({apelaciones.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {apelaciones.map(h => (
                  <SubProcesoCard key={h.id} matter={h} onOpen={() => onOpenMatter(h.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CrearSubProcesoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCreate={async (data) => {
          const created = await handleCreateSubProceso(matter.id, data);
          setIsOpen(false);
          onOpenMatter(created.id);
        }}
      />
    </Card>
  );
};

const SubProcesoCard: React.FC<{ matter: Matter; onOpen: () => void }> = ({ matter, onOpen }) => {
  const Icon = matter.kind === 'apelacion' ? Gavel : FileText;
  const tipoLabel = matter.kind === 'apelacion'
    ? 'Apelación'
    : (matter.incidenteTipo ? INCIDENTE_TIPO_LABELS[matter.incidenteTipo] : 'Incidente');
  const tone = STATUS_TONE[matter.status] ?? STATUS_TONE.Activo;
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border border-border/60 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors p-3 group"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/15 text-violet-600 flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant="outline" className="text-[9px]">{tipoLabel}</Badge>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${tone}`}>
              {matter.status}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground truncate group-hover:text-violet-600">
            {matter.title}
          </p>
          {matter.kind === 'apelacion' && matter.aspectosApelados && matter.aspectosApelados.length > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 truncate mt-1">
              Apela: {matter.aspectosApelados.map(a => ASPECTO_APELADO_LABELS[a]).join(', ')}
            </p>
          )}
          {matter.nextAction && (
            <p className="text-[11px] text-muted-foreground truncate mt-1">
              {matter.nextAction}
              {matter.nextActionDate && (
                <span className="ml-1">· {format(parseISO(matter.nextActionDate), 'd MMM', { locale: es })}</span>
              )}
            </p>
          )}
        </div>
        <ArrowUpRight size={14} className="shrink-0 text-muted-foreground group-hover:text-violet-600" />
      </div>
    </button>
  );
};

interface CrearSubProcesoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    kind: 'incidente' | 'apelacion';
    title: string;
    incidenteTipo?: string;
    description?: string;
    nextAction?: string;
    nextActionDate?: string;
    aspectosApelados?: string[];
  }) => Promise<void>;
}

const CrearSubProcesoModal = ({ isOpen, onClose, onCreate }: CrearSubProcesoModalProps) => {
  const [kind, setKind] = useState<'incidente' | 'apelacion'>('incidente');
  const [incidenteTipo, setIncidenteTipo] = useState<IncidenteTipo>('alimentos_provisorios');
  const [aspectos, setAspectos] = useState<AspectoApelado[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKind('incidente');
      setIncidenteTipo('alimentos_provisorios');
      setAspectos([]);
      setTitle('');
      setDescription('');
      setNextAction('');
      setNextActionDate('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const toggleAspecto = (a: AspectoApelado) => {
    setAspectos(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  // Auto-sugerir título según tipo si el usuario no escribió nada.
  useEffect(() => {
    if (!isOpen || title.length > 0) return;
    if (kind === 'apelacion') {
      setTitle('Apelación');
    } else {
      setTitle(INCIDENTE_TIPO_LABELS[incidenteTipo]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, incidenteTipo, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        kind,
        title: title.trim(),
        incidenteTipo: kind === 'incidente' ? incidenteTipo : undefined,
        description: description.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextActionDate: nextActionDate || undefined,
        aspectosApelados: kind === 'apelacion' && aspectos.length > 0 ? aspectos : undefined,
      });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo sub-proceso"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !title.trim()}>
            {submitting ? 'Creando...' : 'Crear sub-proceso'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind('incidente')}
              className={`p-3 rounded-xl border text-left transition-colors ${
                kind === 'incidente'
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border/60 hover:border-violet-500/50'
              }`}
            >
              <FileText size={16} className="mb-1" />
              <div className="text-xs font-bold">Incidente</div>
              <div className="text-[10px] text-muted-foreground">
                Alimentos, tenencia, exclusión de hogar...
              </div>
            </button>
            <button
              type="button"
              onClick={() => setKind('apelacion')}
              className={`p-3 rounded-xl border text-left transition-colors ${
                kind === 'apelacion'
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-border/60 hover:border-violet-500/50'
              }`}
            >
              <Gavel size={16} className="mb-1" />
              <div className="text-xs font-bold">Apelación</div>
              <div className="text-[10px] text-muted-foreground">
                Segunda instancia (Cámara)
              </div>
            </button>
          </div>
        </div>

        {kind === 'incidente' && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Tipo de incidente
            </label>
            <select
              className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={incidenteTipo}
              onChange={e => setIncidenteTipo(e.target.value as IncidenteTipo)}
            >
              {(Object.keys(INCIDENTE_TIPO_LABELS) as IncidenteTipo[]).map(k => (
                <option key={k} value={k}>{INCIDENTE_TIPO_LABELS[k]}</option>
              ))}
            </select>
          </div>
        )}

        {kind === 'apelacion' && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Aspectos apelados
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              ¿Qué se apela de la sentencia? El resto queda firme. Esto marca al caso padre como <strong>parcialmente firme</strong>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ASPECTO_APELADO_LABELS) as AspectoApelado[]).map(a => (
                <label
                  key={a}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    aspectos.includes(a)
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border/60 hover:border-amber-500/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={aspectos.includes(a)}
                    onChange={() => toggleAspecto(a)}
                    className="rounded"
                  />
                  <span className="text-xs font-bold">{ASPECTO_APELADO_LABELS[a]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Título
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={kind === 'apelacion' ? 'Ej: Apelación compensación económica' : 'Ej: Alimentos provisorios'}
          />
        </div>

        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
            Descripción (opcional)
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detalle del sub-proceso, partes involucradas, monto, etc."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Próxima acción
            </label>
            <Input
              value={nextAction}
              onChange={e => setNextAction(e.target.value)}
              placeholder={kind === 'apelacion' ? 'Expresar agravios' : 'Iniciar incidente'}
            />
          </div>
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">
              Fecha
            </label>
            <Input
              type="date"
              value={nextActionDate}
              onChange={e => setNextActionDate(e.target.value)}
            />
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground rounded-xl bg-muted/30 border border-border/40 p-3">
          El sub-proceso hereda <strong>cliente, expediente, jurisdicción y tipo de proceso</strong> del caso padre.
          Tendrá su propio timeline, plazos y documentos, pero queda vinculado para que puedas navegar entre ambos.
        </div>
      </div>
    </Modal>
  );
};
