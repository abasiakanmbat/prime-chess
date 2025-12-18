import { EMPTY } from './constants';

// Helper functions
export function isWhite(p) {
  return p && p[0] === "w";
}

export function isBlack(p) {
  return p && p[0] === "b";
}

export function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function clone(b) {
  return b.map(row => row.slice());
}

// Find king position
export function findKing(b, white) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (b[r][c] === (white ? "wK" : "bK")) return [r, c];
    }
  }
  return null;
}

// Check if a square is attacked by opponent
export function attacked(b, r, c, byWhite) {
  // Check pawn attacks
  const pawnDir = byWhite ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = r - pawnDir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = b[pr][pc];
      if (p && p[1] === "P" && isWhite(p) === byWhite) {
        return true;
      }
    }
  }

  // Check knight attacks
  const knightMoves = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = b[nr][nc];
      if (p && p[1] === "N" && isWhite(p) === byWhite) {
        return true;
      }
    }
  }

  // Check diagonal attacks (bishop, queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = b[nr][nc];
      if (p !== EMPTY) {
        if (isWhite(p) === byWhite && (p[1] === "B" || p[1] === "Q")) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Check straight attacks (rook, queen)
  const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = b[nr][nc];
      if (p !== EMPTY) {
        if (isWhite(p) === byWhite && (p[1] === "R" || p[1] === "Q")) {
          return true;
        }
        break;
      }
      nr += dr;
      nc += dc;
    }
  }

  // Check king attacks
  const kingDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  for (const [dr, dc] of kingDirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = b[nr][nc];
      if (p && p[1] === "K" && isWhite(p) === byWhite) {
        return true;
      }
    }
  }

  return false;
}

// Check if a player is in check
export function inCheck(b, white) {
  const king = findKing(b, white);
  if (!king) return false;
  const [kR, kC] = king;
  return attacked(b, kR, kC, !white);
}

// Check if king would be in check after a move
export function kingInCheckAfter(r, c, nr, nc, b, whiteToMove) {
  const cp = clone(b);
  const piece = cp[r][c];
  cp[nr][nc] = piece;
  cp[r][c] = EMPTY;
  
  // Handle pawn promotion
  if (piece === "wP" && nr === 0) cp[nr][nc] = "wQ";
  if (piece === "bP" && nr === 7) cp[nr][nc] = "bQ";
  
  return inCheck(cp, whiteToMove);
}

// Generate all legal moves for a piece
export function getMoves(r, c, b, whiteToMove) {
  const p = b[r][c];
  if (p === EMPTY) return [];
  
  const side = isWhite(p);
  
  // Must be the correct side's turn
  if (side !== whiteToMove) return [];
  
  const moves = [];
  
  // Pawn moves
  if (p[1] === "P") {
    const dir = side ? -1 : 1; // White moves up (decreasing row), black moves down (increasing row)
    const startRow = side ? 6 : 1;
    
    // Forward move (one square)
    const nr = r + dir;
    if (inBounds(nr, c) && b[nr][c] === EMPTY) {
      moves.push([nr, c]);
      
      // Double move from starting position
      if (r === startRow) {
        const nr2 = r + 2 * dir;
        if (inBounds(nr2, c) && b[nr2][c] === EMPTY) {
          moves.push([nr2, c]);
        }
      }
    }
    
    // Diagonal captures
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target !== EMPTY && isWhite(target) !== side) {
          moves.push([nr, nc]);
        }
      }
    }
  }
  
  // Knight moves
  if (p[1] === "N") {
    const knightMoves = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]];
    for (const [dr, dc] of knightMoves) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target === EMPTY || isWhite(target) !== side) {
          moves.push([nr, nc]);
        }
      }
    }
  }
  
  // Bishop moves (diagonal)
  if (p[1] === "B") {
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target === EMPTY) {
          moves.push([nr, nc]);
        } else {
          if (isWhite(target) !== side) {
            moves.push([nr, nc]);
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  
  // Rook moves (straight)
  if (p[1] === "R") {
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target === EMPTY) {
          moves.push([nr, nc]);
        } else {
          if (isWhite(target) !== side) {
            moves.push([nr, nc]);
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  
  // Queen moves (diagonal + straight)
  if (p[1] === "Q") {
    const queenDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of queenDirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target === EMPTY) {
          moves.push([nr, nc]);
        } else {
          if (isWhite(target) !== side) {
            moves.push([nr, nc]);
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }
  
  // King moves
  if (p[1] === "K") {
    const kingDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (const [dr, dc] of kingDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const target = b[nr][nc];
        if (target === EMPTY || isWhite(target) !== side) {
          moves.push([nr, nc]);
        }
      }
    }
  }
  
  // Filter out moves that would leave king in check
  return moves.filter(([nr, nc]) => !kingInCheckAfter(r, c, nr, nc, b, whiteToMove));
}

// Make a move on the board (returns new board)
export function makeMove(board, r, c, nr, nc) {
  const newBoard = clone(board);
  const p = newBoard[r][c];
  newBoard[nr][nc] = p;
  newBoard[r][c] = EMPTY;
  
  // Pawn promotion (white to rank 0, black to rank 7)
  if (p === "wP" && nr === 0) newBoard[nr][nc] = "wQ";
  if (p === "bP" && nr === 7) newBoard[nr][nc] = "bQ";
  
  return newBoard;
}

// Convert board to FEN string (simplified - just board position)
export function boardToFEN(board) {
  return board.map(row => row.map(p => p === EMPTY ? "1" : p).join("")).join("/");
}

// Parse FEN string to board
export function parseFEN(fen) {
  // Handle FEN format from boardToFEN: "bRbNbBbQbKbBbNbR/bPbPbPbPbPbPbPbP/11111111/..."
  // Format: each row is a string where "1" = empty, "wP"/"bR" etc = pieces
  const rows = fen.split("/");
  const board = [];
  
  for (const row of rows) {
    const boardRow = [];
    let i = 0;
    while (i < row.length && boardRow.length < 8) {
      const char = row[i];
      if (char === "1") {
        boardRow.push(EMPTY);
        i++;
      } else if (char === "w" || char === "b") {
        // Piece code like "wP", "bR", etc. - take next char for piece type
        if (i + 1 < row.length) {
          const pieceType = row[i + 1];
          const piece = char + pieceType;
          boardRow.push(piece);
          i += 2;
        } else {
          boardRow.push(EMPTY);
          i++;
        }
      } else {
        // Unexpected character, skip
        i++;
      }
    }
    
    // Ensure row has exactly 8 squares
    while (boardRow.length < 8) {
      boardRow.push(EMPTY);
    }
    board.push(boardRow.slice(0, 8));
  }
  
  // Ensure board has exactly 8 rows
  while (board.length < 8) {
    board.push(new Array(8).fill(EMPTY));
  }
  
  return board.slice(0, 8);
}
