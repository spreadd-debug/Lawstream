import React, { useState, useEffect, useRef } from 'react';
import { Consultation, UserProfile } from '../types';
import { Button } from './UI';
import {
  X,
  Clock,
  Send,
  CheckCircle2,
  FileText,
  ClipboardList,
  User,
  Stethoscope,
  Lightbulb,
  Timer,
  CreditCard,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { updateConsultation } from '../lib/db';

// ── Checklist de relevamiento ──────────────────────────────────

const CHECKLIST_ITEMS = [
  'DNI / CUIT del cliente',
  'Domicilio actual',
  'Estado civil',
  'Hijos menores (cantidad, edades)',
  'Documentación que trae',
  'Datos de la contraparte',
  '¿Tiene abogado previo?',
  '¿Hay urgencia o medida cautelar?',
];

// ── Props ───────────────────────────────────────────────────────

interface EntrevistaModalProps {
  consultation: Consultation;
  profiles: UserProfile[];
  onUpdate: (id: string, changes: Partial<Consultation>) => void;
  onFinish: (formaPago: 'Efectivo' | 'Transferencia' | 'Bonificada' | 'No aplica') => void;
  onClose: () => void;
}

// ── Component ───────────────────────────────────────────────────

export const EntrevistaModal: React.FC<EntrevistaModalProps> = ({
  consultation,
  profiles,
  onUpdate,
  onFinish,
  onClose,
}) => {
  // ── State ──
  const [noteInput, setNoteInput] = useState('');
  const [notes, setNotes] = useState<string[]>(consultation.notes ?? []);
  const [checklist, setChecklist] = useState<boolean[]>(() =>
    CHECKLIST_ITEMS.map(() => false)
  );
  const [diagnostico, setDiagnostico] = useState(consultation.diagnostico || '');
  const [solucionPropuesta, setSolucionPropuesta] = useState(consultation.solucionPropuesta || '');
  const [atendidoPor, setAtendidoPor] = useState(consultation.atendidoPor || '');
  const [showFinish, setShowFinish] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const notesEndRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);
  const startTime = useRef(Date.now());

  // ── Timer ──
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Auto-scroll notes ──
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  // ── Handlers ──
  const handleAddNote = async () => {
    const text = noteInput.trim();
    if (!text) return;

    const stamp = format(new Date(), "dd/MM HH:mm", { locale: es });
    const entry = `[${stamp}] ${text}`;
    const updated = [...notes, entry];
    setNotes(updated);
    setNoteInput('');
    noteInputRef.current?.focus();

    await updateConsultation(consultation.id, { notes: updated });
    onUpdate(consultation.id, { notes: updated });
  };

  const handleDeleteNote = async (idx: number) => {
    const updated = notes.filter((_, i) => i !== idx);
    setNotes(updated);
    await updateConsultation(consultation.id, { notes: updated });
    onUpdate(consultation.id, { notes: updated });
  };

  const handleSaveDiagnostico = async () => {
    await updateConsultation(consultation.id, { diagnostico });
    onUpdate(consultation.id, { diagnostico });
  };

  const handleSaveSolucion = async () => {
    await updateConsultation(consultation.id, { solucionPropuesta });
    onUpdate(consultation.id, { solucionPropuesta });
  };

  const handleSaveAtendidoPor = async (val: string) => {
    setAtendidoPor(val);
    await updateConsultation(consultation.id, { atendidoPor: val });
    onUpdate(consultation.id, { atendidoPor: val });
  };

  const handleFinish = (formaPago: 'Efectivo' | 'Transferencia' | 'Bonificada' | 'No aplica') => {
    // Save any pending data
    if (diagnostico !== consultation.diagnostico) {
      updateConsultation(consultation.id, { diagnostico });
      onUpdate(consultation.id, { diagnostico });
    }
    if (solucionPropuesta !== consultation.solucionPropuesta) {
      updateConsultation(consultation.id, { solucionPropuesta });
      onUpdate(consultation.id, { solucionPropuesta });
    }
    onFinish(formaPago);
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[92vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 fade-in duration-200">

        {/* ── Header ── */}
        <header className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Stethoscope size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Entrevista</h2>
              <p className="text-xs font-bold text-muted-foreground">{consultation.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Timer size={14} className="text-indigo-600" />
              <span className="text-sm font-black text-indigo-600 tabular-nums">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Cerrar sin finalizar (las notas se guardan)"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Notas en vivo */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-indigo-600" />
              <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Notas de la entrevista
              </label>
            </div>

            {/* Notes list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notes.length === 0 && (
                <p className="text-xs text-muted-foreground/50 italic text-center py-4">
                  Empezá a tomar notas durante la entrevista...
                </p>
              )}
              {notes.map((note, idx) => {
                const match = note.match(/^\[([^\]]+)\]\s(.+)$/s);
                const stamp = match ? match[1] : null;
                const text = match ? match[2] : note;
                return (
                  <div
                    key={idx}
                    className="group relative p-3 bg-muted/20 border border-border/50 rounded-xl hover:border-border transition-colors"
                  >
                    {stamp && (
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/60 mb-1">
                        {stamp}
                      </p>
                    )}
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{text}</p>
                    <button
                      onClick={() => handleDeleteNote(idx)}
                      className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
              <div ref={notesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <textarea
                ref={noteInputRef}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    void handleAddNote();
                  }
                }}
                placeholder="Escribí lo que dice el cliente... (Ctrl+Enter para guardar)"
                className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!noteInput.trim()}
                className="self-end gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-4"
              >
                <Send size={12} />
              </Button>
            </div>
          </section>

          {/* Checklist de relevamiento */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-amber-600" />
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                Checklist de relevamiento
              </label>
              <span className="text-[9px] font-bold text-muted-foreground ml-auto">
                {checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CHECKLIST_ITEMS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const updated = [...checklist];
                    updated[idx] = !updated[idx];
                    setChecklist(updated);
                  }}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all',
                    checklist[idx]
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                      : 'bg-background border-border text-muted-foreground hover:border-amber-400/50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                    checklist[idx]
                      ? 'bg-amber-500 border-amber-500'
                      : 'border-border'
                  )}>
                    {checklist[idx] && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  {item}
                </button>
              ))}
            </div>
          </section>

          {/* Diagnóstico y Solución */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope size={13} className="text-rose-600" />
                <label className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                  Diagnóstico del caso
                </label>
              </div>
              <textarea
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                onBlur={handleSaveDiagnostico}
                placeholder="¿Cuál es el problema que trajo el cliente?"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-28 focus:outline-none focus:ring-2 focus:ring-rose-500/20 placeholder:text-muted-foreground/50"
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb size={13} className="text-emerald-600" />
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  Solución propuesta
                </label>
              </div>
              <textarea
                value={solucionPropuesta}
                onChange={(e) => setSolucionPropuesta(e.target.value)}
                onBlur={handleSaveSolucion}
                placeholder="¿Qué vía se le sugirió? ¿Qué se le dijo?"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-background resize-none h-28 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-muted-foreground/50"
              />
            </section>
          </div>

          {/* Atendido por */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <User size={13} className="text-sky-600" />
              <label className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                Atendido por
              </label>
            </div>
            {profiles.length > 0 ? (
              <select
                value={atendidoPor}
                onChange={(e) => handleSaveAtendidoPor(e.target.value)}
                className="w-full max-w-xs px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">Seleccionar...</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.fullName}>
                    {p.fullName} — {p.role}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={atendidoPor}
                onChange={(e) => setAtendidoPor(e.target.value)}
                onBlur={() => handleSaveAtendidoPor(atendidoPor)}
                placeholder="Nombre del abogado..."
                className="w-full max-w-xs px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-sky-500/20 placeholder:text-muted-foreground/50"
              />
            )}
          </section>
        </div>

        {/* ── Footer: Finalizar entrevista ── */}
        <footer className="px-6 py-4 border-t border-border shrink-0">
          {!showFinish ? (
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground">
                Las notas se guardan automáticamente. Podés cerrar y volver.
              </p>
              <Button
                onClick={() => setShowFinish(true)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black"
              >
                <CreditCard size={14} />
                Finalizar Entrevista
                <ChevronDown size={14} />
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground">Cobro de la consulta</p>
                  <p className="text-[10px] font-bold text-muted-foreground">
                    Seleccioná cómo se cobra la entrevista para finalizar
                  </p>
                </div>
                <button
                  onClick={() => setShowFinish(false)}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline"
                >
                  volver
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => handleFinish('Efectivo')}
                  className="p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 transition-all text-center group"
                >
                  <div className="text-lg font-black text-emerald-600 group-hover:scale-110 transition-transform">$</div>
                  <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mt-1">
                    Efectivo
                  </div>
                </button>
                <button
                  onClick={() => handleFinish('Transferencia')}
                  className="p-3 rounded-xl border-2 border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/15 transition-all text-center group"
                >
                  <div className="text-lg font-black text-sky-600 group-hover:scale-110 transition-transform">
                    <CreditCard size={20} className="mx-auto" />
                  </div>
                  <div className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider mt-1">
                    Transferencia
                  </div>
                </button>
                <button
                  onClick={() => handleFinish('Bonificada')}
                  className="p-3 rounded-xl border-2 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/15 transition-all text-center group"
                >
                  <div className="text-lg font-black text-violet-600 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} className="mx-auto" />
                  </div>
                  <div className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-wider mt-1">
                    Bonificar
                  </div>
                </button>
                <button
                  onClick={() => handleFinish('No aplica')}
                  className="p-3 rounded-xl border-2 border-border bg-muted/30 hover:bg-muted/60 transition-all text-center group"
                >
                  <div className="text-lg font-black text-muted-foreground group-hover:scale-110 transition-transform">
                    <Clock size={20} className="mx-auto" />
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                    No aplica
                  </div>
                </button>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};
