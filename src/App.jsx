import React, { useState, useRef, useEffect } from 'react';
import layoutData from './data/shelf_layout.json';
import StoreScene from './components/StoreScene.jsx';
import InspectModal3D from './components/InspectModal3D.jsx';
import CartUI from './components/cartUI.jsx';
import { telemetry } from './utils/telemetry.jsx';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialVersion = params.get('version') === 'A' ? 'A' : 'B';
  const initialSeed = Number(params.get('seed')) || 1042;

  const [versionKey, setVersionKey] = useState(initialVersion);
  const [shuffleSeed, setShuffleSeed] = useState(initialSeed);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [screenTooSmall, setScreenTooSmall] = useState(window.innerWidth < 768);

  // Camera target state: start at entrance (z = 2.4m), walk up to shelf (z = 1.35m)
  const cameraTarget = useRef({ x: 0, y: 1.15, z: 2.3, pitch: 0, yaw: 0 });

  useEffect(() => {
    const onResize = () => setScreenTooSmall(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleStartShopping = () => {
    setTutorialDone(true);
    // Smoothly walk the user from the aisle entrance up to the shelf
    cameraTarget.current = { x: 0, y: 1.1, z: 1.45, pitch: 0, yaw: 0 };
    telemetry.startSession(versionKey, shuffleSeed);
  };

  const handleAddToCart = (product, quantity) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setInspectingProduct(null);
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const handleMoveCamera = (dx, dy, dz) => {
    cameraTarget.current.x = Math.min(1.1, Math.max(-1.1, cameraTarget.current.x + dx));
    cameraTarget.current.y = Math.min(1.65, Math.max(0.55, cameraTarget.current.y + dy));
    cameraTarget.current.z = Math.min(3.0, Math.max(0.85, cameraTarget.current.z + dz));
    telemetry.logAction(
      'move',
      `pos(${cameraTarget.current.x.toFixed(2)},${cameraTarget.current.y.toFixed(2)},${cameraTarget.current.z.toFixed(2)})`
    );
  };

  const handleCheckoutComplete = () => {
    const summary = cart.map((i) => `${i.id}x${i.quantity}`).join(';') || 'EMPTY';
    telemetry.logAction('checkout', 'checkout-button', summary, cart.some((i) => i.target));
    setIsCheckedOut(true);
  };

  // Step 2 of User Journey: Device check for phone screens
  if (screenTooSmall) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <div>
          <h2>Please Use a Laptop or Desktop Computer</h2>
          <p style={{ color: '#94a3b8', maxWidth: '400px' }}>
            This 3D store simulator requires a larger screen (at least 1280 × 720 recommended). Please reopen this link on a computer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <StoreScene
        layoutData={layoutData}
        versionKey={versionKey}
        shuffleSeed={shuffleSeed}
        cameraTarget={cameraTarget}
        inspectingProduct={inspectingProduct}
        onInspect={(prod) => setInspectingProduct(prod)}
      />

      {/* Step 3 of User Journey: Short Tutorial before shopping starts */}
      {!tutorialDone && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            fontFamily: 'system-ui, sans-serif',
            color: '#f8fafc'
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>30-SECOND TUTORIAL</div>
            <h2 style={{ margin: '8px 0 12px' }}>Welcome to the 3D Store Simulator</h2>
            <ul style={{ textAlign: 'left', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>
              <li><strong>Move along the shelf:</strong> Use <code>W A S D</code>, Arrow keys, or the bottom navigation buttons.</li>
              <li><strong>Hover & Pick up:</strong> Point at any item to highlight it, and click to pick it up.</li>
              <li><strong>Inspect & Read:</strong> Drag to spin the item 360° (read the front & back labels) and zoom in.</li>
              <li><strong>Add to Cart & Checkout:</strong> Choose your items and click <strong>Check out</strong> when finished.</li>
            </ul>
            <button
              onClick={handleStartShopping}
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 28px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Walk to the Aisle & Start Shopping →
            </button>
          </div>
        </div>
      )}

      {tutorialDone && (
        <CartUI
          instruction={layoutData.versions[versionKey].instruction}
          versionKey={versionKey}
          onVersionChange={(v) => {
            setVersionKey(v);
            telemetry.version = v;
          }}
          shuffleSeed={shuffleSeed}
          onSeedChange={(s) => {
            setShuffleSeed(s);
            telemetry.shuffleSeed = s;
          }}
          cart={cart}
          onRemoveFromCart={handleRemoveFromCart}
          onMoveCamera={handleMoveCamera}
          onCheckoutComplete={handleCheckoutComplete}
          isCheckedOut={isCheckedOut}
        />
      )}

      <InspectModal3D
        product={inspectingProduct}
        onAddToCart={handleAddToCart}
        onPutBack={() => setInspectingProduct(null)}
      />
    </div>
  );
}