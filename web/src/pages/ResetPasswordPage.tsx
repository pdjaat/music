import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { api } from '../lib/api';
import { toastError, toastSuccess } from '../state/toasts';
import { Logo } from '../components/Sidebar';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { toastError('This reset link is incomplete.'); return; }
    if (password.length < 8) { toastError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { toastError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
      toastSuccess('Password reset. Sign in with your new password.');
      navigate('/login');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 sm:pt-20">
      <Logo />
      <h1 className="mt-6 text-2xl font-black">Set a new password</h1>
      <form onSubmit={submit} className="mt-8 w-full space-y-4">
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password"
          className="w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none transition focus:border-accent-400/50" />
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-gradient py-3 font-bold text-white shadow-glow transition hover:opacity-90 disabled:opacity-40">
          <KeyRound className="h-4 w-4" /> {busy ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
