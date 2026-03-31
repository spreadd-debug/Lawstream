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
    matters, timeline, tasks, documents,
    handleNewAction, handleEditMatter,
    handleCompleteTask, handleUpdateDocument,
  } = useAppContext();

  const matter = matters.find(m => m.id === id);
  if (!matter) return <Navigate to="/asuntos" replace />;

  const matterTasks = tasks.filter(t => t.matterId === id);
  const matterDocs = documents.filter(d => d.matterId === id);
  const blockingTasks = matterTasks.filter(t => t.bloqueante && t.status !== 'Completada');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <MatterDetail
        matter={matter}
        timeline={timeline.filter(e => e.matterId === id)}
        tasks={matterTasks}
        documents={matterDocs}
        onBack={() => navigate('/asuntos')}
        onNewAction={() => handleNewAction(id!)}
        onEditMatter={() => handleEditMatter(id!)}
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
