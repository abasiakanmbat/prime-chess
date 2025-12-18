import { useGameStore } from '../store/gameStore';

// Import Prime chess piece SVGs
import wP from '../assets/chesspieces/prime/WHITE PAWN.svg';
import wR from '../assets/chesspieces/prime/WHITE ROOK.svg';
import wN from '../assets/chesspieces/prime/WHITE KNIGHT.svg';
import wB from '../assets/chesspieces/prime/WHITE BISHOP.svg';
import wQ from '../assets/chesspieces/prime/WHITE QUEEN.svg';
import wK from '../assets/chesspieces/prime/WHITE KING.svg';
import bP from '../assets/chesspieces/prime/BLACK PAWN.svg';
import bR from '../assets/chesspieces/prime/BLACK ROOK.svg';
import bN from '../assets/chesspieces/prime/BLACK KNIGHT.svg';
import bB from '../assets/chesspieces/prime/BLACK BISHOP.svg';
import bQ from '../assets/chesspieces/prime/BLACK QUEEN.svg';
import bK from '../assets/chesspieces/prime/BLACK KING.svg';

// Map piece codes to imported images
const PIECE_IMAGE_MAP = {
  'P': { white: wP, black: bP },
  'R': { white: wR, black: bR },
  'N': { white: wN, black: bN },
  'B': { white: wB, black: bB },
  'Q': { white: wQ, black: bQ },
  'K': { white: wK, black: bK },
};

export default function CapturedPieces({ color = 'both' }) {
  const capturedPieces = useGameStore(state => state.capturedPieces) || { white: [], black: [] };
  
  // Determine which pieces to show based on color prop
  const piecesToShow = color === 'white' ? capturedPieces.white : 
                       color === 'black' ? capturedPieces.black :
                       null;
  
  // If both, this component shouldn't be used this way
  if (color === 'both') {
    return null;
  }
  
  return (
    <div className="flex items-center justify-center gap-2 h-full">
      {piecesToShow && piecesToShow.length > 0 ? (
        piecesToShow.filter(p => p).map((piece, idx) => {
          const imageSrc = PIECE_IMAGE_MAP[piece]?.[color];
          if (!piece || !imageSrc) return null;
          return (
            <div key={idx} className="w-12 h-12 flex items-center justify-center">
              <img 
                src={imageSrc} 
                alt={`${color} ${piece}`}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              />
            </div>
          );
        })
      ) : null}
    </div>
  );
}

