// GAP R4 + R9 + R14 — Panel de patrimonio del caso.
//
// Tres bloques en una vista:
//   1. Activos (bienes positivos)
//   2. Pasivos (deudas, mismo schema)
//   3. Sociedades interpuestas (entidades que titularizan bienes)
//
// Cada bien activo puede tener:
//   • país (R4) → badge si está en jurisdicción extranjera.
//   • sociedad interpuesta (R9) → badge clickeable + link al bloque 3.
//   • histórico de valuaciones (R14) → modal con timeline para detectar
//     vaciamiento o evolución (ej. portfolio Bull Market 42k → 28k).

import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import {
  Bien,
  BienValuacion,
  SociedadInterpuesta,
  Cautelar,
  BienNaturaleza,
  BienTipo,
  TitularRol,
  BienCaracter,
  Moneda,
  BIEN_TIPO_LABELS,
  TITULAR_ROL_LABELS,
  BIEN_CARACTER_LABELS,
  TIPO_CAUTELAR_LABELS,
} from '../types';
import { Modal, Button, Input, Textarea, Label, Badge, MoneyInput } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus, Pencil, Trash2, Building2, Globe, Network, TrendingUp, TrendingDown,
  Minus, AlertCircle, CreditCard, Coins, ShieldAlert, Wallet,
} from 'lucide-react';

interface BienesPanelProps {
  matterId: string;
}

const TIPO_ACTIVO_OPTS: BienTipo[] = [
  'inmueble', 'vehiculo', 'cuenta_bancaria', 'inversion_financiera',
  'sociedad', 'mobiliario', 'credito', 'otro',
];

const TIPO_PASIVO_OPTS: BienTipo[] = [
  'hipoteca', 'tarjeta_credito', 'prestamo_personal',
  'prestamo_prendario', 'moratoria_fiscal', 'otro',
];

const formatMoneda = (valor: number | undefined, moneda: Moneda | undefined): string => {
  if (valor == null || moneda == null) return '—';
  const symbol = moneda === 'USD' ? 'US$' : moneda === 'EUR' ? '€' : '$';
  return `${symbol} ${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Estados de cautelar que consideramos "vigentes" — afectan al bien.
const CAUTELAR_VIGENTE_STATES = ['solicitada', 'concedida', 'trabada', 'parcialmente_levantada'] as const;

export const BienesPanel: React.FC<BienesPanelProps> = ({ matterId }) => {
  const {
    bienes, bienValuaciones, sociedadesInterpuestas, cautelares,
    handleCreateBien, handleUpdateBien, handleDeleteBien,
    handleCreateBienValuacion, handleDeleteBienValuacion,
    handleCreateSociedadInterpuesta, handleUpdateSociedadInterpuesta, handleDeleteSociedadInterpuesta,
  } = useAppContext();

  const bienesDelMatter = useMemo(
    () => bienes.filter(b => b.matterId === matterId),
    [bienes, matterId],
  );
  const sociedadesDelMatter = useMemo(
    () => sociedadesInterpuestas.filter(s => s.matterId === matterId),
    [sociedadesInterpuestas, matterId],
  );
  // GAP UX-22: indexamos cautelares vigentes por bien y por sociedad
  // para mostrar un badge "bajo cautelar" en la card del bien afectado.
  const cautelaresVigentes = useMemo(
    () => cautelares.filter(c =>
      c.matterId === matterId
      && (CAUTELAR_VIGENTE_STATES as readonly string[]).includes(c.estado),
    ),
    [cautelares, matterId],
  );
  const cautelaresPorBien = useMemo(() => {
    const map = new Map<string, Cautelar[]>();
    for (const c of cautelaresVigentes) {
      if (c.bienId) {
        const arr = map.get(c.bienId) ?? [];
        arr.push(c);
        map.set(c.bienId, arr);
      }
    }
    return map;
  }, [cautelaresVigentes]);
  const cautelaresPorSociedad = useMemo(() => {
    const map = new Map<string, Cautelar[]>();
    for (const c of cautelaresVigentes) {
      if (c.sociedadInterpuestaId) {
        const arr = map.get(c.sociedadInterpuestaId) ?? [];
        arr.push(c);
        map.set(c.sociedadInterpuestaId, arr);
      }
    }
    return map;
  }, [cautelaresVigentes]);

  const activos  = bienesDelMatter.filter(b => b.naturaleza === 'activo');
  const pasivos  = bienesDelMatter.filter(b => b.naturaleza === 'pasivo');

  const [bienFormOpen,    setBienFormOpen]    = useState(false);
  const [bienFormNaturaleza, setBienFormNaturaleza] = useState<BienNaturaleza>('activo');
  const [bienEditing,     setBienEditing]     = useState<Bien | null>(null);
  const [valuacionesOpen, setValuacionesOpen] = useState<Bien | null>(null);
  const [sociedadFormOpen, setSociedadFormOpen] = useState(false);
  const [sociedadEditing,  setSociedadEditing]  = useState<SociedadInterpuesta | null>(null);

  const openNewActivo  = () => { setBienFormNaturaleza('activo');  setBienEditing(null); setBienFormOpen(true); };
  const openNewPasivo  = () => { setBienFormNaturaleza('pasivo');  setBienEditing(null); setBienFormOpen(true); };
  const openEditBien   = (b: Bien) => { setBienFormNaturaleza(b.naturaleza); setBienEditing(b); setBienFormOpen(true); };
  const openNewSociedad = () => { setSociedadEditing(null); setSociedadFormOpen(true); };
  const openEditSociedad = (s: SociedadInterpuesta) => { setSociedadEditing(s); setSociedadFormOpen(true); };

  const onDeleteBien = async (b: Bien) => {
    if (!window.confirm(`Eliminar "${b.descripcion}"? Se borran también sus valuaciones históricas.`)) return;
    await handleDeleteBien(b.id);
  };

  const onDeleteSociedad = async (s: SociedadInterpuesta) => {
    const usadaEn = bienesDelMatter.filter(b => b.sociedadInterpuestaId === s.id).length;
    const msg = usadaEn > 0
      ? `Eliminar la sociedad "${s.denominacion}"? ${usadaEn} bien${usadaEn === 1 ? '' : 'es'} apunta${usadaEn === 1 ? '' : 'n'} a ella — quedará${usadaEn === 1 ? '' : 'n'} sin sociedad asociada.`
      : `Eliminar la sociedad "${s.denominacion}"?`;
    if (!window.confirm(msg)) return;
    await handleDeleteSociedadInterpuesta(s.id);
  };

  return (
    <div className="space-y-6">
      {/* ─────────── Overview (GAP UX-19) ─────────── */}
      {bienesDelMatter.length > 0 && (
        <PatrimonioOverview activos={activos} pasivos={pasivos} cautelaresVigentes={cautelaresVigentes.length} />
      )}

      {/* ─────────── Activos ─────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Activos</h3>
              <p className="text-[11px] text-muted-foreground">
                Inmuebles, vehículos, cuentas, sociedades, inversiones. Click en el valor para ver/agregar valuaciones.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openNewActivo} className="gap-2">
            <Plus size={14} /> Nuevo activo
          </Button>
        </div>
        {activos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-xs text-muted-foreground">Sin activos cargados.</p>
          </div>
        )}
        <div className="space-y-2">
          {activos.map(b => {
            // Cautelares vigentes que afectan al bien: directamente (bien_id)
            // o indirectamente vía la sociedad que lo titulariza.
            const cautDirectas = cautelaresPorBien.get(b.id) ?? [];
            const cautViaSociedad = b.sociedadInterpuestaId
              ? cautelaresPorSociedad.get(b.sociedadInterpuestaId) ?? []
              : [];
            return (
              <BienCard
                key={b.id}
                bien={b}
                valuaciones={bienValuaciones.filter(v => v.bienId === b.id)}
                sociedad={sociedadesDelMatter.find(s => s.id === b.sociedadInterpuestaId)}
                cautelares={[...cautDirectas, ...cautViaSociedad]}
                onEdit={() => openEditBien(b)}
                onDelete={() => onDeleteBien(b)}
                onOpenValuaciones={() => setValuacionesOpen(b)}
              />
            );
          })}
        </div>
      </section>

      {/* ─────────── Pasivos ─────────── */}
      <section className="space-y-3 border-t border-border/40 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Pasivos</h3>
              <p className="text-[11px] text-muted-foreground">
                Deudas: tarjetas, préstamos, hipotecas, moratorias fiscales.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={openNewPasivo} className="gap-2">
            <Plus size={14} /> Nuevo pasivo
          </Button>
        </div>
        {pasivos.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-xs text-muted-foreground">Sin pasivos cargados.</p>
          </div>
        )}
        <div className="space-y-2">
          {pasivos.map(b => (
            <BienCard
              key={b.id}
              bien={b}
              valuaciones={bienValuaciones.filter(v => v.bienId === b.id)}
              sociedad={undefined}
              cautelares={cautelaresPorBien.get(b.id) ?? []}
              onEdit={() => openEditBien(b)}
              onDelete={() => onDeleteBien(b)}
              onOpenValuaciones={() => setValuacionesOpen(b)}
            />
          ))}
        </div>
      </section>

      {/* ─────────── Sociedades interpuestas ─────────── */}
      <section className="space-y-3 border-t border-border/40 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Network size={16} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Sociedades interpuestas</h3>
              <p className="text-[11px] text-muted-foreground">
                Entidades que titularizan bienes en lugar de la persona física. Útil para correr el velo en juicios civiles/comerciales.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={openNewSociedad} className="gap-2">
            <Plus size={14} /> Nueva sociedad
          </Button>
        </div>
        {sociedadesDelMatter.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-xs text-muted-foreground">Sin sociedades cargadas.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sociedadesDelMatter.map(s => {
            const bienesQueLaUsan = bienesDelMatter.filter(b => b.sociedadInterpuestaId === s.id);
            return (
              <SociedadCard
                key={s.id}
                sociedad={s}
                bienesAsociados={bienesQueLaUsan}
                onEdit={() => openEditSociedad(s)}
                onDelete={() => onDeleteSociedad(s)}
              />
            );
          })}
        </div>
      </section>

      {/* ─────────── Modales ─────────── */}
      <BienForm
        isOpen={bienFormOpen}
        editing={bienEditing}
        naturaleza={bienFormNaturaleza}
        sociedades={sociedadesDelMatter}
        onClose={() => setBienFormOpen(false)}
        onSave={async (data) => {
          if (bienEditing) {
            await handleUpdateBien(bienEditing.id, data);
          } else {
            await handleCreateBien({ ...data, matterId, naturaleza: bienFormNaturaleza } as Omit<Bien, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setBienFormOpen(false);
        }}
      />

      <ValuacionesModal
        isOpen={!!valuacionesOpen}
        bien={valuacionesOpen}
        valuaciones={valuacionesOpen ? bienValuaciones.filter(v => v.bienId === valuacionesOpen.id) : []}
        onClose={() => setValuacionesOpen(null)}
        onCreate={async (data) => {
          if (!valuacionesOpen) return;
          await handleCreateBienValuacion({ ...data, bienId: valuacionesOpen.id });
        }}
        onDelete={async (id) => { await handleDeleteBienValuacion(id); }}
      />

      <SociedadForm
        isOpen={sociedadFormOpen}
        editing={sociedadEditing}
        onClose={() => setSociedadFormOpen(false)}
        onSave={async (data) => {
          if (sociedadEditing) {
            await handleUpdateSociedadInterpuesta(sociedadEditing.id, data);
          } else {
            await handleCreateSociedadInterpuesta({ ...data, matterId } as Omit<SociedadInterpuesta, 'id' | 'createdAt' | 'updatedAt'>);
          }
          setSociedadFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Overview / dashboard de patrimonio (GAP UX-19) ────────────
//
// Suma totales por moneda y por titular sin convertir entre divisas
// (no hay tipo de cambio cargado y no es función de este panel).
// Muestra una grilla con: Activos · Pasivos · Neto, segmentada por
// moneda. Si todo es ARS, queda una sola fila; si hay USD/EUR/ARS
// mezclados, una fila por moneda.

interface MonedaTotales {
  moneda: Moneda;
  activos: number;
  pasivos: number;
  // Por titular (de los activos solo, los pasivos no segmentamos).
  activosCliente: number;
  activosContraparte: number;
  activosAmbos: number;
}

function computarTotales(activos: Bien[], pasivos: Bien[]): MonedaTotales[] {
  const map = new Map<Moneda, MonedaTotales>();
  const ensure = (m: Moneda): MonedaTotales => {
    if (!map.has(m)) {
      map.set(m, {
        moneda: m, activos: 0, pasivos: 0,
        activosCliente: 0, activosContraparte: 0, activosAmbos: 0,
      });
    }
    return map.get(m)!;
  };
  for (const b of activos) {
    if (b.valorActual == null || !b.monedaActual) continue;
    const t = ensure(b.monedaActual);
    t.activos += b.valorActual;
    if (b.titularRol === 'cliente') t.activosCliente += b.valorActual;
    else if (b.titularRol === 'contraparte') t.activosContraparte += b.valorActual;
    else if (b.titularRol === 'ambos') t.activosAmbos += b.valorActual;
  }
  for (const b of pasivos) {
    if (b.valorActual == null || !b.monedaActual) continue;
    const t = ensure(b.monedaActual);
    t.pasivos += b.valorActual;
  }
  // Orden estable: USD primero, después EUR, después ARS.
  const order: Record<Moneda, number> = { USD: 0, EUR: 1, ARS: 2 };
  return Array.from(map.values()).sort((a, b) => order[a.moneda] - order[b.moneda]);
}

const PatrimonioOverview: React.FC<{
  activos: Bien[];
  pasivos: Bien[];
  cautelaresVigentes: number;
}> = ({ activos, pasivos, cautelaresVigentes }) => {
  const totales = useMemo(() => computarTotales(activos, pasivos), [activos, pasivos]);
  const sinValuar = activos.filter(b => b.valorActual == null).length
                  + pasivos.filter(b => b.valorActual == null).length;

  if (totales.length === 0 && sinValuar === 0) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/5 via-card to-rose-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center">
            <Wallet size={16} className="text-foreground/70" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Resumen patrimonial</h3>
            <p className="text-[11px] text-muted-foreground">
              Totales por moneda, sin conversión. {activos.length} activo{activos.length === 1 ? '' : 's'} · {pasivos.length} pasivo{pasivos.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>
        {cautelaresVigentes > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-500/10 border-rose-500/40">
            <ShieldAlert size={12} />
            {cautelaresVigentes} cautelar{cautelaresVigentes === 1 ? '' : 'es'} vigente{cautelaresVigentes === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {totales.map(t => {
          const neto = t.activos - t.pasivos;
          const symbol = t.moneda === 'USD' ? 'US$' : t.moneda === 'EUR' ? '€' : '$';
          const fmt = (v: number) => `${symbol} ${v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
          return (
            <div key={t.moneda} className="rounded-xl border border-border/40 bg-background/60 p-3 space-y-1.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t.moneda}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Activos</span>
                <span className="text-sm font-black text-emerald-700">{fmt(t.activos)}</span>
              </div>
              {(t.activosCliente > 0 || t.activosContraparte > 0 || t.activosAmbos > 0) && (
                <div className="text-[10px] text-muted-foreground space-y-0.5 pl-3 border-l border-emerald-500/30">
                  {t.activosCliente > 0     && <div>Mi parte: <span className="font-bold text-foreground/80">{fmt(t.activosCliente)}</span></div>}
                  {t.activosContraparte > 0 && <div>Contraparte: <span className="font-bold text-foreground/80">{fmt(t.activosContraparte)}</span></div>}
                  {t.activosAmbos > 0       && <div>Ambos: <span className="font-bold text-foreground/80">{fmt(t.activosAmbos)}</span></div>}
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border/30 pt-1.5">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Pasivos</span>
                <span className="text-sm font-black text-rose-700">{fmt(t.pasivos)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border/40 pt-1.5">
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Neto</span>
                <span className={cn('text-base font-black', neto >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{fmt(neto)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {sinValuar > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          {sinValuar} bien{sinValuar === 1 ? '' : 'es'} sin valuación cargada — no entra{sinValuar === 1 ? '' : 'n'} en los totales.
        </p>
      )}
    </section>
  );
};

// ─── Card de un bien (activo o pasivo) ─────────────────────────

const BienCard: React.FC<{
  bien: Bien;
  valuaciones: BienValuacion[];
  sociedad?: SociedadInterpuesta;
  cautelares: Cautelar[];
  onEdit: () => void;
  onDelete: () => void;
  onOpenValuaciones: () => void;
}> = ({ bien: b, valuaciones, sociedad, cautelares, onEdit, onDelete, onOpenValuaciones }) => {
  const enExterior = !!b.pais && b.pais.toLowerCase() !== 'argentina';
  const tieneSociedad = !!sociedad;
  const tieneHistorico = valuaciones.length > 0;
  const tieneCautelar = cautelares.length > 0;

  // Si hay valuación previa distinta de la actual, mostramos la diferencia.
  const valuacionesOrden = useMemo(
    () => valuaciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [valuaciones],
  );
  const ultimaPrevia = valuacionesOrden[1]; // 0 sería la más reciente
  const hayCambio = b.valorActual != null && ultimaPrevia
    && ultimaPrevia.moneda === b.monedaActual
    && ultimaPrevia.valor !== b.valorActual;
  const variacionTxt = hayCambio
    ? (b.valorActual! > ultimaPrevia.valor ? '↑ ' : '↓ ')
      + formatMoneda(Math.abs(b.valorActual! - ultimaPrevia.valor), b.monedaActual)
    : null;

  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-colors',
      tieneCautelar
        ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60'
        : 'border-border/60 bg-card hover:border-emerald-500/30',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{b.descripcion}</span>
            <Badge variant="outline" className="text-[9px]">{BIEN_TIPO_LABELS[b.tipo]}</Badge>
            <Badge variant="outline" className="text-[9px]">{TITULAR_ROL_LABELS[b.titularRol]}</Badge>
            {b.caracter && b.caracter !== 'no_aplica' && (
              <Badge variant="outline" className="text-[9px]">{BIEN_CARACTER_LABELS[b.caracter]}</Badge>
            )}
            {enExterior && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-500/10 border-sky-500/30">
                <Globe size={11} /> {b.pais}
              </span>
            )}
            {tieneSociedad && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-violet-700 bg-violet-500/10 border-violet-500/30">
                <Network size={11} /> Vía {sociedad!.denominacion}
              </span>
            )}
            {/* GAP UX-22: badge cuando el bien está bajo cautelar vigente */}
            {tieneCautelar && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-500/10 border-rose-500/40"
                title={cautelares.map(c => `${TIPO_CAUTELAR_LABELS[c.tipo]}${c.fechaTraba ? ' (trabada ' + c.fechaTraba + ')' : ''}`).join(' · ')}
              >
                <ShieldAlert size={11} />
                {cautelares.length === 1 ? 'Bajo cautelar' : `${cautelares.length} cautelares`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <button
              onClick={onOpenValuaciones}
              className="inline-flex items-center gap-1 text-foreground hover:text-emerald-700 font-bold"
              title="Ver / agregar valuaciones"
            >
              <Coins size={11} className="text-muted-foreground" />
              {formatMoneda(b.valorActual, b.monedaActual)}
              {b.fechaValuacionActual && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({format(parseISO(b.fechaValuacionActual), "d MMM yyyy", { locale: es })})
                </span>
              )}
              {variacionTxt && (
                <span className={cn('ml-1 font-bold', hayCambio && b.valorActual! > ultimaPrevia.valor ? 'text-emerald-600' : 'text-rose-600')}>
                  {variacionTxt}
                </span>
              )}
            </button>
            {tieneHistorico && (
              <span className="text-muted-foreground italic">
                · {valuaciones.length} valuación{valuaciones.length === 1 ? '' : 'es'} registrada{valuaciones.length === 1 ? '' : 's'}
              </span>
            )}
            {b.titularDetalle && (
              <span className="text-muted-foreground italic">· {b.titularDetalle}</span>
            )}
          </div>

          {b.observaciones && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2">{b.observaciones}</p>
          )}
          {b.notas && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2">{b.notas}</p>
          )}
          {/* GAP UX-22: detalle de cautelares vigentes que afectan al bien */}
          {tieneCautelar && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-1.5 space-y-0.5">
              {cautelares.map(c => (
                <div key={c.id} className="text-[11px] text-rose-800 dark:text-rose-200">
                  <ShieldAlert size={11} className="inline -mt-0.5 mr-1" />
                  <span className="font-bold">{TIPO_CAUTELAR_LABELS[c.tipo]}</span>
                  {c.fechaTraba && <span className="text-rose-700/70"> · trabada {c.fechaTraba}</span>}
                  {c.estado === 'parcialmente_levantada' && (
                    <span className="ml-1 italic">(parcialmente levantada)</span>
                  )}
                </div>
              ))}
              <p className="text-[10px] text-rose-700/70 italic">
                Detalle y levantamientos en la sección "Medidas cautelares" abajo.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenValuaciones}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Valuaciones"
          >
            <TrendingUp size={14} />
          </button>
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

// ─── Card de una sociedad interpuesta ──────────────────────────

const SociedadCard: React.FC<{
  sociedad: SociedadInterpuesta;
  bienesAsociados: Bien[];
  onEdit: () => void;
  onDelete: () => void;
}> = ({ sociedad: s, bienesAsociados, onEdit, onDelete }) => (
  <div className="rounded-2xl border border-border/60 bg-card p-4 hover:border-violet-500/30 transition-colors">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{s.denominacion}</span>
          {s.tipoSocietario && <Badge variant="outline" className="text-[9px]">{s.tipoSocietario}</Badge>}
          {s.jurisdiccion && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-500/10 border-sky-500/30">
              <Globe size={11} /> {s.jurisdiccion}
            </span>
          )}
        </div>
        {s.cuitOIdFiscal && (
          <p className="text-[10px] text-muted-foreground font-mono">{s.cuitOIdFiscal}</p>
        )}
        {s.accionistasDesc && (
          <p className="text-[11px] text-foreground/90">{s.accionistasDesc}</p>
        )}
        {bienesAsociados.length > 0 && (
          <p className="text-[11px] text-violet-700 dark:text-violet-300">
            Titulariza {bienesAsociados.length} bien{bienesAsociados.length === 1 ? '' : 'es'} del caso
          </p>
        )}
        {s.observaciones && (
          <p className="text-[11px] text-muted-foreground italic line-clamp-2">{s.observaciones}</p>
        )}
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

// ─── Form de bien ──────────────────────────────────────────────

interface BienFormProps {
  isOpen: boolean;
  editing: Bien | null;
  naturaleza: BienNaturaleza;
  sociedades: SociedadInterpuesta[];
  onClose: () => void;
  onSave: (data: Partial<Bien>) => Promise<void>;
}

const BienForm: React.FC<BienFormProps> = ({ isOpen, editing, naturaleza, sociedades, onClose, onSave }) => {
  const opts = naturaleza === 'activo' ? TIPO_ACTIVO_OPTS : TIPO_PASIVO_OPTS;
  const [tipo, setTipo]                       = useState<BienTipo>(opts[0]);
  const [descripcion, setDescripcion]         = useState('');
  const [pais, setPais]                       = useState('');
  const [titularRol, setTitularRol]           = useState<TitularRol>('cliente');
  const [titularDetalle, setTitularDetalle]   = useState('');
  const [valorActual, setValorActual]         = useState('');
  const [monedaActual, setMonedaActual]       = useState<Moneda>('ARS');
  const [fechaValuacion, setFechaValuacion]   = useState('');
  const [sociedadId, setSociedadId]           = useState('');
  const [caracter, setCaracter]               = useState<BienCaracter | ''>('');
  const [observaciones, setObservaciones]     = useState('');
  const [notas, setNotas]                     = useState('');
  const [saving, setSaving]                   = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setTipo(editing?.tipo ?? opts[0]);
    setDescripcion(editing?.descripcion ?? '');
    setPais(editing?.pais ?? '');
    setTitularRol(editing?.titularRol ?? 'cliente');
    setTitularDetalle(editing?.titularDetalle ?? '');
    setValorActual(editing?.valorActual != null ? String(editing.valorActual) : '');
    setMonedaActual(editing?.monedaActual ?? 'ARS');
    setFechaValuacion(editing?.fechaValuacionActual ?? '');
    setSociedadId(editing?.sociedadInterpuestaId ?? '');
    setCaracter(editing?.caracter ?? '');
    setObservaciones(editing?.observaciones ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = descripcion.trim().length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      const valorNum = valorActual.trim() ? Number(valorActual.replace(',', '.')) : undefined;
      await onSave({
        tipo,
        descripcion: descripcion.trim(),
        pais:                  pais.trim() || undefined,
        titularRol,
        titularDetalle:        titularDetalle.trim()  || undefined,
        valorActual:           Number.isFinite(valorNum) ? valorNum : undefined,
        monedaActual:          valorNum != null ? monedaActual : undefined,
        fechaValuacionActual:  fechaValuacion || undefined,
        sociedadInterpuestaId: sociedadId    || undefined,
        caracter:              (caracter || undefined) as BienCaracter | undefined,
        observaciones:         observaciones.trim() || undefined,
        notas:                 notas.trim()         || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar ${naturaleza === 'activo' ? 'activo' : 'pasivo'}` : `Nuevo ${naturaleza === 'activo' ? 'activo' : 'pasivo'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo *</Label>
            <select value={tipo} onChange={e => setTipo(e.target.value as BienTipo)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              {opts.map(t => <option key={t} value={t}>{BIEN_TIPO_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <Label>Titular *</Label>
            <select value={titularRol} onChange={e => setTitularRol(e.target.value as TitularRol)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="cliente">{TITULAR_ROL_LABELS.cliente}</option>
              <option value="contraparte">{TITULAR_ROL_LABELS.contraparte}</option>
              <option value="ambos">{TITULAR_ROL_LABELS.ambos}</option>
              <option value="tercero">{TITULAR_ROL_LABELS.tercero}</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Descripción *</Label>
          <Input
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder={naturaleza === 'activo'
              ? 'Ej: Departamento Juncal 2245, 12° A, CABA'
              : 'Ej: Hipoteca Banco Nación sobre Juncal 2245'}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>País</Label>
            <Input
              value={pais}
              onChange={e => setPais(e.target.value)}
              placeholder="Argentina (default si está en blanco)"
            />
          </div>
          <div>
            <Label>{naturaleza === 'activo' ? 'Detalle del titular' : 'Acreedor'}</Label>
            <Input
              value={titularDetalle}
              onChange={e => setTitularDetalle(e.target.value)}
              placeholder={naturaleza === 'activo' ? 'Ej: Tercero — sociedad uruguaya' : 'Ej: Banco Nación'}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Valor actual</Label>
            <Input
              type="text"
              value={valorActual}
              onChange={e => setValorActual(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="Ej: 420000.00"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <select value={monedaActual} onChange={e => setMonedaActual(e.target.value as Moneda)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha de la valuación</Label>
            <Input type="date" value={fechaValuacion} onChange={e => setFechaValuacion(e.target.value)} />
          </div>
          <div>
            <Label>Carácter (divorcio)</Label>
            <select value={caracter} onChange={e => setCaracter(e.target.value as BienCaracter | '')} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="">No aplica / sin dato</option>
              <option value="propio">{BIEN_CARACTER_LABELS.propio}</option>
              <option value="ganancial">{BIEN_CARACTER_LABELS.ganancial}</option>
              <option value="comun">{BIEN_CARACTER_LABELS.comun}</option>
            </select>
          </div>
        </div>

        {naturaleza === 'activo' && sociedades.length > 0 && (
          <div>
            <Label>Sociedad interpuesta (opcional)</Label>
            <select value={sociedadId} onChange={e => setSociedadId(e.target.value)} className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold">
              <option value="">Sin sociedad — titularidad directa</option>
              {sociedades.map(s => (
                <option key={s.id} value={s.id}>
                  {s.denominacion}{s.jurisdiccion ? ` (${s.jurisdiccion})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground italic mt-1">
              Si el bien no está a nombre directo del titular sino de una sociedad, marcalo acá.
            </p>
          </div>
        )}

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

// ─── Modal de valuaciones (R14) ───────────────────────────────

const ValuacionesModal: React.FC<{
  isOpen: boolean;
  bien: Bien | null;
  valuaciones: BienValuacion[];
  onClose: () => void;
  onCreate: (data: Omit<BienValuacion, 'id' | 'createdAt' | 'bienId'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ isOpen, bien, valuaciones, onClose, onCreate, onDelete }) => {
  const [fecha, setFecha]   = useState('');
  const [valor, setValor]   = useState('');
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  const [fuente, setFuente] = useState('');
  const [notas, setNotas]   = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setFecha(new Date().toISOString().slice(0, 10));
    setValor(''); setFuente(''); setNotas('');
    setMoneda(bien?.monedaActual ?? 'ARS');
  }, [isOpen, bien]);

  const valuacionesOrden = useMemo(
    () => valuaciones.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [valuaciones],
  );

  const puedeGuardar = fecha.trim().length > 0 && valor.trim().length > 0;

  const handleAgregar = async () => {
    if (!puedeGuardar) return;
    const valorNum = Number(valor.replace(',', '.'));
    if (!Number.isFinite(valorNum) || valorNum < 0) return;
    setSaving(true);
    try {
      await onCreate({ fecha, valor: valorNum, moneda, fuente: fuente.trim() || undefined, notas: notas.trim() || undefined });
      setValor(''); setFuente(''); setNotas('');
    } finally {
      setSaving(false);
    }
  };

  if (!bien) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Valuaciones — ${bien.descripcion}`}
      footer={<Button variant="ghost" onClick={onClose}>Cerrar</Button>}
    >
      <div className="space-y-5">
        {/* Listado */}
        <section className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Histórico ({valuacionesOrden.length})
          </h4>
          {valuacionesOrden.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
              Sin valuaciones registradas. Agregá la primera abajo — la próxima creará un snapshot que permite ver evolución.
            </div>
          )}
          {valuacionesOrden.map((v, idx) => {
            const previa = valuacionesOrden[idx + 1];
            const variacion = previa && previa.moneda === v.moneda
              ? v.valor - previa.valor
              : null;
            return (
              <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{formatMoneda(v.valor, v.moneda)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(parseISO(v.fecha), "d 'de' MMMM yyyy", { locale: es })}
                    </span>
                    {variacion != null && variacion !== 0 && (
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] font-bold',
                        variacion > 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}>
                        {variacion > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatMoneda(Math.abs(variacion), v.moneda)}
                      </span>
                    )}
                  </div>
                  {v.fuente && <p className="text-[10px] text-muted-foreground italic">{v.fuente}</p>}
                  {v.notas  && <p className="text-[10px] text-muted-foreground italic line-clamp-2">{v.notas}</p>}
                </div>
                <button
                  onClick={() => onDelete(v.id)}
                  className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                  title="Eliminar valuación"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </section>

        {/* Form de nueva valuación */}
        <section className="space-y-3 border-t border-border/40 pt-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Agregar valuación
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Fecha *</Label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input
                type="text"
                value={valor}
                onChange={e => setValor(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="42000"
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
          <div>
            <Label>Fuente</Label>
            <Input
              value={fuente}
              onChange={e => setFuente(e.target.value)}
              placeholder="Ej: Tasación Arq. Díaz / HSBC informa / Bull Market 30/09/2026"
            />
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" />
          </div>
          <Button onClick={handleAgregar} disabled={saving || !puedeGuardar} className="w-full gap-2">
            <Plus size={14} /> Agregar valuación
          </Button>
        </section>
      </div>
    </Modal>
  );
};

// ─── Form de sociedad interpuesta ──────────────────────────────

interface SociedadFormProps {
  isOpen: boolean;
  editing: SociedadInterpuesta | null;
  onClose: () => void;
  onSave: (data: Partial<SociedadInterpuesta>) => Promise<void>;
}

const SociedadForm: React.FC<SociedadFormProps> = ({ isOpen, editing, onClose, onSave }) => {
  const [denominacion, setDenominacion]       = useState('');
  const [tipoSocietario, setTipoSocietario]   = useState('');
  const [jurisdiccion, setJurisdiccion]       = useState('');
  const [cuitOIdFiscal, setCuitOIdFiscal]     = useState('');
  const [accionistasDesc, setAccionistasDesc] = useState('');
  const [observaciones, setObservaciones]     = useState('');
  const [notas, setNotas]                     = useState('');
  const [saving, setSaving]                   = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setDenominacion(editing?.denominacion ?? '');
    setTipoSocietario(editing?.tipoSocietario ?? '');
    setJurisdiccion(editing?.jurisdiccion ?? '');
    setCuitOIdFiscal(editing?.cuitOIdFiscal ?? '');
    setAccionistasDesc(editing?.accionistasDesc ?? '');
    setObservaciones(editing?.observaciones ?? '');
    setNotas(editing?.notas ?? '');
  }, [isOpen, editing]);

  const puedeGuardar = denominacion.trim().length > 0;

  const handleSubmit = async () => {
    if (!puedeGuardar) return;
    setSaving(true);
    try {
      await onSave({
        denominacion:    denominacion.trim(),
        tipoSocietario:  tipoSocietario.trim()  || undefined,
        jurisdiccion:    jurisdiccion.trim()    || undefined,
        cuitOIdFiscal:   cuitOIdFiscal.trim()   || undefined,
        accionistasDesc: accionistasDesc.trim() || undefined,
        observaciones:   observaciones.trim()   || undefined,
        notas:           notas.trim()           || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar sociedad — ${editing.denominacion}` : 'Nueva sociedad interpuesta'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !puedeGuardar}>
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear sociedad')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Denominación *</Label>
          <Input value={denominacion} onChange={e => setDenominacion(e.target.value)} placeholder="Ej: Playa Serena S.A." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo societario</Label>
            <Input value={tipoSocietario} onChange={e => setTipoSocietario(e.target.value)} placeholder="SA / SRL / LLC / etc." />
          </div>
          <div>
            <Label>Jurisdicción</Label>
            <Input value={jurisdiccion} onChange={e => setJurisdiccion(e.target.value)} placeholder="Argentina / Uruguay / EEUU / etc." />
          </div>
        </div>
        <div>
          <Label>CUIT / ID fiscal</Label>
          <Input value={cuitOIdFiscal} onChange={e => setCuitOIdFiscal(e.target.value)} placeholder="30-12345678-9 / RUT / EIN" />
        </div>
        <div>
          <Label>Accionistas / participación</Label>
          <Textarea
            value={accionistasDesc}
            onChange={e => setAccionistasDesc(e.target.value)}
            placeholder="Ej: Único accionista: Sebastián Ruiz (100%). Constituida 2021."
            className="min-h-[80px]"
          />
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
