import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Skeleton } from '../components/Skeleton';
import type { ProviderHealthStatus } from '../lib/types';

interface ProviderInfo extends ProviderHealthStatus {
  id: string;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  displayName: string;
  kind: string;
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    api<{ providers: ProviderInfo[] }>('/api/providers', { auth: false })
      .then((r) => setProviders(r.providers))
      .catch(() => setProviders([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl pt-2">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Providers &amp; legality</h1>
          <p className="text-sm text-zinc-400">Where your music comes from, and what each provider legally permits.</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/5 bg-ink-850 p-6 text-sm leading-relaxed text-zinc-300">
        <p>
          <strong>Sangeet is a streaming client, not a content owner.</strong> Every track is streamed through the
          official, publicly documented API of the provider shown on the track. Sangeet does not download, re-encode,
          host, or redistribute any audio, and never bypasses ads, DRM, subscriptions or geographic restrictions.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-400">
          <li><strong>Preview tracks</strong> (labelled “preview” / “30s”) are short samples legally provided by the API (e.g. Deezer/iTunes previews).</li>
          <li><strong>Full tracks</strong> are only streamed where the provider legally permits it (e.g. Internet Archive public-domain/CC audio, or the official YouTube embedded player).</li>
          <li>Attribution required by a provider is shown on each track (“Streamed from Internet Archive: …”) and we link back to the source page.</li>
        </ul>
      </div>

      <h2 className="mt-8 text-lg font-extrabold">Active providers</h2>
      <div className="mt-4 space-y-4">
        {!providers ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          providers.map((p) => (
            <div key={p.id} className="rounded-3xl border border-white/5 bg-ink-850 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold">{p.displayName}</h3>
                    {p.reachable && p.configured ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="h-3 w-3" /> reachable</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300"><XCircle className="h-3 w-3" /> {p.configured ? 'unreachable' : 'not configured'}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{p.message}</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Kind: <strong>{p.kind}</strong> · {p.enabled ? 'Enabled' : 'Disabled by admin'} · priority {p.priority}
                    {typeof p.config.refreshIntervalSec === 'number' && <> · refresh every {Math.round(p.config.refreshIntervalSec / 60)}min</>}
                  </p>
                </div>
              </div>
              {typeof p.config.note === 'string' && <p className="mt-3 rounded-xl bg-white/[0.04] p-3 text-xs text-zinc-400">{p.config.note}</p>}
            </div>
          ))
        )}
      </div>

      <div className="mt-8 rounded-3xl border border-white/5 bg-ink-850 p-6 text-sm text-zinc-400">
        <h3 className="mb-2 font-extrabold text-zinc-200">How the fallback works</h3>
        <p>
          If the server cannot reach its providers (for example, no <code className="rounded bg-white/10 px-1">YOUTUBE_API_KEY</code> is set),
          the app automatically switches to <em>browser-side</em> legal providers — Deezer previews, iTunes previews and
          Internet Archive full CC audio — and shows a “Preview streams” badge. Set <code className="rounded bg-white/10 px-1">YOUTUBE_API_KEY</code> in the
          server environment to enable full-length playback of the Indian catalog through the official YouTube player.
        </p>
        <a href="https://developers.deezer.com/termsofuse" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-accent-400 hover:underline">
          Deezer developer terms <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
