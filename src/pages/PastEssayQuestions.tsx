// Legacy route: redirect to main essay index/history.
import { Navigate } from "react-router-dom";

const PastEssayQuestions: React.FC = () => {
  return <Navigate to="/essays" replace />;
};

export default PastEssayQuestions;
