import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Hoy } from '../components/Hoy';

export const HoyPage = () => {
  const navigate = useNavigate();
  const {
    matters, documents,
    handleNewAction, handleEditMatter, handleCloseMatter,
    setIsFiltersOpen, activeFilters,
  } = useAppContext();

  return (
    <Hoy
      matters={matters}
      documents={documents}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
      onNewAction={() => handleNewAction()}
      onEditMatter={handleEditMatter}
      onCloseMatter={handleCloseMatter}
      onOpenFilters={() => setIsFiltersOpen(true)}
      activeFilters={activeFilters}
    />
  );
};
