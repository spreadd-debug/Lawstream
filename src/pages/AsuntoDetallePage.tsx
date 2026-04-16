import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/auth';
import { MatterDetail } from '../components/MatterDetail';

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

  return (
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
      currentUser={profile?.fullName || 'Usuario'}
      currentUserRole={profile?.role || 'Abogado'}
    />
  );
};
