import { useGameStore } from '../store/gameStore';

// Import Prime chess piece SVGs
import wP from '../components/pieces/cburnett/wP.svg';
import wR from '../components/pieces/cburnett/wR.svg';
import wN from '../components/pieces/cburnett/wN.svg';
import wB from '../components/pieces/cburnett/wB.svg';
import wQ from '../components/pieces/cburnett/wQ.svg';
import wK from '../components/pieces/cburnett/wK.svg';
import bP from '../components/pieces/cburnett/bP.svg';
import bR from '../components/pieces/cburnett/bR.svg';
import bN from '../components/pieces/cburnett/bN.svg';
import bB from '../components/pieces/cburnett/bB.svg';
import bQ from '../components/pieces/cburnett/bQ.svg';
import bK from '../components/pieces/cburnett/bK.svg';

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

