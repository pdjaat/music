import { ReactNode } from 'react';

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 bg-ink-850/50 px-6 py-14 text-center">
      {icon && <div className="text-zinc-500">{icon}</div>}
      <h3 className="text-base font-bold">{title}</h3>
      {message && <p className="max-w-sm text-sm text-zinc-400">{message}</p>}
      {action}
    </div>
  );
}
