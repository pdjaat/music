import { create } from 'zustand';
import { api, apiLogin, apiMe, apiRegister, clearToken, setToken } from '../lib/api';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  bootstrapped: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  bootstrapped: false,

  init: async () => {
    try {
      if (localStorage.getItem('sangeet_token')) {
        const { user } = await apiMe();
        set({ user, loading: false, bootstrapped: true });
        return;
      }
    } catch {
      clearToken();
    }
    set({ user: null, loading: false, bootstrapped: true });
  },

  login: async (email, password) => {
    const { token, user } = await apiLogin(email, password);
    setToken(token);
    set({ user });
    return user;
  },

  register: async (email, password, displayName) => {
    const { token, user } = await apiRegister(email, password, displayName);
    setToken(token);
    set({ user });
    return user;
  },

  logout: () => {
    clearToken();
    set({ user: null });
    api('/api/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
  },

  setUser: (u) => set({ user: u }),
}));

export function useUser(): User | null {
  return useAuthStore((s) => s.user);
}
