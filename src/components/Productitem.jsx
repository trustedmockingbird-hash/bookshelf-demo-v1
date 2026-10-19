import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { telemetry } from '../utils/telemetry.jsx';

// Dynamically creates a crisp 2D texture for the front or back of a package
export function createProductTexture(product, price, side = 'front') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  // Background color
  ctx.fillStyle = side === 'front' ? product.color : '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative border
  ctx.strokeStyle = side === 'front' ? '#ffffff' : '#334155';
  ctx.lineWidth = 12;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  if (side === 'front') {
    // Brand Header
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(product.brand.toUpperCase(), canvas.width / 2, 95);

    // Main Product Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(product.title, canvas.width / 2, 260);

    // Subtitle / Flavour
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '32px sans-serif';
    ctx.fillText(product.subtitle, canvas.width / 2, 330);

    // Package Size Badge
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(70, 540, canvas.width - 140, 80);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(product.size, canvas.width / 2, 590);
  } else {
    // Back Label (Nutrition / Details Panel for Inspect Zoom)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCT INFORMATION', 50, 90);

    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${product.brand} — ${product.title}`, 50, 145);
    ctx.fillText(`Price: $${price.toFixed(2)} | ${product.size}`, 50, 190);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, 215);
    ctx.lineTo(canvas.width - 50, 215);
    ctx.stroke();

    // Wrap backInfo text
    ctx.font = '25px sans-serif';
    ctx.fillStyle = '#1e293b';
    const words = (product.backInfo || '').split(' ');
    let line = '';
    let y = 265;
    words.forEach((word) => {
      const testLine = line + word + ' ';
      if (ctx.measureText(testLine).width > canvas.width - 100) {
        ctx.fillText(line, 50, y);
        line = word + ' ';
        y += 38;
      } else {
        line = testLine;
      }
    });
    ctx.fillText(line, 50, y);

    // Simulated SKU Barcode at bottom
    ctx.fillStyle = '#0f172a';
    ctx.font = '22px monospace';
    ctx.fillText(`SKU: ${product.id}`, 50, 620);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function ProductItem({
  product,
  price,
  shelf,
  slot,
  position,
  stockDepth = 3,
  highlightTag,
  onInspect,
  registerMesh
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef();
  const slotKey = `shelf${shelf}-slot${slot}`;

  const frontTexture = useMemo(() => createProductTexture(product, price, 'front'), [product, price]);
  const backTexture = useMemo(() => createProductTexture(product, price, 'back'), [product, price]);

  // Book dimensions in real-world meters (17cm wide x 24cm tall x 4cm thick)
  const width = 0.17;
  const height = 0.24;
  const depth = 0.04;

  return (
    <group position={position}>
      {/* Front interactive product at the front of the shelf */}
      <mesh
        ref={(el) => {
          meshRef.current = el;
          if (registerMesh) registerMesh(slotKey, el, product.id);
        }}
        position={[0, height / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
          telemetry.logAction('hover_start', slotKey, product.id, product.target);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
          telemetry.logAction('hover_end', slotKey, product.id, product.target);
        }}
        onClick={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
          setHovered(false);
          telemetry.logAction('inspect_open', slotKey, product.id, product.target);
          onInspect({ ...product, price, slotKey });
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        {/* 6 sides of the box: Right(pages), Left(spine), Top, Bottom, Front(cover), Back(info) */}
        <meshStandardMaterial attach="material-0" color="#fef3c7" />
        <meshStandardMaterial attach="material-1" color={product.color} />
        <meshStandardMaterial attach="material-2" color="#fef3c7" />
        <meshStandardMaterial attach="material-3" color="#fef3c7" />
        <meshStandardMaterial attach="material-4" map={frontTexture} roughness={0.35} />
        <meshStandardMaterial attach="material-5" map={backTexture} roughness={0.4} />
      </mesh>

      {/* Soft cyan outline when hovered (Phase 3 Hover requirement) */}
      {hovered && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 0.016, height + 0.016, depth + 0.016]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.BackSide} />
        </mesh>
      )}

      {/* Extra stock copies behind the front row (Phase 1 Shelf Stock requirement) */}
      {Array.from({ length: stockDepth - 1 }).map((_, idx) => (
        <mesh key={idx} position={[0, height / 2, -(idx + 1) * (depth + 0.025)]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color={product.color} roughness={0.6} />
        </mesh>
      ))}

      {/* Shelf Tag (Price label on the shelf edge under the product) */}
      <Html position={[0, -0.028, 0.04]} center distanceFactor={1.8} zIndexRange={[10, 0]}>
        <div
          onMouseEnter={() => telemetry.logAction('hover_start', `tag-${slotKey}`, product.id, product.target)}
          onMouseLeave={() => telemetry.logAction('hover_end', `tag-${slotKey}`, product.id, product.target)}
          style={{
            background: highlightTag && product.target ? '#fde047' : '#ffffff',
            color: '#0f172a',
            border: highlightTag && product.target ? '2px solid #ca8a04' : '1px solid #94a3b8',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            userSelect: 'none'
          }}
        >
          {product.title.slice(0, 12)} • ${price.toFixed(2)}
        </div>
      </Html>
    </group>
  );
}