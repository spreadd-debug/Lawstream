import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from './UI';
import { Presupuesto, PresupuestoItem, EstudioPerfil } from '../types';
import {
  fetchStudioConfig,
  fetchPresupuestoByConsultation,
  createPresupuesto,
  updatePresupuesto,
  savePresupuestoItems,
  fetchEstudioPerfil,
} from '../lib/db';
import { X, Plus, Trash2, Eye, Download, Save, Calculator, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { PresupuestoPreview } from './PresupuestoPreview';

// ── Types ────────────────────────────────────────────────────────

type DraftItem = Omit<PresupuestoItem, 'id' | 'presupuestoId' | 'subtotalPesos'> & { _key: string };

interface PresupuestoEditorProps {
  consultationId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  onClose: () => void;
  onSaved: (p: Presupuesto) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

const newKey = () => Math.random().toString(36).slice(2);

const calcSubtotal = (item: DraftItem): number =>
  item.montoPesos * (1 - item.fiscalPorcentaje / 100) * (1 - item.descuentoItemPorcentaje / 100);

const DEFAULT_ITEMS: DraftItem[] = [
  {
    _key: newKey(), concepto: 'BONO CAO', tipo: 'bono',
    cantidadIus: 1, montoPesos: 0, fiscalPorcentaje: 0,
    descuentoItemPorcentaje: 0, obligatorio: true, orden: 0,
  },
  {
    _key: newKey(), concepto: 'Honorarios profesionales', tipo: 'honorario',
    cantidadIus: 0, montoPesos: 0, fiscalPorcentaje: 0,
    descuentoItemPorcentaje: 0, obligatorio: true, orden: 1,
  },
];

// ── Component ────────────────────────────────────────────────────

export const PresupuestoEditor: React.FC<PresupuestoEditorProps> = ({
  consultationId, clientName, clientEmail, clientPhone, onClose, onSaved,
}) => {
  const [iusValor, setIusValor]         = useState(0);
  const [perfil, setPerfil]             = useState<EstudioPerfil | null>(null);
  const [existingId, setExistingId]     = useState<string | null>(null);
  const [items, setItems]               = useState<DraftItem[]>(DEFAULT_ITEMS);
  const [descuento, setDescuento]       = useState(0);
  const [notas, setNotas]               = useState('');
  const [saving, setSaving]             = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [loading, setLoading]           = useState(true);

  // ── Load IUS + perfil + existing presupuesto ─────────────────
  useEffect(() => {
    Promise.all([
      fetchStudioConfig('ius_valor'),
      fetchEstudioPerfil(),
      fetchPresupuestoByConsultation(consultationId),
    ]).then(([cfg, p, existing]) => {
      const ius = (cfg?.value as any)?.pesos ?? 0;
      setIusValor(ius);
      setPerfil(p);

      if (existing) {
        setExistingId(existing.id);
        setDescuento(existing.descuentoPorcentaje);
        setNotas(existing.notes ?? '');
        if (existing.items.length > 0) {
          setItems(existing.items.map(i => ({
            _key:                   newKey(),
            concepto:               i.concepto,
            tipo:                   i.tipo,
            cantidadIus:            i.cantidadIus,
            montoPesos:             i.montoPesos,
            fiscalPorcentaje:       i.fiscalPorcentaje,
            descuentoItemPorcentaje: i.descuentoItemPorcentaje,
            obligatorio:            i.obligatorio,
            orden:                  i.orden,
          })));
        } else if (ius > 0) {
          // Pre-fill montoPesos from IUS on existing empty items
          setItems(DEFAULT_ITEMS.map(d => ({ ...d, _key: newKey(), montoPesos: d.cantidadIus ? d.cantidadIus * ius : 0 })));
        }
      } else if (ius > 0) {
        setItems(DEFAULT_ITEMS.map(d => ({ ...d, _key: newKey(), montoPesos: d.cantidadIus ? d.cantidadIus * ius : 0 })));
      }
      setLoading(false);
    });
  }, [consultationId]);

  // ── Item mutations ───────────────────────────────────────────
  const setItem = useCallback((key: string, field: keyof DraftItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item._key !== key) return item;
      const updated = { ...item, [field]: value };
      // Auto-calc montoPesos when cantidadIus changes
      if (field === 'cantidadIus' && iusValor > 0) {
        updated.montoPesos = (parseFloat(value) || 0) * iusValor;
      }
      return updated;
    }));
  }, [iusValor]);

  const addItem = () => setItems(prev => [
    ...prev,
    { _key: newKey(), concepto: '', tipo: 'otro', cantidadIus: undefined, montoPesos: 0, fiscalPorcentaje: 0, descuentoItemPorcentaje: 0, obligatorio: false, orden: prev.length },
  ]);

  const removeItem = (key: string) => setItems(prev => prev.filter(i => i._key !== key));

  // ── Totals ───────────────────────────────────────────────────
  const subtotalBruto = items.reduce((acc, i) => acc + calcSubtotal(i), 0);
  const descuentoMonto = subtotalBruto * (descuento / 100);
  const totalFinal = subtotalBruto - descuentoMonto;
  const totalIus = items.reduce((acc, i) => acc + (i.cantidadIus ?? 0), 0);

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async (status: 'Borrador' | 'Enviado' = 'Borrador') => {
    setSaving(true);
    try {
      let pres: Presupuesto;
      const payload = {
        consultationId,
        clientName,
        status,
        iusValorSnapshot: iusValor,
        subtotalIus: totalIus,
        subtotalPesos: totalFinal,
        descuentoPorcentaje: descuento,
        paymentStatus: 'Pendiente' as const,
        notes: notas || undefined,
      };

      if (existingId) {
        await updatePresupuesto(existingId, payload);
        pres = { ...payload, id: existingId, items: [], createdAt: '', updatedAt: '' };
      } else {
        pres = await createPresupuesto(payload);
        setExistingId(pres.id);
      }

      await savePresupuestoItems(pres.id, items.map((i, idx) => ({ ...i, orden: idx })));

      // Reload full presupuesto with items
      const { fetchPresupuesto } = await import('../lib/db');
      const full = await fetchPresupuesto(pres.id);
      onSaved(full!);
    } finally {
      setSaving(false);
    }
  };

  // ── Build preview data ───────────────────────────────────────
  const buildPreviewData = () => ({
    presupuesto: {
      id: existingId ?? '',
      consultationId,
      clientName,
      status: 'Borrador' as const,
      iusValorSnapshot: iusValor,
      subtotalIus: totalIus,
      subtotalPesos: totalFinal,
      descuentoPorcentaje: descuento,
      paymentStatus: 'Pendiente' as const,
      notes: notas,
      numero: '—',
      items: items.map((i, idx) => ({
        id: i._key,
        presupuestoId: existingId ?? '',
        concepto: i.concepto,
        tipo: i.tipo,
        cantidadIus: i.cantidadIus,
        montoPesos: i.montoPesos,
        fiscalPorcentaje: i.fiscalPorcentaje,
        descuentoItemPorcentaje: i.descuentoItemPorcentaje,
        subtotalPesos: calcSubtotal(i),
        obligatorio: i.obligatorio,
        orden: idx,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    perfil: perfil ?? { nombre: 'Mi Estudio Jurídico' },
    clientEmail,
    clientPhone,
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-card rounded-2xl p-8 text-sm text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (showPreview) {
    const { presupuesto, perfil: p } = buildPreviewData();
    return (
      <PresupuestoPreview
        presupuesto={presupuesto}
        perfil={p}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
        onClose={() => setShowPreview(false)}
        onSave={() => { handleSave('Enviado'); setShowPreview(false); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-xl font-black tracking-tight">Presupuesto de Honorarios</h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
              Ley 14.967 · IUS = ${iusValor.toLocaleString('es-AR')} por unidad
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* IUS notice */}
          {iusValor === 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-amber-700">
                El valor del IUS no está configurado. Configuralo en <strong>Configuración → Valor del IUS</strong> para que los cálculos sean automáticos.
              </p>
            </div>
          )}

          {/* Items table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Servicios y Honorarios</h3>
              <Button size="sm" variant="outline" onClick={addItem} className="gap-1.5 text-xs">
                <Plus size={14} /> Agregar ítem
              </Button>
            </div>

            {/* Table header */}
            <div className="hidden lg:grid grid-cols-[2fr_1fr_1.2fr_0.7fr_0.7fr_1fr_auto] gap-3 px-3 py-2 bg-[#1A3C5E] text-white rounded-lg">
              {['Descripción', 'Cant. IUS', 'Monto $', 'Fiscal %', 'Desc. %', 'Subtotal $', ''].map(h => (
                <div key={h} className="text-[9px] font-black uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item._key}
                  className={cn(
                    'grid grid-cols-1 lg:grid-cols-[2fr_1fr_1.2fr_0.7fr_0.7fr_1fr_auto] gap-3 p-3 rounded-xl border border-border items-center',
                    idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                >
                  {/* Descripción */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Descripción</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={item.tipo}
                        onChange={e => setItem(item._key, 'tipo', e.target.value)}
                        className="text-[10px] font-bold bg-muted border border-border rounded-lg px-1.5 py-1 shrink-0"
                      >
                        <option value="bono">BONO</option>
                        <option value="honorario">HON.</option>
                        <option value="gasto">GASTO</option>
                        <option value="otro">OTRO</option>
                      </select>
                      <Input
                        value={item.concepto}
                        onChange={e => setItem(item._key, 'concepto', e.target.value)}
                        placeholder="Descripción del concepto"
                        className="text-sm h-8"
                      />
                    </div>
                  </div>

                  {/* Cant. IUS */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cant. IUS</label>
                    <Input
                      type="number"
                      value={item.cantidadIus ?? ''}
                      onChange={e => setItem(item._key, 'cantidadIus', parseFloat(e.target.value) || undefined)}
                      placeholder="0"
                      className="text-sm h-8 text-right"
                      min={0}
                    />
                  </div>

                  {/* Monto $ */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Monto $</label>
                    <Input
                      type="number"
                      value={item.montoPesos || ''}
                      onChange={e => setItem(item._key, 'montoPesos', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-sm h-8 text-right"
                      min={0}
                    />
                  </div>

                  {/* Fiscal % */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fiscal %</label>
                    <Input
                      type="number"
                      value={item.fiscalPorcentaje || ''}
                      onChange={e => setItem(item._key, 'fiscalPorcentaje', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-sm h-8 text-right"
                      min={0} max={100}
                    />
                  </div>

                  {/* Desc. % */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Desc. %</label>
                    <Input
                      type="number"
                      value={item.descuentoItemPorcentaje || ''}
                      onChange={e => setItem(item._key, 'descuentoItemPorcentaje', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-sm h-8 text-right"
                      min={0} max={100}
                    />
                  </div>

                  {/* Subtotal */}
                  <div className="flex flex-col gap-1">
                    <label className="lg:hidden text-[9px] font-black uppercase tracking-widest text-muted-foreground">Subtotal</label>
                    <div className="text-sm font-black text-foreground text-right px-2">
                      ${calcSubtotal(item).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item._key)}
                    disabled={item.obligatorio}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + Discount + Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notas del presupuesto</label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Condiciones, vencimiento del presupuesto, notas al cliente..."
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-28 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Totals */}
            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal IUS</span>
                  <span className="font-bold">{totalIus.toLocaleString('es-AR', { minimumFractionDigits: 2 })} IUS</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal en pesos</span>
                  <span className="font-bold">${subtotalBruto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    Descuento global
                    <input
                      type="number"
                      value={descuento || ''}
                      onChange={e => setDescuento(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      min={0} max={100}
                      className="w-14 text-right px-1.5 py-0.5 text-xs border border-border rounded-lg bg-background"
                    />
                    %
                  </span>
                  <span className="font-bold text-rose-600">
                    {descuento > 0 ? `- $${descuentoMonto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '$0.00'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-primary">
                    ${totalFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-3 py-2 border border-border/50">
                <Calculator size={12} className="shrink-0" />
                <span>IUS vigente: <strong>${iusValor.toLocaleString('es-AR')}</strong>. Los montos en pesos se calculan automáticamente al ingresar cantidades IUS.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-wrap gap-3 justify-between items-center shrink-0">
          <Button variant="ghost" onClick={onClose} size="sm">Cancelar</Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleSave('Borrador')}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(true)}
            >
              <Eye size={14} />
              Vista previa PDF
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => handleSave('Enviado')}
              disabled={saving}
            >
              <Download size={14} />
              {saving ? 'Guardando...' : 'Confirmar y enviar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
