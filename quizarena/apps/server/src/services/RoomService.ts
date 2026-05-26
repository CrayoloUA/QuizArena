import type { Room, Player, PowerUpType } from "@quizarena/shared";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RoomService {
  // Store rooms in memory for speed and low latency
  private rooms: Map<string, Room> = new Map();

  // Socket ID -> Room Code mapping for fast lookups on disconnect
  private playerRoomMap: Map<string, string> = new Map();

  /**
   * Create a new game room
   */
  public createRoom(
    socketId: string,
    username: string,
    category: string,
    maxPlayers: number,
    isGuest: boolean = true
  ): Room {
    let code = generateCode();
    // Ensure uniqueness
    while (this.rooms.has(code)) {
      code = generateCode();
    }

    const hostPlayer: Player = {
      id: socketId,
      username,
      isHost: true,
      isReady: true, // Host is ready by default
      isGuest,
      score: 0,
      powerUps: {
        freeze_timer: true,
        double_points: true,
        skip_question: true,
      },
    };

    const room: Room = {
      code,
      host: username,
      players: [hostPlayer],
      category,
      maxPlayers,
      status: "waiting",
    };

    this.rooms.set(code, room);
    this.playerRoomMap.set(socketId, code);

    return room;
  }

  /**
   * Get room by its 6-character code
   */
  public getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Get room code where a player is currently in
   */
  public getRoomCodeByPlayerId(socketId: string): string | undefined {
    return this.playerRoomMap.get(socketId);
  }

  /**
   * Join an existing room
   */
  public joinRoom(
    code: string,
    socketId: string,
    username: string,
    isGuest: boolean = true
  ): Room {
    const formattedCode = code.toUpperCase();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      throw new Error(`ROOM_NOT_FOUND: La sala ${formattedCode} no existe.`);
    }

    if (room.status !== "waiting") {
      throw new Error("GAME_ALREADY_STARTED: La partida ya ha comenzado.");
    }

    // Handle reconnection: if player username is already in the room, update their socket ID
    const existingPlayer = room.players.find(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );

    if (existingPlayer) {
      // Clean old socket mapping
      this.playerRoomMap.delete(existingPlayer.id);
      
      // Update with new socket ID
      existingPlayer.id = socketId;
      this.playerRoomMap.set(socketId, formattedCode);
      
      // If they were host, make sure they remain marked as host
      if (room.host.toLowerCase() === username.toLowerCase()) {
        existingPlayer.isHost = true;
        existingPlayer.isReady = true;
      }
      
      return room;
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error("ROOM_FULL: La sala está llena.");
    }

    const newPlayer: Player = {
      id: socketId,
      username,
      isHost: false,
      isReady: false,
      isGuest,
      score: 0,
      powerUps: {
        freeze_timer: true,
        double_points: true,
        skip_question: true,
      },
    };

    room.players.push(newPlayer);
    this.playerRoomMap.set(socketId, formattedCode);

    return room;
  }

  /**
   * Toggle a player's ready state
   */
  public toggleReady(code: string, socketId: string): Room {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error("La sala no existe.");
    }

    const player = room.players.find((p) => p.id === socketId);
    if (!player) {
      throw new Error("El jugador no se encuentra en esta sala.");
    }

    // Host is always ready
    if (!player.isHost) {
      player.isReady = !player.isReady;
    }

    return room;
  }

  /**
   * Remove a player from a room (on explicit leave or disconnect)
   * Returns the updated room, or null if the room was deleted
   */
  public leaveRoom(socketId: string): { roomCode: string; room: Room | null } | null {
    const code = this.playerRoomMap.get(socketId);
    if (!code) return null;

    this.playerRoomMap.delete(socketId);
    const room = this.rooms.get(code);
    if (!room) return null;

    // Filter out leaving player
    room.players = room.players.filter((p) => p.id !== socketId);

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(code);
      return { roomCode: code, room: null };
    }

    // If the leaving player was the host, assign a new host
    const leavingWasHost = room.host === room.players.find((p) => p.id === socketId)?.username || !room.players.some(p => p.username === room.host);
    if (leavingWasHost && room.players.length > 0) {
      // Set first remaining player as host
      room.players[0].isHost = true;
      room.players[0].isReady = true; // Host is always ready
      room.host = room.players[0].username;
    }

    return { roomCode: code, room };
  }
}

// Export singleton instance of RoomService
export const roomService = new RoomService();
