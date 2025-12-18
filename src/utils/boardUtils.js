import { parseFEN, boardToFEN } from './chessEngine';

export function applyFEN(board, setBoard, fen) {
  const newBoard = parseFEN(fen);
  setBoard(newBoard);
}

export function getSquareFromPosition(x, y, boardSize) {
  const squareSize = boardSize / 8;
  const col = Math.floor(x / squareSize);
  const row = Math.floor(y / squareSize);
  return { row: Math.max(0, Math.min(7, row)), col: Math.max(0, Math.min(7, col)) };
}

export function get3DPosition(row, col, squareSize = 1) {
  // Calculate exact center of square
  // Board array: row 0 = rank 8 (black), row 7 = rank 1 (white)
  // Visual 3D: Need to flip Z-axis so black (row 0) appears at back
  // For 8 squares, center is at -3.5 to 3.5
  return {
    x: (col - 3.5) * squareSize,
    z: (3.5 - row) * squareSize,  // Flipped: row 0 -> z=3.5, row 7 -> z=-3.5
    y: 0
  };
}

