// Legacy route kept only for compatibility; main exams UX lives in ExamsIndex/TakeExam.
import { Navigate } from "react-router-dom";

const GenerateExam: React.FC = () => {
  return <Navigate to="/exams" replace />;
};

export default GenerateExam;
