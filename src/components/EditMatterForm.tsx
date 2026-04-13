import React, { useState, useEffect } from 'react';
import { Label, Input, Textarea, Button } from './UI';
import { Matter } from '../types';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Check } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useAppContext } from '../lib/AppContext';

interface EditMatterFormProps {
  matter?: Matter;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const EditMatterForm = ({ matter, onSave, onCancel }: EditMatterFormProps) => {
  const { profile } = useAuth();
  const { handleUpdateAssignments } = useAppContext();
  const [abogados, setAbogados] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>(matter?.assignedAttorneys || []);
  const isSocio = profile?.role === 'Socio';

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, role').eq('is_active', true).then(({ data }) => {
      if (data) setAbogados(data);
    });
  }, []);

  const [formData, setFormData] = useState({
    title: matter?.title || '',
    responsible: matter?.responsible || '',
    priority: matter?.priority || 'Media',
    health: matter?.health || 'Sano',
    nextActionDate: matter?.nextActionDate || '',
    description: matter?.description || '',
  });

  const toggleAttorney = (id: string) => {
    if (!isSocio) return;
    setAssignedIds(prev => {
      let ids: string[];
      if (prev.includes(id)) {
        ids = prev.filter(i => i !== id);
      } else {
        ids = [...prev, id];
      }
      // Update responsible to lead (first in list)
      const leadName = ids.length > 0
        ? abogados.find(a => a.id === ids[0])?.full_name || formData.responsible
        : formData.responsible;
      setFormData(fd => ({ ...fd, responsible: leadName }));
      return ids;
    });
  };

  const handleSave = async () => {
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
      <div className="pt-4 flex gap-3">
        <Button className="flex-1" onClick={handleSave}>Guardar Cambios</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};
