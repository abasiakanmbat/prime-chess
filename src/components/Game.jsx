import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import ChessBoard2D from './ChessBoard2D';
import GameTimer from './GameTimer';
import GameControls from './GameControls';
import CountdownOverlay from './CountdownOverlay';
import GameOverModal from './GameOverModal';
import MoveHistory from './MoveHistory';
import CapturedPieces from './CapturedPieces';
import ErrorModal from './ErrorModal';
import { getMoves, makeMove, boardToFEN } from '../utils/chessEngine';
import { evaluateDraw } from '../utils/drawRules';
import { playSound, preloadCommonSounds, getSoundUrl } from '../utils/sounds';
import { isCheckmate } from '../utils/checkmate';
import { generatePGN } from '../../utils/PGN.js';
import { INITIAL_BOARD } from '../utils/constants';

export default function Game() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameCode = searchParams.get('code');
  const playerColorFromUrl = searchParams.get('color'); // May be null for joiners
  const [playerColor, setPlayerColorState] = useState(playerColorFromUrl);
  
  // Note: timeControl will be set from server's gameState event (source of truth)
  // The server sends the timeControl that was provided when the game was created
  
  const socket = useSocket();
  const board = useGameStore(state => state.board);
  const whiteToMove = useGameStore(state => state.whiteToMove);
  const selectedSquare = useGameStore(state => state.selectedSquare);
  const allowMoves = useGameStore(state => state.allowMoves);
  const timeControl = useGameStore(state => state.timeControl);
  const gameOver = useGameStore(state => state.gameOver);
  const gameResult = useGameStore(state => state.gameResult);
  const inCheck = useGameStore(state => state.inCheck);
  const checkSquare = useGameStore(state => state.checkSquare);
  const moveHistory = useGameStore(state => state.moveHistory);
  const capturedPieces = useGameStore(state => state.capturedPieces);
  const gameStarted = useGameStore(state => state.gameStarted);
  const bothPlayersJoined = useGameStore(state => state.bothPlayersJoined);
  const illegalMoves = useGameStore(state => state.illegalMoves);
  const setIllegalMove = useGameStore(state => state.setIllegalMove);
  
  const setGameCode = useGameStore(state => state.setGameCode);
  const setPlayerColorStore = useGameStore(state => state.setPlayerColor);
  const setTimeControl = useGameStore(state => state.setTimeControl);
  const setGameStarted = useGameStore(state => state.setGameStarted);
  const setAllowMoves = useGameStore(state => state.setAllowMoves);
  const setBothPlayersJoined = useGameStore(state => state.setBothPlayersJoined);
  const selectSquare = useGameStore(state => state.selectSquare);
  const applyMove = useGameStore(state => state.applyMove);
  const applyFEN = useGameStore(state => state.applyFEN);
  const setGameOver = useGameStore(state => state.setGameOver);
  const repetitionTracker = useGameStore(state => state.repetitionTracker);
  const resetGameStore = useGameStore(state => state.reset);

  const [showCountdown, setShowCountdown] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastMove, setLastMove] = useState(null);
  const [gamePGN, setGamePGN] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state to prevent premature errors
  const errorTimeoutRef = useRef(null); // Use ref for timeout to avoid dependency issues
  const countdownStartedRef = useRef(false); // Track if countdown has been started to avoid duplicate triggers
  const timeControlSoundPlayedRef = useRef(false); // Track if time control sound has been played for this player

  // Track previous gameCode to detect when it changes
  const prevGameCodeRef = useRef(null);

  // Cleanup effect: Reset timeControl when leaving game
  useEffect(() => {
    return () => {
      // When component unmounts, reset timeControl to null
      // This ensures a clean state when navigating away
      setTimeControl(null);
    };
  }, [setTimeControl]);

  useEffect(() => {
    if (!gameCode) {
      navigate('/');
      return;
    }
    
    // Detect if this is a new game (gameCode changed)
    const isNewGame = prevGameCodeRef.current !== null && prevGameCodeRef.current !== gameCode;
    
    // CRITICAL: Reset all game state when creating/joining a new game
    // This ensures the board starts from the initial position, not the previous game's state
    if (isNewGame) {
      console.log('New game detected, resetting game state', { oldCode: prevGameCodeRef.current, newCode: gameCode });
      resetGameStore();
      // Also reset local component state
      setShowCountdown(false);
      setTimerActive(false);
      // setDrawOffer(null);
      setLastMove(null);
      setGamePGN(null);
      setError(null);
      setIsLoading(true);
      countdownStartedRef.current = false; // Reset countdown flag for new game
      timeControlSoundPlayedRef.current = false; // Reset time control sound flag for new game
    }
    
    // Note: timeControl will be set from server's gameState event (source of truth)
    // The server sends the timeControl that was provided when the game was created
    // We don't set it from URL here - we wait for the server to send it
    
    setGameCode(gameCode);
    prevGameCodeRef.current = gameCode;
    
    if (playerColor) {
      setPlayerColorState(playerColor);
      setPlayerColorStore(playerColor);
    }
    preloadCommonSounds();
  }, [gameCode, navigate, setGameCode, setPlayerColorStore, searchParams, setTimeControl, resetGameStore]);
  
  // Listen for color assignment from server
  useSocketEvent(socket, 'colorAssigned', ({ color }) => {
    console.log('Color assigned by server:', color);
    setPlayerColorState(color);
    setPlayerColorStore(color);
  });

  // Socket event handlers
  useSocketEvent(socket, 'playerJoined', (data) => {
    const bothJoined = data.white && data.black;
    setBothPlayersJoined(bothJoined);
    // Don't trigger countdown here - only server's introStart event should trigger it
    // This ensures countdown only starts when BOTH players are actually connected
    console.log('Player joined event:', { bothJoined, white: data.white, black: data.black });
  });

  useSocketEvent(socket, 'introStart', () => {
    console.log('Received introStart event - both players connected, starting introduction sequence');
    const currentGameStarted = useGameStore.getState().gameStarted;
    
    // Only start countdown if game hasn't started yet and countdown hasn't been started
    if (!currentGameStarted && !countdownStartedRef.current) {
      countdownStartedRef.current = true; // Mark as started to prevent duplicate triggers
      
      // The time control sound should have already played for both players via GameTimer:
      // - Player A: heard it when they first joined (GameTimer plays when timeControl is received)
      // - Player B: heard it when they first joined (GameTimer plays when timeControl is received)
      // 
      // When introStart is received, both players are connected. We just need to start
      // the countdown for both players. The time control sound has already been played
      // individually for each player when they joined.
      //
      // We wait a bit to ensure Player B's time control sound has finished playing
      // before starting the introduction countdown for both players.
      
      const startCountdownSequence = () => {
        // Play introduction sound and start countdown for BOTH players
        playSound('announce_introduction.mp3');
        setShowCountdown(true);
      };
      
      // Give a delay to ensure any time control sound that's still playing can finish
      // This is especially important for Player B who just joined
      // Player A has already heard it, but we wait to ensure Player B's sound has finished
      setTimeout(() => {
        startCountdownSequence();
      }, 1500); // Wait 1.5 seconds to ensure time control sound has finished (if it was still playing)
    }
  });

  useSocketEvent(socket, 'moveMade', ({ move, fen, whiteTime, blackTime }) => {
    console.log('Received moveMade event:', { move, fen, whiteTime, blackTime });
    
    if (!move || !fen) {
      console.error('Invalid moveMade event:', { move, fen });
      return;
    }
    
    // Parse move string like "0,0->1,1"
    const [from, to] = move.split('->');
    if (!from || !to) {
      console.error('Invalid move format:', move);
      return;
    }
    
    const [fromRow, fromCol] = from.split(',').map(Number);
    const [toRow, toCol] = to.split(',').map(Number);
    
    if (isNaN(fromRow) || isNaN(fromCol) || isNaN(toRow) || isNaN(toCol)) {
      console.error('Invalid move coordinates:', { fromRow, fromCol, toRow, toCol });
      return;
    }
    
    // Determine if it was a capture (before applying move) - use current board state
    const currentBoard = useGameStore.getState().board;
    const capturedPiece = currentBoard[toRow] && currentBoard[toRow][toCol] && currentBoard[toRow][toCol] !== '.';
    
    console.log('Applying move:', { fromRow, fromCol, toRow, toCol, capturedPiece, fen });
    
    // Set last move for animation BEFORE updating board
    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
    
    // Use FEN as single source of truth - don't call applyMove, only applyFEN
    // Use a small timeout to ensure lastMove is set and React has time to process before board update
    setTimeout(() => {
      // Only apply FEN - server is source of truth
      // Update turn automatically (alternating)
      const currentWhiteToMove = useGameStore.getState().whiteToMove;
      console.log('Applying FEN, updating turn from', currentWhiteToMove, 'to', !currentWhiteToMove);
      try {
        // Pass move info to update history
        applyFEN(fen, !currentWhiteToMove, {
          fromRow,
          fromCol,
          toRow,
          toCol
        });
        console.log('FEN applied successfully, new board:', useGameStore.getState().board);
      } catch (error) {
        console.error('Error applying FEN:', error, { fen });
      }
    }, 20);
    
    // Sync timer state from server (includes increment already applied)
    if (window.gameTimer && whiteTime !== undefined && blackTime !== undefined) {
      const timeControl = useGameStore.getState().timeControl;
      const increment = timeControl ? (parseInt(timeControl.split('+')[1]) * 1000) : 10000;
      window.gameTimer.restoreState(whiteTime, blackTime, increment, !useGameStore.getState().whiteToMove);
    } else if (window.gameTimer) {
      // Fallback: apply increment locally if server didn't send timer state
      window.gameTimer.applyIncrement();
    }
    
    // Get updated state after move
    setTimeout(() => {
      const newBoard = useGameStore.getState().board;
      const newWhiteToMove = useGameStore.getState().whiteToMove;
      const newInCheck = useGameStore.getState().inCheck;
      
      // Play capture sound only (move sound removed)
      if (capturedPiece) {
        playSound('capture.mp3');
      }else {
        playSound('select.mp3');
      }
      
      // Play check/checkmate sound
      if (newInCheck) {
        const isMate = isCheckmate(newBoard, newWhiteToMove);
        if (isMate) {
          playSound(newWhiteToMove ? 'checkmate_white.mp3' : 'checkmate_black.mp3');
          // Checkmate ends the game
          setTimeout(() => {
            if (socket) {
              socket.emit('gameOver', {
                code: gameCode,
                result: newWhiteToMove ? '0-1' : '1-0',
                reason: 'Checkmate'
              });
            }
          }, 500);
        } else {
          playSound('check.mp3');
        }
      }
      
      // Check for draws after move (75-move rule is handled server-side)
      evaluateDraw(newBoard, newWhiteToMove, repetitionTracker, gameCode, socket, playSound);
      
      // Clear last move after animation
      setTimeout(() => setLastMove(null), 350);
    }, 50);
  });

  useSocketEvent(socket, 'illegalMovePenalty', ({ color, remaining }) => {
    if (window.gameTimer) {
      window.gameTimer.applyIllegalPenalty(color, remaining);
    }
    playSound('illegal_move.mp3');
    
    // Update illegal move count in store
    setIllegalMove(color);
    
    // Ensure board state doesn't change - reset selection if needed
    useGameStore.setState({ selectedSquare: null, legalMoves: [] });
    
    // Clear lastMove if it was set for an illegal move
    setLastMove(null);
  });

  useSocketEvent(socket, 'gameOver', ({ result, reason }) => {
    setGameOver(result, reason);
    setTimerActive(false);
    
    // Generate PGN when game ends
    const currentMoveHistory = useGameStore.getState().moveHistory;
    const currentTimeControl = useGameStore.getState().timeControl;
    const currentGameCode = useGameStore.getState().gameCode;
    
    // Convert moveHistory to moves array for PGN (use notation)
    const moves = currentMoveHistory.map(m => m.notation || m.move);
    
    const matchData = {
      moves: moves,
      timeControl: currentTimeControl,
      code: currentGameCode,
      completed: true
    };
    
    const pgn = generatePGN(matchData);
    setGamePGN(pgn);
  });

  useSocketEvent(socket, 'gameState', (data) => {
    // Receive full game state when joining/reconnecting
    const { 
      fen, 
      timeControl: tc, 
      whiteToMove: wtm,
      gameStarted: gs,
      timerActive: ta,
      whiteTime: wt,
      blackTime: bt,
      increment: inc,
      moveHistory: mh,
      capturedPieces: cp,
      inCheck: ic,
      checkSquare: cs,
      gameOver: go,
      gameResult: gr,
      drawOffer: drawOfferState,
      white,
      black,
      illegalMoves: illegalMovesState
    } = data;
    
    // Update bothPlayersJoined state
    const bothJoined = white !== null && black !== null;
    setBothPlayersJoined(bothJoined);
    
    // Mark as loaded once we receive game state
    setIsLoading(false);
    
    // Don't trigger countdown from gameState - only server's introStart event should trigger it
    // This ensures countdown only starts when BOTH players are actually connected
    // Just update the bothPlayersJoined state
    if (bothJoined && gs) {
      // Game already started, make sure countdown is hidden
      setShowCountdown(false);
    }
    
    console.log('Received full gameState:', { fen, tc, wtm, gs, ta, wt, bt });
    console.log('Full gameState data:', data);
    
    // CRITICAL: Always set time control from server (server is source of truth)
    // This is the timeControl that was provided when the game was created
    if (tc) {
      // Normalize timeControl: handle spaces (URL encoding converts + to space)
      // Convert any spaces back to + for consistency
      const normalizedTc = typeof tc === 'string' ? tc.trim().replace(/\s+/g, '+') : tc;
      console.log('Game: Setting timeControl from server:', tc, '-> normalized:', normalizedTc);
      useGameStore.setState({ timeControl: normalizedTc });
      setTimeControl(normalizedTc);
    } else {
      console.warn('Game: No timeControl received from server!', { tc, data });
    }
    
    // Apply FEN if provided and not empty (empty FEN means new game - board should be reset)
    // For new games, fen will be empty string, so we ensure board is at initial position
    if (fen && fen.trim() !== '') {
      applyFEN(fen, wtm); // Explicitly set turn from server
    } else {
      // New game with empty FEN - ensure board is at initial position
      // This is a safety check to ensure board is reset even if reset() wasn't called yet
      console.log('Empty FEN detected for new game, ensuring board is at initial position');
      useGameStore.setState({ 
        board: INITIAL_BOARD, 
        whiteToMove: wtm !== undefined ? wtm : true,
        moveHistory: mh || [],
        capturedPieces: cp || { white: [], black: [] },
        inCheck: false,
        checkSquare: null,
        selectedSquare: null,
        legalMoves: []
      });
    }
    if (gs !== undefined) {
      setGameStarted(gs);
      // Enable moves when game has started and both players joined
      if (gs && bothJoined) {
        setAllowMoves(true);
      }
    }
    if (ta !== undefined) {
      setTimerActive(ta);
    }
    
    // CRITICAL: Restore timer state from server (always, if values are provided)
    // This ensures timer is restored on page reload/reconnection
    // Don't wait for timerActive - restore immediately if we have the values
    if (wt !== undefined && bt !== undefined && inc !== undefined && window.gameTimer) {
      console.log('Game: Restoring timer state from server', { wt, bt, inc, ta, gs });
      // Use setTimeout to ensure GameTimer component is ready
      setTimeout(() => {
        if (window.gameTimer) {
          window.gameTimer.restoreState(wt, bt, inc, wtm);
        }
      }, 100);
    }
    
    // Restore move history and captured pieces
    if (mh) {
      useGameStore.setState({ moveHistory: mh });
    }
    if (cp) {
      useGameStore.setState({ capturedPieces: cp });
    }
    
    // Restore check state
    if (ic !== undefined) {
      useGameStore.setState({ inCheck: ic, checkSquare: cs });
    }
    
    // Restore game over state
    if (go && gr) {
      setGameOver(gr.result, gr.reason);
      setTimerActive(false);
    }
    
    // Restore draw offer
    // if (drawOfferState) {
    //   setDrawOffer(drawOfferState);
    // }
    
    // Restore illegal move counts
    if (illegalMovesState) {
      useGameStore.setState({ illegalMoves: illegalMovesState });
    }
    
    // Restore illegal move counts
    if (illegalMovesState) {
      useGameStore.setState({ illegalMoves: illegalMovesState });
    }
  });
  
  // Listen for timer sync from server (authoritative timer state)
  useSocketEvent(socket, 'gameCancelled', () => {
    setError('Game was cancelled by another player.');
    setTimeout(() => navigate('/'), 2000);
  });

  useSocketEvent(socket, 'cancelGameError', ({ message }) => {
    setError(message || 'Failed to cancel game.');
  });

  useSocketEvent(socket, 'timerSync', ({ whiteTime, blackTime }) => {
    if (window.gameTimer && whiteTime !== undefined && blackTime !== undefined) {
      // Restore timer state from server (times are in milliseconds)
      const whiteSeconds = Math.floor(whiteTime / 1000);
      const blackSeconds = Math.floor(blackTime / 1000);
      
      // Only update if there's a significant difference to avoid jitter
      const currentTimes = window.gameTimer.getCurrentTimes();
      const currentWhiteSeconds = Math.floor(currentTimes.whiteTime / 1000);
      const currentBlackSeconds = Math.floor(currentTimes.blackTime / 1000);
      
      // Update if difference is more than 1 second (to avoid constant updates from minor drift)
      if (Math.abs(whiteSeconds - currentWhiteSeconds) > 1 || 
          Math.abs(blackSeconds - currentBlackSeconds) > 1) {
        window.gameTimer.restoreState(whiteTime, blackTime, 
          useGameStore.getState().timeControl ? 
            (parseInt(useGameStore.getState().timeControl.split('+')[1]) * 1000) : 10000,
          useGameStore.getState().whiteToMove);
      }
    }
  });

  // Sync timer state to server periodically
  useEffect(() => {
    if (!socket || !gameCode || !timerActive) return;
    
    const syncTimer = setInterval(() => {
      if (window.gameTimer) {
        const { whiteTime, blackTime } = window.gameTimer.getCurrentTimes();
        if (socket && socket.connected) {
          socket.emit('timerUpdate', { code: gameCode, whiteTime, blackTime });
        }
      }
    }, 3000); // Sync every 3 seconds (more frequent for better sync)
    
    return () => clearInterval(syncTimer);
  }, [socket, gameCode, timerActive]);
  
  // Sync game state updates to server
  useEffect(() => {
    if (!socket || !gameCode || !gameStarted) return;
    
    const state = {
      moveHistory: useGameStore.getState().moveHistory,
      capturedPieces: useGameStore.getState().capturedPieces,
      inCheck: useGameStore.getState().inCheck,
      checkSquare: useGameStore.getState().checkSquare,
      whiteToMove: useGameStore.getState().whiteToMove
    };
    
    if (socket && socket.connected) {
      socket.emit('gameStateUpdate', { code: gameCode, state });
    }
  }, [socket, gameCode, gameStarted, moveHistory, capturedPieces, inCheck]);

  useEffect(() => {
    // Clear any existing error timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }

    if (!socket) {
      // Delay showing error to allow connection to establish (lazy load/timeout)
      errorTimeoutRef.current = setTimeout(() => {
        // Check again if socket is still null
        if (!socket) {
          setError('Failed to connect to server. Please refresh the page.');
          setConnectionStatus('disconnected');
          setIsLoading(false);
        }
      }, 2000); // Wait 2 seconds before showing error
      return () => {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
      };
    }

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setError(null);
      setIsLoading(false);
      // Clear any pending error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
      if (gameCode) {
        // Send playerColor if provided (creator), otherwise let server assign
        socket.emit('joinGame', { code: gameCode, playerColor: playerColor || null });
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      // Only show disconnect error if we're not in initial loading state
      const currentLoading = useGameStore.getState().gameStarted ? false : isLoading;
      if (!currentLoading) {
        setError('Connection lost. Attempting to reconnect...');
      }
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus('error');
      // Delay showing error to allow reconnection attempts
      errorTimeoutRef.current = setTimeout(() => {
        setError('Failed to connect to server. Please check your connection.');
        setIsLoading(false);
      }, 2000);
      console.error('Socket connection error:', err);
    });

    socket.on('invalidCode', () => {
      setIsLoading(false);
      setError('Invalid game code. Please check and try again.');
      setTimeout(() => navigate('/'), 2000);
    });

    if (socket.connected && gameCode) {
      // Send playerColor if provided (creator), otherwise let server assign
      socket.emit('joinGame', { code: gameCode, playerColor: playerColor || null });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('invalidCode');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, [socket, gameCode, playerColor, navigate, isLoading]);

  // Get time control from URL as fallback (server will send correct one via gameState)
  // This is just for initial display before server responds
  useEffect(() => {
    const tc = searchParams.get('timeControl');
    if (tc) {
      setTimeControl(tc);
    }
  }, [searchParams, setTimeControl]);

  const handleSquareClick = (row, col) => {
    // Validate game state before allowing moves
    if (!allowMoves || gameOver || !gameStarted || !bothPlayersJoined) {
      console.log('Moves not allowed', { allowMoves, gameOver, gameStarted, bothPlayersJoined });
      return;
    }
    
    // Prevent rapid clicks (debounce) - reduced for better responsiveness
    const now = Date.now();
    if (window.lastClickTime && (now - window.lastClickTime) < 50) {
      return; // Ignore clicks within 50ms of last click
    }
    window.lastClickTime = now;
    
    const currentPlayerColor = useGameStore.getState().playerColor;
    console.log('Square clicked:', { row, col, selectedSquare, whiteToMove, playerColor: currentPlayerColor });
    
    const moveData = selectSquare(row, col);
    
    // Play select/deselect sound
    if (moveData && moveData.from) {
      playSound('select.mp3');
    } else if (selectedSquare && !moveData) {
      playSound('deselect.mp3');
    }
    
    // If moveData is returned, it means a move was attempted
    if (moveData && moveData.from && moveData.to) {
      const { from, to } = moveData;
      
      // Check if move is legal
      const legalMovesForPiece = getMoves(from.row, from.col, board, whiteToMove);
      const isLegalMove = legalMovesForPiece.some(m => m[0] === to.row && m[1] === to.col);
      
      console.log('Processing move:', { 
        from, 
        to, 
        piece: board[from.row][from.col],
        legalMoves: legalMovesForPiece, 
        isLegal: isLegalMove,
        whiteToMove,
        board: board.map(r => r.join('')).join('/')
      });
      
      if (!isLegalMove) {
        // ILLEGAL MOVE - Allow it visually, then snap back
        console.warn('Illegal move detected:', { from, to, legalMoves: legalMovesForPiece });
        const playerColor = useGameStore.getState().playerColor;
        
        // Generate move for animation and penalty logic
        const illegalMoveString = `${from.row},${from.col}->${to.row},${to.col}`;
        
        // Apply move locally for snap-back animation
        const tempBoard = makeMove(board, from.row, from.col, to.row, to.col);
        const tempFEN = boardToFEN(tempBoard);
        
        // Show the illegal move visually
        setLastMove({ from: { row: from.row, col: from.col }, to: { row: to.row, col: to.col } });
        applyFEN(tempFEN, !whiteToMove);
        
        // Play illegal move sound
        playSound('illegal_move.mp3');
        
        // After snap-back delay, revert to original position
        setTimeout(() => {
          // Revert to original board state
          applyFEN(boardToFEN(board), whiteToMove);
          setLastMove(null);
          
          // Emit illegal move event to server for penalty
          if (socket && playerColor) {
            socket.emit('illegalMove', { code: gameCode, color: playerColor, move: illegalMoveString });
          }
        }, 600); // Snap back after 600ms animation
        
        return;
      }
      
      // LEGAL MOVE - Send to server
      const newBoard = makeMove(board, from.row, from.col, to.row, to.col);
      const newFEN = boardToFEN(newBoard);
      
      // Set lastMove immediately for local animation (before board updates)
      setLastMove({ from: { row: from.row, col: from.col }, to: { row: to.row, col: to.col } });
      
      const moveString = `${from.row},${from.col}->${to.row},${to.col}`;
      
      console.log('Sending move to server:', { 
        move: moveString, 
        fen: newFEN, 
        gameCode,
        fromBoard: boardToFEN(board),
        toBoard: newFEN
      });
      
      // Don't apply move locally - wait for server confirmation
      // The server will send back moveMade event which will apply the move
      if (socket && socket.connected) {
        socket.emit('makeMove', { code: gameCode, move: moveString, fen: newFEN });
        console.log('Move emitted to server');
      } else {
        console.error('Socket not connected or not available', { socket: !!socket, connected: socket?.connected });
        // If socket not connected, apply move locally as fallback
        applyFEN(newFEN, !whiteToMove);
      }
      
      // Clear lastMove after animation completes (will be reset by moveMade event)
      setTimeout(() => setLastMove(null), 400);
    }
  };

  const handleCountdownComplete = () => {
    // Validate that both players have joined before starting
    if (!bothPlayersJoined) {
      console.log('Cannot start game: both players not joined');
      setShowCountdown(false);
      return;
    }
    
    setShowCountdown(false);
    setGameStarted(true);
    setAllowMoves(true);
    setTimerActive(true);
    console.log('Countdown finished - game started, moves enabled');
    
    // Notify server that game has started
    if (socket && gameCode) {
      socket.emit('gameStarted', { code: gameCode });
    }
  };

  const handleResign = () => {
    // Only allow resign if game has started and both players joined
    if (!gameStarted || !bothPlayersJoined) {
      console.log('Cannot resign: game not started or players not joined');
      return;
    }
    if (socket) {
      playSound(playerColor === 'white' ? 'white_resigns.mp3' : 'black_resigns.mp3');
      socket.emit('resign', { code: gameCode, color: playerColor });
    }
  };

  const handleCancelGame = () => {
    if (socket && gameCode && !gameStarted) {
      socket.emit('cancelGame', { code: gameCode });
      navigate('/');
    }
  };

  const handleAcceptDraw = () => {
    // Draw functionality removed
  };

  const handleDeclineDraw = () => {
    // Draw functionality removed
  };

  const handleTimeFlag = (color) => {
    if (socket && gameCode) {
      playSound(color === 'white' ? 'white_time_flag.mp3' : 'black_time_flag.mp3');
      socket.emit('resign', { code: gameCode, color });
    }
  };

  // Removed backup countdown trigger - only server's introStart event should trigger countdown
  // This ensures countdown only starts when BOTH players are actually connected

  // Update legal moves when square is selected
  const currentLegalMoves = useGameStore(state => state.legalMoves);
  
  useEffect(() => {
    if (selectedSquare) {
      const moves = getMoves(selectedSquare.row, selectedSquare.col, board, whiteToMove);
      useGameStore.setState({ legalMoves: moves });
    } else {
      useGameStore.setState({ legalMoves: [] });
    }
  }, [selectedSquare, board, whiteToMove]);

  const handleCloseModal = () => {
    useGameStore.setState({ gameOver: false, gameResult: null });
    navigate('/');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver || !allowMoves) return;
      
      // ESC to deselect
      if (e.key === 'Escape' && selectedSquare) {
        useGameStore.setState({ selectedSquare: null, legalMoves: [] });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedSquare, gameOver, allowMoves]);

  const boardWidthStyle = { Width: 'min(92vw, 60px)' };

  return (
    <div className="h-fit lg:h-screen bg-black flex flex-col lg:flex-row ">
      {/* Left Sidebar - Narrow */}
      <div className="max-lg:order-2 w-full lg:w-72 bg-black p-6 flex flex-col gap-8 border-b lg:border-b-0">
        <div>
          <GameTimer 
            key={gameCode} 
            timeControl={timeControl} 
            whiteToMove={whiteToMove}
            onTimeFlag={handleTimeFlag}
            isActive={timerActive}
            gameCode={gameCode}
          />
        </div>
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={handleResign}
            disabled={!gameStarted || gameOver}
            className="w-full py-2 lg:w-32 lg:h-32 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-red-200 font-workforce font-bold rounded-lg lg:rounded-full text-2xl uppercase tracking-wider transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-red-900/50"
            style={{ boxShadow: '0 0 30px rgba(220, 38, 38, 0.5)', textShadow: '0 0 20px rgba(239, 68, 68, 1), 0 0 40px rgba(239, 68, 68, 0.8)' }}
          >
            RESIGN
          </button>
        </div>
        <div className="flex flex-col items-center gap-6 mt-auto">
          <button
            onClick={handleCancelGame}
            className="w-full bg-gray-800 hover:bg-gray-700 text-red-500 font-workforce font-semibold py-3 px-6 rounded-lg text-lg uppercase tracking-wide transition-colors border border-gray-700"
          >
            CANCEL GAME
          </button>
          <div className="w-full bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <div className="text-red-500 text-lg uppercase tracking-wider mb-2 font-workforce font-bold text-center" style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6)' }}>GAME CODE</div>
            <div className="text-white font-mono text-3xl font-bold tracking-widest text-center">{gameCode}</div>
          </div>
        </div>
      </div>

      {/* Main Board Area - Centered with captured pieces above/below */}
      <div className="max-lg:order-1 flex-1 relative bg-black  lg:min-h-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Black Captured Pieces - Above Board */}
          {/* <div className="h-16 flex items-center justify-center gap-2 px-4 w-full" style={boardWidthStyle}> */}
            {/* <CapturedPieces color="black" /> */}
          {/* </div> */}
          
          {/* Chess Board */}
          <div className="w-full" style={boardWidthStyle}>
            <ChessBoard2D
              board={board}
              whiteToMove={whiteToMove}
              selectedSquare={selectedSquare}
              legalMoves={currentLegalMoves}
              checkSquare={checkSquare}
              onSquareClick={handleSquareClick}
              allowMoves={allowMoves}
              lastMove={lastMove}
            />
          </div>
          
          {/* White Captured Pieces - Below Board */}
          {/* <div className=" h-16 flex items-center justify-center gap-2 px-4 w-full" style={boardWidthStyle}> */}
            {/* <CapturedPieces color="white" /> */}
          {/* </div> */}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="max-lg:order-3 w-full lg:w-80 bg-black p-6 flex flex-col items-center gap-6 border-t lg:border-t-0 overflow-y-scroll">
        <div className="w-full max-w-[320px] space-y-6 text-center mx-auto">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-2xl font-workforce font-bold text-white uppercase tracking-wider leading-none">GAME INFO</h3>
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-400/60 px-3 h-8 rounded-full leading-none relative" style={{ top: '2px' }}>
            <span className="inline-block w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-200 text-xs font-workforce font-bold uppercase">LIVE</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-3 shadow-inner">
            <div className="text-red-400 text-xs font-workforce uppercase tracking-[0.18em]" style={{textShadow:'0 0 10px rgba(248,113,113,0.7)'}}>
              TIME CONTROL
            </div>
            <div className="text-white font-mono text-2xl font-bold mt-1">{timeControl || '--'}</div>
          </div>
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-3 shadow-inner">
            <div className="text-red-400 text-xs font-workforce uppercase tracking-[0.18em]" style={{textShadow:'0 0 10px rgba(248,113,113,0.7)'}}>
              YOUR COLOR
            </div>
            <div className="text-white font-workforce text-2xl font-bold uppercase mt-1">{playerColor || '--'}</div>
          </div>
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-3 shadow-inner">
            <div className="text-red-400 text-xs font-workforce uppercase tracking-[0.18em]" style={{textShadow:'0 0 10px rgba(248,113,113,0.7)'}}>
              TURN
            </div>
            <div className="text-white font-workforce text-2xl font-bold uppercase mt-1">{whiteToMove ? 'WHITE' : 'BLACK'}</div>
            {inCheck && (
              <div className="text-red-400 text-xs font-workforce uppercase tracking-wide mt-1">CHECK</div>
            )}
          </div>
          <div className="bg-[#0d1117] border border-gray-800 rounded-lg px-4 py-3 shadow-inner">
            <div className="text-red-400 text-xs font-workforce uppercase tracking-[0.18em] mb-2" style={{textShadow:'0 0 10px rgba(248,113,113,0.7)'}}>
              ILLEGAL MOVES
            </div>
            <div className="space-y-2 text-white font-workforce text-base uppercase">
              <div className="flex flex-col items-center gap-1">
                <span>WHITE</span>
                <span className={`font-sans font-bold ${illegalMoves.white >= 9 ? 'text-red-400' : illegalMoves.white >= 1 ? 'text-orange-300' : 'text-gray-300'}`}>{illegalMoves.white}/9</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span>BLACK</span>
                <span className={`font-sans font-bold ${illegalMoves.black >= 9 ? 'text-red-400' : illegalMoves.black >= 1 ? 'text-orange-300' : 'text-gray-300'}`}>{illegalMoves.black}/9</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-white font-workforce font-bold text-lg uppercase tracking-wider mb-3 text-center">MOVE HISTORY</div>
          <div className="flex-1 bg-black border-2 border-emerald-400 rounded-lg p-3 overflow-auto min-h-[220px]">
            <MoveHistory moves={moveHistory} />
          </div>
        </div>

        {!bothPlayersJoined && (
          <div className="p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-200 font-workforce">
            ⏳ Waiting for second player to join...
          </div>
        )}
        {bothPlayersJoined && !allowMoves && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-sm text-yellow-200 font-workforce">
            Waiting for game to start...
          </div>
        )}
        </div>
      </div>

      {showCountdown && (
        <CountdownOverlay 
          onComplete={handleCountdownComplete}
          timeControl={timeControl}
          onCancel={handleCancelGame}
        />
      )}

      {gameOver && gameResult && (
        <GameOverModal
          result={gameResult.result}
          reason={gameResult.reason}
          onClose={handleCloseModal}
          pgn={gamePGN}
        />
      )}

      {error && !isLoading && (
        <ErrorModal
          message={error}
          onClose={() => setError(null)}
        />
      )}
      
      {/* Loading overlay - show while connecting/loading game state */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Connecting to game...</p>
          </div>
        </div>
      )}
    </div>
  );
}

