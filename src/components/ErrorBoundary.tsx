import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Link } from "react-router";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary — catches React rendering errors and shows a friendly
 * recovery screen instead of a blank white page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    // Could also send to error tracking service here (Sentry, etc.)
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <img src="/app-icon.png" alt="Anglotec" className="h-16 w-16 object-contain mx-auto mb-6 opacity-80 rounded-2xl" />
            <AlertTriangle size={64} className="mx-auto mb-4 text-orange-400" />
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-300 text-sm mb-6">
              We encountered an unexpected error. Your learning progress is safely saved.
            </p>

            {this.state.error && (
              <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-3 mb-6 text-left">
                <p className="text-red-300 text-xs font-mono break-all">{this.state.error.message}</p>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={this.handleReload} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl">
                <RefreshCw size={18} className="mr-2" /> Reload the App
              </Button>
              <Link to="/" className="block">
                <Button onClick={this.handleReset} variant="outline" className="w-full h-12 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl">
                  <Home size={18} className="mr-2" /> Go to Dashboard
                </Button>
              </Link>
            </div>

            <p className="text-gray-300 text-xs mt-6">
              If this keeps happening, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
