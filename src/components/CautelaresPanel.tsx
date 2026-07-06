// GAP R15 — Panel de cautelares patrimoniales + veedores judiciales.
//
// Las cautelares (inhibición general, embargo, intervención judicial,
// secuestro, anotación de litis, prohibiciones) se modelan con tipo
// estructurado, ciclo de estados y FK opcional a un bien o sociedad
// específicos del matter. Los veedores se modelan aparte porque su
// rol es continuo (vigilancia + informes periódicos), distinto al
// del perito (dictamen único).

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import {
  Cautelar,
  Veedor,
  TipoCautelar,
  EstadoCautelar,
  CaucionTipo,
  EstadoVeedor,
  FrecuenciaInformesVeedor,
  TitularRol,
  Matter,
  TIPO_CAUTELAR_LABELS,
  ESTADO_CAUTELAR_LABELS,
  ESTADO_VEEDOR_LABELS,
  FRECUENCIA_INFORMES_LABELS,
  TITULAR_ROL_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, ShieldAlert, Eye, AlertCircle,
  CheckCircle2, XCircle, MinusCircle, Clock, FileSignature, FileText,
} from 'lucide-react';

interface CautelaresPanelProps {
  matterId: string;
  /** GAP UX-31: cuando el banner de "evaluar cautelar preventiva" en
   *  MatterDetail dispara la creación, pasa los defaults aquí. El panel
   *  abre el form con esos valores pre-llenos. Solo aplica al crear, no
   *  al editar. */
  prefillNuevaCautelar?: Partial<Cautelar>;
  /** Callback que el panel invoca al consumir el prefill — el padre
   *  debería limpiar el state para evitar re-aperturas no deseadas. */
  onPrefillConsumido?: () => void;
}

const TIPO_OPTS: TipoCautelar[] = [
  'inhibicion_general', 'embargo', 'intervencion_judicial', 'secuestro',
  'anotacion_litis', 'prohibicion_innovar', 'prohibicion_contratar', 'otra',
];

const ESTADO_OPTS: EstadoCautelar[] = [
  'solicitada', 'concedida', 'trabada',
  'parcialmente_levantada', 'levantada', 'rechazada',
];

const ESTADO_TONE: Record<EstadoCautelar, string> = {
  solicitada:             'text-blue-700 bg-blue-500/10 border-blue-500/30',
  concedida:              'text-amber-700 bg-amber-500/10 border-amber-500/30',
  trabada:                'text-rose-700 bg-rose-500/10 border-rose-500/30',
  parcialmente_levantada: 'text-amber-700 bg-amber-500/10 border-amber-500/30',
  levantada:              'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
  rechazada:              'text-muted-foreground bg-muted/30 border-border/40',
};

const VEEDOR_TONE: Record<EstadoVeedor, string> = {
  designado:  'text-blue-700 bg-blue-500/10 border-blue-500/30',
  aceptado:   'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
  rechazado:  'text-rose-700 bg-rose-500/10 border-rose-500/30',
  recusado:   'text-amber-700 bg-amber-500/10 border-amber-500/30',
  sustituido: 'text-muted-foreground bg-muted/30 border-border/40',
  cesado:     'text-muted-foreground bg-muted/30 border-border/40',
};

const ESTADO_VIGENTE: EstadoCautelar[] = ['solicitada', 'concedida', 'trabada', 'parcialmente_levantada'];

// GAP UX-34 (botón "Generar escrito"): mapea el tipo de cautelar (y el
// contexto del matter — fuero / jurisdicción) al/los templates de
// /plantillas que aplican. Cuando hay más de uno, la card muestra un
// menú con las opciones.
interface TemplateOption {
  id: string;
  label: string;
}
function templatesParaCautelar(cautelar: Cautelar, matter?: Matter): TemplateOption[] {
  const esFamilia = matter?.type === 'Familia';
  const esDivorcio = (matter?.subtype || '').toLowerCase().includes('divorcio');
  const esPba = matter?.jurisdiccion === 'pba';
  // Helper para preferir versión PBA del template cuando existe.
  const pickJ = (caba: string, pba: string): string => esPba ? pba : caba;

  switch (cautelar.tipo) {
    case 'inhibicion_general':
      return esDivorcio
        ? [{ id: pickJ('cau-inhibicion-general-divorcio', 'cau-inhibicion-general-divorcio-pba'), label: 'Inhibición General (Divorcio)' }]
        : [{ id: 'cau-inhibicion-general-divorcio', label: 'Inhibición General (Divorcio) — adaptar' }];
    case 'embargo':
      // Tres flavores. El abogado elige según el bien.
      return [
        { id: pickJ('cau-embargo-preventivo-inmueble', 'cau-embargo-preventivo-inmueble-pba'), label: 'Embargo de inmueble' },
        { id: pickJ('cau-embargo-cuenta-bancaria', 'cau-embargo-cuenta-bancaria-pba'),         label: 'Embargo de cuenta bancaria' },
        ...(esFamilia ? [{ id: pickJ('cau-embargo-sueldo-alimentos', 'cau-embargo-sueldo-alimentos-pba'), label: 'Embargo de sueldo (alimentos)' }] : []),
      ];
    case 'intervencion_judicial':
      return [
        { id: 'cau-intervencion-judicial-recaudadora', label: 'Intervención recaudadora' },
        { id: 'cau-intervencion-veedora',              label: 'Intervención veedora' },
      ];
    case 'secuestro':
      return [{ id: 'cau-secuestro', label: 'Secuestro de cosa litigiosa' }];
    case 'anotacion_litis':
      return [{ id: pickJ('cau-anotacion-litis', 'cau-anotacion-litis-pba'), label: 'Anotación de litis' }];
    case 'prohibicion_innovar':
      return esFamilia
        ? [{ id: pickJ('cau-no-innovar-familia', 'cau-no-innovar-familia-pba'), label: 'No innovar (Familia)' }]
        : [{ id: pickJ('cau-no-innovar', 'cau-no-innovar-pba'), label: 'No innovar' }];
    case 'prohibicion_contratar':
      return [{ id: 'cau-prohibicion-contratar', label: 'Prohibición de contratar' }];
    case 'otra':
    default:
      return [{ id: 'civ-medida-cautelar', label: 'Cautelar genérica (art. 232)' }];
  }
}

export const CautelaresPanel: React.FC<CautelaresPanelProps> = ({
  matterId, prefillNuevaCautelar, onPrefillConsumido,
}) => {
  const navigate = useNavigate();
  const {
    cautelares, veedores, bienes, sociedadesInterpuestas, matters,
    handleCreateCautelar, handleUpdateCautelar, handleDeleteCautelar,
    handleCreateVeedor,   handleUpdateVeedor,   handleDeleteVeedor,
  } = useAppContext();
  // GAP UX-34: el matter del panel — necesario para el mapping de
  // templates por fuero / jurisdicción al generar escrito.
  const matterDelPanel = useMemo(
    () => matters.find(m => m.id === matterId),
    [matters, matterId],
  );

  // Navega a /plantillas con el template + matter pre-cargados. Si la cautelar
  // está asociada a un bien, pasamos su id para que Plantillas auto-complete
  // los datos del activo (matrícula, dominio, etc.) en el oficio de embargo.
  const generarEscritoCautelar = (templateId: string, bienId?: string) => {
    const bienParam = bienId ? `&bien=${encodeURIComponent(bienId)}` : '';
    navigate(`/plantillas?template=${encodeURIComponent(templateId)}&matter=${encodeURIComponent(matterId)}${bienParam}`);
  };

  const cautelaresDelMatter = useMemo(
    () => cautelares.filter(c => c.matterId === matterId),
    [cautelares, matterId],
  );
  const veedoresDelMatter = useMemo(
    () => veedores.filter(v => v.matterId === matterId),
    [veedores, matterId],
  );
  const bienesDelMatter = useMemo(
    () => bienes.filter(b => b.matterId === matterId),
    [bienes, matterId],
  );
  const sociedadesDelMatter = useMemo(
    () => sociedadesInterpuestas.filter(s => s.matterId === matterId),
    [sociedadesInterpuestas, matterId],
  );

  const [cautFormOpen, setCautFormOpen]   = useState(false);
  const [cautEditing, setCautEditing]     = useState<Cautelar | null>(null);
  // GAP UX-31: defaults pre-llenos cuando el padre dispara la creación
  // desde el banner de "evaluar cautelar preventiva". null = creación
  // normal con los defaults básicos del form.
  const [cautPrefill, setCautPrefill]     = useState<Partial<Cautelar> | null>(null);
  const [veeFormOpen, setVeeFormOpen]     = useState(false);
  const [veeEditing, setVeeEditing]       = useState<Veedor | null>(null);

  // Reaccionar al prop prefillNuevaCautelar — abrir el form con los
  // valores pre-llenos y avisar al padre para que limpie el state.
  React.useEffect(() => {
    if (!prefillNuevaCautelar) return;
    setCautEditing(null);
    setCautPrefill(prefillNuevaCautelar);
    setCautFormOpen(true);
    onPrefillConsumido?.();
  }, [prefillNuevaCautelar, onPrefillConsumido]);

  const onDeleteCaut = async (c: Cautelar) => {
    if (!window.confirm(`Eliminar la cautelar "${TIPO_CAUTELAR_LABELS[c.tipo]}"? Los veedores vinculados quedarán sin FK pero se preservan.`)) return;
    await handleDeleteCautelar(c.id);
  };
  const onDeleteVee = async (v: Veedor) => {
    if (!window.confirm(`Eliminar al veedor "${v.nombre}"?`)) return;
    await handleDeleteVeedor(v.id);
  };

  return (
    <div className="space-y-6">
      {/* ─── Cautelares ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <ShieldAlert size={16} className="text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Medidas cautelares</h3>
              <p className="text-[11px] text-muted-foreground">
                Inhibiciones, embargos, intervenciones, anotaciones de litis. Click en una para registrar levantamientos parciales o totales.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => { setCautEditing(null); setCautFormOpen(true); }} className="gap-2">
            <Plus size={14} /> Nueva cautelar
          </Button>
        </div>
        {cautelaresDelMatter.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-xs text-muted-foreground">Sin cautelares cargadas en este caso.</p>
          </div>
        )}
        <div className="space-y-2">
          {cautelaresDelMatter.map(c => (
            <CautelarCard
              key={c.id}
              cautelar={c}
              bien={c.bienId ? bienesDelMatter.find(b => b.id === c.bienId) : undefined}
              sociedad={c.sociedadInterpuestaId ? sociedadesDelMatter.find(s => s.id === c.sociedadInterpuestaId) : undefined}
              veedoresVinculados={veedoresDelMatter.filter(v => v.cautelarId === c.id)}
              templates={templatesParaCautelar(c, matterDelPanel)}
              onEdit={() => { setCautEditing(c); setCautFormOpen(true); }}
              onDelete={() => onDeleteCaut(c)}
              onGenerarEscrito={(templateId) => generarEscritoCautelar(templateId, c.bienId)}
            />
          ))}
        </div>
      </section>

      {/* ─── Veedores ─── */}
      <section className="space-y-3 border-t border-border/40 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Eye size={16} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Veedores judiciales</h3>
              <p className="text-[11px] text-muted-foreground">
                Designados para vigilar una actividad o sociedad. Distintos del perito: rol continuo + informes periódicos.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setVeeEditing(null); setVeeFormOpen(true); }} className="gap-2">
            <Plus size={14} /> Nuevo veedor
          </Button>
        </div>
        {veedoresDelMatter.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-xs text-muted-foreground">Sin veedores designados en este caso.</p>
          </div>
        )}
        <div className="space-y-2">
          {veedoresDelMatter.map(v => (
            <VeedorCard
              key={v.id}
              veedor={v}
              cautelar={v.cautelarId ? cautelaresDelMatter.find(c => c.id === v.cautelarId) : undefined}
              onEdit={() => { setVeeEditing(v); setVeeFormOpen(true); }}
              onDelete={() => onDeleteVee(v)}
            />
          ))}
        </div>
      </section>

      {/* ─── Modales ─── */}
      <CautelarForm
        isOpen={cautFormOpen}
        editing={cautEditing}
        prefill={cautPrefill}
        contraparteDefaults={{
          nombre: matterDelPanel?.caseData?.conyuge2_nombre
               ?? matterDelPanel?.caseData?.demandado_nombre
               ?? matterDelPanel?.caseData?.alimentante_nombre
               ?? matterDelPanel?.caseData?.otro_progenitor_nombre,
          dni:    matterDelPanel?.caseData?.conyuge2_dni
               ?? matterDelPanel?.caseData?.demandado_dni
               ?? matterDelPanel?.caseData?.alimentante_dni
               ?? matterDelPanel?.caseData?.otro_progenitor_dni,
        }}
        clienteDefaults={{
          nombre: matterDelPanel?.caseData?.conyuge1_nombre
               ?? matterDelPanel?.caseData?.actor_nombre
               ?? matterDelPanel?.caseData?.victima_nombre
               ?? matterDelPanel?.caseData?.trabajador_nombre,
          dni:    matterDelPanel?.caseData?.conyuge1_dni
               ?? matterDelPanel?.caseData?.actor_dni
               ?? matterDelPanel?.caseData?.victima_dni
               ?? matterDelPanel?.caseData?.trabajador_dni,
        }}
        bienes={bienesDelMatter}
        sociedades={sociedadesDelMatter}
        onClose={() => { setCautFormOpen(false); setCautPrefill(null); }}
        onSave={async (data) => {
          if (cautEditing) {
            await handleUpdateCautelar(cautEditing.id, data);
          } else {
            await handleCreateCautelar({ ...data, matterId } as Omit<Cautelar, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setCautFormOpen(false);
        }}
      />

      <VeedorForm
        isOpen={veeFormOpen}
        editing={veeEditing}
        cautelares={cautelaresDelMatter}
        onClose={() => setVeeFormOpen(false)}
        onSave={async (data) => {
          if (veeEditing) {
            await handleUpdateVeedor(veeEditing.id, data);
          } else {
            await handleCreateVeedor({ ...data, matterId } as Omit<Veedor, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setVeeFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Card cautelar ─────────────────────────────────────────────

const CautelarCard: React.FC<{
  cautelar: Cautelar;
  bien?: { id: string; descripcion: string };
  sociedad?: { id: string; denominacion: string };
  veedoresVinculados: Veedor[];
  /** GAP UX-34: opciones de plantillas a generar para esta cautelar.
   *  La card muestra un menú si hay >1, o un botón directo si hay 1. */
  templates: TemplateOption[];
  onEdit: () => void;
  onDelete: () => void;
  onGenerarEscrito: (templateId: string) => void;
}> = ({ cautelar: c, bien, sociedad, veedoresVinculados, templates, onEdit, onDelete, onGenerarEscrito }) => {
  const [escritoMenuOpen, setEscritoMenuOpen] = useState(false);
  const vigente = ESTADO_VIGENTE.includes(c.estado);
  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-colors',
      vigente
        ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
        : 'border-border/60 bg-card hover:border-border',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{TIPO_CAUTELAR_LABELS[c.tipo]}</span>
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', ESTADO_TONE[c.estado])}>
              {ESTADO_CAUTELAR_LABELS[c.estado]}
            </span>
            <Badge variant="outline" className="text-[9px]">Contra {TITULAR_ROL_LABELS[c.contraRol]}</Badge>
          </div>

          {c.contraDetalle && (
            <p className="text-[11px] text-foreground/90"><strong>Sobre:</strong> {c.contraDetalle}</p>
          )}
          {c.alcance && (
            <p className="text-[11px] text-muted-foreground">{c.alcance}</p>
          )}

          {(bien || sociedad) && (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {bien && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-bold">
                  Bien: {bien.descripcion}
                </span>
              )}
              {sociedad && (
                <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/30 text-violet-700 font-bold">
                  Sociedad: {sociedad.denominacion}
                </span>
              )}
            </div>
          )}

          {/* Fechas del ciclo */}
          <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
            {c.fechaSolicitud && <span>Solicitada {format(parseISO(c.fechaSolicitud), 'd MMM yyyy', { locale: es })}</span>}
            {c.fechaResolucion && <span>· Resuelta {format(parseISO(c.fechaResolucion), 'd MMM yyyy', { locale: es })}</span>}
            {c.fechaTraba && <span>· Trabada {format(parseISO(c.fechaTraba), 'd MMM yyyy', { locale: es })}</span>}
            {c.fechaLevantamientoParcial && <span className="text-amber-700">· Levantada parcial {format(parseISO(c.fechaLevantamientoParcial), 'd MMM yyyy', { locale: es })}</span>}
            {c.fechaLevantamientoTotal && <span className="text-emerald-700">· Levantada total {format(parseISO(c.fechaLevantamientoTotal), 'd MMM yyyy', { locale: es })}</span>}
            {c.fechaRechazo && <span className="text-muted-foreground">· Rechazada {format(parseISO(c.fechaRechazo), 'd MMM yyyy', { locale: es })}</span>}
          </div>

          {c.registroInscripcion && (
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground/70">Inscripción:</strong> {c.registroInscripcion}
            </p>
          )}
          {c.caucionTipo && c.caucionTipo !== 'no_corresponde' && (
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground/70">Contracautela:</strong> {c.caucionTipo}{c.caucionMontoDesc ? ` — ${c.caucionMontoDesc}` : ''}
            </p>
          )}

          {veedoresVinculados.length > 0 && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              <Eye size={11} className="inline -mt-0.5 mr-1" />
              {veedoresVinculados.length === 1 ? 'Veedor designado:' : `${veedoresVinculados.length} veedores designados:`}{' '}
              {veedoresVinculados.map(v => v.nombre).join(', ')}
            </p>
          )}

          {c.notas && <p className="text-[11px] text-muted-foreground italic">{c.notas}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          {/* GAP UX-34: generar escrito (PDF / texto) desde plantilla.
              Si hay 1 template, click directo. Si hay varios, menú. */}
          {templates.length === 1 && (
            <button
              onClick={() => onGenerarEscrito(templates[0].id)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
              title="Generar escrito desde plantilla pre-llenada con los datos del matter"
            >
              <FileText size={11} /> Escrito
            </button>
          )}
          {templates.length > 1 && (
            <>
              <button
                onClick={() => setEscritoMenuOpen(o => !o)}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-foreground/20 bg-foreground/5 text-foreground hover:bg-foreground/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
                title="Elegir plantilla y generar el escrito"
              >
                <FileText size={11} /> Escrito ▾
              </button>
              {escritoMenuOpen && (
                <>
                  {/* Backdrop para cerrar al click afuera */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setEscritoMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-9 z-20 min-w-[260px] rounded-xl border border-border/60 bg-card shadow-2xl py-1.5">
                    <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Generar escrito desde…
                    </div>
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setEscritoMenuOpen(false); onGenerarEscrito(t.id); }}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-muted/50 transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Eliminar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card veedor ───────────────────────────────────────────────

const VeedorCard: React.FC<{
  veedor: Veedor;
  cautelar?: Cautelar;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ veedor: v, cautelar, onEdit, onDelete }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-amber-500/30 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{v.nombre}</span>
          {v.especialidad && <Badge variant="outline" className="text-[9px]">{v.especialidad}</Badge>}
          {v.matricula && <span className="text-[10px] text-muted-foreground font-mono">Mat. {v.matricula}</span>}
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', VEEDOR_TONE[v.estado])}>
            {ESTADO_VEEDOR_LABELS[v.estado]}
          </span>
          {v.frecuenciaInformes && (
            <Badge variant="outline" className="text-[9px]">Informes {FRECUENCIA_INFORMES_LABELS[v.frecuenciaInformes].toLowerCase()}</Badge>
          )}
        </div>
        {cautelar && (
          <p className="text-[11px] text-rose-700 dark:text-rose-300">
            <ShieldAlert size={11} className="inline -mt-0.5 mr-1" />
            Designado por: {TIPO_CAUTELAR_LABELS[cautelar.tipo]}
          </p>
        )}
        {v.alcance && <p className="text-[11px] text-foreground/90">{v.alcance}</p>}
        <div className="flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">
          {v.email && <span>{v.email}</span>}
          {v.telefono && <span>· {v.telefono}</span>}
          {v.fechaDesignacion && <span>· Designado {format(parseISO(v.fechaDesignacion), 'd MMM yyyy', { locale: es })}</span>}
          {v.fechaAceptacion && <span>· Aceptó {format(parseISO(v.fechaAceptacion), 'd MMM yyyy', { locale: es })}</span>}
          {v.fechaCese && <span>· Cesó {format(parseISO(v.fechaCese), 'd MMM yyyy', { locale: es })}</span>}
        </div>
        {v.honorariosDesc && (
          <p className="text-[10px] text-muted-foreground">
            <strong className="text-foreground/70">Honorarios:</strong> {v.honorariosDesc}
          </p>
        )}
        {v.notas && <p className="text-[11px] text-muted-foreground italic">{v.notas}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Eliminar">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
);

// ─── Form cautelar ─────────────────────────────────────────────

interface CautelarFormProps {
  isOpen: boolean;
  editing: Cautelar | null;
  prefill?: Partial<Cautelar> | null;
  /** Datos de la contraparte del matter (conyuge2_* / demandado_* / etc.)
   *  para autocompletar el detalle cuando contraRol === 'contraparte'. */
  contraparteDefaults?: { nombre?: string; dni?: string };
  /** Datos del cliente del matter (conyuge1_* / actor_* / etc.)
   *  para autocompletar cuando contraRol === 'cliente' (cautelar defensiva
   *  trabada por la otra parte sobre los bienes del propio cliente). */
  clienteDefaults?: { nombre?: string; dni?: string };
  bienes: { id: string; descripcion: string }[];
  sociedades: { id: string; denominacion: string }[];
  onClose: () => void;
  onSave: (data: Partial<Cautelar>) => Promise<void>;
}

// Helper: construye el texto auto para "Detalle (sobre quién)" según el
// rol y los defaults disponibles. Devuelve '' si no tiene datos.
function buildDetalleAuto(
  rol: TitularRol,
  cliente?: { nombre?: string; dni?: string },
  contraparte?: { nombre?: string; dni?: string },
  sociedadId?: string,
  sociedades?: { id: string; denominacion: string }[],
): string {
  const fmt = (p: { nombre?: string; dni?: string } | undefined) =>
    p?.nombre
      ? [p.nombre, p.dni && `DNI ${p.dni}`].filter(Boolean).join(', ')
      : '';
  switch (rol) {
    case 'cliente':
      return fmt(cliente);
    case 'contraparte':
      return fmt(contraparte);
    case 'ambos': {
      const a = fmt(cliente);
      const b = fmt(contraparte);
      return a && b ? `${a} y ${b}` : a || b;
    }
    case 'tercero': {
      // Si hay sociedad interpuesta seleccionada, usarla como punto de
      // partida; si no, vacío (hay demasiadas variantes — texto libre).
      const soc = sociedades?.find(s => s.id === sociedadId);
      return soc ? `${soc.denominacion} (sociedad interpuesta)` : '';
    }
    default:
      return '';
  }
}

// Texto de ayuda contextual según el rol seleccionado.
const CONTRA_ROL_HINT: Record<TitularRol, string> = {
  cliente:
    'Cautelar trabada POR la contraparte sobre bienes de tu cliente. Registrala para seguimiento defensivo (traba, vencimiento, levantamiento).',
  contraparte:
    'La medida recae sobre los bienes del demandado / otro cónyuge. El caso más común.',
  ambos:
    'Afecta a ambas partes a la vez — ej. acreedor común del matrimonio, inmueble en condominio co-titulado, co-deudores solidarios.',
  tercero:
    'Contra alguien que no es parte principal: sociedad interpuesta, empleador (retención de haberes), banco depositario, tenedor del bien, garante.',
};

const CautelarForm: React.FC<CautelarFormProps> = ({
  isOpen, editing, prefill, contraparteDefaults, clienteDefaults,
  bienes, sociedades, onClose, onSave,
}) => {
  const [tipo, setTipo]                                   = useState<TipoCautelar>('inhibicion_general');
  const [contraRol, setContraRol]                         = useState<TitularRol>('contraparte');
  const [contraDetalle, setContraDetalle]                 = useState('');
  // Cuando el form auto-rellena el detalle, detalleAutoFilled === true.
  // Si el usuario escribe manualmente, pasa a false y ya no se sobreescribe
  // aunque el usuario cambie el rol.
  const [detalleAutoFilled, setDetalleAutoFilled]         = useState(true);
  const [bienId, setBienId]                               = useState('');
  const [sociedadId, setSociedadId]                       = useState('');
  const [alcance, setAlcance]                             = useState('');
  const [estado, setEstado]                               = useState<EstadoCautelar>('solicitada');
  const [fechaSolicitud, setFechaSolicitud]               = useState('');
  const [fechaResolucion, setFechaResolucion]             = useState('');
  const [fechaTraba, setFechaTraba]                       = useState('');
  const [fechaLevantamientoParcial, setFechaLevantamientoParcial] = useState('');
  const [fechaLevantamientoTotal, setFechaLevantamientoTotal]     = useState('');
  const [fechaRechazo, setFechaRechazo]                   = useState('');
  const [registroInscripcion, setRegistroInscripcion]     = useState('');
  const [caucionTipo, setCaucionTipo]                     = useState<CaucionTipo | ''>('');
  const [caucionMontoDesc, setCaucionMontoDesc]           = useState('');
  const [observaciones, setObservaciones]                 = useState('');
  const [notas, setNotas]                                 = useState('');
  const [saving, setSaving]                               = useState(false);

  // Al abrir o cambiar lo que se edita / prefill, inicializar todos
  // los campos y auto-rellenar el detalle.
  React.useEffect(() => {
    if (!isOpen) return;
    const seed = editing ?? prefill ?? {};
    setTipo(seed.tipo ?? 'inhibicion_general');
    const rolEfectivo = seed.contraRol ?? 'contraparte';
    setContraRol(rolEfectivo);
    setBienId(seed.bienId ?? '');
    const socId = seed.sociedadInterpuestaId ?? '';
    setSociedadId(socId);
    setAlcance(seed.alcance ?? '');
    setEstado(seed.estado ?? 'solicitada');
    setFechaSolicitud(seed.fechaSolicitud ?? '');
    setFechaResolucion(seed.fechaResolucion ?? '');
    setFechaTraba(seed.fechaTraba ?? '');
    setFechaLevantamientoParcial(seed.fechaLevantamientoParcial ?? '');
    setFechaLevantamientoTotal(seed.fechaLevantamientoTotal ?? '');
    setFechaRechazo(seed.fechaRechazo ?? '');
    setRegistroInscripcion(seed.registroInscripcion ?? '');
    setCaucionTipo(seed.caucionTipo ?? '');
    setCaucionMontoDesc(seed.caucionMontoDesc ?? '');
    setObservaciones(seed.observaciones ?? '');
    setNotas(seed.notas ?? '');
    // Si el seed ya tenía contraDetalle, respetarlo y marcar como manual.
    if (seed.contraDetalle) {
      setContraDetalle(seed.contraDetalle);
      setDetalleAutoFilled(false);
    } else {
      const auto = buildDetalleAuto(rolEfectivo, clienteDefaults, contraparteDefaults, socId, sociedades);
      setContraDetalle(auto);
      setDetalleAutoFilled(true);
    }
  }, [isOpen, editing, prefill]);

  // Cuando el usuario cambia el rol (y no editó manualmente el detalle),
  // recalcular el texto automático.
  React.useEffect(() => {
    if (!isOpen || !detalleAutoFilled) return;
    const auto = buildDetalleAuto(contraRol, clienteDefaults, contraparteDefaults, sociedadId, sociedades);
    setContraDetalle(auto);
  }, [contraRol, sociedadId, isOpen, detalleAutoFilled, clienteDefaults, contraparteDefaults, sociedades]);

  const puedeGuardar = !!tipo && !!estado;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave({
        tipo,
        contraRol,
        contraDetalle:             contraDetalle.trim()             || undefined,
        bienId:                    bienId                           || undefined,
        sociedadInterpuestaId:     sociedadId                       || undefined,
        alcance:                   alcance.trim()                   || undefined,
        estado,
        fechaSolicitud:            fechaSolicitud                   || undefined,
        fechaResolucion:           fechaResolucion                  || undefined,
        fechaTraba:                fechaTraba                       || undefined,
        fechaLevantamientoParcial: fechaLevantamientoParcial        || undefined,
        fechaLevantamientoTotal:   fechaLevantamientoTotal          || undefined,
        fechaRechazo:              fechaRechazo                     || undefined,
        registroInscripcion:       registroInscripcion.trim()       || undefined,
        caucionTipo:               (caucionTipo || undefined) as CaucionTipo | undefined,
        caucionMontoDesc:          caucionMontoDesc.trim()          || undefined,
        observaciones:             observaciones.trim()             || undefined,
        notas:                     notas.trim()                     || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar cautelar' : 'Nueva cautelar'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear cautelar')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo *</Label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoCautelar)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {TIPO_OPTS.map(t => <option key={t} value={t}>{TIPO_CAUTELAR_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <Label>Estado *</Label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoCautelar)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {ESTADO_OPTS.map(s => <option key={s} value={s}>{ESTADO_CAUTELAR_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contra *</Label>
              <select
                value={contraRol}
                onChange={e => setContraRol(e.target.value as TitularRol)}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="cliente">{TITULAR_ROL_LABELS.cliente}</option>
                <option value="contraparte">{TITULAR_ROL_LABELS.contraparte}</option>
                <option value="ambos">{TITULAR_ROL_LABELS.ambos}</option>
                <option value="tercero">{TITULAR_ROL_LABELS.tercero}</option>
              </select>
            </div>
            <div>
              <Label>Detalle (sobre quién)</Label>
              <Input
                value={contraDetalle}
                onChange={e => {
                  setContraDetalle(e.target.value);
                  setDetalleAutoFilled(false);
                }}
                placeholder={
                  contraRol === 'tercero'
                    ? 'Ej: sociedad / empleador / banco / tenedor del bien'
                    : 'Nombre y DNI — se auto-rellena desde los datos del caso'
                }
              />
            </div>
          </div>
          {/* Helper text contextual — explica qué significa cada rol */}
          <p className="text-[10px] text-muted-foreground italic px-0.5">
            {CONTRA_ROL_HINT[contraRol]}
          </p>
        </div>

        <div>
          <Label>Alcance</Label>
          <Textarea
            value={alcance}
            onChange={e => setAlcance(e.target.value)}
            placeholder="Ej: Sobre todos los bienes registrables del demandado / Sobre la cuenta HSBC / Sobre la SRL Centro Cardiovascular Ruiz & Asociados"
            className="min-h-[60px]"
          />
        </div>

        {(bienes.length > 0 || sociedades.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {bienes.length > 0 && (
              <div>
                <Label>Bien específico afectado</Label>
                <select value={bienId} onChange={e => setBienId(e.target.value)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                  <option value="">— Cautelar general (no apunta a un bien) —</option>
                  {bienes.map(b => <option key={b.id} value={b.id}>{b.descripcion}</option>)}
                </select>
              </div>
            )}
            {sociedades.length > 0 && (
              <div>
                <Label>Sociedad afectada</Label>
                <select value={sociedadId} onChange={e => setSociedadId(e.target.value)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                  <option value="">— No apunta a una sociedad —</option>
                  {sociedades.map(s => <option key={s.id} value={s.id}>{s.denominacion}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fechas del ciclo</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Fecha de solicitud</Label>
              <Input type="date" value={fechaSolicitud} onChange={e => setFechaSolicitud(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de resolución</Label>
              <Input type="date" value={fechaResolucion} onChange={e => setFechaResolucion(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de traba (efectividad)</Label>
              <Input type="date" value={fechaTraba} onChange={e => setFechaTraba(e.target.value)} />
            </div>
            <div>
              <Label>Fecha de rechazo</Label>
              <Input type="date" value={fechaRechazo} onChange={e => setFechaRechazo(e.target.value)} />
            </div>
            <div>
              <Label>Levantamiento parcial</Label>
              <Input type="date" value={fechaLevantamientoParcial} onChange={e => setFechaLevantamientoParcial(e.target.value)} />
            </div>
            <div>
              <Label>Levantamiento total</Label>
              <Input type="date" value={fechaLevantamientoTotal} onChange={e => setFechaLevantamientoTotal(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inscripción y contracautela</h4>
          <div>
            <Label>Inscripción registral</Label>
            <Input
              value={registroInscripcion}
              onChange={e => setRegistroInscripcion(e.target.value)}
              placeholder='Ej: "Reg. de Inhibiciones CABA, fol. 234, 2026" / "DNRPA dominio AF 123 XY"'
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de contracautela</Label>
              <select value={caucionTipo} onChange={e => setCaucionTipo(e.target.value as CaucionTipo | '')} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                <option value="">— Sin dato —</option>
                <option value="real">Real</option>
                <option value="juratoria">Juratoria</option>
                <option value="fianza">Fianza</option>
                <option value="no_corresponde">No corresponde</option>
              </select>
            </div>
            <div>
              <Label>Monto / detalle</Label>
              <Input value={caucionMontoDesc} onChange={e => setCaucionMontoDesc(e.target.value)} placeholder='Ej: "U$S 5.000" o "Bonos AL30 valor nominal"' />
            </div>
          </div>
        </section>

        <div>
          <Label>Observaciones</Label>
          <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="min-h-[60px]" />
        </div>
        <div>
          <Label>Notas internas</Label>
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
        </div>
      </div>
    </Modal>
  );
};

// ─── Form veedor ───────────────────────────────────────────────

interface VeedorFormProps {
  isOpen: boolean;
  editing: Veedor | null;
  cautelares: Cautelar[];
  onClose: () => void;
  onSave: (data: Partial<Veedor>) => Promise<void>;
}

const VeedorForm: React.FC<VeedorFormProps> = ({ isOpen, editing, cautelares, onClose, onSave }) => {
  const [nombre, setNombre]                       = useState('');
  const [especialidad, setEspecialidad]           = useState('');
  const [matricula, setMatricula]                 = useState('');
  const [email, setEmail]                         = useState('');
  const [telefono, setTelefono]                   = useState('');
  const [estado, setEstado]                       = useState<EstadoVeedor>('designado');
  const [cautelarId, setCautelarId]               = useState('');
  const [alcance, setAlcance]                     = useState('');
  const [frecuencia, setFrecuencia]               = useState<FrecuenciaInformesVeedor | ''>('');
  const [fechaDesignacion, setFechaDesignacion]   = useState('');
  const [fechaAceptacion, setFechaAceptacion]     = useState('');
  const [fechaCese, setFechaCese]                 = useState('');
  const [honorariosDesc, setHonorariosDesc]       = useState('');
  const [observaciones, setObservaciones]         = useState('');
  const [notas, setNotas]                         = useState('');
  const [saving, setSaving]                       = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setEspecialidad(editing?.especialidad ?? '');
    setMatricula(editing?.matricula ?? '');
    setEmail(editing?.email ?? '');
    setTelefono(editing?.telefono ?? '');
    setEstado(editing?.estado ?? 'designado');
    setCautelarId(editing?.cautelarId ?? '');
    setAlcance(editing?.alcance ?? '');
    setFrecuencia(editing?.frecuenciaInformes ?? '');
    setFechaDesignacion(editing?.fechaDesignacion ?? '');
    setFechaAceptacion(editing?.fechaAceptacion ?? '');
    setFechaCese(editing?.fechaCese ?? '');
    setHonorariosDesc(editing?.honorariosDesc ?? '');
    setObservaciones(editing?.observaciones ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  // Sugerencia de cautelares relevantes (intervención judicial primero).
  const cautelaresOrdenadas = useMemo(
    () => cautelares.slice().sort((a, b) => {
      if (a.tipo === 'intervencion_judicial' && b.tipo !== 'intervencion_judicial') return -1;
      if (b.tipo === 'intervencion_judicial' && a.tipo !== 'intervencion_judicial') return 1;
      return 0;
    }),
    [cautelares],
  );

  const puedeGuardar = nombre.trim().length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave({
        nombre:             nombre.trim(),
        especialidad:       especialidad.trim()       || undefined,
        matricula:          matricula.trim()          || undefined,
        email:              email.trim()              || undefined,
        telefono:           telefono.trim()           || undefined,
        estado,
        cautelarId:         cautelarId                || undefined,
        alcance:            alcance.trim()            || undefined,
        frecuenciaInformes: (frecuencia || undefined) as FrecuenciaInformesVeedor | undefined,
        fechaDesignacion:   fechaDesignacion          || undefined,
        fechaAceptacion:    fechaAceptacion           || undefined,
        fechaCese:          fechaCese                 || undefined,
        honorariosDesc:     honorariosDesc.trim()     || undefined,
        observaciones:      observaciones.trim()      || undefined,
        notas:              notas.trim()              || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar veedor — ${editing.nombre}` : 'Nuevo veedor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear veedor')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Nombre completo *</Label>
          <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder='Ej: "CPN Juan Pérez"' />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Especialidad</Label>
            <Input value={especialidad} onChange={e => setEspecialidad(e.target.value)} placeholder="contador / abogado / ingeniero" />
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="T° 45 F° 234 CPCE" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={telefono} onChange={e => setTelefono(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado</Label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoVeedor)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="designado">{ESTADO_VEEDOR_LABELS.designado}</option>
              <option value="aceptado">{ESTADO_VEEDOR_LABELS.aceptado}</option>
              <option value="rechazado">{ESTADO_VEEDOR_LABELS.rechazado}</option>
              <option value="recusado">{ESTADO_VEEDOR_LABELS.recusado}</option>
              <option value="sustituido">{ESTADO_VEEDOR_LABELS.sustituido}</option>
              <option value="cesado">{ESTADO_VEEDOR_LABELS.cesado}</option>
            </select>
          </div>
          <div>
            <Label>Frecuencia de informes</Label>
            <select value={frecuencia} onChange={e => setFrecuencia(e.target.value as FrecuenciaInformesVeedor | '')} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="">— Sin dato —</option>
              <option value="mensual">{FRECUENCIA_INFORMES_LABELS.mensual}</option>
              <option value="bimestral">{FRECUENCIA_INFORMES_LABELS.bimestral}</option>
              <option value="trimestral">{FRECUENCIA_INFORMES_LABELS.trimestral}</option>
              <option value="semestral">{FRECUENCIA_INFORMES_LABELS.semestral}</option>
              <option value="a_requerimiento">{FRECUENCIA_INFORMES_LABELS.a_requerimiento}</option>
            </select>
          </div>
        </div>

        {cautelaresOrdenadas.length > 0 && (
          <div>
            <Label>Cautelar de origen (opcional)</Label>
            <select value={cautelarId} onChange={e => setCautelarId(e.target.value)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="">— Designación independiente —</option>
              {cautelaresOrdenadas.map(c => (
                <option key={c.id} value={c.id}>
                  {TIPO_CAUTELAR_LABELS[c.tipo]}{c.alcance ? ` — ${c.alcance.slice(0, 60)}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Si el veedor surge de una intervención judicial, vinculálo acá para mostrar la trazabilidad.
            </p>
          </div>
        )}

        <div>
          <Label>Alcance</Label>
          <Textarea
            value={alcance}
            onChange={e => setAlcance(e.target.value)}
            placeholder="Ej: Vigilar todas las operaciones de Centro Cardiovascular Ruiz & Asociados S.R.L. Reportar movimientos extraordinarios > $10M."
            className="min-h-[60px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Fecha de designación</Label>
            <Input type="date" value={fechaDesignacion} onChange={e => setFechaDesignacion(e.target.value)} />
          </div>
          <div>
            <Label>Fecha de aceptación</Label>
            <Input type="date" value={fechaAceptacion} onChange={e => setFechaAceptacion(e.target.value)} />
          </div>
          <div>
            <Label>Fecha de cese</Label>
            <Input type="date" value={fechaCese} onChange={e => setFechaCese(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Honorarios (descripción)</Label>
          <Input value={honorariosDesc} onChange={e => setHonorariosDesc(e.target.value)} placeholder='Ej: "5% del activo intervenido — regulado al cierre"' />
        </div>
        <div>
          <Label>Observaciones</Label>
          <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="min-h-[60px]" />
        </div>
        <div>
          <Label>Notas internas</Label>
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
        </div>
      </div>
    </Modal>
  );
};
