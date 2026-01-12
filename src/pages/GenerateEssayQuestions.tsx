// Legacy route: redirect to main essay index; question generation is handled there.
import { Navigate } from "react-router-dom";

const GenerateEssayQuestions: React.FC = () => {
  return <Navigate to="/essays" replace />;
};

export default GenerateEssayQuestions;
