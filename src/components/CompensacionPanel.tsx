import React, { useMemo, useState } from 'react';
import { useAppContext } from '../lib/AppContext';
import { CompensacionEconomica, CuotaCompensacion, Moneda, FrecuenciaCuota, EstadoCompensacion } from '../types';
import { Modal, Button, Input, Textarea, Label, Badge } from './UI';
import { cn } from '../lib/utils';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Coins, Plus, CheckCircle2, Clock, AlertTriangle, Trash2, Pencil, FileText, Calendar } from 'lucide-react';

interface CompensacionPanelProps {
  matterId: string;
}

const MONEDA_OPTS: { value: Moneda; label: string; symbol: string }[] = [
  { value: 'ARS', label: 'Pesos (ARS)',     symbol: '$' },
  { value: 'USD', label: 'Dólares (USD)',   symbol: 'US$' },
  { value: 'EUR', label: 'Euros (EUR)',     symbol: '€' },
];

const FRECUENCIA_OPTS: { value: FrecuenciaCuota; label: string }[] = [
  { value: 'mensual',    label: 'Mensual' },
  { value: 'bimestral',  label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral' },
  { value: 'anual',      label: 'Anual' },
  { value: 'unica',      label: 'Pago único' },
];

const ESTADO_COMP_LABEL: Record<EstadoCompensacion, string> = {
  vigente:      'Vigente',
  cumplida:     'Cumplida',
  incumplida:   'Incumplida',
  renegociada:  'Renegociada',
};

const formatMonto = (monto: number, moneda: Moneda) => {
  const symbol = MONEDA_OPTS.find(o => o.value === moneda)?.symbol ?? '$';
  return `${symbol} ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const CompensacionPanel: React.FC<CompensacionPanelProps> = ({ matterId }) => {
  const { compensaciones, cuotasCompensacion, handleCreateCompensacion, handleDeleteCompensacion, handleMarcarCuotaPagada } = useAppContext();
  const compsDelMatter = useMemo(
    () => compensaciones.filter(c => c.matterId === matterId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [compensaciones, matterId],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Coins size={16} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Compensación económica</h3>
            <p className="text-[11px] text-muted-foreground">Calendario de cuotas y tracking de pagos post-sentencia</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus size={14} />
          Nueva compensación
        </Button>
      </div>

      {compsDelMatter.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
          <Coins size={28} className="mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            Sin compensaciones cargadas. Cuando la sentencia fije una compensación
            económica (art. 441 CCyCN), agregála acá con el calendario de cuotas
            y Lawstream te avisará los vencimientos.
          </p>
        </div>
      )}

      {compsDelMatter.map(comp => (
        <CompensacionCard
          key={comp.id}
          compensacion={comp}
          cuotas={cuotasCompensacion.filter(c => c.compensacionId === comp.id)}
          onDelete={() => handleDeleteCompensacion(comp.id)}
          onMarcarPagada={handleMarcarCuotaPagada}
        />
      ))}

      <CompensacionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={async (data) => {
          await handleCreateCompensacion({ ...data, matterId } as Omit<CompensacionEconomica, 'id' | 'createdAt' | 'updatedAt'>);
          setIsFormOpen(false);
        }}
      />
    </div>
  );
};

// ─── Card de una compensación con su lista de cuotas ────────────

const CompensacionCard: React.FC<{
  compensacion: CompensacionEconomica;
  cuotas: CuotaCompensacion[];
  onDelete: () => void;
  onMarcarPagada: (cuotaId: string, fechaPago: string, montoPagado: number, comprobanteUrl?: string) => Promise<void>;
}> = ({ compensacion: c, cuotas, onDelete, onMarcarPagada }) => {
  const cuotasOrden = useMemo(() => cuotas.slice().sort((a, b) => a.numero - b.numero), [cuotas]);
  const pagadas = cuotasOrden.filter(x => x.estado === 'pagada').length;
  const totalPagado = cuotasOrden.reduce((acc, cu) => acc + (cu.montoPagado ?? 0), 0);
  const proximaPendiente = cuotasOrden.find(x => x.estado === 'pendiente' || x.estado === 'parcial' || x.estado === 'mora');
  const ahora = new Date();
  const enMora = cuotasOrden.filter(x =>
    (x.estado === 'pendiente' || x.estado === 'parcial' || x.estado === 'mora') &&
    differenceInCalendarDays(parseISO(x.fechaVencimiento), ahora) < 0,
  );

  const onConfirmarDelete = () => {
    if (!window.confirm(`Eliminar la compensación de ${formatMonto(c.montoTotal, c.moneda)}? Se borran también todas sus cuotas.`)) return;
    onDelete();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Cabecera */}
      <div className="p-4 bg-emerald-500/5 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-emerald-700">{formatMonto(c.montoTotal, c.moneda)}</span>
              <Badge variant="default" className="text-[9px]">{c.cantidadCuotas} cuotas</Badge>
              <Badge variant="default" className="text-[9px]">{FRECUENCIA_OPTS.find(o => o.value === c.frecuencia)?.label}</Badge>
              <Badge variant="default" className="text-[9px]">{ESTADO_COMP_LABEL[c.estado]}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              <span><Calendar size={11} className="inline mr-1" />Primera: {c.fechaPrimeraCuota}</span>
              {c.tasaInteresAnual && <span>Interés: {c.tasaInteresAnual}% anual</span>}
            </div>
            {c.notas && <p className="text-[11px] text-muted-foreground italic mt-1.5">{c.notas}</p>}
          </div>
          <button
            onClick={onConfirmarDelete}
            className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
            title="Eliminar compensación"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Resumen en 3 chips */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-lg bg-card p-2 border border-border/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Pagadas</p>
            <p className="text-sm font-bold text-emerald-700">{pagadas}/{c.cantidadCuotas}</p>
            <p className="text-[10px] text-muted-foreground">{formatMonto(totalPagado, c.moneda)}</p>
          </div>
          <div className="rounded-lg bg-card p-2 border border-border/40">
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Próxima</p>
            <p className="text-sm font-bold text-foreground">
              {proximaPendiente ? `Cuota ${proximaPendiente.numero}` : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {proximaPendiente ? proximaPendiente.fechaVencimiento : 'Todas pagadas'}
            </p>
          </div>
          <div className={cn(
            "rounded-lg p-2 border",
            enMora.length > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-card border-border/40",
          )}>
            <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">En mora</p>
            <p className={cn("text-sm font-bold", enMora.length > 0 ? "text-rose-700" : "text-foreground")}>
              {enMora.length}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {enMora.length > 0 ? `${formatMonto(enMora.reduce((s, x) => s + x.monto, 0), c.moneda)}` : 'Al día'}
            </p>
          </div>
        </div>
      </div>

      {/* Lista de cuotas */}
      <div className="divide-y divide-border/40">
        {cuotasOrden.map(cu => (
          <CuotaRow
            key={cu.id}
            cuota={cu}
            moneda={c.moneda}
            onMarcarPagada={onMarcarPagada}
          />
        ))}
      </div>
    </div>
  );
};

const CuotaRow: React.FC<{
  cuota: CuotaCompensacion;
  moneda: Moneda;
  onMarcarPagada: (id: string, fecha: string, monto: number, comprobante?: string) => Promise<void>;
}> = ({ cuota, moneda, onMarcarPagada }) => {
  const [pagoOpen, setPagoOpen] = useState(false);
  const ahora = new Date();
  const diasARestantes = differenceInCalendarDays(parseISO(cuota.fechaVencimiento), ahora);
  const enMora = cuota.estado !== 'pagada' && cuota.estado !== 'parcial' && diasARestantes < 0;
  const isPagada = cuota.estado === 'pagada';
  const isParcial = cuota.estado === 'parcial';

  const fechaLabel = (() => {
    try { return format(parseISO(cuota.fechaVencimiento), "d MMM yyyy", { locale: es }); }
    catch { return cuota.fechaVencimiento; }
  })();

  return (
    <div className={cn(
      "p-3 flex items-center justify-between gap-3 flex-wrap",
      isPagada && "bg-emerald-500/5",
      enMora && "bg-rose-500/5",
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black",
          isPagada ? "bg-emerald-500/20 text-emerald-700" :
          enMora   ? "bg-rose-500/20 text-rose-700" :
                     "bg-muted text-muted-foreground",
        )}>
          {cuota.numero}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{formatMonto(cuota.monto, moneda)}</span>
            {isPagada && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700">
                <CheckCircle2 size={9} />
                Pagada {cuota.fechaPago}
              </span>
            )}
            {isParcial && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700">
                Parcial {cuota.montoPagado != null ? formatMonto(cuota.montoPagado, moneda) : ''}
              </span>
            )}
            {enMora && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700">
                <AlertTriangle size={9} />
                Mora {Math.abs(diasARestantes)}d
              </span>
            )}
            {!isPagada && !isParcial && !enMora && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                <Clock size={9} />
                {diasARestantes === 0 ? 'Vence hoy' : `${diasARestantes}d`}
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Vence {fechaLabel}
            {cuota.comprobanteUrl && (
              <> · <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5"><FileText size={9} />Comprobante</a></>
            )}
          </p>
        </div>
      </div>

      {!isPagada && (
        <button
          onClick={() => setPagoOpen(true)}
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg transition-all"
        >
          <CheckCircle2 size={12} />
          Marcar pagada
        </button>
      )}

      <PagoModal
        isOpen={pagoOpen}
        onClose={() => setPagoOpen(false)}
        cuota={cuota}
        moneda={moneda}
        onConfirm={async (fecha, monto, comprobante) => {
          await onMarcarPagada(cuota.id, fecha, monto, comprobante);
          setPagoOpen(false);
        }}
      />
    </div>
  );
};

// ─── Form: nueva compensación ────────────────────────────────────

const CompensacionForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CompensacionEconomica>) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
  const [montoTotal, setMontoTotal]                 = useState('');
  const [moneda, setMoneda]                         = useState<Moneda>('ARS');
  const [cantidadCuotas, setCantidadCuotas]         = useState('12');
  const [frecuencia, setFrecuencia]                 = useState<FrecuenciaCuota>('mensual');
  const [fechaPrimeraCuota, setFechaPrimeraCuota]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tasaInteresAnual, setTasaInteresAnual]     = useState('');
  const [notas, setNotas]                           = useState('');
  const [saving, setSaving]                         = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setMontoTotal('');
    setMoneda('ARS');
    setCantidadCuotas('12');
    setFrecuencia('mensual');
    setFechaPrimeraCuota(format(new Date(), 'yyyy-MM-dd'));
    setTasaInteresAnual('');
    setNotas('');
  }, [isOpen]);

  const monto = parseFloat(montoTotal);
  const cuotas = parseInt(cantidadCuotas, 10);
  const tasa = tasaInteresAnual.trim() ? parseFloat(tasaInteresAnual) : undefined;
  const valido = !isNaN(monto) && monto > 0 && !isNaN(cuotas) && cuotas >= 1 && fechaPrimeraCuota;

  const handleSubmit = async () => {
    if (!valido) return;
    setSaving(true);
    try {
      await onSave({
        montoTotal:        monto,
        moneda,
        cantidadCuotas:    frecuencia === 'unica' ? 1 : cuotas,
        frecuencia,
        fechaPrimeraCuota,
        tasaInteresAnual:  tasa,
        estado:            'vigente',
        notas:             notas.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title="Nueva compensación económica"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !valido}>
            {saving ? 'Generando…' : 'Crear y generar cuotas'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Label>Monto total</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={montoTotal}
              onChange={e => setMontoTotal(e.target.value)}
              placeholder="50000000"
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <select
              value={moneda}
              onChange={e => setMoneda(e.target.value as Moneda)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {MONEDA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cantidad de cuotas</Label>
            <Input
              type="number"
              min="1"
              value={cantidadCuotas}
              onChange={e => setCantidadCuotas(e.target.value)}
              disabled={frecuencia === 'unica'}
            />
            {frecuencia === 'unica' && (
              <p className="text-[10px] text-muted-foreground mt-1">Pago único = 1 cuota</p>
            )}
          </div>
          <div>
            <Label>Frecuencia</Label>
            <select
              value={frecuencia}
              onChange={e => setFrecuencia(e.target.value as FrecuenciaCuota)}
              className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            >
              {FRECUENCIA_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha primera cuota</Label>
            <Input type="date" value={fechaPrimeraCuota} onChange={e => setFechaPrimeraCuota(e.target.value)} />
          </div>
          <div>
            <Label>Tasa interés anual (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tasaInteresAnual}
              onChange={e => setTasaInteresAnual(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div>
          <Label>Notas (opcional)</Label>
          <Textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Detalles del acuerdo, garantías, condiciones…"
            rows={2}
          />
        </div>

        {valido && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 text-[11px] text-emerald-800">
            Se generarán <strong>{frecuencia === 'unica' ? 1 : cuotas} cuotas</strong>
            {' '}de aprox. <strong>{formatMonto(monto / (frecuencia === 'unica' ? 1 : cuotas), moneda)}</strong>
            {' '}cada una desde el {fechaPrimeraCuota}.
          </div>
        )}
      </div>
    </Modal>
  );
};

// ─── Modal: registrar pago de cuota ──────────────────────────────

const PagoModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  cuota: CuotaCompensacion;
  moneda: Moneda;
  onConfirm: (fecha: string, monto: number, comprobante?: string) => Promise<void>;
}> = ({ isOpen, onClose, cuota, moneda, onConfirm }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [fecha, setFecha]             = useState(today);
  const [monto, setMonto]             = useState(cuota.monto.toString());
  const [comprobante, setComprobante] = useState('');
  const [saving, setSaving]           = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    setFecha(today);
    setMonto(cuota.monto.toString());
    setComprobante('');
  }, [isOpen, cuota.monto]); // eslint-disable-line react-hooks/exhaustive-deps

  const montoNum = parseFloat(monto);
  const valido = !isNaN(montoNum) && montoNum > 0 && fecha;

  const handleSubmit = async () => {
    if (!valido) return;
    setSaving(true);
    try {
      await onConfirm(fecha, montoNum, comprobante.trim() || undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? () => {} : onClose}
      title={`Registrar pago — Cuota ${cuota.numero}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || !valido}>
            {saving ? 'Guardando…' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cuota {cuota.numero} · Monto original: <strong className="text-foreground">{formatMonto(cuota.monto, moneda)}</strong>
          {' '}· Vence: <strong className="text-foreground">{cuota.fechaVencimiento}</strong>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha de pago</Label>
            <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} max={today} />
          </div>
          <div>
            <Label>Monto pagado</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
            {montoNum < cuota.monto && (
              <p className="text-[10px] text-amber-700 mt-1">Pago parcial — la cuota quedará en estado "Parcial".</p>
            )}
          </div>
        </div>
        <div>
          <Label>URL de comprobante (opcional)</Label>
          <Input
            value={comprobante}
            onChange={e => setComprobante(e.target.value)}
            placeholder="https://drive.google.com/…"
          />
        </div>
      </div>
    </Modal>
  );
};

export default CompensacionPanel;
