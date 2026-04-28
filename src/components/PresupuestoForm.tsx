import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge, MoneyInput } from './UI';
import { Presupuesto, PresupuestoItem, PresupuestoStatus, PaymentStatus, UnidadArancelaria } from '../types';
import {
  fetchStudioConfig,
  createPresupuesto,
  updatePresupuesto,
  createPresupuestoItem,
  updatePresupuestoItem,
  deletePresupuestoItem,
  fetchPresupuestoByConsultation,
} from '../lib/db';
import { Plus, Trash2, Calculator, DollarSign, FileText, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PresupuestoFormProps {
  consultationId: string;
  clientName: string;
  onClose: () => void;
  onSaved: (presupuesto: Presupuesto) => void;
}

const ITEMS_SUGERIDOS = [
  { concepto: 'BONO CAO', tipo: 'bono' as const, obligatorio: true },
  { concepto: 'Honorarios profesionales', tipo: 'honorario' as const, obligatorio: true },
  { concepto: 'Bono Previsional', tipo: 'bono' as const, obligatorio: false },
  { concepto: 'Tasa de Justicia', tipo: 'gasto' as const, obligatorio: false },
];

export const PresupuestoForm: React.FC<PresupuestoFormProps> = ({
  consultationId,
  clientName,
  onClose,
  onSaved,
}) => {
  const [unidad, setUnidad] = useState<UnidadArancelaria>('JUS');
  const [valoresUnidad, setValoresUnidad] = useState<{ jus: number; uma: number }>({ jus: 0, uma: 0 });
  const valorUnidad = unidad === 'JUS' ? valoresUnidad.jus : valoresUnidad.uma;
  const [existing, setExisting] = useState<Presupuesto | null>(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<Array<{
    id?: string;
    concepto: string;
    tipo: 'bono' | 'honorario' | 'gasto' | 'otro';
    cantidadIus: string;
    montoPesos: string;
    obligatorio: boolean;
  }>>([
    { concepto: 'BONO CAO', tipo: 'bono', cantidadIus: '', montoPesos: '', obligatorio: true },
    { concepto: 'Honorarios profesionales', tipo: 'honorario', cantidadIus: '', montoPesos: '', obligatorio: true },
  ]);

  useEffect(() => {
    const load = async () => {
      const [cfgJus, cfgUma] = await Promise.all([
        fetchStudioConfig('ius_valor'),
        fetchStudioConfig('uma_valor'),
      ]);
      setValoresUnidad({
        jus: cfgJus ? ((cfgJus.value as any).pesos ?? 0) : 0,
        uma: cfgUma ? ((cfgUma.value as any).pesos ?? 0) : 0,
      });
      const prev = await fetchPresupuestoByConsultation(consultationId);
      if (prev) {
        setExisting(prev);
        setNotes(prev.notes ?? '');
        setUnidad(prev.unidad ?? 'JUS');
        if (prev.items.length > 0) {
          setItems(prev.items.map(i => ({
            id:          i.id,
            concepto:    i.concepto,
            tipo:        i.tipo,
            cantidadIus: i.cantidadIus?.toString() ?? '',
            montoPesos:  i.montoPesos.toString(),
            obligatorio: i.obligatorio,
          })));
        }
      }
    };
    load();
  }, [consultationId]);

  // Recalcular monto en pesos cuando cambia cantidad o el valor de la unidad
  const handleCantidadIusChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index].cantidadIus = val;
    const cant = parseFloat(val);
    if (!isNaN(cant) && valorUnidad > 0) {
      updated[index].montoPesos = (cant * valorUnidad).toFixed(2);
    }
    setItems(updated);
  };

  // Cuando cambia la unidad, recalcular los pesos de cada item
  const cambiarUnidad = (nueva: UnidadArancelaria) => {
    setUnidad(nueva);
    const nuevoValor = nueva === 'JUS' ? valoresUnidad.jus : valoresUnidad.uma;
    if (nuevoValor > 0) {
      setItems(prev => prev.map(it => {
        const cant = parseFloat(it.cantidadIus);
        if (!isNaN(cant)) return { ...it, montoPesos: (cant * nuevoValor).toFixed(2) };
        return it;
      }));
    }
  };

  const addItem = () => {
    setItems([...items, { concepto: '', tipo: 'otro', cantidadIus: '', montoPesos: '', obligatorio: false }]);
  };

  const addSugerido = (sug: typeof ITEMS_SUGERIDOS[number]) => {
    if (items.some(i => i.concepto === sug.concepto)) return;
    setItems([...items, { concepto: sug.concepto, tipo: sug.tipo, cantidadIus: '', montoPesos: '', obligatorio: sug.obligatorio }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotalPesos = items.reduce((acc, i) => acc + (parseFloat(i.montoPesos) || 0), 0);
  const subtotalIus = items.reduce((acc, i) => acc + (parseFloat(i.cantidadIus) || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      let presupuesto: Presupuesto;
      if (existing) {
        await updatePresupuesto(existing.id, { subtotalIus, subtotalPesos, notes, unidad });
        // Sync items: delete old, insert new
        for (const item of existing.items) {
          await deletePresupuestoItem(item.id);
        }
        presupuesto = { ...existing, subtotalIus, subtotalPesos, notes, unidad, items: [] };
      } else {
        presupuesto = await createPresupuesto({
          consultationId,
          clientName,
          status: 'Borrador',
          unidad,
          iusValorSnapshot: valorUnidad,
          subtotalIus,
          subtotalPesos,
          paymentStatus: 'Pendiente',
          notes,
        } as any);
      }
      // Guardar items
      const savedItems: PresupuestoItem[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.concepto.trim()) continue;
        const saved = await createPresupuestoItem({
          presupuestoId: presupuesto.id,
          concepto:      item.concepto,
          tipo:          item.tipo,
          cantidadIus:   parseFloat(item.cantidadIus) || undefined,
          montoPesos:    parseFloat(item.montoPesos) || 0,
          obligatorio:   item.obligatorio,
          orden:         i,
        });
        savedItems.push(saved);
      }
      onSaved({ ...presupuesto, items: savedItems });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">Presupuesto de Honorarios</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {clientName} · {unidad === 'JUS' ? 'Ley 27.423' : 'Ley 14.967'}
              </p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>

          {/* Toggle unidad arancelaria */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unidad arancelaria</p>
            <div className="flex gap-2">
              <button
                onClick={() => cambiarUnidad('JUS')}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                  unidad === 'JUS'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80'
                )}
              >
                JUS · CABA / Nacional
              </button>
              <button
                onClick={() => cambiarUnidad('UMA')}
                className={cn(
                  'flex-1 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all',
                  unidad === 'UMA'
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-border bg-card text-muted-foreground hover:border-border/80'
                )}
              >
                UMA · PBA
              </button>
            </div>
          </div>

          {/* Valor de la unidad seleccionada */}
          <div className={cn(
            'flex items-center gap-3 p-3 border rounded-xl',
            unidad === 'JUS' ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200',
          )}>
            <Calculator size={18} className={cn('shrink-0', unidad === 'JUS' ? 'text-amber-600' : 'text-sky-600')} />
            <div className="flex-1">
              <p className={cn(
                'text-xs font-bold uppercase tracking-wide',
                unidad === 'JUS' ? 'text-amber-700' : 'text-sky-700',
              )}>
                Valor del {unidad} vigente
              </p>
              <p className={cn(
                'text-lg font-black',
                unidad === 'JUS' ? 'text-amber-800' : 'text-sky-800',
              )}>
                ${valorUnidad.toLocaleString('es-AR')} por {unidad}
              </p>
            </div>
            {valorUnidad === 0 && (
              <Badge variant="warning">Configurar en Ajustes</Badge>
            )}
          </div>

          {/* Ítems sugeridos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Conceptos frecuentes</p>
            <div className="flex flex-wrap gap-2">
              {ITEMS_SUGERIDOS.map(s => (
                <button
                  key={s.concepto}
                  onClick={() => addSugerido(s)}
                  disabled={items.some(i => i.concepto === s.concepto)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors',
                    items.some(i => i.concepto === s.concepto)
                      ? 'bg-muted border-border text-muted-foreground cursor-not-allowed'
                      : 'bg-card border-border hover:border-primary hover:text-primary'
                  )}
                >
                  + {s.concepto}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de ítems */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detalle de conceptos</p>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/30 rounded-xl">
                <div className="col-span-4">
                  <Input
                    placeholder="Concepto"
                    value={item.concepto}
                    onChange={e => {
                      const updated = [...items];
                      updated[index].concepto = e.target.value;
                      setItems(updated);
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={item.tipo}
                    onChange={e => {
                      const updated = [...items];
                      updated[index].tipo = e.target.value as any;
                      setItems(updated);
                    }}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-border bg-background"
                  >
                    <option value="bono">Bono</option>
                    <option value="honorario">Honorario</option>
                    <option value="gasto">Gasto</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder={unidad}
                    type="number"
                    value={item.cantidadIus}
                    onChange={e => handleCantidadIusChange(index, e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <MoneyInput
                    value={item.montoPesos}
                    onChange={v => {
                      const updated = [...items];
                      updated[index].montoPesos = v;
                      setItems(updated);
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeItem(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addItem}
              className="w-full py-2 border-2 border-dashed border-border rounded-xl text-xs text-muted-foreground hover:border-primary hover:text-primary flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={12} /> Agregar concepto
            </button>
          </div>

          {/* Totales */}
          <div className="p-4 bg-card border border-border rounded-xl space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal {unidad}</span>
              <span className="font-bold">{subtotalIus.toFixed(2)} {unidad}</span>
            </div>
            <div className="flex justify-between text-base font-black">
              <span>Total en Pesos</span>
              <span className="text-primary">${subtotalPesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Notas</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condiciones de pago, aclaraciones..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background resize-none h-20"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || items.length === 0}>
              {saving ? 'Guardando...' : existing ? 'Actualizar Presupuesto' : 'Crear Presupuesto'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
