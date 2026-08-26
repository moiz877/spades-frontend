'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, QuadraticBezierLine, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { ENERGY_REGIONS, ENERGY_FLOWS } from '@/lib/regions';

const RADIUS = 2;

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function RotatingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useFrame((_, delta) => {
    if (ref.current && !reduceMotion) {
      ref.current.rotation.y += delta * 0.06;
    }
  });

  return <group ref={ref}>{children}</group>;
}

function RegionDot({ position }: { position: THREE.Vector3 }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.022, 8, 8]} />
      <meshBasicMaterial color="#22d3ee" />
    </mesh>
  );
}

function FlowArc({ start, end, opacity }: { start: THREE.Vector3; end: THREE.Vector3; opacity: number }) {
  const mid = useMemo(
    () => start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.35),
    [start, end]
  );
  return (
    <QuadraticBezierLine
      start={start}
      end={end}
      mid={mid}
      color="#22d3ee"
      lineWidth={1}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Hero globe: dark wireframe sphere with glowing points at major energy
 * regions and arcs between them representing illustrative cross-border
 * energy trade flows (see lib/regions.ts). Dynamically imported with
 * ssr:false from the hero, since Three.js has no server-side value here.
 */
export default function Globe() {
  const regionPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    for (const region of ENERGY_REGIONS) {
      map.set(region.name, latLonToVector3(region.lat, region.lon, RADIUS));
    }
    return map;
  }, []);

  return (
    <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.4} />
      <RotatingGroup>
        <Sphere args={[RADIUS, 48, 48]}>
          <meshBasicMaterial color="#0b0f15" wireframe transparent opacity={0.35} />
        </Sphere>
        {ENERGY_REGIONS.map((region) => (
          <RegionDot key={region.name} position={regionPositions.get(region.name)!} />
        ))}
        {ENERGY_FLOWS.map((flow) => {
          const start = regionPositions.get(flow.from);
          const end = regionPositions.get(flow.to);
          if (!start || !end) return null;
          return (
            <FlowArc
              key={`${flow.from}-${flow.to}`}
              start={start}
              end={end}
              opacity={0.25 + flow.weight * 0.35}
            />
          );
        })}
      </RotatingGroup>
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
