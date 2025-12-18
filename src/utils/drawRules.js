import { inCheck, getMoves, findKing } from './chessEngine';
import { EMPTY } from './constants';

// Check for stalemate
export function isStalemate(board, whiteToMove) {
  // If the current player is NOT in check, and has no legal moves => stalemate
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === EMPTY) continue;
      if (whiteToMove && p[0] !== "w") continue;
      if (!whiteToMove && p[0] !== "b") continue;

      const moves = getMoves(r, c, board, whiteToMove);
      if (moves.length > 0) return false;
    }
  }
  return !inCheck(board, whiteToMove);
}

// Check insufficient material
export function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== EMPTY) pieces.push(board[r][c]);
    }
  }

  // King vs King
  if (pieces.length === 2) return true;

  // King + minor vs King
  if (pieces.length === 3) {
    return pieces.includes("wN") || pieces.includes("wB") ||
           pieces.includes("bN") || pieces.includes("bB");
  }

  return false;
}

// Threefold repetition tracking
export class RepetitionTracker {
  constructor() {
    this.repetitionMap = {};
  }

  updateRepetition(fen) {
    this.repetitionMap[fen] = (this.repetitionMap[fen] || 0) + 1;
  }

  isThreefold() {
    return Object.values(this.repetitionMap).some(v => v >= 3);
  }

  reset() {
    this.repetitionMap = {};
  }
}

// Perform all draw checks
export function evaluateDraw(board, whiteToMove, repetitionTracker, gameCode, socket, playSound) {
  if (!socket || !gameCode) return false;

  const fen = board.map(row => row.map(p => p === EMPTY ? "1" : p).join("")).join("/");
  repetitionTracker.updateRepetition(fen);

  if (repetitionTracker.isThreefold()) {
    if (playSound) playSound('draw_repetition.mp3');
    socket.emit("gameOver", { code: gameCode, result: "1/2-1/2", reason: "Threefold repetition" });
    return true;
  }

  if (isInsufficientMaterial(board)) {
    if (playSound) playSound('draw_insufficient.mp3');
    socket.emit("gameOver", { code: gameCode, result: "1/2-1/2", reason: "Insufficient material" });
    return true;
  }

  if (isStalemate(board, whiteToMove)) {
    if (playSound) playSound('draw_stalemate.mp3');
    socket.emit("gameOver", { code: gameCode, result: "1/2-1/2", reason: "Stalemate" });
    return true;
  }

  return false;
}

