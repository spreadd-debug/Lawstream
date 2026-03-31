import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Badge, Label, Textarea } from './UI';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Briefcase, 
  Calendar, 
  FileText, 
  ShieldAlert, 
  Zap,
  Info,
  Search,
  Plus,
  X,
  Check,
  ChevronRight,
  UserPlus,
  Clock,
  LayoutDashboard,
  Target,
  FileCheck,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { findTemplate, SUBTYPES_BY_TYPE, WIZARD_FIELDS_BY_TEMPLATE, buildCaratula, type WizardSection } from '../data/templates';
import { Priority } from '../types';

interface CrearAsuntoProps {
  onBack: () => void;
  onSave: (data: any) => void | Promise<void>;
  clients?: { id: string; name: string; type: string; email: string; phone?: string }[];
  onCreateClient?: (data: { name: string; email: string; phone: string; type: 'Persona' | 'Empresa' }) => Promise<{ id: string; name: string; type: string; email: string; phone?: string }>;
  prefilledData?: {
    title?: string;
    client?: string;
    clientEmail?: string;
    clientPhone?: string;
    type?: string;
    description?: string;
    fromConsultationId?: string;
  } | null;
}




export const CrearAsunto = ({ onBack, onSave, prefilledData, clients = [], onCreateClient }: CrearAsuntoProps) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    type: '' as any,
    subtype: '',
    jurisdiction: '',
    via: '',
    etapaInicial: '',
    expediente: '',
    description: '',
    responsible: 'Dr. Ricardo Darín',
    priority: 'Media' as Priority,
    nextAction: '',
    nextActionDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    checklist: [] as { task: string; priority: string; completed?: boolean }[],
    docs: [] as { name: string; required: boolean; uploaded?: boolean }[],
    milestones: [] as string[],
    blockers: [] as string[],
    notes: '',
    selectedTemplateId: '',
    caseData: {} as Record<string, string>,
  });

  // Handle prefilled data from consultation
  useEffect(() => {
    if (prefilledData) {
      setFormData(prev => ({
        ...prev,
        title: prefilledData.title || prev.title,
        type: prefilledData.type || prev.type,
        description: prefilledData.description || prev.description,
      }));

      if (prefilledData.client) {
        const existingClient = clients.find(c =>
          c.name.toLowerCase() === prefilledData.client?.toLowerCase()
        );
        if (existingClient) {
          setSelectedClient(existingClient);
        } else {
          // Pre-fill the new client form with consultation data
          setIsCreatingClient(true);
          setNewClientData({
            name:  prefilledData.client,
            email: prefilledData.clientEmail || '',
            phone: prefilledData.clientPhone || '',
            type:  'Persona',
          });
        }
      }
    }
  }, [prefilledData]);

  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'Persona' as 'Persona' | 'Empresa'
  });

  // Resolve the active template and its wizard sections
  const activeTemplate = useMemo(() => findTemplate(formData.type, formData.subtype), [formData.type, formData.subtype]);
  const wizardSections: WizardSection[] = useMemo(
    () => (activeTemplate ? WIZARD_FIELDS_BY_TEMPLATE[activeTemplate.id] || [] : []),
    [activeTemplate]
  );
  const hasWizardStep = wizardSections.length > 0;
  const totalSteps = hasWizardStep ? 5 : 4;

  // Auto-generar carátula estándar a partir de los datos del wizard
  useEffect(() => {
    if (!activeTemplate || titleManuallyEdited) return;
    const caratula = buildCaratula(activeTemplate.id, formData.caseData, selectedClient?.name || '');
    if (caratula) {
      setFormData(prev => ({ ...prev, title: caratula }));
    }
  }, [formData.caseData, activeTemplate, selectedClient, titleManuallyEdited]);

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        // Si hay wizard, el título se auto-genera en paso 2 — no exigirlo acá
        return (hasWizardStep || formData.title) && formData.type && formData.subtype && selectedClient;
      case 2:
        if (!hasWizardStep) return formData.responsible && formData.nextAction && formData.nextActionDate;
        // Validate required wizard fields + que la carátula se haya generado
        return formData.title && wizardSections.every(section =>
          section.fields.filter(f => f.required).every(f => formData.caseData[f.key]?.trim())
        );
      case 3:
        if (hasWizardStep) return formData.responsible && formData.nextAction && formData.nextActionDate;
        return true;
      default:
        return true;
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.name) return;
    let newClient: { id: string; name: string; type: string; email: string; phone?: string };
    if (onCreateClient) {
      try {
        newClient = await onCreateClient(newClientData);
      } catch {
        // fallback: use temp id if DB save fails
        newClient = { id: crypto.randomUUID(), ...newClientData };
      }
    } else {
      newClient = { id: crypto.randomUUID(), ...newClientData };
    }
    setSelectedClient(newClient);
    setIsCreatingClient(false);
    setNewClientData({ name: '', email: '', phone: '', type: 'Persona' });
  };

  // Update suggestions when template changes
  useEffect(() => {
    const estructuraStep = hasWizardStep ? 4 : 3;
    if (step === estructuraStep && formData.checklist.length === 0) {
      const template = findTemplate(formData.type, formData.subtype);

      if (template) {
        setFormData(prev => ({
          ...prev,
          selectedTemplateId: template.id,
          checklist: template.checklistBase.map(c => ({ ...c, completed: false })),
          docs: template.documentosBase.map(d => ({ ...d, uploaded: false })),
          milestones: template.hitosProyectados,
          blockers: template.bloqueantesTipicos,
          nextAction: prev.nextAction || template.proximaAccionSugerida,
          nextActionDate: prev.nextActionDate || format(addDays(new Date(), template.fechaSeguimientoSugeridaDays), 'yyyy-MM-dd'),
          priority: prev.priority === 'Media' ? template.prioridadSugerida : prev.priority,
          notes: prev.notes || template.notasOperativas || ''
        }));
      }
    }
  }, [step, formData.type, formData.subtype]);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const steps = hasWizardStep
    ? [
        { id: 1, label: 'Identificación', icon: Briefcase },
        { id: 2, label: 'Datos del Caso', icon: User },
        { id: 3, label: 'Operatividad', icon: Zap },
        { id: 4, label: 'Estructura', icon: LayoutDashboard },
        { id: 5, label: 'Revisión', icon: CheckCircle2 },
      ]
    : [
        { id: 1, label: 'Identificación', icon: Briefcase },
        { id: 2, label: 'Operatividad', icon: Zap },
        { id: 3, label: 'Estructura Operativa', icon: LayoutDashboard },
        { id: 4, label: 'Revisión', icon: CheckCircle2 },
      ];

  const nextStep = () => { setDirection(1); setStep(s => Math.min(s + 1, totalSteps)); };
  const prevStep = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  const handleToggleItem = (list: 'checklist' | 'docs', itemName: string) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].map((item: any) => {
        if (list === 'checklist' && item.task === itemName) {
          return { ...item, completed: !item.completed };
        }
        if (list === 'docs' && item.name === itemName) {
          return { ...item, uploaded: !item.uploaded };
        }
        return item;
      })
    }));
  };

  const handleRemoveItem = (list: 'checklist' | 'docs', itemName: string) => {
    setFormData(prev => ({
      ...prev,
      [list]: prev[list].filter((item: any) => {
        if (list === 'checklist') return item.task !== itemName;
        if (list === 'docs') return item.name !== itemName;
        return true;
      })
    }));
  };

  const handleAddItem = (list: 'checklist' | 'docs' | 'milestones') => {
    if (list === 'checklist') {
      const task = window.prompt('Nombre de la nueva tarea:');
      if (task) {
        setFormData(prev => ({
          ...prev,
          checklist: [...prev.checklist, { task, priority: 'recomendado', completed: false }]
        }));
      }
    } else if (list === 'docs') {
      const name = window.prompt('Nombre del nuevo documento:');
      if (name) {
        setFormData(prev => ({
          ...prev,
          docs: [...prev.docs, { name, required: false, uploaded: false }]
        }));
      }
    } else if (list === 'milestones') {
      const name = window.prompt('Nombre del nuevo hito:');
      if (name) {
        setFormData(prev => ({
          ...prev,
          milestones: [...prev.milestones, name]
        }));
      }
    }
  };

  // Map visual step to logical step name
  const getLogicalStep = () => {
    if (!hasWizardStep) {
      return ['identification', 'operatividad', 'estructura', 'revision'][step - 1];
    }
    return ['identification', 'datos-caso', 'operatividad', 'estructura', 'revision'][step - 1];
  };

  const renderWizardFieldsStep = () => (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter text-foreground">Datos del Caso</h2>
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-3">
            <Zap size={12} className="fill-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">{activeTemplate?.name}</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Completá los datos específicos para este tipo de asunto. LawStream adapta el formulario según la materia.
        </p>
      </div>

      <div className="space-y-8">
        {wizardSections.map((section) => {
          const IconMap: Record<string, any> = { User, UserPlus, Calendar, FileText, Building2, AlertCircle, Briefcase };
          const SectionIcon = IconMap[section.icon] || FileText;
          return (
            <div key={section.title} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <SectionIcon size={18} className="text-teal-700" />
                <span className="text-xs font-black uppercase tracking-widest text-foreground">{section.title}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.key} className={cn("space-y-1.5", field.type === 'textarea' && "md:col-span-2")}>
                    <Label className="text-[10px]">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </Label>
                    {field.type === 'select' ? (
                      <select
                        className="w-full h-11 bg-muted/30 border border-border/50 rounded-xl px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-teal-700/20 transition-all appearance-none"
                        value={formData.caseData[field.key] || ''}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          caseData: { ...prev.caseData, [field.key]: e.target.value }
                        }))}
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
                        value={formData.caseData[field.key] || ''}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          caseData: { ...prev.caseData, [field.key]: e.target.value }
                        }))}
                      />
                    ) : (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        className="bg-muted/30 border-border/50 font-bold h-11"
                        value={formData.caseData[field.key] || ''}
                        onChange={e => setFormData(prev => ({
                          ...prev,
                          caseData: { ...prev.caseData, [field.key]: e.target.value }
                        }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderStep = () => {
    const logical = getLogicalStep();
    switch (logical) {
      case 'identification':
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tighter text-foreground">Identificación del Asunto</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    Sentemos las bases del asunto. ¿De qué se trata y para quién es?
                  </p>
                </div>
                {prefilledData && (
                  <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20 gap-1.5 py-1.5 px-4 animate-pulse">
                    <Zap size={12} className="fill-teal-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Datos de consulta</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* Tipo + Subtipo — Primero, como cards seleccionables */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Briefcase size={13} className="text-teal-600" />
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo de Asunto</Label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { value: 'Laboral', icon: '⚖️', color: 'teal' },
                  { value: 'Familia', icon: '👨‍👩‍👧', color: 'violet' },
                  { value: 'Daños', icon: '🩹', color: 'amber' },
                  { value: 'Comercial', icon: '📑', color: 'blue' },
                  { value: 'Sucesiones', icon: '📜', color: 'stone' },
                ].map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setFormData({...formData, type: t.value, subtype: '', title: '', caseData: {}}); setTitleManuallyEdited(false); }}
                    className={cn(
                      "relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                      formData.type === t.value
                        ? "border-teal-500 bg-teal-500/10 shadow-md shadow-teal-500/10 scale-[1.02]"
                        : "border-border/50 bg-card/50 hover:border-teal-500/30 hover:bg-teal-500/5"
                    )}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                      formData.type === t.value ? "text-teal-700" : "text-muted-foreground"
                    )}>{t.value}</span>
                    {formData.type === t.value && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtipo */}
            {formData.type && SUBTYPES_BY_TYPE[formData.type]?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Target size={13} className="text-teal-600" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Materia</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUBTYPES_BY_TYPE[formData.type].map(s => (
                    <button
                      key={s.value}
                      onClick={() => { setFormData({...formData, subtype: s.value, title: '', caseData: {}}); setTitleManuallyEdited(false); }}
                      className={cn(
                        "px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                        formData.subtype === s.value
                          ? "border-teal-500 bg-teal-500/10 text-teal-700 shadow-sm"
                          : "border-border/50 bg-card/50 text-muted-foreground hover:border-teal-500/30 hover:text-foreground"
                      )}
                    >
                      {s.label}
                      {formData.subtype === s.value && <Check size={14} className="inline ml-2 text-teal-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Cliente + Carátula — Agrupados en card */}
            <Card className="p-6 border-border/50 bg-card/80 space-y-6">
              {/* Cliente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <User size={13} className="text-teal-600" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cliente Principal</Label>
                </div>
                {isCreatingClient ? (
                  <Card className="p-5 border-teal-500/30 bg-teal-500/5 space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <UserPlus size={16} className="text-teal-600" />
                        <span className="text-xs font-black uppercase tracking-widest text-teal-700">Nuevo Cliente</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setIsCreatingClient(false)}>
                        <X size={16} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px]">Nombre Completo / Razón Social</Label>
                        <Input
                          value={newClientData.name}
                          onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                          placeholder="Nombre del cliente..."
                          className="bg-background h-10 border-teal-500/20 focus:border-teal-500/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px]">Tipo de Cliente</Label>
                        <div className="flex gap-2">
                          {['Persona', 'Empresa'].map(t => (
                            <button
                              key={t}
                              onClick={() => setNewClientData({...newClientData, type: t as any})}
                              className={cn(
                                "flex-1 h-10 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                newClientData.type === t ? "bg-teal-500 border-teal-500 text-white" : "bg-background border-border text-muted-foreground hover:border-teal-500/30"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px]">Email</Label>
                        <Input
                          value={newClientData.email}
                          onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                          placeholder="email@ejemplo.com"
                          className="bg-background h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px]">Teléfono</Label>
                        <Input
                          value={newClientData.phone}
                          onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                          placeholder="+54 9 11..."
                          className="bg-background h-10"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <Button size="sm" onClick={handleCreateClient} disabled={!newClientData.name} className="gap-2 bg-teal-600 hover:bg-teal-700">
                        <Check size={14} />
                        Crear y Seleccionar
                      </Button>
                    </div>
                  </Card>
                ) : selectedClient ? (
                  <div className="p-4 rounded-xl border-2 border-teal-500 bg-teal-500/5 flex items-center justify-between animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-teal-500/20">
                        {selectedClient.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{selectedClient.name}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          {selectedClient.type} {selectedClient.email && `· ${selectedClient.email}`}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground">
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        placeholder="Buscar cliente por nombre o DNI..."
                        className="pl-12 bg-muted/20 border-border/50 h-12 focus:border-teal-500/40"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                    </div>
                    {clientSearch && (
                      <Card className="p-2 border border-border/50 shadow-xl max-h-48 overflow-y-auto">
                        {filteredClients.map(client => (
                          <button
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-teal-500/5 rounded-lg transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black">
                              {client.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold">{client.name}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{client.type}</div>
                            </div>
                          </button>
                        ))}
                        <button
                          className="w-full p-3 flex items-center gap-3 text-teal-600 hover:bg-teal-500/5 rounded-lg transition-colors text-left border-t border-border/50 mt-1"
                          onClick={() => setIsCreatingClient(true)}
                        >
                          <UserPlus size={16} />
                          <span className="text-sm font-bold">Crear nuevo cliente "{clientSearch}"</span>
                        </button>
                      </Card>
                    )}
                  </div>
                )}
              </div>

              {/* Carátula */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <FileText size={13} className="text-teal-600" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Carátula</Label>
                </div>
                {(hasWizardStep || (formData.type && formData.subtype)) && !formData.title && !titleManuallyEdited ? (
                  <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5">
                    <Zap size={14} className="text-teal-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {hasWizardStep
                        ? 'Se genera automáticamente en el próximo paso con los datos del caso'
                        : 'Completá los datos para auto-generar la carátula'}
                    </span>
                  </div>
                ) : (
                  <Input
                    placeholder="Ej: Bianucci, Santiago c/ Bonzi, Aldo s/ despido"
                    className={cn(
                      "border-border/50 font-bold h-12 transition-all",
                      formData.title && !titleManuallyEdited
                        ? "bg-teal-500/5 border-teal-500/30 text-teal-900"
                        : "bg-muted/20 focus:border-teal-500/40"
                    )}
                    value={formData.title}
                    onChange={e => {
                      setFormData({...formData, title: e.target.value});
                      setTitleManuallyEdited(true);
                    }}
                  />
                )}
                {formData.title && !titleManuallyEdited && (
                  <p className="text-[11px] text-teal-600 flex items-center gap-1.5">
                    <Zap size={10} className="fill-teal-500" />
                    Generada automáticamente — editala si necesitás ajustarla
                  </p>
                )}
              </div>
            </Card>

          </div>
        );
      case 'datos-caso':
        return renderWizardFieldsStep();
      case 'operatividad':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tighter text-foreground">Operatividad Inicial</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Todo asunto en Lawstream debe tener un motor: responsable y próxima acción.
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <Label>Responsable del Asunto</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['Dr. Ricardo Darín', 'Dra. Mercedes Morán', 'Dr. Guillermo Francella'].map(name => (
                    <button
                      key={name}
                      onClick={() => setFormData({...formData, responsible: name})}
                      className={cn(
                        "p-4 rounded-xl border flex items-center gap-3 transition-all text-left",
                        formData.responsible === name 
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                          : "bg-muted/30 border-border/50 hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black border",
                        formData.responsible === name ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border"
                      )}>
                        {name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{name}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Socio Principal</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label>Prioridad Operativa</Label>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'Baja', label: 'Baja', desc: 'De fondo', color: 'sky' },
                      { id: 'Media', label: 'Media', desc: 'Estándar', color: 'amber' },
                      { id: 'Alta', label: 'Alta', desc: 'Crítico', color: 'rose' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setFormData({...formData, priority: p.id})}
                        className={cn(
                          "p-3 rounded-xl border flex items-center justify-between transition-all",
                          formData.priority === p.id 
                            ? `bg-${p.color}-500/5 border-${p.color}-500/50 shadow-sm` 
                            : "bg-muted/30 border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-2 h-2 rounded-full", `bg-${p.color}-500`)} />
                          <span className="text-sm font-bold">{p.label}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Próxima Acción Inicial</Label>
                  <div className="space-y-4">
                    <Input 
                      placeholder="¿Qué es lo primero que hay que hacer?" 
                      className="bg-muted/30 border-border/50 font-bold h-12"
                      value={formData.nextAction}
                      onChange={e => setFormData({...formData, nextAction: e.target.value})}
                    />
                    <div className="space-y-2">
                      <Label className="text-[9px]">Fecha de Seguimiento</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input 
                          type="date"
                          className="pl-10 bg-muted/30 border-border/50 font-bold h-12"
                          value={formData.nextActionDate}
                          onChange={e => setFormData({...formData, nextActionDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'estructura':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tighter text-foreground">Estructura Operativa</h2>
              <p className="text-sm text-muted-foreground font-medium">
                LawStream sugiere una base según el tipo de asunto. Podés ajustarla ahora o después.
              </p>
            </div>

            <div className="space-y-8">
              {(!formData.type && !formData.subtype) ? (
                <div className="p-12 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <LayoutDashboard size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">Sin estructura sugerida</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Seleccioná tipo o subtipo para sugerir una estructura operativa inicial.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setStep(1)} className="mt-4">
                    Volver a Identificación
                  </Button>
                </div>
              ) : (
                <>
                  {!formData.selectedTemplateId && (
                    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                        <Info size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-amber-700 uppercase tracking-tight">No hay una plantilla específica para "{formData.subtype || formData.type}"</h4>
                        <p className="text-xs text-amber-700/70 font-medium leading-relaxed">
                          Podés continuar manualmente agregando las tareas, documentos e hitos que consideres necesarios para este asunto.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Checklist Inicial</Label>
                        <Badge variant="outline" className="text-[9px]">Sugerido</Badge>
                      </div>
                      <div className="space-y-2">
                        {formData.checklist.map(item => (
                          <div
                            key={item.task}
                            onClick={() => handleToggleItem('checklist', item.task)}
                            className="w-full p-3 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between hover:bg-muted/40 transition-all text-left group cursor-pointer"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggleItem('checklist', item.task);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                item.completed ? "bg-primary border-primary" : "bg-background border-border"
                              )}>
                                {item.completed && <Check size={12} className="text-white" />}
                              </div>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-xs font-medium transition-all",
                                  item.completed ? "text-foreground line-through opacity-50" : "text-foreground"
                                )}>{item.task}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[8px] uppercase tracking-widest px-1.5 py-0 h-4",
                                  item.priority === 'crítico' ? "border-rose-500/50 text-rose-500 bg-rose-500/5" :
                                  item.priority === 'recomendado' ? "border-amber-500/50 text-amber-500 bg-amber-500/5" :
                                  "border-muted-foreground/30 text-muted-foreground"
                                )}
                              >
                                {item.priority}
                              </Badge>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem('checklist', item.task);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => handleAddItem('checklist')}
                          className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Plus size={14} />
                          <span className="text-xs font-bold uppercase tracking-widest">Agregar item</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Hitos del Camino</Label>
                        <Badge variant="outline" className="text-[9px]">Proyectado</Badge>
                      </div>
                      <div className="space-y-2">
                        {formData.milestones.map((m, idx) => (
                          <div
                            key={m}
                            className="w-full p-3 rounded-xl border border-border/50 bg-muted/20 flex items-center gap-3 relative overflow-hidden group"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20" />
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-medium text-foreground flex-1">{m}</span>
                            <button 
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  milestones: prev.milestones.filter(item => item !== m)
                                }));
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-all"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => handleAddItem('milestones')}
                          className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Plus size={14} />
                          <span className="text-xs font-bold uppercase tracking-widest">Agregar hito</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Documentación Requerida</Label>
                        <Badge variant="outline" className="text-[9px]">Base</Badge>
                      </div>
                      <div className="space-y-2">
                        {formData.docs.map(doc => (
                          <div
                            key={doc.name}
                            className="w-full p-3 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <FileText size={16} className={cn(
                                "transition-colors",
                                doc.uploaded ? "text-emerald-500" : "text-muted-foreground"
                              )} />
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-foreground">{doc.name}</span>
                                {doc.required && <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Requerido</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleToggleItem('docs', doc.name)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-all",
                                  doc.uploaded ? "bg-emerald-500/10 text-emerald-500" : "bg-muted hover:bg-primary/10 hover:text-primary"
                                )}
                              >
                                {doc.uploaded ? <Check size={14} /> : <Plus size={14} />}
                              </button>
                              <button 
                                onClick={() => handleRemoveItem('docs', doc.name)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => handleAddItem('docs')}
                          className="w-full p-3 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <Plus size={14} />
                          <span className="text-xs font-bold uppercase tracking-widest">Agregar documento</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label>Notas Internas / Observaciones</Label>
                      <Textarea 
                        placeholder="Cualquier detalle relevante para el equipo..."
                        value={formData.notes}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="min-h-[140px]"
                      />
                    </div>
                  </div>

                  {formData.blockers.length > 0 && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-600">
                        <ShieldAlert size={18} />
                        <span className="text-xs font-black uppercase tracking-widest">Bloqueos Típicos Detectados</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {formData.blockers.map(blocker => (
                          <div key={blocker} className="flex items-center gap-2 text-xs font-medium text-rose-700/70">
                            <div className="w-1 h-1 rounded-full bg-rose-500" />
                            {blocker}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      case 'revision':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tighter text-foreground">Revisión y Alta</h2>
              <p className="text-sm text-muted-foreground font-medium">
                Todo listo. El asunto entrará al flujo operativo inmediatamente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border border-border/50 bg-muted/10 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Asunto</div>
                      <div className="text-lg font-black tracking-tight text-foreground">{formData.title || 'Sin título'}</div>
                      {formData.subtype && <div className="text-xs font-bold text-primary mt-0.5">{formData.subtype}</div>}
                    </div>
                    {formData.selectedTemplateId && (
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                        Template Activo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Tipo</div>
                      <Badge variant="outline" className="font-bold">{formData.type || 'No definido'}</Badge>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Prioridad</div>
                      <div className={cn(
                        "text-xs font-bold",
                        formData.priority === 'Alta' ? "text-rose-600" : formData.priority === 'Media' ? "text-amber-600" : "text-sky-600"
                      )}>{formData.priority}</div>
                    </div>
                    {formData.expediente && (
                      <div>
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Expediente</div>
                        <div className="text-xs font-mono font-bold">{formData.expediente}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20">
                    {formData.responsible.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Responsable</div>
                    <div className="text-sm font-bold">{formData.responsible}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border border-primary/20 bg-primary/5 space-y-6">
                <div className="flex items-center gap-2 text-primary">
                  <Zap size={18} className="fill-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Motor Operativo</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Próxima Acción</div>
                    <div className="text-base font-bold text-foreground">{formData.nextAction || 'Falta definir'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Fecha de Seguimiento</div>
                    <div className="flex items-center gap-2 text-sm font-black text-foreground">
                      <Calendar size={16} className="text-primary" />
                      {formData.nextActionDate ? format(new Date(formData.nextActionDate), "d 'de' MMMM", { locale: es }) : '--'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-primary/10">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Estructura Inicial</div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      {formData.checklist.length} Tareas
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <FileText size={14} className="text-sky-500" />
                      {formData.docs.length} Documentos
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                      <Target size={14} className="text-amber-500" />
                      {formData.milestones.length} Hitos
                    </div>
                    {formData.blockers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500">
                        <ShieldAlert size={14} />
                        {formData.blockers.length} Riesgos
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Case-specific data summary */}
            {Object.keys(formData.caseData).filter(k => formData.caseData[k]).length > 0 && (
              <Card className="p-6 border border-border/50 bg-muted/10 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest text-foreground">Datos del Caso</span>
                  <Badge variant="outline" className="text-[8px] ml-auto">
                    {Object.values(formData.caseData).filter(Boolean).length} campos
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {wizardSections.flatMap(s => s.fields).filter(f => formData.caseData[f.key]).map(f => (
                    <div key={f.key} className="space-y-0.5">
                      <div className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em]">{f.label}</div>
                      <div className="text-xs font-bold text-foreground truncate">{formData.caseData[f.key]}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Listo para el flujo</p>
                <p className="text-xs text-muted-foreground font-medium">Al confirmar, el asunto se activará en la mesa de control de {formData.responsible.split(' ').pop()}.</p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Wizard Area */}
        <div className="flex-1 max-w-3xl">
          <header className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <button 
                onClick={onBack}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all border border-transparent hover:border-border"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xs font-black uppercase tracking-[0.3em] text-teal-700">Nuevo Asunto</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black tracking-tighter">LawStream</span>
                  <span className="text-2xl font-light text-muted-foreground">/</span>
                  <span className="text-2xl font-bold tracking-tighter text-muted-foreground">Alta Asistida</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onBack}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </header>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-12 relative">
            <motion.div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] -z-10"
              style={{ background: `linear-gradient(to right, #5eead4 ${((step - 1) / (totalSteps - 1)) * 100}%, #e2e8f0 ${((step - 1) / (totalSteps - 1)) * 100}%)` }}
              layout
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
            {steps.map((s) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              
              return (
                <div key={s.id} className="flex flex-col items-center gap-3 bg-background px-4">
                  <motion.div
                    layout
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border-2",
                      isActive ? "bg-teal-700 border-teal-700 text-white shadow-lg shadow-teal-700/20" :
                      isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                      "bg-background border-border text-muted-foreground"
                    )}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                    isActive ? "text-teal-700" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="min-h-[450px] relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d * 80, opacity: 0, scale: 0.98 }),
                  center: { x: 0, opacity: 1, scale: 1 },
                  exit: (d: number) => ({ x: d * -80, opacity: 0, scale: 0.98 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="mt-12 flex items-center justify-between pt-8 border-t border-border">
            <Button 
              variant="ghost" 
              onClick={prevStep}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Anterior
            </Button>
            
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Paso {step} de {totalSteps}</span>
              {step < totalSteps ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(step)}
                    className="bg-teal-700 hover:bg-teal-800 text-white gap-2 px-8"
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                  <Button
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (isSubmitting) return;
                      setIsSubmitting(true);
                      try {
                        await onSave({ ...formData, client: selectedClient?.name || '', clientId: selectedClient?.id || '' });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8"
                  >
                    {isSubmitting ? 'Creando...' : 'Confirmar y Activar'}
                    {!isSubmitting && <CheckCircle2 size={16} />}
                  </Button>
                </motion.div>
              )}
            </div>
          </footer>
        </div>

        {/* Live Summary Sidebar */}
        <aside className="hidden lg:block w-80 shrink-0">
          <div className="sticky top-8 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Resumen en vivo</span>
            </div>

            <Card className="p-6 border border-border/50 border-l-2 border-l-teal-400 bg-card/50 backdrop-blur-sm space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/[0.08] rounded-full -mr-16 -mt-16 blur-3xl" />
              
              <div className="space-y-6 relative">
                {/* Matter Identity */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Asunto</div>
                    <div className={cn(
                      "text-base font-black tracking-tight transition-all",
                      formData.title ? "text-foreground" : "text-muted-foreground/30 italic"
                    )}>
                      {formData.title || 'Sin título aún'}
                    </div>
                    {formData.subtype && (
                      <div className="text-[10px] font-bold text-primary animate-in fade-in slide-in-from-left-2">
                        {formData.subtype}
                      </div>
                    )}
                  </div>

                  {activeTemplate && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-2">
                        <Zap size={12} className="text-primary fill-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Workflow activo</span>
                      </div>
                      <div className="text-[10px] font-bold text-foreground mt-1">{activeTemplate.name}</div>
                      {activeTemplate.stages && (
                        <div className="text-[9px] text-muted-foreground mt-0.5">{activeTemplate.stages.length} etapas</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cliente</div>
                      <div className={cn(
                        "text-xs font-bold transition-all",
                        selectedClient ? "text-foreground" : "text-muted-foreground/30"
                      )}>
                        {selectedClient?.name || 'No seleccionado'}
                      </div>
                    </div>
                    {formData.type && (
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold">
                        {formData.type}
                      </Badge>
                    )}
                  </div>

                  {formData.description && (
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/50 animate-in fade-in slide-in-from-top-2">
                      <div className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Descripción</div>
                      <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-relaxed italic">
                        "{formData.description}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Operational Motor */}
                <div className="space-y-4 pt-6 border-t border-border/50">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Responsable</div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">
                        {formData.responsible.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs font-bold text-foreground">{formData.responsible}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Próxima Acción</div>
                    <div className={cn(
                      "text-xs font-bold transition-all",
                      formData.nextAction ? "text-primary" : "text-muted-foreground/30"
                    )}>
                      {formData.nextAction || 'Pendiente de definir'}
                    </div>
                    {formData.nextActionDate && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mt-1">
                        <Calendar size={12} />
                        {format(new Date(formData.nextActionDate), "d 'de' MMM", { locale: es })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Structure Progress */}
                <div className="space-y-4 pt-6 border-t border-border/50">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">Estructura Operativa</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground">Tareas iniciales</span>
                      <span className="text-foreground">{formData.checklist.length}</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        animate={{ width: `${(formData.checklist.length / 5) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground">Documentación</span>
                      <span className="text-foreground">{formData.docs.length}</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-sky-500"
                        animate={{ width: `${(formData.docs.length / 5) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground">Hitos proyectados</span>
                      <span className="text-foreground">{formData.milestones.length}</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-500"
                        animate={{ width: `${(formData.milestones.length / 4) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 border-l-2 border-l-teal-400">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-teal-700" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Tip Lawstream</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                Un asunto con responsable y próxima acción clara tiene un 80% más de probabilidades de avanzar sin bloqueos.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
