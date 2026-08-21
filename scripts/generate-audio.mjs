import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("public/audio");
fs.mkdirSync(dir, { recursive: true });

const SR = 22050;

function clamp(n) {
  return Math.max(-1, Math.min(1, n));
}

function note(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function env(t, dur, a = 0.02, r = 0.12) {
  if (t < a) return t / a;
  if (t > dur - r) return Math.max(0, (dur - t) / r);
  return 1;
}

function writeWav(file, seconds, render) {
  const n = Math.floor(SR * seconds);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const s = clamp(render(i / SR, i, n));
    pcm.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(dir, file), Buffer.concat([header, pcm]));
}

const scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

writeWav("aurora.wav", 28, (t) => {
  const i = Math.floor(t * 2) % scale.length;
  const f = scale[i];
  return (
    0.28 * note(f, t) * env((t * 2) % 1, 0.5) +
    0.12 * note(f / 2, t) +
    0.08 * note(f * 1.5, t)
  );
});

writeWav("ember-nights.wav", 26, (t) => {
  const bass = [110, 130.81, 146.83, 110][Math.floor(t * 0.5) % 4];
  const hat = (t * 8) % 1 < 0.06 ? (Math.random() * 2 - 1) * 0.08 : 0;
  return 0.35 * note(bass, t) * (0.6 + 0.4 * Math.sin(t * 2)) + hat + 0.12 * note(bass * 2, t);
});

writeWav("glass-garden.wav", 24, (t) => {
  const ar = [523.25, 659.25, 783.99, 987.77];
  const f = ar[Math.floor(t * 4) % ar.length];
  return 0.22 * note(f, t) * env((t * 4) % 1, 0.25) + 0.1 * note(196, t);
});

writeWav("northbound.wav", 30, (t) => {
  const chord = [220, 277.18, 329.63];
  let s = 0;
  for (const f of chord) s += 0.12 * note(f, t);
  s += 0.08 * note(440 + 8 * Math.sin(t * 0.4), t);
  return s;
});

writeWav("pulse-city.wav", 22, (t) => {
  const kick = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-((t * 2) % 1) * 12);
  const snare = ((t * 2) % 1 > 0.48 && (t * 2) % 1 < 0.55 ? (Math.random() * 2 - 1) * 0.25 : 0);
  return 0.5 * kick + snare + 0.1 * note(880, t) * ((t * 4) % 1 < 0.1 ? 1 : 0);
});

writeWav("saffron.wav", 27, (t) => {
  const raga = [261.63, 293.66, 311.13, 349.23, 392.0, 415.3, 466.16];
  const f = raga[Math.floor(t * 1.5) % raga.length];
  return 0.25 * note(f, t) + 0.12 * note(f * 1.01, t) + 0.08 * note(130.81, t);
});

writeWav("tidal.wav", 32, (t) => {
  const swell = 0.5 + 0.5 * Math.sin(t * 0.3);
  return swell * (0.18 * note(174.61, t) + 0.12 * note(220, t) + 0.08 * note(261.63, t));
});

writeWav("violet-hour.wav", 25, (t) => {
  const f = 196 * Math.pow(2, (Math.floor(t * 3) % 12) / 12);
  return 0.2 * note(f, t) * env((t * 3) % 1, 0.33) + 0.1 * note(98, t);
});

writeWav("paper-kites.wav", 23, (t) => {
  const seq = [392, 349.23, 329.63, 293.66, 261.63];
  const f = seq[Math.floor(t * 2.5) % seq.length];
  return 0.24 * note(f, t) * env((t * 2.5) % 1, 0.4) + 0.07 * (Math.random() * 2 - 1) * 0.02;
});

writeWav("copper-wire.wav", 21, (t) => {
  const f = 110 + 40 * Math.sin(t * 0.7);
  return 0.3 * note(f, t) + 0.1 * note(f * 2.02, t) + 0.05 * note(f * 3, t);
});

writeWav("monsoon.wav", 29, (t) => {
  const drop = Math.random() < 0.02 ? (Math.random() * 2 - 1) * 0.15 : 0;
  return 0.2 * note(146.83, t) + 0.12 * note(174.61, t) * Math.sin(t) + drop;
});

writeWav("lanterns.wav", 26, (t) => {
  const pent = [261.63, 293.66, 329.63, 392.0, 440.0];
  const f = pent[Math.floor(t * 3) % pent.length];
  return 0.22 * note(f * 2, t) * env((t * 3) % 1, 0.3) + 0.1 * note(130.81, t);
});

console.log("wrote", fs.readdirSync(dir).length, "wav files");
