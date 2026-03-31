import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Vencimientos } from '../components/Vencimientos';

export const VencimientosPage = () => {
  const navigate = useNavigate();
  const { matters, consultations, setPrefilledMatter } = useAppContext();

  return (
    <Vencimientos
      matters={matters}
      consultations={consultations}
      onSelectMatter={(id) => navigate(`/asuntos/${id}`)}
      onSelectConsultation={(c) => {
        // Navigate to consultas and pre-select the consultation
        navigate('/consultas');
      }}
    />
  );
};
