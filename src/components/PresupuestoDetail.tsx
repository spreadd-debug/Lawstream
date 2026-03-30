import React, { useState } from 'react';
import { Card, Badge, Button } from './UI';
import { Presupuesto, PresupuestoStatus, PaymentStatus } from '../types';
import { updatePresupuesto } from '../lib/db';
import { DollarSign, CheckCircle2, Clock, Send, XCircle, ChevronDown, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface PresupuestoDetailProps {
  presupuesto: Presupuesto;
  onUpdated: (updated: Presupuesto) => void;
  onEdit: () => void;
}

const STATUS_CONFIG: Record<PresupuestoStatus, { label: string; variant: 'default' | 'info' | 'warning' | 'success' | 'error' | 'outline'; icon: React.ReactNode }> = {
  Borrador:  { label: 'Borrador',  variant: 'outline',  icon: <FileText size={12} /> },
  Enviado:   { label: 'Enviado',   variant: 'info',     icon: <Send size={12} /> },
  Aceptado:  { label: 'Aceptado',  variant: 'success',  icon: <CheckCircle2 size={12} /> },
  Rechazado: { label: 'Rechazado', variant: 'error',    icon: <XCircle size={12} /> },
};

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'error' | 'info' | 'outline' }> = {
  Pendiente: { label: 'Pago pendiente', variant: 'warning' },
  Parcial:   { label: 'Pago parcial',   variant: 'info' },
  Pagado:    { label: 'Pagado',         variant: 'success' },
};

const TIPO_LABEL: Record<string, string> = {
  bono:       'Bono',
  honorario:  'Honorario',
  gasto:      'Gasto',
  otro:       'Otro',
};

export const PresupuestoDetail: React.FC<PresupuestoDetailProps> = ({ presupuesto, onUpdated, onEdit }) => {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (status: PresupuestoStatus) => {
    setLoading(true);
    try {
      await updatePresupuesto(presupuesto.id, { status });
      onUpdated({ ...presupuesto, status });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = async (paymentStatus: PaymentStatus) => {
    setLoading(true);
    try {
      await updatePresupuesto(presupuesto.id, { paymentStatus });
      onUpdated({ ...presupuesto, paymentStatus });
    } finally {
      setLoading(false);
    }
  };

  const statusCfg = STATUS_CONFIG[presupuesto.status];
  const paymentCfg = PAYMENT_CONFIG[presupuesto.paymentStatus];

  return (
    <div className="space-y-4">
      {/* Header del presupuesto */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant={statusCfg.variant} className="gap-1">
              {statusCfg.icon}
              {statusCfg.label}
            </Badge>
            <Badge variant={paymentCfg.variant}>
              {paymentCfg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Creado {format(parseISO(presupuesto.createdAt), "d 'de' MMMM yyyy", { locale: es })}
            {' · '}IUS al momento: ${presupuesto.iusValorSnapshot.toLocaleString('es-AR')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      </div>

      {/* Items */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Concepto</th>
              <th className="text-left px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Tipo</th>
              <th className="text-right px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">IUS</th>
              <th className="text-right px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Pesos</th>
            </tr>
          </thead>
          <tbody>
            {presupuesto.items.map((item, i) => (
              <tr key={item.id} className={cn('border-t border-border', i % 2 === 0 ? 'bg-card' : 'bg-muted/20')}>
                <td className="px-4 py-2.5">
                  <span className="font-medium">{item.concepto}</span>
                  {item.obligatorio && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">(obligatorio)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{TIPO_LABEL[item.tipo]}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">
                  {item.cantidadIus ? `${item.cantidadIus} IUS` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-bold">
                  ${item.montoPesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr className="bg-muted/30">
              <td colSpan={2} className="px-4 py-3" />
              <td className="px-4 py-3 text-right text-xs text-muted-foreground font-bold">
                {presupuesto.subtotalIus.toFixed(2)} IUS
              </td>
              <td className="px-4 py-3 text-right font-black text-base text-primary">
                ${presupuesto.subtotalPesos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notas */}
      {presupuesto.notes && (
        <div className="p-3 bg-muted/30 rounded-xl text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Notas: </span>{presupuesto.notes}
        </div>
      )}

      {/* Acciones de estado */}
      <div className="flex flex-wrap gap-2">
        {presupuesto.status === 'Borrador' && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('Enviado')} disabled={loading}>
            <Send size={13} className="mr-1.5" /> Marcar como enviado
          </Button>
        )}
        {presupuesto.status === 'Enviado' && (
          <>
            <Button size="sm" onClick={() => handleStatusChange('Aceptado')} disabled={loading}>
              <CheckCircle2 size={13} className="mr-1.5" /> Aceptado por el cliente
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleStatusChange('Rechazado')} disabled={loading}>
              <XCircle size={13} className="mr-1.5" /> Rechazado
            </Button>
          </>
        )}

        {presupuesto.status === 'Aceptado' && (
          <div className="flex gap-2">
            {presupuesto.paymentStatus !== 'Pagado' && (
              <>
                {presupuesto.paymentStatus === 'Pendiente' && (
                  <Button size="sm" variant="outline" onClick={() => handlePaymentChange('Parcial')} disabled={loading}>
                    <Clock size={13} className="mr-1.5" /> Pago parcial
                  </Button>
                )}
                <Button size="sm" onClick={() => handlePaymentChange('Pagado')} disabled={loading}>
                  <DollarSign size={13} className="mr-1.5" /> Marcar pagado
                </Button>
              </>
            )}
            {presupuesto.paymentStatus === 'Pagado' && (
              <Badge variant="success" className="py-1.5 px-3 text-sm">
                <CheckCircle2 size={13} className="mr-1.5" /> Honorarios pagados — listo para iniciar
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
