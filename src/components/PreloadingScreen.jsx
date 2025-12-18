import { useEffect, useState, useRef } from 'react';
import preloadingVideo from '../assets/primeloading.mp4';
import loadingAudio from '../assets/sounds/loading-screen.mp3';

export default function PreloadingScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Play preloading video and audio
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log('Video autoplay failed:', err));
    }

    // Play audio 3 seconds into the preload (delay by 3 seconds from start)
    const audioTimer = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.log('Audio autoplay failed:', err));
      }
    }, 3000);

    // Complete preload after 8 seconds
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, 8000);

    return () => {
      clearTimeout(audioTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center overflow-hidden">
      {/* Preloading Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
      >
        <source src={preloadingVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={loadingAudio} />
    </div>
  );
}
