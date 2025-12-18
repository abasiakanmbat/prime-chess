import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import ConfirmDialog from './ConfirmDialog';

export default function GameControls({ onResign, onCancel, gameCode, gameStarted, bothPlayersJoined }) {
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Only show resign button if game has started and both players joined
  const canUseGameControls = gameStarted && bothPlayersJoined;

  const handleResign = () => {
    setShowResignConfirm(true);
  };

  const confirmResign = () => {
    setShowResignConfirm(false);
    onResign();
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Only show resign button if game has started and both players joined */}
      {canUseGameControls ? (
        <>
          <button
            onClick={handleResign}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 uppercase tracking-wider border border-red-700 hover:shadow-lg"
          >
            Resign
          </button>
        </>
      ) : (
        /* Show cancel button if game hasn't started yet */
        !gameStarted && onCancel && (
          <button
            onClick={handleCancel}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 uppercase tracking-wider border border-gray-700 hover:shadow-lg"
          >
            Cancel Game
          </button>
        )
      )}
      {gameCode && (
        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="text-lg text-red-500 mb-2 uppercase tracking-wider text-center font-bold" style={{ textShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6)' }}>Game Code</div>
          <div className="text-3xl font-megatron font-bold text-yellow-400 text-center">{gameCode}</div>
        </div>
      )}

      {showResignConfirm && (
        <ConfirmDialog
          title="Resign Game"
          message="Are you sure you want to resign? This will end the game immediately."
          onConfirm={confirmResign}
          onCancel={() => setShowResignConfirm(false)}
          confirmText="Resign"
          cancelText="Cancel"
          danger={true}
        />
      )}

      {showCancelConfirm && (
        <ConfirmDialog
          title="Cancel Game"
          message="Are you sure you want to cancel this game? This will end the game and return you to the lobby."
          onConfirm={confirmCancel}
          onCancel={() => setShowCancelConfirm(false)}
          confirmText="Cancel Game"
          cancelText="Keep Playing"
          danger={true}
        />
      )}
    </div>
  );
}

