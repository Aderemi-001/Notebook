import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { Toaster } from "sonner"; // Import Toaster

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" attribute="class">
    <App />
    <Toaster /> {/* Add the Toaster component here */}
  </ThemeProvider>
);