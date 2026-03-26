import React, { useState } from 'react';
import { Card, Button, Input, Badge } from './UI';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  ShieldAlert, 
  Zap,
  ChevronDown,
  MoreHorizontal,
  X,
  FileText,
  Link as LinkIcon,
  Users,
  Flag,
  RotateCcw,
  Activity,
  Check,
  MessageSquare,
  Scale,
  FileSearch,
  PhoneCall,
  Send,
  Gavel,
  Coins
} from 'lucide-react';
import { cn } from '../lib/utils';

import { ACTION_TYPES } from '../constants';

interface NuevaAccionProps {
  matterId?: string;
  matterTitle?: string;
  matters?: any[];
  onBack: () => void;
  onSave: (data: any) => void;
}

export const NuevaAccion = ({ matterId, matterTitle, matters = [], onBack, onSave }: NuevaAccionProps) => {
  const [formData, setFormData] = useState({
    matterId: matterId || '',
    title: '',
    type: 'presentar_escrito',
    responsible: 'Dr. Ricardo Darín',
    date: new Date().toISOString().split('T')[0],
    priority: 'Media',
    isBlocking: false,
    dependsOnThirdParty: false,
    thirdPartyType: 'Tribunal', // Tribunal, Cliente, Contraparte, Perito
    replacesNextAction: true,
    notes: '',
    healthImpact: 'Sano', // Sano, Trabado, Roto, En espera
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onSave(formData);
    }, 1500);
  };

  if (showSuccess) {
    return (
      <div className="py-10 text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Check size={40} className="text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tighter">¡Acción Registrada!</h2>
          <p className="text-muted-foreground text-sm font-medium">El motor del asunto se ha actualizado correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-6">
        {/* Matter Selection if not provided */}
        {!matterId && (
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Asunto Relacionado</label>
            <select 
              className="w-full h-12 px-4 bg-muted/30 border border-border/50 rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
              value={formData.matterId}
              onChange={e => setFormData({...formData, matterId: e.target.value})}
            >
              <option value="">Seleccionar Asunto...</option>
              {matters.map(m => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Main Action Info */}
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">¿Cuál es la acción concreta?</label>
            <Input 
              placeholder="Ej: Presentar memorial de agravios..." 
              className="bg-muted/30 border-border/50 text-lg font-bold h-14 focus:bg-card transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Tipo de Acción</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {ACTION_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setFormData({...formData, type: type.id})}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 text-center",
                      formData.type === type.id 
                        ? `bg-${type.color}-500/5 border-${type.color}-500 ring-1 ring-${type.color}-500/20` 
                        : "bg-muted/30 border-border/50 hover:border-primary/30"
                    )}
                  >
                    <Icon size={18} className={cn(formData.type === type.id ? `text-${type.color}-500` : "text-muted-foreground")} />
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter leading-tight",
                      formData.type === type.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Responsable</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <select 
                  className="w-full h-12 pl-10 bg-muted/30 border border-border/50 rounded-xl text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  value={formData.responsible}
                  onChange={e => setFormData({...formData, responsible: e.target.value})}
                >
                  <option value="Dr. Ricardo Darín">Dr. Ricardo Darín</option>
                  <option value="Dra. Mercedes Morán">Dra. Mercedes Morán</option>
                  <option value="Dr. Guillermo Francella">Dr. Guillermo Francella</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Fecha Límite / Seguimiento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  type="date"
                  className="pl-10 bg-muted/30 border-border/50 font-bold h-12"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Operational Status & Toggles */}
        <section className="space-y-6 pt-6 border-t border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Prioridad</label>
              <div className="flex gap-2">
                {['Baja', 'Media', 'Alta'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFormData({...formData, priority: p})}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.priority === p 
                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Impacto en Salud</label>
              <div className="flex gap-2">
                {['Sano', 'Trabado', 'En espera'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFormData({...formData, healthImpact: s})}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                      formData.healthImpact === s 
                        ? (s === 'Sano' ? "bg-emerald-500 border-emerald-500 text-white" : s === 'Trabado' ? "bg-rose-500 border-rose-500 text-white" : "bg-amber-500 border-amber-500 text-white")
                        : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ToggleButton 
              active={formData.isBlocking} 
              onClick={() => setFormData({...formData, isBlocking: !formData.isBlocking})}
              icon={ShieldAlert}
              label="Bloqueante"
              activeColor="rose"
            />
            <ToggleButton 
              active={formData.dependsOnThirdParty} 
              onClick={() => setFormData({...formData, dependsOnThirdParty: !formData.dependsOnThirdParty})}
              icon={Users}
              label="Depende de 3º"
              activeColor="sky"
            />
            <ToggleButton 
              active={formData.replacesNextAction} 
              onClick={() => setFormData({...formData, replacesNextAction: !formData.replacesNextAction})}
              icon={RotateCcw}
              label="Es la Próxima"
              activeColor="primary"
            />
          </div>

          {formData.dependsOnThirdParty && (
            <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 ml-1">¿De quién depende el avance?</label>
              <div className="flex flex-wrap gap-2">
                {['Tribunal', 'Cliente', 'Contraparte', 'Perito', 'Otro'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFormData({...formData, thirdPartyType: t})}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      formData.thirdPartyType === t 
                        ? "bg-sky-500 border-sky-500 text-white" 
                        : "bg-background border-sky-500/30 text-sky-600 hover:bg-sky-50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 pt-6 border-t border-border/50">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Notas y Contexto</label>
            <textarea 
              className="w-full min-h-[120px] bg-muted/30 border border-border/50 rounded-2xl p-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Detalles específicos sobre esta acción..."
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl"
              onClick={() => alert('Vincular Hito')}
            >
              <LinkIcon size={14} />
              Vincular Hito
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-[10px] font-black uppercase tracking-widest h-10 px-4 rounded-xl"
              onClick={() => alert('Vincular Documento')}
            >
              <FileText size={14} />
              Vincular Documento
            </Button>
          </div>
        </section>

        <div className="pt-6 border-t border-border/50">
          <Button 
            disabled={!formData.title || (!matterId && !formData.matterId)}
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black uppercase tracking-widest gap-2 h-14 shadow-lg shadow-primary/20"
          >
            Confirmar Acción
            <CheckCircle2 size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  activeColor: 'rose' | 'sky' | 'primary';
}

const ToggleButton = ({ active, onClick, icon: Icon, label, activeColor }: ToggleButtonProps) => {
  const colors = {
    rose: active ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/20" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-rose-500/30",
    sky: active ? "bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-sky-500/30",
    primary: active ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
        colors[activeColor]
      )}
    >
      <Icon size={14} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
};

interface ImpactItemProps {
  label: string;
  value: string;
  subValue: string;
  active: boolean;
  color?: 'emerald' | 'rose' | 'amber' | 'primary';
}

const ImpactItem = ({ label, value, subValue, active, color = 'primary' }: ImpactItemProps) => {
  const textColors = {
    primary: 'text-primary',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
  };

  return (
    <div className={cn("space-y-1 transition-opacity", !active && "opacity-30")}>
      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</div>
      <div className={cn("text-sm font-black tracking-tight truncate", textColors[color])}>{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground/70">{subValue}</div>
    </div>
  );
};
