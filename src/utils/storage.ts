const KEY = "lumen.v1";

export function loadJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${KEY}.${k}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(k: string, value: unknown) {
  localStorage.setItem(`${KEY}.${k}`, JSON.stringify(value));
}

export async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`lumen:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
