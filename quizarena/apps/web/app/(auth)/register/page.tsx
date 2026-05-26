"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, error, clearError } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
    if (!username || !email || !password) return;

    if (username.length < 3 || username.length > 15) {
      setLocalError("El apodo debe tener entre 3 y 15 caracteres.");
      return;
    }

    setIsLoading(true);
    setLocalError("");

    try {
      await register(username.replace(/[^a-zA-Z0-9_]/g, ""), email, password);
      router.push("/");
    } catch (err: any) {
      setLocalError(err.message || "Error al crear cuenta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
      <div className="crt-vignette" />

      {/* Register Terminal Box */}
      <div className="w-full max-w-md border-2 border-accent-green-dim bg-bg-card rounded shadow-block-default p-6">
        
        {/* Header Header */}
        <div className="border-b border-accent-green-dim pb-3 mb-6 font-mono text-xs text-accent-green-dim flex justify-between items-center">
          <span>[=== CREATE SYSTEM IDENTITY ===]</span>
          <span>SYS_VAL: NEW_USER</span>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-display text-terminal-green uppercase">
            REGISTRO DE USUARIO
          </h2>
          <p className="font-mono text-xs text-text-muted mt-1">
            CREE SU NUEVA FIRMA DE SEGURIDAD EN RED
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
              APODO / NICKNAME
            </label>
            <input
              type="text"
              placeholder="NICKNAME..."
              maxLength={15}
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              className="input-terminal uppercase"
              required
              disabled={isLoading}
              autoFocus
            />
            <p className="text-[10px] text-text-muted font-mono">
              * Caracteres alfanuméricos y guion bajo (_).
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-mono text-accent-green">
              CORREO ELECTRONICO
            </label>
            <input
              type="email"
              placeholder="CORREO@EJEMPLO.COM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-terminal"
              required
              disabled={isLoading}
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
              {isLoading ? "REGISTRANDO..." : "CREAR CUENTA_"}
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
          <span className="text-text-muted">¿Ya tienes una cuenta? </span>
          <button
            onClick={() => router.push("/login")}
            className="text-accent-cyan hover:underline"
          >
            INICIAR SESIÓN
          </button>
        </div>
      </div>
    </main>
  );
}
