export const EMPTY = ".";

// Standard chess starting position
// Row 0 = Rank 8 (black back rank): a8-h8
// Row 1 = Rank 7 (black pawns): a7-h7
// Row 6 = Rank 2 (white pawns): a2-h2
// Row 7 = Rank 1 (white back rank): a1-h1
// Black Queen on d8 (row 0, col 3), King on e8 (row 0, col 4)
// White Queen on d1 (row 7, col 3), King on e1 (row 7, col 4)
export const INITIAL_BOARD = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"], // Rank 8: a8-h8
  ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"], // Rank 7: a7-h7
  [".", ".", ".", ".", ".", ".", ".", "."],         // Rank 6: a6-h6
  [".", ".", ".", ".", ".", ".", ".", "."],         // Rank 5: a5-h5
  [".", ".", ".", ".", ".", ".", ".", "."],         // Rank 4: a4-h4
  [".", ".", ".", ".", ".", ".", ".", "."],         // Rank 3: a3-h3
  ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"], // Rank 2: a2-h2
  ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"]  // Rank 1: a1-h1
];

export const VALID_TIME_CONTROLS = ["15+10", "5+3", "2+1"];

export const PIECE_TYPES = {
  PAWN: "P",
  ROOK: "R",
  KNIGHT: "N",
  BISHOP: "B",
  QUEEN: "Q",
  KING: "K"
};

