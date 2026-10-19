import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import ProductItem from './Productitem.jsx';
import { telemetry } from '../utils/telemetry.jsx';

// Deterministic seeded PRNG (same shuffle seed always rebuilds the exact same shelf)
function mulberry32(seed) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function FirstPersonController({ cameraTarget, isInspecting, meshRegistry }) {
  const { camera } = useThree();
  const keys = useRef({});
  const lastSampleTime = useRef(0);
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const box3 = useMemo(() => new THREE.Box3(), []);

  useEffect(() => {
    const onKeyDown = (e) => {
      keys.current[e.code] = true;
    };
    const onKeyUp = (e) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (isInspecting) return;

    const speed = 1.4 * delta;
    let moved = false;

    if (keys.current['KeyW'] || keys.current['ArrowUp']) {
      cameraTarget.current.z = Math.max(0.85, cameraTarget.current.z - speed);
      moved = true;
    }
    if (keys.current['KeyS'] || keys.current['ArrowDown']) {
      cameraTarget.current.z = Math.min(3.2, cameraTarget.current.z + speed);
      moved = true;
    }
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) {
      cameraTarget.current.x = Math.max(-1.1, cameraTarget.current.x - speed);
      moved = true;
    }
    if (keys.current['KeyD'] || keys.current['ArrowRight']) {
      cameraTarget.current.x = Math.min(1.1, cameraTarget.current.x + speed);
      moved = true;
    }

    // Smoothly interpolate camera position and look angle
    camera.position.lerp(
      new THREE.Vector3(cameraTarget.current.x, cameraTarget.current.y, cameraTarget.current.z),
      0.12
    );
    camera.rotation.set(cameraTarget.current.pitch, cameraTarget.current.yaw, 0);

    if (moved && state.clock.elapsedTime - ( keys.current.lastLog || 0 ) > 0.6) {
      keys.current.lastLog = state.clock.elapsedTime;
      telemetry.logAction(
        'move',
        `pos(${camera.position.x.toFixed(2)},${camera.position.z.toFixed(2)})`,
        'NONE',
        false
      );
    }

    // Phase 5 Part B: Record what is on screen ~10 times per second (every 100ms)
    const nowMs = performance.now();
    if (nowMs - lastSampleTime.current >= 100) {
      const dtMs = nowMs - lastSampleTime.current;
      lastSampleTime.current = nowMs;

      camera.updateMatrixWorld();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const visibleObjects = [];
      Object.entries(meshRegistry.current).forEach(([key, entry]) => {
        if (!entry || !entry.mesh) return;
        box3.setFromObject(entry.mesh);
        if (frustum.intersectsBox(box3)) {
          // Estimate apparent size on screen based on distance
          const dist = Math.max(0.4, camera.position.distanceTo(entry.mesh.getWorldPosition(new THREE.Vector3())));
          const approxRatio = Math.min(1, 0.08 / (dist * dist));
          visibleObjects.push({
            key,
            productId: entry.productId,
            screenRatio: approxRatio
          });
        }
      });

      const fps = delta > 0 ? 1 / delta : 60;
      telemetry.recordViewingSample(camera.position, camera.rotation, visibleObjects, dtMs, fps);
    }
  });

  return null;
}

export default function StoreScene({
  layoutData,
  versionKey,
  shuffleSeed,
  cameraTarget,
  inspectingProduct,
  onInspect
}) {
  const meshRegistry = useRef({});
  const versionConfig = layoutData.versions[versionKey];

  const registerMesh = (key, mesh, productId) => {
    if (mesh) {
      meshRegistry.current[key] = { mesh, productId };
    }
  };

  // Shelf heights in meters (Row 1 = Bottom, Row 2 = Eye-Level Middle, Row 3 = Top)
  const shelfHeights = {
    1: 0.55,
    2: 1.05,
    3: 1.55
  };

  // Build shelf slot placements (Fixed shelves stay in exact order; others shuffle via seed)
  const placedItems = useMemo(() => {
    const rng = mulberry32(shuffleSeed);
    const items = [];

    [1, 2, 3].forEach((shelfNum) => {
      const rowProducts = layoutData.products.filter((p) => p.shelf === shelfNum);
      const isFixed = layoutData.storeConfig.fixedShelves.includes(shelfNum);

      // Expand products by facings count
      let expanded = [];
      rowProducts.forEach((prod) => {
        for (let f = 0; f < prod.facings; f++) {
          expanded.push({ ...prod });
        }
      });

      if (!isFixed) {
        // Fisher-Yates seeded shuffle
        for (let i = expanded.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
        }
      }

      expanded.forEach((prod, index) => {
        const slotNumber = index + 1;
        // Center 4-5 slots across a 1.3m wide shelf
        const xPos = -0.48 + index * 0.32;
        const yPos = shelfHeights[shelfNum];
        const finalPrice = versionConfig.priceOverrides?.[prod.id] ?? prod.price;

        items.push({
          ...prod,
          price: finalPrice,
          shelf: shelfNum,
          slot: slotNumber,
          position: [xPos, yPos, 0.08]
        });
      });
    });

    return items;
  }, [layoutData, versionKey, shuffleSeed]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f172a' }}>
      <Canvas shadows camera={{ position: [0, 1.35, 2.3], fov: 50 }}>
        {/* Store Lighting */}
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} castShadow />
        <pointLight position={[0, 2.1, 0.6]} intensity={0.8} color="#f8fafc" />

        <FirstPersonController
          cameraTarget={cameraTarget}
          isInspecting={Boolean(inspectingProduct)}
          meshRegistry={meshRegistry}
        />

        {/* Supermarket Floor & Back Wall */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        <mesh position={[0, 2, -0.4]}>
          <planeGeometry args={[10, 5]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>

        {/* Overhead Section Sign ("BOOKS & MEDIA" / "DAIRY") */}
        <group position={[0, 2.08, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 0.22, 0.08]} />
            <meshStandardMaterial color="#0284c7" />
          </mesh>
          <Html position={[0, 0, 0.05]} center distanceFactor={2.2} zIndexRange={[10, 0]}>
            <div
              style={{
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '18px',
                letterSpacing: '2px',
                fontFamily: ' sans-serif',
                whiteSpace: 'nowrap'
              }}
            >
              FEATURED BOOKSHELF AISLE
            </div>
          </Html>
        </group>

        {/* 3D Bookshelf / Cooler Frame */}
        <group position={[0, 0, 0]}>
          {/* Back Panel */}
          <mesh position={[0, 1.05, -0.18]}>
            <boxGeometry args={[1.6, 2.1, 0.04]} />
            <meshStandardMaterial color="#451a03" roughness={0.7} />
          </mesh>
          {/* Left & Right Side Walls */}
          <mesh position={[-0.78, 1.05, 0]}>
            <boxGeometry args={[0.04, 2.1, 0.4]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0.78, 1.05, 0]}>
            <boxGeometry args={[0.04, 2.1, 0.4]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>

          {/* 3 Horizontal Shelf Levels */}
          {[0.53, 1.03, 1.53].map((y, idx) => (
            <mesh key={idx} position={[0, y, 0]}>
              <boxGeometry args={[1.52, 0.04, 0.38]} />
              <meshStandardMaterial color="#92400e" roughness={0.5} />
            </mesh>
          ))}
        </group>

        {/* Clipped Shelf Talker Card (Shown in Version B on Shelf 2) */}
        {versionConfig.showShelfTalker && (
          <group position={[-0.36, shelfHeights[versionConfig.shelfTalkerShelf] - 0.02, 0.22]}>
            <mesh ref={(el) => registerMesh('shelf-talker', el, 'SHELF-TALKER')}>
              <boxGeometry args={[0.26, 0.09, 0.01]} />
              <meshStandardMaterial color="#0284c7" />
            </mesh>
            <Html position={[0, 0, 0.01]} center distanceFactor={1.6} zIndexRange={[10, 0]}>
              <div
                onMouseEnter={() => telemetry.logAction('hover_start', 'shelf-talker', 'SHELF-TALKER', true)}
                onMouseLeave={() => telemetry.logAction('hover_end', 'shelf-talker', 'SHELF-TALKER', true)}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: '2px solid #38bdf8',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.45)',
                  cursor: 'pointer'
                }}
              >
                ★ {versionConfig.shelfTalkerText}
              </div>
            </Html>
          </group>
        )}

        {/* Placed Products on the Shelf Grid */}
        {placedItems.map((item) => (
          <ProductItem
            key={`${item.shelf}-${item.slot}`}
            product={item}
            price={item.price}
            shelf={item.shelf}
            slot={item.slot}
            position={item.position}
            stockDepth={layoutData.storeConfig.stockDepth}
            highlightTag={versionConfig.highlightTargetTags}
            onInspect={onInspect}
            registerMesh={registerMesh}
          />
        ))}
      </Canvas>
    </div>
  );
}