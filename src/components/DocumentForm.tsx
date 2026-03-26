import React, { useState } from 'react';
import { Button, Input, Label } from './UI';
import { Matter, LegalDocument, DocumentStatus } from '../types';

interface DocumentFormProps {
  matters: Matter[];
  onSave: (doc: Omit<LegalDocument, 'id'>) => void;
  onCancel: () => void;
}

export const DocumentForm = ({ matters, onSave, onCancel }: DocumentFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    matterId: '',
    criticality: 'Crítico' as 'Crítico' | 'Recomendado' | 'Opcional',
    blocksProgress: false,
    category: '',
  });

  const selectedMatter = matters.find(m => m.id === formData.matterId);
  const isValid = formData.name.trim() !== '' && formData.matterId !== '';

  const handleSave = () => {
    if (!isValid || !selectedMatter) return;
    onSave({
      matterId: formData.matterId,
      matterTitle: selectedMatter.title,
      client: selectedMatter.client,
      responsible: selectedMatter.responsible,
      name: formData.name.trim(),
      status: 'Faltante' as DocumentStatus,
      criticality: formData.criticality,
      blocksProgress: formData.blocksProgress,
      updatedAt: '',
      category: formData.category || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Nombre del Documento *</Label>
        <Input
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Poder Judicial Firmado"
        />
      </div>

      <div className="space-y-2">
        <Label>Asunto *</Label>
        <select
          className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={formData.matterId}
          onChange={e => setFormData({ ...formData, matterId: e.target.value })}
        >
          <option value="">Seleccionar asunto...</option>
          {matters.filter(m => m.status !== 'Cerrado').map(m => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        {selectedMatter && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
            Cliente: {selectedMatter.client} · Resp: {selectedMatter.responsible}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Criticidad</Label>
        <div className="flex gap-2">
          {(['Crítico', 'Recomendado', 'Opcional'] as const).map(c => (
            <button
              key={c}
              onClick={() => setFormData({ ...formData, criticality: c })}
              className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                formData.criticality === c
                  ? c === 'Crítico'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-600'
                    : c === 'Recomendado'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                    : 'bg-slate-500/10 border-slate-500 text-slate-600'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Categoría (opcional)</Label>
        <Input
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          placeholder="Ej: Identidad, Prueba, Escrito..."
        />
      </div>

      <label className="flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-all">
        <input
          type="checkbox"
          checked={formData.blocksProgress}
          onChange={e => setFormData({ ...formData, blocksProgress: e.target.checked })}
          className="w-4 h-4 rounded border-border"
        />
        <div>
          <div className="text-sm font-bold text-foreground">Bloquea el avance del asunto</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Sin este documento no se puede continuar
          </div>
        </div>
      </label>

      <div className="pt-4 flex gap-3">
        <Button className="flex-1" disabled={!isValid} onClick={handleSave}>
          Agregar Documento
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
};
