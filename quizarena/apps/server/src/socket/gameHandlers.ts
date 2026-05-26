import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@quizarena/shared";
import { gameService } from "../services/GameService";
import { roomService } from "../services/RoomService";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerGameHandlers(io: IOServer, socket: IOSocket): void {
  /**
   * START GAME
   */
  socket.on("game:start", async (payload) => {
    try {
      await gameService.startGame(payload.code, io);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] game:start: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al iniciar la partida." });
    }
  });

  /**
   * SUBMIT ANSWER
   */
  socket.on("game:answer", (payload) => {
    try {
      // Find what room this player belongs to
      const roomCode = roomService.getRoomCodeByPlayerId(socket.id);
      if (!roomCode) {
        throw new Error("No estás en ninguna sala activa.");
      }

      gameService.submitAnswer(
        roomCode,
        socket.id,
        payload.questionId,
        payload.answer,
        io
      );
    } catch (error: any) {
      console.error(`[SOCKET ERROR] game:answer: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al enviar la respuesta." });
    }
  });

  /**
   * USE POWER-UP
   */
  socket.on("powerup:use", (payload) => {
    try {
      const roomCode = roomService.getRoomCodeByPlayerId(socket.id);
      if (!roomCode) {
        throw new Error("No estás en ninguna sala activa.");
      }

      gameService.usePowerUp(roomCode, socket.id, payload.type, io);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] powerup:use: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al usar Power-Up." });
    }
  });
}
