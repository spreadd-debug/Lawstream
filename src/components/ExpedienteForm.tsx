import React, { useState } from 'react';
import { Card, Button, Input } from './UI';
import { Expediente, EstadoTroncal, Matter } from '../types';
import { createExpediente, updateExpediente } from '../lib/db';
import { FUEROS, ESTADOS_TRONCALES, SUBESTADOS, getJuzgadosPorFuero, matterTypeToFuero } from '../data/juzgados';
import { X, Scale, Building2 } from 'lucide-react';

interface ExpedienteFormProps {
  matter: Matter;
  existing?: Expediente;
  onClose: () => void;
  onSaved: (expediente: Expediente) => void;
}

export const ExpedienteForm: React.FC<ExpedienteFormProps> = ({ matter, existing, onClose, onSaved }) => {
  const defaultFuero = matterTypeToFuero(matter.type);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    caratula:      existing?.caratula      ?? matter.title,
    fuero:         existing?.fuero         ?? defaultFuero,
    juzgado:       existing?.juzgado       ?? '',
    nroReceptoria: existing?.nroReceptoria ?? '',
    nroJuzgado:    existing?.nroJuzgado    ?? '',
    estadoTroncal: (existing?.estadoTroncal ?? 'Sin presentar') as EstadoTroncal,
    subestado:     existing?.subestado     ?? '',
    mevPresentado: existing?.mevPresentado ?? false,
    mevFecha:      existing?.mevFecha      ? existing.mevFecha.slice(0, 10) : '',
    mevToken:      existing?.mevToken      ?? '',
  });

  const juzgadosList = getJuzgadosPorFuero(form.fuero);
  const subestadosList = SUBESTADOS[form.estadoTroncal] ?? [];

  const set = (field: keyof typeof form, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.caratula.trim() || !form.fuero.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (existing) {
        await updateExpediente(existing.id, {
          caratula:      form.caratula,
          fuero:         form.fuero,
          juzgado:       form.juzgado || undefined,
          nroReceptoria: form.nroReceptoria || undefined,
          nroJuzgado:    form.nroJuzgado || undefined,
          mevPresentado: form.mevPresentado,
          mevFecha:      form.mevFecha ? new Date(form.mevFecha).toISOString() : undefined,
          mevToken:      form.mevToken || undefined,
        });
        onSaved({ ...existing, ...form, mevFecha: form.mevFecha ? new Date(form.mevFecha).toISOString() : undefined });
      } else {
        const created = await createExpediente({
          matterId:      matter.id,
          caratula:      form.caratula,
          fuero:         form.fuero,
          juzgado:       form.juzgado || undefined,
          nroReceptoria: form.nroReceptoria || undefined,
          nroJuzgado:    form.nroJuzgado || undefined,
          estadoTroncal: form.estadoTroncal,
          subestado:     form.subestado || undefined,
          estadoDesde:   now,
          mevPresentado: form.mevPresentado,
          mevFecha:      form.mevFecha ? new Date(form.mevFecha).toISOString() : undefined,
          mevToken:      form.mevToken || undefined,
        });
        onSaved(created);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {existing ? 'Editar Expediente' : 'Crear Expediente Judicial'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{matter.title}</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>

          {/* Carátula y fuero */}
          <section className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Identificación</p>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Carátula *</label>
              <Input
                value={form.caratula}
                onChange={e => set('caratula', e.target.value)}
                placeholder="Ej: García, Juan c/ Techint S.A. s/ despido"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Formato: Apellido, Nombre c/ Demandado s/ Objeto</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Fuero *</label>
                <select
                  value={form.fuero}
                  onChange={e => { set('fuero', e.target.value); set('juzgado', ''); }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
                >
                  {FUEROS.map(f => (
                    <option key={f.id} value={f.label}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Juzgado asignado</label>
                <select
                  value={form.juzgado}
                  onChange={e => set('juzgado', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
                >
                  <option value="">— Sin asignar aún —</option>
                  {juzgadosList.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Números de expediente */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Números de Expediente</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Nro. Receptoría</label>
                <Input
                  value={form.nroReceptoria}
                  onChange={e => set('nroReceptoria', e.target.value)}
                  placeholder="Ej: 12345/2024"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Nro. Juzgado</label>
                <Input
                  value={form.nroJuzgado}
                  onChange={e => set('nroJuzgado', e.target.value)}
                  placeholder="Ej: 67890/2024"
                />
              </div>
            </div>
          </section>

          {/* Estado procesal (solo en creación) */}
          {!existing && (
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estado Procesal Inicial</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Estado troncal</label>
                  <select
                    value={form.estadoTroncal}
                    onChange={e => { set('estadoTroncal', e.target.value as EstadoTroncal); set('subestado', ''); }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
                  >
                    {ESTADOS_TRONCALES.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
                {subestadosList.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Subestado</label>
                    <select
                      value={form.subestado}
                      onChange={e => set('subestado', e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background"
                    >
                      <option value="">— Ninguno —</option>
                      {subestadosList.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MEV */}
          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mesa de Entrada Virtual (MEV)</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('mevPresentado', !form.mevPresentado)}
                className={`w-10 h-6 rounded-full transition-colors ${form.mevPresentado ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${form.mevPresentado ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-bold">Presentado en MEV</span>
            </label>
            {form.mevPresentado && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Fecha de presentación</label>
                  <Input
                    type="date"
                    value={form.mevFecha}
                    onChange={e => set('mevFecha', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground mb-1 block">Token MEV</label>
                  <Input
                    value={form.mevToken}
                    onChange={e => set('mevToken', e.target.value)}
                    placeholder="Token de presentación"
                  />
                </div>
              </div>
            )}
          </section>

          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.caratula.trim()}>
              {saving ? 'Guardando...' : existing ? 'Actualizar' : 'Crear Expediente'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
