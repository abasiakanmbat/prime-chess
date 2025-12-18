import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PreloadingScreen from './components/PreloadingScreen';
import Lobby from './components/Lobby';
import Game from './components/Game';
import SpectatorView from './components/SpectatorView';

function App() {
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    // Check if user has already seen preloading screen in this session
    const hasSeenPreload = sessionStorage.getItem('preloadingSeen');
    if (hasSeenPreload) {
      setIsPreloading(false);
    }
  }, []);

  const handlePreloadingComplete = () => {
    setIsPreloading(false);
    // Mark that preloading has been seen this session
    sessionStorage.setItem('preloadingSeen', 'true');
  };

  if (isPreloading) {
    return <PreloadingScreen onComplete={handlePreloadingComplete} />;
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/play" element={<Game />} />
        <Route path="/watch" element={<SpectatorView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

