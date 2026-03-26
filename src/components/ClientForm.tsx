import React, { useState } from 'react';
import { Button, Input, Label, Textarea } from './UI';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  type: 'Persona' | 'Empresa';
  notes: string;
}

interface ClientFormProps {
  onSave: (data: ClientFormData) => void;
  onCancel: () => void;
}

export const ClientForm = ({ onSave, onCancel }: ClientFormProps) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    type: 'Persona',
    notes: '',
  });

  const isValid = formData.name.trim() !== '';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Tipo de Cliente</Label>
        <div className="flex gap-2">
          {(['Persona', 'Empresa'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFormData({ ...formData, type: t })}
              className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                formData.type === t
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{formData.type === 'Empresa' ? 'Razón Social' : 'Nombre Completo'} *</Label>
        <Input
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder={formData.type === 'Empresa' ? 'Nombre de la empresa...' : 'Nombre y apellido...'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            placeholder="11 1234-5678"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notas internas</Label>
        <Textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Observaciones sobre el cliente..."
          className="min-h-[80px]"
        />
      </div>

      <div className="pt-4 flex gap-3">
        <Button className="flex-1" disabled={!isValid} onClick={() => isValid && onSave(formData)}>
          Guardar Cliente
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};
