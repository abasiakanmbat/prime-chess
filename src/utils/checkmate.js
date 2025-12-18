import { getMoves, inCheck } from './chessEngine';
import { EMPTY } from './constants';

export function isCheckmate(board, whiteToMove) {
  if (!inCheck(board, whiteToMove)) return false;
  
  // Check if there are any legal moves
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
  
  return true;
}

