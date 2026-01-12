// Legacy route: redirect to main exams dashboard/history if needed.
import { Navigate } from "react-router-dom";

const PastExams: React.FC = () => {
  return <Navigate to="/exams" replace />;
};

export default PastExams;
