import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { AgendaView } from '../components/agenda/AgendaView';

export const AgendaPage = () => {
  const navigate = useNavigate();
  const { matters, consultations } = useAppContext();

  return (
    <AgendaView
      matters={matters}
      consultations={consultations}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
      onSelectConsultation={() => navigate('/consultas')}
    />
  );
};
