"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { sounds } from "@/lib/sounds";

interface HistoryEntry {
  matchId: string;
  roomCode: string;
  category: string;
  score: number;
  rank: number;
  totalPlayers: number;
  createdAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, isCheckingAuth } = useAuth();
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch match history on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const data = await api<{ history: HistoryEntry[] }>("/history");
        setHistory(data.history);
      } catch (err: any) {
        setError(err.message || "Error al leer del disco de historial.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated]);

  const handleBack = () => {
    sounds.playClick();
    router.push("/");
  };

  const handleLogin = () => {
    sounds.playClick();
    router.push("/login");
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
      <div className="crt-vignette" />

      {/* Terminal Board Container */}
      <div className="w-full max-w-2xl border-2 border-accent-green-dim bg-bg-card rounded shadow-block-default p-6 md:p-8">
        
        {/* Header Header */}
        <div className="border-b border-accent-green-dim pb-3 mb-6 font-mono text-xs text-accent-green-dim flex justify-between items-center">
          <span>[=== HISTORIAL DE ACCESOS LOG v1.0 ===]</span>
          <span>SYS_DISK: MOUNTED</span>
        </div>

        {/* Title logo */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-display text-terminal-green uppercase">
            REGISTRO DE PARTIDAS
          </h2>
          <p className="font-mono text-xs text-text-muted mt-1">
            LECTURA DEL REGISTRO DE TRIVIA INDIVIDUAL
          </p>
        </div>

        {/* Flow 1: Loading state */}
        {isLoading || isCheckingAuth ? (
          <div className="py-12 text-center font-mono text-accent-green animate-pulse">
            &gt; CONECTANDO AL DISCO LOCAL... LEYENDO SECTORES...
          </div>
        ) : !isAuthenticated ? (
          /* Flow 2: Access denied (Guest or unauthenticated) */
          <div className="space-y-6 text-center py-6">
            <div className="p-4 border border-accent-amber bg-bg-primary text-accent-amber font-mono text-sm rounded max-w-md mx-auto space-y-2">
              <div className="font-bold">[ ACCESO DENEGADO: DISCO NO MONTADO ]</div>
              <p className="text-xs opacity-85">
                EL MÓDULO DE PERSISTENCIA REQUIERE UNA IDENTIDAD REGISTRADA PARA ARCHIVAR LOS RESULTADOS.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <button onClick={handleLogin} className="btn-terminal-primary w-full">
                INICIAR SESIÓN_
              </button>
              <button onClick={handleBack} className="btn-terminal-secondary w-full">
                VOLVER AL MENU
              </button>
            </div>
          </div>
        ) : error ? (
          /* Flow 3: Error loading */
          <div className="space-y-6 text-center">
            <div className="p-4 border border-accent-red bg-bg-primary text-accent-red font-mono text-sm rounded">
              [CRITICAL ERROR] {error}
            </div>
            <button onClick={handleBack} className="btn-terminal-amber max-w-xs mx-auto w-full">
              REINICIAR SISTEMA
            </button>
          </div>
        ) : history.length === 0 ? (
          /* Flow 4: History Empty */
          <div className="space-y-6 text-center py-8">
            <div className="font-mono text-accent-amber text-sm max-w-md mx-auto space-y-2">
              <div>[ DISCO DE PARTIDAS VACÍO ]</div>
              <p className="text-xs text-text-muted">
                NO SE ENCONTRARON EVENTOS ARCHIVADOS. ¡JUEGA TU PRIMERA PARTIDA REGISTRADO PARA GRABAR LOS LOGS!
              </p>
            </div>
            
            <button onClick={handleBack} className="btn-terminal-secondary max-w-xs mx-auto w-full">
              VOLVER AL MENU PRINCIPAL
            </button>
          </div>
        ) : (
          /* Flow 5: History Entries list */
          <div className="space-y-6">
            
            <div className="max-h-[350px] overflow-y-auto pr-1 space-y-4">
              {history.map((entry, idx) => {
                const date = new Date(entry.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                
                const isWinner = entry.rank === 1;

                return (
                  <div 
                    key={entry.matchId}
                    className={`border-2 font-mono p-4 rounded bg-bg-primary/30 transition-all duration-100 flex flex-col justify-between gap-2 ${
                      isWinner 
                        ? "border-accent-amber/40 hover:border-accent-amber hover:shadow-[2px_2px_0px_#ffb000]"
                        : "border-accent-green-dim/30 hover:border-accent-green hover:shadow-block-green"
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="border-b border-accent-green-dim/10 pb-2 flex flex-wrap justify-between items-center text-xs gap-2">
                      <span className="text-accent-green">[LOG #00{history.length - idx}]</span>
                      <span className="text-text-muted">{date}</span>
                    </div>

                    {/* Entry Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-muted">CATEGORÍA:</span>{" "}
                        <span className="text-text-primary font-bold">{entry.category.toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">SALA:</span>{" "}
                        <span className="text-accent-cyan font-bold">{entry.roomCode}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">PUNTOS:</span>{" "}
                        <span className="text-accent-green font-bold">{entry.score.toLocaleString()} PTS</span>
                      </div>
                      <div>
                        <span className="text-text-muted">POSICIÓN:</span>{" "}
                        <span className={isWinner ? "text-accent-amber font-bold" : "text-text-primary font-bold"}>
                          {entry.rank}º LUGAR <span className="text-[10px] text-text-muted font-normal">DE {entry.totalPlayers} JUGADORES</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={handleBack} className="btn-terminal-primary w-full">
              VOLVER AL MENU PRINCIPAL_
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
