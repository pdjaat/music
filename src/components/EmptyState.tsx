export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-2 text-white/50">{body}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6">
      <p className="font-semibold">Music service is temporarily unavailable. Please try again.</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-full bg-white text-ink px-4 py-2 text-sm font-semibold">
          Retry
        </button>
      )}
    </div>
  );
}
