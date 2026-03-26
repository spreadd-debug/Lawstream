import React, { useState } from 'react';
import { Label, Button } from './UI';

export interface GlobalFilters {
  health: string[];
  priority: string[];
  venceHoy: boolean;
  vencido: boolean;
  docCritica: boolean;
}

export const defaultFilters: GlobalFilters = {
  health: [],
  priority: [],
  venceHoy: false,
  vencido: false,
  docCritica: false,
};

export const isFiltersActive = (f: GlobalFilters) =>
  f.health.length > 0 || f.priority.length > 0 || f.venceHoy || f.vencido || f.docCritica;

interface FiltersContentProps {
  initialFilters?: GlobalFilters;
  onApply: (filters: GlobalFilters) => void;
  onClose: () => void;
}

export const FiltersContent = ({ initialFilters = defaultFilters, onApply, onClose }: FiltersContentProps) => {
  const [filters, setFilters] = useState<GlobalFilters>(initialFilters);

  const toggleHealth = (h: string) =>
    setFilters(f => ({
      ...f,
      health: f.health.includes(h) ? f.health.filter(x => x !== h) : [...f.health, h],
    }));

  const togglePriority = (p: string) =>
    setFilters(f => ({
      ...f,
      priority: f.priority.includes(p) ? f.priority.filter(x => x !== p) : [...f.priority, p],
    }));

  const handleClear = () => setFilters(defaultFilters);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Estado de Salud</Label>
        <div className="grid grid-cols-2 gap-2">
          {['Sano', 'Trabado', 'Roto', 'En espera'].map(s => (
            <button
              key={s}
              onClick={() => toggleHealth(s)}
              className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                filters.health.includes(s)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Prioridad</Label>
        <div className="flex gap-2">
          {['Alta', 'Media', 'Baja'].map(p => (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                filters.priority.includes(p)
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Vencimiento</Label>
        <div className="space-y-2">
          {[
            { key: 'venceHoy' as const, label: 'Vence hoy' },
            { key: 'vencido' as const, label: 'Vencido' },
            { key: 'docCritica' as const, label: 'Documentación Crítica' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.checked }))}
                className="rounded border-border"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-2">
        <Button onClick={() => { onApply(filters); }}>Aplicar Filtros</Button>
        <Button variant="ghost" onClick={handleClear}>Limpiar todo</Button>
      </div>
    </div>
  );
};
