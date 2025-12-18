import { useMemo } from 'react';
import { Box, Text } from '@react-three/drei';

const SQUARE_SIZE = 1;
const BOARD_HEIGHT = 0.18; // Premium thicker board
const BORDER_WIDTH = 0.5; // Wider, more luxurious border
const BASE_HEIGHT = 0.35; // Taller, more elegant base
const INLAY_WIDTH = 0.08; // Decorative inlay width

function Square({ position, isLight, isSelected, isLegalMove, isInCheck, onClick, allowMoves }) {
  const color = useMemo(() => {
    // Only highlight selected piece - no legal move, check, or other highlights
    if (isSelected) return '#e8d5a3'; // Warmer, more premium selection color
    // Premium wooden chess board colors - rich maple and dark walnut
    return isLight ? '#f5e6d3' : '#8b6f47'; // Premium wood tones
  }, [isSelected]);

  return (
    <group>
      {/* Premium square with refined beveled edges */}
      <mesh
        position={[position.x, position.y + BOARD_HEIGHT / 2, position.z]}
      >
        <boxGeometry args={[SQUARE_SIZE, BOARD_HEIGHT, SQUARE_SIZE]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.65}
          metalness={0.08}
          flatShading={false}
        />
      </mesh>
      {/* Premium edge highlight with subtle sheen */}
      <mesh
        position={[position.x, position.y + BOARD_HEIGHT + 0.001, position.z]}
      >
        <boxGeometry args={[SQUARE_SIZE, 0.008, SQUARE_SIZE]} />
        <meshStandardMaterial 
          color={isLight ? '#faf5ed' : '#a6896b'}
          roughness={0.2}
          metalness={0.15}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Invisible hitbox that extends above pieces for easier clicking */}
      <mesh
        position={[position.x, position.y + 2, position.z]}
        onClick={(e) => {
          if (allowMoves) {
            e.stopPropagation();
            onClick(e);
          }
        }}
        onPointerDown={(e) => {
          // Use onPointerDown for more reliable click detection
          if (allowMoves) {
            e.stopPropagation();
          }
        }}
        onPointerOver={(e) => {
          if (allowMoves) {
            e.stopPropagation();
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={(e) => {
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[SQUARE_SIZE, 4, SQUARE_SIZE]} />
        <meshStandardMaterial 
          transparent 
          opacity={0.01} 
          visible={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function BoardGrid({ selectedSquare, legalMoves, checkSquare, onSquareClick, allowMoves }) {
  const squares = useMemo(() => {
    const sqs = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const isLight = (row + col) % 2 === 0;
        const position = {
          x: (col - 3.5) * SQUARE_SIZE,
          y: 0, // Squares sit on top of base
          z: (row - 3.5) * SQUARE_SIZE
        };
        
        const isSelected = selectedSquare && selectedSquare.row === row && selectedSquare.col === col;
        const isLegalMove = legalMoves?.some(m => m[0] === row && m[1] === col);
        const isInCheck = checkSquare && checkSquare.row === row && checkSquare.col === col;
        
        sqs.push({
          row,
          col,
          position,
          isLight,
          isSelected,
          isLegalMove,
          isInCheck
        });
      }
    }
    return sqs;
  }, [selectedSquare, legalMoves, checkSquare]);

  // Generate premium wooden border with decorative inlay
  const border = useMemo(() => {
    const boardSize = 8 * SQUARE_SIZE;
    const borderHeight = BOARD_HEIGHT;
    const boardCenter = 0;
    const boardEdge = boardSize / 2;
    const borderEdge = boardEdge + BORDER_WIDTH / 2;
    const borderColor = '#d4c4a8'; // Rich, premium cream border
    const inlayColor = '#8b7355'; // Dark wood inlay
    
    return (
      <group>
        {/* Top border */}
        <mesh position={[boardCenter, borderHeight / 2, borderEdge]}>
          <boxGeometry args={[boardSize + BORDER_WIDTH * 2, borderHeight, BORDER_WIDTH]} />
          <meshStandardMaterial 
            color={borderColor}
            roughness={0.55}
            metalness={0.08}
          />
        </mesh>
        {/* Top decorative inlay */}
        <mesh position={[boardCenter, borderHeight + 0.002, borderEdge]}>
          <boxGeometry args={[boardSize + BORDER_WIDTH * 2 - INLAY_WIDTH * 2, INLAY_WIDTH, BORDER_WIDTH - INLAY_WIDTH * 2]} />
          <meshStandardMaterial 
            color={inlayColor}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        
        {/* Bottom border */}
        <mesh position={[boardCenter, borderHeight / 2, -borderEdge]}>
          <boxGeometry args={[boardSize + BORDER_WIDTH * 2, borderHeight, BORDER_WIDTH]} />
          <meshStandardMaterial 
            color={borderColor}
            roughness={0.55}
            metalness={0.08}
          />
        </mesh>
        {/* Bottom decorative inlay */}
        <mesh position={[boardCenter, borderHeight + 0.002, -borderEdge]}>
          <boxGeometry args={[boardSize + BORDER_WIDTH * 2 - INLAY_WIDTH * 2, INLAY_WIDTH, BORDER_WIDTH - INLAY_WIDTH * 2]} />
          <meshStandardMaterial 
            color={inlayColor}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        
        {/* Left border */}
        <mesh position={[-borderEdge, borderHeight / 2, boardCenter]}>
          <boxGeometry args={[BORDER_WIDTH, borderHeight, boardSize]} />
          <meshStandardMaterial 
            color={borderColor}
            roughness={0.55}
            metalness={0.08}
          />
        </mesh>
        {/* Left decorative inlay */}
        <mesh position={[-borderEdge, borderHeight + 0.002, boardCenter]}>
          <boxGeometry args={[BORDER_WIDTH - INLAY_WIDTH * 2, INLAY_WIDTH, boardSize - INLAY_WIDTH * 2]} />
          <meshStandardMaterial 
            color={inlayColor}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        
        {/* Right border */}
        <mesh position={[borderEdge, borderHeight / 2, boardCenter]}>
          <boxGeometry args={[BORDER_WIDTH, borderHeight, boardSize]} />
          <meshStandardMaterial 
            color={borderColor}
            roughness={0.55}
            metalness={0.08}
          />
        </mesh>
        {/* Right decorative inlay */}
        <mesh position={[borderEdge, borderHeight + 0.002, boardCenter]}>
          <boxGeometry args={[BORDER_WIDTH - INLAY_WIDTH * 2, INLAY_WIDTH, boardSize - INLAY_WIDTH * 2]} />
          <meshStandardMaterial 
            color={inlayColor}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
      </group>
    );
  }, []);

  // Generate premium base/stand with elegant design
  const base = useMemo(() => {
    const boardSize = 8 * SQUARE_SIZE;
    const baseSize = boardSize + BORDER_WIDTH * 2 + 0.6; // Slightly larger than board
    const baseY = -BOARD_HEIGHT / 2 - BASE_HEIGHT / 2;
    const baseColor = '#1a1a1a'; // Deep black base
    const accentColor = '#3a3a3a'; // Subtle accent
    
    return (
      <group>
        {/* Main base - premium dark wood */}
        <mesh position={[0, baseY, 0]}>
          <boxGeometry args={[baseSize, BASE_HEIGHT, baseSize]} />
          <meshStandardMaterial 
            color={baseColor}
            roughness={0.75}
            metalness={0.12}
          />
        </mesh>
        {/* Base top surface - premium finish */}
        <mesh position={[0, baseY + BASE_HEIGHT / 2 + 0.005, 0]}>
          <boxGeometry args={[baseSize, 0.015, baseSize]} />
          <meshStandardMaterial 
            color={accentColor}
            roughness={0.35}
            metalness={0.25}
          />
        </mesh>
        {/* Base decorative edge band */}
        <mesh position={[0, baseY + BASE_HEIGHT / 2 - 0.05, 0]}>
          <boxGeometry args={[baseSize + 0.1, 0.02, baseSize + 0.1]} />
          <meshStandardMaterial 
            color="#2a2a2a"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      </group>
    );
  }, []);

  // Generate rank labels (1-8) on left and right sides of white border
  const rankLabels = useMemo(() => {
    const labels = [];
    const borderOffset = 4 + BORDER_WIDTH / 2;
    
    for (let row = 0; row < 8; row++) {
      const rank = 8 - row; // Chess ranks go from 8 (top) to 1 (bottom)
      const yPos = row * SQUARE_SIZE - 3.5 * SQUARE_SIZE;
      
      // Left side - premium typography
      labels.push(
        <Text
          key={`rank-left-${row}`}
          position={[-borderOffset, BOARD_HEIGHT + 0.06, yPos]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.42}
          color="#0d0d0d"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {rank}
        </Text>
      );
      
      // Right side - premium typography
      labels.push(
        <Text
          key={`rank-right-${row}`}
          position={[borderOffset, BOARD_HEIGHT + 0.06, yPos]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.42}
          color="#0d0d0d"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {rank}
        </Text>
      );
    }
    return labels;
  }, []);

  // Generate file labels (a-h) on bottom and top of white border
  const fileLabels = useMemo(() => {
    const labels = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const borderOffset = 4 + BORDER_WIDTH / 2;
    
    for (let col = 0; col < 8; col++) {
      const file = files[col];
      const xPos = col * SQUARE_SIZE - 3.5 * SQUARE_SIZE;
      
      // Bottom side - premium typography
      labels.push(
        <Text
          key={`file-bottom-${col}`}
          position={[xPos, BOARD_HEIGHT + 0.06, -borderOffset]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.42}
          color="#0d0d0d"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {file}
        </Text>
      );
      
      // Top side - premium typography
      labels.push(
        <Text
          key={`file-top-${col}`}
          position={[xPos, BOARD_HEIGHT + 0.06, borderOffset]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.42}
          color="#0d0d0d"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {file}
        </Text>
      );
    }
    return labels;
  }, []);

  return (
    <group>
      {base}
      {border}
      {squares.map((square) => (
        <Square
          key={`${square.row}-${square.col}`}
          position={square.position}
          isLight={square.isLight}
          isSelected={square.isSelected}
          isLegalMove={square.isLegalMove}
          isInCheck={square.isInCheck}
          onClick={(e) => {
            e.stopPropagation();
            onSquareClick(square.row, square.col);
          }}
          allowMoves={allowMoves}
        />
      ))}
      {rankLabels}
      {fileLabels}
    </group>
  );
}

