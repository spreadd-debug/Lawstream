import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  HijoCaso,
  EstadoCud,
  AcompananteTerapeutico,
  CuotaAlimentaria,
  CuotaConceptoEspecie,
  CategoriaConceptoEspecie,
  FrecuenciaCuotaAlim,
  PagadorConcepto,
  Moneda,
  ESTADO_CUD_LABELS,
  ACOMPANANTE_LABELS,
  CATEGORIA_CONCEPTO_LABELS,
  FRECUENCIA_CUOTA_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { addYears } from 'date-fns';
import {
  Plus, Pencil, Trash2, Baby, AlertCircle, Calendar, GraduationCap,
  Heart, Scale, Sparkles, Wallet,
} from 'lucide-react';
import { edadEnAnios } from '../lib/hijosTransicion';

// GAP UX-29 (revisión): los gastos del hijo viven en la card del hijo,
// no en un panel separado. Internamente seguimos persistiendo como
// `cuota_concepto_especie` colgando de una `cuota_alimentaria` en estado
// 'borrador' (la "canasta" del matter), pero el usuario nunca ve la
// canasta — sólo carga "gastos del hijo X". Cuando llega el momento del
// pedido formal, en CuotasAlimentariasPanel se convierte la canasta a
// cuota provisoria preservando todos los conceptos.

interface GastosHijoDesglose {
  conceptosPropios:   CuotaConceptoEspecie[];   // hijoId === h.id
  mensualARS:         number;
  mensualUSD:         number;
  otraFrecuencia:     number;
  hayBorrador:        boolean;
  hayCuotaReal:       boolean;
}

function gastosDelHijo(
  hijoId: string,
  cuotasDelMatter: CuotaAlimentaria[],
  conceptos: CuotaConceptoEspecie[],
): GastosHijoDesglose {
  const cuotaIds = new Set(cuotasDelMatter.map(c => c.id));
  const propios = conceptos.filter(ce => ce.hijoId === hijoId && cuotaIds.has(ce.cuotaAlimentariaId));
  let mensualARS = 0;
  let mensualUSD = 0;
  let otros = 0;
  let hayBorrador = false;
  let hayCuotaReal = false;
  for (const ce of propios) {
    const cuota = cuotasDelMatter.find(c => c.id === ce.cuotaAlimentariaId);
    if (cuota?.estado === 'borrador') hayBorrador = true;
    else if (cuota) hayCuotaReal = true;
    if (ce.frecuencia === 'mensual' && ce.montoEstimado != null) {
      if (ce.moneda === 'USD') mensualUSD += ce.montoEstimado;
      else                     mensualARS += ce.montoEstimado;
    } else {
      otros++;
    }
  }
  return {
    conceptosPropios: propios,
    mensualARS,
    mensualUSD,
    otraFrecuencia:  otros,
    hayBorrador,
    hayCuotaReal,
  };
}

const formatMonto = (n: number, simbolo: string): string =>
  `${simbolo} ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// Categorías comunes para el form rápido de gasto del hijo. El enum
// completo (CATEGORIA_CONCEPTO_LABELS) sigue disponible — esto es solo
// el orden que mostramos por defecto.
const CATEGORIAS_GASTO_HIJO: CategoriaConceptoEspecie[] = [
  'colegio', 'extracurricular', 'prepaga', 'terapia', 'acompanante_terapeutico',
  'transporte', 'gastos_medicos', 'medicamentos', 'vestimenta', 'otro',
];

interface HijosPanelProps {
  matterId: string;
}

// Misma lista de opciones que usa el template global de régimen para
// mantener consistencia entre la propuesta unificada y el override por hijo.
const REGIMEN_CUIDADO_OPTS = [
  'Compartido con residencia principal en uno',
  'Compartido alternado',
  'Compartido indistinto',
  'Unipersonal a favor del cliente',
  'Unipersonal a favor del otro',
  'Por determinar',
];

const RESIDENCIA_OPTS = [
  'Domicilio del cónyuge 1 (cliente)',
  'Domicilio del cónyuge 2',
  'Alternado',
  'Por determinar',
];

const tieneRegimenPropio = (h: HijoCaso): boolean =>
  !!(h.regimenCuidado || h.residenciaPrincipal || h.regimenComunicacion || h.motivoRegimenDistinto);

export const HijosPanel: React.FC<HijosPanelProps> = ({ matterId }) => {
  const {
    hijos, matters, cuotasAlimentarias, cuotaConceptosEspecie,
    handleCreateHijoCaso, handleUpdateHijoCaso, handleDeleteHijoCaso,
    handleCreateCuotaAlimentaria,
    handleCreateCuotaConceptoEspecie, handleUpdateCuotaConceptoEspecie, handleDeleteCuotaConceptoEspecie,
  } = useAppContext();

  // Si este matter es sub-proceso (incidente / apelación), los hijos viven
  // en el expediente raíz (el matter principal del divorcio). El panel lee
  // de ambos y al crear un hijo nuevo lo asocia al matter raíz, no al
  // sub-proceso — así un incidente de aumento de cuota no duplica datos.
  const matter = matters.find(m => m.id === matterId);
  const parentMatterId = matter?.parentMatterId;
  const rootMatterId = parentMatterId ?? matterId;
  const rootMatter = matters.find(m => m.id === rootMatterId);
  const esSubProceso = !!parentMatterId;

  // GAP UX-16: extraemos el régimen general del caso (vive en caseData del
  // matter raíz, cargado desde la ficha de Instrucción) para mostrarlo como
  // referencia al editar el régimen propio de un hijo. Sin esto el usuario
  // tenía que recordar o ir al tab Flujo a buscarlo.
  const regimenGeneral = useMemo(() => {
    const cd = rootMatter?.caseData ?? {};
    const tipoCuidado         = cd.tipo_cuidado?.trim();
    const residenciaPrincipal = cd.residencia_principal?.trim();
    const regimenComunicacion = cd.regimen_comunicacion?.trim();
    const regimenVacaciones   = cd.regimen_vacaciones?.trim();
    if (!tipoCuidado && !residenciaPrincipal && !regimenComunicacion && !regimenVacaciones) {
      return null;
    }
    return { tipoCuidado, residenciaPrincipal, regimenComunicacion, regimenVacaciones };
  }, [rootMatter]);

  const hijosDelMatter = useMemo(() => {
    const ids = parentMatterId ? new Set([matterId, parentMatterId]) : new Set([matterId]);
    return hijos.filter(h => ids.has(h.matterId)).sort((a, b) => a.orden - b.orden);
  }, [hijos, matterId, parentMatterId]);

  // GAP UX-29: las cuotas (incluidas las canastas borrador) viven en el
  // matter raíz cuando este es sub-proceso. Los gastos por hijo se
  // calculan sobre todas las cuotas del matter raíz.
  const cuotasDelMatterRaiz = useMemo(
    () => cuotasAlimentarias.filter(c => c.matterId === rootMatterId),
    [cuotasAlimentarias, rootMatterId],
  );
  const gastosPorHijoId = useMemo(() => {
    const map = new Map<string, GastosHijoDesglose>();
    for (const h of hijosDelMatter) {
      map.set(h.id, gastosDelHijo(h.id, cuotasDelMatterRaiz, cuotaConceptosEspecie));
    }
    return map;
  }, [hijosDelMatter, cuotasDelMatterRaiz, cuotaConceptosEspecie]);

  // Helper que devuelve la canasta borrador del matter raíz, creándola
  // si no existe. Toda la persistencia de "gastos del hijo" es contra
  // un único borrador por matter — el usuario no lo ve, lo manipula
  // implícitamente al cargar gastos en HijoCard.
  //
  // Nota: NO mandamos hijosCubiertos en el insert. La columna tiene
  // DEFAULT ARRAY[]::UUID[] en SQL — pasarle el array vacío desde JS
  // a veces rompe la serialización de Supabase (UUID[] vs string[]).
  // Mejor dejar que la DB ponga el default. El cast a Omit<...> lo
  // permite porque cuotaAlimentariaToRow ignora las keys undefined.
  const getOrCreateCanastaBorrador = async (): Promise<string> => {
    const existente = cuotasDelMatterRaiz.find(c => c.estado === 'borrador');
    if (existente) return existente.id;
    const creada = await handleCreateCuotaAlimentaria({
      matterId:        rootMatterId,
      estado:          'borrador',
      obligadoRol:     'contraparte',
      alcance:         'todos_los_hijos',
      frecuencia:      'mensual',
    } as Omit<CuotaAlimentaria, 'id' | 'createdAt' | 'updatedAt'>);
    return creada.id;
  };

  // Form modal de gasto — se abre desde cualquier HijoCard.
  const [gastoFormHijoId, setGastoFormHijoId]       = useState<string | null>(null);
  const [gastoEditing, setGastoEditing]             = useState<CuotaConceptoEspecie | null>(null);

  const openNuevoGasto = (hijoId: string) => {
    setGastoEditing(null);
    setGastoFormHijoId(hijoId);
  };
  const openEditarGasto = (gasto: CuotaConceptoEspecie) => {
    setGastoEditing(gasto);
    setGastoFormHijoId(gasto.hijoId ?? null);
  };
  const closeGastoForm = () => {
    setGastoFormHijoId(null);
    setGastoEditing(null);
  };

  const onDeleteGasto = async (gasto: CuotaConceptoEspecie) => {
    if (!window.confirm(`Eliminar el gasto "${gasto.concepto}"?`)) return;
    await handleDeleteCuotaConceptoEspecie(gasto.id);
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<HijoCaso | null>(null);

  const openNew = () => { setEditing(null); setIsFormOpen(true); };
  const openEdit = (h: HijoCaso) => { setEditing(h); setIsFormOpen(true); };

  const onDelete = async (h: HijoCaso) => {
    if (!window.confirm(`Eliminar a ${h.nombre} del caso? Esta acción no afecta otros datos del matter.`)) return;
    await handleDeleteHijoCaso(h.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <Baby size={16} className="text-sky-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Hijos</h3>
            <p className="text-[11px] text-muted-foreground">
              Datos individuales, salud y régimen propio. Las alertas de cumple 18 se calculan automáticamente.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={14} />
          Nuevo hijo
        </Button>
      </div>

      {esSubProceso && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-2.5 text-[11px] text-violet-800 dark:text-violet-200 flex items-start gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <span>
            Los hijos pertenecen al expediente principal — los cambios que hagas acá se ven también desde el caso padre y desde otros sub-procesos.
          </span>
        </div>
      )}

      {hijosDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Baby size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            No hay hijos cargados en este caso. Cargá los datos de cada hijo/a — incluyendo discapacidad, terapias y régimen propio cuando corresponda.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {hijosDelMatter.map(h => (
          <HijoCard
            key={h.id}
            hijo={h}
            gastos={gastosPorHijoId.get(h.id)}
            onEdit={() => openEdit(h)}
            onDelete={() => onDelete(h)}
            onAgregarGasto={() => openNuevoGasto(h.id)}
            onEditarGasto={openEditarGasto}
            onEliminarGasto={onDeleteGasto}
          />
        ))}
      </div>

      <HijoForm
        isOpen={isFormOpen}
        editing={editing}
        nextOrden={hijosDelMatter.length}
        regimenGeneral={regimenGeneral}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          if (editing) {
            await handleUpdateHijoCaso(editing.id, data);
          } else {
            await handleCreateHijoCaso({ ...data, matterId: rootMatterId } as Omit<HijoCaso, 'id' | 'createdAt' | 'updatedAt'>);
          }
        }}
      />

      {/* GAP UX-29 (revisión B): form de gasto que se abre desde cualquier
          HijoCard. La canasta borrador se crea on-demand al guardar. */}
      <GastoForm
        isOpen={gastoFormHijoId !== null}
        hijoId={gastoFormHijoId}
        editing={gastoEditing}
        nombreHijo={hijosDelMatter.find(h => h.id === gastoFormHijoId)?.nombre}
        onClose={closeGastoForm}
        onSave={async (data) => {
          if (gastoEditing) {
            await handleUpdateCuotaConceptoEspecie(gastoEditing.id, data);
          } else if (gastoFormHijoId) {
            const cuotaId = await getOrCreateCanastaBorrador();
            await handleCreateCuotaConceptoEspecie({
              ...data,
              cuotaAlimentariaId: cuotaId,
              hijoId:             gastoFormHijoId,
            } as Omit<CuotaConceptoEspecie, 'id' | 'createdAt' | 'updatedAt'>);
          }
          closeGastoForm();
        }}
      />
    </div>
  );
};

// ─── Card individual de un hijo ─────────────────────────────────

const HijoCard: React.FC<{
  hijo: HijoCaso;
  /** GAP UX-29 (revisión B): gastos del hijo, persisten internamente como
   *  conceptos en especie de la canasta borrador del matter. Pasados por
   *  el panel padre. */
  gastos?: GastosHijoDesglose;
  onEdit: () => void;
  onDelete: () => void;
  onAgregarGasto: () => void;
  onEditarGasto: (g: CuotaConceptoEspecie) => void;
  onEliminarGasto: (g: CuotaConceptoEspecie) => Promise<void>;
}> = ({ hijo: h, gastos, onEdit, onDelete, onAgregarGasto, onEditarGasto, onEliminarGasto }) => {
  const edad = edadEnAnios(h.fechaNacimiento);
  const fechaCumple18 = (() => {
    try { return addYears(parseISO(h.fechaNacimiento), 18); } catch { return null; }
  })();
  const diasACumplir18 = fechaCumple18
    ? differenceInCalendarDays(fechaCumple18, new Date())
    : null;

  // GAP UX-18: si la transición ya fue gestionada, suprimimos los chips
  // de "cumple 18" — el régimen ya está adaptado.
  const cumple18Pronto = !h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 >= 0 && diasACumplir18 <= 90;
  const recienCumplio18 = !h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 < 0 && diasACumplir18 >= -30;
  const transicionGestionadaRelevante = !!h.transicion18Gestionada
    && diasACumplir18 !== null && diasACumplir18 >= -365 && diasACumplir18 <= 90;
  const conRegimenPropio = tieneRegimenPropio(h);
  const tieneSaludEspecial = !!(h.tieneCud === 'si' || h.tieneCud === 'en_tramite' || h.diagnostico || h.terapiasDesc);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-sky-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{h.nombre}</span>
            {edad !== null && (
              <Badge variant="outline" className="text-[9px]">
                {edad} {edad === 1 ? 'año' : 'años'}
              </Badge>
            )}
            {h.dni && (
              <span className="text-[10px] text-muted-foreground font-mono">DNI {h.dni}</span>
            )}
            {tieneSaludEspecial && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-500/10 border-rose-500/30">
                <Heart size={11} />
                {h.tieneCud === 'si' ? 'CUD' : h.tieneCud === 'en_tramite' ? 'CUD en trámite' : 'Salud especial'}
              </span>
            )}
            {conRegimenPropio && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-500/10 border-violet-500/30">
                <Scale size={11} />
                Régimen propio
              </span>
            )}
            {cumple18Pronto && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 border-amber-500/30">
                <Sparkles size={11} />
                Cumple 18 en {diasACumplir18} {diasACumplir18 === 1 ? 'día' : 'días'}
              </span>
            )}
            {recienCumplio18 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-500/15 border-amber-500/40">
                <Sparkles size={11} />
                Recién cumplió 18
              </span>
            )}
            {transicionGestionadaRelevante && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
                title="La transición a mayoría de edad fue marcada como gestionada — el banner R3 no aparece para este hijo."
              >
                <Heart size={11} />
                Transición 18 OK
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar size={11} />
              {format(parseISO(h.fechaNacimiento), "d 'de' MMMM yyyy", { locale: es })}
            </span>
            {h.escolaridad && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap size={11} />
                {h.escolaridad}{h.establecimiento ? ` · ${h.establecimiento}` : ''}
              </span>
            )}
          </div>

          {h.diagnostico && (
            <div className="text-[11px] text-foreground/90 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
              <span className="font-bold text-rose-700">Diagnóstico:</span> {h.diagnostico}
              {h.acompananteTerapeutico && h.acompananteTerapeutico !== 'no' && (
                <span className="text-muted-foreground"> · AT {ACOMPANANTE_LABELS[h.acompananteTerapeutico].toLowerCase()}</span>
              )}
            </div>
          )}
          {h.terapiasDesc && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-3">
              <span className="not-italic font-bold text-foreground/70">Terapias:</span> {h.terapiasDesc}
            </p>
          )}
          {h.coberturaEspecial && (
            <p className="text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground/70">Cobertura:</span> {h.coberturaEspecial}
            </p>
          )}

          {conRegimenPropio && (
            <div className="text-[11px] text-foreground/90 bg-violet-500/5 border border-violet-500/20 rounded-lg px-3 py-2 space-y-0.5">
              {h.regimenCuidado && (
                <div><span className="font-bold text-violet-700">Cuidado:</span> {h.regimenCuidado}</div>
              )}
              {h.residenciaPrincipal && (
                <div><span className="font-bold text-violet-700">Residencia:</span> {h.residenciaPrincipal}</div>
              )}
              {h.regimenComunicacion && (
                <div className="text-muted-foreground line-clamp-2">
                  <span className="font-bold text-violet-700 not-italic">Comunicación:</span> {h.regimenComunicacion}
                </div>
              )}
              {h.motivoRegimenDistinto && (
                <div className="text-muted-foreground italic line-clamp-2">
                  <AlertCircle size={11} className="inline -mt-0.5 mr-1" />
                  {h.motivoRegimenDistinto}
                </div>
              )}
            </div>
          )}

          {/* GAP UX-29 (revisión B): sección editable de gastos del hijo.
              Reemplaza al resumen pasivo anterior — los gastos se cargan
              directo desde acá, sin tener que entender el panel de cuotas
              ni el modelo de canasta/borrador. La canasta se crea sola
              por debajo cuando se guarda el primer gasto del matter. */}
          <GastosDeHijo
            gastos={gastos}
            onAgregar={onAgregarGasto}
            onEditar={onEditarGasto}
            onEliminar={onEliminarGasto}
          />

          {h.notas && (
            <p className="text-[11px] text-muted-foreground italic">{h.notas}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
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
        </div>
      </div>
    </div>
  );
};

// ─── Form modal ─────────────────────────────────────────────────

interface RegimenGeneral {
  tipoCuidado?: string;
  residenciaPrincipal?: string;
  regimenComunicacion?: string;
  regimenVacaciones?: string;
}

interface HijoFormProps {
  isOpen: boolean;
  editing: HijoCaso | null;
  nextOrden: number;
  regimenGeneral: RegimenGeneral | null;
  onClose: () => void;
  onSave: (data: Partial<HijoCaso>) => Promise<void>;
}

const HijoForm: React.FC<HijoFormProps> = ({ isOpen, editing, nextOrden, regimenGeneral, onClose, onSave }) => {
  const [nombre, setNombre]                       = useState('');
  const [dni, setDni]                             = useState('');
  const [fechaNacimiento, setFechaNacimiento]     = useState('');
  const [escolaridad, setEscolaridad]             = useState('');
  const [establecimiento, setEstablecimiento]     = useState('');
  const [tieneCud, setTieneCud]                   = useState<EstadoCud | ''>('');
  const [diagnostico, setDiagnostico]             = useState('');
  const [terapiasDesc, setTerapiasDesc]           = useState('');
  const [acompanante, setAcompanante]             = useState<AcompananteTerapeutico | ''>('');
  const [coberturaEspecial, setCoberturaEspecial] = useState('');
  const [regimenCuidado, setRegimenCuidado]       = useState('');
  const [residenciaPrincipal, setResidenciaPrincipal] = useState('');
  const [regimenComunicacion, setRegimenComunicacion] = useState('');
  const [motivoRegimenDistinto, setMotivoRegimenDistinto] = useState('');
  const [transicion18Gestionada, setTransicion18Gestionada] = useState(false);
  const [notas, setNotas]                         = useState('');
  const [saving, setSaving]                       = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setNombre(editing?.nombre ?? '');
    setDni(editing?.dni ?? '');
    setFechaNacimiento(editing?.fechaNacimiento ?? '');
    setEscolaridad(editing?.escolaridad ?? '');
    setEstablecimiento(editing?.establecimiento ?? '');
    setTieneCud(editing?.tieneCud ?? '');
    setDiagnostico(editing?.diagnostico ?? '');
    setTerapiasDesc(editing?.terapiasDesc ?? '');
    setAcompanante(editing?.acompananteTerapeutico ?? '');
    setCoberturaEspecial(editing?.coberturaEspecial ?? '');
    setRegimenCuidado(editing?.regimenCuidado ?? '');
    setResidenciaPrincipal(editing?.residenciaPrincipal ?? '');
    setRegimenComunicacion(editing?.regimenComunicacion ?? '');
    setMotivoRegimenDistinto(editing?.motivoRegimenDistinto ?? '');
    setTransicion18Gestionada(editing?.transicion18Gestionada ?? false);
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = nombre.trim().length > 0 && fechaNacimiento.trim().length > 0;

  const buildPayload = () => ({
    nombre:                 nombre.trim(),
    dni:                    dni.trim()             || undefined,
    fechaNacimiento:        fechaNacimiento,
    escolaridad:            escolaridad.trim()     || undefined,
    establecimiento:        establecimiento.trim() || undefined,
    tieneCud:               (tieneCud || undefined) as EstadoCud | undefined,
    diagnostico:            diagnostico.trim()     || undefined,
    terapiasDesc:           terapiasDesc.trim()    || undefined,
    acompananteTerapeutico: (acompanante || undefined) as AcompananteTerapeutico | undefined,
    coberturaEspecial:      coberturaEspecial.trim()      || undefined,
    regimenCuidado:         regimenCuidado          || undefined,
    residenciaPrincipal:    residenciaPrincipal     || undefined,
    regimenComunicacion:    regimenComunicacion.trim() || undefined,
    motivoRegimenDistinto:  motivoRegimenDistinto.trim() || undefined,
    transicion18Gestionada: transicion18Gestionada,
    notas:                  notas.trim()           || undefined,
    ...(editing ? {} : { orden: nextOrden }),
  });

  // GAP UX-15: limpia campos individuales del hijo (los que cambian persona
  // a persona) y conserva los del establecimiento — cargar 3 hermanos
  // típicamente comparte colegio/escolaridad pero no nombre, DNI, salud ni
  // régimen propio.
  const resetParaSiguiente = () => {
    setNombre('');
    setDni('');
    setFechaNacimiento('');
    setTieneCud('');
    setDiagnostico('');
    setTerapiasDesc('');
    setAcompanante('');
    setCoberturaEspecial('');
    setRegimenCuidado('');
    setResidenciaPrincipal('');
    setRegimenComunicacion('');
    setMotivoRegimenDistinto('');
    setTransicion18Gestionada(false);
    setNotas('');
    // escolaridad y establecimiento se conservan a propósito.
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
      title={editing ? `Editar ${editing.nombre}` : 'Nuevo hijo'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          {!editing && (
            <Button
              variant="outline"
              onClick={handleSaveAndAddAnother}
              disabled={saving || !puedeGuardar}
              title="Guardar este hijo y dejar el formulario abierto para cargar otro (mantiene escolaridad y establecimiento)"
            >
              Guardar y agregar otro
            </Button>
          )}
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear hijo')}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── Datos básicos ── */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Datos básicos</h4>
          <div>
            <Label>Nombre completo *</Label>
            <Input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Apellido, Nombre"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>DNI</Label>
              <Input value={dni} onChange={e => setDni(e.target.value)} placeholder="12.345.678" />
            </div>
            <div>
              <Label>Fecha de nacimiento *</Label>
              <Input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Escolaridad</Label>
              <Input value={escolaridad} onChange={e => setEscolaridad(e.target.value)} placeholder="Ej: 5° grado" />
            </div>
            <div>
              <Label>Establecimiento</Label>
              <Input value={establecimiento} onChange={e => setEstablecimiento(e.target.value)} placeholder="Nombre del colegio" />
            </div>
          </div>
        </section>

        {/* ── Salud y terapias (R1) ── */}
        <section className="space-y-3 border-t border-border/40 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-700">Salud y terapias</h4>
              <p className="text-[11px] text-muted-foreground">Solo cuando aplique. Estos datos sostienen pedidos de régimen especial, atribución de vivienda y cuota diferenciada.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>¿Tiene CUD?</Label>
              <select
                value={tieneCud}
                onChange={e => setTieneCud(e.target.value as EstadoCud | '')}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="">No aplica / sin dato</option>
                <option value="si">{ESTADO_CUD_LABELS.si}</option>
                <option value="no">{ESTADO_CUD_LABELS.no}</option>
                <option value="en_tramite">{ESTADO_CUD_LABELS.en_tramite}</option>
              </select>
            </div>
            <div>
              <Label>Acompañante terapéutico</Label>
              <select
                value={acompanante}
                onChange={e => setAcompanante(e.target.value as AcompananteTerapeutico | '')}
                className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
              >
                <option value="">No aplica / sin dato</option>
                <option value="escolar">{ACOMPANANTE_LABELS.escolar}</option>
                <option value="domiciliario">{ACOMPANANTE_LABELS.domiciliario}</option>
                <option value="no">{ACOMPANANTE_LABELS.no}</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Diagnóstico</Label>
            <Input value={diagnostico} onChange={e => setDiagnostico(e.target.value)} placeholder='Ej: "TEA nivel 1", "Síndrome de Down", etc.' />
          </div>
          <div>
            <Label>Terapias (prestador, frecuencia, costo)</Label>
            <Textarea
              value={terapiasDesc}
              onChange={e => setTerapiasDesc(e.target.value)}
              placeholder="Ej: TO con Lic. Pérez 2x/sem $280.000/mes; Fonoaudiología con Lic. Gómez 1x/sem $150.000/mes; AT escolar 4hs/día $250.000/mes."
              className="min-h-[80px]"
            />
          </div>
          <div>
            <Label>Cobertura especial</Label>
            <Input
              value={coberturaEspecial}
              onChange={e => setCoberturaEspecial(e.target.value)}
              placeholder="Ej: Ley 24.901, OSDE 410, IOMA con régimen especial"
            />
          </div>
        </section>

        {/* ── Régimen propio (R2) ── */}
        <section className="space-y-3 border-t border-border/40 pt-5">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700">Régimen propio del hijo</h4>
            <p className="text-[11px] text-muted-foreground">Opcional. Solo cargar si este hijo tiene un régimen distinto al unificado del caso (ej. recomendación del equipo terapéutico, edad, opinión del menor).</p>
          </div>

          {/* GAP UX-16: mini-resumen del régimen general del caso, como
              referencia para decidir qué overridear. Lee de caseData del
              matter raíz (cargado desde la ficha de Instrucción). */}
          {regimenGeneral && (
            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-[11px] space-y-0.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Régimen general del caso (referencia)
              </div>
              {regimenGeneral.tipoCuidado && (
                <div><span className="font-bold text-foreground/80">Cuidado:</span> <span className="text-foreground/90">{regimenGeneral.tipoCuidado}</span></div>
              )}
              {regimenGeneral.residenciaPrincipal && (
                <div><span className="font-bold text-foreground/80">Residencia:</span> <span className="text-foreground/90">{regimenGeneral.residenciaPrincipal}</span></div>
              )}
              {regimenGeneral.regimenComunicacion && (
                <div className="line-clamp-2"><span className="font-bold text-foreground/80">Comunicación:</span> <span className="text-foreground/90">{regimenGeneral.regimenComunicacion}</span></div>
              )}
              {regimenGeneral.regimenVacaciones && (
                <div className="line-clamp-2"><span className="font-bold text-foreground/80">Vacaciones:</span> <span className="text-foreground/90">{regimenGeneral.regimenVacaciones}</span></div>
              )}
              <p className="text-[10px] text-muted-foreground italic mt-1">
                Dejá los campos en blanco para que este hijo siga el régimen general. Cargá solo lo que difiere.
              </p>
            </div>
          )}
          <div>
            <Label>Cuidado personal (override)</Label>
            <select
              value={regimenCuidado}
              onChange={e => setRegimenCuidado(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">Usar régimen general</option>
              {REGIMEN_CUIDADO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <Label>Residencia principal (override)</Label>
            <select
              value={residenciaPrincipal}
              onChange={e => setResidenciaPrincipal(e.target.value)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="">Usar régimen general</option>
              {RESIDENCIA_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <Label>Régimen de comunicación (override)</Label>
            <Textarea
              value={regimenComunicacion}
              onChange={e => setRegimenComunicacion(e.target.value)}
              placeholder="Ej: Régimen progresivo: dos meses con visitas diurnas de 4hs los sábados, luego pernoctes alternos."
              className="min-h-[60px]"
            />
          </div>
          <div>
            <Label>Motivo del régimen distinto</Label>
            <Textarea
              value={motivoRegimenDistinto}
              onChange={e => setMotivoRegimenDistinto(e.target.value)}
              placeholder="Ej: Recomendación del equipo terapéutico (TEA, cambio gradual de rutinas)."
              className="min-h-[60px]"
            />
          </div>
        </section>

        {/* ── Transición a mayoría de edad gestionada (GAP UX-18) ── */}
        <section className="border-t border-border/40 pt-5">
          <label className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
            <input
              type="checkbox"
              checked={transicion18Gestionada}
              onChange={e => setTransicion18Gestionada(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <div className="text-[11px] text-amber-800 dark:text-amber-200 space-y-0.5">
              <span className="font-bold">Transición a mayoría de edad gestionada</span>
              <p className="text-amber-700/80 dark:text-amber-300/80">
                Marcá cuando ya adaptaste el régimen para este hijo (deshabilitar cuidado, dejar solo alimentos art. 663 CCyCN). Mientras esté marcado, el banner de "cumple 18" no aparece para este hijo aunque la fecha lo justifique.
              </p>
            </div>
          </label>
        </section>

        {/* ── Notas ── */}
        <section className="border-t border-border/40 pt-5">
          <Label>Notas internas</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Cualquier información adicional relevante."
            className="min-h-[60px]"
          />
        </section>
      </div>
    </Modal>
  );
};

// ─── Gastos del hijo (GAP UX-29 revisión B) ────────────────────
//
// Sub-bloque editable dentro de cada HijoCard. Lista los gastos
// específicos del hijo (concepto + monto + frecuencia) y expone CTAs
// para agregar / editar / eliminar.

const GastosDeHijo: React.FC<{
  gastos?: GastosHijoDesglose;
  onAgregar: () => void;
  onEditar:  (g: CuotaConceptoEspecie) => void;
  onEliminar: (g: CuotaConceptoEspecie) => Promise<void>;
}> = ({ gastos, onAgregar, onEditar, onEliminar }) => {
  const conceptos = gastos?.conceptosPropios ?? [];

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Wallet size={12} className="text-emerald-700" />
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
            Gastos del hijo
          </span>
          {gastos && gastos.mensualARS > 0 && (
            <span className="text-[11px] font-bold text-foreground">
              {formatMonto(gastos.mensualARS, '$')}/mes
            </span>
          )}
          {gastos && gastos.mensualUSD > 0 && (
            <span className="text-[11px] font-bold text-foreground">
              {formatMonto(gastos.mensualUSD, 'US$')}/mes
            </span>
          )}
          {gastos && gastos.otraFrecuencia > 0 && (
            <span className="text-[10px] text-muted-foreground italic">
              + {gastos.otraFrecuencia} con frecuencia/monto distinto
            </span>
          )}
        </div>
        <button
          onClick={onAgregar}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
        >
          <Plus size={11} /> Agregar gasto
        </button>
      </div>

      {conceptos.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">
          Sin gastos cargados — agregá colegio, actividades, prepaga, terapias. Sirven después para fundar el pedido de cuota.
        </p>
      )}

      {conceptos.length > 0 && (
        <ul className="space-y-1">
          {conceptos.map(g => (
            <li key={g.id} className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-background/50 border border-border/40">
              <Sparkles size={11} className="shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold text-foreground">{g.concepto}</span>
                  <Badge variant="outline" className="text-[8px]">{CATEGORIA_CONCEPTO_LABELS[g.categoria]}</Badge>
                  {g.montoEstimado != null && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      {formatMonto(g.montoEstimado, g.moneda === 'USD' ? 'US$' : g.moneda === 'EUR' ? '€' : '$')}
                      {' / '}
                      {FRECUENCIA_CUOTA_LABELS[g.frecuencia].toLowerCase()}
                    </span>
                  )}
                </div>
                {g.prestador && (
                  <p className="text-[10px] text-muted-foreground">{g.prestador}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onEditar(g)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar gasto">
                  <Pencil size={11} />
                </button>
                <button onClick={() => onEliminar(g)} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors" title="Eliminar gasto">
                  <Trash2 size={11} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Form modal de gasto ───────────────────────────────────────
//
// Form rápido para cargar un gasto del hijo. Defaults razonables: ARS
// como moneda, mensual como frecuencia, "obligado paga directo" como
// pagador. El usuario puede ajustar después desde el panel de cuotas
// si necesita más control (ej. reembolso, compartido, AT específico).

interface GastoFormProps {
  isOpen: boolean;
  hijoId: string | null;
  nombreHijo?: string;
  editing: CuotaConceptoEspecie | null;
  onClose: () => void;
  onSave: (data: Partial<CuotaConceptoEspecie>) => Promise<void>;
}

const GastoForm: React.FC<GastoFormProps> = ({ isOpen, hijoId, nombreHijo, editing, onClose, onSave }) => {
  const [categoria, setCategoria]       = useState<CategoriaConceptoEspecie>('colegio');
  const [concepto, setConcepto]         = useState('');
  const [prestador, setPrestador]       = useState('');
  const [monto, setMonto]               = useState('');
  const [moneda, setMoneda]             = useState<Moneda>('ARS');
  const [frecuencia, setFrecuencia]     = useState<FrecuenciaCuotaAlim>('mensual');
  const [pagador, setPagador]           = useState<PagadorConcepto>('obligado_directo');
  const [pagadorDetalle, setPagadorDetalle] = useState('');
  const [notas, setNotas]               = useState('');
  const [saving, setSaving]             = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setCategoria(editing?.categoria         ?? 'colegio');
    setConcepto(editing?.concepto           ?? '');
    setPrestador(editing?.prestador         ?? '');
    setMonto(editing?.montoEstimado != null ? String(editing.montoEstimado) : '');
    setMoneda(editing?.moneda               ?? 'ARS');
    setFrecuencia(editing?.frecuencia       ?? 'mensual');
    setPagador(editing?.pagador             ?? 'obligado_directo');
    setPagadorDetalle(editing?.pagadorDetalle ?? '');
    setNotas(editing?.notas                 ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = concepto.trim().length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const montoNum = monto.trim() ? Number(monto.replace(',', '.')) : undefined;
      await onSave({
        categoria,
        concepto:        concepto.trim(),
        prestador:       prestador.trim()       || undefined,
        montoEstimado:   Number.isFinite(montoNum) ? montoNum : undefined,
        moneda:          montoNum != null ? moneda : undefined,
        frecuencia,
        pagador,
        pagadorDetalle:  pagadorDetalle.trim() || undefined,
        notas:           notas.trim()          || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing
        ? `Editar gasto${nombreHijo ? ' de ' + nombreHijo : ''}`
        : `Nuevo gasto${nombreHijo ? ' de ' + nombreHijo : ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Agregar gasto')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoría *</Label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaConceptoEspecie)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {CATEGORIAS_GASTO_HIJO.map(cat => (
                <option key={cat} value={cat}>{CATEGORIA_CONCEPTO_LABELS[cat]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Frecuencia</Label>
            <select
              value={frecuencia}
              onChange={e => setFrecuencia(e.target.value as FrecuenciaCuotaAlim)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
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
            placeholder='Ej: "Colegio Parroquial San José" / "Fútbol Club Atlanta" / "TO Lic. Pérez 2x/sem"'
          />
        </div>

        <div>
          <Label>Prestador</Label>
          <Input
            value={prestador}
            onChange={e => setPrestador(e.target.value)}
            placeholder='Opcional — quién brinda el servicio'
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Monto estimado</Label>
            <Input
              type="text"
              value={monto}
              onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="280000"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value as Moneda)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quién paga</Label>
            <select
              value={pagador}
              onChange={e => setPagador(e.target.value as PagadorConcepto)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              <option value="obligado_directo">Obligado paga directo</option>
              <option value="reembolso">Beneficiario paga, obligado reembolsa</option>
              <option value="compartido_50_50">Compartido 50/50</option>
              <option value="compartido_otro">Compartido (otra proporción)</option>
            </select>
          </div>
          <div>
            <Label>Detalle del pagador</Label>
            <Input
              value={pagadorDetalle}
              onChange={e => setPagadorDetalle(e.target.value)}
              placeholder='Opcional — ej. "70/30"'
            />
          </div>
        </div>

        <div>
          <Label>Notas</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Opcional"
            className="min-h-[60px]"
          />
        </div>

        {!editing && (
          <p className="text-[10px] text-muted-foreground italic">
            Los gastos quedan agrupados en una "canasta" del caso — sirven después para fundar el pedido
            de cuota provisoria. Cuando llegue el momento del pedido formal, desde el panel de Cuotas
            podés convertir la canasta en cuota fijada con un click.
          </p>
        )}
      </div>
    </Modal>
  );
};
