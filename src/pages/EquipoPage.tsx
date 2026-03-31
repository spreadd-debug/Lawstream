import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { PanelManager } from '../components/PanelManager';

export const EquipoPage = () => {
  const navigate = useNavigate();
  const { matters, documents, consultations, profiles } = useAppContext();

  return (
    <PanelManager
      matters={matters}
      documents={documents}
      consultations={consultations}
      profiles={profiles}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
    />
  );
};
