import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '../state/toasts';

export function Toasts() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-card animate-fadeUp backdrop-blur-xl ${
            t.kind === 'success'
              ? 'border-emerald-400/20 bg-emerald-950/90 text-emerald-200'
              : t.kind === 'error'
                ? 'border-rose-400/20 bg-rose-950/90 text-rose-200'
                : 'border-white/10 bg-ink-800/95 text-zinc-100'
          }`}
        >
          {t.kind === 'success' ? <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400" /> : t.kind === 'error' ? <XCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" /> : <Info className="h-4.5 w-4.5 shrink-0 text-sky-400" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="opacity-60 transition hover:opacity-100" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
