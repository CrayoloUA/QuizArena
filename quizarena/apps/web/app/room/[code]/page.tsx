"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/store/gameStore";
import { sounds } from "@/lib/sounds";
import type { Player, PowerUpType } from "@quizarena/shared";

interface ChatMessage {
  username: string;
  text: string;
  timestamp: number;
}

export default function RoomPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const roomCode = params.code.toUpperCase();
  
  // Auth state
  const { guestUsername, setGuestUsername, user } = useAuth();
  const activeUsername = user?.username || guestUsername;

  // Local UI connection states
  const [tempUsername, setTempUsername] = useState("");
  const [isIdentified, setIsIdentified] = useState(!!activeUsername);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Sockets chat state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Room state from socket
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostName, setHostName] = useState("");

  // Zustand Game State
  const {
    status,
    question,
    currentQuestion,
    totalQuestions,
    timeLeft,
    scoreboard,
    hasAnswered,
    roundResult,
    correctAnswer,
    winner,
    setQuestion,
    setTimeLeft,
    setScoreboard,
    setHasAnswered,
    setRoundResult,
    setCorrectAnswer,
    setWinner,
    setStatus,
    reset: resetGameStore
  } = useGameStore();

  // Selected option state for local UI
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Initialize local audio mute state on mount
  useEffect(() => {
    setIsAudioMuted(sounds.getMute());
  }, []);

  // Handle local identification if needed
  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;
    sounds.playClick();
    setGuestUsername(tempUsername.trim());
    setIsIdentified(true);
  };

  // Main Sockets Setup
  useEffect(() => {
    if (!isIdentified || !activeUsername) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }
    setIsConnected(socket.connected);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    // Emit room:join to hook user to room channels
    socket.emit("room:join", {
      code: roomCode,
      username: activeUsername,
    });

    // 1. Listeners for Room Events
    const handleRoomUpdated = (payload: any) => {
      setPlayers(payload.players);
      setHostName(payload.host);
      setStatus(payload.status);
      setErrorMessage("");
    };

    const handleRoomError = (payload: any) => {
      setErrorMessage(payload.message || "Error de conexión con la sala.");
      sounds.playIncorrect();
    };

    const handleChatMessage = (payload: ChatMessage) => {
      setChatMessages((prev) => [...prev, payload]);
      // Short keyboard tick on incoming chat messages
      sounds.playTick();
    };

    // 2. Listeners for Game Lifecycle Events
    const handleGameQuestion = (payload: any) => {
      setSelectedOption(null);
      setQuestion(payload.question, payload.index, payload.total, payload.timeLimit);
      sounds.playClick();
    };

    const handleGameTick = (payload: any) => {
      setTimeLeft(payload.timeLeft);
      // Play low alarm warning tone when clock is running down (< 4 seconds left)
      if (payload.timeLeft > 0 && payload.timeLeft <= 3) {
        sounds.playAlarm();
      } else {
        sounds.playTick();
      }
    };

    const handleAnswerResult = (payload: any) => {
      setRoundResult({ correct: payload.correct, points: payload.points });
      setScoreboard(payload.scoreboard);
      
      // Play ascending success laser or descending buzz on submission answer result
      if (payload.correct) {
        sounds.playCorrect();
      } else {
        sounds.playIncorrect();
      }
    };

    const handleQuestionEnd = (payload: any) => {
      setCorrectAnswer(payload.correctAnswer);
      setScoreboard(payload.scoreboard);
      sounds.playClick();
    };

    const handleGameEnd = (payload: any) => {
      setWinner(payload.winner);
      setScoreboard(payload.finalScoreboard);
      setStatus("finished");
      // Play happy victory fanfare
      sounds.playVictory();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:updated", handleRoomUpdated);
    socket.on("room:error", handleRoomError);
    socket.on("chat:message", handleChatMessage);
    
    // Game Sockets
    socket.on("game:question", handleGameQuestion);
    socket.on("game:tick", handleGameTick);
    socket.on("game:answer_result", handleAnswerResult);
    socket.on("game:question_end", handleQuestionEnd);
    socket.on("game:end", handleGameEnd);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:updated", handleRoomUpdated);
      socket.off("room:error", handleRoomError);
      socket.off("chat:message", handleChatMessage);
      
      socket.off("game:question", handleGameQuestion);
      socket.off("game:tick", handleGameTick);
      socket.off("game:answer_result", handleAnswerResult);
      socket.off("game:question_end", handleQuestionEnd);
      socket.off("game:end", handleGameEnd);
    };
  }, [isIdentified, activeUsername, roomCode, setQuestion, setTimeLeft, setScoreboard, setStatus, setRoundResult, setCorrectAnswer, setWinner]);

  // Keyboard controls listener
  useEffect(() => {
    if (status !== "playing" || !question || hasAnswered || correctAnswer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Teclas A, B, C, D para responder
      if (["a", "b", "c", "d"].includes(key)) {
        const optionIdx = key.charCodeAt(0) - 97;
        const selected = question.options[optionIdx];
        if (selected) {
          sounds.playTick();
          handleSelectAnswer(selected);
        }
      }

      // Teclas 1, 2, 3 para Power-Ups
      if (["1", "2", "3"].includes(key)) {
        const powerupIdx = Number(key) - 1;
        const types: PowerUpType[] = ["freeze_timer", "double_points", "skip_question"];
        const targetType = types[powerupIdx];
        if (targetType) {
          sounds.playTick();
          handleUsePowerUp(targetType);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, question, hasAnswered, correctAnswer]);

  // Actions
  const handleSelectAnswer = (option: string) => {
    if (hasAnswered || correctAnswer) return;

    sounds.playClick();
    setSelectedOption(option);
    setHasAnswered(true);

    const socket = getSocket();
    socket.emit("game:answer", {
      questionId: question!.id,
      answer: option,
      timeLeft,
    });
  };

  const handleUsePowerUp = (type: PowerUpType) => {
    sounds.playPowerUp();
    const socket = getSocket();
    socket.emit("powerup:use", {
      code: roomCode,
      type,
    });
  };

  const handleToggleReady = () => {
    sounds.playClick();
    const socket = getSocket();
    socket.emit("room:toggle_ready", { code: roomCode });
  };

  const handleStartGame = () => {
    sounds.playClick();
    const socket = getSocket();
    socket.emit("game:start", { code: roomCode });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    sounds.playClick();
    const socket = getSocket();
    socket.emit("chat:message", {
      code: roomCode,
      text: chatInput.trim(),
    });
    setChatInput("");
  };

  const copyInviteLink = () => {
    sounds.playClick();
    const link = `${window.location.origin}/room/${roomCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleResetToHome = () => {
    sounds.playClick();
    resetGameStore();
    router.push("/");
  };

  const toggleMute = () => {
    const nextMute = !isAudioMuted;
    sounds.setMute(nextMute);
    setIsAudioMuted(nextMute);
    if (!nextMute) {
      setTimeout(() => sounds.playClick(), 50);
    }
  };

  // Check if current user is host
  const isHost = activeUsername?.toLowerCase() === hostName?.toLowerCase();
  
  // Check if all players (except host) are ready
  const allPlayersReady = players.length >= 2 && players.every(p => p.isHost || p.isReady);

  const currentUserData = players.find(p => p.username.toLowerCase() === activeUsername?.toLowerCase());

  // Render Identificate Form if not yet logged in/guest
  if (!isIdentified) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
        <div className="crt-vignette" />
        <div className="w-full max-w-md border-2 border-accent-green-dim bg-bg-card rounded shadow-block-default p-6">
          <div className="border-b border-accent-green-dim pb-3 mb-6 font-mono text-xs text-accent-green-dim flex justify-between items-center">
            <span>[=== INGRESO DE SALA ===]</span>
            <span>CODE: {roomCode}</span>
          </div>

          <form onSubmit={handleIdentify} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-accent-green">
                ESTÁS INTENTANDO ENTRAR A LA SALA {roomCode}.
                INGRESE UN APODO PARA CONECTARSE:
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="NICKNAME..."
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                className="input-terminal text-center uppercase font-bold"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn-terminal-primary w-full">
              UNIRSE AL LOBBY_
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="btn-terminal-secondary w-full text-xs py-2"
            >
              VOLVER AL MENU
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Render Error Room Page
  if (errorMessage) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-terminal-grid crt-effect relative">
        <div className="crt-vignette" />
        <div className="w-full max-w-md border-2 border-accent-red bg-bg-card rounded shadow-block-default p-6 text-center space-y-6">
          <h2 className="text-3xl font-display text-accent-red">
            ERROR DE CONEXION
          </h2>
          <div className="p-3 border border-accent-red bg-bg-primary text-accent-red font-mono text-sm rounded">
            {errorMessage}
          </div>
          <button
            onClick={handleResetToHome}
            className="btn-terminal-amber w-full"
          >
            VOLVER AL MENU PRINCIPAL
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // PHASE 1: LOBBY WAIT (status === "waiting")
  // ==========================================
  if (status === "waiting") {
    return (
      <main className="flex-1 flex flex-col p-4 sm:p-6 bg-terminal-grid crt-effect relative min-h-dvh">
        <div className="crt-vignette" />
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col gap-4">
          
          {/* Header bar */}
          <div className="border-2 border-accent-green-dim bg-bg-card rounded p-4 font-mono text-xs flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-4">
              <span className="text-accent-green">[SALA: {roomCode}]</span>
              <span className="text-text-muted">|</span>
              <span className="text-accent-cyan">CATEGORIA: {players.length > 0 ? "RANDOM" : "CARGANDO..."}</span>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <button 
                onClick={toggleMute}
                className="hover:text-accent-green font-bold focus:outline-none"
              >
                {isAudioMuted ? "[ AUDIO: MUTE ]" : "[ AUDIO: ACTIVO ]"}
              </button>
              
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-accent-green" : "bg-accent-red animate-pulse"}`}></span>
                <span className={isConnected ? "text-accent-green" : "text-accent-red"}>
                  {isConnected ? "SINK_OK" : "RECONECTANDO..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Lobby List and Players */}
            <div className="md:col-span-2 border-2 border-accent-green-dim bg-bg-card rounded p-4 sm:p-6 flex flex-col justify-between shadow-block-default">
              <div className="space-y-6 w-full">
                <div className="border-b border-accent-green-dim/20 pb-3 flex justify-between items-center">
                  <h2 className="text-2xl font-display text-terminal-green uppercase">
                    LOBBY DE ESPERA ({players.length} JUGADORES)
                  </h2>
                  <button
                    onClick={copyInviteLink}
                    className="text-xs text-accent-cyan hover:underline font-mono border border-accent-cyan/30 px-2 py-1 rounded bg-bg-primary"
                  >
                    {copied ? "[ COPIADO OK ]" : "[ COPIAR LINK ]"}
                  </button>
                </div>

                <div className="font-mono text-sm w-full overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-accent-green-dim text-accent-green text-left">
                        <th className="pb-2 font-bold font-mono">JUGADOR</th>
                        <th className="pb-2 font-bold text-center font-mono">TIPO</th>
                        <th className="pb-2 font-bold text-right font-mono">ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-text-muted font-mono">
                            CONECTANDO CON EL SERVIDOR...
                          </td>
                        </tr>
                      ) : (
                        players.map((p) => {
                          const isMe = p.username.toLowerCase() === activeUsername.toLowerCase();
                          return (
                            <tr key={p.id} className={`border-b border-accent-green-dim/10 ${isMe ? "bg-accent-green/5 text-accent-green" : "text-text-primary"}`}>
                              <td className="py-3 pr-2 flex items-center gap-2">
                                {p.isHost ? (
                                  <span className="text-accent-amber font-bold text-xs border border-accent-amber px-1 rounded bg-accent-amber/5">
                                    HOST
                                  </span>
                                ) : (
                                  <span className="text-text-muted text-xs border border-text-muted/30 px-1 rounded">
                                    PLR
                                  </span>
                                )}
                                <span className="font-bold">{p.username.toUpperCase()}</span>
                                {isMe && <span className="text-xs text-text-muted">(TU)</span>}
                              </td>
                              <td className="py-3 text-center text-xs text-text-muted">
                                {p.isGuest ? "INVITADO" : "REGISTRADO"}
                              </td>
                              <td className="py-3 text-right">
                                {p.isHost ? (
                                  <span className="text-accent-green font-bold">[ ANFITRION ]</span>
                                ) : p.isReady ? (
                                  <span className="text-accent-green font-bold">[ LISTO ]</span>
                                ) : (
                                  <span className="text-accent-amber font-mono">[ WAITING ]</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lobby Actions */}
              <div className="mt-8 pt-4 border-t border-accent-green-dim/20 flex flex-col sm:flex-row gap-3">
                {isHost ? (
                  <button
                    onClick={handleStartGame}
                    disabled={!allPlayersReady}
                    className="btn-terminal-primary flex-1 font-bold"
                  >
                    {allPlayersReady
                      ? "EMPEZAR PARTIDA_"
                      : "ESPERANDO QUE TODOS ESTEN LISTOS (MIN 2)"}
                  </button>
                ) : (
                  <button
                    onClick={handleToggleReady}
                    className={`btn-terminal-primary flex-1 font-bold ${currentUserData?.isReady ? "btn-terminal-amber" : ""}`}
                  >
                    {currentUserData?.isReady ? "CANCELAR LISTO_" : "ESTOY LISTO_"}
                  </button>
                )}

                <button
                  onClick={() => {
                    const socket = getSocket();
                    socket.emit("room:leave", { code: roomCode });
                    handleResetToHome();
                  }}
                  className="btn-terminal-secondary sm:w-1/3"
                >
                  SALIR
                </button>
              </div>

            </div>

            {/* Chat Lobby */}
            <div className="border-2 border-accent-green-dim bg-bg-card rounded p-4 flex flex-col justify-between shadow-block-default h-[400px] md:h-auto">
              <div className="flex flex-col flex-1 min-h-0">
                <div className="border-b border-accent-green-dim/20 pb-2 mb-3">
                  <h3 className="font-display text-lg text-terminal-green uppercase">
                    IRC CHAT ROOM // {roomCode}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2 pr-2 mb-3">
                  <div className="text-text-muted font-mono">*** CANAL DE CHAT ACTIVO ***</div>
                  {chatMessages.map((msg, index) => {
                    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isSystem = msg.username === "System";
                    if (isSystem) return <div key={index} className="text-accent-cyan">*** {msg.text} ***</div>;
                    const isMe = msg.username.toLowerCase() === activeUsername.toLowerCase();
                    return (
                      <div key={index} className="break-all">
                        <span className="text-text-muted">[{time}] </span>
                        <span className={isMe ? "text-accent-green font-bold" : "text-accent-amber font-bold"}>
                          &lt;{msg.username.toUpperCase()}&gt;
                        </span>{" "}
                        <span className="text-text-primary">{msg.text}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2 border-t border-accent-green-dim/20 pt-3">
                <input
                  type="text"
                  placeholder="ESCRIBE UN MENSAJE..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="input-terminal text-xs flex-1 animate-none"
                  maxLength={100}
                  required
                />
                <button type="submit" className="btn-terminal-primary text-xs px-3 py-2 min-h-0">
                  ENV_
                </button>
              </form>
            </div>

          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // PHASE 2: GAME ACTIVE (status === "playing")
  // ==========================================
  if (status === "playing") {
    // Generate simple time visual bar
    const barsCount = Math.max(0, Math.min(15, timeLeft));
    const emptyBarsCount = 15 - barsCount;
    const timeBar = `[${"=".repeat(barsCount)}${"-".repeat(emptyBarsCount)}]`;
    
    // Choose color alert level for timer
    const timeColorClass = timeLeft > 8 
      ? "text-accent-green" 
      : timeLeft > 4 
        ? "text-accent-amber" 
        : "text-accent-red animate-pulse";

    return (
      <main className="flex-1 flex flex-col p-4 sm:p-6 bg-terminal-grid crt-effect relative min-h-dvh">
        <div className="crt-vignette" />
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col gap-4">
          
          {/* Top Status Header */}
          <div className="border-2 border-accent-green-dim bg-bg-card rounded p-4 font-mono text-xs flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-4">
              <span className="text-accent-green font-mono">[MATCH EN CURSO: {roomCode}]</span>
              <span className="text-text-muted">|</span>
              <span className="text-accent-cyan font-mono">PREGUNTA: [{currentQuestion}/{totalQuestions}]</span>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              <button 
                onClick={toggleMute}
                className="hover:text-accent-green font-bold focus:outline-none font-mono"
              >
                {isAudioMuted ? "[ AUDIO: MUTE ]" : "[ AUDIO: ACTIVO ]"}
              </button>

              <div className="flex items-center gap-2">
                <span className="text-text-muted hidden sm:inline font-mono">RELOJ:</span>
                <span className={`font-bold font-mono tracking-wider ${timeColorClass}`}>
                  {timeBar} {timeLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Main layout */}
          <div className="flex-1 flex flex-col md:grid md:grid-cols-3 gap-4">
            
            {/* Left Col: Main Board (Question or round results) */}
            <div className="md:col-span-2 border-2 border-accent-green-dim bg-bg-card rounded p-4 sm:p-6 flex flex-col justify-between shadow-block-default flex-1">
              
              {!correctAnswer ? (
                /* Question count down stage */
                <div className="flex-1 flex flex-col justify-between w-full">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-xs font-mono text-text-muted border-b border-accent-green-dim/15 pb-2">
                      <span>DIFICULTAD: {question?.difficulty.toUpperCase()}</span>
                      <span>CATEGORÍA: {question?.category.toUpperCase()}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold font-mono text-text-primary leading-relaxed break-words">
                      &gt; {question?.text}
                    </h2>
                  </div>

                  {/* Options layout */}
                  <div className="mt-6 grid grid-cols-1 gap-3">
                    {question?.options.map((option, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isSelected = selectedOption === option;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(option)}
                          disabled={hasAnswered}
                          className={`w-full text-left font-mono p-3 border-2 rounded transition-all duration-100 flex justify-between items-center cursor-pointer ${
                            isSelected 
                              ? "bg-accent-green text-bg-primary border-accent-green font-bold"
                              : hasAnswered
                                ? "border-accent-green-dim/20 text-text-muted cursor-not-allowed"
                                : "border-accent-green-dim hover:border-accent-green text-text-primary bg-bg-primary/30 hover:bg-accent-green/5"
                          }`}
                        >
                          <span className="font-mono text-sm">[{letter}] {option}</span>
                          {!hasAnswered && (
                            <span className="text-[10px] text-accent-green-dim border border-accent-green-dim/30 px-1 rounded opacity-60 hidden sm:inline font-mono">
                              TECLA {letter}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit state check */}
                  <div className="mt-6 pt-4 border-t border-accent-green-dim/10 text-center font-mono text-xs text-text-muted">
                    {hasAnswered ? (
                      <span className="text-accent-green animate-pulse font-mono">
                        [✓] RESPUESTA TRANSMITIDA. ESPERANDO A LOS DEMÁS JUGADORES...
                      </span>
                    ) : (
                      <span className="font-mono">* TECLADO O CLICK PARA SELECCIONAR OPCION</span>
                    )}
                  </div>
                </div>
              ) : (
                /* Round Reveal results stage */
                <div className="flex-1 flex flex-col justify-between w-full animate-[terminal-slide_0.2s_ease-out]">
                  <div className="space-y-6">
                    <div className="border-b border-accent-green-dim/20 pb-3 flex justify-between items-center text-xs font-mono">
                      <span className="text-accent-amber font-mono">[SISTEMA: TIEMPO AGOTADO]</span>
                      <span className="text-accent-cyan font-mono">PREGUNTA RESUELTA</span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-mono text-text-muted">ENUNCIADO:</div>
                      <h3 className="text-lg font-mono text-text-primary break-words">&gt; {question?.text}</h3>
                    </div>

                    <div className="p-4 border-2 border-accent-green bg-accent-green/5 rounded font-mono text-center space-y-2">
                      <div className="text-xs text-accent-green font-bold uppercase font-mono">RESPUESTA CORRECTA:</div>
                      <div className="text-xl sm:text-2xl text-accent-green font-bold tracking-wider font-mono">{correctAnswer.toUpperCase()}</div>
                    </div>

                    {/* Result checking for local user */}
                    <div className="p-3 border rounded text-sm font-mono text-center">
                      {roundResult ? (
                        roundResult.correct ? (
                          <div className="text-accent-green font-bold font-mono">
                            [+] ¡EXCELENTE! RESPUESTA CORRECTA. OBTUVISTE {roundResult.points} PUNTOS.
                          </div>
                        ) : (
                          <div className="text-accent-red font-bold font-mono">
                            [-] INCORRECTO. FALLASTE ESTA PREGUNTA. (0 PUNTOS)
                          </div>
                        )
                      ) : (
                        <div className="text-accent-amber font-mono">
                          [-] NO RESPONDISTE A TIEMPO. (0 PUNTOS)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-accent-green-dim/20 text-center font-mono text-xs text-accent-cyan animate-pulse">
                    &gt;&gt; EL SISTEMA CARGARÁ LA SIGUIENTE PREGUNTA EN BREVE...
                  </div>
                </div>
              )}

            </div>

            {/* Right Col: Powerups Panel + Scoreboard */}
            <div className="space-y-4 flex flex-col md:w-auto">
              
              {/* Powerups Widget */}
              <div className="border-2 border-accent-green-dim bg-bg-card rounded p-4 shadow-block-default font-mono">
                <div className="border-b border-accent-green-dim/20 pb-2 mb-3 text-xs font-bold text-accent-green flex justify-between">
                  <span className="font-mono">SISTEMA POWER-UPS [TECLAS]</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {(["freeze_timer", "double_points", "skip_question"] as PowerUpType[]).map((type, idx) => {
                    const available = currentUserData?.powerUps[type];
                    const label = type === "freeze_timer" 
                      ? "CONGELAR" 
                      : type === "double_points" 
                        ? "DOBLE_PTS" 
                        : "SALTAR";
                    
                    const desc = type === "freeze_timer"
                      ? "+5 Seg"
                      : type === "double_points"
                        ? "Puntos x2"
                        : "Auto Correcta";

                    const keyLabel = idx + 1;
                    const disabled = !available || hasAnswered || !!correctAnswer;

                    return (
                      <button
                        key={type}
                        onClick={() => handleUsePowerUp(type)}
                        disabled={disabled}
                        className={`p-2 border rounded font-mono text-center transition-all duration-100 flex flex-col justify-between items-center cursor-pointer ${
                          available 
                            ? disabled
                              ? "border-accent-green-dim/30 text-text-muted cursor-not-allowed opacity-50 bg-bg-primary/20"
                              : "border-accent-amber text-accent-amber hover:bg-accent-amber/5 active:scale-95"
                            : "border-text-muted/20 text-text-muted cursor-not-allowed bg-bg-primary/10 opacity-30"
                        }`}
                      >
                        <span className="text-[9px] text-text-muted font-bold font-mono">[{keyLabel}]</span>
                        <span className="text-[10px] font-bold tracking-wider font-mono">{label}</span>
                        <span className="text-[8px] opacity-70 mt-1 font-mono">{desc}</span>
                        <span className="text-[8px] font-bold mt-1 text-center font-mono">
                          {available ? "[ON]" : "[OFF]"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sidebar score leaderboard */}
              <div className="border-2 border-accent-green-dim bg-bg-card rounded p-4 shadow-block-default flex-1 flex flex-col justify-between h-[250px] md:h-auto">
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="border-b border-accent-green-dim/20 pb-2 mb-3">
                    <h3 className="font-display text-lg text-terminal-green uppercase">
                      RANKING PARCIAL DE SISTEMA
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2">
                    {scoreboard.length === 0 ? (
                      <div className="text-text-muted font-mono">ESPERANDO DATOS DE RONDA...</div>
                    ) : (
                      scoreboard.map((entry, idx) => {
                        const isMe = entry.username.toLowerCase() === activeUsername.toLowerCase();
                        return (
                          <div key={idx} className={`flex justify-between items-center p-1 rounded font-mono ${isMe ? "bg-accent-green/5 text-accent-green font-bold" : "text-text-primary"}`}>
                            <span>
                              {entry.rank}. {entry.username.toUpperCase()}
                            </span>
                            <span>{entry.score} PTS</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="border-t border-accent-green-dim/15 pt-3 font-mono text-[9px] text-text-muted text-center flex justify-between">
                  <span>PREG_KEY: {question?.id.slice(0, 8)}</span>
                  <span>SYNC_RECV: OK</span>
                </div>

              </div>

            </div>

          </div>

        </div>
      </main>
    );
  }

  // ==========================================
  // PHASE 3: GAME FINISHED (status === "finished")
  // ==========================================
  if (status === "finished") {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-terminal-grid crt-effect relative min-h-dvh">
        <div className="crt-vignette" />

        <div className="w-full max-w-2xl border-2 border-accent-green bg-bg-card rounded shadow-block-green p-6 md:p-8 flex flex-col justify-between space-y-8 animate-[terminal-slide_0.3s_ease-out]">
          
          <div className="border-b border-accent-green pb-3 font-mono text-xs text-accent-green flex justify-between items-center">
            <span>[=== MATCH TERMINAL CONCLUIDO ===]</span>
            <span>SYS_VAL: MATCH_FINISHED</span>
          </div>

          <div className="text-center font-mono space-y-4">
            <h2 className="terminal-title text-terminal-green">VICTORIA</h2>
            
            <div className="border-2 border-accent-amber bg-bg-primary/50 max-w-sm mx-auto p-4 rounded text-center space-y-2">
              <div className="text-accent-amber text-xs font-bold uppercase tracking-[0.2em] font-mono">[ 1ST PLACE WINNER ]</div>
              <div className="text-2xl sm:text-3xl text-accent-amber font-display font-bold tracking-widest uppercase">
                &gt;&gt; {winner.toUpperCase()} &lt;&lt;
              </div>
              <div className="text-xs text-text-muted font-mono">
                CONEXION CERRADA CON LA SALA. RESULTADOS PERSISTIDOS.
              </div>
            </div>
          </div>

          <div className="space-y-3 font-mono w-full max-w-md mx-auto">
            <h3 className="text-sm font-bold text-accent-green border-b border-accent-green/20 pb-1 font-mono">
              MARCADOR GENERAL FINAL:
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {scoreboard.map((entry, idx) => {
                const isWinner = entry.rank === 1;
                const isMe = entry.username.toLowerCase() === activeUsername.toLowerCase();
                return (
                  <div key={idx} className={`flex justify-between items-center p-2 border font-mono ${
                    isWinner 
                      ? "border-accent-amber text-accent-amber bg-accent-amber/5 font-bold" 
                      : isMe 
                        ? "border-accent-green text-accent-green bg-accent-green/5 font-bold"
                        : "border-accent-green-dim/20 text-text-primary"
                  } rounded text-sm`}>
                    <span className="flex gap-2 font-mono">
                      <span>{entry.rank}.</span>
                      <span>{entry.username.toUpperCase()}</span>
                      {isMe && <span className="text-[10px] text-text-muted font-normal font-mono">(TU)</span>}
                    </span>
                    <span className="font-mono">{entry.score} PUNTOS</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-accent-green/20 flex gap-4 w-full">
            <button
              onClick={handleResetToHome}
              className="btn-terminal-primary w-full text-base font-bold py-3 uppercase tracking-wider cursor-pointer"
            >
              REBOOT SYSTEM / MENÚ PRINCIPAL_
            </button>
          </div>

        </div>
      </main>
    );
  }

  return null;
}
