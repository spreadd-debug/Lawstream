import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input, Label, Textarea } from './UI';
import { Consultation, UserProfile } from '../types';
import { cn } from '../lib/utils';

type FormData = Omit<Consultation, 'id'>;

interface NuevaConsultaFormProps {
  onSave: (data: FormData) => void;
  onClose: () => void;
  profiles?: UserProfile[];
}

const ORIGENES: Consultation['origin'][] = ['WhatsApp', 'Llamada', 'Referido', 'Web', 'Otro'];
const TIPOS = ['Familia', 'Laboral', 'Daños', 'Comercial', 'Sucesiones', 'Civil', 'Otro'];

export const NuevaConsultaForm = ({ onSave, onClose, profiles = [] }: NuevaConsultaFormProps) => {
  const [form, setForm] = useState<FormData>({
    name: '',
    status: 'Nueva',
    date: new Date().toISOString(),
    origin: 'Llamada',
    nextStep: 'Agendar entrevista inicial',
    responsible: '',
    type: '',
    description: '',
    email: '',
    phone: '',
    consultationFeePaid: false,
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const isValid = form.name.trim() !== '';

  const handleSubmit = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-tight">Nueva Consulta</h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Registrá el lead antes de que se pierda el contexto
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Nombre del potencial cliente *</Label>
            <Input
              autoFocus
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Nombre y apellido..."
            />
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="11 1234-5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* Origen */}
          <div className="space-y-1.5">
            <Label>¿Cómo llegó al estudio?</Label>
            <div className="flex flex-wrap gap-2">
              {ORIGENES.map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => set('origin', o)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all',
                    form.origin === o
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Rama del derecho */}
          <div className="space-y-1.5">
            <Label>Rama del derecho</Label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all',
                    form.type === t
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border hover:bg-muted text-muted-foreground'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label>¿Cuál es el problema?</Label>
            <Textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describí brevemente el problema que trae el cliente..."
              className="min-h-[80px]"
            />
          </div>

          {/* Próxima acción */}
          <div className="space-y-1.5">
            <Label>Próxima acción</Label>
            <Input
              value={form.nextStep}
              onChange={e => set('nextStep', e.target.value)}
              placeholder="Ej: Agendar entrevista inicial"
            />
          </div>

          {/* Responsable */}
          <div className="space-y-1.5">
            <Label>Abogado responsable</Label>
            {profiles.length > 0 ? (
              <select
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
              >
                <option value="">Sin asignar</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.fullName}>
                    {p.fullName} — {p.role}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
                placeholder="Nombre del abogado..."
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-border shrink-0 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!isValid || saving}
            onClick={handleSubmit}
          >
            {saving ? 'Guardando...' : 'Registrar Consulta'}
          </Button>
        </footer>
      </div>
    </div>
  );
};
