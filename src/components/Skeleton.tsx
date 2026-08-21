export function SkeletonRow() {
  return (
    <div className="flex gap-3 p-2 animate-pulse">
      <div className="h-12 w-12 rounded-lg bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-3 w-1/3 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-white/10 animate-pulse" />
      ))}
    </div>
  );
}
