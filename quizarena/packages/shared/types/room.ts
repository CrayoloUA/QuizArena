import type { Player } from "./player";

export type RoomStatus = "waiting" | "playing" | "finished";

export interface Room {
  code: string;
  host: string;
  players: Player[];
  category: string;
  maxPlayers: number;
  status: RoomStatus;
}

// --- Client -> Server events ---

export interface RoomCreatePayload {
  username: string;
  category: string;
  maxPlayers: number;
}

export interface RoomJoinPayload {
  code: string;
  username: string;
}

export interface RoomLeavePayload {
  code: string;
}

// --- Server -> Client events ---

export interface RoomUpdatedPayload {
  players: Player[];
  host: string;
  status: RoomStatus;
}

export interface RoomErrorPayload {
  message: string;
}
