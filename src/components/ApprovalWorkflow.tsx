import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Shield, FileText } from 'lucide-react';
import { Button, Card } from './UI';
import { cn } from '../lib/utils';
import { LegalDocument } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ApprovalWorkflowProps {
  documents: LegalDocument[];
  currentUserRole: string;
  currentUserName: string;
  onApprove: (docId: string, approvedBy: string) => Promise<void>;
  onReject: (docId: string) => Promise<void>;
  onRequestApproval: (docId: string) => Promise<void>;
}

export const ApprovalWorkflow: React.FC<ApprovalWorkflowProps> = ({
  documents,
  currentUserRole,
  currentUserName,
  onApprove,
  onReject,
  onRequestApproval,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const canApprove = currentUserRole === 'Socio';

  // Filter docs that need or have approval
  const relevantDocs = documents.filter(
    d => d.status === 'En revisión' || d.status === 'Aprobado' || d.status === 'Listo para presentar'
  );

  const pendingApproval = relevantDocs.filter(d => d.status === 'En revisión');
  const approved = relevantDocs.filter(d => d.status === 'Aprobado' || d.status === 'Listo para presentar');

  if (relevantDocs.length === 0) return null;

  const handleAction = async (action: () => Promise<void>, docId: string) => {
    setLoading(docId);
    try { await action(); } finally { setLoading(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-primary" />
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Aprobación de Escritos
        </h4>
        {pendingApproval.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-600">
            {pendingApproval.length} pendiente{pendingApproval.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Pending */}
      {pendingApproval.length > 0 && (
        <div className="space-y-2">
          {pendingApproval.map(doc => (
            <Card key={doc.id} className="p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{doc.name}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    <Clock size={10} className="inline mr-1" />
                    Pendiente de aprobación
                    {doc.responsible && ` · ${doc.responsible}`}
                  </p>
                </div>
              </div>

              {canApprove && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    disabled={loading === doc.id}
                    onClick={() => handleAction(() => onApprove(doc.id, currentUserName), doc.id)}
                  >
                    <CheckCircle2 size={14} />
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-500/5 gap-1.5"
                    disabled={loading === doc.id}
                    onClick={() => handleAction(() => onReject(doc.id), doc.id)}
                  >
                    <XCircle size={14} />
                    Rechazar
                  </Button>
                </div>
              )}

              {!canApprove && (
                <p className="text-[10px] font-bold text-amber-600 mt-2">
                  Solo un Socio puede aprobar este escrito.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div className="space-y-1.5">
          {approved.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-foreground flex-1 truncate">{doc.name}</span>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider shrink-0">
                Aprobado
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
