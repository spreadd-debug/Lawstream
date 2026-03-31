import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Vencimientos } from '../components/Vencimientos';

export const VencimientosPage = () => {
  const navigate = useNavigate();
  const { matters } = useAppContext();

  return (
    <Vencimientos
      matters={matters}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
    />
  );
};
