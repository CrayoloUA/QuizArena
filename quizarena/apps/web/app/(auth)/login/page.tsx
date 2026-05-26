"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, error, clearError } = useAuth();
  
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;

    setIsLoading(true);
    setLocalError("");
    
    try {
      await login(usernameOrEmail, password);
      router.push("/");
    } catch (err: any) {
      setLocalError(err.message || "Error al iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
      <div className="crt-vignette" />

      {/* Login Terminal Box */}
      <div className="w-full max-w-md border-2 border-accent-green-dim bg-bg-card rounded shadow-block-default p-6">
        
        {/* Header Header */}
        <div className="border-b border-accent-green-dim pb-3 mb-6 font-mono text-xs text-accent-green-dim flex justify-between items-center">
          <span>[=== SECURE LOGIN ACCESS ===]</span>
          <span>SYS_VAL: AUTH_REQ</span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-display text-terminal-green uppercase">
            ACCESO SISTEMA
          </h2>
          <p className="font-mono text-xs text-text-muted mt-1">
            INGRESE SUS CREDENCIALES DE SEGURIDAD
          </p>
        </div>

        {/* Error message */}
        {(localError || error) && (
          <div className="mb-4 p-3 border border-accent-red bg-bg-primary text-accent-red font-mono text-xs rounded">
            [ERROR] {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-mono text-accent-green">
              USUARIO O EMAIL
            </label>
            <input
              type="text"
              placeholder="NICKNAME / CORREO..."
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="input-terminal"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-mono text-accent-green">
              CONTRASEÑA
            </label>
            <input
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-terminal font-mono tracking-widest"
              required
              disabled={isLoading}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              className="btn-terminal-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "PROCESANDO..." : "INGRESAR_"}
            </button>
            
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-terminal-secondary w-full"
              disabled={isLoading}
            >
              VOLVER AL MENU
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-accent-green-dim/20 text-center font-mono text-xs">
          <span className="text-text-muted">¿No tienes una cuenta? </span>
          <button
            onClick={() => router.push("/register")}
            className="text-accent-cyan hover:underline"
          >
            REGISTRAR NUEVA CUENTA
          </button>
        </div>
      </div>
    </main>
  );
}
