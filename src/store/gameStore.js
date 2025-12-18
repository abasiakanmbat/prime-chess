import { create } from 'zustand';
import { INITIAL_BOARD } from '../utils/constants';
import { getMoves, makeMove, boardToFEN, parseFEN, inCheck, findKing } from '../utils/chessEngine';
import { RepetitionTracker } from '../utils/drawRules';
import { getMoveNotation } from '../utils/moveNotation';

export const useGameStore = create((set, get) => ({
  // Board state
  board: INITIAL_BOARD,
  whiteToMove: true,
  selectedSquare: null,
  legalMoves: [],
  allowMoves: false,
  inCheck: false,
  checkSquare: null,
  
  // Game state
  gameCode: '',
  playerColor: null,
  timeControl: null, // No default - will be set from server
  gameStarted: false,
  gameOver: false,
  gameResult: null,
  bothPlayersJoined: false, // Track if both players have joined
  repetitionTracker: new RepetitionTracker(),
  drawOffer: null, // { from: 'white' | 'black', pending: boolean }
  moveHistory: [], // Array of { move: string, notation: string, turn: number, inCheck: boolean, capturedPiece: string }
  capturedPieces: { white: [], black: [] }, // Array of captured pieces for each side
  illegalMoves: { white: 0, black: 0 }, // Track illegal move counts for each player
  
  // Actions
  setGameCode: (code) => set({ gameCode: code }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setTimeControl: (tc) => set({ timeControl: tc }),
  setGameStarted: (started) => set({ gameStarted: started }),
  setAllowMoves: (allow) => set({ allowMoves: allow }),
  setBothPlayersJoined: (joined) => set({ bothPlayersJoined: joined }),
  
  selectSquare: (row, col) => {
    const { board, whiteToMove, selectedSquare, playerColor } = get();
    const piece = board[row][col];
    
    // Check if it's the player's turn
    const isPlayerTurn = (whiteToMove && playerColor === 'white') || 
                        (!whiteToMove && playerColor === 'black');
    
    if (!isPlayerTurn) {
      console.log('Not player turn', { whiteToMove, playerColor });
      return null;
    }
    
    // If clicking the same square, deselect
    if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
      set({ selectedSquare: null, legalMoves: [] });
      return null;
    }
    
    // If clicking own piece, select it
    if (piece !== '.' && 
        ((whiteToMove && piece[0] === 'w') || (!whiteToMove && piece[0] === 'b'))) {
      const moves = getMoves(row, col, board, whiteToMove);
      console.log('Selecting piece:', { row, col, piece, moves });
      set({ selectedSquare: { row, col }, legalMoves: moves });
      return null; // Return null to indicate selection, not a move
    }
    
    // If a square is selected, try to make a move (legal or illegal)
    if (selectedSquare) {
      const currentLegalMoves = get().legalMoves;
      const isLegalMove = currentLegalMoves.some(m => m[0] === row && m[1] === col);
      console.log('Attempting move:', { 
        from: selectedSquare, 
        to: { row, col }, 
        legalMoves: currentLegalMoves, 
        isLegal: isLegalMove 
      });
      
      // Allow move attempt regardless of legality (legal or illegal)
      // The Game component will handle illegal moves with snap-back
      const moveData = { from: selectedSquare, to: { row, col } };
      // Clear selection immediately
      set({ selectedSquare: null, legalMoves: [] });
      return moveData;
    }
    
    // Clicking empty square with nothing selected - deselect
    set({ selectedSquare: null, legalMoves: [] });
    return null;
  },
  
  applyMove: (fromRow, fromCol, toRow, toCol) => {
    const { board, whiteToMove, moveHistory } = get();
    const newBoard = makeMove(board, fromRow, fromCol, toRow, toCol);
    const newWhiteToMove = !whiteToMove;
    
    // Check if the opponent (player whose turn it is now) is in check after the move
    // This is correct: if white just moved, newWhiteToMove = false (black's turn), 
    // so we check if black is in check
    const checkState = inCheck(newBoard, newWhiteToMove);
    let checkSquare = null;
    if (checkState) {
      const king = findKing(newBoard, newWhiteToMove);
      if (king) {
        checkSquare = { row: king[0], col: king[1] };
      }
    }
    
    // Add move to history
    const moveNotation = getMoveNotation(board, fromRow, fromCol, toRow, toCol, newBoard, checkState);
    const turnNumber = Math.floor(moveHistory.length / 2) + 1;
    const newMoveHistory = [...moveHistory, {
      move: `${fromRow},${fromCol}->${toRow},${toCol}`,
      notation: moveNotation,
      turn: whiteToMove ? turnNumber : undefined
    }];
    
    set({ 
      board: newBoard, 
      whiteToMove: newWhiteToMove,
      selectedSquare: null,
      legalMoves: [],
      inCheck: checkState,
      checkSquare: checkSquare,
      moveHistory: newMoveHistory
    });
  },
  
  applyFEN: (fen, newWhiteToMove = null, moveInfo = null) => {
    try {
      console.log('applyFEN called with:', { fen, newWhiteToMove, moveInfo });
      const newBoard = parseFEN(fen);
      console.log('Parsed board:', newBoard);
      
      const { whiteToMove, moveHistory, board: oldBoard } = get();
      
      // Update turn if provided, otherwise toggle it (for move updates)
      const updatedWhiteToMove = newWhiteToMove !== null ? newWhiteToMove : !whiteToMove;
      
      // If moveInfo is provided, add to move history
      let newMoveHistory = moveHistory;
      let moveCheckState = false;
      let newCapturedPieces = get().capturedPieces || { white: [], black: [] };
      
      if (moveInfo && moveInfo.fromRow !== undefined && moveInfo.fromCol !== undefined) {
        const { fromRow, fromCol, toRow, toCol } = moveInfo;
        const turnNumber = Math.floor(moveHistory.length / 2) + 1;
        const wasWhiteMove = !updatedWhiteToMove; // If it's now black's turn, white just moved
        
        // Check if a piece was captured
        const capturedPiece = oldBoard[toRow] && oldBoard[toRow][toCol] && oldBoard[toRow][toCol] !== '.' ? oldBoard[toRow][toCol] : null;
        if (capturedPiece && capturedPiece.length >= 2) {
          // Add to captured pieces (opposite color of the capturing piece)
          const capturingPiece = oldBoard[fromRow][fromCol];
          if (capturingPiece && capturingPiece.length >= 2) {
            const isWhiteCapturing = capturingPiece[0] === 'w';
            const capturedPieceType = capturedPiece[1]; // P, R, N, B, Q, K
            if (capturedPieceType) {
              if (isWhiteCapturing) {
                newCapturedPieces = {
                  ...newCapturedPieces,
                  black: [...newCapturedPieces.black, capturedPieceType]
                };
              } else {
                newCapturedPieces = {
                  ...newCapturedPieces,
                  white: [...newCapturedPieces.white, capturedPieceType]
                };
              }
              console.log('Captured piece added:', { capturedPiece, capturedPieceType, isWhiteCapturing, newCapturedPieces });
            }
          }
        }
        
        // Check if the move put the opponent in check (the player whose turn it is now)
        moveCheckState = inCheck(newBoard, updatedWhiteToMove);
        const moveNotation = getMoveNotation(oldBoard, fromRow, fromCol, toRow, toCol, newBoard, moveCheckState);
        
        newMoveHistory = [...moveHistory, {
          move: `${fromRow},${fromCol}->${toRow},${toCol}`,
          notation: moveNotation,
          turn: wasWhiteMove ? turnNumber : undefined,
          inCheck: moveCheckState,
          capturedPiece: capturedPiece || null
        }];
        
        console.log('Added move to history:', { moveNotation, turnNumber, wasWhiteMove, checkState: moveCheckState, capturedPiece });
      }
      
      // Check if the player whose turn it is is in check
      // updatedWhiteToMove indicates whose turn it is, so check that player
      const checkState = moveInfo ? moveCheckState : inCheck(newBoard, updatedWhiteToMove);
      let checkSquare = null;
      if (checkState) {
        const king = findKing(newBoard, updatedWhiteToMove);
        if (king) {
          checkSquare = { row: king[0], col: king[1] };
        }
      }
      
      console.log('Updating board state:', { 
        whiteToMove: updatedWhiteToMove, 
        inCheck: checkState, 
        checkSquare,
        moveHistoryLength: newMoveHistory.length
      });
      
      set({ 
        board: newBoard,
        whiteToMove: updatedWhiteToMove,
        inCheck: checkState,
        checkSquare: checkSquare,
        selectedSquare: null,
        legalMoves: [],
        moveHistory: newMoveHistory,
        capturedPieces: newCapturedPieces
      });
      
      // Verify the update
      const updatedState = get();
      console.log('Board state updated. New board:', updatedState.board, 'History:', updatedState.moveHistory);
    } catch (error) {
      console.error('Error parsing FEN:', error, { fen });
    }
  },
  
  setGameOver: (result, reason) => {
    set({ gameOver: true, gameResult: { result, reason } });
  },
  
  setDrawOffer: (offer) => set({ drawOffer: offer }),
  clearDrawOffer: () => set({ drawOffer: null }),
  setIllegalMove: (color) => {
    const { illegalMoves } = get();
    set({ 
      illegalMoves: { 
        ...illegalMoves, 
        [color]: (illegalMoves[color] || 0) + 1 
      } 
    });
  },
  
  reset: () => {
    const tracker = new RepetitionTracker();
    set({
      board: INITIAL_BOARD,
      whiteToMove: true,
      selectedSquare: null,
      legalMoves: [],
      allowMoves: false,
      gameStarted: false,
      gameOver: false,
      gameResult: null,
      repetitionTracker: tracker,
      inCheck: false,
      checkSquare: null,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      illegalMoves: { white: 0, black: 0 },
      timeControl: null, // Reset to null
      gameCode: '',
      playerColor: null,
    });
  },
}));

