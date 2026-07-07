import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  User,
  UserPlus,
  Calendar,
  FileText,
  Building2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input, Label, Textarea, MoneyInput, Badge } from './UI';
import { cn } from '../lib/utils';
import { detectarCruceViolencia } from '../lib/violencia';
import { DomicilioInput } from './DomicilioInput';
import { MatriculaInput } from './MatriculaInput';

interface SubFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

interface FichaFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'number' | 'money' | 'textarea' | 'repeatable' | 'info' | 'domicilio' | 'matricula';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  tone?: 'amber' | 'info' | 'rose';
  body?: string;
  subFields?: SubFieldDef[];
  addLabel?: string;
}

interface FichaSection {
  title: string;
  icon: string;
  fields: FichaFieldDef[];
}

interface StageFichaProps {
  isOpen: boolean;
  onClose: () => void;
  fichaTitle: string;
  stageName: string;
  sections: FichaSection[];
  currentData: Record<string, string>;
  onSave: (data: Record<string, string>) => void;
}

const IconMap: Record<string, React.ElementType> = {
  User, UserPlus, Calendar, FileText, Building2, AlertCircle, Briefcase,
};

export const StageFicha: React.FC<StageFichaProps> = ({
  isOpen,
  onClose,
  fichaTitle,
  stageName,
  sections,
  currentData,
  onSave,
}) => {
  const [data, setData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) setData({ ...currentData });
  }, [isOpen, currentData]);

  if (!isOpen) return null;

  const set = (key: string, value: string) =>
    setData(prev => ({ ...prev, [key]: value }));

  // Count filled fields
  const allKeys = sections.flatMap(s => s.fields.map(f => f.key));
  const filledCount = allKeys.filter(k => {
    const v = data[k];
    if (!v) return false;
    // For repeatables, check if array has items
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) && arr.length > 0;
    } catch {
      return v.trim().length > 0;
    }
  }).length;

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Sin onClick: cerrar por click afuera hacía perder la ficha a medio cargar. */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <header className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <div className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-1">
              Etapa: {stageName}
            </div>
            <h2 className="text-xl font-black tracking-tighter text-foreground">{fichaTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-[8px] font-black">
              {filledCount}/{allKeys.length} campos
            </Badge>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {sections.map(section => {
            const SectionIcon = IconMap[section.icon] || FileText;
            return (
              <div key={section.title} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <SectionIcon size={18} className="text-teal-700" />
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">
                    {section.title}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map(field => {
                    // ── Info / callout (no editable) ──
                    if (field.type === 'info') {
                      const tone = field.tone ?? 'amber';
                      const toneClasses = tone === 'rose'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                        : tone === 'info'
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200'
                          : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200';
                      return (
                        <div
                          key={field.key}
                          className={cn(
                            'md:col-span-2 flex items-start gap-3 p-3 rounded-xl border-2 border-dashed',
                            toneClasses,
                          )}
                        >
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1">
                              {field.label}
                            </div>
                            <p className="text-xs font-medium leading-relaxed">
                              {field.body}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // ── Repeatable ──
                    if (field.type === 'repeatable' && field.subFields) {
                      const items: Record<string, string>[] = (() => {
                        try { return JSON.parse(data[field.key] || '[]'); } catch { return []; }
                      })();
                      const updateItems = (newItems: Record<string, string>[]) =>
                        set(field.key, JSON.stringify(newItems));

                      return (
                        <div key={field.key} className="md:col-span-2 space-y-3">
                          <Label className="text-[10px]">{field.label}</Label>
                          {items.map((item, idx) => (
                            <div key={idx} className="relative bg-muted/20 border border-border/40 rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                                  onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {field.subFields!.map(sf => (
                                  <div key={sf.key} className={cn('space-y-1', sf.type === 'textarea' && 'md:col-span-2')}>
                                    <Label className="text-[10px]">
                                      {sf.label}
                                      {sf.required && <span className="text-rose-500 ml-0.5">*</span>}
                                    </Label>
                                    {sf.type === 'select' ? (
                                      <select
                                        className="w-full h-10 bg-background border border-border/50 rounded-lg px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-teal-700/20 transition-all appearance-none"
                                        value={item[sf.key] || ''}
                                        onChange={e => {
                                          const updated = [...items];
                                          updated[idx] = { ...updated[idx], [sf.key]: e.target.value };
                                          updateItems(updated);
                                        }}
                                      >
                                        <option value="">Seleccionar...</option>
                                        {sf.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    ) : sf.type === 'textarea' ? (
                                      <Textarea
                                        placeholder={sf.placeholder}
                                        className="min-h-[60px] bg-background border-border/50 text-sm"
                                        value={item[sf.key] || ''}
                                        onChange={e => {
                                          const updated = [...items];
                                          updated[idx] = { ...updated[idx], [sf.key]: e.target.value };
                                          updateItems(updated);
                                        }}
                                      />
                                    ) : (
                                      <Input
                                        type={sf.type === 'money' ? 'text' : sf.type}
                                        placeholder={sf.placeholder}
                                        className="bg-background border-border/50 font-bold h-10"
                                        value={item[sf.key] || ''}
                                        onChange={e => {
                                          const updated = [...items];
                                          updated[idx] = { ...updated[idx], [sf.key]: e.target.value };
                                          updateItems(updated);
                                        }}
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs font-bold"
                            onClick={() => updateItems([...items, {}])}
                          >
                            <Plus size={14} /> {field.addLabel || 'Agregar'}
                          </Button>
                        </div>
                      );
                    }

                    // GAP 21 — alerta inline al lado del campo de régimen de
                    // comunicación cuando hay medida de protección vigente.
                    const showCruceViolencia = field.key === 'regimen_comunicacion';
                    const cruce = showCruceViolencia ? detectarCruceViolencia(data) : null;

                    // ── Domicilio estructurado (GAP UX-35) ──
                    if (field.type === 'domicilio') {
                      return (
                        <div key={field.key} className="md:col-span-2 space-y-1.5">
                          <Label className="text-[10px]">
                            {field.label}
                            {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </Label>
                          <DomicilioInput
                            value={data[field.key] || ''}
                            onChange={v => set(field.key, v)}
                          />
                        </div>
                      );
                    }

                    if (field.type === 'matricula') {
                      return (
                        <div key={field.key} className="md:col-span-2 space-y-1.5">
                          <Label className="text-[10px]">
                            {field.label}
                            {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </Label>
                          <MatriculaInput
                            value={data[field.key] || ''}
                            onChange={v => set(field.key, v)}
                          />
                        </div>
                      );
                    }

                    // ── Standard fields ──
                    return (
                      <div key={field.key} className={cn('space-y-1.5', field.type === 'textarea' && 'md:col-span-2')}>
                        <Label className="text-[10px]">
                          {field.label}
                          {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                        </Label>
                        {cruce?.hayCruce && (
                          <div className={cn(
                            'flex items-start gap-2 p-2.5 rounded-lg border text-[11px]',
                            cruce.regimenLuceAmplio
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-200'
                              : 'bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200'
                          )}>
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <div>
                              <div className="font-black uppercase tracking-widest text-[9px] mb-0.5">
                                {cruce.regimenLuceAmplio ? '⚠ Posible inconsistencia' : 'Hay medida vigente'}
                              </div>
                              <div className="font-medium">{cruce.motivo}</div>
                            </div>
                          </div>
                        )}
                        {field.type === 'select' ? (
                          <select
                            className="w-full h-11 bg-muted/30 border border-border/50 rounded-xl px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-teal-700/20 transition-all appearance-none"
                            value={data[field.key] || ''}
                            onChange={e => set(field.key, e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <Textarea
                            placeholder={field.placeholder}
                            className="min-h-[80px] bg-muted/30 border-border/50 text-sm"
                            value={data[field.key] || ''}
                            onChange={e => set(field.key, e.target.value)}
                          />
                        ) : field.type === 'money' ? (
                          <MoneyInput
                            value={data[field.key] || ''}
                            onChange={v => set(field.key, v)}
                            showCurrencySelector
                            className="bg-muted/30"
                          />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            className="bg-muted/30 border-border/50 font-bold h-11"
                            value={data[field.key] || ''}
                            onChange={e => set(field.key, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="font-bold">{filledCount} de {allKeys.length} campos completados</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save size={14} /> Guardar Ficha
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};
