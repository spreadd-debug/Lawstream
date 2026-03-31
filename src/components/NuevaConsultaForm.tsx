import React, { useState } from 'react';
import {
  X, User, Phone, Mail, MessageSquare, Calendar, Clock,
  Briefcase, Users, Globe, PhoneCall, Star, ChevronRight,
} from 'lucide-react';
import { Button, Input } from './UI';
import { Consultation, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { NEXT_STEP_BY_STATUS } from './Consultas';
import { format, addDays } from 'date-fns';

type FormData = Omit<Consultation, 'id'>;

interface NuevaConsultaFormProps {
  onSave: (data: FormData) => void;
  onClose: () => void;
  profiles?: UserProfile[];
}

const ORIGENES: { key: Consultation['origin']; label: string; icon: React.ReactNode }[] = [
  { key: 'WhatsApp',  label: 'WhatsApp',  icon: <MessageSquare size={13} /> },
  { key: 'Llamada',   label: 'Llamada',   icon: <PhoneCall size={13} /> },
  { key: 'Referido',  label: 'Referido',  icon: <Star size={13} /> },
  { key: 'Web',       label: 'Web',       icon: <Globe size={13} /> },
  { key: 'Otro',      label: 'Otro',      icon: <ChevronRight size={13} /> },
];

const TIPOS = ['Familia', 'Laboral', 'Daños', 'Comercial', 'Sucesiones', 'Civil', 'Otro'];

// Default interview: next business day at 10:00
const defaultScheduled = (): string => {
  const d = addDays(new Date(), 1);
  d.setHours(10, 0, 0, 0);
  return format(d, "yyyy-MM-dd'T'HH:mm");
};

export const NuevaConsultaForm = ({ onSave, onClose, profiles = [] }: NuevaConsultaFormProps) => {
  const [form, setForm] = useState<FormData>({
    name:                '',
    status:              'Nueva',
    date:                new Date().toISOString(),
    origin:              'Llamada',
    nextStep:            NEXT_STEP_BY_STATUS['Nueva'],
    responsible:         '',
    type:                '',
    description:         '',
    email:               '',
    phone:               '',
    consultationFeePaid: false,
    scheduledAt:         defaultScheduled(),
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
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">

        {/* Handle bar mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <header className="px-6 pt-4 pb-5 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-xl font-black tracking-tight">Nueva Consulta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registrá el lead antes de que se pierda el contexto
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors mt-0.5">
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* ── Cliente ── */}
          <section className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <User size={10} /> Cliente
            </p>
            <Input
              autoFocus
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Nombre y apellido *"
              className="font-semibold"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.phone ?? ''}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="Teléfono"
                  className="pl-8"
                />
              </div>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email ?? ''}
                  onChange={e => set('email', e.target.value)}
                  placeholder="Email"
                  className="pl-8"
                />
              </div>
            </div>
          </section>

          {/* ── Origen ── */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              ¿Cómo llegó al estudio?
            </p>
            <div className="flex flex-wrap gap-2">
              {ORIGENES.map(o => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => set('origin', o.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                    form.origin === o.key
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Rama del derecho ── */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Briefcase size={10} /> Rama del derecho
            </p>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', form.type === t ? '' : t)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl border text-xs font-bold transition-all',
                    form.type === t
                      ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                      : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* ── Descripción ── */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <MessageSquare size={10} /> ¿Cuál es el problema?
            </p>
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Describí brevemente el motivo de la consulta…"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors placeholder:text-muted-foreground/50"
            />
          </section>

          {/* ── Entrevista ── */}
          <section className="space-y-3 p-4 bg-primary/5 border border-primary/15 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Calendar size={10} /> Entrevista inicial
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</p>
                <input
                  type="date"
                  value={form.scheduledAt ? form.scheduledAt.slice(0, 10) : ''}
                  onChange={e => {
                    const time = form.scheduledAt ? form.scheduledAt.slice(11, 16) : '10:00';
                    set('scheduledAt', e.target.value ? `${e.target.value}T${time}` : undefined);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Hora</p>
                <input
                  type="time"
                  value={form.scheduledAt ? form.scheduledAt.slice(11, 16) : ''}
                  onChange={e => {
                    const date = form.scheduledAt ? form.scheduledAt.slice(0, 10) : format(addDays(new Date(), 1), 'yyyy-MM-dd');
                    set('scheduledAt', e.target.value ? `${date}T${e.target.value}` : undefined);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
            <p className="text-[10px] text-primary/70 leading-relaxed">
              Aparecerá en la Agenda de Vencimientos. Se genera un recordatorio el día anterior.
            </p>
          </section>

          {/* ── Responsable ── */}
          <section className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Users size={10} /> Abogado responsable
            </p>
            {profiles.length > 0 ? (
              <select
                value={form.responsible ?? ''}
                onChange={e => set('responsible', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
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
                value={form.responsible ?? ''}
                onChange={e => set('responsible', e.target.value)}
                placeholder="Nombre del abogado..."
              />
            )}
          </section>

        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-border shrink-0 flex gap-3 bg-card rounded-b-2xl">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black"
            disabled={!isValid || saving}
            onClick={handleSubmit}
          >
            {saving ? 'Guardando…' : 'Registrar Consulta'}
          </Button>
        </footer>
      </div>
    </div>
  );
};
