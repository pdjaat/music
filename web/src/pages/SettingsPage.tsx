import { Moon, Shield, Sun } from 'lucide-react';
import { useUiStore } from '../state/ui';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { toastSuccess } from '../state/toasts';

export function SettingsPage() {
  const { theme, setTheme } = useUiStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const applyTheme = (t: 'dark' | 'light') => {
    setTheme(t);
    if (user) {
      api('/api/auth/me', { method: 'PATCH', body: { theme: t } })
        .then((r) => setUser((r as { user: typeof user }).user))
        .catch(() => undefined);
    }
    toastSuccess(`${t === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  };

  return (
    <div className="mx-auto max-w-xl pt-2">
      <h1 className="text-2xl font-black tracking-tight">Settings</h1>

      <div className="mt-6 rounded-3xl border border-white/5 bg-ink-850 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">{theme === 'dark' ? <Moon className="h-5 w-5 text-accent-400" /> : <Sun className="h-5 w-5 text-accent-400" />} Appearance</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => applyTheme('dark')} className={`rounded-2xl border p-4 text-left transition ${theme === 'dark' ? 'border-accent-400/50 bg-brand-soft' : 'border-white/10 bg-ink-900 hover:bg-ink-800'}`}>
            <div className="h-16 rounded-xl bg-ink-950 p-2">
              <div className="h-2 w-10 rounded bg-white/20" />
              <div className="mt-2 h-8 rounded bg-white/10" />
            </div>
            <div className="mt-2 text-sm font-bold">Dark</div>
            <div className="text-xs text-zinc-400">Default · easy on the eyes</div>
          </button>
          <button onClick={() => applyTheme('light')} className={`rounded-2xl border p-4 text-left transition ${theme === 'light' ? 'border-accent-400/50 bg-brand-soft' : 'border-white/10 bg-ink-900 hover:bg-ink-800'}`}>
            <div className="h-16 rounded-xl bg-white p-2">
              <div className="h-2 w-10 rounded bg-zinc-300" />
              <div className="mt-2 h-8 rounded bg-zinc-100" />
            </div>
            <div className="mt-2 text-sm font-bold">Light</div>
            <div className="text-xs text-zinc-400">For bright rooms</div>
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/5 bg-ink-850 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold"><Shield className="h-5 w-5 text-accent-400" /> Privacy &amp; legal</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li>• Sangeet streams content through the official APIs of its providers. It never hosts, re-encodes or downloads audio.</li>
          <li>• 30-second previews are clearly labelled; full streams are only used where the provider legally permits them.</li>
          <li>• YouTube playback uses the official embedded player — ads and branding are never bypassed.</li>
          <li>• Your library data stays on your device &amp; the Sangeet server; no tracking cookies are used.</li>
        </ul>
      </div>
    </div>
  );
}
