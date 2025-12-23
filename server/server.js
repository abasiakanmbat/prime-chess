import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import cors from "cors";
import { 
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
} from "./matchManager.js";
// import { generatePGN } from "../utils/PGN.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app=express();
app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
}

const server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"}});

// Illegal move system constants
const ILLEGAL_MOVE_LIMIT = 9; // Game ends on 9th illegal move
const ILLEGAL_MOVE_TIME_PENALTY = 5000; // 5 seconds in milliseconds

// API
app.post("/create-game",(req,res)=>{
  const {timeControl}=req.body;
  console.log('Server: Creating game with timeControl:', timeControl);
  const code=createMatch(timeControl);
  console.log('Server: Created game', code, 'with timeControl:', timeControl);
  return res.json({code});
});

io.on("connection",(socket)=>{

  socket.on("joinGame",({code,playerColor})=>{
    const m=getMatch(code); 
    if(!m)return socket.emit("invalidCode");
    
    // Don't allow joining games that are already over
    if(m.gameOver || m.completed) {
      return socket.emit("invalidCode");
    }
    
    // Check if this is a reconnection (player was already in the game)
    let assignedColor = playerColor;
    let isReconnection = false;
    
    if (!assignedColor) {
      // Check if player was previously connected
      if (m.whiteSocketId && m.whiteSocketId !== m.white) {
        // White player reconnecting
        assignedColor = 'white';
        isReconnection = true;
      } else if (m.blackSocketId && m.blackSocketId !== m.black) {
        // Black player reconnecting
        assignedColor = 'black';
        isReconnection = true;
      } else {
        // New player - auto-assign: if white is taken, assign black; otherwise assign white
        assignedColor = m.white !== null ? 'black' : 'white';
      }
    } else if (m[assignedColor] !== null && m[assignedColor] !== socket.id) {
      // Color already taken by different socket, check if it's a reconnection
      if ((assignedColor === 'white' && m.whiteSocketId) || 
          (assignedColor === 'black' && m.blackSocketId)) {
        isReconnection = true;
      } else {
        // Color taken, assign the opposite
        assignedColor = assignedColor === 'white' ? 'black' : 'white';
      }
    }
    
    socket.join(code);
    
    if (isReconnection) {
      reconnectPlayer(code, socket.id, assignedColor);
    } else {
      m[assignedColor] = socket.id;
      if (assignedColor === 'white') {
        m.whiteSocketId = socket.id;
      } else {
        m.blackSocketId = socket.id;
      }
      m.playersJoined++;
    }

    // Send back the assigned color to the client
    socket.emit("colorAssigned", { color: assignedColor });

    // Always send game state to new/reconnecting player (including time control)
    console.log('Server: Sending gameState with timeControl:', m.timeControl, 'for game:', code);
    const gameStateData = {
      fen: m.fen || "",
      timeControl: m.timeControl, // Always send time control from server
      whiteToMove: m.whiteToMove,
      gameStarted: m.gameStarted,
      timerActive: m.timerActive,
      whiteTime: m.whiteTime,
      blackTime: m.blackTime,
      increment: m.increment,
      moveHistory: m.moveHistory || [],
      capturedPieces: m.capturedPieces || { white: [], black: [] },
      inCheck: m.inCheck,
      checkSquare: m.checkSquare,
      gameOver: m.gameOver,
      gameResult: m.gameResult,
      drawOffer: m.drawOffer,
      white: m.white,
      black: m.black,
      illegalMoves: m.illegal || { white: 0, black: 0 }
    };
    
    socket.emit("gameState", gameStateData);

    // Broadcast playerJoined event to all players in the room (including first player)
    io.to(code).emit("playerJoined",{
      white:m.white!==null,
      black:m.black!==null
    });
    
    // Also broadcast updated game state to all players in the room
    io.to(code).emit("gameState", gameStateData);

    // Check if both players have joined (using actual socket IDs, not just playersJoined counter)
    const bothPlayersJoined = m.white !== null && m.black !== null;
    if(bothPlayersJoined && !m.gameStarted){
      console.log('Both players joined, emitting introStart to room:', code, { white: m.white, black: m.black, playersJoined: m.playersJoined });
      io.to(code).emit("introStart",{});
    }
  });

  socket.on("joinSpectator",(code)=>{
    const m=getMatch(code); if(!m)return;
    socket.join(code);
    // Send full current game state to spectator
    socket.emit("gameState",{
      fen:m.fen || "",
      timeControl:m.timeControl,
      whiteToMove:m.whiteToMove,
      gameStarted:m.gameStarted,
      timerActive:m.timerActive,
      whiteTime:m.whiteTime,
      blackTime:m.blackTime,
      increment:m.increment,
      moveHistory:m.moveHistory || [],
      capturedPieces:m.capturedPieces || { white: [], black: [] },
      inCheck:m.inCheck,
      checkSquare:m.checkSquare,
      gameOver:m.gameOver,
      gameResult:m.gameResult,
      drawOffer:m.drawOffer,
      white:m.white,
      black:m.black
    });
  });
  
  // Handle disconnection - mark player as disconnected but keep game state
  socket.on("disconnect", () => {
    // Find which game this socket belongs to
    const result = findMatchBySocketId(socket.id);
    if (result) {
      const { match: m } = result;
      if (m.white === socket.id) {
        m.white = null; // Mark as disconnected but keep whiteSocketId
      }
      if (m.black === socket.id) {
        m.black = null; // Mark as disconnected but keep blackSocketId
      }
    }
  });

  socket.on("makeMove",({code,move,fen})=>{
    const m=getMatch(code); if(!m)return;
    
    // Validation: Check if game has started and both players have joined
    if (!m.gameStarted) {
      console.log('Move rejected: game not started', { code, gameStarted: m.gameStarted, playersJoined: m.playersJoined });
      return;
    }
    
    if (m.playersJoined < 2) {
      console.log('Move rejected: both players not joined', { code, playersJoined: m.playersJoined });
      return;
    }
    
    // Validation: Check if player is connected and it's their turn
    const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
    if (!playerColor) {
      console.log('Move rejected: player not connected', { code, socketId: socket.id });
      return;
    }
    
    // Check if it's the player's turn
    const isPlayerTurn = (m.whiteToMove && playerColor === 'white') || (!m.whiteToMove && playerColor === 'black');
    if (!isPlayerTurn) {
      console.log('Move rejected: not player turn', { code, playerColor, whiteToMove: m.whiteToMove });
      return;
    }
    
    // Basic validation: parse move and check format
    try {
      const [from, to] = move.split('->');
      if (!from || !to) {
        // Invalid move format - get player color from socket
        const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
        if (playerColor) {
          const count = addIllegal(code, playerColor);
          // Deduct 5 seconds from player's timer
          if (playerColor === 'white') {
            m.whiteTime = Math.max(0, m.whiteTime - ILLEGAL_MOVE_TIME_PENALTY);
          } else {
            m.blackTime = Math.max(0, m.blackTime - ILLEGAL_MOVE_TIME_PENALTY);
          }
          // Broadcast illegal move penalty to all players and spectators
          io.to(code).emit("illegalMovePenalty", { color: playerColor, remaining: ILLEGAL_MOVE_LIMIT - count });
          // Sync timer state after penalty
          io.to(code).emit("timerSync", {
            whiteTime: m.whiteTime,
            blackTime: m.blackTime
          });
          if (count >= ILLEGAL_MOVE_LIMIT) {
            const winner = playerColor === "white" ? "black" : "white";
            setGameOver(code, winner === "white" ? "1-0" : "0-1", "Illegal move forfeit");
            io.to(code).emit("gameOver", { result: winner === "white" ? "1-0" : "0-1", reason: "Illegal move forfeit" });
            // Clean up match after a short delay to allow clients to process gameOver event
            setTimeout(() => removeMatch(code), 5000);
          }
        }
        return;
      }
      
      const [fromRow, fromCol] = from.split(',').map(Number);
      const [toRow, toCol] = to.split(',').map(Number);
      
      // Validate coordinates are within bounds
      if (isNaN(fromRow) || isNaN(fromCol) || isNaN(toRow) || isNaN(toCol) ||
          fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
          toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) {
        const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
        if (playerColor) {
          const count = addIllegal(code, playerColor);
          // Deduct 5 seconds from player's timer
          if (playerColor === 'white') {
            m.whiteTime = Math.max(0, m.whiteTime - ILLEGAL_MOVE_TIME_PENALTY);
          } else {
            m.blackTime = Math.max(0, m.blackTime - ILLEGAL_MOVE_TIME_PENALTY);
          }
          // Broadcast illegal move penalty to all players and spectators
          io.to(code).emit("illegalMovePenalty", { color: playerColor, remaining: ILLEGAL_MOVE_LIMIT - count });
          // Sync timer state after penalty
          io.to(code).emit("timerSync", {
            whiteTime: m.whiteTime,
            blackTime: m.blackTime
          });
          if (count >= ILLEGAL_MOVE_LIMIT) {
            const winner = playerColor === "white" ? "black" : "white";
            setGameOver(code, winner === "white" ? "1-0" : "0-1", "Illegal move forfeit");
            io.to(code).emit("gameOver", { result: winner === "white" ? "1-0" : "0-1", reason: "Illegal move forfeit" });
            // Clean up match after a short delay to allow clients to process gameOver event
            setTimeout(() => removeMatch(code), 5000);
          }
        }
        return;
      }
      
      // Note: Full chess rule validation would require importing chess engine
      // For now, we rely on client-side validation and basic format checking
      // In production, you might want to add full server-side validation
    } catch (error) {
      console.error('Error validating move:', error);
      const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
      if (playerColor) {
        const count = addIllegal(code, playerColor);
        // Deduct 5 seconds from player's timer
        if (playerColor === 'white') {
          m.whiteTime = Math.max(0, m.whiteTime - ILLEGAL_MOVE_TIME_PENALTY);
        } else {
          m.blackTime = Math.max(0, m.blackTime - ILLEGAL_MOVE_TIME_PENALTY);
        }
        // Broadcast illegal move penalty to all players and spectators
        io.to(code).emit("illegalMovePenalty", { color: playerColor, remaining: ILLEGAL_MOVE_LIMIT - count });
        // Sync timer state after penalty
        io.to(code).emit("timerSync", {
          whiteTime: m.whiteTime,
          blackTime: m.blackTime
        });
        if (count >= ILLEGAL_MOVE_LIMIT) {
          const winner = playerColor === "white" ? "black" : "white";
          setGameOver(code, winner === "white" ? "1-0" : "0-1", "Illegal move forfeit");
          io.to(code).emit("gameOver", { result: winner === "white" ? "1-0" : "0-1", reason: "Illegal move forfeit" });
          // Clean up match after a short delay to allow clients to process gameOver event
          setTimeout(() => removeMatch(code), 5000);
        }
      }
      return;
    }
    
    // Move is valid (at least format-wise), proceed
    addMove(code,move,fen);
    
    // Game should already be started at this point (validated above)
    // But ensure it's marked as started if somehow it wasn't
    if (m && !m.gameStarted && m.playersJoined === 2) {
      setGameStarted(code, true);
    }
    
    // Store move in history (client will send full move history via gameStateUpdate)
    // For now, we just track the move string
    if (m) {
      // The move history will be updated via gameStateUpdate event from client
    }
    
    // Broadcast move and current timer state to keep all clients synchronized
    io.to(code).emit("moveMade",{
      move,
      fen,
      whiteTime: m.whiteTime,
      blackTime: m.blackTime
    });
    if(check75MoveRule(code)){
      setGameOver(code, "1/2-1/2", "75-move rule");
      io.to(code).emit("gameOver",{result:"1/2-1/2",reason:"75-move rule"});
      // Clean up match after a short delay to allow clients to process gameOver event
      setTimeout(() => removeMatch(code), 5000);
    }
  });
  
  // Timer sync events
  socket.on("timerUpdate", ({ code, whiteTime, blackTime }) => {
    const m = getMatch(code);
    if (!m) return;
    
    // Update server timer state
    updateTimer(code, whiteTime, blackTime);
    
    // Broadcast authoritative timer state to all clients in the room
    // This keeps all clients synchronized
    io.to(code).emit("timerSync", {
      whiteTime: m.whiteTime,
      blackTime: m.blackTime
    });
  });
  
  socket.on("gameStarted", ({ code }) => {
    const m = getMatch(code);
    if (!m) return;
    
    // Validation: Only allow game to start if both players have joined
    if (m.playersJoined < 2) {
      console.log('Game start rejected: both players not joined', { code, playersJoined: m.playersJoined });
      return;
    }
    
    // Only set game started if it hasn't been started yet
    if (!m.gameStarted) {
      setGameStarted(code, true);
      // Broadcast to all players
      io.to(code).emit("gameState", {
        fen: m.fen || "",
        timeControl: m.timeControl,
        whiteToMove: m.whiteToMove,
        gameStarted: true,
        timerActive: true,
        whiteTime: m.whiteTime,
        blackTime: m.blackTime,
        increment: m.increment,
        moveHistory: m.moveHistory || [],
        capturedPieces: m.capturedPieces || { white: [], black: [] },
        inCheck: m.inCheck,
        checkSquare: m.checkSquare,
        gameOver: m.gameOver,
        gameResult: m.gameResult,
        drawOffer: m.drawOffer,
        white: m.white,
        black: m.black
      });
    }
  });
  
  socket.on("gameStateUpdate", ({ code, state }) => {
    updateGameState(code, state);
  });

  socket.on("illegalMove",({code,color})=>{
    const m=getMatch(code); if(!m)return;
    const count=addIllegal(code,color);
    
    // Deduct 5 seconds from player's timer
    if (color === 'white') {
      m.whiteTime = Math.max(0, m.whiteTime - ILLEGAL_MOVE_TIME_PENALTY);
    } else {
      m.blackTime = Math.max(0, m.blackTime - ILLEGAL_MOVE_TIME_PENALTY);
    }
    
    // Broadcast illegal move penalty to all players and spectators
    io.to(code).emit("illegalMovePenalty",{color,remaining:ILLEGAL_MOVE_LIMIT - count});
    
    // Sync timer state after penalty
    io.to(code).emit("timerSync", {
      whiteTime: m.whiteTime,
      blackTime: m.blackTime
    });
    
    if(count >= ILLEGAL_MOVE_LIMIT){
      const winner=color==="white"?"black":"white";
      setGameOver(code, winner === "white" ? "1-0" : "0-1", "Illegal move forfeit");
      io.to(code).emit("gameOver",{result:winner==="white"?"1-0":"0-1",reason:"Illegal move forfeit"});
      // Clean up match after a short delay to allow clients to process gameOver event
      setTimeout(() => removeMatch(code), 5000);
    }
  });

  socket.on("resign",({code,color})=>{
    const m=getMatch(code); if(!m)return;
    
    // Validation: Check if game has started and both players joined
    if (!m.gameStarted) {
      console.log('Resign rejected: game not started', { code });
      return;
    }
    
    if (m.playersJoined < 2) {
      console.log('Resign rejected: both players not joined', { code });
      return;
    }
    
    // Validation: Check if player is connected
    const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
    if (!playerColor || playerColor !== color) {
      console.log('Resign rejected: invalid player', { code, color, playerColor });
      return;
    }
    
    const winner=color==="white"?"black":"white";
    setGameOver(code, winner === "white" ? "1-0" : "0-1", `${color} resigned`);
    io.to(code).emit("gameOver",{result:winner==="white"?"1-0":"0-1",reason:`${color} resigned`});
    // Clean up match after a short delay to allow clients to process gameOver event
    setTimeout(() => removeMatch(code), 5000);
  });

  socket.on("drawOffer",({code,from})=>{
    const m=getMatch(code); if(!m)return;
    
    // Validation: Check if game has started and both players joined
    if (!m.gameStarted) {
      console.log('Draw offer rejected: game not started', { code });
      return;
    }
    
    if (m.playersJoined < 2) {
      console.log('Draw offer rejected: both players not joined', { code });
      return;
    }
    
    // Validation: Check if player is connected
    const playerColor = m.white === socket.id ? 'white' : (m.black === socket.id ? 'black' : null);
    if (!playerColor || playerColor !== from) {
      console.log('Draw offer rejected: invalid player', { code, from, playerColor });
      return;
    }
    
    io.to(code).emit("drawOffer",{from});
  });

  socket.on("acceptDraw",({code})=>{
    setGameOver(code, "1/2-1/2", "Draw by agreement");
    io.to(code).emit("drawAccepted",{});
    io.to(code).emit("gameOver",{result:"1/2-1/2",reason:"Draw by agreement"});
    // Clean up match after a short delay to allow clients to process gameOver event
    setTimeout(() => removeMatch(code), 5000);
  });

  socket.on("declineDraw",({code})=>{
    io.to(code).emit("drawDeclined",{});
  });

  // Handle gameOver events from client (checkmate, draws, etc.)
  socket.on("gameOver",({code, result, reason})=>{
    const m=getMatch(code); 
    if(!m)return;
    
    // Set game over state on server
    setGameOver(code, result, reason);
    
    // Broadcast to all players in the room
    io.to(code).emit("gameOver",{result, reason});
    
    // Clean up match after a short delay to allow clients to process gameOver event
    setTimeout(() => removeMatch(code), 5000);
  });

  socket.on("endGame",(code)=>removeMatch(code));
  
  socket.on("cancelGame",({code})=>{
    const m=getMatch(code); if(!m)return;
    
    // Only allow cancel if game hasn't started
    if (m.gameStarted) {
      console.log('Cancel rejected: game already started', { code });
      socket.emit("cancelGameError", { message: "Cannot cancel game that has already started" });
      return;
    }
    
    // Only allow cancel by the first player (game creator)
    // Check if this socket is one of the players
    const isPlayer = m.white === socket.id || m.black === socket.id;
    if (!isPlayer) {
      console.log('Cancel rejected: not a player', { code });
      socket.emit("cancelGameError", { message: "Only players can cancel the game" });
      return;
    }
    
    // Notify all players that game was cancelled
    io.to(code).emit("gameCancelled", { message: "Game cancelled by player" });
    
    // Remove the match
    removeMatch(code);
  });
});

// Serve React app for all non-API routes (SPA routing)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

server.listen(3000,()=>console.log("PrimeChess server running"));
