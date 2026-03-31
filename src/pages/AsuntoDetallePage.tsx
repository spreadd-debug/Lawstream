import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/auth';
import { MatterDetail } from '../components/MatterDetail';
import { CommunicationsLog } from '../components/CommunicationsLog';
import { ApprovalWorkflow } from '../components/ApprovalWorkflow';
import { BlockingTasksPanel } from '../components/BlockingTasksPanel';
import { ClientAccountStatement } from '../components/ClientAccountStatement';

export const AsuntoDetallePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    matters, timeline, tasks, documents, milestones, profiles,
    handleNewAction, handleEditMatter,
    handleCompleteTask, handleUpdateTask, handleUpdateDocument, handleAddDocument,
    handleUpdateMilestone, handleCreateMilestone, handleUpdateMatterDirect,
  } = useAppContext();

  const matter = matters.find(m => m.id === id);
  if (!matter) return <Navigate to="/asuntos" replace />;

  const matterTasks = tasks.filter(t => t.matterId === id);
  const matterDocs = documents.filter(d => d.matterId === id);
  const matterMilestones = milestones.filter(m => m.matterId === id);
  const blockingTasks = matterTasks.filter(t => t.bloqueante && t.status !== 'Completada');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <MatterDetail
        matter={matter}
        timeline={timeline.filter(e => e.matterId === id)}
        tasks={matterTasks}
        documents={matterDocs}
        milestones={matterMilestones}
        profiles={profiles}
        onBack={() => navigate('/asuntos')}
        onNewAction={() => handleNewAction(id!)}
        onEditMatter={() => handleEditMatter(id!)}
        onCompleteMilestone={(msId) => handleUpdateMilestone(msId, {
          status: 'Completado',
          completedAt: new Date().toISOString(),
          completedBy: profile?.fullName || 'Usuario',
        })}
        onCompleteTask={(taskId) => handleCompleteTask(taskId, profile?.fullName || 'Usuario')}
        onReopenTask={(taskId) => handleUpdateTask(taskId, { status: 'Pendiente', completedAt: undefined, completedBy: undefined })}
        onUpdateMatter={(changes) => handleUpdateMatterDirect(id!, changes)}
        onUpdateDocument={(docId, changes) => handleUpdateDocument(docId, changes)}
        onAddDocument={(doc) => handleAddDocument(doc as any)}
        onAddMilestone={(ms) => handleCreateMilestone(ms)}
      />

      {/* Blocking tasks */}
      {blockingTasks.length > 0 && (
        <BlockingTasksPanel
          tasks={matterTasks.filter(t => t.generadaAutomaticamente)}
          onComplete={(taskId) => handleCompleteTask(taskId, profile?.fullName || 'Usuario')}
          title="Tareas pendientes del expediente"
        />
      )}

      {/* Approval workflow */}
      <ApprovalWorkflow
        documents={matterDocs}
        currentUserRole={profile?.role || 'Abogado'}
        currentUserName={profile?.fullName || 'Usuario'}
        onApprove={async (docId, by) => {
          await handleUpdateDocument(docId, { status: 'Aprobado' });
        }}
        onReject={async (docId) => {
          await handleUpdateDocument(docId, { status: 'Faltante' });
        }}
        onRequestApproval={async (docId) => {
          await handleUpdateDocument(docId, { status: 'En revisión' });
        }}
      />

      {/* Communications log */}
      <CommunicationsLog
        matterId={id!}
        currentUser={profile?.fullName || 'Usuario'}
      />

      {/* Client account statement */}
      <ClientAccountStatement clientName={matter.client} />
    </div>
  );
};
