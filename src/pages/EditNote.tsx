// Legacy route: forward to unified Notebook editor for the given note.
import { Navigate, useParams } from "react-router-dom";

const EditNote: React.FC = () => {
  const { noteId } = useParams();
  if (!noteId) return <Navigate to="/notebook" replace />;
  return <Navigate to={`/notebook/${noteId}`} replace />;
};

export default EditNote;
