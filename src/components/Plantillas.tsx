import React from 'react';
import { Card, Badge, Button } from './UI';
import { LayoutDashboard, Plus, FileText, Search, MoreHorizontal, Copy } from 'lucide-react';

const MOCK_TEMPLATES = [
  { id: '1', title: 'Demanda Despido Incausado', type: 'Laboral', lastUsed: 'Ayer' },
  { id: '2', title: 'Contestación de Demanda - Daños', type: 'Daños', lastUsed: 'Hace 3 días' },
  { id: '3', title: 'Solicitud de Oficio - Universales', type: 'Sucesiones', lastUsed: 'Hace 1 semana' },
  { id: '4', title: 'Contrato de Locación Comercial', type: 'Comercial', lastUsed: 'Hoy' },
  { id: '5', title: 'Borrador Divorcio Mutuo Acuerdo', type: 'Familia', lastUsed: 'Hace 2 semanas' },
];

export const Plantillas = () => {
  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-none">Plantillas</h1>
          <p className="text-muted-foreground mt-3 text-sm font-black uppercase tracking-widest opacity-60">Modelos de escritos y documentos para agilizar el trabajo.</p>
        </div>
        <Button variant="primary" size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-lg shadow-primary/20">
          <Plus size={18} />
          Nueva Plantilla
        </Button>
      </header>

      <div className="relative group">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar plantillas por nombre o tipo..." 
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-bold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_TEMPLATES.map(template => (
          <Card key={template.id} className="p-6 flex flex-col justify-between group bg-card border-border shadow-lg hover:shadow-xl transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-6">
              <div className="p-4 bg-muted rounded-2xl text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                <FileText size={24} />
              </div>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-90">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors tracking-tight leading-tight">{template.title}</h3>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-border">{template.type}</Badge>
            </div>
            <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-50">Última actividad: {template.lastUsed}</span>
              <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest h-9 px-4 rounded-xl hover:bg-muted gap-2">
                <Copy size={14} />
                Usar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
