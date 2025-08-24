import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Chatbot from "@/components/Chatbot"; // Import the Chatbot component

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-grow">
        {children}
      </div>
      <Footer />
      <Chatbot /> {/* Render the Chatbot here */}
    </div>
  );
};

export default AuthLayout;