import React, { useState, useMemo } from 'react';
import { Card, Badge, Button, Input, Drawer } from './UI';
import { LegalTemplate, MatterType } from '../types';
import { LEGAL_TEMPLATES } from '../data/legalTemplates';
import { cn } from '../lib/utils';
import {
  FileText,
  Search,
  Copy,
  Check,
  Scale,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  ClipboardCheck,
  Edit3,
  Eye,
  Sparkles,
  Filter,
  X,
} from 'lucide-react';

const CATEGORY_COLORS: Record<MatterType, string> = {
  Laboral: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Familia: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  Daños: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Comercial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Sucesiones: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Civil: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const CATEGORY_ICONS: Record<MatterType, string> = {
  Laboral: 'L',
  Familia: 'F',
  Daños: 'D',
  Comercial: 'C',
  Sucesiones: 'S',
  Civil: 'Ci',
};

export const Plantillas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MatterType | 'Todas'>('Todas');
  const [selectedTemplate, setSelectedTemplate] = useState<LegalTemplate | null>(null);
  const [mode, setMode] = useState<'preview' | 'generate'>('preview');
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const categories: (MatterType | 'Todas')[] = ['Todas', 'Laboral', 'Familia', 'Daños', 'Comercial', 'Sucesiones', 'Civil'];

  const filtered = useMemo(() => {
    return LEGAL_TEMPLATES.filter(t => {
      const matchesCategory = selectedCategory === 'Todas' || t.category === selectedCategory;
      const matchesSearch = searchTerm === '' ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = { Todas: LEGAL_TEMPLATES.length };
    LEGAL_TEMPLATES.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, []);

  const openTemplate = (template: LegalTemplate) => {
    setSelectedTemplate(template);
    setMode('preview');
    const defaults: Record<string, string> = {};
    template.placeholders.forEach(p => {
      defaults[p.key] = p.defaultValue || '';
    });
    setPlaceholderValues(defaults);
    setCopied(false);
  };

  const closeTemplate = () => {
    setSelectedTemplate(null);
    setPlaceholderValues({});
    setCopied(false);
  };

  const renderedContent = useMemo(() => {
    if (!selectedTemplate) return '';
    let text = selectedTemplate.content;
    selectedTemplate.placeholders.forEach(p => {
      const value = placeholderValues[p.key] || `{{${p.key}}}`;
      const regex = new RegExp(`\\{\\{${p.key}\\}\\}`, 'g');
      text = text.replace(regex, value);
    });
    return text;
  }, [selectedTemplate, placeholderValues]);

  const allFilled = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.placeholders.every(p => placeholderValues[p.key]?.trim());
  }, [selectedTemplate, placeholderValues]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(renderedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = renderedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <Scale className="text-primary" size={28} />
            Plantillas Legales
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Modelos de escritos judiciales basados en legislación argentina vigente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1.5 px-3">
            <BookOpen size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">{LEGAL_TEMPLATES.length} plantillas</span>
          </Badge>
        </div>
      </header>

      {/* Search */}
      <Card className="p-5 border border-border/50 bg-card/30 rounded-2xl">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
            <Input
              placeholder="Buscar por nombre, tipo, etiqueta o artículo..."
              className="pl-12 h-12 bg-background/50 border-border/40 rounded-xl"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30'
              )}
            >
              {cat}
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-md',
                selectedCategory === cat
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted/50'
              )}>
                {categoryCount[cat] || 0}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length > 0 ? (
          filtered.map(template => (
            <Card
              key={template.id}
              className="p-6 flex flex-col justify-between group bg-card border-border/50 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer rounded-2xl"
              onClick={() => openTemplate(template)}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black border',
                    CATEGORY_COLORS[template.category]
                  )}>
                    {CATEGORY_ICONS[template.category]}
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>

                <h3 className="text-base font-black tracking-tight text-foreground group-hover:text-primary transition-colors mb-2 leading-tight">
                  {template.title}
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  <Badge className={cn('text-[8px] font-black uppercase tracking-widest py-0.5 rounded-md border', CATEGORY_COLORS[template.category])}>
                    {template.category}
                  </Badge>
                  <Badge variant="outline" className="text-[8px] font-bold tracking-wide py-0.5 rounded-md">
                    {template.subcategory}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <Scale size={10} className="text-primary/60" />
                  {template.legalBasis.length > 60
                    ? template.legalBasis.slice(0, 60) + '...'
                    : template.legalBasis}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/5">
            <FileText size={48} className="mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">No se encontraron plantillas</p>
            <p className="text-xs text-muted-foreground mt-2">Probá con otro término de búsqueda o categoría.</p>
          </div>
        )}
      </div>

      {/* Template Detail Drawer */}
      <Drawer
        isOpen={!!selectedTemplate}
        onClose={closeTemplate}
        title={selectedTemplate?.title || ''}
        size="xl"
      >
        {selectedTemplate && (
          <div className="flex flex-col h-full">
            {/* Template header info */}
            <div className="px-1 pb-5 border-b border-border/50 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('text-[9px] font-black uppercase tracking-widest py-1 rounded-lg border', CATEGORY_COLORS[selectedTemplate.category])}>
                  {selectedTemplate.category}
                </Badge>
                <Badge variant="outline" className="text-[9px] font-bold tracking-wide py-1 rounded-lg">
                  {selectedTemplate.subcategory}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>
              <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <Scale size={14} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-primary">{selectedTemplate.legalBasis}</p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedTemplate.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-bold text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl mt-4 mx-1 border border-border/30">
              <button
                onClick={() => setMode('preview')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  mode === 'preview'
                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Eye size={14} />
                Vista Previa
              </button>
              <button
                onClick={() => setMode('generate')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  mode === 'generate'
                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Edit3 size={14} />
                Completar y Generar
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto mt-4 px-1">
              {mode === 'preview' ? (
                <div className="space-y-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-muted/10 p-6 rounded-2xl border border-border/30">
                    {selectedTemplate.content}
                  </pre>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedTemplate.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      className="gap-2 text-[10px] font-black uppercase tracking-widest bg-muted hover:bg-muted/80 text-foreground rounded-xl h-10 px-5"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado' : 'Copiar Plantilla'}
                    </Button>
                    <Button
                      onClick={() => setMode('generate')}
                      className="gap-2 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-5 shadow-lg shadow-primary/20"
                    >
                      <Sparkles size={14} />
                      Completar Variables
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Placeholder Form */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 size={16} className="text-primary" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Completar Variables</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Completá los campos para generar el documento con tus datos.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.placeholders.map(p => (
                        <div key={p.key} className={cn('space-y-1.5', p.type === 'textarea' && 'md:col-span-2')}>
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {p.label}
                          </label>
                          {p.type === 'textarea' ? (
                            <textarea
                              className="w-full px-4 py-3 bg-muted/20 border border-border/40 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                              rows={3}
                              value={placeholderValues[p.key] || ''}
                              onChange={e => setPlaceholderValues(prev => ({ ...prev, [p.key]: e.target.value }))}
                              placeholder={p.label}
                            />
                          ) : (
                            <input
                              type={p.type === 'date' ? 'date' : p.type === 'number' ? 'number' : 'text'}
                              className="w-full px-4 py-3 bg-muted/20 border border-border/40 rounded-xl text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-12"
                              value={placeholderValues[p.key] || ''}
                              onChange={e => setPlaceholderValues(prev => ({ ...prev, [p.key]: e.target.value }))}
                              placeholder={p.label}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck size={16} className="text-emerald-600" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Documento Generado</h3>
                      </div>
                      {!allFilled && (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                          Faltan campos por completar
                        </span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed bg-muted/10 p-6 rounded-2xl border border-border/30 max-h-[50vh] overflow-y-auto">
                      {renderedContent}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pb-4">
                    <Button
                      onClick={handleCopy}
                      className={cn(
                        'gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl h-11 px-6 shadow-lg transition-all',
                        copied
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
                      )}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado al Portapapeles' : 'Copiar Documento'}
                    </Button>
                    <Button
                      onClick={() => setMode('preview')}
                      className="gap-2 text-[10px] font-black uppercase tracking-widest bg-muted hover:bg-muted/80 text-foreground rounded-xl h-11 px-6"
                    >
                      <Eye size={14} />
                      Ver Plantilla Original
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
