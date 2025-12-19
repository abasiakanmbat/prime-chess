import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VALID_TIME_CONTROLS } from '../utils/constants';
import { getApiEndpoint } from '../utils/apiConfig';
import ErrorModal from './ErrorModal';
import mainscreenLoop from '../assets/mainscreenloop.mp4';

export default function Lobby() {
  const [gameCode, setGameCode] = useState('');
  const [selectedTimeControl, setSelectedTimeControl] = useState('15+10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  const handleInputChange = (event) => {
    if(event.target.value.length === 6) {
      setGameCode(event.target.value.toUpperCase());

    }
  };

  const createGame = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use current app URL as API URL
      const apiUrl = getApiEndpoint('create-game');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeControl: selectedTimeControl }),
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.code) {
        throw new Error('Invalid response from server');
      }
      
      setGameCode(data.code);
    } catch (error) {
      console.error('Failed to create game:', error);
      setError('Failed to create game. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const joinGame = () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }
    if (gameCode.length !== 6) {
      setError('Game code must be 6 characters');
      return;
    }
    // Navigate to game - color will be assigned automatically by server
    navigate(`/play?code=${gameCode}&timeControl=${selectedTimeControl}`);
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
    alert('Game code copied to clipboard!');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Animated Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={mainscreenLoop} type="video/mp4" />
      </video>

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Container - Positioned on top of video */}
      <div className="relative z-10 bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 md:p-12 w-full max-w-2xl border-2 border-cyan-400/30">
        <h1 className="text-5xl xl:text-7xl font-megatron font-bold text-center mb-12 text-cyan-400 tracking-wider drop-shadow-lg" style={{textShadow: '0 0 20px rgba(34, 211, 238, 0.8)'}}>
          PrimeChess OTB
        </h1>

        {!gameCode ? (
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-workforce font-bold text-cyan-300 mb-4 uppercase tracking-widest drop-shadow-lg" style={{textShadow: '0 0 10px rgba(34, 211, 238, 0.6)'}}>
                Select Time Control
              </label>
              <div className="grid md:grid-cols-3 gap-4">
                {VALID_TIME_CONTROLS.map((tc) => {
                  const [minutes, increment] = tc.split('+');
                  return (
                    <button
                      key={tc}
                      onClick={() => setSelectedTimeControl(tc)}
                      className={`px-6 py-4 rounded-full font-bold transition-all duration-300 hover:scale-105 ${
                        selectedTimeControl === tc
                          ? 'bg-gradient-to-r from-cyan-400 to-green-400 text-black shadow-lg border-2 border-cyan-300'
                          : 'bg-gradient-to-r from-cyan-400/30 to-green-400/30 text-cyan-200 border-2 border-cyan-400/50 hover:from-cyan-400/50 hover:to-green-400/50'
                      }`}
                      style={{
                        boxShadow: selectedTimeControl === tc 
                          ? '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(74, 222, 128, 0.4)'
                          : '0 0 10px rgba(34, 211, 238, 0.4)'
                      }}
                    >
                      <div className="text-2xl font-sans font-bold group-hover:text-3xl transition-all">
                        {tc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={createGame}
                disabled={loading}
                className="px-12 py-2 bg-gradient-to-r from-cyan-400 to-green-400 hover:from-cyan-300 hover:to-green-300 text-black font-workforce font-bold rounded-full transition-all duration-300 flex items-center justify-center text-center uppercase tracking-wider text-2xl border-2 border-cyan-300 hover:scale-110"
                style={{
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(74, 222, 128, 0.4)'
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : 'Create Game'}
              </button>
            </div>

            <div className="text-center text-cyan-300 text-sm font-workforce uppercase tracking-widest">
              ─────── OR ───────
            </div>

            <div>
              <label className="block text-2xl font-workforce font-bold text-cyan-300 mb-4 uppercase tracking-widest drop-shadow-lg" style={{textShadow: '0 0 10px rgba(34, 211, 238, 0.6)'}}>
                Join or Watch
              </label>
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input
                  type="text"
                  // value={gameCode}
                  onChange={(e) => handleInputChange(e)}
                  placeholder="GAME CODE"
                  className="flex-1 px-6 py-3 bg-black/50 text-cyan-300 border-2 border-cyan-400 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent uppercase font-mono backdrop-blur-sm placeholder-cyan-600 text-center text-2xl"
                  maxLength={6}
                  style={{boxShadow: '0 0 10px rgba(34, 211, 238, 0.4)', letterSpacing: '0.25em'}}
                />
                <button
                  onClick={joinGame}
                  className="px-8 py-2 bg-gradient-to-r from-cyan-400 to-green-400 hover:from-cyan-300 hover:to-green-300 text-black font-workforce font-bold rounded-full transition-all duration-300 border-2 border-cyan-300 uppercase tracking-wider text-lg hover:scale-110"
                  style={{
                    boxShadow: '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(74, 222, 128, 0.4)'
                  }}
                >
                  Join
                </button>
              </div>
              <button
                onClick={() => {
                  if (!gameCode.trim()) {
                    setError('Please enter a game code');
                    return;
                  }
                  if (gameCode.length !== 6) {
                    setError('Game code must be 6 characters');
                    return;
                  }
                  navigate(`/watch?code=${gameCode}`);
                }}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-workforce font-bold rounded-full transition-all duration-300 border-2 border-purple-400 uppercase tracking-wider hover:scale-105"
                style={{
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)'
                }}
              >
                Watch as Spectator
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-cyan-400/50">
              <div className="text-sm text-cyan-400 mb-4 uppercase font-workforce tracking-widest drop-shadow-lg" style={{textShadow: '0 0 10px rgba(34, 211, 238, 0.6)'}}>Game Code</div>
              <div className="text-4xl md:text-5xl font-mono font-bold mb-6 text-cyan-300 tracking-[0.5em] drop-shadow-lg" style={{textShadow: '0 0 20px rgba(34, 211, 238, 0.8)'}}>{gameCode}</div>
              <button
                onClick={copyGameCode}
                className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-green-400 hover:from-cyan-300 hover:to-green-300 text-black rounded-full transition-all font-workforce font-bold uppercase tracking-wider text-sm border-2 border-cyan-300"
                style={{
                  boxShadow: '0 0 15px rgba(34, 211, 238, 0.6)'
                }}
              >
                Copy Code
              </button>
            </div>

            <div className="text-cyan-300 text-lg font-workforce drop-shadow-lg">
              Share this code with your opponent. Waiting for player to join...
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/play?code=${gameCode}&color=white&timeControl=${selectedTimeControl}`)}
                className="flex-1 py-4 bg-white hover:bg-gray-100 text-black font-workforce font-bold rounded-full transition-all border-2 border-white uppercase tracking-wider drop-shadow-lg"
                style={{
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.6)'
                }}
              >
                Join as White
              </button>
              <button
                onClick={() => navigate(`/play?code=${gameCode}&color=black&timeControl=${selectedTimeControl}`)}
                className="flex-1 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-cyan-300 font-workforce font-bold rounded-full transition-all border-2 border-cyan-400/50 uppercase tracking-wider"
                style={{
                  boxShadow: '0 0 15px rgba(34, 211, 238, 0.4)'
                }}
              >
                Join as Black
              </button>
            </div>
           <button
                onClick={() => {
                  if (!gameCode.trim()) {
                    setError('Please enter a game code');
                    return;
                  }
                  if (gameCode.length !== 6) {
                    setError('Game code must be 6 characters');
                    return;
                  }
                  navigate(`/watch?code=${gameCode}`);
                }}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-workforce font-bold rounded-full transition-all duration-300 border-2 border-purple-400 uppercase tracking-wider hover:scale-105"
                style={{
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)'
                }}
              >
                Watch as Spectator
              </button>

            <button
              onClick={() => setGameCode('')}
              className="w-full py-2 text-cyan-400 hover:text-cyan-300 transition-colors font-workforce uppercase tracking-wider drop-shadow-lg"
              style={{textShadow: '0 0 10px rgba(34, 211, 238, 0.4)'}}
            >
              Back
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <ErrorModal
          message={error}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}

