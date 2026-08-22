import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, LogIn } from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { toastError, toastSuccess } from '../state/toasts';
import { Logo } from '../components/Sidebar';
import { api } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toastSuccess('Welcome back!');
      navigate('/');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ devResetToken?: string }>('/api/auth/forgot-password', { method: 'POST', body: { email: resetEmail }, auth: false });
      if (res.devResetToken) {
        toastSuccess(`Dev reset token: ${res.devResetToken}`);
        navigate(`/reset-password?token=${res.devResetToken}`);
      } else {
        toastSuccess('If that email exists, a reset link has been sent.');
        setShowReset(false);
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 sm:pt-20">
      <Logo />
      <h1 className="mt-6 text-2xl font-black">Welcome back</h1>
      <p className="mt-1 text-sm text-zinc-400">Sign in to keep your playlists and favourites.</p>

      {!showReset ? (
        <form onSubmit={submit} className="mt-8 w-full space-y-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
            <LogIn className="h-4 w-4" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={requestReset} className="mt-8 w-full space-y-4">
          <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="Email for reset"
            className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
            <KeyRound className="h-4 w-4" /> Send reset link
          </button>
        </form>
      )}

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-zinc-400">
        <button onClick={() => setShowReset((v) => !v)} className="hover:text-white">{showReset ? '← Back to sign in' : 'Forgot password?'}</button>
        <p>New here? <Link to="/register" className="font-bold text-accent-400 hover:underline">Create an account</Link></p>
        <button onClick={() => navigate('/')} className="text-xs text-zinc-500 hover:text-zinc-300">Continue as guest</button>
      </div>
    </div>
  );
}
