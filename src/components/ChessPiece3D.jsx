import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const PIECE_SCALE = 0.75; // Scaled down to fit better within squares
const PIECE_HEIGHT = 0.6;

// Import chess piece images from chessboard-element
import wP from '../assets/chesspieces/wikipedia/wP.png';
import wR from '../assets/chesspieces/wikipedia/wR.png';
import wN from '../assets/chesspieces/wikipedia/wN.png';
import wB from '../assets/chesspieces/wikipedia/wB.png';
import wQ from '../assets/chesspieces/wikipedia/wQ.png';
import wK from '../assets/chesspieces/wikipedia/wK.png';
import bP from '../assets/chesspieces/wikipedia/bP.png';
import bR from '../assets/chesspieces/wikipedia/bR.png';
import bN from '../assets/chesspieces/wikipedia/bN.png';
import bB from '../assets/chesspieces/wikipedia/bB.png';
import bQ from '../assets/chesspieces/wikipedia/bQ.png';
import bK from '../assets/chesspieces/wikipedia/bK.png';

// Map piece codes to imported images
const PIECE_IMAGE_MAP = {
  'wP': wP,
  'wR': wR,
  'wN': wN,
  'wB': wB,
  'wQ': wQ,
  'wK': wK,
  'bP': bP,
  'bR': bR,
  'bN': bN,
  'bB': bB,
  'bQ': bQ,
  'bK': bK,
};

function PieceImage({ pieceCode }) {
  const imagePath = PIECE_IMAGE_MAP[pieceCode];
  if (!imagePath) {
    console.warn(`No image found for piece: ${pieceCode}`);
    return null;
  }
  
  const isWhite = pieceCode[0] === 'w';
  const texture = useTexture(imagePath);
  
  // Configure texture properly for PNG with transparency
  useEffect(() => {
    if (texture) {
      texture.flipY = true; // Changed to true to fix reversed images
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.format = THREE.RGBAFormat;
      // Ensure texture uses proper resolution (512x512)
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
    }
  }, [texture]);
  
  return (
    <Billboard>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial 
          map={texture}
          transparent={true}
          alphaTest={0.01}
          depthWrite={false}
          side={THREE.FrontSide}
          toneMapped={false}
          roughness={isWhite ? 0.15 : 0.3}
          metalness={isWhite ? 0.1 : 0.2}
          color={isWhite ? '#FAFAFA' : '#0A0A0A'} // Pearl white and jet black
          emissive={isWhite ? '#FAFAFA' : '#0A0A0A'}
          emissiveIntensity={isWhite ? 0.2 : 0.05}
        />
      </mesh>
    </Billboard>
  );
}

export default function ChessPiece3D({ piece, position, isSelected, canMove, onClick, targetPosition }) {
  const meshRef = useRef();
  const isWhite = piece[0] === 'w';
  const type = piece[1];
  const [currentPos, setCurrentPos] = useState(position);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTargetRef = useRef(null);
  const animationIdRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Track if component is mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, []);

  // Initialize position when component mounts or position changes (when not animating)
  useEffect(() => {
    if (!isAnimating && !targetPosition) {
      // Round position to ensure precise placement
      const precisePos = {
        x: Math.round(position.x * 1000) / 1000,
        y: Math.round(position.y * 1000) / 1000,
        z: Math.round(position.z * 1000) / 1000
      };
      setCurrentPos(precisePos);
      // Also update mesh directly for immediate positioning
      if (meshRef.current) {
        meshRef.current.position.set(precisePos.x, precisePos.y, precisePos.z);
      }
    }
  }, [position, isAnimating, targetPosition]);

  // Animate piece movement when targetPosition is provided
  useEffect(() => {
    // Cancel any existing animation
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    
    // If we have a targetPosition, animate from source position to target
    if (targetPosition) {
      const dx = Math.abs(targetPosition.x - position.x);
      const dz = Math.abs(targetPosition.z - position.z);
      
      // Only animate if there's actual movement
      if (dx > 0.01 || dz > 0.01) {
        // Check if this is a new animation (different target)
        const targetKey = `${targetPosition.x.toFixed(2)},${targetPosition.z.toFixed(2)}`;
        const prevKey = prevTargetRef.current;
        
        if (targetKey !== prevKey) {
          setIsAnimating(true);
          prevTargetRef.current = targetKey;
          
          // Start from the source position (position prop is the source when targetPosition exists)
          const startPos = { 
            x: position.x, 
            y: position.y, 
            z: position.z 
          };
          const endPos = { 
            x: targetPosition.x, 
            y: targetPosition.y, 
            z: targetPosition.z 
          };
          const duration = 300; // ms - smooth animation duration
          
          // Set initial position immediately to source - this is critical for animation
          setCurrentPos(startPos);
          
          // Start animation on next frame to ensure position is set and React has rendered
          requestAnimationFrame(() => {
            if (!mountedRef.current) return;
            
            const startTime = performance.now(); // Use performance.now() for better precision
            
            const animate = (currentTime) => {
              if (!mountedRef.current) {
                animationIdRef.current = null;
                return;
              }
              
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // Smooth easing function (ease-in-out-cubic)
              const eased = progress < 0.5 
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
              
              // Calculate position with smooth arc
              const arcHeight = Math.sin(eased * Math.PI) * 0.25; // Slightly lower arc
              const newPos = {
                x: startPos.x + (endPos.x - startPos.x) * eased,
                y: startPos.y + arcHeight,
                z: startPos.z + (endPos.z - startPos.z) * eased
              };
              setCurrentPos(newPos);
              // Also update mesh position directly for smoother animation
              if (meshRef.current) {
                meshRef.current.position.set(newPos.x, newPos.y, newPos.z);
              }
              
              if (progress < 1) {
                animationIdRef.current = requestAnimationFrame(animate);
              } else {
                // Ensure final position is exactly on target with precise values
                const finalPos = {
                  x: Math.round(endPos.x * 1000) / 1000, // Round to 3 decimal places for precision
                  y: Math.round(endPos.y * 1000) / 1000,
                  z: Math.round(endPos.z * 1000) / 1000
                };
                setCurrentPos(finalPos);
                // Set mesh position directly to ensure exact placement
                if (meshRef.current) {
                  meshRef.current.position.set(finalPos.x, finalPos.y, finalPos.z);
                }
                setIsAnimating(false);
                animationIdRef.current = null;
                // Clear target after animation completes
                setTimeout(() => {
                  if (mountedRef.current) {
                    prevTargetRef.current = null;
                  }
                }, 50);
              }
            };
            
            animationIdRef.current = requestAnimationFrame(animate);
          });
        }
      } else {
        // No movement needed, just set position
        if (!isAnimating) {
          setCurrentPos(position);
        }
      }
    } else {
      // No target position - update position if not animating
      if (!isAnimating) {
        setCurrentPos(position);
      }
    }
    
    // Cleanup function
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [targetPosition, position, isAnimating]);
  
  // Hover and selection animation - use useFrame for smooth updates
  useFrame((state) => {
    if (meshRef.current) {
      const hover = isSelected ? 0.2 : 0;
      // Directly set position for precise placement (no lerp during animation)
      if (isAnimating) {
        meshRef.current.position.set(currentPos.x, currentPos.y + hover, currentPos.z);
      } else {
        // Smoothly interpolate to target position only when not animating
        meshRef.current.position.lerp(
          new THREE.Vector3(currentPos.x, currentPos.y + hover, currentPos.z),
          0.5 // Faster lerp for snappier response
        );
      }
    }
  });

  const handleClick = useCallback((e) => {
    // Stop propagation to prevent double-clicking issues
    e.stopPropagation();
    // Prevent rapid clicks (reduced from 150ms to 50ms for better responsiveness)
    const now = Date.now();
    if (window.lastPieceClickTime && (now - window.lastPieceClickTime) < 50) {
      return;
    }
    window.lastPieceClickTime = now;
    
    if (canMove) {
      onClick();
    }
  }, [canMove, onClick]);

  return (
    <group
      ref={meshRef}
      position={[currentPos.x, currentPos.y, currentPos.z]}
      onClick={handleClick}
      onPointerDown={(e) => {
        // Allow piece clicks to work properly
        e.stopPropagation();
      }}
      onPointerOver={(e) => {
        if (canMove) {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={(e) => {
        document.body.style.cursor = 'default';
      }}
      scale={PIECE_SCALE}
    >
      <PieceImage pieceCode={piece} />
      {isSelected && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshStandardMaterial color="#ffff00" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

