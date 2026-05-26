"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getSocket } from "@/lib/socket";
import { sounds } from "@/lib/sounds";

export default function HomePage() {
  const router = useRouter();
  
  // Zustand auth
  const { guestUsername, setGuestUsername, isAuthenticated, user } = useAuthStore();
  
  // Local UI states
  const [usernameInput, setUsernameInput] = useState("");
  const [menuSelection, setMenuSelection] = useState<"main" | "create" | "join">("main");
  const [joinCode, setJoinCode] = useState("");
  const [category, setCategory] = useState("General");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const activeUsername = user?.username || guestUsername;

  // Initialize local audio mute state on mount
  useEffect(() => {
    setIsAudioMuted(sounds.getMute());
  }, []);

  // Listen to socket room events
  useEffect(() => {
    const socket = getSocket();

    const handleRoomCreated = ({ code }: { code: string }) => {
      setIsLoading(false);
      sounds.playCorrect();
      router.push(`/room/${code}`);
    };

    const handleRoomError = ({ message }: { message: string }) => {
      setIsLoading(false);
      sounds.playIncorrect();
      setErrorMessage(`[ERROR] ${message}`);
    };

    socket.on("room:created", handleRoomCreated);
    socket.on("room:error", handleRoomError);

    return () => {
      socket.off("room:created", handleRoomCreated);
      socket.off("room:error", handleRoomError);
    };
  }, [router]);

  // Connect socket and handle login
  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    
    sounds.playClick();
    setErrorMessage("");
    setGuestUsername(usernameInput.trim());
    
    // Connect socket on interaction
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
  };

  const handleCreateRoom = () => {
    if (!activeUsername) return;
    
    sounds.playClick();
    setIsLoading(true);
    setErrorMessage("");
    
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("room:create", {
      username: activeUsername,
      category,
      maxPlayers,
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || joinCode.length < 6 || !activeUsername) return;

    sounds.playClick();
    setIsLoading(true);
    setErrorMessage("");

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    router.push(`/room/${joinCode.toUpperCase()}`);
  };

  const handleLogout = () => {
    sounds.playClick();
    const { logout } = useAuthStore.getState();
    logout();
    setMenuSelection("main");
    setErrorMessage("");
    const socket = getSocket();
    if (socket.connected) {
      socket.disconnect();
    }
  };

  const handleMenuSwitch = (target: "main" | "create" | "join") => {
    sounds.playClick();
    setMenuSelection(target);
  };

  const handleNavigation = (path: string) => {
    sounds.playClick();
    router.push(path);
  };

  const toggleMute = () => {
    const nextMute = !isAudioMuted;
    sounds.setMute(nextMute);
    setIsAudioMuted(nextMute);
    // Play a test tone if unmuting to confirm
    if (!nextMute) {
      setTimeout(() => sounds.playClick(), 50);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
      <div className="crt-vignette" />

      {/* Main Terminal Window */}
      <div className="w-full max-w-2xl border-2 border-accent-green-dim bg-bg-card rounded shadow-block-default p-6 md:p-8">
        
        {/* Header Header */}
        <div className="border-b border-accent-green-dim pb-4 mb-6 font-mono text-xs text-accent-green-dim flex justify-between items-center">
          <span>[=== QUIZARENA CORE v1.0.0 ===]</span>
          <button 
            onClick={toggleMute}
            className="hover:text-accent-green font-bold focus:outline-none"
          >
            {isAudioMuted ? "[ AUDIO: SILENCIADO ]" : "[ AUDIO: ACTIVO ]"}
          </button>
        </div>

        {/* Title Logo */}
        <div className="text-center mb-8">
          <h1 className="terminal-title text-terminal-green">
            QUIZARENA
          </h1>
          <p className="font-mono text-xs text-accent-green-dim mt-1">
            MULTIPLAYER TRIVIA TERMINAL SYSTEM
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-6 p-3 border border-accent-red bg-bg-primary text-accent-red font-mono text-sm rounded">
            {errorMessage}
          </div>
        )}

        {/* Flow 1: Identification (Username prompt) */}
        {!activeUsername ? (
          <form onSubmit={handleIdentify} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-accent-green font-mono">
                [!] ACCESO REQUERIDO: INGRESE UN APODO PARA ENTRAR
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <span className="text-accent-green hidden sm:inline self-center font-mono text-lg">&gt;</span>
                <input
                  type="text"
                  placeholder="NICKNAME..."
                  maxLength={15}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                  className="input-terminal text-center sm:text-left tracking-wider uppercase font-bold"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn-terminal-primary shrink-0"
                >
                  ACCEDER_
                </button>
              </div>
              <p className="text-xs text-text-muted font-mono">
                * Solo caracteres alfanuméricos y guion bajo (_). Máximo 15 caracteres.
              </p>
            </div>

            <div className="pt-4 border-t border-accent-green-dim/20 text-center">
              <button
                type="button"
                onClick={() => handleNavigation("/login")}
                className="text-xs text-accent-cyan hover:underline font-mono"
              >
                [ ACCEDER CON CUENTA REGISTRADA ]
              </button>
            </div>
          </form>
        ) : (
          /* Flow 2: Authenticated / Guest Terminal Menu */
          <div className="space-y-6">
            
            {/* User status */}
            <div className="p-3 border border-accent-green-dim bg-bg-primary/50 text-xs font-mono text-accent-green flex justify-between items-center rounded">
              <span>USUARIO ACTIVO: {activeUsername.toUpperCase()}</span>
              <span>ROL: {isAuthenticated ? "REGISTRADO" : "INVITADO"}</span>
            </div>

            {/* Menu options selection */}
            {menuSelection === "main" && (
              <div className="space-y-4">
                <div className="text-sm text-accent-green font-mono mb-2">
                  SELECCIONE UNA ACCION:
                </div>
                
                <button
                  onClick={() => handleMenuSwitch("create")}
                  className="w-full btn-terminal-secondary justify-start text-left font-mono"
                >
                  [1] CREAR NUEVA SALA DE TRIVIA
                </button>
                
                <button
                  onClick={() => handleMenuSwitch("join")}
                  className="w-full btn-terminal-secondary justify-start text-left font-mono"
                >
                  [2] UNIRSE A SALA EXISTENTE
                </button>

                <button
                  onClick={() => handleNavigation("/history")}
                  className="w-full btn-terminal-secondary justify-start text-left font-mono"
                >
                  [3] HISTORIAL DE MATCHES / RANKING
                </button>

                <div className="pt-4 border-t border-accent-green-dim/20 flex flex-wrap justify-between gap-4">
                  {!isAuthenticated && (
                    <button
                      onClick={() => handleNavigation("/login")}
                      className="text-xs text-accent-cyan hover:underline font-mono"
                    >
                      [ GUARDAR PROGRESO / LOG IN ]
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-xs text-accent-red hover:underline font-mono ml-auto"
                  >
                    [ CERRAR SESION ]
                  </button>
                </div>
              </div>
            )}

            {/* Sub-menu: Create Room */}
            {menuSelection === "create" && (
              <div className="space-y-4 animate-[terminal-slide_0.2s_ease-out]">
                <div className="text-sm text-accent-green font-mono mb-2">
                  CONFIGURAR NUEVA SALA DE TRIVIA:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-text-muted">
                      CATEGORIA
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-terminal w-full cursor-pointer bg-bg-card font-mono text-sm"
                    >
                      <option value="General">Random / General</option>
                      <option value="Science">Ciencia & Naturaleza</option>
                      <option value="History">Historia</option>
                      <option value="Geography">Geografía</option>
                      <option value="Entertainment">Entretenimiento & Cine</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-text-muted">
                      MAXIMO JUGADORES
                    </label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="input-terminal w-full cursor-pointer bg-bg-card font-mono text-sm"
                    >
                      <option value={2}>2 Jugadores</option>
                      <option value={4}>4 Jugadores</option>
                      <option value={8}>8 Jugadores</option>
                      <option value={12}>12 Jugadores</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    onClick={() => handleMenuSwitch("main")}
                    className="btn-terminal-secondary flex-1"
                    disabled={isLoading}
                  >
                    ATRÁS
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    className="btn-terminal-primary flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "CREANDO..." : "INICIALIZAR SALA_"}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-menu: Join Room */}
            {menuSelection === "join" && (
              <form onSubmit={handleJoinRoom} className="space-y-4 animate-[terminal-slide_0.2s_ease-out]">
                <div className="text-sm text-accent-green font-mono mb-2">
                  UNIRSE A SALA DE JUEGO:
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-text-muted">
                    INGRESE EL CÓDIGO DE 6 CARACTERES
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="input-terminal text-center text-xl tracking-[0.4em] font-bold"
                    autoFocus
                    required
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleMenuSwitch("main")}
                    className="btn-terminal-secondary flex-1"
                    disabled={isLoading}
                  >
                    ATRÁS
                  </button>
                  <button
                    type="submit"
                    className="btn-terminal-primary flex-1"
                    disabled={isLoading || joinCode.length < 6}
                  >
                    {isLoading ? "CONECTANDO..." : "CONECTAR A SALA_"}
                  </button>
                </div>
              </form>
            )}

          </div>
        )}
      </div>

      {/* Feature logs (Replacing the old feature grid cards) */}
      <div className="w-full max-w-2xl mt-8 font-mono text-xs text-text-muted space-y-1">
        <div>[LOG] SYSTEM: INICIALIZADO CORRECTAMENTE.</div>
        <div>[LOG] WEBSOCKET_SERVICE: CONECTANDO CON EL BACKEND EN EL PUERTO 3001.</div>
        <div>[LOG] ESTADO_VISUAL: RETRO CONSOLA HABILITADO. SIN EMOJIS DETECTADOS.</div>
      </div>
    </main>
  );
}
