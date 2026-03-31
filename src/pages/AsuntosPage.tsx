import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Asuntos } from '../components/Asuntos';

export const AsuntosPage = () => {
  const navigate = useNavigate();
  const { matters } = useAppContext();

  return (
    <Asuntos
      matters={matters}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
      onCreateMatter={() => navigate('/asuntos/nuevo')}
    />
  );
};
