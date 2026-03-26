import React, { useState } from 'react';
import { Label, Input, Textarea, Button } from './UI';
import { Matter } from '../types';

interface EditMatterFormProps {
  matter?: Matter;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const EditMatterForm = ({ matter, onSave, onCancel }: EditMatterFormProps) => {
  const [formData, setFormData] = useState({
    title: matter?.title || '',
    responsible: matter?.responsible || '',
    priority: matter?.priority || 'Media',
    health: matter?.health || 'Sano',
    nextActionDate: matter?.nextActionDate || '',
    description: matter?.description || '',
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Nombre del Asunto</Label>
        <Input
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Responsable</Label>
          <select
            className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold"
            value={formData.responsible}
            onChange={e => setFormData({ ...formData, responsible: e.target.value })}
          >
            <option value="Dr. Ricardo Darín">Dr. Ricardo Darín</option>
            <option value="Dra. Mercedes Morán">Dra. Mercedes Morán</option>
            <option value="Dr. Guillermo Francella">Dr. Guillermo Francella</option>
          </select>
        </div>
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
      </div>
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label>Próximo Seguimiento</Label>
          <Input
            type="date"
            value={formData.nextActionDate}
            onChange={e => setFormData({ ...formData, nextActionDate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descripción / Resumen</Label>
        <Textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div className="pt-4 flex gap-3">
        <Button className="flex-1" onClick={() => onSave(formData)}>Guardar Cambios</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};
