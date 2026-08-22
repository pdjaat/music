import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface RailProps {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  children: ReactNode;
}

export function Rail({ title, subtitle, linkTo, linkLabel = 'See all', children }: RailProps) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-zinc-400 transition hover:text-white">
            {linkLabel} <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}
