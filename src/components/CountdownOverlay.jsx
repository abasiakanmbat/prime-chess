import { useEffect, useState, useRef } from 'react';
import { playSound } from '../utils/sounds';
import ConfirmDialog from './ConfirmDialog';

export default function CountdownOverlay({ onComplete, timeControl, onCancel }) {
  const [countdown, setCountdown] = useState(30);
  const [show, setShow] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const soundPlayedRef = useRef(false); // Track if sound has been played to prevent duplicate playback

  useEffect(() => {
    if (countdown <= 0) {
      setShow(false);
      onComplete();
      // Only play sounds once - prevent duplicate playback
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        playSound('start_clocks.mp3');
        playSound('game_start_tone.mp3');
      }
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown, onComplete]);

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setShow(false);
    if (onCancel) {
      onCancel();
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-gray-800 rounded-lg p-12 text-center border-2 border-gray-700">
          <div className="text-5xl font-megatron font-bold mb-8 text-yellow-400 uppercase tracking-wider">Introduction Countdown</div>
          <div className="text-9xl font-megatron font-bold text-yellow-400 mb-12 drop-shadow-lg">{countdown}</div>
          {onCancel && (
            <button
              onClick={handleCancelClick}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 uppercase tracking-wider border border-red-700 hover:shadow-lg"
            >
              Cancel Game
            </button>
          )}
        </div>
      </div>

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
    </>
  );
}

