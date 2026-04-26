import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Anglotec caught an error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
            <p className="text-gray-400 text-sm mb-6">
              Something unexpected happened. Don&apos;t worry — your progress is safely saved in the cloud.
            </p>
            <p className="text-gray-600 text-xs mb-6 bg-white/5 rounded-lg p-3 text-left font-mono break-all">
              {this.state.error?.message || "Unknown error"}
            </p>
            <Button
              onClick={this.handleReset}
              className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-xl"
            >
              <RefreshCw size={20} className="mr-2" /> Refresh the App
            </Button>
            <p className="text-gray-600 text-xs mt-4">
              If this keeps happening, try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
