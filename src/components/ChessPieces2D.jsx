import { useMemo } from 'react';

// Import custom board set provided in /assets/chesspieces/board
import wP from '../components/pieces/cburnett/wP.svg';
import wR from '../components/pieces/cburnett/wR.svg';
import wN from '../components/pieces/cburnett/wN.svg';
import wB from '../components/pieces/cburnett/wB.svg';
import wQ from '../components/pieces/cburnett/wQ.svg';
import wK from '../components/pieces/cburnett/wK.svg';
import bP from '../components/pieces/cburnett/bP.svg';
import bR from '../components/pieces/cburnett/bR.svg';
import bN from '../components/pieces/cburnett/bN.svg';
import bB from '../components/pieces/cburnett/bB.svg';
import bQ from '../components/pieces/cburnett/bQ.svg';
import bK from '../components/pieces/cburnett/bK.svg';

// Map piece codes to imported SVG files
const PIECE_IMAGE_MAP = {
  'wP': wP,
  'wR': wR,
  'wN': wN,
  'wB': wB,
  'wQ': wQ,
  'wK': wK,
  'bP': bP,
  'bR': bR,
  'bN': bN,
  'bB': bB,
  'bQ': bQ,
  'bK': bK,
};

function ChessPiece({ 
  piece, 
  row, 
  col, 
  isSelected, 
  canMove, 
  onClick, 
  isAnimating,
  shouldFlip,
  squareSize
}) {
  const imagePath = PIECE_IMAGE_MAP[piece];
  if (!imagePath) {
    return null;
  }

  // Determine if piece is white or black
  // Determine if piece is white or black
  const isWhite = piece[0] === 'w';
  const pieceType = piece[1];

  // Calculate display position (accounting for board flip)
  const displayRow = shouldFlip ? 7 - row : row;
  const displayCol = shouldFlip ? 7 - col : col;
  
  // Slightly smaller than full square to avoid overlap on borders
  const pieceSize = squareSize * 0.99;
  
  // STRICT FORMULA: position = index × squareSize
  const top = displayRow * squareSize;
  const left = displayCol * squareSize;

  // Check if knight should be mirrored (flipped horizontally)
  const shouldMirrorKnight = () => {
    if (pieceType !== 'N') return false;
    if (isWhite) {
      return col === 6; // Right knight (g-file)
    } else {
      return col === 1; // Left knight (b-file)
    }
  };

  const baseFilter = isSelected ? 'drop-shadow(0 0 8px rgba(250, 204, 21, 0.8))' : 'none';
  // Both WHITE and BLACK SVG files are rendered in black color in the SVG code
  // Black pieces stay black (no filter)
  // White pieces get inverted to become light/white
  const colorFilter = isWhite ? 'brightness(1.1)' : 'brightness(0.3)';

  return (
    <div
      className={`absolute ${canMove ? 'cursor-pointer' : 'cursor-default'} ${
        isAnimating ? 'transition-all duration-300 ease-in-out' : ''
      }`}
      style={{
        // Position at exact square coordinates, centered via flexbox
        top: `${top}px`,
        left: `${left}px`,
        width: `${squareSize}px`,
        height: `${squareSize}px`,
        pointerEvents: canMove ? 'auto' : 'none',
        zIndex: isSelected ? 10 : 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPointerDown={(e) => {
        if (canMove) {
          e.stopPropagation();
        }
      }}
      onClick={() => canMove && onClick(row, col)}
    >
      <img
        src={imagePath}
        alt={piece}
        draggable={false}
        style={{
          width: `${pieceSize}px`,
          height: `${pieceSize}px`,
          objectFit: 'contain',
          transform: shouldMirrorKnight() ? 'scaleX(-1)' : 'scaleX(1)',
          filter: `${colorFilter} ${baseFilter}`
        }}
      />
    </div>
  );
}

export default function ChessPieces2D({ 
  board, 
  whiteToMove, 
  selectedSquare, 
  onPieceClick, 
  allowMoves, 
  lastMove,
  shouldFlip,
  squareSize
}) {
  const pieces = useMemo(() => {
    if (!squareSize) return [];
    const piecesList = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece !== '.') {
          const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
          const isWhite = piece[0] === 'w';
          const canMove = allowMoves && (isWhite === whiteToMove);
          
          // Check if this piece is animating (was just moved)
          const isAnimating = lastMove && 
            lastMove.to && 
            lastMove.to.row === row && 
            lastMove.to.col === col;
          
          piecesList.push({
            piece,
            row,
            col,
            isSelected,
            canMove,
            isAnimating
          });
        }
      }
    }
    return piecesList;
  }, [board, selectedSquare, whiteToMove, allowMoves, lastMove, squareSize]);

  return (
    <div className="relative w-full h-full">
      {pieces.map((p) => (
        <ChessPiece
          key={`${p.piece}-${p.row}-${p.col}`}
          piece={p.piece}
          row={p.row}
          col={p.col}
          isSelected={p.isSelected}
          canMove={p.canMove}
          onClick={onPieceClick}
          isAnimating={p.isAnimating}
          shouldFlip={shouldFlip}
          squareSize={squareSize}
        />
      ))}
    </div>
  );
}
