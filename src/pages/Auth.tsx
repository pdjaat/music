import { useState } from "react";
import { useAuth } from "../store/auth";

export function Auth() {
  const { login, signup, error } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, displayName || email.split("@")[0]);
    } catch {
      /* store sets error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-end p-12 bg-gradient-to-br from-glow/40 to-ember/30">
        <h1 className="font-display text-5xl">Hear the independent web.</h1>
        <p className="mt-4 max-w-md text-white/70">
          Lumen is a premium player for legally streamable independent music — not a clone of a commercial catalog.
        </p>
      </div>
      <form onSubmit={submit} className="p-10 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="font-display text-3xl mb-8">
          Lumen<span className="text-ember">.</span>
        </div>
        {mode === "signup" && (
          <input
            required
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-3 rounded-xl bg-card border border-line px-3 py-3"
          />
        )}
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 rounded-xl bg-card border border-line px-3 py-3"
        />
        <input
          required
          minLength={6}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 rounded-xl bg-card border border-line px-3 py-3"
        />
        {error && <p className="mb-3 text-sm text-ember">{error}</p>}
        <button disabled={busy} className="rounded-xl bg-ember text-ink font-semibold py-3">
          {mode === "login" ? "Log in" : "Create account"}
        </button>
        <button type="button" className="mt-4 text-sm text-white/50" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
