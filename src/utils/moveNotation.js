// Simple move notation generator
const PIECE_SYMBOLS = {
  'P': '',
  'R': 'R',
  'N': 'N',
  'B': 'B',
  'Q': 'Q',
  'K': 'K'
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function getMoveNotation(board, fromRow, fromCol, toRow, toCol, newBoard, inCheck) {
  const piece = board[fromRow][fromCol];
  const pieceType = piece[1];
  const capturedPiece = board[toRow][toCol] !== '.';
  
  const fromSquare = FILES[fromCol] + RANKS[fromRow];
  const toSquare = FILES[toCol] + RANKS[toRow];
  
  let notation = '';
  
  // Piece symbol (except pawn)
  if (pieceType !== 'P') {
    notation += PIECE_SYMBOLS[pieceType];
  }
  
  // Capture indicator
  if (capturedPiece) {
    if (pieceType === 'P') {
      notation += FILES[fromCol]; // Pawn captures show file
    }
    notation += 'x';
  }
  
  // Destination square
  notation += toSquare;
  
  // Check/checkmate indicator
  if (inCheck) {
    // Check if it's checkmate (simplified - would need full checkmate detection)
    notation += '+';
  }
  
  return notation;
}

