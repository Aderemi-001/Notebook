// Legacy simple index: forward users to the richer Notebook UI.
import { Navigate } from "react-router-dom";

const NotesIndex: React.FC = () => {
  return <Navigate to="/notebook" replace />;
};

export default NotesIndex;
