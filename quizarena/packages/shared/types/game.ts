import type { PowerUpType } from "./player";

export interface Question {
  id: string;
  text: string;
  options: string[];
  category: string;
  difficulty: string;
}

export interface ScoreEntry {
  username: string;
  score: number;
  rank: number;
}

export type GameStatus = "waiting" | "playing" | "finished";

export interface GameState {
  currentQuestion: number;
  totalQuestions: number;
  timeLeft: number;
  scoreboard: ScoreEntry[];
  status: GameStatus;
}

// --- Client -> Server events ---

export interface GameStartPayload {
  code: string;
}

export interface GameAnswerPayload {
  questionId: string;
  answer: string;
  timeLeft: number;
}

export interface PowerUpUsePayload {
  code: string;
  type: PowerUpType;
}

// --- Server -> Client events ---

export interface GameQuestionPayload {
  question: Question;
  index: number;
  total: number;
  timeLimit: number;
}

export interface GameTickPayload {
  timeLeft: number;
}

export interface GameAnswerResultPayload {
  correct: boolean;
  points: number;
  scoreboard: ScoreEntry[];
}

export interface GameQuestionEndPayload {
  correctAnswer: string;
  scoreboard: ScoreEntry[];
}

export interface GameEndPayload {
  winner: string;
  finalScoreboard: ScoreEntry[];
}
