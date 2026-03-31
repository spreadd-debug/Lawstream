import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { CrearAsunto } from '../components/CrearAsunto';

export const CrearAsuntoPage = () => {
  const navigate = useNavigate();
  const { prefilledMatter, setPrefilledMatter, handleCreateMatter } = useAppContext();

  return (
    <CrearAsunto
      prefilledData={prefilledMatter}
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
