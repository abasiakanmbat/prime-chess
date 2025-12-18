import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket, useSocketEvent } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';
import ChessBoard3D from './ChessBoard3D';
import MoveHistory from './MoveHistory';
import GameTimer from './GameTimer';
import GameOverModal from './GameOverModal';
import ErrorModal from './ErrorModal';
import { isCheckmate } from '../utils/checkmate';
import { generatePGN } from '../../utils/PGN.js';

export default function SpectatorView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameCode = searchParams.get('code');
  const [lastMove, setLastMove] = useState(null);
  const [error, setError] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [gamePGN, setGamePGN] = useState(null);
  
  const socket = useSocket();
  const board = useGameStore(state => state.board);
  const whiteToMove = useGameStore(state => state.whiteToMove);
  const timeControl = useGameStore(state => state.timeControl);
  const gameOver = useGameStore(state => state.gameOver);
  const gameResult = useGameStore(state => state.gameResult);
  const inCheck = useGameStore(state => state.inCheck);
  const checkSquare = useGameStore(state => state.checkSquare);
  const moveHistory = useGameStore(state => state.moveHistory);
  
  const setGameCode = useGameStore(state => state.setGameCode);
  const setTimeControl = useGameStore(state => state.setTimeControl);
  const applyMove = useGameStore(state => state.applyMove);
  const applyFEN = useGameStore(state => state.applyFEN);
  const setGameOver = useGameStore(state => state.setGameOver);

  useEffect(() => {
    if (!gameCode) {
      navigate('/');
      return;
    }
    
    setGameCode(gameCode);
    if (socket) {
      socket.emit('joinSpectator', gameCode);
    }
  }, [gameCode, socket, setGameCode, navigate]);

  useSocketEvent(socket, 'invalidCode', () => {
    setError('Invalid game code. The game may have ended or does not exist.');
  });

  useSocketEvent(socket, 'playerJoined', () => {
    // Game has started, activate timer
    setTimerActive(true);
  });

  useSocketEvent(socket, 'moveMade', ({ move, fen }) => {
    const [from, to] = move.split('->');
    const [fromRow, fromCol] = from.split(',').map(Number);
    const [toRow, toCol] = to.split(',').map(Number);
    
    setLastMove({ from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } });
    
    applyMove(fromRow, fromCol, toRow, toCol);
    applyFEN(fen);
    
    // Check for checkmate
    setTimeout(() => {
      const newBoard = useGameStore.getState().board;
      const newWhiteToMove = useGameStore.getState().whiteToMove;
      if (isCheckmate(newBoard, newWhiteToMove)) {
        // Checkmate will be handled by gameOver event
      }
    }, 0);
    
    setTimeout(() => setLastMove(null), 350);
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

  useSocketEvent(socket, 'gameState', ({ fen, timeControl: tc, whiteToMove: wtm }) => {
    // Receive initial game state when joining
    if (fen) {
      applyFEN(fen);
    }
    if (tc) {
      setTimeControl(tc);
    }
  });

  const handleCloseModal = () => {
    useGameStore.setState({ gameOver: false, gameResult: null });
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <div className="w-full lg:w-64 bg-gray-800 p-4 flex flex-col gap-6 border-b lg:border-b-0 lg:border-r border-gray-700">
        <div>
          <h2 className="text-xl font-bold mb-4 text-center">Spectating</h2>
          <div className="text-sm text-gray-400 mb-4 text-center">
            Game Code: <span className="font-mono text-white">{gameCode}</span>
          </div>
          {timeControl && (
            <div className="bg-gray-700 rounded-lg p-2 mb-4">
              <span className="text-gray-400 text-xs block mb-1">Time Control</span>
              <span className="font-mono text-sm font-bold">{timeControl}</span>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-4 text-center">Clocks</h3>
          <GameTimer 
            timeControl={timeControl} 
            whiteToMove={whiteToMove}
            onTimeFlag={() => {}} // Spectators don't handle time flags
            isActive={timerActive}
          />
        </div>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 relative bg-gradient-to-br from-gray-900 to-gray-800 min-h-[400px] lg:min-h-0">
        <div className="absolute inset-0">
          <ChessBoard3D
            board={board}
            whiteToMove={whiteToMove}
            selectedSquare={null}
            legalMoves={[]}
            checkSquare={checkSquare}
            onSquareClick={() => {}}
            allowMoves={false}
            lastMove={lastMove}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full lg:w-80 bg-gray-800 p-4 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-700">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Game Info</h2>
          {inCheck && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 mb-4">
              <span className="text-red-200 text-sm font-bold">
                {whiteToMove ? 'White' : 'Black'} is in Check!
              </span>
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-700 pt-4 flex-1 flex flex-col min-h-0">
          <h3 className="text-lg font-bold mb-2">Move History</h3>
          <MoveHistory moves={moveHistory} />
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>

      {/* Modals */}
      {gameOver && gameResult && (
        <GameOverModal
          result={gameResult.result}
          reason={gameResult.reason}
          onClose={handleCloseModal}
          pgn={gamePGN}
        />
      )}

      {error && (
        <ErrorModal
          message={error}
          onClose={() => {
            setError(null);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}

