import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GameOverModal({ result, reason, onClose, pgn }) {
  const navigate = useNavigate();
  const [showPGNPreview, setShowPGNPreview] = useState(false);
  const [showPGNHelp, setShowPGNHelp] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleReturnToLobby = () => {
    onClose();
    navigate('/');
  };

  const getResultText = () => {
    if (result === '1-0') return 'White Wins!';
    if (result === '0-1') return 'Black Wins!';
    if (result === '1/2-1/2') return 'Draw!';
    return 'Game Over';
  };

  const getResultColor = () => {
    if (result === '1-0') return 'text-blue-400';
    if (result === '0-1') return 'text-gray-300';
    if (result === '1/2-1/2') return 'text-yellow-400';
    return 'text-gray-400';
  };

  const handleDownloadPGN = () => {
    if (!pgn) return;
    
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primechess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Extract just the moves from PGN for preview
  const getMovesPreview = () => {
    if (!pgn) return '';
    const lines = pgn.split('\n');
    const movesLine = lines.find(line => line.trim() && !line.startsWith('['));
    return movesLine || '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className={`text-4xl font-bold mb-4 ${getResultColor()}`}>
            {getResultText()}
          </h2>
          <p className="text-xl text-gray-300 mb-2">Result: {result}</p>
          <p className="text-gray-400 mb-8">{reason}</p>
          
          {pgn && (
            <div className="mb-6 space-y-3">
              {/* PGN Help Toggle */}
              <button
                onClick={() => setShowPGNHelp(!showPGNHelp)}
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>ℹ️</span>
                <span>What is PGN? {showPGNHelp ? '▼' : '▶'}</span>
              </button>
              
              {/* PGN Help Content */}
              {showPGNHelp && (
                <div className="bg-gray-700/50 rounded-lg p-4 text-left text-sm space-y-2">
                  <p className="text-gray-300 font-semibold mb-2">PGN (Portable Game Notation) Explained:</p>
                  <div className="space-y-1 text-gray-400">
                    <p><span className="text-white font-mono">e4</span> = Pawn moves to e4</p>
                    <p><span className="text-white font-mono">Nf3</span> = Knight moves to f3</p>
                    <p><span className="text-white font-mono">Bxc5</span> = Bishop captures on c5</p>
                    <p><span className="text-white font-mono">O-O</span> = Castling (kingside)</p>
                    <p><span className="text-white font-mono">+</span> = Check</p>
                    <p><span className="text-white font-mono">#</span> = Checkmate</p>
                  </div>
                  <p className="text-gray-500 text-xs mt-3">
                    PGN files can be opened in chess analysis tools like Chess.com, Lichess, or chess engines for review.
                  </p>
                </div>
              )}
              
              {/* Moves Preview */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-300">Game Moves Preview</span>
                  <button
                    onClick={() => setShowPGNPreview(!showPGNPreview)}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    {showPGNPreview ? 'Hide' : 'Show'} Full PGN
                  </button>
                </div>
                <div className="text-xs text-gray-400 font-mono break-words max-h-32 overflow-y-auto">
                  {getMovesPreview()}
                </div>
              </div>
              
              {/* Download Button */}
              <button
                onClick={handleDownloadPGN}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PGN File
              </button>
              
              {/* Full PGN (collapsible) */}
              {showPGNPreview && (
                <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words">
                    {pgn}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReturnToLobby}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Return to Lobby
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

