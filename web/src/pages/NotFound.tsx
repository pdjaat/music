import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 pt-24 text-center">
      <div className="text-7xl font-black text-gradient">404</div>
      <h1 className="text-xl font-bold">This page went off the charts</h1>
      <p className="max-w-sm text-sm text-zinc-400">The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/" className="flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:opacity-90">
        <Home className="h-4 w-4" /> Back to Home
      </Link>
    </div>
  );
}
