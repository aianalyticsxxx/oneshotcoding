'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { Laptop } from './Laptop';

interface LaptopSceneProps {
  children?: React.ReactNode;
}

function SceneContent({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* Ambient lighting for base illumination */}
      <ambientLight intensity={0.3} />

      {/* Main key light - soft white from above-front */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Cyan rim light - cyberpunk accent from left */}
      <pointLight position={[-5, 3, -2]} intensity={15} color="#00ffff" />

      {/* Magenta rim light - cyberpunk accent from right */}
      <pointLight position={[5, 2, -3]} intensity={12} color="#ff00ff" />

      {/* Soft fill from below for screen glow bounce */}
      <pointLight position={[0, -2, 2]} intensity={3} color="#4488ff" />

      {/* The laptop */}
      <Laptop>{children}</Laptop>

      {/* Contact shadow on ground plane */}
      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={0.5}
        scale={10}
        blur={2}
        far={4}
        color="#000033"
      />

      {/* Orbit controls - full rotation with constraints */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}  // Don't go too far above
        maxPolarAngle={Math.PI / 2}   // Don't go below ground
        autoRotate
        autoRotateSpeed={0.3}
        dampingFactor={0.05}
        enableDamping
      />

      {/* Environment for reflections */}
      <Environment preset="night" />
    </>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#333" wireframe />
    </mesh>
  );
}

export function LaptopScene({ children }: LaptopSceneProps) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 3.5, 6], fov: 45 }}
        shadows
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent>{children}</SceneContent>
        </Suspense>
      </Canvas>
    </div>
  );
}
