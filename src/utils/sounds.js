// Import all sound files
import captureSound from '../assets/sounds/capture.mp3';
import checkSound from '../assets/sounds/Check.mp3';
import checkmateWhiteSound from '../assets/sounds/checkmate_white.mp3';
import checkmateBlackSound from '../assets/sounds/Checkmate_Black.mp3';
import selectSound from '../assets/sounds/select.mp3';
import deselectSound from '../assets/sounds/deselect.mp3';
import illegalMoveSound from '../assets/sounds/illegal_move.mp3';
import startClocksSound from '../assets/sounds/start_clocks.mp3';
import announceIntroductionSound from '../assets/sounds/announce_introduction.mp3';
import whiteResignsSound from '../assets/sounds/white_resigns.mp3';
import blackResignsSound from '../assets/sounds/black_resigns.mp3';
import whiteTimeFlagSound from '../assets/sounds/white_time_flag.mp3';
import blackTimeFlagSound from '../assets/sounds/black_time_flag.mp3';
import draw75MoveSound from '../assets/sounds/draw_75_move.mp3';
import drawInsufficientSound from '../assets/sounds/draw_insufficient.mp3';
import drawRepetitionSound from '../assets/sounds/draw_repetition.mp3';
import drawStalemateSound from '../assets/sounds/draw_stalemate.mp3';
import time15_10Sound from '../assets/sounds/time_15_10.mp3';
import time5_3Sound from '../assets/sounds/time_5_3.mp3';
import time2_1Sound from '../assets/sounds/time_2_1.mp3';
import gameStartToneSound from '../assets/sounds/game_start_tone.mp3';
import alertSound from '../assets/sounds/alert.mp3';
import errorSound from '../assets/sounds/error.mp3';
import illegalLastWarningSound from '../assets/sounds/illegal_last_warning.mp3';

// Sound file mapping
const soundMap = {
  'capture.mp3': captureSound,
  'check.mp3': checkSound,
  'checkmate_white.mp3': checkmateWhiteSound,
  'checkmate_black.mp3': checkmateBlackSound,
  'select.mp3': selectSound,
  'deselect.mp3': deselectSound,
  'illegal_move.mp3': illegalMoveSound,
  'start_clocks.mp3': startClocksSound,
  'announce_introduction.mp3': announceIntroductionSound,
  'white_resigns.mp3': whiteResignsSound,
  'black_resigns.mp3': blackResignsSound,
  'white_time_flag.mp3': whiteTimeFlagSound,
  'black_time_flag.mp3': blackTimeFlagSound,
  'draw_75_move.mp3': draw75MoveSound,
  'draw_insufficient.mp3': drawInsufficientSound,
  'draw_repetition.mp3': drawRepetitionSound,
  'draw_stalemate.mp3': drawStalemateSound,
  'time_15_10.mp3': time15_10Sound,
  'time_5_3.mp3': time5_3Sound,
  'time_2_1.mp3': time2_1Sound,
  'game_start_tone.mp3': gameStartToneSound,
  'alert.mp3': alertSound,
  'error.mp3': errorSound,
  'illegal_last_warning.mp3': illegalLastWarningSound,
};

// Sound effects manager
const soundCache = {};

export function preloadSound(name) {
  if (!soundCache[name]) {
    const soundUrl = soundMap[name];
    if (!soundUrl) {
      console.warn(`Sound file not found: ${name}`);
      return null;
    }
    const audio = new Audio(soundUrl);
    audio.volume = 0.7;
    audio.preload = 'auto';
    soundCache[name] = audio;
  }
  return soundCache[name];
}

export function playSound(name) {
  try {
    const audio = preloadSound(name);
    if (!audio) return;
    
    // Create a new audio element to avoid range request issues with reused elements
    const audioClone = new Audio(audio.src);
    audioClone.volume = audio.volume;
    audioClone.currentTime = 0;
    
    audioClone.play().catch((err) => {
      // Ignore autoplay restrictions and other playback errors
      if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
        console.warn(`Failed to play sound: ${name}`, err);
      }
    });
  } catch (e) {
    console.warn(`Failed to play sound: ${name}`, e);
  }
}

// Helper function to get sound URL by name (for dynamic time control sounds)
export function getSoundUrl(name) {
  return soundMap[name] || null;
}

// Preload common sounds
export function preloadCommonSounds() {
  const commonSounds = [
    'move.mp3',
    'capture.mp3',
    'check.mp3',
    'checkmate_white.mp3',
    'checkmate_black.mp3',
    'select.mp3',
    'deselect.mp3',
    'illegal_move.mp3',
    'start_clocks.mp3',
    'announce_introduction.mp3',
    'white_resigns.mp3',
    'black_resigns.mp3',
    'white_time_flag.mp3',
    'black_time_flag.mp3',
    'draw_75_move.mp3',
    'draw_insufficient.mp3',
    'draw_repetition.mp3',
    'draw_stalemate.mp3',
    'time_15_10.mp3',
    'time_5_3.mp3',
    'time_2_1.mp3',
    'game_start_tone.mp3',
    'alert.mp3',
    'error.mp3'
  ];
  
  commonSounds.forEach(sound => {
    preloadSound(sound);
  });
}

