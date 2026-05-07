// GAP UX-9 — Resumen compacto de alertas para la cabecera del matter.
//
// Cuando hay ≥3 alertas activas en el matter (jurisdicción faltante,
// violencia, cautelares, reconvenciones, exhortos, transición 18, etc.),
// MatterDetail renderiza este componente en lugar de apilar todos los
// banners. El usuario expande con un click si quiere verlos en detalle.
//
// Trade-off elegido: los banners originales NO se extraen ni reescriben.
// Este componente solo es la "vista colapsada" — al expandir se vuelven
// a renderizar los banners tal como están en MatterDetail.

import React from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export type SeveridadAlerta = 'critica' | 'alta' | 'media' | 'baja';

export interface AlertaResumen {
  id: string;
  severidad: SeveridadAlerta;
  titulo: string;       // ej. "Jurisdicción sin cargar"
  chip: string;         // texto corto para el chip — ej. "Jurisdicción"
  tono: 'rose' | 'amber' | 'sky' | 'fuchsia' | 'violet' | 'emerald';
}

const SEVERIDAD_ORDEN: Record<SeveridadAlerta, number> = {
  critica: 0, alta: 1, media: 2, baja: 3,
};

const TONO_CHIP: Record<AlertaResumen['tono'], string> = {
  rose:    'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
  amber:   'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
  sky:     'bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300',
  fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-300',
  violet:  'bg-violet-500/10 border-violet-500/30 text-violet-700 dark:text-violet-300',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
};

const SEVERIDAD_BORDE: Record<SeveridadAlerta, string> = {
  critica: 'border-rose-500/40 bg-rose-500/5',
  alta:    'border-amber-500/40 bg-amber-500/5',
  media:   'border-amber-500/30 bg-amber-500/5',
  baja:    'border-border/60 bg-card',
};

interface Props {
  alertas: AlertaResumen[];
  expandido: boolean;
  onToggle: () => void;
}

/**
 * Vista colapsada cuando hay muchas alertas. Muestra:
 *   - Conteo y severidad agregada (la más crítica del set).
 *   - Chips de cada alerta ordenados por severidad.
 *   - Botón para expandir / colapsar.
 */
export const ResumenAlertasMatter: React.FC<Props> = ({ alertas, expandido, onToggle }) => {
  if (alertas.length === 0) return null;

  const ordenadas = [...alertas].sort(
    (a, b) => SEVERIDAD_ORDEN[a.severidad] - SEVERIDAD_ORDEN[b.severidad],
  );
  const peorSeveridad = ordenadas[0].severidad;
  const cantCriticas = alertas.filter(a => a.severidad === 'critica').length;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-2xl border-2 shadow-sm',
        SEVERIDAD_BORDE[peorSeveridad],
      )}
    >
      <div className={cn(
        'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center',
        peorSeveridad === 'critica' ? 'bg-rose-500/20 text-rose-700' : 'bg-amber-500/20 text-amber-700',
      )}>
        <AlertCircle size={18} />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase tracking-widest text-foreground">
            {alertas.length} alerta{alertas.length === 1 ? '' : 's'} activa{alertas.length === 1 ? '' : 's'}
          </span>
          {cantCriticas > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-500/15 border border-rose-500/30 rounded-md px-2 py-0.5">
              {cantCriticas} crítica{cantCriticas === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ordenadas.map(a => (
            <span
              key={a.id}
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold',
                TONO_CHIP[a.tono],
              )}
              title={a.titulo}
            >
              {a.chip}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={onToggle}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-[10px] font-black uppercase tracking-widest text-foreground transition-colors"
      >
        {expandido ? (
          <>
            <ChevronUp size={14} />
            Colapsar
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            Ver detalle
          </>
        )}
      </button>
    </div>
  );
};
