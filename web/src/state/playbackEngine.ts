/**
 * Playback engine — unifies two legal transports behind one interface:
 *
 *  1. HTML5 <audio>   → direct legal stream URLs (Deezer/iTunes 30s previews,
 *                       Internet Archive full CC audio, etc.)
 *  2. YouTube IFrame  → official embedded YouTube player (full tracks; ads and
 *                       branding are never bypassed).
 *
 * The engine listens to store events and mirrors state back into the store.
 */

import { usePlayerStore } from './player';
import { api } from '../lib/api';

let engineStarted = false;

export function startPlaybackEngine(): void {
  if (engineStarted) return;
  engineStarted = true;

  const store = () => usePlayerStore.getState();

  // --- audio element (hidden, always mounted) ---
  const audio = document.createElement('audio');
  audio.preload = 'auto';
  audio.style.display = 'none';
  document.body.appendChild(audio);

  // --- YouTube IFrame player ---
  const YT_CONTAINER_ID = 'sangeet-yt-player';
  let ytPlayer: { playVideo(): void; pauseVideo(): void; seekTo(t: number, a: boolean): void; getCurrentTime(): number; getDuration(): number; setVolume(v: number): void; mute(): void; unMute(): void; loadVideoById(id: string): void; destroy(): void } | null = null;
  let ytApiReady: Promise<void> | null = null;

  function loadYtApi(): Promise<void> {
    if (ytApiReady) return ytApiReady;
    ytApiReady = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      // Safety: some environments block the script — resolve after 8s anyway.
      window.setTimeout(resolve, 8000);
    });
    return ytApiReady;
  }

  function ensureYtContainer(): HTMLElement {
    let el = document.getElementById(YT_CONTAINER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = YT_CONTAINER_ID;
      el.style.cssText = 'position:fixed;left:-9999px;top:0;width:560px;height:315px;opacity:0;pointer-events:none;z-index:-1;';
      document.body.appendChild(el);
    }
    return el;
  }

  async function createYtPlayer(videoId: string): Promise<void> {
    await loadYtApi();
    if (ytPlayer) return;
    const el = ensureYtContainer();
    const YT = window.YT as {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => {
        playVideo(): void; pauseVideo(): void; seekTo(t: number, a: boolean): void;
        getCurrentTime(): number; getDuration(): number; setVolume(v: number): void;
        mute(): void; unMute(): void; loadVideoById(id: string): void; destroy(): void;
      };
    };
    ytPlayer = new YT.Player(el, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        playsinline: 1,
        modestbranding: 1,
        origin: window.location.origin,
        enablejsapi: 1,
      },
      events: {
        onReady: () => {
          const s = store();
          s.setDuration(ytPlayer?.getDuration() ?? 0);
          if (s.isPlaying) ytPlayer?.playVideo();
        },
        onStateChange: (e: { data: number }) => {
          const s = store();
          if (e.data === 1) {
            s.setBuffering(false);
            s.setDuration(ytPlayer?.getDuration() ?? s.duration);
            if (!s.isPlaying) usePlayerStore.setState({ isPlaying: true });
            startPolling();
          } else if (e.data === 2) {
            usePlayerStore.setState({ isPlaying: false });
          } else if (e.data === 0) {
            stopPolling();
            s.setPosition(0);
            handleEnded();
          } else if (e.data === 3) {
            s.setBuffering(true);
          }
        },
        onError: (e: { data: number }) => {
          const messages: Record<number, string> = {
            2: 'This video is invalid and cannot be played.',
            5: 'The player could not play this video (HTML5 error).',
            100: 'This video has been removed or is unavailable.',
            101: 'This video cannot be embedded here.',
            150: 'This video cannot be embedded here.',
          };
          store().setError(messages[e.data] ?? 'Playback error from YouTube.');
          handleEnded();
        },
      },
    });
  }

  function isYouTubeTrack(track: { stream: { kind: string; videoId?: string } }): boolean {
    return track.stream.kind === 'youtube' && Boolean(track.stream.videoId);
  }

  let pollTimer: number | null = null;
  function startPolling(): void {
    if (pollTimer !== null) return;
    pollTimer = window.setInterval(() => {
      if (!ytPlayer) return;
      const t = ytPlayer.getCurrentTime();
      const d = ytPlayer.getDuration();
      usePlayerStore.setState({ position: t, duration: d || usePlayerStore.getState().duration });
    }, 500);
  }
  function stopPolling(): void {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // --- play a track ---
  let lastTrackKey = '';
  let ending = false;

  async function playCurrent(): Promise<void> {
    const s = store();
    const track = s.current;
    if (!track) return;
    s.setError(null);
    s.setBuffering(true);

    const key = `${track.provider}:${track.providerTrackId}`;
    if (track.stream.kind === 'youtube') {
      audio.pause();
      audio.removeAttribute('src');
      if (!ytPlayer) {
        await createYtPlayer(track.stream.videoId!);
      }
      if (ytPlayer) {
        if (key !== lastTrackKey) {
          ytPlayer.loadVideoById(track.stream.videoId!);
          lastTrackKey = key;
        }
        if (s.isPlaying) ytPlayer.playVideo();
      }
      reportPlay(track, 0, false);
      return;
    }

    // url stream
    stopPolling();
    try {
      if (ytPlayer && key !== lastTrackKey) {
        // keep last loaded; pause it while audio plays
        ytPlayer.pauseVideo();
      }
      lastTrackKey = key;
      audio.src = track.stream.url ?? '';
      audio.volume = s.muted ? 0 : s.volume;
      audio.muted = s.muted;
      if (s.isPlaying) {
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            // Usually autoplay policy — don't auto-skip; tell the user to tap play.
            store().setError('Playback was blocked by the browser. Tap play to start.');
            store().setBuffering(false);
            usePlayerStore.setState({ isPlaying: false });
          });
        }
      }
      reportPlay(track, 0, false);
    } catch {
      // Synchronous failure (e.g. jsdom, or a malformed URL). Show a clear
      // error but NEVER loop — the track is left in place, paused.
      store().setError('This stream could not be started. Try another track.');
      store().setBuffering(false);
      usePlayerStore.setState({ isPlaying: false });
    }
  }

  /** Advance after a track finishes or errors — re-entry-safe. */
  function handleEnded(): void {
    if (ending) return;
    ending = true;
    try {
      const s = store();
      if (s.current?.id) {
        api(`/api/tracks/${s.current.id}/play`, { method: 'POST', body: { durationSec: s.duration || 0, completed: true }, auth: false }).catch(() => undefined);
      }
      const before = s.current?.providerTrackId;
      s.next(true);
      const after = usePlayerStore.getState();
      const moved = after.current && after.current.providerTrackId !== before;
      if (moved) {
        void playCurrent();
      } else {
        // Nothing advanced (end of queue / single broken track) — stop cleanly.
        usePlayerStore.setState({ isPlaying: false, position: 0, buffering: false });
      }
    } finally {
      ending = false;
    }
  }

  // --- report plays / history (fire-and-forget) ---
  function reportPlay(track: { id?: number; title: string; artistName: string }, durationSec: number, completed: boolean): void {
    const body = { durationSec, completed };
    if (track.id) {
      api(`/api/tracks/${track.id}/play`, { method: 'POST', body, auth: false }).catch(() => undefined);
    } else {
      api('/api/tracks/ingest', { method: 'POST', body: { track }, auth: false })
        .then(() => undefined)
        .catch(() => undefined);
    }
  }

  // --- audio events ---
  audio.addEventListener('timeupdate', () => {
    usePlayerStore.setState({ position: audio.currentTime, duration: audio.duration || 0 });
  });
  audio.addEventListener('waiting', () => store().setBuffering(true));
  audio.addEventListener('playing', () => {
    store().setBuffering(false);
    usePlayerStore.setState({ isPlaying: true });
  });
  audio.addEventListener('pause', () => {
    if (!store().buffering) usePlayerStore.setState({ isPlaying: false });
  });
  audio.addEventListener('ended', () => handleEnded());
  audio.addEventListener('error', () => {
    if (audio.src) {
      store().setError('This stream could not be loaded (it may have expired or be region-restricted).');
      handleEnded();
    }
  });
  audio.addEventListener('stalled', () => store().setBuffering(true));

  // --- store event wiring ---
  window.addEventListener('sangeet:queue-changed', () => {
    void playCurrent();
  });

  window.addEventListener('sangeet:play-toggle', (e) => {
    const { playing } = (e as CustomEvent).detail as { playing: boolean };
    const s = store();
    if (playing) {
      const track = s.current;
      if (track) {
        if (track.stream.kind === 'youtube') {
          void loadYtApi().then(() => {
            if (ytPlayer) ytPlayer.playVideo();
            else void playCurrent();
          });
        } else if (audio.src) {
          audio.volume = s.muted ? 0 : s.volume;
          const p = audio.play();
          if (p) p.catch(() => store().setError('Playback blocked by the browser. Tap play again.'));
        } else {
          void playCurrent();
        }
      }
    } else {
      if (s.current?.stream.kind === 'youtube') ytPlayer?.pauseVideo();
      else audio.pause();
    }
  });

  window.addEventListener('sangeet:seek', (e) => {
    const { t } = (e as CustomEvent).detail as { t: number };
    const s = store();
    if (s.current?.stream.kind === 'youtube') ytPlayer?.seekTo(t, true);
    else if (audio.src) audio.currentTime = t;
  });

  window.addEventListener('sangeet:volume', (e) => {
    const { volume, muted } = (e as CustomEvent).detail as { volume: number; muted: boolean };
    audio.volume = muted ? 0 : volume;
    audio.muted = muted;
    if (ytPlayer) {
      if (muted) ytPlayer.mute();
      else {
        ytPlayer.unMute();
        ytPlayer.setVolume(volume * 100);
      }
    }
  });

  // Keyboard shortcuts: space = play/pause, arrows = seek
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    if (e.code === 'Space') {
      e.preventDefault();
      store().togglePlay();
    } else if (e.code === 'ArrowRight' && store().current) {
      store().seek(Math.min(store().position + 10, store().duration || 999999));
    } else if (e.code === 'ArrowLeft' && store().current) {
      store().seek(Math.max(store().position - 10, 0));
    }
  });
}
