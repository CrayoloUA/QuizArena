import { create } from "zustand";
import { api } from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestUsername: string;
  isCheckingAuth: boolean;
  error: string | null;

  // Actions
  setUser: (user: User) => void;
  setGuestUsername: (username: string) => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isGuest: true,
  guestUsername: "",
  isCheckingAuth: true,
  error: null,

  setUser: (user: User) =>
    set({
      user,
      isAuthenticated: true,
      isGuest: false,
      error: null,
    }),

  setGuestUsername: (username: string) =>
    set({
      guestUsername: username,
      isGuest: true,
      user: null,
      isAuthenticated: false,
      error: null,
    }),

  clearError: () => set({ error: null }),

  login: async (usernameOrEmail: string, password: string) => {
    set({ error: null });
    try {
      const data = await api<{ user: User }>("/auth/login", {
        method: "POST",
        body: { usernameOrEmail, password },
      });
      set({
        user: data.user,
        isAuthenticated: true,
        isGuest: false,
        guestUsername: "",
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || "Error al iniciar sesión." });
      throw err;
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ error: null });
    try {
      const data = await api<{ user: User }>("/auth/register", {
        method: "POST",
        body: { username, email, password },
      });
      set({
        user: data.user,
        isAuthenticated: true,
        isGuest: false,
        guestUsername: "",
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || "Error al registrarse." });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Logout request failed, cleaning local state anyway:", err);
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isGuest: true,
        guestUsername: "",
        error: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const data = await api<{ user: User }>("/auth/me", { method: "GET" });
      set({
        user: data.user,
        isAuthenticated: true,
        isGuest: false,
        guestUsername: "",
      });
    } catch (err) {
      // Not logged in, that's fine, we fall back to guest/unauthenticated state
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
}));
