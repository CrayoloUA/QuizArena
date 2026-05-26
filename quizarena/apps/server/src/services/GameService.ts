import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, Question, ScoreEntry, PowerUpType } from "@quizarena/shared";
import { roomService } from "./RoomService";
import { questionService } from "./QuestionService";
import { prisma } from "../prisma";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;

interface ActiveGame {
  roomCode: string;
  questions: (Question & { correctAnswer: string })[];
  currentQuestionIndex: number;
  timeLeft: number;
  timerInterval: NodeJS.Timeout | null;
  playersAnswers: Map<string, { answer: string; timeTaken: number; doubled: boolean }>; // socketId -> data
  playersDoublePointsThisRound: Set<string>; // socketId set
  hasUsedPowerUpThisQuestion: Set<string>; // socketId set
}

export class GameService {
  private activeGames: Map<string, ActiveGame> = new Map();

  /**
   * Start a new game room
   */
  public async startGame(roomCode: string, io: IOServer): Promise<void> {
    const formattedCode = roomCode.toUpperCase();
    const room = roomService.getRoom(formattedCode);

    if (!room) {
      throw new Error("SALA_NO_ENCONTRADA: La sala no existe.");
    }

    if (room.status !== "waiting") {
      throw new Error("PARTIDA_YA_INICIADA: El juego ya comenzó.");
    }

    if (room.players.length < 1) {
      throw new Error("SIN_JUGADORES: Se requiere al menos un jugador.");
    }

    // 1. Set status to playing
    room.status = "playing";
    io.to(formattedCode).emit("room:updated", {
      players: room.players,
      host: room.host,
      status: room.status,
    });

    console.log(`[GAME] Starting room: ${formattedCode}`);

    try {
      // 2. Fetch questions
      const questions = await questionService.getQuestions(room.category, 10);
      
      // 3. Create active game object
      const newGame: ActiveGame = {
        roomCode: formattedCode,
        questions: questions as (Question & { correctAnswer: string })[],
        currentQuestionIndex: -1, // starts before first question
        timeLeft: 15,
        timerInterval: null,
        playersAnswers: new Map(),
        playersDoublePointsThisRound: new Set(),
        hasUsedPowerUpThisQuestion: new Set(),
      };

      this.activeGames.set(formattedCode, newGame);

      // 4. Trigger first question after a small 2-second buffer
      setTimeout(() => {
        this.nextQuestion(formattedCode, io);
      }, 2000);

    } catch (err: any) {
      console.error(`[GAME ERROR] Failed to start game ${formattedCode}:`, err);
      room.status = "waiting";
      io.to(formattedCode).emit("room:updated", {
        players: room.players,
        host: room.host,
        status: room.status,
      });
      io.to(formattedCode).emit("room:error", { message: "Error al cargar las preguntas." });
    }
  }

  /**
   * Proceed to the next question in the active game
   */
  private nextQuestion(roomCode: string, io: IOServer): void {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    // Increment index
    game.currentQuestionIndex++;

    // Check if game is finished
    if (game.currentQuestionIndex >= game.questions.length) {
      this.endGame(roomCode, io);
      return;
    }

    // Prepare fresh round state
    game.timeLeft = 15;
    game.playersAnswers.clear();
    game.playersDoublePointsThisRound.clear();
    game.hasUsedPowerUpThisQuestion.clear();

    const currentQuestion = game.questions[game.currentQuestionIndex];
    
    // Safety copy of question without the secret correct answer property
    const cleanQuestion: Question = {
      id: currentQuestion.id,
      text: currentQuestion.text,
      options: currentQuestion.options,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
    };

    console.log(`[GAME] Room ${roomCode} - Sending question ${game.currentQuestionIndex + 1}/10`);

    // Emit question to room
    io.to(roomCode).emit("game:question", {
      question: cleanQuestion,
      index: game.currentQuestionIndex + 1,
      total: game.questions.length,
      timeLimit: 15,
    });

    // Start server side timer interval
    if (game.timerInterval) clearInterval(game.timerInterval);

    game.timerInterval = setInterval(() => {
      game.timeLeft--;

      // Sychronize timer tick
      io.to(roomCode).emit("game:tick", { timeLeft: game.timeLeft });

      if (game.timeLeft <= 0) {
        this.endQuestion(roomCode, io);
      }
    }, 1000);
  }

  /**
   * Process a player's answer submission
   */
  public submitAnswer(
    roomCode: string,
    socketId: string,
    questionId: string,
    answer: string,
    io: IOServer
  ): void {
    const formattedCode = roomCode.toUpperCase();
    const game = this.activeGames.get(formattedCode);
    if (!game) return;

    // Check if player has already submitted an answer this round
    if (game.playersAnswers.has(socketId)) return;

    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (currentQuestion.id !== questionId) return;

    const room = roomService.getRoom(formattedCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socketId);
    if (!player) return;

    // Calculate score
    const isCorrect = currentQuestion.correctAnswer === answer;
    let points = 0;

    if (isCorrect) {
      const timeTaken = 15 - game.timeLeft;
      // Max score 1000, decays linearly by speed down to 300 minimum for correct answers
      const speedMultiplier = game.timeLeft / 15;
      points = Math.round(1000 * speedMultiplier);
      if (points < 300) points = 300;

      // Apply double points power-up if activated
      const hasDouble = game.playersDoublePointsThisRound.has(socketId);
      if (hasDouble) {
        points = points * 2;
      }
    }

    // Save answer data
    game.playersAnswers.set(socketId, {
      answer,
      timeTaken: 15 - game.timeLeft,
      doubled: game.playersDoublePointsThisRound.has(socketId),
    });

    // Update player accumulated score
    player.score += points;

    // Build current round scoreboard
    const scoreboard: ScoreEntry[] = room.players
      .map((p) => ({
        username: p.username,
        score: p.score,
        rank: 1,
      }))
      .sort((a, b) => b.score - a.score);

    // Apply ranks
    scoreboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Send individual response result back to the player
    io.to(socketId).emit("game:answer_result", {
      correct: isCorrect,
      points,
      scoreboard,
    });

    console.log(`[GAME] Room ${formattedCode}: Player ${player.username} answered. Correct: ${isCorrect}. Points: ${points}`);

    // Check if all players have answered
    if (game.playersAnswers.size >= room.players.length) {
      this.endQuestion(formattedCode, io);
    }
  }

  /**
   * End the current question, broadcast results, and queue next question
   */
  private endQuestion(roomCode: string, io: IOServer): void {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    // Clear interval timer
    if (game.timerInterval) {
      clearInterval(game.timerInterval);
      game.timerInterval = null;
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const room = roomService.getRoom(roomCode);
    if (!room) return;

    // Generate score rankings
    const scoreboard: ScoreEntry[] = room.players
      .map((p) => ({
        username: p.username,
        score: p.score,
        rank: 1,
      }))
      .sort((a, b) => b.score - a.score);

    scoreboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Emit round summary
    io.to(roomCode).emit("game:question_end", {
      correctAnswer: currentQuestion.correctAnswer,
      scoreboard,
    });

    console.log(`[GAME] Room ${roomCode} - Question ${game.currentQuestionIndex + 1} finished. Correct option: ${currentQuestion.correctAnswer}`);

    // Wait 5 seconds before going to the next question
    setTimeout(() => {
      this.nextQuestion(roomCode, io);
    }, 5000);
  }

  /**
   * Activate a power-up effect for a player in a room
   */
  public usePowerUp(
    roomCode: string,
    socketId: string,
    powerUpType: PowerUpType,
    io: IOServer
  ): void {
    const formattedCode = roomCode.toUpperCase();
    const game = this.activeGames.get(formattedCode);
    if (!game) return;

    // Power-up can only be used in active question during countdown
    if (game.timeLeft <= 0 || game.currentQuestionIndex === -1) return;

    // Check if player has already used a power-up during this question round
    if (game.hasUsedPowerUpThisQuestion.has(socketId)) {
      io.to(socketId).emit("room:error", { message: "Ya has usado un power-up en esta pregunta." });
      return;
    }

    const room = roomService.getRoom(formattedCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socketId);
    if (!player) return;

    // Check if player still owns this power-up
    if (!player.powerUps[powerUpType]) {
      io.to(socketId).emit("room:error", { message: "Ya has gastado este Power-Up." });
      return;
    }

    // Mark as used in the player object
    player.powerUps[powerUpType] = false;
    game.hasUsedPowerUpThisQuestion.add(socketId);

    // Apply power-up logic
    if (powerUpType === "double_points") {
      game.playersDoublePointsThisRound.add(socketId);
      
      // Notify room via system chat
      io.to(formattedCode).emit("chat:message", {
        username: "System",
        text: `${player.username.toUpperCase()} ACTIVÓ [DOBLE PUNTOS] PARA ESTA PREGUNTA!`,
        timestamp: Date.now(),
      });
    } 
    else if (powerUpType === "freeze_timer") {
      // Add 5 seconds extra to the countdown (cap at 15)
      game.timeLeft = Math.min(game.timeLeft + 5, 15);
      
      io.to(formattedCode).emit("chat:message", {
        username: "System",
        text: `${player.username.toUpperCase()} ACTIVÓ [CONGELAR TIEMPO] (+5 SEGUNDOS AL RELOJ)!`,
        timestamp: Date.now(),
      });
      
      // Sychronize client timers instantly
      io.to(formattedCode).emit("game:tick", { timeLeft: game.timeLeft });
    } 
    else if (powerUpType === "skip_question") {
      // Trigger auto correct answer submission with low points
      const currentQuestion = game.questions[game.currentQuestionIndex];
      
      io.to(formattedCode).emit("chat:message", {
        username: "System",
        text: `${player.username.toUpperCase()} ACTIVÓ [SALTAR PREGUNTA] (AUTO-COMPLETA CON 350 PTS)!`,
        timestamp: Date.now(),
      });

      // Submit automatic correct answer
      this.submitAnswer(formattedCode, socketId, currentQuestion.id, currentQuestion.correctAnswer, io);
      // Ensure score override for skip question to have exactly 350 pts
      player.score -= (playersScoreIncrement(game.timeLeft, game.playersDoublePointsThisRound.has(socketId)) - 350);
      
      // Update individual answer data inside active game to reflect skipped action
      const data = game.playersAnswers.get(socketId);
      if (data) {
        data.answer = currentQuestion.correctAnswer;
      }
    }

    // Broadcast updated player states to sync UI power-up lights
    io.to(formattedCode).emit("room:updated", {
      players: room.players,
      host: room.host,
      status: room.status,
    });

    console.log(`[POWER-UP] Room ${formattedCode}: Player ${player.username} used ${powerUpType}`);
  }

  /**
   * Conclude the match, save data, and broadcast results
   */
  private async endGame(roomCode: string, io: IOServer): Promise<void> {
    const game = this.activeGames.get(roomCode);
    if (!game) return;

    this.activeGames.delete(roomCode);

    const room = roomService.getRoom(roomCode);
    if (!room) return;

    room.status = "finished";

    // Build scoreboard
    const scoreboard: ScoreEntry[] = room.players
      .map((p) => ({
        username: p.username,
        score: p.score,
        rank: 1,
      }))
      .sort((a, b) => b.score - a.score);

    scoreboard.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    const winner = scoreboard[0]?.username || "Nadie";

    // Broadcast end game event
    io.to(roomCode).emit("game:end", {
      winner,
      finalScoreboard: scoreboard,
    });

    // Notify room updated
    io.to(roomCode).emit("room:updated", {
      players: room.players,
      host: room.host,
      status: room.status,
    });

    console.log(`[GAME FINISHED] Room ${roomCode} concluded. Winner: ${winner}`);

    // Persist match logs in database asynchronously
    try {
      const match = await prisma.match.create({
        data: {
          roomCode,
          category: room.category,
        },
      });

      // Save each registered (non-guest) player participant
      for (const p of room.players) {
        if (!p.isGuest) {
          // Verify user exists in database first
          const dbUser = await prisma.user.findUnique({ where: { username: p.username } });
          if (dbUser) {
            const finalRank = scoreboard.find((entry) => entry.username === p.username)?.rank || 1;
            await prisma.matchParticipant.create({
              data: {
                userId: dbUser.id,
                matchId: match.id,
                score: p.score,
                rank: finalRank,
              },
            });
          }
        }
      }
      console.log(`[DB] Successfully saved Match stats for room ${roomCode}`);
    } catch (dbError) {
      console.error("[DB ERROR] Failed to save Match logging:", dbError);
    }
  }
}

// Helpers
function playersScoreIncrement(timeLeft: number, hasDouble: boolean): number {
  const speedMultiplier = timeLeft / 15;
  let pts = Math.round(1000 * speedMultiplier);
  if (pts < 300) pts = 300;
  return hasDouble ? pts * 2 : pts;
}

export const gameService = new GameService();
