// Legacy route: forward to unified Notebook, which handles note creation.
import { Navigate } from "react-router-dom";

const CreateNote: React.FC = () => {
  return <Navigate to="/notebook" replace />;
};

export default CreateNote;
