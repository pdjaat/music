export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function placeholderArt(seed: string) {
  const hue = Math.abs(hash(seed)) % 360;
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='hsl(${hue},70%,45%)'/><stop offset='1' stop-color='hsl(${(hue + 40) % 360},60%,25%)'/></linearGradient></defs><rect width='400' height='400' fill='url(#g)'/></svg>`
  );
  return `data:image/svg+xml,${svg}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
