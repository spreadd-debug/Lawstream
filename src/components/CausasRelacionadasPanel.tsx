// GAP R12 — Panel de causas relacionadas (cross-fuero).
//
// Lista las causas paralelas que impactan al matter. Soporta dos modos:
//   • externa — la lleva otro estudio. Solo registramos datos de
//     referencia (fuero, juzgado, expediente, abogado externo, estado).
//   • interna — el estudio toma la causa también. Vincula a otro matter
//     del sistema y muestra link al detalle.
//
// La vinculación es bidireccional: si A↔B, ambos matters ven la fila en
// el panel (la query filtra por matter_id = X OR matter_relacionada_id = X).

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  CausaRelacionada,
  VinculacionCausa,
  TipoCausaRelacionada,
  EstadoCausaExterna,
  TIPO_CAUSA_LABELS,
  ESTADO_CAUSA_EXTERNA_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Link2, ExternalLink, AlertCircle, Scale, Briefcase,
} from 'lucide-react';

interface CausasRelacionadasPanelProps {
  matterId: string;
}

const TIPO_OPTS: TipoCausaRelacionada[] = [
  'penal', 'administrativa', 'civil_paralela', 'laboral_paralela', 'concursal', 'otra',
];

const ESTADO_OPTS: EstadoCausaExterna[] = [
  'en_instruccion', 'elevada_a_juicio', 'en_juicio',
  'sentencia', 'sentencia_firme', 'archivada', 'en_apelacion', 'desconocido',
];

export const CausasRelacionadasPanel: React.FC<CausasRelacionadasPanelProps> = ({ matterId }) => {
  const navigate = useNavigate();
  const { causasRelacionadas, matters, handleCreateCausaRelacionada, handleUpdateCausaRelacionada, handleDeleteCausaRelacionada } = useAppContext();

  // Filtramos bidireccionalmente: aparecen las que tienen el matter como
  // origen O como relacionado interno.
  const causasDelMatter = useMemo(
    () => causasRelacionadas.filter(c => c.matterId === matterId || c.matterRelacionadaId === matterId),
    [causasRelacionadas, matterId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CausaRelacionada | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (c: CausaRelacionada) => { setEditing(c); setIsFormOpen(true); };

  const onDelete = async (c: CausaRelacionada) => {
    if (!window.confirm(`Eliminar la causa relacionada${c.caratula ? ` "${c.caratula}"` : ''}? La causa en sí (matter o expediente externo) no se afecta.`)) return;
    await handleDeleteCausaRelacionada(c.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Link2 size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Causas relacionadas</h3>
            <p className="text-[11px] text-muted-foreground">
              Causas paralelas en otro fuero (penal, administrativa, etc.) que impactan al matter.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} /> Nueva relación
        </Button>
      </div>

      {causasDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <Link2 size={24} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin causas relacionadas. Si hay una causa penal, administrativa u otra que impacte este matter, vinculála acá.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {causasDelMatter.map(c => {
          const esOrigen = c.matterId === matterId;
          const otroMatterId = esOrigen ? c.matterRelacionadaId : c.matterId;
          const otroMatter = otroMatterId ? matters.find(m => m.id === otroMatterId) : undefined;
          return (
            <CausaCard
              key={c.id}
              causa={c}
              esOrigen={esOrigen}
              otroMatter={otroMatter}
              onEdit={() => openEdit(c)}
              onDelete={() => onDelete(c)}
              onAbrirOtro={() => otroMatterId && navigate(`/asuntos/${otroMatterId}`)}
            />
          );
        })}
      </div>

      <CausaForm
        isOpen={isFormOpen}
        editing={editing}
        currentMatterId={matterId}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateCausaRelacionada(editing.id, data);
          } else {
            await handleCreateCausaRelacionada({ ...data, matterId } as Omit<CausaRelacionada, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Card individual ──────────────────────────────────────────

const CausaCard: React.FC<{
  causa: CausaRelacionada;
  esOrigen: boolean;
  otroMatter?: { id: string; title: string; type: string; status: string };
  onEdit: () => void;
  onDelete: () => void;
  onAbrirOtro: () => void;
}> = ({ causa: c, esOrigen, otroMatter, onEdit, onDelete, onAbrirOtro }) => {
  const interna = c.vinculacion === 'interna';

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-indigo-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px]">{TIPO_CAUSA_LABELS[c.tipoCausa]}</Badge>
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider',
              interna
                ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30'
                : 'text-amber-700 bg-amber-500/10 border-amber-500/30',
            )}>
              {interna ? <Briefcase size={11} /> : <ExternalLink size={11} />}
              {interna ? 'En el sistema' : 'Externa'}
            </span>
            {c.estadoExterno && (
              <Badge variant="outline" className="text-[9px]">{ESTADO_CAUSA_EXTERNA_LABELS[c.estadoExterno]}</Badge>
            )}
            {!esOrigen && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground italic">
                ↩ vinculada desde otro caso
              </span>
            )}
          </div>

          {c.caratula && (
            <p className="text-sm font-bold text-foreground">{c.caratula}</p>
          )}

          {/* Datos del expediente */}
          {(c.expedienteNumero || c.fuero || c.juzgado || c.jurisdiccion) && (
            <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3">
              {c.expedienteNumero && <span><strong className="text-foreground/70">Exp:</strong> {c.expedienteNumero}</span>}
              {c.fuero && <span><strong className="text-foreground/70">Fuero:</strong> {c.fuero}</span>}
              {c.juzgado && <span><strong className="text-foreground/70">Juzgado:</strong> {c.juzgado}</span>}
              {c.jurisdiccion && <span><strong className="text-foreground/70">Jurisdicción:</strong> {c.jurisdiccion}</span>}
            </div>
          )}

          {/* Abogado externo */}
          {!interna && (c.abogadoExternoNombre || c.abogadoExternoContacto) && (
            <p className="text-[11px] text-foreground/90">
              <span className="font-bold text-amber-700">Letrado externo:</span> {c.abogadoExternoNombre}
              {c.abogadoExternoContacto && <span className="text-muted-foreground"> · {c.abogadoExternoContacto}</span>}
            </p>
          )}

          {/* Link al matter relacionado si interna */}
          {interna && otroMatter && (
            <button
              onClick={onAbrirOtro}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <Briefcase size={11} />
              {otroMatter.title}
              <ExternalLink size={10} />
            </button>
          )}

          {c.descripcion && (
            <p className="text-[11px] text-foreground/90">{c.descripcion}</p>
          )}
          {c.impacto && (
            <div className="text-[11px] bg-indigo-500/5 border border-indigo-500/20 rounded-lg px-3 py-1.5">
              <span className="font-bold text-indigo-700">Impacto en este caso:</span> {c.impacto}
            </div>
          )}

          {/* Fechas */}
          {(c.fechaInicio || c.fechaUltimoMovimiento) && (
            <p className="text-[10px] text-muted-foreground">
              {c.fechaInicio && <>Inicio: {format(parseISO(c.fechaInicio), "d MMM yyyy", { locale: es })}</>}
              {c.fechaInicio && c.fechaUltimoMovimiento && ' · '}
              {c.fechaUltimoMovimiento && <>Último movimiento: {format(parseISO(c.fechaUltimoMovimiento), "d MMM yyyy", { locale: es })}</>}
            </p>
          )}

          {c.notas && <p className="text-[11px] text-muted-foreground italic">{c.notas}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {esOrigen && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Form modal ───────────────────────────────────────────────

interface CausaFormProps {
  isOpen: boolean;
  editing: CausaRelacionada | null;
  currentMatterId: string;
  onClose: () => void;
  onSave: (data: Partial<CausaRelacionada>) => Promise<void>;
}

const CausaForm: React.FC<CausaFormProps> = ({ isOpen, editing, currentMatterId, onClose, onSave }) => {
  const { matters } = useAppContext();
  const [vinculacion, setVinculacion]               = useState<VinculacionCausa>('externa');
  const [matterRelacionadaId, setMatterRelacionadaId] = useState<string>('');
  const [tipoCausa, setTipoCausa]                   = useState<TipoCausaRelacionada>('penal');
  const [caratula, setCaratula]                     = useState('');
  const [fuero, setFuero]                           = useState('');
  const [juzgado, setJuzgado]                       = useState('');
  const [expedienteNumero, setExpedienteNumero]     = useState('');
  const [jurisdiccion, setJurisdiccion]             = useState('');
  const [abogadoNombre, setAbogadoNombre]           = useState('');
  const [abogadoContacto, setAbogadoContacto]       = useState('');
  const [estadoExterno, setEstadoExterno]           = useState<EstadoCausaExterna | ''>('');
  const [descripcion, setDescripcion]               = useState('');
  const [impacto, setImpacto]                       = useState('');
  const [fechaInicio, setFechaInicio]               = useState('');
  const [fechaUltimoMovimiento, setFechaUltimoMovimiento] = useState('');
  const [notas, setNotas]                           = useState('');
  const [saving, setSaving]                         = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setVinculacion(editing?.vinculacion ?? 'externa');
    setMatterRelacionadaId(editing?.matterRelacionadaId ?? '');
    setTipoCausa(editing?.tipoCausa ?? 'penal');
    setCaratula(editing?.caratula ?? '');
    setFuero(editing?.fuero ?? '');
    setJuzgado(editing?.juzgado ?? '');
    setExpedienteNumero(editing?.expedienteNumero ?? '');
    setJurisdiccion(editing?.jurisdiccion ?? '');
    setAbogadoNombre(editing?.abogadoExternoNombre ?? '');
    setAbogadoContacto(editing?.abogadoExternoContacto ?? '');
    setEstadoExterno(editing?.estadoExterno ?? '');
    setDescripcion(editing?.descripcion ?? '');
    setImpacto(editing?.impacto ?? '');
    setFechaInicio(editing?.fechaInicio ?? '');
    setFechaUltimoMovimiento(editing?.fechaUltimoMovimiento ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  // Para vinculacion=interna, listar matters disponibles excepto el actual.
  const mattersDisponibles = useMemo(
    () => matters.filter(m => m.id !== currentMatterId).sort((a, b) => a.title.localeCompare(b.title)),
    [matters, currentMatterId],
  );

  const puedeGuardar =
    vinculacion === 'interna'
      ? matterRelacionadaId.length > 0
      : (caratula.trim().length > 0 || expedienteNumero.trim().length > 0 || descripcion.trim().length > 0);

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      // Si interna, sincronizar caratula/jurisdicción con el matter relacionado
      // si están vacíos, para que la card del otro lado tenga datos.
      const matterRel = matters.find(m => m.id === matterRelacionadaId);
      const caratulaFinal   = caratula.trim()    || (vinculacion === 'interna' ? matterRel?.title       : '') || undefined;
      const jurisdiccionFinal = jurisdiccion.trim() || (vinculacion === 'interna' ? matterRel?.jurisdiccion?.toUpperCase() : '') || undefined;

      await onSave({
        vinculacion,
        matterRelacionadaId:    vinculacion === 'interna' ? matterRelacionadaId : undefined,
        tipoCausa,
        caratula:               caratulaFinal,
        fuero:                  fuero.trim()                  || undefined,
        juzgado:                juzgado.trim()                || undefined,
        expedienteNumero:       expedienteNumero.trim()       || undefined,
        jurisdiccion:           jurisdiccionFinal,
        abogadoExternoNombre:   vinculacion === 'externa' ? (abogadoNombre.trim()    || undefined) : undefined,
        abogadoExternoContacto: vinculacion === 'externa' ? (abogadoContacto.trim()  || undefined) : undefined,
        estadoExterno:          vinculacion === 'externa' ? ((estadoExterno || undefined) as EstadoCausaExterna | undefined) : undefined,
        descripcion:            descripcion.trim()             || undefined,
        impacto:                impacto.trim()                 || undefined,
        fechaInicio:            fechaInicio                    || undefined,
        fechaUltimoMovimiento:  fechaUltimoMovimiento          || undefined,
        notas:                  notas.trim()                   || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar causa relacionada' : 'Nueva causa relacionada'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear vinculación')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Vinculación */}
        <div>
          <Label>Tipo de vinculación *</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setVinculacion('externa')}
              className={cn(
                'p-3 rounded-xl border text-left transition-colors',
                vinculacion === 'externa' ? 'border-amber-500 bg-amber-500/10' : 'border-border/60 hover:border-amber-500/50',
              )}
            >
              <ExternalLink size={14} className="mb-1" />
              <div className="text-xs font-bold">Externa</div>
              <div className="text-[10px] text-muted-foreground">La lleva otro estudio. Solo registramos referencia.</div>
            </button>
            <button
              type="button"
              onClick={() => setVinculacion('interna')}
              className={cn(
                'p-3 rounded-xl border text-left transition-colors',
                vinculacion === 'interna' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border/60 hover:border-emerald-500/50',
              )}
            >
              <Briefcase size={14} className="mb-1" />
              <div className="text-xs font-bold">Interna</div>
              <div className="text-[10px] text-muted-foreground">El estudio toma la causa también. Vinculo a otro matter.</div>
            </button>
          </div>
        </div>

        {vinculacion === 'interna' && (
          <div>
            <Label>Matter del sistema a vincular *</Label>
            <select
              value={matterRelacionadaId}
              onChange={e => setMatterRelacionadaId(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">— Seleccionar matter —</option>
              {mattersDisponibles.map(m => (
                <option key={m.id} value={m.id}>
                  [{m.type}] {m.title}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              La vinculación es bidireccional: este matter aparecerá también listado en el panel del matter relacionado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo de causa *</Label>
            <select
              value={tipoCausa}
              onChange={e => setTipoCausa(e.target.value as TipoCausaRelacionada)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {TIPO_OPTS.map(t => <option key={t} value={t}>{TIPO_CAUSA_LABELS[t]}</option>)}
            </select>
          </div>
          {vinculacion === 'externa' && (
            <div>
              <Label>Estado de la causa</Label>
              <select
                value={estadoExterno}
                onChange={e => setEstadoExterno(e.target.value as EstadoCausaExterna | '')}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="">— Sin dato —</option>
                {ESTADO_OPTS.map(s => <option key={s} value={s}>{ESTADO_CAUSA_EXTERNA_LABELS[s]}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Datos del expediente externo (siempre editables, útiles aún para internas) */}
        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {vinculacion === 'externa' ? 'Datos del expediente externo' : 'Datos del expediente (opcional, complementan al matter vinculado)'}
          </h4>
          <div>
            <Label>Carátula</Label>
            <Input
              value={caratula}
              onChange={e => setCaratula(e.target.value)}
              placeholder='Ej: "Ruiz, Sebastián s/ vaciamiento patrimonial — art. 173 CP"'
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>N° de expediente</Label>
              <Input value={expedienteNumero} onChange={e => setExpedienteNumero(e.target.value)} placeholder="Ej: 12.345/2026" />
            </div>
            <div>
              <Label>Jurisdicción</Label>
              <Input value={jurisdiccion} onChange={e => setJurisdiccion(e.target.value)} placeholder="CABA / Federal / PBA / etc." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fuero</Label>
              <Input value={fuero} onChange={e => setFuero(e.target.value)} placeholder='Ej: "Penal Económico"' />
            </div>
            <div>
              <Label>Juzgado</Label>
              <Input value={juzgado} onChange={e => setJuzgado(e.target.value)} placeholder="Ej: Juzgado N° 5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha de inicio</Label>
              <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Último movimiento conocido</Label>
              <Input type="date" value={fechaUltimoMovimiento} onChange={e => setFechaUltimoMovimiento(e.target.value)} />
            </div>
          </div>
        </section>

        {vinculacion === 'externa' && (
          <section className="space-y-3 border-t border-border/40 pt-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Letrado externo</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={abogadoNombre} onChange={e => setAbogadoNombre(e.target.value)} placeholder="Dr/a. Apellido, Nombre" />
              </div>
              <div>
                <Label>Contacto</Label>
                <Input value={abogadoContacto} onChange={e => setAbogadoContacto(e.target.value)} placeholder="email / teléfono" />
              </div>
            </div>
          </section>
        )}

        {/* Descripción + impacto */}
        <section className="space-y-3 border-t border-border/40 pt-4">
          <div>
            <Label>Descripción del vínculo</Label>
            <Textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder='Ej: "Denuncia penal por vaciamiento de la SRL Centro Cardiovascular Ruiz & Asociados — art. 173 CP. Se imputa a Sebastián Ruiz como socio gerente."'
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label>Impacto en este caso</Label>
            <Textarea
              value={impacto}
              onChange={e => setImpacto(e.target.value)}
              placeholder='Ej: "Lo que se pruebe en penal afecta directamente la pericia contable del divorcio y la valuación de la participación societaria."'
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
          </div>
        </section>

        <div className="flex items-start gap-2 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-[11px] text-indigo-800 dark:text-indigo-200">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Recordá que las medidas cautelares patrimoniales (inhibición, intervención, veedor) que surjan de la causa relacionada se modelan en el módulo de cautelares — fuera del alcance de esta vinculación.
          </span>
        </div>
      </div>
    </Modal>
  );
};
