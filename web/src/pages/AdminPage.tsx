import { useCallback, useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, Disc3, Heart, ListMusic, Mic2, Plus, Radio, RefreshCw, ShieldAlert, TrendingUp, Trash2, Users,
} from 'lucide-react';
import { useAuthStore } from '../state/auth';
import { api } from '../lib/api';
import { toastError, toastSuccess } from '../state/toasts';
import { Skeleton } from '../components/Skeleton';
import type { AdminStats } from '../lib/types';

interface ProviderRow {
  id: string;
  displayName: string;
  kind: string;
  enabled: boolean;
  priority: number;
  configured: boolean;
  reachable: boolean;
  message: string;
}

interface FeaturedRow { id: number; title: string; subtitle: string | null; enabled: number; sort: number; provider: string }
interface RadioRow { id: number; name: string; slug: string; description: string | null; enabled: number; sort: number }

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [events, setEvents] = useState<Array<{ id: number; type: string; message: string; created_at: string }>>([]);
  const [trends, setTrends] = useState<Array<{ query: string; count: number }>>([]);
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [stations, setStations] = useState<RadioRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, p, e, t, f, r] = await Promise.all([
        api<AdminStats>('/api/admin/stats'),
        api<{ providers: ProviderRow[] }>('/api/admin/providers'),
        api<{ events: Array<{ id: number; type: string; message: string; created_at: string }> }>('/api/admin/events?limit=12'),
        api<{ trends: Array<{ query: string; count: number }> }>('/api/admin/search-trends'),
        api<{ featured: FeaturedRow[] }>('/api/admin/featured'),
        api<{ stations: RadioRow[] }>('/api/admin/radio'),
      ]);
      setStats(s);
      setProviders(p.providers);
      setEvents(e.events);
      setTrends(t.trends);
      setFeatured(f.featured);
      setStations(r.stations);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.isAdmin) void load(); }, [user, load]);

  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 pt-20 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-400" />
        <h1 className="text-xl font-bold">Admins only</h1>
        <p className="text-sm text-zinc-400">You need an administrator account to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="space-y-4 pt-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>;

  const toggleProvider = async (id: string, enabled: boolean) => {
    try {
      await api(`/api/admin/providers/${id}`, { method: 'PATCH', body: { enabled } });
      toastSuccess(`${id} ${enabled ? 'enabled' : 'disabled'}`);
      void load();
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const clearCache = async () => {
    await api('/api/admin/cache/clear', { method: 'POST' });
    toastSuccess('Provider cache cleared');
  };

  const cards = stats ? [
    { label: 'Users', value: stats.totals.users, icon: Users, tint: 'text-sky-400 bg-sky-500/10' },
    { label: 'Active (7d)', value: stats.totals.activeUsers7d, icon: Activity, tint: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Plays (7d)', value: stats.totals.plays7d, icon: TrendingUp, tint: 'text-orange-400 bg-orange-500/10' },
    { label: 'Songs', value: stats.totals.songs, icon: Disc3, tint: 'text-violet-400 bg-violet-500/10' },
    { label: 'Artists', value: stats.totals.artists, icon: Mic2, tint: 'text-rose-400 bg-rose-500/10' },
    { label: 'Playlists', value: stats.totals.playlists, icon: ListMusic, tint: 'text-teal-400 bg-teal-500/10' },
    { label: 'Likes', value: stats.totals.likes, icon: Heart, tint: 'text-pink-400 bg-pink-500/10' },
    { label: 'Radio stations', value: stats.totals.radioStations, icon: Radio, tint: 'text-amber-400 bg-amber-500/10' },
  ] : [];

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Admin dashboard</h1>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/15"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          <button onClick={clearCache} className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold transition hover:bg-white/15">Clear cache</button>
        </div>
      </div>

      {/* stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/5 bg-ink-850 p-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tint}`}><c.icon className="h-4.5 w-4.5" /></div>
            <div className="mt-3 text-2xl font-black tabular-nums">{c.value}</div>
            <div className="text-xs text-zinc-400">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* providers */}
        <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
          <h2 className="mb-4 text-base font-extrabold">Provider health &amp; control</h2>
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${p.reachable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span className="truncate text-sm font-bold">{p.id}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{p.message}</p>
                </div>
                <button
                  onClick={() => toggleProvider(p.id, !p.enabled)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${p.enabled ? 'bg-emerald-500/60' : 'bg-white/10'}`}
                  aria-label={`Toggle ${p.id}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Priority &amp; refresh intervals are configurable in the server database (providers table).</p>
        </section>

        {/* search trends */}
        <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
          <h2 className="mb-4 text-base font-extrabold">Search trends</h2>
          {trends.length === 0 ? <p className="text-sm text-zinc-500">No searches yet.</p> : (
            <div className="space-y-2">
              {trends.map((t, i) => (
                <div key={t.query + i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-xs tabular-nums text-zinc-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t.query}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* most played */}
        {stats && (
          <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
            <h2 className="mb-4 text-base font-extrabold">Most played songs</h2>
            <div className="space-y-2">
              {stats.mostPlayedSongs.map((s, i) => (
                <div key={s.song_id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-right text-xs tabular-nums text-zinc-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="truncate text-xs text-zinc-500">{s.artist}</div>
                  </div>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{s.plays} plays</span>
                </div>
              ))}
            </div>
            <h3 className="mb-2 mt-5 text-sm font-extrabold">Popular languages</h3>
            <div className="flex flex-wrap gap-2">
              {stats.popularLanguages.map((l) => (
                <span key={l.language} className="rounded-full bg-white/10 px-3 py-1 text-xs">{l.language} · {l.plays}</span>
              ))}
            </div>
          </section>
        )}

        {/* events */}
        <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
          <h2 className="mb-4 text-base font-extrabold">Recent events</h2>
          {events.length === 0 ? <p className="text-sm text-zinc-500">No events logged yet.</p> : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-2 rounded-xl bg-white/[0.04] p-2.5 text-xs">
                  {e.type === 'provider_error' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" /> : <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.message}</div>
                    <div className="text-[10px] text-zinc-500">{e.type} · {e.created_at}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* featured playlists */}
        <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold">Featured playlists</h2>
            <CreateButton label="Add" onClick={async () => {
              const title = window.prompt('Featured playlist title');
              if (!title) return;
              await api('/api/admin/featured', { method: 'POST', body: { title } });
              toastSuccess('Featured playlist created');
              void load();
            }} />
          </div>
          <div className="space-y-2">
            {featured.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{f.title}</div>
                  <div className="truncate text-xs text-zinc-500">{f.subtitle ?? '—'} · provider: {f.provider}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Toggle value={Boolean(f.enabled)} onChange={async (v) => {
                    await api(`/api/admin/featured/${f.id}`, { method: 'PATCH', body: { enabled: v } });
                    void load();
                  }} label={`${f.title} enabled`} />
                  <button onClick={async () => {
                    if (!window.confirm(`Delete "${f.title}"?`)) return;
                    await api(`/api/admin/featured/${f.id}`, { method: 'DELETE' });
                    toastSuccess('Deleted');
                    void load();
                  }} className="btn-icon !p-1.5 hover:!text-rose-400" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {featured.length === 0 && <p className="text-sm text-zinc-500">No featured playlists.</p>}
          </div>
        </section>

        {/* radio stations */}
        <section className="rounded-3xl border border-white/5 bg-ink-850 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-extrabold">Radio categories</h2>
            <CreateButton label="Add" onClick={async () => {
              const name = window.prompt('Station name');
              if (!name) return;
              const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              await api('/api/admin/radio', { method: 'POST', body: { name, slug, seed: { query: name } } });
              toastSuccess('Radio station created');
              void load();
            }} />
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {stations.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{s.name}</div>
                  <div className="truncate text-xs text-zinc-500">{s.slug} · {s.description ?? '—'}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Toggle value={Boolean(s.enabled)} onChange={async (v) => {
                    await api(`/api/admin/radio/${s.id}`, { method: 'PATCH', body: { enabled: v } });
                    void load();
                  }} label={`${s.name} enabled`} />
                  <button onClick={async () => {
                    if (!window.confirm(`Delete "${s.name}"?`)) return;
                    await api(`/api/admin/radio/${s.id}`, { method: 'DELETE' });
                    toastSuccess('Deleted');
                    void load();
                  }} className="btn-icon !p-1.5 hover:!text-rose-400" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
            {stations.length === 0 && <p className="text-sm text-zinc-500">No radio stations.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${value ? 'bg-emerald-500/60' : 'bg-white/10'}`}
      aria-label={label}
      role="switch"
      aria-checked={value}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function CreateButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold transition hover:bg-white/15">
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
