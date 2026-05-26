"use client";

// useAuth hook — provides auth state and actions from the Zustand store
// TODO: Implement in Etapa 2

import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const store = useAuthStore();
  
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isGuest: store.isGuest,
    guestUsername: store.guestUsername,
    isCheckingAuth: store.isCheckingAuth,
    error: store.error,
    login: store.login,
    register: store.register,
    logout: store.logout,
    checkAuth: store.checkAuth,
    clearError: store.clearError,
    setGuestUsername: store.setGuestUsername,
  };
}
