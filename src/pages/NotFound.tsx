import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <div className="text-center relative z-10 max-w-md mx-auto space-y-8 animate-fade-in">
        {/* Abstract 404 Graphic */}
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-1 shadow-2xl rotate-12">
            <div className="w-full h-full bg-background rounded-xl flex items-center justify-center">
              <h1 className="text-4xl font-black bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">404</h1>
            </div>
          </div>
          <Sparkles className="absolute -top-4 -right-4 h-8 w-8 text-yellow-400 animate-bounce" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Lost in the Cosmos?</h2>
          <p className="text-muted-foreground text-lg">
            We couldn't find the page you're looking for. It might have drifted into a black hole or never existed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-0"
          >
            <Home className="h-4 w-4" /> Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;