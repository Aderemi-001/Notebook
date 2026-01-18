import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="light" attribute="class">
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  </ThemeProvider>
);