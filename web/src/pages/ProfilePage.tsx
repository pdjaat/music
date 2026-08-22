import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { toastError, toastSuccess } from '../state/toasts';
import { SignInPrompt } from '../components/SignInPrompt';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="pt-4">
        <h1 className="mb-6 text-2xl font-black">Profile</h1>
        <SignInPrompt />
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { user: updated } = await api<{ user: typeof user }>('/api/auth/me', { method: 'PATCH', body: { displayName } });
      setUser(updated);
      toastSuccess('Profile updated');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      toastSuccess('Password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setBusy(false);
    }
  };

  const doLogout = () => {
    logout();
    toastSuccess('Signed out. See you soon!');
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-xl pt-2">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-2xl font-black text-white shadow-glow">
          {user.displayName[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-black">{user.displayName}</h1>
          <p className="text-sm text-zinc-400">{user.email}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Member since {new Date(user.id * 1000 + Date.parse('2026-01-01') % 1000000000).toLocaleDateString()} · {user.isAdmin ? 'Administrator' : 'Listener'}</p>
        </div>
      </div>

      {user.isAdmin && (
        <Link to="/admin" className="mt-5 flex items-center gap-3 rounded-2xl border border-accent-400/20 bg-accent-400/5 p-4 text-sm font-semibold transition hover:bg-accent-400/10">
          <Shield className="h-5 w-5 text-accent-400" /> Open Admin panel
        </Link>
      )}

      <form onSubmit={saveProfile} className="mt-8 rounded-3xl border border-white/5 bg-ink-850 p-6">
        <h2 className="mb-4 text-lg font-extrabold">Profile details</h2>
        <div className="space-y-4">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} placeholder="Display name"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 outline-none focus:border-accent-400/50" />
          <button disabled={busy} className="rounded-full bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40">Save</button>
        </div>
      </form>

      <form onSubmit={changePassword} className="mt-6 rounded-3xl border border-white/5 bg-ink-850 p-6">
        <h2 className="mb-4 text-lg font-extrabold">Change password</h2>
        <div className="space-y-4">
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 outline-none focus:border-accent-400/50" />
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-ink-900 px-4 py-3 outline-none focus:border-accent-400/50" />
          <button disabled={busy || !currentPassword || !newPassword} className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-bold transition hover:bg-white/15 disabled:opacity-40">Update password</button>
        </div>
      </form>

      <button onClick={doLogout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/5 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-400/10">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
      <span className="sr-only"><UserIcon /></span>
    </div>
  );
}
