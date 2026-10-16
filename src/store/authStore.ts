import { create } from 'zustand';
import type { User } from '../types';
import { storage } from '../lib/storage';
import { TOKEN_KEY, setUnauthorizedHandler } from '../lib/api';
import { getProfile } from '../lib/auth';
import { initSocket, disconnectSocket } from '../lib/socket';
import { queryClient } from '../lib/queryClient';

// The profile is kept in the browser so the page opens at once,
// without waiting for /auth/me from a server that may be asleep.
const USER_KEY = 'auth_user';

function loadUser(): User | null {
  try {
    const raw = storage.get(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (token, user) => {
    storage.set(TOKEN_KEY, token);
    storage.set(USER_KEY, JSON.stringify(user));
    initSocket(token);
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
    queryClient.clear();
    disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false });
  },

  hydrate: () => {
    const token = storage.get(TOKEN_KEY);
    if (!token) return;

    set({ token, user: loadUser(), isAuthenticated: true });
    initSocket(token);

    // Refresh the profile in the background; a dead token signs out through the 401 handler
    getProfile()
      .then((user) => {
        storage.set(USER_KEY, JSON.stringify(user));
        set({ user });
      })
      .catch(() => null);
  },
}));

// An expired or refused token signs the user out instead of leaving every screen failing
setUnauthorizedHandler(() => {
  if (useAuthStore.getState().isAuthenticated) useAuthStore.getState().logout();
});
