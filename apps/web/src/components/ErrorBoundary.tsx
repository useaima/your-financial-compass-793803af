import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
            {this.props.context && <span className="block text-lg font-medium opacity-80">in {this.props.context}</span>}
          </h1>
          <p className="mb-8 max-w-md text-muted-foreground">
            eva encountered an unexpected error while rendering this view. This can happen due to a connection glitch or a stale application cache.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={this.handleReset}
              className="rounded-2xl px-6"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Application
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/dashboard"}
              className="rounded-2xl px-6"
            >
              Go to Dashboard
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <div className="mt-12 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-muted/50 p-4 text-left">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Debug Info (Dev Only)
              </p>
              <pre className="overflow-x-auto text-xs text-destructive">
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
