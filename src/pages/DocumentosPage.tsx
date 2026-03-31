import { useAppContext } from '../lib/AppContext';
import { DocumentosGlobal } from '../components/DocumentosGlobal';

export const DocumentosPage = () => {
  const { documents, matters, handleUpdateDocument, handleAddDocument } = useAppContext();

  return (
    <DocumentosGlobal
      documents={documents}
      matters={matters}
      onUpdateDocument={handleUpdateDocument}
      onAddDocument={handleAddDocument}
    />
  );
};
