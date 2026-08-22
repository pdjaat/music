export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden />;
}

export function TrackCardSkeleton() {
  return (
    <div className="w-40 shrink-0 sm:w-44">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <Skeleton className="mt-2 h-3.5 w-4/5" />
      <Skeleton className="mt-1.5 h-3 w-3/5" />
    </div>
  );
}

export function RailSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <TrackCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-2">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="mt-1.5 h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}
