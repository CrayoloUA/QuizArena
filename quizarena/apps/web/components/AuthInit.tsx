"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Component to run silent session restoration on app start
 */
export function AuthInit() {
  useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  return null;
}
