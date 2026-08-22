import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export function SignInPrompt({ message = 'Sign in to save songs, build playlists and get personalised recommendations.' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-ink-850 px-6 py-12 text-center sm:flex-row sm:gap-6 sm:text-left">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
        <LogIn className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold">You&apos;re listening as a guest</h3>
        <p className="mt-1 max-w-md text-sm text-zinc-400">{message}</p>
      </div>
      <div className="flex gap-2">
        <Link to="/login" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15">Sign in</Link>
        <Link to="/register" className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Create account</Link>
      </div>
    </div>
  );
}
