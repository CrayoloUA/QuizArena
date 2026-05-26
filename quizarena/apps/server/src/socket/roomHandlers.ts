import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@quizarena/shared";
import { roomService } from "../services/RoomService";

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function registerRoomHandlers(io: IOServer, socket: IOSocket): void {
  /**
   * CREATE ROOM
   */
  socket.on("room:create", (payload) => {
    try {
      const room = roomService.createRoom(
        socket.id,
        payload.username,
        payload.category,
        payload.maxPlayers,
        true // default to guest for simple flow, can be updated with JWT later
      );

      socket.join(room.code);
      socket.emit("room:created", { code: room.code });

      // Broadcast room update to all members in the room
      io.to(room.code).emit("room:updated", {
        players: room.players,
        host: room.host,
        status: room.status,
      });

      console.log(`[SOCKET] Room created: ${room.code} by ${payload.username}`);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] room:create: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al crear la sala." });
    }
  });

  /**
   * JOIN ROOM
   */
  socket.on("room:join", (payload) => {
    try {
      const room = roomService.joinRoom(
        payload.code,
        socket.id,
        payload.username,
        true
      );

      socket.join(room.code);

      // Broadcast room update to all members in the room
      io.to(room.code).emit("room:updated", {
        players: room.players,
        host: room.host,
        status: room.status,
      });

      console.log(`[SOCKET] User ${payload.username} joined room: ${room.code}`);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] room:join: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al unirse a la sala." });
    }
  });

  /**
   * LEAVE ROOM (Explicit)
   */
  socket.on("room:leave", (payload) => {
    try {
      handlePlayerLeave(io, socket, payload.code);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] room:leave: ${error.message}`);
    }
  });

  /**
   * TOGGLE READY STATE
   */
  socket.on("room:toggle_ready", (payload) => {
    try {
      const room = roomService.toggleReady(payload.code, socket.id);

      io.to(room.code).emit("room:updated", {
        players: room.players,
        host: room.host,
        status: room.status,
      });

      console.log(`[SOCKET] Room ${room.code}: Player ${socket.id} toggled ready`);
    } catch (error: any) {
      console.error(`[SOCKET ERROR] room:toggle_ready: ${error.message}`);
      socket.emit("room:error", { message: error.message || "Error al actualizar estado listo." });
    }
  });
}

/**
 * Helper to handle player leaving a room
 */
export function handlePlayerLeave(io: IOServer, socket: IOSocket, roomCode?: string): void {
  const result = roomService.leaveRoom(socket.id);
  if (!result) return;

  const { roomCode: code, room } = result;

  socket.leave(code);

  if (room) {
    // Notify remaining players
    io.to(code).emit("room:updated", {
      players: room.players,
      host: room.host,
      status: room.status,
    });
    console.log(`[SOCKET] Player ${socket.id} left room: ${code}`);
  } else {
    console.log(`[SOCKET] Room ${code} destroyed (no players left)`);
  }
}
