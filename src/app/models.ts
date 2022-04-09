export interface GameRoom {
  id: number;
}

export interface Player {
  id: number,
  playerNumber: number,
  name: string,
  isHost: boolean,
  score?: number,
  gameRoomId: number
}

export interface Question {
  id: number,
  gameRoomId: number,
  correctAnswer?: number
}

export interface Answer {
  id: number,
  guess: number,
  playerId: number,
  questionId: number
}

export interface Bet {
  id: number,
  amount: number,
  payout: number,
  playerId: number,
  answerId: number
}

export interface Result {
  isWinningGuess: boolean,
  betAmount: number,
  payout: number,
  credit: number,
  playerId: number,
  player?: Player,
  answerId: number,
  answer?: Answer
}

// View models
export interface ChipGroup {
  amount: number,
  count: number
}