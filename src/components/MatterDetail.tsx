import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Coins,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Ban,
  Send,
  Layers,
  Archive,
  Search,
  X,
} from 'lucide-react';
import { Matter, TimelineEvent, Task, LegalDocument, Expediente, MatterMilestone, FlowSnapshot, INCIDENTE_TIPO_LABELS, ASPECTO_APELADO_LABELS, APELADO_POR_LABELS } from '../types';
import { Badge, Card, Button, Modal, Input, Textarea, Select } from './UI';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { fetchExpediente } from '../lib/db';
import { useAppContext } from '../lib/AppContext';
import { ExpedienteForm } from './ExpedienteForm';
import { ExpedienteDetail } from './ExpedienteDetail';
import { ESTADO_COLORS } from '../data/juzgados';
import { findTemplate, MATTER_TEMPLATES } from '../data/templates';
import { StageFicha } from './StageFicha';
import { getFlowSnapshot } from '../lib/flowEngine';
import { findTemplateForTask } from '../lib/taskTemplateMatch';
import { useNavigate } from 'react-router-dom';
import { ACTION_ICONS } from '../constants';
import { CommunicationsLog } from './CommunicationsLog';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { ClientAccountStatement } from './ClientAccountStatement';
import { TimelinePanel } from './TimelinePanel';
import { HilosPanel } from './HilosPanel';
import { PeritosPanel } from './PeritosPanel';
import { CompensacionPanel } from './CompensacionPanel';
import { LetradosPanel } from './LetradosPanel';
import { HonorariosRegPanel } from './HonorariosRegPanel';
import { SubProcesosPanel } from './SubProcesosPanel';
import { CausasRelacionadasPanel } from './CausasRelacionadasPanel';
import { CedulasPanel } from './CedulasPanel';
import { HijosPanel } from './HijosPanel';
import { ReconvencionesPanel } from './ReconvencionesPanel';
import { BienesPanel } from './BienesPanel';
import { CautelaresPanel } from './CautelaresPanel';
import { CuotasAlimentariasPanel } from './CuotasAlimentariasPanel';
import { MutarDivorcioModal } from './MutarDivorcioModal';
import { DeshacerMutacionModal } from './DeshacerMutacionModal';
import { ResumenAlertasMatter, AlertaResumen, SeveridadAlerta } from './ResumenAlertasMatter';
import { urgenciaDePlazo, diasRestantes, exhortosPendientes, calcularVencimientoSync, resolveJurisdiccion } from '../lib/plazos';
import { detectarCruceViolencia } from '../lib/violencia';
import { detectarSenalesCautelar } from '../lib/cautelaresSugeridas';
import { proximosACumplir18, recienCumplio18 } from '../lib/hijosTransicion';

interface MatterDetailProps {
  matter: Matter;
  timeline: TimelineEvent[];
  tasks: Task[];
  documents: LegalDocument[];
  milestones: MatterMilestone[];
  profiles?: { fullName: string }[];
  onBack: () => void;
  onNewAction: () => void;
  onEditMatter: () => void;
  onCompleteMilestone?: (id: string) => void;
  onCompleteTask?: (taskId: string) => void;
  onReopenTask?: (taskId: string) => void;
  onUpdateMatter?: (changes: Partial<Matter>) => void;
  onUpdateDocument?: (docId: string, changes: Partial<LegalDocument>) => void;
  onAddDocument?: (doc: Omit<LegalDocument, 'id'>) => void;
  onAddMilestone?: (ms: Omit<MatterMilestone, 'id'>) => void;
  currentUser: string;
  currentUserRole: string;
}

export const MatterDetail = ({
  matter, timeline, tasks, documents, milestones, profiles,
  onBack, onNewAction, onEditMatter, onCompleteMilestone, onCompleteTask, onReopenTask,
  onUpdateMatter, onUpdateDocument, onAddDocument, onAddMilestone,
  currentUser, currentUserRole,
}: MatterDetailProps) => {
  const navigate = useNavigate();
  const { clients, matters: allMatters, plazos: allPlazos, eventos: allEventos, hijos: allHijos, reconvenciones: allReconvenciones, cautelares: allCautelares, bienes: allBienes, cuotasAlimentarias: allCuotasAlim, handleEditMatter, setEditMatterFocusField, handleArchiveMatter } = useAppContext();
  // GAP 1 — sub-procesos: si este matter tiene padre, mostramos breadcrumb.
  const parentMatter = matter.parentMatterId ? allMatters.find(m => m.id === matter.parentMatterId) : undefined;
  const isSubProceso = matter.kind === 'incidente' || matter.kind === 'apelacion';
  const subProcesoLabel = matter.kind === 'apelacion'
    ? 'Apelación'
    : matter.kind === 'incidente'
      ? `Incidente${matter.incidenteTipo ? ' · ' + INCIDENTE_TIPO_LABELS[matter.incidenteTipo] : ''}`
      : null;

  // GAP 5 — parcialmente firme. Estado DERIVADO: si este matter es principal
  // y tiene al menos una apelación-hija con estado != Cerrado/Archivado,
  // está parcialmente firme. Listamos los aspectos de cada apelación abierta
  // DESAGREGADOS POR APELANTE (GAP R11) para distinguir apelaciones cruzadas
  // sobre el mismo aspecto (ambas partes apelan compensación por motivos opuestos).
  const apelacionesAbiertas = !isSubProceso
    ? allMatters.filter(m =>
        m.parentMatterId === matter.id
        && m.kind === 'apelacion'
        && m.status !== 'Cerrado'
        && m.status !== 'Archivado'
      )
    : [];
  const parcialmenteFirme = apelacionesAbiertas.length > 0;
  const clientObj = clients.find(c => c.name === matter.client);

  // Casos legados anteriores a la migración 017 pueden tener jurisdicción NULL.
  // El motor de plazos va a fallar apenas se intente registrar un evento, así
  // que señalizamos de manera permanente hasta que se complete.
  const jurisdiccionFaltante = !matter.jurisdiccion;

  // Eventos de este asunto, más reciente primero — para detectar "autos para sentencia".
  const matterEventos = allEventos
    .filter(e => e.matterId === matter.id)
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ultimoEvento = matterEventos[0];
  const isAutosParaSentencia = ultimoEvento?.tipo === 'autos_para_sentencia';
  const diasDesdeAutos = isAutosParaSentencia
    ? differenceInCalendarDays(new Date(), parseISO(ultimoEvento!.fecha))
    : 0;
  const autosNivelAlerta: 'normal' | 'amarillo' | 'rojo' =
    diasDesdeAutos >= 90 ? 'rojo' : diasDesdeAutos >= 60 ? 'amarillo' : 'normal';

  // Datos de violencia familiar / medida cautelar — sección del formulario Instrucción.
  const cd = matter.caseData ?? {};
  const medidaDescripcion = cd.medida_descripcion?.trim();
  const medidaOrganismo = cd.medida_tipo_denuncia?.trim();
  const medidaFecha = cd.medida_fecha?.trim();
  const medidaVigenciaHasta = cd.medida_vigencia_hasta?.trim();
  const tieneMedida = !!(medidaDescripcion || medidaOrganismo || medidaVigenciaHasta);
  const diasDesdeVencimientoMedida = medidaVigenciaHasta
    ? differenceInCalendarDays(new Date(), parseISO(medidaVigenciaHasta))
    : null;
  const medidaVencida = !!(diasDesdeVencimientoMedida != null && diasDesdeVencimientoMedida > 0);

  // GAP 21 — detección de cruce entre medida vigente y régimen propuesto.
  const cruceViolencia = detectarCruceViolencia(cd);

  // GAP R3 — hijos del caso (familia). Calculamos transiciones a mayoría
  // de edad para mostrar banner amber discreto. Si el matter es sub-proceso
  // (incidente / apelación), miramos los hijos del expediente raíz, porque
  // ahí viven — el sub-proceso solo los consume.
  const hijosDelMatter = useMemo(() => {
    const ids = matter.parentMatterId
      ? new Set([matter.id, matter.parentMatterId])
      : new Set([matter.id]);
    return allHijos.filter(h => ids.has(h.matterId));
  }, [allHijos, matter.id, matter.parentMatterId]);
  const proximosCumplir = useMemo(() => proximosACumplir18(hijosDelMatter), [hijosDelMatter]);
  const recienMayores   = useMemo(() => recienCumplio18(hijosDelMatter),   [hijosDelMatter]);
  // GAP UX-10: ocultar el banner en casos cerrados/archivados — la transición
  // a mayoría de edad ya no requiere acción si el matter no está activo.
  const matterActivoParaTransicion = matter.status !== 'Cerrado' && matter.status !== 'Archivado';
  const hayTransicionMayoria = matterActivoParaTransicion
    && (proximosCumplir.length > 0 || recienMayores.length > 0);
  // GAP UX-10: severidad — crítica si hay alguno que ya cumplió 18 (acción
  // pendiente) o cumple en ≤30 días; media para 31-90 días.
  const transicionMayoriaSeveridad: 'critica' | 'media' = useMemo(() => {
    if (recienMayores.length > 0) return 'critica';
    if (proximosCumplir.some(p => p.diasRestantes <= 30)) return 'critica';
    return 'media';
  }, [proximosCumplir, recienMayores]);
  // Familia incluye al matter actual o al padre cuando es sub-proceso —
  // un incidente de aumento de cuota dentro de un divorcio sigue siendo
  // contexto de Familia aunque el sub-proceso herede otro tipo.
  // GAP UX-12: hardening — walk del parent chain (por si el parent no está
  // cargado en allMatters por race) + fallback por `incidenteTipo` típico
  // de Familia. Sin esto, el tab podía ocultarse si el sub-proceso tiene
  // type distinto del padre o si el cache no terminó de hidratar.
  const esFamilia = useMemo(() => {
    if (matter.type === 'Familia') return true;
    // Walk up siguiendo parentMatterId hasta encontrar uno Familia o quedarnos sin padre.
    let cursor = parentMatter;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      if (cursor.type === 'Familia') return true;
      seen.add(cursor.id);
      cursor = cursor.parentMatterId ? allMatters.find(m => m.id === cursor!.parentMatterId) : undefined;
    }
    // Fallback: el parent no resolvió (cache vacío) pero el incidenteTipo
    // pertenece al universo de familia. Mostramos el tab para no frenar al
    // usuario; si efectivamente no es familia, la lista de hijos será vacía.
    if (matter.parentMatterId && matter.incidenteTipo) {
      const familiaIncidentes: typeof matter.incidenteTipo[] = [
        'alimentos_provisorios',
        'tenencia_cautelar',
        'exclusion_hogar',
        'autorizacion_viaje',
      ];
      if (familiaIncidentes.includes(matter.incidenteTipo)) return true;
    }
    return false;
  }, [matter.type, matter.parentMatterId, matter.incidenteTipo, parentMatter, allMatters]);

  // GAP R6 — el botón "Mutar tipo de divorcio" aparece solo en casos
  // que usan el template de divorcio (CABA o PBA) y que no son
  // sub-procesos (mutar el divorcio se hace desde el matter principal).
  // GAP UX-13: la condición hardcodea los dos templates de divorcio. Se
  // mantiene así porque hoy es la única feature con flow bifurcado por un
  // campo de caseData (`tipo_divorcio`). Cuando aparezca un segundo template
  // con esa naturaleza (filiación contenciosa↔consensual, alimentos
  // provisorios↔definitivos), refactorizar a un metadato `flowBifurcable`
  // en el template y reemplazar este `||` por una lookup. Mientras tanto el
  // alcance acotado evita falsos positivos.
  const esDivorcioPrincipal = !isSubProceso
    && (matter.flowTemplateId === 'fam-divorcio' || matter.flowTemplateId === 'fam-divorcio-pba');

  // GAP UX-25 — buscar mutación reciente (<24h) que aún no fue deshecha
  // para mostrar el botón "Deshacer mutación" junto al de "Mutar tipo".
  const mutacionReversible = useMemo(() => {
    if (!esDivorcioPrincipal) return null;
    const ahora = Date.now();
    const candidatos = allEventos
      .filter(e => e.matterId === matter.id && e.tipo === 'mutacion_tipo_divorcio')
      .filter(e => (ahora - new Date(e.createdAt).getTime()) <= 24 * 60 * 60 * 1000)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (candidatos.length === 0) return null;
    const masReciente = candidatos[0];
    // ¿Ya fue deshecha?
    const yaDeshecha = allEventos.some(e =>
      e.tipo === 'deshacer_mutacion_tipo_divorcio'
      && (e.metadata as any)?.evento_mutacion_id === masReciente.id,
    );
    return yaDeshecha ? null : masReciente;
  }, [allEventos, matter.id, esDivorcioPrincipal]);

  // GAP R10 — reconvenciones del matter. El tab "Reconvenciones" aparece
  // en fueros donde la figura existe (Familia / Civil / Daños / Comercial).
  // En sub-procesos se incluyen las del padre (la reconvención del matter
  // raíz puede afectar incidentes en cuerda separada).
  const reconvencionesDelMatter = useMemo(() => {
    const ids = matter.parentMatterId
      ? new Set([matter.id, matter.parentMatterId])
      : new Set([matter.id]);
    return allReconvenciones.filter(r => ids.has(r.matterId));
  }, [allReconvenciones, matter.id, matter.parentMatterId]);
  const reconvencionesPendientes = reconvencionesDelMatter.filter(
    r => r.estado === 'pendiente_traslado' || r.estado === 'traslado_corrido',
  );
  const aplicaReconvencion =
    matter.type === 'Familia'   || parentMatter?.type === 'Familia'
    || matter.type === 'Civil'  || parentMatter?.type === 'Civil'
    || matter.type === 'Daños'  || parentMatter?.type === 'Daños'
    || matter.type === 'Comercial' || parentMatter?.type === 'Comercial';

  // GAP UX-28 — para cada reconvención con traslado_corrido + fecha cargada,
  // calculamos el vencimiento del plazo de contestación (15 días hábiles
  // desde que se corrió). Si vence pronto el banner se vuelve rojo crítico.
  const reconvencionesConVencimiento = useMemo(() => {
    let jurisd: ReturnType<typeof resolveJurisdiccion>;
    try { jurisd = resolveJurisdiccion(matter); } catch { return []; }
    const hoy = new Date();
    return reconvencionesPendientes
      .filter(r => r.estado === 'traslado_corrido' && r.fechaTrasladoCorrido)
      .map(r => {
        let venc: Date | null;
        try {
          venc = calcularVencimientoSync({
            fechaInicio: parseISO(r.fechaTrasladoCorrido!),
            dias: 15,
            diasHabiles: true,
            jurisdiccion: jurisd,
          });
        } catch { venc = null; }
        if (!venc) return { reconv: r, vencimiento: null, dias: null };
        return { reconv: r, vencimiento: venc, dias: differenceInCalendarDays(venc, hoy) };
      });
  }, [reconvencionesPendientes, matter]);

  // Severidad agregada del banner: rojo crítico si alguna venció o vence en
  // ≤2 días hábiles; rojo si alguna vence en ≤5; fucsia normal si todas con
  // margen amplio o sin fecha cargada.
  const reconvencionSeveridad: 'critica' | 'alta' | 'normal' = useMemo(() => {
    if (reconvencionesConVencimiento.some(x => x.dias != null && x.dias <= 2)) return 'critica';
    if (reconvencionesConVencimiento.some(x => x.dias != null && x.dias <= 5)) return 'alta';
    return 'normal';
  }, [reconvencionesConVencimiento]);

  // GAP R8 — exhortos internacionales librados sin contestación posterior
  // y con más de 90 días de antigüedad. El banner aparece para forzar
  // seguimiento ante Cancillería / autoridad destino.
  const exhortosLargos = useMemo(
    () => exhortosPendientes(allEventos, matter.id, 90),
    [allEventos, matter.id],
  );

  // GAP R4 + R9 + R14 — patrimonio del caso. Tab visible en cualquier
  // fuero excepto Laboral (donde el patrimonio del trabajador no
  // suele modelarse así). En sub-procesos lee del padre — los bienes
  // son del expediente principal.
  const aplicaPatrimonio = matter.type !== 'Laboral';
  const patrimonioMatterId = matter.parentMatterId ?? matter.id;

  // GAP R15 — cautelares vigentes (trabadas o parcialmente levantadas).
  // El banner discreto avisa que el patrimonio del caso está bajo medida.
  const cautelaresVigentes = useMemo(
    () => allCautelares.filter(c =>
      c.matterId === patrimonioMatterId
      && (c.estado === 'trabada' || c.estado === 'parcialmente_levantada' || c.estado === 'concedida')
    ),
    [allCautelares, patrimonioMatterId],
  );

  // GAP UX-31 — Detección de señales que ameritan cautelar preventiva.
  // La heurística vive en lib/cautelaresSugeridas.ts; acá filtramos los
  // recursos del matter de patrimonio (puede ser raíz si es sub-proceso)
  // y delegamos. La alerta se auto-suprime cuando hay una cautelar
  // vigente contra la contraparte.
  const bienesDelMatterPatrimonio = useMemo(
    () => allBienes.filter(b => b.matterId === patrimonioMatterId),
    [allBienes, patrimonioMatterId],
  );
  const cautelaresDelMatterPatrimonio = useMemo(
    () => allCautelares.filter(c => c.matterId === patrimonioMatterId),
    [allCautelares, patrimonioMatterId],
  );
  const senalesCautelar = useMemo(
    () => detectarSenalesCautelar(matter, bienesDelMatterPatrimonio, cautelaresDelMatterPatrimonio),
    [matter, bienesDelMatterPatrimonio, cautelaresDelMatterPatrimonio],
  );
  const lsKeyCautelar = `lawstream:cautelar-preventiva-evaluada:${matter.id}`;
  const [cautelarPreventivaDismissed, setCautelarPreventivaDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(lsKeyCautelar) === '1'; } catch { return false; }
  });
  const dismissCautelarPreventiva = () => {
    setCautelarPreventivaDismissed(true);
    try { localStorage.setItem(lsKeyCautelar, '1'); } catch {}
  };
  const mostrarSenalesCautelar = senalesCautelar.ameritaEvaluar && !cautelarPreventivaDismissed;

  // GAP UX-9 — Centro de alertas. Cuando se acumulan ≥ 3 alertas activas
  // los banners apilados degradan la legibilidad del header. Mostramos un
  // resumen compacto colapsable; el usuario expande si quiere ver los
  // banners completos.
  // Tipo de divorcio "Por definir": el caso se creó sin saber si iba a ser
  // conjunto o unilateral (decisión típica de la entrevista). Visibilizar
  // como alerta para que no quede olvidado y aparezca arriba.
  const tipoDivorcioPorDefinir = esDivorcioPrincipal
    && (!matter.caseData?.tipo_divorcio || matter.caseData.tipo_divorcio === 'Por definir');

  const alertasActivas = useMemo<AlertaResumen[]>(() => {
    const list: AlertaResumen[] = [];
    if (jurisdiccionFaltante) {
      list.push({ id: 'jurisdiccion-faltante', severidad: 'critica', titulo: 'Jurisdicción sin cargar', chip: 'Jurisdicción', tono: 'amber' });
    }
    if (tipoDivorcioPorDefinir) {
      list.push({ id: 'tipo-divorcio-por-definir', severidad: 'alta', titulo: 'Tipo de divorcio por definir', chip: 'Definir tipo', tono: 'violet' });
    }
    if (tieneMedida) {
      // GAP UX-11: medida vencida es acción urgente (renovar) — sube a crítica.
      // Cruce con régimen amplio también es crítica. Sino, media.
      const sev: SeveridadAlerta = (medidaVencida || cruceViolencia.regimenLuceAmplio) ? 'critica' : 'media';
      const titulo = medidaVencida ? 'Medida de protección vencida' : 'Medida de protección vigente';
      const chip = medidaVencida ? 'Violencia (vencida)' : 'Violencia';
      list.push({ id: 'violencia', severidad: sev, titulo, chip, tono: 'rose' });
    }
    if (parcialmenteFirme) {
      list.push({ id: 'parcialmente-firme', severidad: 'media', titulo: 'Sentencia parcialmente firme', chip: 'Parcialmente firme', tono: 'amber' });
    }
    if (esFamilia && hayTransicionMayoria) {
      // GAP UX-10: severidad y tono escalan con urgencia (≤30 días o ya cumplió).
      list.push({
        id: 'transicion-mayoria',
        severidad: transicionMayoriaSeveridad === 'critica' ? 'alta' : 'media',
        titulo: 'Transición a mayoría de edad',
        chip: 'Cumple 18',
        tono: transicionMayoriaSeveridad === 'critica' ? 'rose' : 'amber',
      });
    }
    if (aplicaReconvencion && reconvencionesPendientes.length > 0) {
      // GAP UX-28: si hay un vencimiento ≤2 días o vencido, escalar a crítica
      // para que aparezca primero en el resumen colapsado.
      const sev = reconvencionSeveridad === 'critica' ? 'critica' : 'alta';
      const tono = reconvencionSeveridad === 'critica' ? 'rose' : 'fuchsia';
      list.push({ id: 'reconvencion', severidad: sev, titulo: 'Reconvención abierta', chip: `Reconvención (${reconvencionesPendientes.length})`, tono });
    }
    if (exhortosLargos.length > 0) {
      list.push({ id: 'exhorto', severidad: 'media', titulo: 'Exhorto internacional pendiente', chip: `Exhorto (${exhortosLargos.length})`, tono: 'sky' });
    }
    if (cautelaresVigentes.length > 0) {
      list.push({ id: 'cautelar', severidad: 'alta', titulo: 'Cautelar patrimonial vigente', chip: `Cautelar (${cautelaresVigentes.length})`, tono: 'rose' });
    }
    // GAP UX-31: señal de potencial vaciamiento — pasivo significativo
    // de la contraparte sin cautelar vigente. Severidad alta porque la
    // ventana para pedir inhibición es corta una vez detectada la señal.
    if (mostrarSenalesCautelar) {
      list.push({
        id: 'cautelar-preventiva',
        severidad: 'alta',
        titulo: 'Evaluar cautelar preventiva',
        chip: `Pasivo contraparte (${senalesCautelar.pasivosRelevantes.length})`,
        tono: 'rose',
      });
    }
    return list;
  }, [jurisdiccionFaltante, tipoDivorcioPorDefinir, tieneMedida, medidaVencida, cruceViolencia.regimenLuceAmplio, parcialmenteFirme, esFamilia, hayTransicionMayoria, transicionMayoriaSeveridad, aplicaReconvencion, reconvencionesPendientes.length, reconvencionSeveridad, exhortosLargos.length, cautelaresVigentes.length, mostrarSenalesCautelar, senalesCautelar.pasivosRelevantes.length]);

  const debeColapsar = alertasActivas.length >= 3;
  const lsKey = `lawstream:alertas-expandidas:${matter.id}`;
  const [alertasExpandidas, setAlertasExpandidas] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(lsKey) === '1'; } catch { return false; }
  });
  const handleToggleAlertas = () => {
    setAlertasExpandidas(prev => {
      const next = !prev;
      try { localStorage.setItem(lsKey, next ? '1' : '0'); } catch {}
      return next;
    });
  };
  // Mostramos los banners si: hay <3 alertas (siempre se ven) o el usuario eligió expandir.
  const mostrarBanners = !debeColapsar || alertasExpandidas;

  // Plazos activos de este asunto, ordenados por vencimiento — más urgentes primero.
  const matterPlazosActivos = allPlazos
    .filter(p => p.matterId === matter.id && p.estado === 'activo')
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
  const nextPlazo = matterPlazosActivos[0];
  const nextPlazoUrg = nextPlazo ? urgenciaDePlazo(nextPlazo) : null;
  const nextPlazoDias = nextPlazo ? diasRestantes(nextPlazo.fechaVencimiento) : null;

  // Modal state
  const [isRequestDocOpen, setIsRequestDocOpen] = useState(false);
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [isBlockageOpen, setIsBlockageOpen] = useState(false);
  const [isResponsableOpen, setIsResponsableOpen] = useState(false);
  const [blockageText, setBlockageText] = useState(matter.blockage || '');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [expediente, setExpediente] = useState<Expediente | null | undefined>(undefined);
  const [showExpedienteForm, setShowExpedienteForm] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCriticality, setNewDocCriticality] = useState<'Crítico' | 'Recomendado' | 'Opcional'>('Crítico');
  const [newDocBlocks, setNewDocBlocks] = useState(false);
  const [newMilestoneLabel, setNewMilestoneLabel] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [docMenuOpen, setDocMenuOpen] = useState<string | null>(null);
  const [fichaOpenStage, setFichaOpenStage] = useState<string | null>(null);
  const [isMutarDivorcioOpen, setIsMutarDivorcioOpen] = useState(false);
  const [isDeshacerMutacionOpen, setIsDeshacerMutacionOpen] = useState(false);

  // New navigation state
  const [activeTab, setActiveTab] = useState<'flujo' | 'timeline' | 'hilos' | 'cobranzas' | 'expediente' | 'comunicaciones' | 'hijos' | 'reconvenciones' | 'patrimonio'>('flujo');
  // GAP UX-32: dentro del tab Hijos hay dos secciones grandes (datos de hijos
  // y cuotas alimentarias). Sub-tab para no apilarlas.
  const [hijosSubTab, setHijosSubTab] = useState<'datos' | 'cuotas'>('datos');
  const [viewingStage, setViewingStage] = useState<string | null>(null);

  // Pre-filled communication message (from "Solicitar datos" button)
  const [commPrefill, setCommPrefill] = useState<string | undefined>(undefined);

  // GAP 28 — buscador y filtros para Documentación Completa.
  const [docSearch, setDocSearch] = useState('');
  const [docFilterStatus, setDocFilterStatus] = useState<string | null>(null);
  const [docFilterCategory, setDocFilterCategory] = useState<string | null>(null);

  // Lista filtrada — busca en nombre, categoría y associatedAction (etapa).
  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return documents.filter(d => {
      if (docFilterStatus && d.status !== docFilterStatus) return false;
      if (docFilterCategory && (d.category ?? 'sin_categoria') !== docFilterCategory) return false;
      if (q.length > 0) {
        const hay = [d.name, d.category, d.associatedAction]
          .filter(Boolean)
          .some(s => (s as string).toLowerCase().includes(q));
        if (!hay) return false;
      }
      return true;
    });
  }, [documents, docSearch, docFilterStatus, docFilterCategory]);

  const docActiveFilters = (docSearch.trim() ? 1 : 0) + (docFilterStatus ? 1 : 0) + (docFilterCategory ? 1 : 0);
  const clearDocFilters = () => {
    setDocSearch('');
    setDocFilterStatus(null);
    setDocFilterCategory(null);
  };

  // Conteos por estado/categoría para chips (sólo lo que existe en este caso).
  const docStatusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(d => { counts[d.status] = (counts[d.status] ?? 0) + 1; });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [documents]);
  const docCategoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach(d => {
      const k = d.category ?? 'sin_categoria';
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }, [documents]);

  const DOC_CATEGORY_LABELS: Record<string, string> = {
    escrito:    'Escrito',
    resolucion: 'Resolución',
    sentencia:  'Sentencia',
    pericia:    'Pericia',
    oficio:     'Oficio',
    cedula:     'Cédula',
    documental: 'Documental',
    identidad:  'Identidad',
    otro:       'Otro',
    sin_categoria: 'Sin categoría',
  };

  useEffect(() => {
    fetchExpediente(matter.id).then(setExpediente);
  }, [matter.id]);

  // Flow engine
  const template = (matter.flowTemplateId && MATTER_TEMPLATES.find(t => t.id === matter.flowTemplateId)) || findTemplate(matter.type, matter.subtype);
  const flow: FlowSnapshot = getFlowSnapshot(matter, template, tasks, documents);

  // Lookup satisfiedBy from template for a given task (by title + etapa)
  const getSatisfiedBy = (task: Task) => {
    if (task.satisfiedBy) return task.satisfiedBy;
    if (!template?.stages) return undefined;
    const stage = template.stages.find(s => s.name === task.etapa);
    if (!stage) return undefined;
    const def = stage.tasks.find(t => t.task === task.title);
    return def?.satisfiedBy;
  };

  // Handler: "Solicitar datos" — generates message and switches to comunicaciones tab
  const handleRequestData = (taskTitle: string, missingFields: { key: string; label: string }[]) => {
    const listado = missingFields.map(f => `  - ${f.label}`).join('\n');
    const msg = `Estimado/a ${matter.client},\n\nPara poder avanzar con su trámite "${matter.title}", necesitamos que nos facilite la siguiente información:\n\n${listado}\n\nQuedamos a disposición ante cualquier consulta.\nSaludos cordiales.`;
    setCommPrefill(msg);
    setActiveTab('comunicaciones');
  };

  // Stage navigation
  const hasStages = flow.stages.length > 0;
  const selectedStage = viewingStage || flow.currentStage || '';
  const isViewingCurrentStage = !viewingStage || viewingStage === flow.currentStage;

  // Tasks filtered by stage
  const stageTasks = hasStages && selectedStage
    ? tasks.filter(t => t.etapa === selectedStage)
    : tasks;
  // Tasks Canceladas (ej. por mutación de tipo de divorcio) se excluyen
  // del conteo de pendientes y completadas — viven en su propia sección.
  const stageBlockingPending    = stageTasks.filter(t => t.bloqueante  && t.status !== 'Completada' && t.status !== 'Cancelada');
  const stageNonBlockingPending = stageTasks.filter(t => !t.bloqueante && t.status !== 'Completada' && t.status !== 'Cancelada');
  const stageCompletedTasks     = stageTasks.filter(t => t.status === 'Completada');
  const stageCancelledTasks     = stageTasks.filter(t => t.status === 'Cancelada');

  // Documents filtered by stage (using associatedAction which stores stage name)
  const stageDocs = hasStages && selectedStage
    ? documents.filter(d => d.associatedAction === selectedStage)
    : documents;
  const stageDocsWithoutStage = hasStages && selectedStage
    ? documents.filter(d => !d.associatedAction)
    : [];
  const allStageDocs = [...stageDocs, ...stageDocsWithoutStage];

  // Blocking counts (stage-aware for Flujo, global for hero)
  const stageBlockingDocsCount = allStageDocs.filter(d => d.blocksProgress && d.status !== 'Presentado' && d.status !== 'Recibido' && d.status !== 'Aprobado' && (d.status as string) !== 'No aplica').length;
  const globalBlockingDocsCount = documents.filter(d => d.blocksProgress && d.status !== 'Presentado' && d.status !== 'Recibido' && d.status !== 'Aprobado' && (d.status as string) !== 'No aplica').length;
  const blockingDocsCount = globalBlockingDocsCount;
  const totalBlockingCount = stageBlockingPending.length + stageBlockingDocsCount;

  // Next stage
  const currentStageIdx = flow.stages.findIndex(s => s.status === 'current');
  const nextStageName = currentStageIdx >= 0 && currentStageIdx < flow.stages.length - 1
    ? flow.stages[currentStageIdx + 1].name
    : null;

  // Stage ficha info
  const selectedTemplateStage = template?.stages?.find(s => s.name === selectedStage);
  const hasStageFicha = !!selectedTemplateStage?.fichaFields;
  const fichaKeys = hasStageFicha ? selectedTemplateStage!.fichaFields!.flatMap(s => s.fields.map(f => f.key)) : [];
  const fichaFilled = fichaKeys.filter(k => {
    const v = matter.caseData?.[k];
    if (!v) return false;
    try { const arr = JSON.parse(v); return Array.isArray(arr) && arr.length > 0; } catch { return v.trim().length > 0; }
  }).length;

  const displayedTimeline = showAllHistory ? timeline : timeline.slice(0, 3);
  const ActionIcon = matter.nextActionType ? ACTION_ICONS[matter.nextActionType] : Zap;

  const docsResolved = documents.filter(d => d.status === 'Presentado' || d.status === 'Aprobado' || d.status === 'Recibido' || (d.status as string) === 'No aplica');
  const docCompletionPct = Math.round(
    (docsResolved.length / Math.max(documents.length, 1)) * 100
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">

      {/* ═══════════════════════ BREADCRUMB SUB-PROCESO ═══════════════════════ */}
      {/* Si este matter es incidente/apelación, mostramos arriba un link al padre. */}
      {isSubProceso && parentMatter && (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-violet-500/40 bg-violet-500/10">
          <button
            onClick={() => navigate(`/asuntos/${parentMatter.id}`)}
            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 transition-colors"
          >
            <ArrowLeft size={14} />
            Volver al caso principal
          </button>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-[11px] text-foreground/80 truncate">
            <span className="font-bold">{subProcesoLabel}</span>
            {' de '}
            <span className="font-bold">{parentMatter.title}</span>
          </span>
        </div>
      )}

      {/* ═══════════════════════ CENTRO DE ALERTAS (GAP UX-9) ═══════════════════════ */}
      {/* Si hay ≥3 alertas activas mostramos un resumen compacto en lugar
          de apilar todos los banners. El usuario expande con un click si
          quiere verlos uno por uno (decisión persistida en localStorage). */}
      {debeColapsar && (
        <ResumenAlertasMatter
          alertas={alertasActivas}
          expandido={alertasExpandidas}
          onToggle={handleToggleAlertas}
        />
      )}

      {mostrarBanners && (<>

      {/* ═══════════════════════ BANNER PARCIALMENTE FIRME (GAP 5 + R11) ═══════════════════════ */}
      {parcialmenteFirme && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <Scale size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Sentencia parcialmente firme
            </span>
            {/* GAP R11 — desagregamos por apelante. Si la misma apelación tiene
                varios aspectos, los listamos juntos. Si dos partes apelan el mismo
                aspecto, aparecen en líneas separadas (apelaciones cruzadas). */}
            <ul className="space-y-1 text-sm">
              {apelacionesAbiertas.map(a => {
                const apelanteLabel = a.apeladoPor
                  ? APELADO_POR_LABELS[a.apeladoPor]
                  : 'Apelante sin identificar';
                const aspectosTxt = (a.aspectosApelados ?? []).length > 0
                  ? a.aspectosApelados!.map(asp => ASPECTO_APELADO_LABELS[asp]).join(', ')
                  : 'aspectos no detallados';
                return (
                  <li key={a.id} className="text-foreground">
                    <span className="font-bold">{apelanteLabel}</span>
                    <span className="text-muted-foreground"> apela: </span>
                    <span className="text-foreground">{aspectosTxt}.</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-muted-foreground flex-1 min-w-0">
                {apelacionesAbiertas.length === 1
                  ? 'Hay 1 sub-proceso de Cámara en trámite.'
                  : `Hay ${apelacionesAbiertas.length} sub-procesos de Cámara en trámite${apelacionesAbiertas.some((a, i, arr) => arr.findIndex(x => x.id !== a.id && (x.aspectosApelados ?? []).some(asp => (a.aspectosApelados ?? []).includes(asp))) >= 0) ? ' — incluyen apelación cruzada sobre el/los mismo/s aspecto/s' : ''}.`}
              </p>
              {/* GAP UX-31: convertir el "verlo en tab Expediente → Sub-procesos"
                  en CTA real. Cambia activeTab y scrollea al panel. */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('expediente');
                  requestAnimationFrame(() => {
                    document.getElementById('subprocesos-section')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200 transition-colors"
              >
                Ver sub-procesos
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ BANNER JURISDICCIÓN FALTANTE ═══════════════════════ */}
      {/* Caso legado sin jurisdicción: se ve arriba del stepper para que sea imposible
          ignorarlo. Convive con el banner de violencia si ambos aplican. */}
      {jurisdiccionFaltante && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Jurisdicción sin cargar
            </span>
            <p className="text-sm font-bold text-foreground">
              Este caso no tiene jurisdicción cargada. El cálculo de plazos, la generación de tareas y algunos templates no funcionarán correctamente hasta que la completes.
            </p>
          </div>
          <button
            onClick={() => {
              setEditMatterFocusField?.('jurisdiccion');
              handleEditMatter(matter.id);
            }}
            className="shrink-0 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Completar jurisdicción
          </button>
        </div>
      )}

      {/* ═══════════════════════ BANNER TIPO DE DIVORCIO POR DEFINIR ═══════════════════════ */}
      {/* Caso de divorcio creado sin saber todavía si era conjunto o unilateral
          (decisión típica que recién se cierra después de la propuesta extrajudicial).
          Visibilizamos arriba del stepper con un CTA directo al modal "Definir tipo". */}
      {tipoDivorcioPorDefinir && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-violet-500/40 bg-violet-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/20 text-violet-700 flex items-center justify-center">
            <Scale size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
              Tipo de divorcio por definir
            </span>
            <p className="text-sm font-bold text-foreground">
              Este caso se creó sin definir si es de común acuerdo o unilateral. Hasta que se decida, el flujo no genera las tareas específicas de cada rama (preparación de demanda, presentación conjunta, mediación, traslados, etc.).
            </p>
          </div>
          <button
            onClick={() => setIsMutarDivorcioOpen(true)}
            className="shrink-0 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Definir tipo
          </button>
        </div>
      )}

      {/* ═══════════════════════ BANNER VIOLENCIA FAMILIAR (GAP UX-11) ═══════════════════════ */}
      {/* UX-11: cambia drásticamente el estilo según vigente (informativo, amber)
          vs vencida (acción urgente, rojo crítico con CTA "Renovar medida"). */}
      {tieneMedida && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl border-2 shadow-sm',
            medidaVencida
              ? 'bg-rose-500/15 border-rose-600/60 ring-1 ring-rose-500/30'
              : 'bg-amber-500/10 border-amber-500/40',
          )}
        >
          <div className={cn(
            'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            medidaVencida ? 'bg-rose-500/25 text-rose-700' : 'bg-amber-500/20 text-amber-700',
          )}>
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'text-[11px] font-black uppercase tracking-widest',
                medidaVencida ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300',
              )}>
                {medidaVencida
                  ? `Renovar medida — vencida hace ${diasDesdeVencimientoMedida} ${diasDesdeVencimientoMedida === 1 ? 'día' : 'días'}`
                  : 'Caso con medida de protección vigente'}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground">
              {medidaDescripcion || 'Medida de protección registrada'}
            </p>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
              {medidaOrganismo && <span>Organismo: <strong className="text-foreground/80">{medidaOrganismo}</strong></span>}
              {medidaFecha && <span>Denuncia: <strong className="text-foreground/80">{format(parseISO(medidaFecha), "d 'de' MMMM yyyy", { locale: es })}</strong></span>}
              {medidaVigenciaHasta && (
                <span>
                  {medidaVencida ? 'Vencida el' : 'Vigencia hasta'}:{' '}
                  <strong className={cn(
                    medidaVencida ? 'text-rose-700 dark:text-rose-300' : 'text-foreground/80',
                  )}>
                    {format(parseISO(medidaVigenciaHasta), "d 'de' MMMM yyyy", { locale: es })}
                  </strong>
                </span>
              )}
            </div>

            {/* GAP 21 — sub-bloque cruce con régimen propuesto. */}
            {cruceViolencia.hayCruce && (
              <div className={cn(
                'mt-3 p-3 rounded-xl border-2 border-dashed',
                cruceViolencia.regimenLuceAmplio
                  ? 'border-rose-600/60 bg-rose-600/10'
                  : 'border-amber-500/60 bg-amber-500/10'
              )}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className={cn(
                    'shrink-0 mt-0.5',
                    cruceViolencia.regimenLuceAmplio ? 'text-rose-700' : 'text-amber-700'
                  )} />
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-[10px] font-black uppercase tracking-widest',
                      cruceViolencia.regimenLuceAmplio
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-amber-700 dark:text-amber-300'
                    )}>
                      {cruceViolencia.regimenLuceAmplio
                        ? '⚠ Posible inconsistencia — revisar urgente'
                        : 'Revisar consistencia'}
                    </span>
                    <p className="text-xs text-foreground/90 mt-1">
                      {cruceViolencia.motivo}
                    </p>
                    {cd.regimen_comunicacion && (
                      <p className="text-[11px] text-muted-foreground mt-2 italic line-clamp-2">
                        Régimen cargado: "{cd.regimen_comunicacion}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* GAP UX-11: cuando la medida venció el banner ofrece CTA explícito. */}
          {medidaVencida && (
            <button
              onClick={() => handleEditMatter(matter.id)}
              className="shrink-0 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Renovar medida
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════ BANNER TRANSICIÓN MAYORÍA DE EDAD (GAP R3 + UX-10) ═══════════════════════ */}
      {/* Familia: avisa cuando un hijo está cerca de cumplir 18 (90 días) o
          recién los cumplió (30 días). La cuota muta a alimentos art. 663
          CCyCN ("hijo mayor que estudia") y deja de aplicar el cuidado.
          UX-10: rojo si alguno ya cumplió o cumple en ≤30 días, amber para
          31-90; oculto si el matter está Cerrado/Archivado. */}
      {esFamilia && hayTransicionMayoria && (() => {
        const critica = transicionMayoriaSeveridad === 'critica';
        return (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 p-4 rounded-2xl border shadow-sm',
              critica
                ? 'border-rose-500/50 bg-rose-500/10'
                : 'border-amber-500/40 bg-amber-500/10',
            )}
          >
            <div className={cn(
              'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              critica ? 'bg-rose-500/25 text-rose-700' : 'bg-amber-500/20 text-amber-700',
            )}>
              <Calendar size={20} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <span className={cn(
                'text-[11px] font-black uppercase tracking-widest',
                critica ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300',
              )}>
                Transición a mayoría de edad
              </span>
              <ul className="space-y-1 text-sm">
                {proximosCumplir.map(({ hijo, fechaCumple, diasRestantes }) => {
                  const itemCritico = diasRestantes <= 30;
                  return (
                    <li key={hijo.id} className="text-foreground">
                      <span className="font-bold">{hijo.nombre}</span>
                      <span className="text-muted-foreground">
                        {' '}cumple 18 el {format(fechaCumple, "d 'de' MMMM yyyy", { locale: es })}
                        {' '}(en{' '}
                      </span>
                      <span className={cn(
                        'font-bold',
                        itemCritico ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300',
                      )}>
                        {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
                      </span>
                      <span className="text-muted-foreground">).</span>
                    </li>
                  );
                })}
                {recienMayores.map(({ hijo, fechaCumple, diasDesde }) => (
                  <li key={hijo.id} className="text-foreground">
                    <span className="font-bold">{hijo.nombre}</span>
                    <span className="text-muted-foreground">
                      {' '}cumplió 18 el {format(fechaCumple, "d 'de' MMMM yyyy", { locale: es })}
                      {' '}(hace{' '}
                    </span>
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      {diasDesde} {diasDesde === 1 ? 'día' : 'días'}
                    </span>
                    <span className="text-muted-foreground">) — transición pendiente.</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                Preparar transición a alimentos art. 663 CCyCN (hijo mayor que estudia, hasta 25 años) y desactivar régimen de cuidado para ese hijo.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('hijos')}
              className={cn(
                'shrink-0 px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors',
                critica ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700',
              )}
            >
              Abrir tab Hijos
            </button>
          </div>
        );
      })()}

      {/* ═══════════════════════ BANNER RECONVENCIÓN PENDIENTE (GAP R10 + UX-28) ═══════════════════════ */}
      {/* Aparece si hay al menos una reconvención en estado 'pendiente_traslado'
          o 'traslado_corrido'. Cuando hay traslado corrido + fecha cargada se
          muestra el vencimiento; si está crítico el banner se vuelve rojo. */}
      {aplicaReconvencion && reconvencionesPendientes.length > 0 && (
        <div
          role="alert"
          className={cn(
            'flex items-start gap-3 p-4 rounded-2xl border shadow-sm',
            reconvencionSeveridad === 'critica'
              ? 'border-rose-600/60 bg-rose-500/15 ring-1 ring-rose-500/30'
              : reconvencionSeveridad === 'alta'
              ? 'border-rose-500/40 bg-rose-500/10'
              : 'border-fuchsia-500/40 bg-fuchsia-500/10',
          )}
        >
          <div className={cn(
            'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            reconvencionSeveridad === 'critica'
              ? 'bg-rose-500/25 text-rose-700'
              : reconvencionSeveridad === 'alta'
              ? 'bg-rose-500/20 text-rose-700'
              : 'bg-fuchsia-500/20 text-fuchsia-700',
          )}>
            <Layers size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <span className={cn(
              'text-[11px] font-black uppercase tracking-widest',
              reconvencionSeveridad !== 'normal'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-fuchsia-700 dark:text-fuchsia-300',
            )}>
              {reconvencionesPendientes.length === 1 ? 'Reconvención abierta' : 'Reconvenciones abiertas'}
            </span>
            <ul className="space-y-1 text-sm">
              {reconvencionesPendientes.map(r => {
                const venc = reconvencionesConVencimiento.find(x => x.reconv.id === r.id);
                const dias = venc?.dias;
                const venceTxt = (() => {
                  if (r.estado !== 'traslado_corrido') return null;
                  if (!r.fechaTrasladoCorrido) {
                    return { txt: 'cargá la fecha del traslado para ver el vencimiento', tone: 'muted' as const };
                  }
                  if (!venc?.vencimiento || dias == null) return null;
                  const fechaTxt = format(venc.vencimiento, "d 'de' MMM yyyy", { locale: es });
                  if (dias < 0)  return { txt: `VENCIDO hace ${-dias} día${-dias === 1 ? '' : 's'} (era ${fechaTxt})`, tone: 'critica' as const };
                  if (dias === 0) return { txt: `vence HOY (${fechaTxt})`, tone: 'critica' as const };
                  if (dias <= 2)  return { txt: `vence el ${fechaTxt} — quedan ${dias} día${dias === 1 ? '' : 's'}`, tone: 'critica' as const };
                  if (dias <= 5)  return { txt: `vence el ${fechaTxt} — quedan ${dias} días`, tone: 'alta' as const };
                  return { txt: `vence el ${fechaTxt} — quedan ${dias} días`, tone: 'normal' as const };
                })();
                return (
                  <li key={r.id} className="text-foreground">
                    <span className="font-bold">
                      {r.presentadaPor === 'cliente' ? 'Mi parte reconviene' : 'La contraparte reconviene'}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}({r.pretensiones.length} pretensión{r.pretensiones.length === 1 ? '' : 'es'} —{' '}
                      {r.estado === 'pendiente_traslado' ? 'pendiente de traslado' : 'traslado corrido, en plazo de contestación'}).
                    </span>
                    {venceTxt && (
                      <div className={cn(
                        'mt-0.5 text-[11px] font-bold inline-block',
                        venceTxt.tone === 'critica' ? 'text-rose-700 dark:text-rose-300'
                          : venceTxt.tone === 'alta'  ? 'text-rose-600 dark:text-rose-400'
                          : venceTxt.tone === 'muted' ? 'text-muted-foreground italic font-normal'
                          : 'text-fuchsia-700 dark:text-fuchsia-300',
                      )}>
                        Plazo de contestación {venceTxt.txt}.
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          <button
            onClick={() => setActiveTab('reconvenciones')}
            className={cn(
              'shrink-0 px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-colors',
              reconvencionSeveridad !== 'normal'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-fuchsia-600 hover:bg-fuchsia-700',
            )}
          >
            Ver reconvenciones
          </button>
        </div>
      )}

      {/* ═══════════════════════ BANNER EXHORTO INTERNACIONAL PENDIENTE (GAP R8) ═══════════════════════ */}
      {exhortosLargos.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-sky-500/20 text-sky-700 flex items-center justify-center">
            <Send size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-300">
              {exhortosLargos.length === 1 ? 'Exhorto internacional pendiente' : 'Exhortos internacionales pendientes'}
            </span>
            <ul className="space-y-0.5 text-sm">
              {exhortosLargos.map(ex => {
                const pais = (ex.metadata?.pais as string | undefined)?.trim();
                const autoridad = (ex.metadata?.autoridad_destino as string | undefined)?.trim();
                return (
                  <li key={ex.eventoLibradoId} className="text-foreground">
                    <span className="font-bold">
                      Librado el {format(parseISO(ex.fechaLibrado), "d 'de' MMMM yyyy", { locale: es })}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}— {ex.diasDesde} días sin contestación{pais ? ` (${pais}` : ''}{pais && autoridad ? `, ${autoridad}` : autoridad ? ` (${autoridad}` : ''}{(pais || autoridad) ? ')' : ''}.
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Considerar pronto despacho o consulta ante Cancillería / autoridad destino. Cuando llegue la contestación, registrá el evento "Exhorto internacional contestado".
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════ BANNER CAUTELAR PREVENTIVA SUGERIDA (GAP UX-31) ═══════════════════════ */}
      {/* Pasivo significativo cargado para la contraparte sin cautelar
          vigente — señal de potencial vaciamiento. Banner con CTA al
          panel de patrimonio para revisar y eventualmente pedir
          inhibición general / embargo. Se autosuprime cuando se crea
          una cautelar contra la contraparte; "Ya lo evalué" lo dismissa
          manualmente con localStorage por matter. */}
      {mostrarSenalesCautelar && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-rose-500/40 bg-rose-500/5 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
              Evaluar cautelar preventiva
            </span>
            <p className="text-sm text-foreground">
              {senalesCautelar.pasivosRelevantes.length === 1
                ? 'Cargaste un pasivo significativo de la contraparte sin cautelar vigente que lo neutralice. '
                : `Cargaste ${senalesCautelar.pasivosRelevantes.length} pasivos significativos de la contraparte sin cautelar vigente que los neutralice. `}
              Puede ser señal de vaciamiento patrimonial — convendría evaluar pedir
              <strong> inhibición general de bienes</strong> o <strong>embargo preventivo</strong>
              para proteger la masa ganancial antes de que se complique la liquidación.
            </p>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 mt-1">
              {senalesCautelar.pasivosRelevantes.slice(0, 3).map(s => (
                <li key={s.bien.id}>
                  · <strong className="text-foreground/80">{s.bien.descripcion}</strong>
                  {s.bien.titularDetalle && <span> — {s.bien.titularDetalle}</span>}
                  {' '}
                  <span className="font-mono">
                    ({s.moneda === 'USD' ? 'US$' : s.moneda === 'EUR' ? '€' : '$'}{s.monto.toLocaleString('es-AR')})
                  </span>
                </li>
              ))}
              {senalesCautelar.pasivosRelevantes.length > 3 && (
                <li className="italic">+ {senalesCautelar.pasivosRelevantes.length - 3} más…</li>
              )}
            </ul>
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('patrimonio')}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Ir a patrimonio
            </button>
            <button
              onClick={dismissCautelarPreventiva}
              className="px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-widest transition-colors"
              title="Cerrar la alerta — se reactiva si cargás otro pasivo grande de la contraparte y limpiás localStorage"
            >
              Ya lo evalué
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════ BANNER CAUTELAR PATRIMONIAL VIGENTE (GAP R15) ═══════════════════════ */}
      {cautelaresVigentes.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 shadow-sm"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/20 text-rose-700 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">
              {cautelaresVigentes.length === 1 ? 'Cautelar patrimonial vigente' : 'Cautelares patrimoniales vigentes'}
            </span>
            <ul className="space-y-0.5 text-sm">
              {cautelaresVigentes.slice(0, 3).map(c => {
                const tipoLabel = c.tipo === 'inhibicion_general'    ? 'Inhibición general'
                                : c.tipo === 'embargo'               ? 'Embargo'
                                : c.tipo === 'intervencion_judicial' ? 'Intervención judicial'
                                : c.tipo === 'secuestro'             ? 'Secuestro'
                                : c.tipo === 'anotacion_litis'       ? 'Anotación de litis'
                                : c.tipo === 'prohibicion_innovar'   ? 'Prohibición de innovar'
                                : c.tipo === 'prohibicion_contratar' ? 'Prohibición de contratar'
                                : 'Otra';
                return (
                  <li key={c.id} className="text-foreground">
                    <span className="font-bold">{tipoLabel}</span>
                    {c.alcance && <span className="text-muted-foreground"> — {c.alcance}</span>}
                    {c.estado === 'parcialmente_levantada' && (
                      <span className="ml-1 text-amber-700 font-bold">(parcialmente levantada)</span>
                    )}
                  </li>
                );
              })}
              {cautelaresVigentes.length > 3 && (
                <li className="text-muted-foreground italic">+ {cautelaresVigentes.length - 3} más…</li>
              )}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Considerar al asesorar operaciones del cliente. Detalle y levantamientos en el tab Patrimonio.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('patrimonio')}
            className="shrink-0 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Ver patrimonio
          </button>
        </div>
      )}

      </>)}{/* end {mostrarBanners} — GAP UX-9 */}

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
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
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border/50">{matter.type}</Badge>
              {isSubProceso && subProcesoLabel && (
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/10">
                  {subProcesoLabel}
                </Badge>
              )}
              {expediente ? (
                <>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                    Exp: {expediente.nroJuzgado || expediente.nroReceptoria || 'Sin número'}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide',
                    ESTADO_COLORS[expediente.estadoTroncal]
                  )}>
                    {expediente.estadoTroncal}
                    {expediente.subestado ? ` · ${expediente.subestado}` : ''}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Sin expediente judicial</span>
              )}
            </div>
            <h1
              title={matter.title}
              className="text-2xl md:text-4xl font-black text-foreground tracking-tighter leading-[0.95] line-clamp-2"
            >{matter.title}</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">{matter.client}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick access icons */}
            <button
              title="Consultar PJN"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <ExternalLink size={16} />
            </button>
            <button
              title="WhatsApp Cliente"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
            >
              <MessageSquare size={16} />
            </button>
            <button
              title="Carpeta Drive"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-amber-600 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
            >
              <Paperclip size={16} />
            </button>
            <button
              title="Movimientos financieros"
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
              onClick={() => setActiveTab('expediente')}
            >
              <Coins size={16} />
            </button>
            <div className="w-px h-8 bg-border mx-1" />
            {/* GAP UX-25: botón "Deshacer mutación" aparece solo cuando hay
                una mutación de <24h sin deshacer todavía. */}
            {/* GAP UX-14: jerarquía clara en el header.
                  - Acciones excepcionales pero urgentes ("Definir tipo" cuando
                    falta, "Deshacer mutación" en ventana 24h) → siguen visibles
                    out-of-menu porque su criticidad lo justifica.
                  - "Mutar tipo" (cuando ya hay tipo definido) → overflow ⋯
                    porque es uso ocasional.
                  - "Editar Caso" → secundario (outline neutro).
                  - "Nueva Acción" → primary prominente (acción más frecuente). */}
            {mutacionReversible && (
              <Button
                variant="outline"
                size="sm"
                className="text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl border-amber-500/40 text-amber-700 hover:bg-amber-500/5 animate-in fade-in"
                onClick={() => setIsDeshacerMutacionOpen(true)}
                title="Revertir la mutación reciente del tipo de divorcio"
              >
                <RefreshCw size={14} className="mr-1.5" />
                Deshacer mutación
              </Button>
            )}
            {esDivorcioPrincipal && (() => {
              const tipoActualDiv = matter.caseData?.tipo_divorcio;
              const tipoSinDefinir = !tipoActualDiv || tipoActualDiv === 'Por definir';
              // Solo "Definir tipo" sigue out-of-menu — es una decisión
              // estructural pendiente que el usuario no debe perderse.
              if (!tipoSinDefinir) return null;
              return (
                <Button
                  variant="primary"
                  size="sm"
                  className="text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white animate-in fade-in"
                  onClick={() => setIsMutarDivorcioOpen(true)}
                  title="Definir si el divorcio es de común acuerdo o unilateral"
                >
                  <Scale size={14} className="mr-1.5" />
                  Definir tipo
                </Button>
              );
            })()}
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-10 px-5 rounded-xl"
              onClick={onEditMatter}
            >
              Editar Caso
            </Button>
            <Button
              onClick={onNewAction}
              variant="primary"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-xl shadow-primary/20"
            >
              <Plus size={16} className="mr-2" />
              Nueva Acción
            </Button>
            {/* Overflow ⋯: acciones excepcionales — Mutar tipo (cuando ya hay
                tipo definido) y Archivar caso. Solo aparece si hay al menos
                una opción. Usa <details> nativo: el browser maneja
                open/close + click-outside. */}
            {(() => {
              const tipoActualDiv = matter.caseData?.tipo_divorcio;
              const tipoSinDefinir = !tipoActualDiv || tipoActualDiv === 'Por definir';
              const mostrarMutar = esDivorcioPrincipal && !tipoSinDefinir;
              const mostrarArchivar = matter.status !== 'Archivado';
              if (!mostrarMutar && !mostrarArchivar) return null;
              return (
                <details className="relative group">
                  <summary
                    className="list-none cursor-pointer h-10 w-10 rounded-xl border border-border/50 bg-card hover:bg-muted/50 flex items-center justify-center transition-colors"
                    title="Más acciones"
                    aria-label="Más acciones"
                  >
                    <MoreHorizontal size={16} className="text-foreground/70" />
                  </summary>
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-border/60 bg-card shadow-xl z-20 overflow-hidden"
                    onClick={(e) => {
                      // Cerrar el details al hacer click en cualquier item.
                      const details = (e.currentTarget.parentElement as HTMLDetailsElement | null);
                      if (details) details.open = false;
                    }}
                  >
                    {mostrarMutar && (
                      <button
                        type="button"
                        onClick={() => setIsMutarDivorcioOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-violet-700 hover:bg-violet-500/10 transition-colors"
                      >
                        <Scale size={13} />
                        Mutar tipo de divorcio
                      </button>
                    )}
                    {mostrarArchivar && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Archivar "${matter.title}"? El caso pasará a estado Archivado y dejará de aparecer en listas activas. El histórico se preserva.`)) {
                            handleArchiveMatter(matter.id);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-muted/60 transition-colors border-t border-border/40"
                      >
                        <Archive size={13} />
                        Archivar caso
                      </button>
                    )}
                  </div>
                </details>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ═══════════════════ STEPPER HORIZONTAL ═══════════════════ */}
      {hasStages && (
        <section className="space-y-3">
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <div className="flex items-center min-w-max">
              {flow.stages.map((stage, idx) => (
                <React.Fragment key={stage.name}>
                  <button
                    onClick={() => {
                      setViewingStage(stage.name === flow.currentStage ? null : stage.name);
                      setActiveTab('flujo');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap",
                      selectedStage === stage.name && "bg-primary/5 ring-1 ring-primary/20",
                      stage.status === 'pending' && "opacity-50 hover:opacity-80"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border-2 transition-all",
                      stage.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" :
                      stage.status === 'current' ? "bg-primary border-primary text-primary-foreground" :
                      "bg-muted border-border text-muted-foreground"
                    )}>
                      {stage.status === 'completed' ? <CheckCircle2 size={14} /> : idx + 1}
                    </div>
                    <span className={cn(
                      "text-xs font-bold tracking-tight",
                      stage.status === 'completed' ? "text-emerald-700 dark:text-emerald-400" :
                      stage.status === 'current' ? "text-foreground" :
                      "text-muted-foreground"
                    )}>
                      {stage.name}
                    </span>
                    {stage.status === 'current' && viewingStage && viewingStage !== stage.name && (
                      <span className="text-[7px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Actual</span>
                    )}
                  </button>
                  {idx < flow.stages.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 shrink-0",
                      stage.status === 'completed' ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 rounded-full" style={{ width: `${flow.progress}%` }} />
            </div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">{flow.progress}%</span>
          </div>
        </section>
      )}

      {/* ═══════════════════ HERO COMPACT ═══════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border rounded-[2rem] overflow-hidden shadow-xl">
        {/* Left: Modo "Autos para sentencia" — en espera pasiva */}
        {isAutosParaSentencia && (
          <div className="lg:col-span-7 p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 text-white">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                  <Clock size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">En espera de sentencia</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  Caso en espera de sentencia
                </h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                  Última actividad: {format(parseISO(ultimoEvento!.fecha), "d 'de' MMMM yyyy", { locale: es })}
                </p>
                <p className="text-xs text-white/70 pt-2">
                  Consultar MEV periódicamente para detectar la sentencia.
                </p>
              </div>

              {(autosNivelAlerta === 'amarillo' || autosNivelAlerta === 'rojo') && (
                <div className={cn(
                  'flex items-start gap-2 p-3 rounded-xl backdrop-blur-md border',
                  autosNivelAlerta === 'rojo'
                    ? 'bg-rose-500/20 border-rose-300/40'
                    : 'bg-amber-500/20 border-amber-300/40'
                )}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-bold leading-snug">
                    {autosNivelAlerta === 'rojo'
                      ? `Más de ${diasDesdeAutos} días desde autos para sentencia. Considerar presentar pronto despacho.`
                      : `${diasDesdeAutos} días desde autos para sentencia — hacer seguimiento.`}
                  </p>
                </div>
              )}
            </div>

            <div className="relative z-10 flex items-end justify-between pt-6">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Días en espera</span>
                <div className="text-3xl font-black tracking-tighter flex items-center gap-2">
                  <Calendar size={18} className="opacity-50" />
                  {diasDesdeAutos} {diasDesdeAutos === 1 ? 'día' : 'días'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {matter.priority === 'Alta' && (
                  <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Prioridad Alta
                  </div>
                )}
              </div>
            </div>

            <Clock size={180} className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none" />
          </div>
        )}

        {/* Left: Health & Next Action */}
        {!isAutosParaSentencia && (
        <div className={cn(
          "lg:col-span-7 p-8 flex flex-col justify-between relative overflow-hidden",
          flow.health === 'Roto' ? 'bg-rose-600 text-white' :
          flow.health === 'Trabado' ? 'bg-amber-500 text-white' :
          flow.health === 'En espera' ? 'bg-sky-600 text-white' :
          'bg-slate-900 text-white'
        )}>
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                {flow.health === 'Sano' ? <CheckCircle2 size={16} /> :
                 flow.health === 'Trabado' ? <PauseCircle size={16} /> :
                 flow.health === 'Roto' ? <ShieldAlert size={16} /> :
                 <Clock size={16} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Salud: {flow.health}</span>
              {flow.health !== matter.health && (
                <span className="text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Auto</span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em]">Próxima Acción</span>
                {flow.currentStage && (
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/20 text-white/70 h-4 px-1.5">
                    {flow.currentStage}
                  </Badge>
                )}
              </div>
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl backdrop-blur-md border mt-0.5 shrink-0",
                  !(flow.nextAction || matter.nextAction) ? "bg-rose-500/20 border-rose-500/40 text-rose-100 animate-pulse" : "bg-white/10 border-white/20"
                )}>
                  <ActionIcon size={20} />
                </div>
                <div className="space-y-2">
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-black tracking-tight leading-tight",
                    !(flow.nextAction || matter.nextAction) && "text-rose-100/90"
                  )}>
                    {flow.nextAction || matter.nextAction || 'Sin próxima acción'}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!matter.nextAction && (
                      <Button
                        onClick={onNewAction}
                        variant="primary"
                        size="sm"
                        className="bg-white text-rose-600 hover:bg-white/90 border-none text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg shadow-lg"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Definir Acción
                      </Button>
                    )}
                    {(flow.nextAction || matter.nextAction) && (
                      <button
                        onClick={() => {
                          setActiveTab('flujo');
                          if (hasStageFicha) setFichaOpenStage(selectedStage);
                        }}
                        className="px-5 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold rounded-xl transition-all text-[10px] uppercase tracking-widest"
                      >
                        Resolver →
                      </button>
                    )}
                    {(() => {
                      const actionText = flow.nextAction || matter.nextAction;
                      const matched = actionText ? findTemplateForTask(actionText, matter.type as any) : null;
                      return matched ? (
                        <Button
                          onClick={() => navigate(`/plantillas?template=${matched.id}&matter=${matter.id}`)}
                          variant="primary"
                          size="sm"
                          className="bg-white/15 text-white hover:bg-white/25 border border-white/20 text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg backdrop-blur-md"
                        >
                          <FileText size={14} className="mr-1.5" />
                          Generar con Plantilla
                        </Button>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-end justify-between pt-6">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Seguimiento</span>
              <div className={cn(
                "text-xl font-black tracking-tighter flex items-center gap-2",
                !matter.nextActionDate && "text-rose-200/60"
              )}>
                <Calendar size={16} className="opacity-50" />
                {matter.nextActionDate ? format(parseISO(matter.nextActionDate), "d 'de' MMMM", { locale: es }) : 'Sin fecha'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {matter.priority === 'Alta' && (
                <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                  Prioridad Alta
                </div>
              )}
              {nextPlazo && (
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    'px-3 py-1.5 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border',
                    nextPlazoUrg === 'vencido' || nextPlazoUrg === 'critico'
                      ? 'bg-rose-500/20 border-rose-400/30 hover:bg-rose-500/30'
                      : nextPlazoUrg === 'proximo'
                        ? 'bg-amber-500/20 border-amber-300/30 hover:bg-amber-500/30'
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                  )}
                  title={`${nextPlazo.tipo} — vence ${nextPlazo.fechaVencimiento}`}
                >
                  <Clock size={12} />
                  {matterPlazosActivos.length > 1 ? `${matterPlazosActivos.length} plazos · ` : 'Plazo · '}
                  {nextPlazoUrg === 'vencido'
                    ? `Vencido ${Math.abs(nextPlazoDias!)}d`
                    : nextPlazoDias === 0
                      ? 'Vence hoy'
                      : `${nextPlazoDias}d`}
                </button>
              )}
              {totalBlockingCount > 0 && nextStageName && (
                <button
                  onClick={() => setActiveTab('flujo')}
                  className="px-3 py-1.5 bg-rose-500/20 backdrop-blur-md border border-rose-400/30 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <ShieldAlert size={12} />
                  {totalBlockingCount} bloqueo{totalBlockingCount !== 1 ? 's' : ''} → {nextStageName}
                </button>
              )}
            </div>
          </div>

          <Zap size={180} className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none" />
        </div>
        )}

        {/* Right: Responsable & Status */}
        <div className="lg:col-span-5 p-8 bg-card flex flex-col justify-between space-y-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shadow-lg",
              matter.responsible === 'Sin asignar' || !matter.responsible
                ? "bg-rose-500/10 text-rose-600 border-2 border-dashed border-rose-500/30 shadow-none"
                : "bg-primary text-primary-foreground shadow-primary/20"
            )}>
              {matter.responsible && matter.responsible !== 'Sin asignar'
                ? matter.responsible.split(' ').map(n => n[0]).join('')
                : <User size={18} />}
            </div>
            <div className="flex-1">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Responsable</div>
              <div className={cn(
                "text-sm font-bold",
                (matter.responsible === 'Sin asignar' || !matter.responsible) ? "text-rose-600" : "text-foreground"
              )}>
                {matter.responsible || 'Sin asignar'}
              </div>
              {(matter.responsible === 'Sin asignar' || !matter.responsible) && (
                <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-0.5" onClick={onEditMatter}>Asignar</button>
              )}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Última Actividad</div>
            <div className="flex items-start gap-3">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <p className="text-xs font-bold text-foreground/80 leading-relaxed">
                {timeline[0]?.title || 'Sin actividad reciente'}
                <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 opacity-50">
                  {timeline[0]?.date
                    ? format(parseISO(timeline[0].date), "d 'de' MMMM", { locale: es })
                    : '—'}
                </span>
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Estado documental</div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-1000"
                  style={{ width: `${docCompletionPct}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-foreground">{docCompletionPct}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="text-[9px] font-black uppercase tracking-widest h-8 w-fit border border-border/50"
              onClick={() => { setBlockageText(matter.blockage || ''); setIsBlockageOpen(true); }}
            >
              <AlertCircle size={12} className="mr-1.5" />
              {matter.blockage ? 'Ver Bloqueo' : 'Reportar Bloqueo'}
            </Button>

            {matter.status !== 'Archivado' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[9px] font-black uppercase tracking-widest h-8 w-fit border border-border/50"
                onClick={() => {
                  if (window.confirm(`¿Archivar "${matter.title}"? El caso pasará a estado Archivado y dejará de aparecer en listas activas. El histórico se preserva.`)) {
                    handleArchiveMatter(matter.id);
                  }
                }}
              >
                <Archive size={12} className="mr-1.5" />
                Archivar caso
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ TABS ═══════════════════════ */}
      <div>
        <div className="flex border-b border-border overflow-x-auto">
          {([
            { key: 'flujo' as const, label: 'Flujo', icon: Zap },
            { key: 'timeline' as const, label: 'Timeline', icon: Clock },
            ...(esFamilia ? [{ key: 'hijos' as const, label: 'Hijos', icon: User }] : []),
            ...(aplicaPatrimonio ? [{ key: 'patrimonio' as const, label: 'Patrimonio', icon: Coins }] : []),
            ...(aplicaReconvencion ? [{ key: 'reconvenciones' as const, label: 'Reconvenciones', icon: Layers }] : []),
            { key: 'hilos' as const, label: 'Prueba (hilos y peritos)', icon: Layers },
            { key: 'cobranzas' as const, label: 'Cobranzas', icon: Coins },
            { key: 'expediente' as const, label: 'Expediente', icon: FileText },
            { key: 'comunicaciones' as const, label: 'Comunicaciones', icon: MessageSquare },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key !== 'comunicaciones') setCommPrefill(undefined); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap shrink-0",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─────────── TAB: FLUJO ─────────── */}
        {activeTab === 'flujo' && (
          <div className="py-8 space-y-8">
            {/* Stage summary */}
            {hasStages && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-black text-foreground uppercase tracking-widest">
                    {selectedStage}
                  </h3>
                  <span className="text-sm text-muted-foreground font-bold">
                    {stageCompletedTasks.length} de {stageTasks.length} tareas completadas
                    {stageBlockingDocsCount > 0 && ` — ${stageBlockingDocsCount} doc${stageBlockingDocsCount !== 1 ? 's' : ''} pendiente${stageBlockingDocsCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
                {!isViewingCurrentStage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] font-black uppercase tracking-widest h-8 rounded-lg"
                    onClick={() => setViewingStage(null)}
                  >
                    ← Volver a etapa actual
                  </Button>
                )}
              </div>
            )}

            {/* Stage ficha button */}
            {hasStageFicha && (
              <button
                onClick={() => setFichaOpenStage(selectedStage)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all",
                  fichaFilled === fichaKeys.length && fichaFilled > 0
                    ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
                    : fichaFilled > 0
                    ? "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                )}
              >
                <FileText size={18} className={cn(
                  fichaFilled === fichaKeys.length && fichaFilled > 0 ? "text-emerald-600" :
                  fichaFilled > 0 ? "text-amber-600" : "text-primary"
                )} />
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold">{selectedTemplateStage?.fichaTitle || selectedStage}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-3">
                    {fichaFilled}/{fichaKeys.length} campos
                  </span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            )}

            {/* Blocking tasks */}
            {stageBlockingPending.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Tareas Bloqueantes</h4>
                  <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                    {stageBlockingPending.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {stageBlockingPending.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      matter={matter}
                      navigate={navigate}
                      onComplete={onCompleteTask}
                      onReopen={onReopenTask}
                      hasFicha={hasStageFicha}
                      onOpenFicha={hasStageFicha ? () => setFichaOpenStage(selectedStage) : undefined}
                      satisfiedBy={getSatisfiedBy(task)}
                      onRequestData={handleRequestData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Other pending tasks */}
            {stageNonBlockingPending.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-primary rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Otras Tareas</h4>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {stageNonBlockingPending.map(task => (
                    <TaskCard key={task.id} task={task} matter={matter} navigate={navigate} onComplete={onCompleteTask} onReopen={onReopenTask} satisfiedBy={getSatisfiedBy(task)} onRequestData={handleRequestData} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed tasks */}
            {stageCompletedTasks.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Completadas</h4>
                  <span className="text-[10px] font-black text-muted-foreground opacity-50">{stageCompletedTasks.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {stageCompletedTasks.map(task => (
                    <TaskCard key={task.id} task={task} matter={matter} navigate={navigate} onComplete={onCompleteTask} onReopen={onReopenTask} satisfiedBy={getSatisfiedBy(task)} onRequestData={handleRequestData} />
                  ))}
                </div>
              </section>
            )}

            {/* Cancelled tasks (rama superada — ej. mutación de tipo de divorcio, GAP R6) */}
            {stageCancelledTasks.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-zinc-400 rounded-full" />
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-widest">Canceladas (rama superada)</h4>
                  <span className="text-[10px] font-black text-muted-foreground opacity-50">{stageCancelledTasks.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {stageCancelledTasks.map(task => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2 opacity-70"
                      title={task.canceladaMotivo || 'Cancelada'}
                    >
                      <div className="flex items-start gap-2">
                        <Ban size={13} className="shrink-0 mt-0.5 text-zinc-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-foreground/70 line-through">{task.title}</div>
                          {task.canceladaMotivo && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">{task.canceladaMotivo}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {stageTasks.length === 0 && hasStages && (
              <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
                <CheckSquare size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No hay tareas para esta etapa</p>
              </div>
            )}

            {/* Documents */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-5 bg-primary rounded-full" />
                  <h4 className="text-sm font-black text-foreground uppercase tracking-widest">Documentación Requerida</h4>
                </div>
                <div className="flex items-center gap-2">
                  {blockingDocsCount > 0 && (
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-rose-500/20 text-rose-600 bg-rose-500/5">
                      {blockingDocsCount} Bloqueo{blockingDocsCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
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
                {allStageDocs.length > 0 ? (
                  allStageDocs.map(doc => (
                    <DocumentMatterItem
                      key={doc.id}
                      doc={doc}
                      menuOpen={docMenuOpen === doc.id}
                      onToggleMenu={() => setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)}
                      onChangeStatus={(docId, status) => { onUpdateDocument?.(docId, { status }); setDocMenuOpen(null); }}
                    />
                  ))
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
                    <FileSearch size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No hay documentos para esta etapa</p>
                    <Button variant="outline" size="sm" className="mt-4 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl" onClick={() => setIsRequestDocOpen(true)}>Cargar Documento</Button>
                  </div>
                )}
              </div>
            </section>

            {/* CTA: advance to next stage */}
            {isViewingCurrentStage && nextStageName && (
              <div className={cn(
                "p-6 rounded-2xl border space-y-4",
                totalBlockingCount > 0 ? "bg-primary/5 border-primary/20" : "bg-emerald-500/5 border-emerald-500/20"
              )}>
                <div className="flex items-center gap-3">
                  <Zap size={20} className={totalBlockingCount > 0 ? "text-primary" : "text-emerald-500"} />
                  <h4 className="text-sm font-black uppercase tracking-widest text-foreground">
                    Para avanzar a {nextStageName}
                  </h4>
                </div>

                {totalBlockingCount > 0 ? (
                  <>
                    <div className="space-y-2 pl-8">
                      {stageBlockingPending.length > 0 && (
                        <p className="text-sm text-foreground/80 flex items-center gap-2">
                          <span className="w-4 h-4 rounded border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          </span>
                          {stageBlockingPending.length} tarea{stageBlockingPending.length !== 1 ? 's' : ''} bloqueante{stageBlockingPending.length !== 1 ? 's' : ''} pendiente{stageBlockingPending.length !== 1 ? 's' : ''}
                        </p>
                      )}
                      {stageBlockingDocsCount > 0 && (
                        <p className="text-sm text-foreground/80 flex items-center gap-2">
                          <span className="w-4 h-4 rounded border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                          </span>
                          {stageBlockingDocsCount} documento{stageBlockingDocsCount !== 1 ? 's' : ''} cr\u00edtico{stageBlockingDocsCount !== 1 ? 's' : ''} faltante{stageBlockingDocsCount !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                      Complet\u00e1 los requisitos para habilitar el avance
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between pl-8">
                    <p className="text-sm font-bold text-foreground">
                      Sin bloqueos — listo para avanzar
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] font-black uppercase tracking-widest h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-lg"
                      onClick={() => {
                        // Advance to next stage by completing current stage tasks
                        // For now, just navigate to next stage view
                        const nextIdx = flow.stages.findIndex(s => s.name === nextStageName);
                        if (nextIdx >= 0) {
                          setViewingStage(nextStageName);
                        }
                      }}
                    >
                      Avanzar a {nextStageName} →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─────────── TAB: TIMELINE ─────────── */}
        {activeTab === 'timeline' && (
          <TimelinePanel matter={matter} />
        )}

        {/* ─────────── TAB: HIJOS (familia, GAP R1+R2+R3 + R13) ─────────── */}
        {activeTab === 'hijos' && esFamilia && (() => {
          // GAP UX-32: sub-tabs adentro del tab para que las cuotas no
          // queden enterradas debajo de la lista de hijos cuando la lista
          // ocupa toda la pantalla.
          const cuotaMatterId = matter.parentMatterId ?? matter.id;
          const cantHijos = hijosDelMatter.length;
          const cantCuotas = allCuotasAlim.filter(c => c.matterId === cuotaMatterId).length;
          return (
            <div className="py-8 space-y-6">
              <div className="flex items-center gap-1.5 border-b border-border/50">
                {([
                  { key: 'datos',  label: 'Datos de los hijos', count: cantHijos },
                  { key: 'cuotas', label: 'Cuotas y obligaciones', count: cantCuotas },
                ] as const).map(t => {
                  const isActive = hijosSubTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setHijosSubTab(t.key)}
                      className={cn(
                        'inline-flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px',
                        isActive
                          ? 'border-sky-600 text-sky-700'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t.label}
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black',
                        isActive ? 'bg-sky-500/15 text-sky-700 border border-sky-500/30' : 'bg-muted text-muted-foreground',
                      )}>
                        {t.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {hijosSubTab === 'datos' && <HijosPanel matterId={matter.id} />}
              {hijosSubTab === 'cuotas' && <CuotasAlimentariasPanel matterId={cuotaMatterId} />}
            </div>
          );
        })()}

        {/* ─────────── TAB: RECONVENCIONES (GAP R10) ─────────── */}
        {activeTab === 'reconvenciones' && aplicaReconvencion && (
          <div className="py-8">
            <ReconvencionesPanel matterId={matter.parentMatterId ?? matter.id} />
          </div>
        )}

        {/* ─────────── TAB: PATRIMONIO (GAP R4 + R9 + R14 + R15) ─────────── */}
        {activeTab === 'patrimonio' && aplicaPatrimonio && (
          <div className="py-8 space-y-10">
            <BienesPanel matterId={patrimonioMatterId} />
            <div className="border-t border-border/40" />
            <CautelaresPanel matterId={patrimonioMatterId} />
          </div>
        )}

        {/* ─────────── TAB: HILOS Y PERITOS ─────────── */}
        {activeTab === 'hilos' && (
          <div className="py-8 space-y-10">
            <HilosPanel matterId={matter.id} />
            <div className="border-t border-border/40" />
            <PeritosPanel matterId={matter.id} />
          </div>
        )}

        {/* ─────────── TAB: COBRANZAS ─────────── */}
        {activeTab === 'cobranzas' && (
          <div className="py-8 space-y-10">
            <CompensacionPanel matterId={matter.id} />
            <div className="border-t border-border/40" />
            <HonorariosRegPanel matterId={matter.id} />
          </div>
        )}

        {/* ─────────── TAB: EXPEDIENTE ─────────── */}
        {activeTab === 'expediente' && (
          <div className="py-8 space-y-10">
            {/* Sub-procesos (incidentes y apelaciones) — GAP 1.
                Solo lo mostramos en casos principales para evitar anidamiento. */}
            {!isSubProceso && (
              <section id="subprocesos-section">
                <SubProcesosPanel
                  matter={matter}
                  onOpenMatter={(id) => navigate(`/asuntos/${id}`)}
                />
              </section>
            )}

            {/* Causas relacionadas (cross-fuero) — GAP R12.
                Cualquier matter puede tener una causa paralela (penal,
                administrativa, etc.) que impacte su trámite. */}
            <section className="border-t border-border/40 pt-8">
              <CausasRelacionadasPanel matterId={matter.id} />
            </section>

            {/* Letrados de la parte / contraparte */}
            <section className="border-t border-border/40 pt-8">
              <LetradosPanel matterId={matter.id} />
            </section>

            {/* Cédulas de notificación con intentos (GAP 7) */}
            <section className="border-t border-border/40 pt-8">
              <CedulasPanel matterId={matter.id} />
            </section>

            {/* Datos del Asunto */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Datos del Asunto</h3>
              <Card className="p-6 bg-muted/30 border-border space-y-4">
                <div className="text-xs text-foreground/70 leading-relaxed italic">
                  "{matter.description || 'Sin descripción narrativa.'}"
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

            {/* Expediente Judicial */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Expediente Judicial</h3>
              {expediente === undefined ? (
                <div className="p-4 text-xs text-muted-foreground">Cargando...</div>
              ) : expediente ? (
                <Card className="p-5 bg-muted/30 border-border">
                  <ExpedienteDetail
                    expediente={expediente}
                    onUpdated={setExpediente}
                    onEdit={() => setShowExpedienteForm(true)}
                  />
                </Card>
              ) : (
                <button
                  onClick={() => setShowExpedienteForm(true)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Scale size={20} className="text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold">Crear expediente judicial</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Carátula, fuero, juzgado, MEV y seguimiento</p>
                  </div>
                </button>
              )}
            </section>

            {/* Documentación completa */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                  Documentación Completa
                  {documents.length > 0 && (
                    <span className="ml-2 text-foreground/60">
                      ({docActiveFilters > 0 ? `${filteredDocuments.length} de ${documents.length}` : documents.length})
                    </span>
                  )}
                </h3>
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

              {/* GAP 28 — buscador + filtros (solo se muestra si hay 4+ docs). */}
              {documents.length >= 4 && (
                <div className="space-y-2.5">
                  {/* Buscador */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      placeholder="Buscar por nombre, categoría o etapa..."
                      className="w-full h-10 pl-9 pr-9 bg-muted/30 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                    />
                    {docSearch && (
                      <button
                        onClick={() => setDocSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Chips de estado */}
                  {docStatusOptions.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground self-center mr-1">Estado:</span>
                      {docStatusOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDocFilterStatus(docFilterStatus === opt.value ? null : opt.value)}
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border transition-colors',
                            docFilterStatus === opt.value
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border/60 text-muted-foreground hover:border-primary/50',
                          )}
                        >
                          {opt.value} <span className="opacity-60">({opt.count})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Chips de categoría */}
                  {docCategoryOptions.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground self-center mr-1">Categoría:</span>
                      {docCategoryOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDocFilterCategory(docFilterCategory === opt.value ? null : opt.value)}
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border transition-colors',
                            docFilterCategory === opt.value
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border/60 text-muted-foreground hover:border-primary/50',
                          )}
                        >
                          {DOC_CATEGORY_LABELS[opt.value] ?? opt.value} <span className="opacity-60">({opt.count})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Limpiar filtros */}
                  {docActiveFilters > 0 && (
                    <button
                      onClick={clearDocFilters}
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <X size={12} /> Limpiar filtros ({docActiveFilters})
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {documents.length > 0 ? (
                  filteredDocuments.length > 0 ? (
                    filteredDocuments.map(doc => (
                      <DocumentMatterItem
                        key={doc.id}
                        doc={doc}
                        menuOpen={docMenuOpen === doc.id}
                        onToggleMenu={() => setDocMenuOpen(docMenuOpen === doc.id ? null : doc.id)}
                        onChangeStatus={(docId, status) => { onUpdateDocument?.(docId, { status }); setDocMenuOpen(null); }}
                      />
                    ))
                  ) : (
                    <div className="py-8 text-center border border-dashed border-border/50 rounded-2xl bg-muted/5 space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ningún documento coincide con los filtros</p>
                      <button onClick={clearDocFilters} className="text-[10px] font-bold text-primary hover:underline">
                        Limpiar filtros
                      </button>
                    </div>
                  )
                ) : (
                  <div className="py-8 text-center border border-border/50 rounded-2xl bg-muted/5">
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Sin documentos cargados</p>
                  </div>
                )}
              </div>
            </section>

            {/* Approval workflow */}
            <ApprovalWorkflow
              documents={documents}
              currentUserRole={currentUserRole}
              currentUserName={currentUser}
              onApprove={async (docId) => { onUpdateDocument?.(docId, { status: 'Aprobado' }); }}
              onReject={async (docId) => { onUpdateDocument?.(docId, { status: 'Faltante' }); }}
              onRequestApproval={async (docId) => { onUpdateDocument?.(docId, { status: 'En revisión' }); }}
            />

            {/* Hitos del Camino */}
            <section className="space-y-4">
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
                {milestones.length > 0 ? (
                  milestones.map(milestone => (
                    <div
                      key={milestone.id}
                      className={cn(
                        "p-4 bg-card border border-border rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all",
                        milestone.status === 'Completado' && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          milestone.status === 'Completado' ? "bg-emerald-500" :
                          milestone.status === 'En curso' ? "bg-amber-500" :
                          "bg-slate-300"
                        )} />
                        <div>
                          <span className={cn(
                            "text-xs font-bold text-foreground/80",
                            milestone.status === 'Completado' && "line-through"
                          )}>{milestone.label}</span>
                          {milestone.etapa && (
                            <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{milestone.etapa}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {milestone.targetDate && (
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                            {format(parseISO(milestone.targetDate), 'd MMM', { locale: es })}
                          </span>
                        )}
                        {milestone.status !== 'Completado' && onCompleteMilestone && (
                          <button
                            onClick={() => onCompleteMilestone(milestone.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-500/10 hover:text-emerald-500 rounded transition-all"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center border border-border/50 rounded-2xl bg-muted/5">
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">No hay hitos programados</p>
                    <button className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline mt-2" onClick={() => setIsAddMilestoneOpen(true)}>Programar Hitos</button>
                  </div>
                )}
              </div>
            </section>

            {/* Consolas Externas */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Consolas Externas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <QuickLink
                  icon={ExternalLink}
                  label="Consultar PJN"
                  description="Poder Judicial de la Nación"
                  iconColor="text-primary bg-primary/10"
                />
                <QuickLink
                  icon={MessageSquare}
                  label="WhatsApp Cliente"
                  description="Conversación directa"
                  iconColor="text-emerald-600 bg-emerald-500/10"
                />
                <QuickLink
                  icon={Paperclip}
                  label="Carpeta Drive"
                  description="Documentación en Drive"
                  iconColor="text-amber-600 bg-amber-500/10"
                />
              </div>
            </section>

            {/* Bitácora de Control */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Bitácora de Control</h3>
              <div className="bg-slate-900 text-white p-6 rounded-[2rem] space-y-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <MessageSquare size={48} />
                </div>
                <p className="text-xs font-bold leading-relaxed opacity-90 italic relative z-10">"Sin notas aún."</p>
                <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/40">{matter.responsible || '—'}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/40">—</div>
                </div>
              </div>
            </section>

            {/* Movimientos financieros */}
            <ClientAccountStatement clientName={matter.client} />
          </div>
        )}

        {/* ─────────── TAB: COMUNICACIONES ─────────── */}
        {activeTab === 'comunicaciones' && (
          <div className="py-8 space-y-8">
            <CommunicationsLog
              matterId={matter.id}
              currentUser={currentUser}
              initialContent={commPrefill}
              initialCanal={commPrefill ? 'WhatsApp' : undefined}
              clientPhone={clientObj?.phone}
              clientEmail={clientObj?.email}
            />

            {/* Timeline / Historial de Actividad */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                  <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Historial de Actividad</h3>
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
                        <p className="text-[10px] font-medium uppercase tracking-widest mt-1">Todavía no se registraron actividades</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-6 text-[10px] font-black uppercase tracking-widest h-9 rounded-xl" onClick={onNewAction}>Registrar Primer Movimiento</Button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* ExpedienteForm Modal */}
      {showExpedienteForm && (
        <ExpedienteForm
          matter={matter}
          existing={expediente ?? undefined}
          onClose={() => setShowExpedienteForm(false)}
          onSaved={(saved) => {
            setExpediente(saved);
            setShowExpedienteForm(false);
          }}
        />
      )}

      {/* Stage Ficha Modal */}
      {fichaOpenStage && (() => {
        const tplStage = template?.stages?.find(s => s.name === fichaOpenStage);
        if (!tplStage?.fichaFields) return null;
        return (
          <StageFicha
            isOpen={true}
            onClose={() => setFichaOpenStage(null)}
            fichaTitle={tplStage.fichaTitle || fichaOpenStage}
            stageName={fichaOpenStage}
            sections={tplStage.fichaFields}
            currentData={matter.caseData || {}}
            onSave={(newData) => {
              onUpdateMatter?.({ caseData: { ...(matter.caseData || {}), ...newData } } as Partial<Matter>);
            }}
          />
        );
      })()}

      {/* Modal: Mutar tipo de divorcio (GAP R6) */}
      {esDivorcioPrincipal && (
        <MutarDivorcioModal
          isOpen={isMutarDivorcioOpen}
          matter={matter}
          onClose={() => setIsMutarDivorcioOpen(false)}
        />
      )}

      {/* Modal: Deshacer mutación reciente (GAP UX-25) */}
      <DeshacerMutacionModal
        isOpen={isDeshacerMutacionOpen}
        evento={mutacionReversible}
        onClose={() => setIsDeshacerMutacionOpen(false)}
      />

      {/* Solicitar Documentación Modal */}
      <Modal
        isOpen={isRequestDocOpen}
        onClose={() => setIsRequestDocOpen(false)}
        title="Solicitar Documentación"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Documento</label>
            <Input placeholder="Ej: Poder Especial, Copia de DNI..." value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Criticidad</label>
              <select
                className="w-full h-10 bg-background border border-border rounded-lg px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={newDocCriticality}
                onChange={(e) => setNewDocCriticality(e.target.value as any)}
              >
                <option value="Crítico">Crítico</option>
                <option value="Recomendado">Recomendado</option>
                <option value="Opcional">Opcional</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 py-2">
            <input type="checkbox" id="blocks" className="rounded border-border" checked={newDocBlocks} onChange={(e) => setNewDocBlocks(e.target.checked)} />
            <label htmlFor="blocks" className="text-xs font-bold text-foreground">Bloquea el avance del asunto</label>
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsRequestDocOpen(false)}>Cancelar</Button>
            <Button className="flex-1" disabled={!newDocName.trim()} onClick={() => {
              onAddDocument?.({
                matterId: matter.id,
                matterTitle: matter.title,
                client: matter.client,
                responsible: matter.responsible,
                name: newDocName.trim(),
                status: 'Solicitado',
                criticality: newDocCriticality,
                blocksProgress: newDocBlocks,
                updatedAt: new Date().toISOString(),
              });
              setNewDocName(''); setNewDocCriticality('Crítico'); setNewDocBlocks(false);
              setIsRequestDocOpen(false);
            }}>Solicitar Documento</Button>
          </div>
        </div>
      </Modal>

      {/* Reportar Bloqueo Modal */}
      <Modal
        isOpen={isBlockageOpen}
        onClose={() => setIsBlockageOpen(false)}
        title="Reportar Bloqueo"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción del bloqueo</label>
            <Textarea
              placeholder="Ej: Esperando contestación de demanda..."
              value={blockageText}
              onChange={(e) => setBlockageText(e.target.value)}
              rows={3}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => {
              onUpdateMatter?.({ blockage: undefined, health: matter.health === 'Trabado' ? 'Sano' : matter.health });
              setIsBlockageOpen(false);
            }}>Limpiar Bloqueo</Button>
            <Button className="flex-1" disabled={!blockageText.trim()} onClick={() => {
              onUpdateMatter?.({ blockage: blockageText.trim(), health: 'Trabado' });
              setIsBlockageOpen(false);
            }}>Guardar Bloqueo</Button>
          </div>
        </div>
      </Modal>

      {/* Cambiar Responsable Modal */}
      <Modal
        isOpen={isResponsableOpen}
        onClose={() => setIsResponsableOpen(false)}
        title="Cambiar Responsable"
      >
        <div className="space-y-2 py-4">
          {(profiles || []).map(p => (
            <button
              key={p.fullName}
              onClick={() => { onUpdateMatter?.({ responsible: p.fullName }); setIsResponsableOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                p.fullName === matter.responsible ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                {p.fullName.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm font-bold">{p.fullName}</span>
              {p.fullName === matter.responsible && <CheckCircle2 size={14} className="ml-auto text-primary" />}
            </button>
          ))}
        </div>
      </Modal>

      {/* Agregar Hito Modal */}
      <Modal
        isOpen={isAddMilestoneOpen}
        onClose={() => setIsAddMilestoneOpen(false)}
        title="Agregar Hito del Camino"
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Hito</label>
            <Input placeholder="Ej: Audiencia de Conciliación" value={newMilestoneLabel} onChange={(e) => setNewMilestoneLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Estimada</label>
            <Input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddMilestoneOpen(false)}>Cancelar</Button>
            <Button className="flex-1" disabled={!newMilestoneLabel.trim()} onClick={() => {
              onAddMilestone?.({
                matterId: matter.id,
                label: newMilestoneLabel.trim(),
                orden: milestones.length + 1,
                status: 'Pendiente',
                targetDate: newMilestoneDate || undefined,
              });
              setNewMilestoneLabel(''); setNewMilestoneDate('');
              setIsAddMilestoneOpen(false);
            }}>Agregar Hito</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════ SUB-COMPONENTS ═══════════════════════ */

const TaskCard: React.FC<{
  task: Task;
  matter: Matter;
  navigate: (path: string) => void;
  onComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onOpenFicha?: () => void;
  hasFicha?: boolean;
  satisfiedBy?: { key: string; label: string }[];
  onRequestData?: (taskTitle: string, missing: { key: string; label: string }[]) => void;
}> = ({ task, matter, navigate, onComplete, onReopen, onOpenFicha, hasFicha, satisfiedBy, onRequestData }) => {
  const isCompleted = task.status === 'Completada';
  const caseData = matter.caseData ?? {};

  // Compute satisfaction status
  const satisfaction = satisfiedBy && satisfiedBy.length > 0 ? (() => {
    const filled = satisfiedBy.filter(f => caseData[f.key] && caseData[f.key].trim() !== '' && caseData[f.key] !== '[]');
    const missing = satisfiedBy.filter(f => !caseData[f.key] || caseData[f.key].trim() === '' || caseData[f.key] === '[]');
    return { filled, missing, allDone: missing.length === 0 };
  })() : null;

  return (
    <Card className={cn(
      "p-4 flex items-center gap-4 group transition-all",
      isCompleted
        ? "bg-muted/30 border-border/30 opacity-60"
        : task.bloqueante
        ? "hover:border-rose-500/30 bg-card border-border shadow-sm"
        : "hover:border-primary/30 bg-card border-border shadow-sm"
    )}>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isCompleted ? "bg-emerald-500/10 text-emerald-600" :
        task.bloqueante ? "bg-rose-500/10 text-rose-600" :
        "bg-primary/10 text-primary"
      )}>
        {isCompleted ? <CheckCircle2 size={20} /> : task.bloqueante ? <AlertCircle size={20} /> : <CheckSquare size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn(
            "text-sm font-bold tracking-tight",
            isCompleted && "line-through text-muted-foreground"
          )}>{task.title}</span>
          {task.bloqueante && !isCompleted && (
            <Badge variant="error" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0">Bloqueante</Badge>
          )}
        </div>
        {/* Satisfaction indicator */}
        {satisfaction && !isCompleted && (
          satisfaction.allDone ? (
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 size={11} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 tracking-wide">Datos completos</span>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenFicha?.(); }}
              className="flex items-center gap-1.5 mt-1 group/sat hover:opacity-80 transition-opacity text-left"
            >
              <AlertCircle size={11} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-amber-600 tracking-wide">
                Falta: {satisfaction.missing.map(f => f.label).join(', ')}
              </span>
            </button>
          )
        )}
        {/* Auto-completed by system */}
        {isCompleted && task.completedBy === 'Sistema' && (
          <div className="flex items-center gap-1.5 mt-1">
            <CheckCircle2 size={11} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-wide">Completada automáticamente</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
          {task.dueDate && (
            <span className="flex items-center gap-1"><Clock size={10} /> {format(parseISO(task.dueDate), 'd MMM', { locale: es })}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Show "Completar datos" button if ficha available AND there are missing fields */}
        {!isCompleted && hasFicha && onOpenFicha && satisfaction && !satisfaction.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
            onClick={(e) => { e.stopPropagation(); onOpenFicha(); }}
          >
            <FileText size={12} className="mr-1.5" />
            Completar datos
          </Button>
        )}
        {/* Show "Solicitar datos" button to send a message requesting missing data */}
        {!isCompleted && satisfaction && !satisfaction.allDone && onRequestData && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5"
            onClick={(e) => { e.stopPropagation(); onRequestData(task.title, satisfaction.missing); }}
          >
            <Send size={12} className="mr-1.5" />
            Solicitar datos
          </Button>
        )}
        {/* Show "Completar datos" if ficha but no satisfiedBy tracking */}
        {!isCompleted && hasFicha && onOpenFicha && !satisfaction && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-amber-500/30 text-amber-600 hover:bg-amber-500/5"
            onClick={(e) => { e.stopPropagation(); onOpenFicha(); }}
          >
            <FileText size={12} className="mr-1.5" />
            Completar datos
          </Button>
        )}
        {/* Show "Marcar resuelta" if all data is filled */}
        {!isCompleted && satisfaction?.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 transition-all"
            onClick={(e) => { e.stopPropagation(); onComplete?.(task.id); }}
          >
            <CheckCircle2 size={12} className="mr-1.5" />
            Marcar resuelta
          </Button>
        )}
        {!isCompleted && (() => {
          const matched = findTemplateForTask(task.title, matter.type as any);
          return matched ? (
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all border-primary/30 text-primary hover:bg-primary/5"
              onClick={(e) => { e.stopPropagation(); navigate(`/plantillas?template=${matched.id}&matter=${matter.id}`); }}
            >
              <FileText size={12} className="mr-1.5" />
              Generar
            </Button>
          ) : null;
        })()}
        {!isCompleted && !satisfaction?.allDone && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => { e.stopPropagation(); onComplete?.(task.id); }}
          >
            Resolver
          </Button>
        )}
        {isCompleted && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => { e.stopPropagation(); onReopen?.(task.id); }}
          >
            Reabrir
          </Button>
        )}
      </div>
    </Card>
  );
};

const DOC_STATUS_FLOW: LegalDocument['status'][] = ['Faltante', 'Solicitado', 'Recibido', 'En revisión', 'Aprobado', 'Listo para presentar', 'Presentado'];

const DocumentMatterItem: React.FC<{
  doc: LegalDocument;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onChangeStatus?: (docId: string, status: LegalDocument['status']) => void;
}> = ({ doc, menuOpen, onToggleMenu, onChangeStatus }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusStyles = {
    'Faltante': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    'Solicitado': 'text-sky-600 bg-sky-500/10 border-sky-500/20',
    'Recibido': 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    'En revisión': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'Aprobado': 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    'Listo para presentar': 'text-primary-foreground bg-primary border-primary',
    'Presentado': 'text-white bg-slate-900 border-slate-900',
  };

  const isMissing = doc.status === 'Faltante' || doc.status === 'Solicitado';
  const isReceived = doc.status === 'Recibido' || doc.status === 'Aprobado' || doc.status === 'Presentado';
  const isNoAplica = doc.status === 'No aplica';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mark as received when file is selected
      onChangeStatus?.(doc.id, 'Recibido');
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Card className={cn(
      "p-4 border border-border/50 group hover:border-primary/30 transition-all rounded-2xl relative",
      doc.blocksProgress && !isReceived && !isNoAplica && "border-l-4 border-l-rose-500 bg-rose-500/[0.01]",
      isNoAplica && "opacity-50",
      isReceived && "border-l-4 border-l-emerald-500"
    )}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
        onChange={handleFileUpload}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
            statusStyles[doc.status] || statusStyles['Faltante']
          )}>
            {isReceived ? <CheckCircle2 size={18} /> : isNoAplica ? <Ban size={18} /> : <FileText size={18} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn(
                "text-sm font-bold text-foreground truncate tracking-tight",
                isNoAplica && "line-through text-muted-foreground"
              )}>{doc.name}</span>
              {doc.criticality === 'Crítico' && !isNoAplica && (
                <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-1 rounded border border-rose-100">Cr\u00edtico</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{doc.status}</span>
              {doc.blocksProgress && !isReceived && !isNoAplica && (
                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert size={10} />
                  Bloquea Avance
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {doc.updatedAt && (
            <div className="text-right hidden sm:block mr-2">
              <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Actualizado</div>
              <div className="text-[10px] font-bold text-foreground">{format(parseISO(doc.updatedAt), 'd MMM', { locale: es })}</div>
            </div>
          )}

          {/* Action buttons — always visible when missing */}
          {isMissing && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all"
              >
                <Upload size={12} />
                Subir
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, 'Recibido'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 rounded-lg transition-all"
              >
                <CheckCircle2 size={12} />
                Recibido
              </button>
            </>
          )}

          {/* Received/approved actions */}
          {isReceived && (
            <>
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Eye size={12} />
                Ver
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <RefreshCw size={12} />
                Reemplazar
              </button>
            </>
          )}

          {/* 3-dot menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
            >
              <MoreHorizontal size={16} />
            </Button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-52 bg-card border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cambiar estado</div>
                {DOC_STATUS_FLOW.map(s => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, s); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-muted/50 transition-colors",
                      s === doc.status ? "text-primary bg-primary/5" : "text-foreground"
                    )}
                  >
                    {s === doc.status ? `\u2713 ${s}` : s}
                  </button>
                ))}
                <div className="border-t border-border my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onChangeStatus?.(doc.id, 'No aplica' as any); }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-muted/50 transition-colors text-muted-foreground",
                    doc.status === 'No aplica' && "text-primary bg-primary/5"
                  )}
                >
                  {doc.status === 'No aplica' ? '\u2713 No aplica' : 'Marcar como no aplica'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const QuickLink = ({ icon: Icon, label, description, iconColor }: { icon: any, label: string, description: string, iconColor: string }) => (
  <button className="w-full flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm transition-all group cursor-pointer">
    <div className="flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconColor)}>
        <Icon size={17} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{label} →</p>
        <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
    <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1 shrink-0" />
  </button>
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
