import { create } from "zustand";
import { hashPassword, loadJSON, saveJSON } from "../utils/storage";
import type { User } from "../types/music";

interface StoredUser extends User {
  passwordHash: string;
}

interface AuthState {
  user: User | null;
  ready: boolean;
  error: string | null;
  hydrate: () => void;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (displayName: string) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  error: null,
  hydrate: () => {
    const session = loadJSON<User | null>("session", null);
    set({ user: session, ready: true });
  },
  signup: async (email, password, displayName) => {
    const users = loadJSON<StoredUser[]>("users", []);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      set({ error: "An account with that email already exists." });
      throw new Error("exists");
    }
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email,
      displayName,
      passwordHash: await hashPassword(password),
    };
    users.push(user);
    saveJSON("users", users);
    const pub = { id: user.id, email, displayName };
    saveJSON("session", pub);
    set({ user: pub, error: null });
  },
  login: async (email, password) => {
    const users = loadJSON<StoredUser[]>("users", []);
    const hash = await hashPassword(password);
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hash);
    if (!found) {
      set({ error: "Invalid email or password." });
      throw new Error("invalid");
    }
    const pub = { id: found.id, email: found.email, displayName: found.displayName };
    saveJSON("session", pub);
    set({ user: pub, error: null });
  },
  logout: () => {
    saveJSON("session", null);
    set({ user: null });
  },
  updateProfile: (displayName) => {
    const user = get().user;
    if (!user) return;
    const next = { ...user, displayName };
    const users = loadJSON<StoredUser[]>("users", []).map((u) => (u.id === user.id ? { ...u, displayName } : u));
    saveJSON("users", users);
    saveJSON("session", next);
    set({ user: next });
  },
}));
