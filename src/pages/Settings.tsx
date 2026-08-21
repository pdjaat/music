import { useAuth } from "../store/auth";

export function Settings() {
  const { user, updateProfile, logout } = useAuth();
  return (
    <div className="px-6 py-8 max-w-xl">
      <h1 className="font-display text-3xl">Settings</h1>
      <label className="mt-6 block text-sm text-white/60">Display name</label>
      <input
        defaultValue={user?.displayName}
        onBlur={(e) => updateProfile(e.target.value)}
        className="mt-1 w-full rounded-xl bg-card border border-line px-3 py-2"
      />
      <p className="mt-4 text-sm text-white/50">{user?.email}</p>
      <button onClick={logout} className="mt-6 rounded-full bg-white/10 px-4 py-2">
        Log out
      </button>
      <section className="mt-10 text-sm text-white/50 space-y-2">
        <h2 className="text-white font-semibold">About this catalog</h2>
        <p>
          Lumen does not stream Spotify, Apple Music, YouTube Music, or Google catalogs. Playback uses Audius (artist-uploaded), Jamendo (Creative Commons), and Internet Archive public-domain audio.
        </p>
        <p>Attribution: credit the original artists. Jamendo non-commercial API limits apply if you use a Jamendo client ID.</p>
      </section>
    </div>
  );
}
