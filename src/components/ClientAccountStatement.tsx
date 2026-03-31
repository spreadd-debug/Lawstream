import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, FileText, Receipt, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { Card } from './UI';
import { cn } from '../lib/utils';
import { Presupuesto, Recibo } from '../types';
import { fetchPresupuestosByClient, fetchRecibosByClient } from '../lib/db';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientAccountStatementProps {
  clientName: string;
}

export const ClientAccountStatement: React.FC<ClientAccountStatementProps> = ({ clientName }) => {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientName) return;
    setLoading(true);
    Promise.all([
      fetchPresupuestosByClient(clientName),
      fetchRecibosByClient(clientName),
    ]).then(([p, r]) => {
      setPresupuestos(p);
      setRecibos(r);
    }).finally(() => setLoading(false));
  }, [clientName]);

  const totals = useMemo(() => {
    const totalPresupuestado = presupuestos
      .filter(p => p.status === 'Aceptado')
      .reduce((acc, p) => acc + p.subtotalPesos * (1 - (p.descuentoPorcentaje || 0) / 100), 0);

    const totalCobrado = recibos
      .filter(r => r.status === 'Emitido')
      .reduce((acc, r) => acc + r.montoPesos, 0);

    const saldoPendiente = totalPresupuestado - totalCobrado;

    return { totalPresupuestado, totalCobrado, saldoPendiente };
  }, [presupuestos, recibos]);

  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground">Cargando estado de cuenta...</div>;
  }

  if (presupuestos.length === 0 && recibos.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
        Sin movimientos financieros para este cliente
      </div>
    );
  }

  const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        <DollarSign size={10} /> Estado de Cuenta
      </h4>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <FileText size={12} className="text-sky-600" />
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Presupuestado</span>
          </div>
          <p className="text-sm font-black text-foreground">{fmt(totals.totalPresupuestado)}</p>
        </Card>
        <Card className="p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-emerald-600" />
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Cobrado</span>
          </div>
          <p className="text-sm font-black text-emerald-600">{fmt(totals.totalCobrado)}</p>
        </Card>
        <Card className="p-3 border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className={cn(totals.saldoPendiente > 0 ? 'text-rose-600' : 'text-emerald-600')} />
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Pendiente</span>
          </div>
          <p className={cn('text-sm font-black', totals.saldoPendiente > 0 ? 'text-rose-600' : 'text-emerald-600')}>
            {fmt(totals.saldoPendiente)}
          </p>
        </Card>
      </div>

      {/* Movimientos */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Movimientos
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {/* Presupuestos */}
          {presupuestos.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/50 bg-card">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                <FileText size={13} className="text-sky-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">Presupuesto {p.numero || ''}</p>
                <p className="text-[9px] text-muted-foreground">
                  {format(parseISO(p.createdAt), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
              <span className={cn(
                'px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider',
                p.status === 'Aceptado' ? 'bg-emerald-500/10 text-emerald-600' :
                p.status === 'Enviado' ? 'bg-sky-500/10 text-sky-600' :
                p.status === 'Rechazado' ? 'bg-rose-500/10 text-rose-600' :
                'bg-muted text-muted-foreground',
              )}>
                {p.status}
              </span>
              <span className="text-xs font-black text-foreground shrink-0">{fmt(p.subtotalPesos)}</span>
            </div>
          ))}

          {/* Recibos */}
          {recibos.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border/50 bg-card">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Receipt size={13} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">Recibo {r.numero || ''} · {r.formaPago}</p>
                <p className="text-[9px] text-muted-foreground">
                  {format(parseISO(r.createdAt), 'dd/MM/yyyy', { locale: es })}
                  {r.cuotaNumero && ` · Cuota ${r.cuotaNumero}`}
                </p>
              </div>
              <span className={cn(
                'px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider',
                r.status === 'Emitido' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground',
              )}>
                {r.status}
              </span>
              <span className="text-xs font-black text-emerald-600 shrink-0">+{fmt(r.montoPesos)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
