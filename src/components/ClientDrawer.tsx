import React, { useState } from 'react';
import { Client, Matter } from '../types';
import { Button, Input, Label, Textarea } from './UI';
import { Mail, Phone, User, Building2, Edit2, Save, X, Calendar, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { ClientAccountStatement } from './ClientAccountStatement';

interface ClientDrawerProps {
  client: Client;
  matters: Matter[];
  onSave: (id: string, data: Partial<Client>) => void;
  onClose: () => void;
  onSelectMatter: (id: string) => void;
}

export const ClientDrawer = ({ client, matters, onSave, onClose, onSelectMatter }: ClientDrawerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email,
    phone: client.phone,
    type: client.type,
    notes: client.notes || '',
  });

  const clientMatters = matters.filter(m => m.client === client.name);
  const activeCount = clientMatters.filter(m => m.status === 'Activo' || m.status === 'Pausado').length;
  const closedCount = clientMatters.filter(m => m.status === 'Cerrado').length;

  const handleSave = () => {
    onSave(client.id, formData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      type: client.type,
      notes: client.notes || '',
    });
  };

  const healthStyles: Record<string, string> = {
    'Sano': 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    'Trabado': 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'Roto': 'text-rose-600 bg-rose-500/10 border-rose-500/20',
    'En espera': 'text-sky-600 bg-sky-500/10 border-sky-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            {client.type === 'Persona' ? <User size={28} /> : <Building2 size={28} />}
          </div>
          <div className="min-w-0">
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="font-bold"
              />
            ) : (
              <h3 className="text-xl font-black tracking-tight truncate">{client.name}</h3>
            )}
            <div className="mt-1">
              {isEditing ? (
                <select
                  className="h-7 px-2 bg-muted/50 border border-border/50 rounded-lg text-xs font-bold"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'Persona' | 'Empresa' })}
                >
                  <option value="Persona">Persona</option>
                  <option value="Empresa">Empresa</option>
                </select>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{client.type}</span>
              )}
            </div>
          </div>
        </div>

        {!isEditing ? (
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setIsEditing(true)}>
            <Edit2 size={13} /> Editar
          </Button>
        ) : (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" className="gap-1.5" onClick={handleSave}>
              <Save size={13} /> Guardar
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              <X size={13} />
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-xl p-3 text-center border border-border/50">
          <div className="text-lg font-black text-foreground">{clientMatters.length}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Total</div>
        </div>
        <div className="bg-emerald-500/5 rounded-xl p-3 text-center border border-emerald-500/20">
          <div className="text-lg font-black text-emerald-600">{activeCount}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Activos</div>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center border border-border/50">
          <div className="text-lg font-black text-muted-foreground">{closedCount}</div>
          <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Cerrados</div>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-3">
        <Label>Contacto</Label>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={14} className="text-muted-foreground shrink-0" />
              <Input
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                type="email"
              />
            </div>
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Teléfono"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <Mail size={14} className="shrink-0" />
              <span>{client.email || '—'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
              <Phone size={14} className="shrink-0" />
              <span>{client.phone || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notas internas</Label>
        {isEditing ? (
          <Textarea
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observaciones sobre el cliente..."
            className="min-h-[80px]"
          />
        ) : (
          <div className="p-3 bg-muted/50 rounded-xl border border-border/50 text-sm text-muted-foreground min-h-[60px]">
            {client.notes || <span className="italic opacity-50">Sin notas</span>}
          </div>
        )}
      </div>

      {/* Matters */}
      <div className="space-y-3">
        <Label>Asuntos</Label>
        {clientMatters.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-border/50 rounded-xl">
            <Briefcase size={24} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs font-bold text-muted-foreground">Sin asuntos registrados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientMatters.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelectMatter(m.id); onClose(); }}
                className="w-full text-left p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-foreground group-hover:text-primary truncate transition-colors">
                      {m.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{m.type}</span>
                      {m.expediente && (
                        <span className="font-mono text-[9px] text-muted-foreground/60">{m.expediente}</span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0',
                    healthStyles[m.health]
                  )}>
                    {m.health}
                  </span>
                </div>
                {m.nextAction && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                    <Calendar size={10} />
                    <span className="truncate">{m.nextAction}</span>
                    {m.nextActionDate && (
                      <span className="ml-auto shrink-0">
                        {format(parseISO(m.nextActionDate), 'd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estado de cuenta */}
      <ClientAccountStatement clientName={client.name} />
    </div>
  );
};
