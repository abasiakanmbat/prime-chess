import { useMemo, Suspense } from 'react';
import ChessPiece3D from './ChessPiece3D';
import { get3DPosition } from '../utils/boardUtils';

const SQUARE_SIZE = 1;
const PIECE_HEIGHT = 0.75; // Height above board surface - raised from 0.65 to sit better on the board

export default function ChessPieces({ board, whiteToMove, selectedSquare, onPieceClick, allowMoves, lastMove }) {
  const pieces = useMemo(() => {
    const piecesList = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece !== '.') {
          const pos = get3DPosition(row, col, SQUARE_SIZE);
          const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
          const isWhite = piece[0] === 'w';
          const canMove = allowMoves && (isWhite === whiteToMove);
          
          // Check if this piece was just moved - start from source position and animate to destination
          let startPosition = { ...pos, y: PIECE_HEIGHT };
          let targetPosition = null;
          if (lastMove && lastMove.from && lastMove.to && 
              lastMove.to.row === row && lastMove.to.col === col) {
            // This piece was just moved - start from source position
            const sourcePos = get3DPosition(lastMove.from.row, lastMove.from.col, SQUARE_SIZE);
            startPosition = { ...sourcePos, y: PIECE_HEIGHT };
            targetPosition = { ...pos, y: PIECE_HEIGHT };
          }
          
          piecesList.push({
            piece,
            row,
            col,
            position: startPosition,
            targetPosition,
            isSelected,
            canMove
          });
        }
      }
    }
    return piecesList;
  }, [board, selectedSquare, whiteToMove, allowMoves, lastMove]);

  return (
    <group>
      {pieces.map((p) => {
        // Use a stable key based on piece type and current position
        // This helps React track pieces during moves without unmounting/remounting
        // Include targetPosition in key if it exists to help with animation
        const pieceKey = `${p.piece}-${p.row}-${p.col}${p.targetPosition ? '-moving' : ''}`;
        return (
          <Suspense key={pieceKey} fallback={null}>
            <ChessPiece3D
              piece={p.piece}
              position={p.position}
              targetPosition={p.targetPosition}
              isSelected={p.isSelected}
              canMove={p.canMove}
              onClick={() => {
                if (p.canMove) {
                  onPieceClick(p.row, p.col);
                }
              }}
            />
          </Suspense>
        );
      })}
    </group>
  );
}

