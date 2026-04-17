import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Label, Input, Textarea, Button, Badge } from './UI';
import { Matter, Jurisdiccion } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Check, MapPin, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useAppContext } from '../lib/AppContext';

interface EditMatterFormProps {
  matter?: Matter;
  onSave: (data: any) => void;
  onCancel: () => void;
  /** Cuando se abre desde el banner de "jurisdicción faltante", hacemos
   *  scroll + highlight al campo para que el usuario lo vea enseguida. */
  initialFocus?: 'jurisdiccion';
}

/** Opciones fijas de jurisdicción — espejo del wizard de creación.
 *  Los valores se guardan normalizados en minúscula en la columna
 *  `matters.jurisdiccion`. */
const JURISDICCION_OPTIONS: { value: Jurisdiccion; label: string; hint: string }[] = [
  { value: 'caba',     label: 'CABA',                       hint: 'Ciudad Autónoma de Buenos Aires' },
  { value: 'pba',      label: 'Provincia de Buenos Aires',  hint: 'Fuero provincial' },
  { value: 'nacional', label: 'Nacional',                   hint: 'Justicia Federal / Nacional' },
];

export const EditMatterForm = ({ matter, onSave, onCancel, initialFocus }: EditMatterFormProps) => {
  const { profile } = useAuth();
  const { handleUpdateAssignments, plazos } = useAppContext();
  const [abogados, setAbogados] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>(matter?.assignedAttorneys || []);
  const isSocio = profile?.role === 'Socio';
  const jurisdiccionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role').eq('is_active', true).then(({ data }) => {
      if (data) setAbogados(data);
    });
  }, []);

  useEffect(() => {
    if (initialFocus === 'jurisdiccion' && jurisdiccionRef.current) {
      jurisdiccionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [initialFocus]);

  const [formData, setFormData] = useState({
    title:          matter?.title          || '',
    responsible:    matter?.responsible    || '',
    priority:       matter?.priority       || 'Media',
    health:         matter?.health         || 'Sano',
    nextActionDate: matter?.nextActionDate || '',
    description:    matter?.description    || '',
    jurisdiccion:   (matter?.jurisdiccion as Jurisdiccion | undefined) ?? '',
    subtype:        matter?.subtype        || '',
    expediente:     matter?.expediente     || '',
  });

  // Cuenta plazos activos del caso — lo usamos para advertir antes de cambiar jurisdicción.
  const activePlazosCount = useMemo(
    () => matter ? plazos.filter(p => p.matterId === matter.id && p.estado === 'activo').length : 0,
    [plazos, matter],
  );

  const originalJurisdiccion = matter?.jurisdiccion;
  const jurisdiccionChanged =
    formData.jurisdiccion !== '' &&
    formData.jurisdiccion !== originalJurisdiccion;
  const jurisdiccionMissing = !formData.jurisdiccion;

  const toggleAttorney = (id: string) => {
    if (!isSocio) return;
    setAssignedIds(prev => {
      let ids: string[];
      if (prev.includes(id)) {
        ids = prev.filter(i => i !== id);
      } else {
        ids = [...prev, id];
      }
      const leadName = ids.length > 0
        ? abogados.find(a => a.id === ids[0])?.full_name || formData.responsible
        : formData.responsible;
      setFormData(fd => ({ ...fd, responsible: leadName }));
      return ids;
    });
  };

  const handleSave = async () => {
    if (jurisdiccionMissing) {
      // Guard: no permitir guardar sin jurisdicción. El form la exige ahora.
      alert('Seleccioná la jurisdicción del caso antes de guardar.');
      jurisdiccionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (jurisdiccionChanged && activePlazosCount > 0) {
      const ok = window.confirm(
        `Cambiar la jurisdicción recalculará los ${activePlazosCount} plazo${activePlazosCount === 1 ? '' : 's'} ` +
        `pendiente${activePlazosCount === 1 ? '' : 's'} con el nuevo calendario de feriados y feria judicial. ` +
        `¿Confirmás el cambio?`,
      );
      if (!ok) return;
    }
    // Save assignments if changed
    if (matter && isSocio) {
      const leadId = assignedIds[0] || '';
      await handleUpdateAssignments(matter.id, assignedIds, leadId);
    }
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Nombre del Asunto</Label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Equipo asignado {!isSocio && <span className="text-muted-foreground text-xs font-normal">(solo el Socio puede modificar)</span>}</Label>
        <div className="grid grid-cols-2 gap-2">
          {abogados.map(a => {
            const isSelected = assignedIds.includes(a.id);
            const isLead = assignedIds[0] === a.id;
            return (
              <button
                key={a.id}
                onClick={() => toggleAttorney(a.id)}
                disabled={!isSocio}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-2 transition-all text-left text-sm",
                  isLead
                    ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                    : isSelected
                      ? "bg-primary/5 border-primary/50"
                      : "bg-muted/30 border-border/50",
                  isSocio ? "hover:border-primary/30 cursor-pointer" : "cursor-default opacity-80"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black border shrink-0",
                  isLead ? "bg-primary text-white border-primary"
                    : isSelected ? "bg-primary/20 text-primary border-primary/50"
                    : "bg-background text-muted-foreground border-border"
                )}>
                  {a.full_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{a.full_name}</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    {isLead ? 'Lead' : isSelected ? 'Asignado' : a.role}
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prioridad</Label>
          <select
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            value={formData.priority}
            onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
          >
            <option value="Baja">Baja</option>
            <option value="Media">Media</option>
            <option value="Alta">Alta</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Salud</Label>
          <select
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            value={formData.health}
            onChange={e => setFormData({ ...formData, health: e.target.value as any })}
          >
            <option value="Sano">Sano</option>
            <option value="Trabado">Trabado</option>
            <option value="Roto">Roto</option>
            <option value="En espera">En espera</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Proximo Seguimiento</Label>
        <Input
          type="date"
          value={formData.nextActionDate}
          onChange={e => setFormData({ ...formData, nextActionDate: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Descripcion / Resumen</Label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      {/* ── SECCIÓN "DATOS DEL CASO" ─────────────────────────────── */}
      <div
        ref={jurisdiccionRef}
        className={cn(
          "space-y-4 rounded-2xl border p-5",
          initialFocus === 'jurisdiccion'
            ? "border-amber-400/60 bg-amber-500/5 ring-2 ring-amber-400/30"
            : "border-border/60 bg-muted/20",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <MapPin size={14} className="text-teal-600" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Datos del Caso</h4>
        </div>

        <div className="space-y-2">
          <Label>
            Jurisdicción <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {JURISDICCION_OPTIONS.map(j => (
              <button
                key={j.value}
                type="button"
                onClick={() => setFormData({ ...formData, jurisdiccion: j.value })}
                title={j.hint}
                className={cn(
                  "px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                  formData.jurisdiccion === j.value
                    ? "border-teal-500 bg-teal-500/10 text-teal-700 shadow-sm"
                    : "border-border/50 bg-card/50 text-muted-foreground hover:border-teal-500/30 hover:text-foreground"
                )}
              >
                {j.label}
                {formData.jurisdiccion === j.value && <Check size={14} className="inline ml-2 text-teal-500" />}
              </button>
            ))}
          </div>
          {jurisdiccionMissing && (
            <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Obligatoria. El motor de plazos la necesita para calcular vencimientos con el calendario correcto.
            </p>
          )}
          {jurisdiccionChanged && activePlazosCount > 0 && (
            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1.5">
              <AlertTriangle size={12} />
              Al guardar, se recalcularán {activePlazosCount} plazo{activePlazosCount === 1 ? '' : 's'} activo{activePlazosCount === 1 ? '' : 's'}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Asunto</Label>
            <Input value={matter?.type || ''} disabled className="opacity-70" />
            <p className="text-[10px] text-muted-foreground">
              El tipo se definió al crear el caso y no es editable desde acá.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Materia / Subtipo</Label>
            <Input
              value={formData.subtype}
              onChange={e => setFormData({ ...formData, subtype: e.target.value })}
              placeholder="Ej: divorcio_unilateral"
            />
          </div>
        </div>
      </div>

      {/* ── SECCIÓN "EXPEDIENTE JUDICIAL" ─────────────────────────── */}
      <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FileText size={14} className="text-blue-600" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Expediente Judicial</h4>
          {!formData.expediente && (
            <Badge variant="default" className="text-[9px]">sin judicializar</Badge>
          )}
        </div>
        <div className="space-y-2">
          <Label>Número de Expediente</Label>
          <Input
            value={formData.expediente}
            onChange={e => setFormData({ ...formData, expediente: e.target.value })}
            placeholder="Ej: 25.673/2025"
          />
          <p className="text-[10px] text-muted-foreground">
            Cargalo cuando el caso se inscriba en receptoría. Dejalo vacío mientras el caso no esté judicializado.
          </p>
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <Button className="flex-1" onClick={handleSave}>Guardar Cambios</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};
