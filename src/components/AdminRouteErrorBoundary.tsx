import { Component, type ErrorInfo, type ReactNode } from "react";

interface AdminRouteErrorBoundaryProps {
  children: ReactNode;
}

interface AdminRouteErrorBoundaryState {
  errorMessage: string | null;
}

class AdminRouteErrorBoundary extends Component<AdminRouteErrorBoundaryProps, AdminRouteErrorBoundaryState> {
  state: AdminRouteErrorBoundaryState = { errorMessage: null };

  static getDerivedStateFromError(error: Error) {
    return { errorMessage: error.message || "Terjadi error saat membuka halaman admin." };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin route crashed", error, errorInfo);
  }

  render() {
    if (!this.state.errorMessage) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-lg">
          <h1 className="font-display text-lg font-bold text-foreground">Halaman admin gagal dimuat</h1>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.errorMessage}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Muat ulang
          </button>
        </div>
      </div>
    );
  }
}

export default AdminRouteErrorBoundary;