export default function MoveHistory({ moves }) {
  // Group moves by turn (white and black together)
  const groupedMoves = [];
  for (let i = 0; i < moves.length; i += 2) {
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];
    
    // Parse move string like "0,0->1,1" to show coordinates
    const getMoveDetails = (move) => {
      if (!move || !move.move) return null;
      const [from, to] = move.move.split('->');
      if (!from || !to) return null;
      const [fromRow, fromCol] = from.split(',').map(Number);
      const [toRow, toCol] = to.split(',').map(Number);
      
      // Convert to chess notation (a-h, 1-8)
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
      
      const fromSquare = files[fromCol] + ranks[fromRow];
      const toSquare = files[toCol] + ranks[toRow];
      
      return {
        from: fromSquare,
        to: toSquare,
        notation: move.notation || '',
        full: `${fromSquare}→${toSquare}`,
        inCheck: move.inCheck || false,
        capturedPiece: move.capturedPiece || null
      };
    };
    
    const whiteDetails = whiteMove ? getMoveDetails(whiteMove) : null;
    const blackDetails = blackMove ? getMoveDetails(blackMove) : null;
    
    groupedMoves.push({
      turn: whiteMove?.turn || Math.floor(i / 2) + 1,
      white: whiteDetails,
      black: blackDetails
    });
  }

  return (
    <div className="flex flex-col h-full">
      {groupedMoves.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-red-400 text-sm font-workforce" style={{textShadow:'0 0 10px rgba(248,113,113,0.8)'}}>No moves yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedMoves.map((group, idx) => (
            <div key={idx} className="text-sm">
              {/* Turn number and moves on one line */}
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-workforce font-bold w-8">{group.turn}.</span>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {group.white ? (
                    <div className="text-white font-mono">
                      {group.white.notation || group.white.full}
                      {group.white.inCheck && <span className="text-red-400 ml-1">+</span>}
                    </div>
                  ) : (
                    <div className="text-gray-600 font-mono italic">...</div>
                  )}
                  {group.black ? (
                    <div className="text-white font-mono">
                      {group.black.notation || group.black.full}
                      {group.black.inCheck && <span className="text-red-400 ml-1">+</span>}
                    </div>
                  ) : (
                    <div className="text-gray-600 font-mono italic">...</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

