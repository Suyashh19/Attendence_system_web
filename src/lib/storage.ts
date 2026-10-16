// localStorage stands in for the app's SecureStore. Safari can refuse access
// (private mode, blocked site data), so every call is guarded.

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not being able to save only means signing in again next time
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to remove
    }
  },
};
