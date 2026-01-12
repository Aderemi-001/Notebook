
import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Log to database
        import('@/utils/errorLogger').then(({ logErrorToDB }) => {
            logErrorToDB({
                error_message: error.message,
                component_stack: errorInfo.componentStack || undefined,
                url: window.location.href,
                user_agent: navigator.userAgent
            });
        });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center animate-fade-in">
                    <div className="bg-destructive/10 p-6 rounded-full mb-6">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        We encountered an unexpected error. Our team has been notified.
                        <br />
                        <span className="text-xs opacity-70 mt-2 block font-mono bg-muted p-2 rounded max-w-full overflow-hidden text-ellipsis">
                            {this.state.error?.message || "Unknown Error"}
                        </span>
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={this.handleReload} size="lg" className="font-bold shadow-lg">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reload Application
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => window.location.href = '/'}>
                            Go Home
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
