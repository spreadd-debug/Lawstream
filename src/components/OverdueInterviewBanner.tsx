import React, { useState, useMemo } from 'react';
import { Consultation, UserProfile } from '../types';
import { Button, Badge, Card } from './UI';
import {
  AlertTriangle,
  UserRound,
  Clock,
  CalendarClock,
  XCircle,
  PlayCircle,
  PhoneOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, parseISO, addHours, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { updateConsultation } from '../lib/db';

interface OverdueInterviewBannerProps {
  consultations: Consultation[];
  profiles: UserProfile[];
  onUpdate: (id: string, changes: Partial<Consultation>) => void;
  onStartInterview: (consultation: Consultation) => void;
}

type Resolution = 'entrevista' | 'no-show' | 'reprogramar' | 'cancelar';

export const OverdueInterviewBanner: React.FC<OverdueInterviewBannerProps> = ({
  consultations, profiles, onUpdate, onStartInterview,
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Find overdue interviews: scheduledAt + 1hr < now, not yet resolved (fee not paid), not terminal
  const overdueInterviews = useMemo(() => {
    const now = new Date();
    return consultations.filter(c => {
      if (!c.scheduledAt) return false;
      if (c.consultationFeePaid) return false;
      if (['Rechazada', 'Archivada', 'Aceptada'].includes(c.status)) return false;
      const interviewEnd = addHours(parseISO(c.scheduledAt), 1);
      return isBefore(interviewEnd, now);
    }).sort((a, b) => parseISO(a.scheduledAt!).getTime() - parseISO(b.scheduledAt!).getTime());
  }, [consultations]);

  if (overdueInterviews.length === 0) return null;

  const handleResolve = async (consultation: Consultation, resolution: Resolution) => {
    switch (resolution) {
      case 'entrevista':
        onStartInterview(consultation);
        setResolvingId(null);
        break;

      case 'no-show': {
        const changes: Partial<Consultation> = {
          status: 'Contactada',
          nextStep: 'Reprogramar entrevista — cliente no se presentó',
          notes: [
            ...(consultation.notes || []),
            `[${format(new Date(), 'dd/MM HH:mm')}] ⚠️ Cliente no se presentó a la entrevista del ${format(parseISO(consultation.scheduledAt!), "d/MM 'a las' HH:mm")}`,
          ],
          scheduledAt: undefined,
        };
        await updateConsultation(consultation.id, changes);
        onUpdate(consultation.id, changes);
        setResolvingId(null);
        break;
      }

      case 'reprogramar': {
        if (!newDate) return;
        const changes: Partial<Consultation> = {
          scheduledAt: newDate,
          nextStep: `Entrevista reprogramada para el ${format(parseISO(newDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })}`,
          notes: [
            ...(consultation.notes || []),
            `[${format(new Date(), 'dd/MM HH:mm')}] 📅 Entrevista reprogramada (antes: ${format(parseISO(consultation.scheduledAt!), "d/MM HH:mm")})`,
          ],
        };
        await updateConsultation(consultation.id, changes);
        onUpdate(consultation.id, changes);
        setResolvingId(null);
        setNewDate('');
        break;
      }

      case 'cancelar': {
        const changes: Partial<Consultation> = {
          status: 'Archivada',
          nextStep: 'Consulta archivada — entrevista cancelada',
          notes: [
            ...(consultation.notes || []),
            `[${format(new Date(), 'dd/MM HH:mm')}] ❌ Entrevista cancelada y consulta archivada`,
          ],
          scheduledAt: undefined,
        };
        await updateConsultation(consultation.id, changes);
        onUpdate(consultation.id, changes);
        setResolvingId(null);
        break;
      }
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600 animate-pulse">
              <AlertTriangle size={18} />
            </div>
            <div className="text-left">
              <span className="text-sm font-black text-amber-700">
                {overdueInterviews.length === 1
                  ? '1 entrevista pendiente de resolución'
                  : `${overdueInterviews.length} entrevistas pendientes de resolución`}
              </span>
              <span className="text-[10px] font-bold text-amber-600/70 block">
                Indicá qué pasó con {overdueInterviews.length === 1 ? 'esta entrevista' : 'estas entrevistas'} para continuar
              </span>
            </div>
          </div>
          {expanded ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-amber-600" />}
        </button>

        {/* Interview cards */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {overdueInterviews.map(c => {
              const isResolving = resolvingId === c.id;
              const scheduledDate = parseISO(c.scheduledAt!);

              return (
                <Card key={c.id} className={cn(
                  "p-4 border transition-all",
                  isResolving ? "border-amber-500/50 bg-amber-500/5" : "border-border/50 bg-card"
                )}>
                  <div className="flex items-center justify-between gap-4">
                    {/* Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 shrink-0">
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{c.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                          <Clock size={10} />
                          <span>
                            {format(scheduledDate, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es })}
                          </span>
                          {c.type && (
                            <>
                              <span className="text-border">·</span>
                              <span>{c.type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isResolving ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 border-amber-500/50 text-amber-700 hover:bg-amber-500/10 gap-1.5"
                        onClick={() => setResolvingId(c.id)}
                      >
                        <AlertTriangle size={14} />
                        Resolver
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground"
                        onClick={() => { setResolvingId(null); setNewDate(''); }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>

                  {/* Resolution options */}
                  {isResolving && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                        ¿Qué pasó con esta entrevista?
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => handleResolve(c, 'entrevista')}
                          className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex items-center gap-3 text-left"
                        >
                          <PlayCircle size={18} className="text-emerald-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-emerald-700">Se realizó</div>
                            <div className="text-[10px] text-emerald-600/70">Abrir entrevista y registrar datos</div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleResolve(c, 'no-show')}
                          className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-all flex items-center gap-3 text-left"
                        >
                          <PhoneOff size={18} className="text-rose-600 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-rose-700">No se presentó</div>
                            <div className="text-[10px] text-rose-600/70">Marcar ausencia del cliente</div>
                          </div>
                        </button>

                        <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
                          <div className="flex items-center gap-3">
                            <CalendarClock size={18} className="text-sky-600 shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-sky-700">Reprogramar</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="datetime-local"
                              value={newDate}
                              onChange={e => setNewDate(e.target.value)}
                              className="flex-1 h-8 bg-background border border-border/50 rounded-lg px-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-sky-500/30"
                            />
                            <Button
                              size="sm"
                              disabled={!newDate}
                              className="bg-sky-600 hover:bg-sky-700 text-white h-8 px-3 text-[10px]"
                              onClick={() => handleResolve(c, 'reprogramar')}
                            >
                              Confirmar
                            </Button>
                          </div>
                        </div>

                        <button
                          onClick={() => handleResolve(c, 'cancelar')}
                          className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-all flex items-center gap-3 text-left"
                        >
                          <XCircle size={18} className="text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-foreground">Cancelar y archivar</div>
                            <div className="text-[10px] text-muted-foreground">Descartar esta consulta</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};