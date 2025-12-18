import { v4 as uuidv4 } from "uuid";
const matches = {};

function createGameCode() { 
    let code;
    // Ensure unique code (very unlikely to collide with UUID, but just in case)
    do {
        code = uuidv4().slice(0,6).toUpperCase();
    } while (matches[code]); // Regenerate if code already exists
    return code;
}

function createMatch(timeControl){
    const code=createGameCode();
    const [minutes, increment] = timeControl.split('+').map(Number);
    const initialTime = minutes * 60 * 1000; // Convert to milliseconds
    
    matches[code]={
        code,
        white:null,
        black:null,
        whiteSocketId: null,
        blackSocketId: null,
        playersJoined:0,
        moves:[],
        moveHistory: [],
        fen:"",
        whiteToMove: true,
        timeControl,
        halfmoves:0,
        illegal:{white:0,black:0},
        completed:false,
        gameStarted: false,
        gameOver: false,
        gameResult: null,
        // Timer state
        whiteTime: initialTime,
        blackTime: initialTime,
        increment: increment * 1000, // Convert to milliseconds
        timerActive: false,
        lastTimerUpdate: null, // Timestamp of last timer update
        // Additional game state
        capturedPieces: { white: [], black: [] },
        inCheck: false,
        checkSquare: null,
        drawOffer: null,
    };
    return code;
}

function getMatch(code){ return matches[code]||null; }
function removeMatch(code){ delete matches[code]; }

function addMove(code,move,fen){
    const m=matches[code]; if(!m)return;
    m.moves.push(move); 
    m.fen=fen; 
    m.halfmoves++;
    
    // Apply increment to the player who just moved (before toggling turn)
    // If it was white's turn, white just moved, so add increment to white
    if (m.whiteToMove) {
        // White just moved
        m.whiteTime += m.increment;
    } else {
        // Black just moved
        m.blackTime += m.increment;
    }
    
    m.whiteToMove = !m.whiteToMove; // Toggle turn
}

function addIllegal(code,color){
    const m=matches[code]; if(!m)return;
    m.illegal[color]++; return m.illegal[color];
}

function check75MoveRule(code){
    const m=matches[code]; if(!m)return false;
    return m.halfmoves>=150;
}

function updateTimer(code, whiteTime, blackTime) {
    const m = matches[code];
    if (!m) return;
    m.whiteTime = whiteTime;
    m.blackTime = blackTime;
    m.lastTimerUpdate = Date.now();
}

function setGameStarted(code, started) {
    const m = matches[code];
    if (!m) return;
    m.gameStarted = started;
    m.timerActive = started;
    if (started) {
        m.lastTimerUpdate = Date.now();
    }
}

function setGameOver(code, result, reason) {
    const m = matches[code];
    if (!m) return;
    m.gameOver = true;
    m.gameResult = { result, reason };
    m.timerActive = false;
    m.completed = true;
}

function updateGameState(code, state) {
    const m = matches[code];
    if (!m) return;
    // Update any provided state fields
    if (state.moveHistory !== undefined) m.moveHistory = state.moveHistory;
    if (state.capturedPieces !== undefined) m.capturedPieces = state.capturedPieces;
    if (state.inCheck !== undefined) m.inCheck = state.inCheck;
    if (state.checkSquare !== undefined) m.checkSquare = state.checkSquare;
    if (state.drawOffer !== undefined) m.drawOffer = state.drawOffer;
    if (state.whiteToMove !== undefined) m.whiteToMove = state.whiteToMove;
}

function reconnectPlayer(code, socketId, playerColor) {
    const m = matches[code];
    if (!m) return false;
    
    // Update socket ID for the player
    if (playerColor === 'white') {
        m.whiteSocketId = socketId;
        m.white = socketId;
    } else if (playerColor === 'black') {
        m.blackSocketId = socketId;
        m.black = socketId;
    }
    
    return true;
}

function findMatchBySocketId(socketId) {
    for (const code in matches) {
        const m = matches[code];
        if (m.white === socketId || m.black === socketId) {
            return { code, match: m };
        }
    }
    return null;
}

export { 
    createMatch, 
    getMatch, 
    removeMatch, 
    addMove, 
    addIllegal, 
    check75MoveRule,
    updateTimer,
    setGameStarted,
    setGameOver,
    updateGameState,
    reconnectPlayer,
    findMatchBySocketId
};
