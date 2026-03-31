import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Hoy } from '../components/Hoy';
import { PerencionAlerts } from '../components/PerencionAlerts';

export const HoyPage = () => {
  const navigate = useNavigate();
  const {
    matters, documents, expedientes,
    handleNewAction, handleEditMatter, handleCloseMatter,
    setIsFiltersOpen, activeFilters,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PerencionAlerts
        matters={matters}
        expedientes={expedientes}
        onNavigateToMatter={(id) => navigate(`/asuntos/${id}`)}
      />
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
    </div>
  );
};
