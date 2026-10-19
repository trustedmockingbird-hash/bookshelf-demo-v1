import React, { useState, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { createProductTexture } from './Productitem.jsx';
import { telemetry } from '../utils/telemetry.jsx';

function InspectedBookMesh({ product, zoomLevel, onSideChange }) {
  const meshRef = useRef();
  const lastSideRef = useRef('front');

  const frontTexture = useMemo(() => createProductTexture(product, product.price, 'front'), [product]);
  const backTexture = useMemo(() => createProductTexture(product, product.price, 'back'), [product]);

  // Check which face of the book is pointing toward the camera during rotation
  useFrame(({ camera }) => {
    if (!meshRef.current) return;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const side = camDir.z < 0 ? 'front' : 'back';
    if (side !== lastSideRef.current) {
      lastSideRef.current = side;
      onSideChange(side);
      telemetry.logAction('rotate', product.slotKey, product.id, product.target, `facing=${side}`);
    }
  });

  const scale = zoomLevel;

  return (
    <mesh ref={meshRef} scale={[scale, scale, scale]}>
      <boxGeometry args={[1.4, 2.0, 0.32]} />
      <meshStandardMaterial attach="material-0" color="#fef3c7" />
      <meshStandardMaterial attach="material-1" color={product.color} />
      <meshStandardMaterial attach="material-2" color="#fef3c7" />
      <meshStandardMaterial attach="material-3" color="#fef3c7" />
      <meshStandardMaterial attach="material-4" map={frontTexture} roughness={0.3} />
      <meshStandardMaterial attach="material-5" map={backTexture} roughness={0.35} />
    </mesh>
  );
}

export default function InspectModal3D({ product, onAddToCart, onPutBack }) {
  const [quantity, setQuantity] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [facingSide, setFacingSide] = useState('front');

  if (!product) return null;

  const handleZoomChange = (newZoom) => {
    const clamped = Math.min(1.6, Math.max(0.7, Number(newZoom)));
    setZoomLevel(clamped);
    telemetry.logAction('zoom', product.slotKey, product.id, product.target, `zoom=${clamped.toFixed(2)}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      {/* Header info */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {product.brand} • {product.slotKey} • Viewing {facingSide.toUpperCase()} side
        </div>
        <h2 style={{ margin: '4px 0', fontSize: '24px' }}>
          {product.title} — <span style={{ color: '#38bdf8' }}>${product.price.toFixed(2)}</span>
        </h2>
        <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
          Drag with mouse to spin 360° (read front & back label) • Use slider below to zoom
        </div>
      </div>

      {/* 3D Inspection Viewport */}
      <div
        style={{
          width: '460px',
          height: '380px',
          background: 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)',
          borderRadius: '12px',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}
      >
        <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
          <ambientLight intensity={1.1} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <directionalLight position={[-3, -2, -5]} intensity={0.8} />
          <InspectedBookMesh product={product} zoomLevel={zoomLevel} onSideChange={setFacingSide} />
          <OrbitControls enablePan={false} minDistance={1.8} maxDistance={4.5} />
        </Canvas>
      </div>

      {/* Zoom slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Zoom:</span>
        <input
          type="range"
          min="0.7"
          max="1.6"
          step="0.05"
          value={zoomLevel}
          onChange={(e) => handleZoomChange(e.target.value)}
          style={{ width: '160px', cursor: 'pointer' }}
        />
        <span style={{ fontSize: '13px', width: '45px' }}>{Math.round(zoomLevel * 100)}%</span>
      </div>

      {/* Quantity + Add to Cart / Put Back controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '4px 8px',
            gap: '10px'
          }}
        >
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            −
          </button>
          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{quantity}</span>
          <button
            onClick={() => setQuantity((q) => q + 1)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
          >
            +
          </button>
        </div>

        <button
          onClick={() => {
            telemetry.logAction('add_to_cart', product.slotKey, product.id, product.target, `qty=${quantity}`);
            onAddToCart(product, quantity);
          }}
          style={{
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 22px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Add to cart ({quantity})
        </button>

        <button
          onClick={() => {
            telemetry.logAction('put_back', product.slotKey, product.id, product.target);
            onPutBack();
          }}
          style={{
            background: '#334155',
            color: '#f8fafc',
            border: '1px solid #64748b',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          Put back on shelf
        </button>
      </div>
    </div>
  );
}