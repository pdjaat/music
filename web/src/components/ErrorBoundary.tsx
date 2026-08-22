import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

/** Never show a raw crash to users — friendly panel + retry. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(e: Error): State {
    return { hasError: true, message: e.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[sangeet:ui-error]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-ink-850 p-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              This section hit an unexpected error. You can reload it — your music keeps playing.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
