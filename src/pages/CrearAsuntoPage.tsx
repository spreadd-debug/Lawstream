import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { CrearAsunto } from '../components/CrearAsunto';

export const CrearAsuntoPage = () => {
  const navigate = useNavigate();
  const { prefilledMatter, setPrefilledMatter, handleCreateMatter, handleCreateClient, clients } = useAppContext();

  return (
    <CrearAsunto
      prefilledData={prefilledMatter}
      clients={clients}
      onCreateClient={async (data) => {
        await handleCreateClient(data);
        // Return the client with a temp id; AppContext will sync the real one
        return { id: crypto.randomUUID(), ...data };
      }}
      onBack={() => {
        setPrefilledMatter(null);
        navigate('/asuntos');
      }}
      onSave={async (data) => {
        await handleCreateMatter(data);
        setPrefilledMatter(null);
        navigate('/asuntos');
      }}
    />
  );
};
