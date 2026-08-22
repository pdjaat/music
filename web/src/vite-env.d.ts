/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  YT?: {
    Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => unknown;
  };
  onYouTubeIframeAPIReady?: () => void;
}
