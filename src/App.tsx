import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CreateSet from "./pages/CreateSet";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AuthLayout from "./layouts/AuthLayout";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AuthLayout>
              <Index />
            </AuthLayout>
          }
        />
        <Route
          path="/create"
          element={
            <AuthLayout>
              <CreateSet />
            </AuthLayout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster richColors />
    </BrowserRouter>
  );
}

export default App;