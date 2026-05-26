import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@quizarena/shared";
import { roomService } from "../services/RoomService";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerChatHandlers(io: IOServer, socket: IOSocket): void {
  /**
   * CHAT MESSAGE
   */
  socket.on("chat:message", (payload) => {
    try {
      const room = roomService.getRoom(payload.code);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // Broadcast message to everyone in the room
      io.to(room.code).emit("chat:message", {
        username: player.username,
        text: payload.text,
        timestamp: Date.now(),
      });

      console.log(`[CHAT] Room ${room.code}: <${player.username}> ${payload.text}`);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] chat:message: ${error.message}`);
    }
  });
}
