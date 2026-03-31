import { useAppContext } from '../lib/AppContext';
import { Plantillas } from '../components/Plantillas';

export const PlantillasPage = () => {
  const { matters, clients } = useAppContext();
  return <Plantillas matters={matters} clients={clients} />;
};
