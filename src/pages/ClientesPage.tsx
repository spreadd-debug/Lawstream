import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Clientes } from '../components/Clientes';

export const ClientesPage = () => {
  const navigate = useNavigate();
  const { clients, matters, handleCreateClient, handleUpdateClient } = useAppContext();

  return (
    <Clientes
      clients={clients}
      matters={matters}
      onCreateClient={handleCreateClient}
      onUpdateClient={handleUpdateClient}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
    />
  );
};
