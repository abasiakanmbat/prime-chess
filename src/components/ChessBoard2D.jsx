import { useMemo, useRef, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import ChessPieces2D from './ChessPieces2D';
import CapturedPieces from './CapturedPieces';

// Board art proportions (PNG): tune playable area so pieces land within the dotted grid
// Independent X/Y offsets allow precise centering when the PNG border isn't perfectly uniform
const BOARD_PLAYABLE_RATIO = 0.75; // ~505px of 640px - scale of the 8x8 grid
const BOARD_OFFSET_X_RATIO = 0.125; // Left offset - tune ±0.001 to align horizontally
const BOARD_OFFSET_Y_RATIO = 0.122; // Top offset - tune ±0.001 to align vertically

function Square({ 
  row, 
  col,
  isLight,
  isSelected, 
  onClick, 
  allowMoves,
  squareSize,
  displayRow,
  displayCol
}) {
  const top = displayRow * squareSize;
  const left = displayCol * squareSize;

  return (
    <div
      className={`absolute transition-colors duration-150 ${
        allowMoves ? 'cursor-pointer' : 'cursor-default'
      }`}
      onClick={() => allowMoves && onClick(row, col)}
      style={{ 
        top: `${top}px`,
        left: `${left}px`,
        width: `${squareSize}px`, 
        height: `${squareSize}px`,
        backgroundColor: 'transparent'
      }}
    >
      {/* Selection highlight */}
      {isSelected && (
        <div 
          className="absolute inset-0 bg-yellow-300 opacity-40 pointer-events-none"
        />
      )}
    </div>
  );
}

export default function ChessBoard2D({ 
  board, 
  whiteToMove, 
  selectedSquare, 
  legalMoves,
  checkSquare,
  onSquareClick,
  allowMoves,
  lastMove
}) {
  // Determine if we should flip the board (black player perspective)
  const playerColor = useGameStore(state => state.playerColor);
  const shouldFlip = playerColor === 'black';
  
  const boardRef = useRef(null);
  const [squareSize, setSquareSize] = useState(0);
  const [boardSize, setBoardSize] = useState(0);
  const [boardOffsetX, setBoardOffsetX] = useState(0);
  const [boardOffsetY, setBoardOffsetY] = useState(0);
  
  // Dynamic board sizing based on actual rendered container size so pieces stay aligned
  // Works responsively and avoids assumptions about board artwork padding/borders
  useEffect(() => {
    if (!boardRef.current) return;

    // Use ResizeObserver for accurate sizing on window resize and layout shifts
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const size = entry.contentRect.width;
        if (size > 0) {
          const playableSize = size * BOARD_PLAYABLE_RATIO;
          setBoardSize(size);
          setSquareSize(playableSize / 8);
          setBoardOffsetX(size * BOARD_OFFSET_X_RATIO);
          setBoardOffsetY(size * BOARD_OFFSET_Y_RATIO);
        }
      }
    });

    resizeObserver.observe(boardRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const squares = useMemo(() => {
    const sqs = [];
    // Render squares in display order (accounting for flip)
    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const row = shouldFlip ? 7 - displayRow : displayRow;
        const col = shouldFlip ? 7 - displayCol : displayCol;
        const isLight = (row + col) % 2 === 0;
        const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
        const isLegalMove = legalMoves?.some(m => m[0] === row && m[1] === col);
        const isInCheck = checkSquare && checkSquare.row === row && checkSquare.col === col;
        
        sqs.push({
          row,
          col,
          displayRow,
          displayCol,
          isLight,
          isSelected,
          isLegalMove,
          isInCheck
        });
      }
    }
    return sqs;
  }, [selectedSquare, legalMoves, checkSquare, shouldFlip]);

  return (
    <div className="relative ">
      <div className='absolute top-3 z-50 flex justify-center w-full max-md:hidden'>
            <CapturedPieces color="black" />
      </div>
         <div className='absolute bottom-3 z-50 flex justify-center w-full  max-md:hidden'>
            <CapturedPieces color="white" />
      </div>
      {/* Chess board with your custom designed board image */}
      <div
        ref={boardRef}
        className="relative bg-gray-800"
        style={{
          width: 'min(92vw, 660px)',
          aspectRatio: '1 / 1',
          maxWidth: '960px',
          height: boardSize ? `${boardSize}px` : 'auto'
        }}
      >
        {/* Your custom board background image */}
        <img 
          src="/chessboard-red.svg"
          alt="Chess board"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'contain', pointerEvents: 'none' }}
          draggable={false}
          onError={(e) => console.error('Board image failed to load:', e)}
        />
        
        {/* PrimeChess watermark */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 opacity-30 font-workforce tracking-wider pointer-events-none">
          PRIME CHESS
        </div>
          
        {/* Transparent click targets overlay - no grid, pure absolute positioning */}
        {squareSize > 0 && (
          <div className="absolute" style={{ 
            top: `${boardOffsetY}px`,
            left: `${boardOffsetX}px`, 
            width: `${squareSize * 8}px`,
            height: `${squareSize * 8}px`
          }}>
            {squares.map((square) => {
              const displayRow = shouldFlip ? 7 - square.row : square.row;
              const displayCol = shouldFlip ? 7 - square.col : square.col;
              return (
                <Square
                  key={`${square.row}-${square.col}`}
                  row={square.row}
                  col={square.col}
                  isLight={square.isLight}
                  isSelected={square.isSelected}
                  onClick={onSquareClick}
                  allowMoves={allowMoves}
                  squareSize={squareSize}
                  displayRow={displayRow}
                  displayCol={displayCol}
                />
              );
            })}
          </div>
        )}

        {/* Chess pieces overlay - positioned absolutely with offset for board border */}
        {squareSize > 0 && (
          <div className="absolute" style={{ 
            pointerEvents: 'none',
            top: `${boardOffsetY}px`,
            left: `${boardOffsetX}px`,
            width: `${squareSize * 8}px`,
            height: `${squareSize * 8}px`
          }}>
          <ChessPieces2D
            board={board}
            whiteToMove={whiteToMove}
            selectedSquare={selectedSquare}
            onPieceClick={onSquareClick}
            allowMoves={allowMoves}
            lastMove={lastMove}
            shouldFlip={shouldFlip}
            squareSize={squareSize}
          />
        </div>
        )}
      </div>
    </div>
  );
}
