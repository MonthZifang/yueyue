import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  isRoot: boolean;
}

interface AuthState extends AuthUser {
  token: string | null;
  setAuth: (token: string | null, user?: Partial<AuthUser>) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      displayName: null,
      avatarUrl: null,
      email: null,
      isRoot: false,
      setAuth: (token, user) =>
        set({
          token,
          username: user?.username ?? null,
          displayName: user?.displayName ?? null,
          avatarUrl: user?.avatarUrl ?? null,
          email: user?.email ?? null,
          isRoot: Boolean(user?.isRoot),
        }),
      logout: () =>
        set({
          token: null,
          username: null,
          displayName: null,
          avatarUrl: null,
          email: null,
          isRoot: false,
        }),
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
