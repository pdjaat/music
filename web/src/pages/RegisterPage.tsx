import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { toastError, toastSuccess } from '../state/toasts';
import { Logo } from '../components/Sidebar';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toastError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      toastError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await register(email, password, displayName);
      toastSuccess('Account created — welcome to Sangeet!');
      navigate('/');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 sm:pt-20">
      <Logo />
      <h1 className="mt-6 text-2xl font-black">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-400">Free forever. Keep your playlists, likes and radio in sync.</p>

      <form onSubmit={submit} className="mt-8 w-full space-y-4">
        <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" maxLength={60}
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
          <UserPlus className="h-4 w-4" /> {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400">
        Already registered? <Link to="/login" className="font-bold text-accent-400 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
