import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Asuntos } from '../components/Asuntos';

export const AsuntosPage = () => {
  const navigate = useNavigate();
  const { matters, profiles, handleNewAction, handleCloseMatter, handleEditMatter, handleUpdateMatterDirect } = useAppContext();

  return (
    <Asuntos
      matters={matters}
      profiles={profiles}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
      onCreateMatter={() => navigate('/asuntos/nuevo')}
      onNewAction={(matterId) => handleNewAction(matterId)}
      onCloseMatter={(matterId) => handleCloseMatter(matterId)}
      onEditMatter={(matterId) => handleEditMatter(matterId)}
      onUpdateMatter={(matterId, changes) => handleUpdateMatterDirect(matterId, changes)}
    />
  );
};
