import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  username: string | null;
  setAuth: (token: string | null, username: string | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      setAuth: (token, username) => set({ token, username }),
      logout: () => set({ token: null, username: null }),
    }),
    { name: 'yueyuedao-auth' },
  ),
);

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'yueyuedao-theme' },
  ),
);

export function getFingerprint(): string {
  let fp = localStorage.getItem('yueyuedao-fp');
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem('yueyuedao-fp', fp);
  }
  return fp;
}
