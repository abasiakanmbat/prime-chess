import { useEffect, useState, useRef } from 'react';
import { getSoundUrl } from '../utils/sounds';

// Helper function to parse timeControl and get initial values
function parseTimeControl(timeControl) {
  if (timeControl && typeof timeControl === 'string') {
    // Handle both '+' and space ' ' as separators (URL encoding can convert + to space)
    // Also trim whitespace
    const normalized = timeControl.trim().replace(/\s+/g, '+');
    const parts = normalized.split('+');
    if (parts.length === 2) {
      const minutes = Number(parts[0].trim());
      const inc = Number(parts[1].trim());
      
      if (!isNaN(minutes) && !isNaN(inc) && minutes > 0) {
        return {
          minutes: minutes * 60, // Convert to seconds
          increment: inc || 0
        };
      }
    }
  }
  // Return null if no valid timeControl - timer will wait for server
  return null;
}

export default function GameTimer({ timeControl, whiteToMove, onTimeFlag, isActive, gameCode }) {
  // Parse timeControl to get initial values
  const parsed = parseTimeControl(timeControl);
  
  // Initialize state - use 0 if no timeControl yet (will be updated when server sends it)
  const [whiteTime, setWhiteTime] = useState(parsed ? parsed.minutes : 0);
  const [blackTime, setBlackTime] = useState(parsed ? parsed.minutes : 0);
  const [increment, setIncrement] = useState(parsed ? parsed.increment : 0);
  const [whiteFlash, setWhiteFlash] = useState(false);
  const [blackFlash, setBlackFlash] = useState(false);

  const prevTimeControlRef = useRef(null);
  const prevGameCodeRef = useRef(null);
  const hasPlayedSoundForTimeControlRef = useRef(new Set());
  const isInitialMountRef = useRef(true);
  const hasReceivedServerStateRef = useRef(false);
  
  // CRITICAL: Always sync timer with timeControl prop whenever it changes
  // This ensures timer shows correct value even if timeControl was set after component mounted
  // Reset timer whenever timeControl changes AND game is not active (hasn't started yet)
  useEffect(() => {
    // Don't do anything if timeControl is not set yet (waiting for server)
    if (!timeControl || typeof timeControl !== 'string') return;
    
    // Normalize timeControl (handle spaces from URL encoding)
    const normalized = timeControl.trim().replace(/\s+/g, '+');
    const parts = normalized.split('+');
    if (parts.length !== 2) return;
    
    const minutes = Number(parts[0].trim());
    const inc = Number(parts[1].trim());
    
    if (isNaN(minutes) || isNaN(inc) || minutes <= 0) return;
    
    const timeControlChanged = prevTimeControlRef.current !== normalized;
    // New game detected if: gameCode exists and is different from previous, OR it's initial mount with a gameCode
    const gameCodeChanged = prevGameCodeRef.current !== null && prevGameCodeRef.current !== gameCode;
    const isInitialMount = isInitialMountRef.current;
    // New game: gameCode changed OR it's initial mount with a valid gameCode (first time seeing this game)
    const isNewGame = (gameCodeChanged || (isInitialMount && gameCode !== null)) && gameCode !== null;
    
    // Clear sound tracking for new games to allow sound to play again
    // IMPORTANT: Do this BEFORE checking if sound should play, so new games always get sound
    if (isNewGame) {
      hasPlayedSoundForTimeControlRef.current.clear();
    }
    
    // Play time control announcement sound when:
    // - Server sends timeControl for the first time (prevTimeControlRef is null, now we have a value), OR
    // - timeControl changed from a previous value (server sent updated value), OR
    // - It's a new game (gameCode changed)
    // This ensures we play sound when server sends the actual timeControl value
    const shouldPlaySound = (prevTimeControlRef.current === null && normalized) || 
                           (timeControlChanged && prevTimeControlRef.current !== null) ||
                           (isNewGame && normalized);
    
    if (shouldPlaySound && !hasPlayedSoundForTimeControlRef.current.has(normalized)) {
      try {
        const soundName = `time_${normalized.replace('+', '_')}.mp3`;
        const soundUrl = getSoundUrl(soundName);
        if (soundUrl) {
          const timeSound = new Audio(soundUrl);
          timeSound.preload = 'auto';
          timeSound.volume = 0.7;
          timeSound.play().catch((err) => {
            // Ignore playback errors (autoplay restrictions, etc.)
            console.warn('Failed to play time control sound:', err);
          });
          hasPlayedSoundForTimeControlRef.current.add(normalized);
          console.log('Playing time control sound:', soundName);
        } else {
          console.warn('Time control sound not found:', soundName);
        }
      } catch (e) {
        console.warn('Error playing time control sound:', e);
      }
    }
    
    // CRITICAL: If game is active (already started) OR we've received server state, don't reset timer on mount/reload
    // Wait for server to send the actual timer state via restoreState
    // If gameCode exists, it means we're joining an existing game - wait for server state
    if (isInitialMount && (isActive || hasReceivedServerStateRef.current || gameCode)) {
      // Game is active or we're joining existing game - don't reset, wait for server state
      console.log('GameTimer: Skipping reset on mount - waiting for server state', { isActive, hasReceivedServerState: hasReceivedServerStateRef.current, gameCode });
      prevTimeControlRef.current = normalized;
      if (gameCodeChanged || isInitialMount) {
        prevGameCodeRef.current = gameCode;
      }
      isInitialMountRef.current = false;
      return;
    }
    
    // Only update timer when:
    // 1. timeControl actually changed, OR
    // 2. New game started, OR
    // 3. Initial mount AND game is not active (hasn't started), OR
    // 4. Game is not active (hasn't started) AND this is the first time we see this timeControl
    const shouldUpdate = timeControlChanged || isNewGame || (isInitialMount && !isActive) || (!isActive && isInitialMount);
    
    if (!shouldUpdate) {
      prevTimeControlRef.current = normalized;
      if (gameCodeChanged || isInitialMount) {
        prevGameCodeRef.current = gameCode;
      }
      isInitialMountRef.current = false;
      return;
    }
    
    // Reset timer to initial time control values (only if game hasn't started)
    const newTime = minutes * 60;
    setWhiteTime(newTime);
    setBlackTime(newTime);
    setIncrement(inc || 0);
    
    prevTimeControlRef.current = normalized;
    if (gameCodeChanged || isInitialMount) {
      prevGameCodeRef.current = gameCode;
    }
    isInitialMountRef.current = false;
  }, [timeControl, isActive, gameCode]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (whiteToMove) {
        setWhiteTime(prev => {
          if (prev <= 0) {
            onTimeFlag('white');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 0) {
            onTimeFlag('black');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [whiteToMove, isActive, onTimeFlag]);

  const applyIncrement = () => {
    // Increment is applied to the player who just moved (opposite of current turn)
    // If it's white's turn now, black just moved, so add increment to black
    if (whiteToMove) {
      setBlackTime(prev => prev + increment);
    } else {
      setWhiteTime(prev => prev + increment);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const applyIllegalPenalty = (color, remaining) => {
    if (color === 'white') {
      setWhiteTime(prev => Math.max(0, prev - 5));
      setWhiteFlash(true);
      setTimeout(() => setWhiteFlash(false), 500);
    } else {
      setBlackTime(prev => Math.max(0, prev - 5));
      setBlackFlash(true);
      setTimeout(() => setBlackFlash(false), 500);
    }
    
    // Play warning sound if no remaining illegal moves
    if (remaining !== undefined && remaining <= 0) {
      try {
        const soundUrl = getSoundUrl('illegal_last_warning.mp3');
        if (soundUrl) {
          const warnAudio = new Audio(soundUrl);
          warnAudio.preload = 'auto';
          warnAudio.play().catch((err) => {
            // Ignore playback errors
          });
        }
      } catch (e) {
        // Ignore sound loading errors
      }
    }
  };

  const restoreState = (wt, bt, inc, wtm) => {
    // Restore timer state from server (times are in milliseconds)
    // Always restore if we have valid values - this is critical for reconnections/reloads
    if (wt !== undefined && bt !== undefined && inc !== undefined) {
      const whiteSeconds = Math.floor(wt / 1000);
      const blackSeconds = Math.floor(bt / 1000);
      const incrementSeconds = Math.floor(inc / 1000);
      
      console.log('GameTimer: Restoring state from server', { whiteSeconds, blackSeconds, incrementSeconds, isActive });
      
      // Mark that we've received server state - prevents reset on subsequent renders
      hasReceivedServerStateRef.current = true;
      
      setWhiteTime(whiteSeconds);
      setBlackTime(blackSeconds);
      setIncrement(incrementSeconds);
    }
  };

  const getCurrentTimes = () => {
    // Return times in milliseconds for server sync
    return {
      whiteTime: whiteTime * 1000,
      blackTime: blackTime * 1000
    };
  };

  // Expose methods via window for socket events
  useEffect(() => {
    window.gameTimer = { 
      applyIncrement, 
      applyIllegalPenalty,
      restoreState,
      getCurrentTimes
    };
    return () => {
      delete window.gameTimer;
    };
  }, [whiteToMove, increment, whiteTime, blackTime, timeControl, isActive]);
  
  // Note: Increment is applied via window.gameTimer.applyIncrement() from Game component

  return (
    <div className="flex lg:flex-col flex-row justify-center gap-5">
      <div className="transition-all duration-200">
        <div className="text-xl text-white mb-1 uppercase tracking-wider font-workforce font-bold text-center">White</div>
        <div className="text-4xl lg:text-6xl font-bold text-red-600 text-center" style={{ fontFamily: 'Arial, Helvetica, sans-serif', textShadow: '0 0 20px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.6)' }}>{formatTime(whiteTime)}</div>
      </div>
      <div className="transition-all duration-200">
        <div className="text-xl text-white mb-1 uppercase tracking-wider font-workforce font-bold text-center">Black</div>
        <div className="text-4xl font-bold text-red-600 text-center" style={{ fontFamily: 'Arial, Helvetica, sans-serif', textShadow: '0 0 20px rgba(220, 38, 38, 0.8), 0 0 40px rgba(220, 38, 38, 0.6)' }}>{formatTime(blackTime)}</div>
      </div>
    </div>
  );
}

