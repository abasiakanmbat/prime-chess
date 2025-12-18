import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense } from 'react';
import BoardGrid from './BoardGrid';
import ChessPieces from './ChessPieces';

export default function ChessBoard3D({ 
  board, 
  whiteToMove, 
  selectedSquare, 
  legalMoves,
  checkSquare,
  onSquareClick,
  allowMoves,
  lastMove
}) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
          
          {/* Premium lighting setup for luxurious appearance */}
          <ambientLight intensity={0.55} />
          
          {/* Main directional light - soft, premium illumination */}
          <directionalLight 
            position={[10, 13, 8]} 
            intensity={1.1} 
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          
          {/* Premium fill light - warm and soft */}
          <directionalLight position={[-8, 11, -6]} intensity={0.45} />
          
          {/* Accent lights for premium depth and richness */}
          <pointLight position={[5, 11, 5]} intensity={0.65} distance={16} decay={2} />
          <pointLight position={[-5, 11, -5]} intensity={0.55} distance={16} decay={2} />
          
          {/* Premium rim light for elegant board edge definition */}
          <pointLight position={[0, 9, -8]} intensity={0.35} distance={13} decay={2} />
          
          {/* Additional premium accent light from above */}
          <pointLight position={[0, 12, 0]} intensity={0.4} distance={18} decay={2.5} />
          
          <BoardGrid 
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            checkSquare={checkSquare}
            onSquareClick={onSquareClick}
            allowMoves={allowMoves}
          />
          
          <ChessPieces 
            board={board}
            whiteToMove={whiteToMove}
            selectedSquare={selectedSquare}
            onPieceClick={onSquareClick}
            allowMoves={allowMoves}
            lastMove={lastMove}
          />
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={20}
            target={[0, 0, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

