import React, { useState, useEffect } from 'react';
import { Button, Input } from './UI';
import { Presupuesto, Recibo, FormaPago, EstudioPerfil } from '../types';
import { createRecibo, fetchEstudioPerfil } from '../lib/db';
import { X, Download, Printer, Receipt } from 'lucide-react';
import { cn } from '../lib/utils';
import { pdf } from '@react-pdf/renderer';
import { ReciboPDF } from './ReciboPDF';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReciboEditorProps {
  presupuesto: Presupuesto;
  onClose: () => void;
  onSaved: (recibo: Recibo) => void;
}

const FORMAS_PAGO: FormaPago[] = ['Transferencia', 'Efectivo', 'Cheque', 'Otro'];

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 2 });

export const ReciboEditor: React.FC<ReciboEditorProps> = ({ presupuesto, onClose, onSaved }) => {
  const [perfil, setPerfil]         = useState<EstudioPerfil | null>(null);
  const [monto, setMonto]           = useState(presupuesto.subtotalPesos.toString());
  const [formaPago, setFormaPago]   = useState<FormaPago>('Transferencia');
  const [concepto, setConcepto]     = useState(
    `Honorarios profesionales${presupuesto.numero ? ` — ${presupuesto.numero}` : ''}`
  );
  const [cuotaNumero, setCuotaNumero] = useState<number | undefined>(undefined);
  const [notas, setNotas]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { fetchEstudioPerfil().then(setPerfil); }, []);

  // Cuota options enabled on this presupuesto (multi-installment only)
  const cuotasHabilitadas = presupuesto.cuotaOpciones?.filter(o => o.enabled && o.cuotas > 1) ?? [];
  const maxCuotas = cuotasHabilitadas.length > 0
    ? Math.max(...cuotasHabilitadas.map(o => o.cuotas))
    : 0;

  const montoNum = parseFloat(monto) || 0;

  // When user picks a cuota, auto-set monto to per-cuota amount
  const handleSelectCuota = (n: number | undefined) => {
    setCuotaNumero(n);
    if (n === undefined) {
      setMonto(presupuesto.subtotalPesos.toString());
    } else {
      const op = cuotasHabilitadas.find(o => o.cuotas === n);
      if (op) {
        const totalConRecargo = presupuesto.subtotalPesos * (1 + op.recargoPorcentaje / 100);
        setMonto((totalConRecargo / op.cuotas).toFixed(2));
      }
    }
  };

  const buildDraft = (): Recibo => ({
    id: '',
    presupuestoId: presupuesto.id,
    clientName:    presupuesto.clientName,
    montoPesos:    montoNum,
    formaPago,
    concepto,
    notas:         notas || undefined,
    cuotaNumero,
    status:        'Emitido',
    numero:        'BORRADOR',
    createdAt:     new Date().toISOString(),
    updatedAt:     new Date().toISOString(),
  });

  const buildPdfBlob = async () => {
    const p = perfil ?? { nombre: 'Mi Estudio Jurídico' };
    return pdf(<ReciboPDF recibo={buildDraft()} perfil={p} />).toBlob();
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const blob = await buildPdfBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Recibo_${presupuesto.clientName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setGenerating(false); }
  };

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const blob = await buildPdfBlob();
      window.open(URL.createObjectURL(blob), '_blank');
    } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await createRecibo({
        presupuestoId: presupuesto.id,
        clientName:    presupuesto.clientName,
        montoPesos:    montoNum,
        formaPago,
        concepto,
        notas:         notas || undefined,
        cuotaNumero,
        status:        'Emitido',
      });
      onSaved(saved);
    } finally { setSaving(false); }
  };

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Nuevo Recibo de Pago</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {presupuesto.clientName}
                {presupuesto.numero ? ` · ${presupuesto.numero}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Monto recibido ($)
            </label>
            <Input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              className="text-xl font-black"
              min={0}
            />
          </div>

          {/* Cuota selector (only if presupuesto has installment options) */}
          {maxCuotas > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                ¿A qué cuota corresponde?
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSelectCuota(undefined)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                    cuotaNumero === undefined
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  Pago único / contado
                </button>
                {Array.from({ length: maxCuotas }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => handleSelectCuota(n)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                      cuotaNumero === n
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:bg-muted text-muted-foreground'
                    )}
                  >
                    Cuota {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Forma de pago */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Forma de pago
            </label>
            <div className="flex flex-wrap gap-2">
              {FORMAS_PAGO.map(f => (
                <button
                  key={f}
                  onClick={() => setFormaPago(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                    formaPago === f
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Concepto
            </label>
            <Input
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Honorarios profesionales..."
            />
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Observaciones <span className="normal-case font-medium">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Transferencia ref. 0001234567, pago pendiente de confirmación..."
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Live preview card */}
          <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Vista previa del recibo
            </p>
            <div className="flex justify-between items-start">
              <span className="text-xs text-muted-foreground">Monto</span>
              <span className="text-lg font-black text-primary">${fmt(montoNum)}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recibí de</span>
                <span className="font-bold">{presupuesto.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concepto</span>
                <span className="font-medium text-right max-w-[60%]">
                  {concepto}{cuotaNumero ? ` — Cuota ${cuotaNumero}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forma de pago</span>
                <span className="font-medium">{formaPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium">{today}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={handlePrint} disabled={generating || montoNum <= 0}
            >
              <Printer size={14} /> Imprimir
            </Button>
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={handleDownload} disabled={generating || montoNum <= 0}
            >
              <Download size={14} /> PDF
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              onClick={handleSave}
              disabled={saving || montoNum <= 0 || !concepto.trim()}
            >
              <Receipt size={14} />
              {saving ? 'Emitiendo...' : 'Emitir Recibo'}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
