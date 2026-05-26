export type PowerUpType = "freeze_timer" | "double_points" | "skip_question";

export interface Player {
  id: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  isGuest: boolean;
  score: number;
  powerUps: Record<PowerUpType, boolean>;
}
