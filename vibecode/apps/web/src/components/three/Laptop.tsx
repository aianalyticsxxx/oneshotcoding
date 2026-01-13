'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface LaptopProps {
  children?: React.ReactNode;
}

// Laptop dimensions (roughly MacBook proportions)
const BASE_WIDTH = 3.2;
const BASE_DEPTH = 2.2;
const BASE_HEIGHT = 0.12;

const SCREEN_WIDTH = 3.0;
const SCREEN_HEIGHT = 2.0;
const SCREEN_DEPTH = 0.08;
const BEZEL_WIDTH = 0.1;

const HINGE_ANGLE = -Math.PI / 9; // ~20 degrees open

export function Laptop({ children }: LaptopProps) {
  const groupRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Group>(null);
  const [screenOn, setScreenOn] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  // Screen flicker on effect
  useEffect(() => {
    const flickerSequence = async () => {
      await new Promise(r => setTimeout(r, 500));
      setScreenOn(true);
      setGlowIntensity(0.3);
      await new Promise(r => setTimeout(r, 100));
      setGlowIntensity(0);
      await new Promise(r => setTimeout(r, 50));
      setGlowIntensity(0.5);
      await new Promise(r => setTimeout(r, 80));
      setGlowIntensity(0.2);
      await new Promise(r => setTimeout(r, 60));
      setGlowIntensity(1);
    };
    flickerSequence();
  }, []);

  // Subtle floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    }
  });

  // Materials
  const aluminumMaterial = new THREE.MeshStandardMaterial({
    color: '#2d2d30',
    metalness: 0.9,
    roughness: 0.3,
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    metalness: 0.5,
    roughness: 0.8,
  });

  const screenMaterial = new THREE.MeshStandardMaterial({
    color: '#000011',
    metalness: 0.1,
    roughness: 0.5,
    emissive: '#001122',
    emissiveIntensity: screenOn ? glowIntensity * 0.5 : 0,
  });

  const keyboardMaterial = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    metalness: 0.3,
    roughness: 0.9,
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* === BASE (Bottom half) === */}
      <group position={[0, 0, 0]}>
        {/* Main base body */}
        <RoundedBox
          args={[BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH]}
          radius={0.03}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <primitive object={aluminumMaterial} attach="material" />
        </RoundedBox>

        {/* Keyboard area (inset) */}
        <mesh position={[0, BASE_HEIGHT / 2 + 0.001, -0.1]}>
          <boxGeometry args={[BASE_WIDTH - 0.4, 0.02, BASE_DEPTH - 0.5]} />
          <primitive object={keyboardMaterial} attach="material" />
        </mesh>

        {/* Trackpad */}
        <mesh position={[0, BASE_HEIGHT / 2 + 0.001, 0.55]}>
          <boxGeometry args={[1.2, 0.01, 0.7]} />
          <meshStandardMaterial color="#222222" metalness={0.4} roughness={0.7} />
        </mesh>

        {/* Keyboard keys - simplified grid */}
        {Array.from({ length: 5 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => (
            <mesh
              key={`key-${row}-${col}`}
              position={[
                -1.2 + col * 0.2,
                BASE_HEIGHT / 2 + 0.015,
                -0.5 + row * 0.2
              ]}
            >
              <boxGeometry args={[0.15, 0.02, 0.15]} />
              <meshStandardMaterial color="#111111" roughness={0.95} />
            </mesh>
          ))
        )}
      </group>

      {/* === SCREEN (Top half) === */}
      <group
        ref={screenRef}
        position={[0, BASE_HEIGHT / 2, -BASE_DEPTH / 2 + 0.05]}
        rotation={[HINGE_ANGLE, 0, 0]}
      >
        {/* Screen outer shell */}
        <group position={[0, SCREEN_HEIGHT / 2 + 0.05, -SCREEN_DEPTH / 2]}>
          <RoundedBox
            args={[SCREEN_WIDTH + 0.2, SCREEN_HEIGHT + 0.15, SCREEN_DEPTH]}
            radius={0.03}
            smoothness={4}
            castShadow
          >
            <primitive object={aluminumMaterial} attach="material" />
          </RoundedBox>

          {/* Screen bezel (black frame) */}
          <mesh position={[0, 0, SCREEN_DEPTH / 2 + 0.001]}>
            <boxGeometry args={[SCREEN_WIDTH + 0.15, SCREEN_HEIGHT + 0.1, 0.01]} />
            <primitive object={blackMaterial} attach="material" />
          </mesh>

          {/* Actual screen display area */}
          <mesh position={[0, -0.02, SCREEN_DEPTH / 2 + 0.012]}>
            <planeGeometry args={[SCREEN_WIDTH - BEZEL_WIDTH, SCREEN_HEIGHT - BEZEL_WIDTH * 1.5]} />
            <primitive object={screenMaterial} attach="material" />
          </mesh>

          {/* Screen glow effect */}
          {screenOn && (
            <pointLight
              position={[0, 0, 0.5]}
              intensity={glowIntensity * 2}
              color="#88aaff"
              distance={3}
              decay={2}
            />
          )}

          {/* Camera notch at top */}
          <mesh position={[0, SCREEN_HEIGHT / 2 - 0.02, SCREEN_DEPTH / 2 + 0.015]}>
            <cylinderGeometry args={[0.02, 0.02, 0.01, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, SCREEN_HEIGHT / 2 - 0.02, SCREEN_DEPTH / 2 + 0.02]}>
            <sphereGeometry args={[0.008, 16, 16]} />
            <meshStandardMaterial color="#1a3a1a" emissive="#00ff00" emissiveIntensity={0.3} />
          </mesh>

          {/* HTML content on screen */}
          {screenOn && children && (
            <Html
              transform
              occlude
              position={[0, -0.02, SCREEN_DEPTH / 2 + 0.015]}
              scale={0.165}
              style={{
                width: '420px',
                height: '280px',
                pointerEvents: 'auto',
              }}
            >
              <div
                style={{
                  width: '420px',
                  height: '280px',
                  overflow: 'hidden',
                  borderRadius: '8px',
                  opacity: glowIntensity,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {children}
              </div>
            </Html>
          )}
        </group>

      </group>

      {/* Logo on back of screen */}
      <group
        position={[0, BASE_HEIGHT / 2, -BASE_DEPTH / 2 + 0.05]}
        rotation={[HINGE_ANGLE, 0, 0]}
      >
        <mesh position={[0, SCREEN_HEIGHT / 2 + 0.05, -SCREEN_DEPTH - 0.001]}>
          <circleGeometry args={[0.15, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={screenOn ? 0.3 : 0}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}
