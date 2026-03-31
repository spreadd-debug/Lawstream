import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { MatterDetail } from '../components/MatterDetail';

export const AsuntoDetallePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matters, timeline, tasks, documents, handleNewAction, handleEditMatter } = useAppContext();

  const matter = matters.find(m => m.id === id);
  if (!matter) return <Navigate to="/asuntos" replace />;

  return (
    <MatterDetail
      matter={matter}
      timeline={timeline.filter(e => e.matterId === id)}
      tasks={tasks.filter(t => t.matterId === id)}
      documents={documents.filter(d => d.matterId === id)}
      onBack={() => navigate('/asuntos')}
      onNewAction={() => handleNewAction(id!)}
      onEditMatter={() => handleEditMatter(id!)}
    />
  );
};
