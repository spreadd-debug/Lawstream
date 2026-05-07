// GAP R13 — Panel de cuotas alimentarias con desglose efectivo / especie.
//
// Modela el régimen alimentario completo:
//   • Componente en efectivo (monto + moneda + frecuencia + ajuste).
//   • N conceptos en especie (colegio, prepaga, terapias, AT) con
//     prestador, monto estimado, pagador (directo / reembolso /
//     compartido) y FK opcional al hijo (terapias de Olivia van con
//     hijo_id; OSDE de la familia va con hijo_id NULL).
//
// Cada cuota tiene un ciclo (provisoria → definitiva → modificada →
// extinguida) con fechas de vigencia. Pueden coexistir varias cuotas
// históricas en el mismo matter.

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  CuotaAlimentaria,
  CuotaConceptoEspecie,
  EstadoCuotaAlimentaria,
  AlcanceCuota,
  FrecuenciaCuotaAlim,
  AjusteCuota,
  CategoriaConceptoEspecie,
  PagadorConcepto,
  TitularRol,
  Moneda,
  HijoCaso,
  ESTADO_CUOTA_LABELS,
  ALCANCE_CUOTA_LABELS,
  FRECUENCIA_CUOTA_LABELS,
  AJUSTE_CUOTA_LABELS,
  CATEGORIA_CONCEPTO_LABELS,
  PAGADOR_CONCEPTO_LABELS,
  TITULAR_ROL_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, FileText, Sparkles, Wallet, AlertCircle, ChevronRight,
} from 'lucide-react';

interface CuotasAlimentariasPanelProps {
  matterId: string;
}

const ESTADO_TONE: Record<EstadoCuotaAlimentaria, string> = {
  provisoria: 'text-amber-700 bg-amber-500/10 border-amber-500/30',
  definitiva: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
  modificada: 'text-blue-700 bg-blue-500/10 border-blue-500/30',
  extinguida: 'text-muted-foreground bg-muted/30 border-border/40',
};

const formatMoneda = (valor: number | undefined, moneda: Moneda | undefined): string => {
  if (valor == null) return '—';
  const symbol = moneda === 'USD' ? 'US$' : moneda === 'EUR' ? '€' : '$';
  return `${symbol} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const CuotasAlimentariasPanel: React.FC<CuotasAlimentariasPanelProps> = ({ matterId }) => {
  const {
    cuotasAlimentarias, cuotaConceptosEspecie, hijos,
    handleCreateCuotaAlimentaria, handleUpdateCuotaAlimentaria, handleDeleteCuotaAlimentaria,
    handleCreateCuotaConceptoEspecie, handleUpdateCuotaConceptoEspecie, handleDeleteCuotaConceptoEspecie,
  } = useAppContext();

  const cuotasDelMatter = useMemo(
    () => cuotasAlimentarias.filter(c => c.matterId === matterId)
      .sort((a, b) => (b.fechaVigenciaDesde ?? '').localeCompare(a.fechaVigenciaDesde ?? '')),
    [cuotasAlimentarias, matterId],
  );

  // GAP UX-35: historial cronológico (más vieja → más nueva) para el
  // mini-stepper. La "vigente" es la más reciente que NO esté extinguida —
  // si la última está extinguida, no hay vigente actual.
  const historialCuotas = useMemo(() => {
    const ordenadas = [...cuotasDelMatter].sort(
      (a, b) => (a.fechaVigenciaDesde ?? '').localeCompare(b.fechaVigenciaDesde ?? ''),
    );
    const vigenteId = [...ordenadas].reverse().find(c => c.estado !== 'extinguida')?.id;
    return ordenadas.map(c => ({ cuota: c, esVigente: c.id === vigenteId }));
  }, [cuotasDelMatter]);
  const hijosDelMatter = useMemo(
    () => hijos.filter(h => h.matterId === matterId),
    [hijos, matterId],
  );

  const [cuotaFormOpen, setCuotaFormOpen]   = useState(false);
  const [cuotaEditing, setCuotaEditing]     = useState<CuotaAlimentaria | null>(null);
  const [conceptoFormOpen, setConceptoFormOpen] = useState(false);
  const [conceptoEditing, setConceptoEditing]   = useState<CuotaConceptoEspecie | null>(null);
  const [conceptoCuotaId, setConceptoCuotaId]   = useState<string>('');
  // GAP UX-33: tras crear una cuota nueva guardamos su id para mostrar un
  // banner con CTA "Agregar conceptos en especie". Aumenta la tasa de carga
  // completa frente al botón pequeño dentro de la card que es fácil saltear.
  const [cuotaRecienCreadaId, setCuotaRecienCreadaId] = useState<string | null>(null);

  const onDeleteCuota = async (c: CuotaAlimentaria) => {
    const conceptos = cuotaConceptosEspecie.filter(ce => ce.cuotaAlimentariaId === c.id).length;
    const msg = conceptos > 0
      ? `Eliminar la cuota ${ESTADO_CUOTA_LABELS[c.estado]}? Se borrarán también ${conceptos} concepto${conceptos === 1 ? '' : 's'} en especie asociado${conceptos === 1 ? '' : 's'}.`
      : `Eliminar la cuota ${ESTADO_CUOTA_LABELS[c.estado]}?`;
    if (!window.confirm(msg)) return;
    await handleDeleteCuotaAlimentaria(c.id);
  };
  const onDeleteConcepto = async (ce: CuotaConceptoEspecie) => {
    if (!window.confirm(`Eliminar el concepto "${ce.concepto}"?`)) return;
    await handleDeleteCuotaConceptoEspecie(ce.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Wallet size={16} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Cuotas alimentarias</h3>
            <p className="text-[11px] text-muted-foreground">
              Régimen alimentario con desglose efectivo + componentes en especie (colegio, prepaga, terapias). Soporta historial: provisoria → definitiva → modificada.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => { setCuotaEditing(null); setCuotaFormOpen(true); }} className="gap-2">
          <Plus size={14} /> Nueva cuota
        </Button>
      </div>

      {cuotasDelMatter.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <Wallet size={24} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin cuotas cargadas. Cuando se fije una cuota provisoria por incidente o una definitiva por sentencia, agregála acá con el desglose por concepto.
          </p>
        </div>
      )}

      {/* GAP UX-33: prompt post-creación para que el usuario no se saltee
          la carga de conceptos en especie. */}
      {cuotaRecienCreadaId && (
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 p-3 flex items-start gap-3">
          <Sparkles size={16} className="shrink-0 mt-0.5 text-emerald-700" />
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-200">
                Cuota creada
              </span>
              <p className="text-[12px] text-foreground/90 mt-0.5">
                ¿Agregás los conceptos en especie ahora? Colegio, prepaga, terapias, AT, OS — todo lo que se paga directo y no entra en el monto en efectivo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  setConceptoEditing(null);
                  setConceptoCuotaId(cuotaRecienCreadaId);
                  setConceptoFormOpen(true);
                  setCuotaRecienCreadaId(null);
                }}
                className="gap-1.5"
              >
                <Plus size={12} /> Agregar concepto
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCuotaRecienCreadaId(null)}
              >
                Más tarde
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* GAP UX-35: mini-stepper horizontal con el historial cronológico.
          Solo aparece cuando hay 2+ cuotas para no agregar ruido en casos
          simples. Click en cada nodo scrollea a su card. */}
      {historialCuotas.length >= 2 && (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3 overflow-x-auto">
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Historial de la cuota
          </div>
          <div className="flex items-center gap-2 min-w-max">
            {historialCuotas.map(({ cuota, esVigente }, idx) => {
              const fechaTxt = cuota.fechaVigenciaDesde
                ? format(parseISO(cuota.fechaVigenciaDesde), 'MM/yyyy')
                : '—';
              return (
                <React.Fragment key={cuota.id}>
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById(`cuota-${cuota.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors hover:opacity-80',
                      esVigente
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                        : ESTADO_TONE[cuota.estado],
                    )}
                    title={`${ESTADO_CUOTA_LABELS[cuota.estado]} · ${fechaTxt}${esVigente ? ' (vigente)' : ''}`}
                  >
                    <span>{ESTADO_CUOTA_LABELS[cuota.estado]}</span>
                    <span className="font-mono opacity-70">{fechaTxt}</span>
                    {esVigente && (
                      <span className="ml-0.5 text-[8px] font-black tracking-widest text-emerald-700 dark:text-emerald-300">
                        VIGENTE
                      </span>
                    )}
                  </button>
                  {idx < historialCuotas.length - 1 && (
                    <ChevronRight size={12} className="shrink-0 text-muted-foreground" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {cuotasDelMatter.map(c => (
          <CuotaCard
            key={c.id}
            cuota={c}
            conceptos={cuotaConceptosEspecie.filter(ce => ce.cuotaAlimentariaId === c.id)}
            hijos={hijosDelMatter}
            onEdit={() => { setCuotaEditing(c); setCuotaFormOpen(true); }}
            onDelete={() => onDeleteCuota(c)}
            onAddConcepto={() => { setConceptoEditing(null); setConceptoCuotaId(c.id); setConceptoFormOpen(true); }}
            onEditConcepto={(ce) => { setConceptoEditing(ce); setConceptoCuotaId(ce.cuotaAlimentariaId); setConceptoFormOpen(true); }}
            onDeleteConcepto={onDeleteConcepto}
          />
        ))}
      </div>

      <CuotaForm
        isOpen={cuotaFormOpen}
        editing={cuotaEditing}
        hijos={hijosDelMatter}
        onClose={() => setCuotaFormOpen(false)}
        onSave={async (data) => {
          if (cuotaEditing) {
            await handleUpdateCuotaAlimentaria(cuotaEditing.id, data);
          } else {
            const creada = await handleCreateCuotaAlimentaria({ ...data, matterId } as Omit<CuotaAlimentaria, 'id' | 'createdAt' | 'updatedAt'>);
            setCuotaRecienCreadaId(creada.id);
          }
          setCuotaFormOpen(false);
        }}
      />

      <ConceptoForm
        isOpen={conceptoFormOpen}
        editing={conceptoEditing}
        cuotaId={conceptoCuotaId}
        hijos={hijosDelMatter}
        onClose={() => setConceptoFormOpen(false)}
        onSave={async (data) => {
          if (conceptoEditing) {
            await handleUpdateCuotaConceptoEspecie(conceptoEditing.id, data);
          } else {
            await handleCreateCuotaConceptoEspecie({ ...data, cuotaAlimentariaId: conceptoCuotaId } as Omit<CuotaConceptoEspecie, 'id' | 'createdAt' | 'updatedAt'>);
          }
        }}
      />
    </div>
  );
};

// ─── Card de cuota con conceptos ───────────────────────────────

const CuotaCard: React.FC<{
  cuota: CuotaAlimentaria;
  conceptos: CuotaConceptoEspecie[];
  hijos: HijoCaso[];
  onEdit: () => void;
  onDelete: () => void;
  onAddConcepto: () => void;
  onEditConcepto: (ce: CuotaConceptoEspecie) => void;
  onDeleteConcepto: (ce: CuotaConceptoEspecie) => Promise<void>;
}> = ({ cuota: c, conceptos, hijos, onEdit, onDelete, onAddConcepto, onEditConcepto, onDeleteConcepto }) => {
  // Cálculo orientativo del total de la cuota (efectivo + suma de conceptos
  // en la misma moneda y frecuencia que el efectivo). Si difieren, no se
  // totaliza pero (GAP UX-34) avisamos por qué en lugar de ocultarlo.
  const conceptosConMonto      = conceptos.filter(ce => ce.montoEstimado != null);
  const conceptosMismaMoneda   = conceptosConMonto.filter(ce => ce.moneda === c.moneda && ce.frecuencia === c.frecuencia);
  const sumaEspecie            = conceptosMismaMoneda.reduce((acc, ce) => acc + (ce.montoEstimado ?? 0), 0);
  const totalAprox             = (c.montoEfectivo ?? 0) + sumaEspecie;
  const hayTotalAprox          = c.montoEfectivo != null && conceptosMismaMoneda.length > 0;
  const hayMixtos              = conceptosConMonto.length > 0
                               && conceptosMismaMoneda.length < conceptosConMonto.length;

  const hijosCubiertosNombres = c.alcance === 'hijos_especificos'
    ? c.hijosCubiertos.map(id => hijos.find(h => h.id === id)?.nombre).filter(Boolean).join(', ')
    : null;

  return (
    <div id={`cuota-${c.id}`} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 scroll-mt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', ESTADO_TONE[c.estado])}>
              {ESTADO_CUOTA_LABELS[c.estado]}
            </span>
            <Badge variant="outline" className="text-[9px]">{ALCANCE_CUOTA_LABELS[c.alcance]}</Badge>
            <Badge variant="outline" className="text-[9px]">Paga {TITULAR_ROL_LABELS[c.obligadoRol]}</Badge>
            {c.fechaVigenciaDesde && (
              <span className="text-[10px] text-muted-foreground">
                Desde {format(parseISO(c.fechaVigenciaDesde), 'd MMM yyyy', { locale: es })}
                {c.fechaVigenciaHasta && ` · hasta ${format(parseISO(c.fechaVigenciaHasta), 'd MMM yyyy', { locale: es })}`}
              </span>
            )}
          </div>

          {c.fundamento && (
            <p className="text-[11px] text-foreground/90"><FileText size={11} className="inline -mt-0.5 mr-1" />{c.fundamento}</p>
          )}

          {hijosCubiertosNombres && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground/70">Cubre a:</span> {hijosCubiertosNombres}
            </p>
          )}

          {/* Línea principal: efectivo */}
          <div className="text-sm font-bold text-foreground">
            {c.montoEfectivo != null ? (
              <span>
                Efectivo: {formatMoneda(c.montoEfectivo, c.moneda)} {FRECUENCIA_CUOTA_LABELS[c.frecuencia].toLowerCase()}
              </span>
            ) : (
              <span className="text-muted-foreground italic font-normal">Sin componente en efectivo cargado</span>
            )}
          </div>

          {c.ajuste && c.ajuste !== 'sin_ajuste' && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground/70">Ajuste:</span> {AJUSTE_CUOTA_LABELS[c.ajuste]}
              {c.ajusteDesc && ` — ${c.ajusteDesc}`}
            </p>
          )}

          {hayTotalAprox && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
              Total estimado (efectivo + especie misma moneda): {formatMoneda(totalAprox, c.moneda)} / {FRECUENCIA_CUOTA_LABELS[c.frecuencia].toLowerCase()}
              {hayMixtos && (
                <span className="ml-1.5 text-amber-700 dark:text-amber-300 font-normal italic">
                  (excluye {conceptosConMonto.length - conceptosMismaMoneda.length} concepto{conceptosConMonto.length - conceptosMismaMoneda.length === 1 ? '' : 's'} de moneda/frecuencia distinta)
                </span>
              )}
            </p>
          )}
          {!hayTotalAprox && hayMixtos && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 italic flex items-start gap-1">
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              No se puede totalizar — los conceptos cargados están en monedas o frecuencias distintas a la del efectivo.
            </p>
          )}

          {c.notas && <p className="text-[11px] text-muted-foreground italic">{c.notas}</p>}
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

      {/* Conceptos en especie */}
      <div className="border-t border-border/40 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Pagos directos / en especie ({conceptos.length})
          </h4>
          <Button size="sm" variant="outline" onClick={onAddConcepto} className="text-[10px] h-7 gap-1.5">
            <Plus size={11} /> Concepto
          </Button>
        </div>
        {conceptos.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic">
            Sin conceptos en especie. Agregá colegio, prepaga, terapias, AT, etc.
          </p>
        )}
        <div className="space-y-1.5">
          {conceptos.map(ce => {
            const hijo = ce.hijoId ? hijos.find(h => h.id === ce.hijoId) : undefined;
            return (
              <div key={ce.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/30">
                <Sparkles size={13} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold text-foreground">{ce.concepto}</span>
                    <Badge variant="outline" className="text-[8px]">{CATEGORIA_CONCEPTO_LABELS[ce.categoria]}</Badge>
                    {hijo && <Badge variant="outline" className="text-[8px] border-sky-500/30 text-sky-700">Para {hijo.nombre.split(' ')[0]}</Badge>}
                    {ce.montoEstimado != null && (
                      <span className="text-[11px] font-bold text-emerald-700">
                        {formatMoneda(ce.montoEstimado, ce.moneda)} / {FRECUENCIA_CUOTA_LABELS[ce.frecuencia].toLowerCase()}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                    {ce.prestador && <span>{ce.prestador}</span>}
                    <span>· {PAGADOR_CONCEPTO_LABELS[ce.pagador]}</span>
                    {ce.pagadorDetalle && <span>({ce.pagadorDetalle})</span>}
                  </div>
                  {ce.notas && <p className="text-[10px] text-muted-foreground italic">{ce.notas}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEditConcepto(ce)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => onDeleteConcepto(ce)} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Eliminar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Form de cuota ─────────────────────────────────────────────

interface CuotaFormProps {
  isOpen: boolean;
  editing: CuotaAlimentaria | null;
  hijos: HijoCaso[];
  onClose: () => void;
  onSave: (data: Partial<CuotaAlimentaria>) => Promise<void>;
}

const CuotaForm: React.FC<CuotaFormProps> = ({ isOpen, editing, hijos, onClose, onSave }) => {
  const [estado, setEstado]                     = useState<EstadoCuotaAlimentaria>('provisoria');
  const [obligadoRol, setObligadoRol]           = useState<TitularRol>('contraparte');
  const [obligadoDetalle, setObligadoDetalle]   = useState('');
  const [alcance, setAlcance]                   = useState<AlcanceCuota>('todos_los_hijos');
  const [hijosCubiertos, setHijosCubiertos]     = useState<string[]>([]);
  const [montoEfectivo, setMontoEfectivo]       = useState('');
  const [moneda, setMoneda]                     = useState<Moneda>('ARS');
  const [frecuencia, setFrecuencia]             = useState<FrecuenciaCuotaAlim>('mensual');
  const [ajuste, setAjuste]                     = useState<AjusteCuota | ''>('');
  const [ajusteDesc, setAjusteDesc]             = useState('');
  const [fechaDesde, setFechaDesde]             = useState('');
  const [fechaHasta, setFechaHasta]             = useState('');
  const [fundamento, setFundamento]             = useState('');
  const [notas, setNotas]                       = useState('');
  const [saving, setSaving]                     = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setEstado(editing?.estado ?? 'provisoria');
    setObligadoRol(editing?.obligadoRol ?? 'contraparte');
    setObligadoDetalle(editing?.obligadoDetalle ?? '');
    setAlcance(editing?.alcance ?? 'todos_los_hijos');
    setHijosCubiertos(editing?.hijosCubiertos ?? []);
    setMontoEfectivo(editing?.montoEfectivo != null ? String(editing.montoEfectivo) : '');
    setMoneda(editing?.moneda ?? 'ARS');
    setFrecuencia(editing?.frecuencia ?? 'mensual');
    setAjuste(editing?.ajuste ?? '');
    setAjusteDesc(editing?.ajusteDesc ?? '');
    setFechaDesde(editing?.fechaVigenciaDesde ?? '');
    setFechaHasta(editing?.fechaVigenciaHasta ?? '');
    setFundamento(editing?.fundamento ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const toggleHijo = (id: string) => {
    setHijosCubiertos(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  };

  const puedeGuardar = !!estado
    && (alcance !== 'hijos_especificos' || hijosCubiertos.length >= 1);

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const monto = montoEfectivo.trim() ? Number(montoEfectivo.replace(',', '.')) : undefined;
      await onSave({
        estado,
        obligadoRol,
        obligadoDetalle:    obligadoDetalle.trim()  || undefined,
        alcance,
        hijosCubiertos:     alcance === 'hijos_especificos' ? hijosCubiertos : [],
        montoEfectivo:      Number.isFinite(monto) ? monto : undefined,
        moneda:             monto != null ? moneda : undefined,
        frecuencia,
        ajuste:             (ajuste || undefined) as AjusteCuota | undefined,
        ajusteDesc:         ajusteDesc.trim()       || undefined,
        fechaVigenciaDesde: fechaDesde              || undefined,
        fechaVigenciaHasta: fechaHasta              || undefined,
        fundamento:         fundamento.trim()       || undefined,
        notas:              notas.trim()            || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Editar cuota alimentaria' : 'Nueva cuota alimentaria'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear cuota')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Estado *</Label>
            <select value={estado} onChange={e => setEstado(e.target.value as EstadoCuotaAlimentaria)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="provisoria">{ESTADO_CUOTA_LABELS.provisoria}</option>
              <option value="definitiva">{ESTADO_CUOTA_LABELS.definitiva}</option>
              <option value="modificada">{ESTADO_CUOTA_LABELS.modificada}</option>
              <option value="extinguida">{ESTADO_CUOTA_LABELS.extinguida}</option>
            </select>
          </div>
          <div>
            <Label>Obligado *</Label>
            <select value={obligadoRol} onChange={e => setObligadoRol(e.target.value as TitularRol)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="cliente">{TITULAR_ROL_LABELS.cliente}</option>
              <option value="contraparte">{TITULAR_ROL_LABELS.contraparte}</option>
              <option value="ambos">{TITULAR_ROL_LABELS.ambos}</option>
              <option value="tercero">{TITULAR_ROL_LABELS.tercero}</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Detalle del obligado</Label>
          <Input value={obligadoDetalle} onChange={e => setObligadoDetalle(e.target.value)} placeholder='Ej: "Sebastián Ruiz"' />
        </div>

        <div>
          <Label>Alcance *</Label>
          <select value={alcance} onChange={e => setAlcance(e.target.value as AlcanceCuota)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
            <option value="todos_los_hijos">{ALCANCE_CUOTA_LABELS.todos_los_hijos}</option>
            <option value="hijos_especificos">{ALCANCE_CUOTA_LABELS.hijos_especificos}</option>
            <option value="conyuge">{ALCANCE_CUOTA_LABELS.conyuge}</option>
            <option value="pariente">{ALCANCE_CUOTA_LABELS.pariente}</option>
          </select>
        </div>

        {alcance === 'hijos_especificos' && hijos.length > 0 && (
          <div>
            <Label>Hijos cubiertos *</Label>
            <div className="space-y-1 mt-1">
              {hijos.map(h => (
                <label key={h.id} className="flex items-center gap-2 text-[12px] cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={hijosCubiertos.includes(h.id)}
                    onChange={() => toggleHijo(h.id)}
                  />
                  <span className="font-bold">{h.nombre}</span>
                  {h.fechaNacimiento && (
                    <span className="text-muted-foreground">— {format(parseISO(h.fechaNacimiento), 'd MMM yyyy', { locale: es })}</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Componente en efectivo</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Monto</Label>
              <Input
                type="text"
                value={montoEfectivo}
                onChange={e => setMontoEfectivo(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="2000000"
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <select value={moneda} onChange={e => setMoneda(e.target.value as Moneda)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frecuencia</Label>
              <select value={frecuencia} onChange={e => setFrecuencia(e.target.value as FrecuenciaCuotaAlim)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                {(Object.keys(FRECUENCIA_CUOTA_LABELS) as FrecuenciaCuotaAlim[]).map(f => (
                  <option key={f} value={f}>{FRECUENCIA_CUOTA_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Ajuste</Label>
              <select value={ajuste} onChange={e => setAjuste(e.target.value as AjusteCuota | '')} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
                <option value="">— Sin dato —</option>
                {(Object.keys(AJUSTE_CUOTA_LABELS) as AjusteCuota[]).map(a => (
                  <option key={a} value={a}>{AJUSTE_CUOTA_LABELS[a]}</option>
                ))}
              </select>
            </div>
          </div>
          {ajuste && ajuste !== 'sin_ajuste' && (
            <div>
              <Label>Detalle del ajuste</Label>
              <Input value={ajusteDesc} onChange={e => setAjusteDesc(e.target.value)} placeholder='Ej: "IPC publicado por INDEC, anual"' />
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vigencia y fundamento</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vigente desde</Label>
              <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <Label>Vigente hasta</Label>
              <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Fundamento documental</Label>
            <Input
              value={fundamento}
              onChange={e => setFundamento(e.target.value)}
              placeholder='Ej: "Resolución 05/06/2026, fs. 87" / "Sentencia 20/02/2027 fs. 142"'
            />
          </div>
        </section>

        <div>
          <Label>Notas internas</Label>
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-[11px] text-emerald-800 dark:text-emerald-200">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>
            Los pagos directos a prestadores (colegio, prepaga, terapias, AT) se cargan abajo en cada cuota como "conceptos en especie" — no en este monto en efectivo.
          </span>
        </div>
      </div>
    </Modal>
  );
};

// ─── Form de concepto en especie ───────────────────────────────

interface ConceptoFormProps {
  isOpen: boolean;
  editing: CuotaConceptoEspecie | null;
  cuotaId: string;
  hijos: HijoCaso[];
  onClose: () => void;
  onSave: (data: Partial<CuotaConceptoEspecie>) => Promise<void>;
}

const ConceptoForm: React.FC<ConceptoFormProps> = ({ isOpen, editing, cuotaId, hijos, onClose, onSave }) => {
  const [categoria, setCategoria]               = useState<CategoriaConceptoEspecie>('terapia');
  const [concepto, setConcepto]                 = useState('');
  const [prestador, setPrestador]               = useState('');
  const [montoEstimado, setMontoEstimado]       = useState('');
  const [moneda, setMoneda]                     = useState<Moneda>('ARS');
  const [frecuencia, setFrecuencia]             = useState<FrecuenciaCuotaAlim>('mensual');
  const [pagador, setPagador]                   = useState<PagadorConcepto>('obligado_directo');
  const [pagadorDetalle, setPagadorDetalle]     = useState('');
  const [hijoId, setHijoId]                     = useState('');
  const [notas, setNotas]                       = useState('');
  const [saving, setSaving]                     = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setCategoria(editing?.categoria ?? 'terapia');
    setConcepto(editing?.concepto ?? '');
    setPrestador(editing?.prestador ?? '');
    setMontoEstimado(editing?.montoEstimado != null ? String(editing.montoEstimado) : '');
    setMoneda(editing?.moneda ?? 'ARS');
    setFrecuencia(editing?.frecuencia ?? 'mensual');
    setPagador(editing?.pagador ?? 'obligado_directo');
    setPagadorDetalle(editing?.pagadorDetalle ?? '');
    setHijoId(editing?.hijoId ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = concepto.trim().length > 0 && cuotaId.length > 0;

  const buildPayload = () => {
    const monto = montoEstimado.trim() ? Number(montoEstimado.replace(',', '.')) : undefined;
    return {
      categoria,
      concepto:        concepto.trim(),
      prestador:       prestador.trim()       || undefined,
      montoEstimado:   Number.isFinite(monto) ? monto : undefined,
      moneda:          monto != null ? moneda : undefined,
      frecuencia,
      pagador,
      pagadorDetalle:  pagadorDetalle.trim()  || undefined,
      hijoId:          hijoId                 || undefined,
      notas:           notas.trim()           || undefined,
    };
  };

  // GAP UX-15: cargar varios conceptos en serie comparte categoría /
  // frecuencia / pagador (ej. tres terapias mensuales pagadas por el
  // obligado), pero el concepto, prestador, monto y hijo cambian.
  const resetParaSiguiente = () => {
    setConcepto('');
    setPrestador('');
    setMontoEstimado('');
    setHijoId('');
    setNotas('');
    // categoria, frecuencia, pagador, pagadorDetalle y moneda se conservan.
  };

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave(buildPayload());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave(buildPayload());
      resetParaSiguiente();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar concepto — ${editing.concepto}` : 'Nuevo concepto en especie'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          {!editing && (
            <Button
              variant="outline"
              onClick={handleSaveAndAddAnother}
              disabled={saving || !puedeGuardar}
              title="Guardar este concepto y dejar el formulario abierto para agregar otro (mantiene categoría, frecuencia y pagador)"
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Agregar concepto')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría *</Label>
            <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaConceptoEspecie)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {(Object.keys(CATEGORIA_CONCEPTO_LABELS) as CategoriaConceptoEspecie[]).map(c => (
                <option key={c} value={c}>{CATEGORIA_CONCEPTO_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Frecuencia</Label>
            <select value={frecuencia} onChange={e => setFrecuencia(e.target.value as FrecuenciaCuotaAlim)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {(Object.keys(FRECUENCIA_CUOTA_LABELS) as FrecuenciaCuotaAlim[]).map(f => (
                <option key={f} value={f}>{FRECUENCIA_CUOTA_LABELS[f]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label>Concepto *</Label>
          <Input
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            placeholder='Ej: "Colegio Northlands" / "OSDE 410" / "Terapia ocupacional"'
          />
        </div>

        <div>
          <Label>Prestador</Label>
          <Input value={prestador} onChange={e => setPrestador(e.target.value)} placeholder='Ej: "Lic. María Pérez"' />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Monto estimado</Label>
            <Input
              type="text"
              value={montoEstimado}
              onChange={e => setMontoEstimado(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="280000"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <select value={moneda} onChange={e => setMoneda(e.target.value as Moneda)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quién paga</Label>
            <select value={pagador} onChange={e => setPagador(e.target.value as PagadorConcepto)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {(Object.keys(PAGADOR_CONCEPTO_LABELS) as PagadorConcepto[]).map(p => (
                <option key={p} value={p}>{PAGADOR_CONCEPTO_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Detalle del reparto</Label>
            <Input value={pagadorDetalle} onChange={e => setPagadorDetalle(e.target.value)} placeholder='Ej: "70/30 obligado/beneficiario"' />
          </div>
        </div>

        {hijos.length > 0 && (
          <div>
            <Label>Aplica a un hijo específico</Label>
            <select value={hijoId} onChange={e => setHijoId(e.target.value)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="">— Aplica a todos los hijos cubiertos —</option>
              {hijos.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Marcalo cuando el concepto sea por un hijo en particular (terapias por discapacidad, extracurricular específico, etc.).
            </p>
          </div>
        )}

        <div>
          <Label>Notas</Label>
          <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
        </div>
      </div>
    </Modal>
  );
};
