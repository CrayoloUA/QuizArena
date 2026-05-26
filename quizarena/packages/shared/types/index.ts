// Re-export all shared types
export * from "./player";
export * from "./room";
export * from "./game";

// --- Chat events ---

export interface ChatMessagePayload {
  code: string;
  text: string;
}

export interface ChatMessageServerPayload {
  username: string;
  text: string;
  timestamp: number;
}

// --- Socket event maps for type-safe usage ---

export interface ClientToServerEvents {
  "room:create": (payload: import("./room").RoomCreatePayload) => void;
  "room:join": (payload: import("./room").RoomJoinPayload) => void;
  "room:leave": (payload: import("./room").RoomLeavePayload) => void;
  "room:toggle_ready": (payload: { code: string }) => void;
  "game:start": (payload: import("./game").GameStartPayload) => void;
  "game:answer": (payload: import("./game").GameAnswerPayload) => void;
  "chat:message": (payload: ChatMessagePayload) => void;
  "powerup:use": (payload: import("./game").PowerUpUsePayload) => void;
}

export interface ServerToClientEvents {
  "room:updated": (payload: import("./room").RoomUpdatedPayload) => void;
  "room:error": (payload: import("./room").RoomErrorPayload) => void;
  "room:created": (payload: { code: string }) => void;
  "game:question": (payload: import("./game").GameQuestionPayload) => void;
  "game:tick": (payload: import("./game").GameTickPayload) => void;
  "game:answer_result": (payload: import("./game").GameAnswerResultPayload) => void;
  "game:question_end": (payload: import("./game").GameQuestionEndPayload) => void;
  "game:end": (payload: import("./game").GameEndPayload) => void;
  "chat:message": (payload: ChatMessageServerPayload) => void;
}
