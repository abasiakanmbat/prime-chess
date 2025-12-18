// PrimeChess OTB - Full PGN.js
// Generates PGN notation from stored moves + metadata

function generatePGN(match) {
    const { moves, timeControl, code, completed } = match;

    // Standard PGN headers
    let pgn = "";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g,".");

    pgn += `[Event "PrimeChess OTB Match"]
`;
    pgn += `[Site "PrimeChess"]
`;
    pgn += `[Date "${date}"]
`;
    pgn += `[Round "-"]
`;
    pgn += `[White "Player"]
`;
    pgn += `[Black "Guest"]
`;
    pgn += `[TimeControl "${timeControl}"]
`;
    pgn += `[GameCode "${code}"]
`;
    pgn += `
`;

    // Move list
    for (let i = 0; i < moves.length; i++) {
        if (i % 2 === 0) pgn += ((i/2)+1) + ". ";
        pgn += moves[i] + " ";
    }

    return pgn.trim();
}

export { generatePGN };
