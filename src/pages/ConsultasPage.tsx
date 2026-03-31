import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import { Consultas } from '../components/Consultas';

export const ConsultasPage = () => {
  const navigate = useNavigate();
  const { consultations, handleUpdateConsultation, handleCreateConsultation, setPrefilledMatter } = useAppContext();

  return (
    <Consultas
      consultations={consultations}
      onConvertToMatter={(data) => {
        setPrefilledMatter(data);
        navigate('/asuntos/nuevo');
      }}
      onUpdateConsultation={handleUpdateConsultation}
      onCreateConsultation={handleCreateConsultation}
    />
  );
};
