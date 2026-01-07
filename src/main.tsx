import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" attribute="class">
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  </ThemeProvider>
);