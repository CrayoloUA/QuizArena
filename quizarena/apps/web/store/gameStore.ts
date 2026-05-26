import { create } from "zustand";
import type { GameState, ScoreEntry, Question } from "@quizarena/shared";

interface GameStore {
  // State
  status: GameState["status"];
  currentQuestion: number;
  totalQuestions: number;
  timeLeft: number;
  scoreboard: ScoreEntry[];
  question: Question | null;
  hasAnswered: boolean;
  roundResult: { correct: boolean; points: number } | null;
  correctAnswer: string;
  winner: string;

  // Actions
  setQuestion: (question: Question, index: number, total: number, timeLimit: number) => void;
  setTimeLeft: (time: number) => void;
  setScoreboard: (scoreboard: ScoreEntry[]) => void;
  setHasAnswered: (answered: boolean) => void;
  setStatus: (status: GameState["status"]) => void;
  setRoundResult: (result: { correct: boolean; points: number } | null) => void;
  setCorrectAnswer: (answer: string) => void;
  setWinner: (winner: string) => void;
  reset: () => void;
}

const initialState = {
  status: "waiting" as const,
  currentQuestion: 0,
  totalQuestions: 0,
  timeLeft: 0,
  scoreboard: [],
  question: null,
  hasAnswered: false,
  roundResult: null,
  correctAnswer: "",
  winner: "",
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setQuestion: (question, index, total, timeLimit) =>
    set({
      question,
      currentQuestion: index,
      totalQuestions: total,
      timeLeft: timeLimit,
      hasAnswered: false,
      roundResult: null,
      correctAnswer: "",
      status: "playing",
    }),

  setTimeLeft: (time) => set({ timeLeft: time }),

  setScoreboard: (scoreboard) => set({ scoreboard }),

  setHasAnswered: (answered) => set({ hasAnswered: answered }),

  setStatus: (status) => set({ status }),

  setRoundResult: (roundResult) => set({ roundResult }),

  setCorrectAnswer: (correctAnswer) => set({ correctAnswer }),

  setWinner: (winner) => set({ winner }),

  reset: () => set(initialState),
}));
