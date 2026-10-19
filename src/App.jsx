import React, { useState, useRef, useEffect } from 'react';
import defaultLayoutData from './data/shelf_layout.json';
import StoreScene from './components/StoreScene.jsx';
import InspectModal3D from './components/InspectModal3D.jsx';
import CartUI from './components/cartUI.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import { telemetry } from './utils/telemetry.jsx';

const CONFIG_STORAGE_KEY = 'store_sim_config_v1';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialVersion = params.get('version') === 'A' ? 'A' : 'B';
  const initialSeed = Number(params.get('seed')) || 1042;

  const [storeData, setStoreData] = useState(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultLayoutData;
    } catch {
      return defaultLayoutData;
    }
  });

  const [showAdmin, setShowAdmin] = useState(params.get('admin') === 'true');
  const [isPreviewMode, setIsPreviewMode] = useState(params.get('preview') === 'true');
  const [versionKey, setVersionKey] = useState(initialVersion);
  const [shuffleSeed, setShuffleSeed] = useState(initialSeed);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [inspectingProduct, setInspectingProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [screenTooSmall, setScreenTooSmall] = useState(window.innerWidth < 768);

  const cameraTarget = useRef({ x: 0, y: 1.15, z: 2.3, pitch: 0, yaw: 0 });

  useEffect(() => {
    const onResize = () => setScreenTooSmall(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSaveStoreData = (newData) => {
    setStoreData(newData);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newData));
  };

  const handleResetDefaultData = () => {
    setStoreData(defaultLayoutData);
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  };

  const handleStartShopping = () => {
    setTutorialDone(true);
    cameraTarget.current = { x: 0, y: 1.1, z: 1.45, pitch: 0, yaw: 0 };
    telemetry.startSession(versionKey, shuffleSeed, isPreviewMode);
  };

  const handleAddToCart = (product, quantity) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const next = existing
        ? prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item))
        : [...prev, { ...product, quantity }];
      telemetry.syncVisitToStorage('shopping', next);
      return next;
    });
    setInspectingProduct(null);
  };

  const handleRemoveFromCart = (productId) => {
    setCart((prev) => {
      const next = prev.filter((item) => item.id !== productId);
      telemetry.syncVisitToStorage('shopping', next);
      return next;
    });
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
    telemetry.syncVisitToStorage('finished', cart);
    setIsCheckedOut(true);

    // Optional Questionnaire Redirect (Page 2 Step 9)
    const redirectBase = storeData.storeConfig.redirectUrl;
    if (redirectBase && !isPreviewMode) {
      setTimeout(() => {
        window.location.href = `${redirectBase}${encodeURIComponent(telemetry.userId)}`;
      }, 3000);
    }
  };

  if (showAdmin) {
    return (
      <AdminPanel
        storeData={storeData}
        onSaveStoreData={handleSaveStoreData}
        onResetDefaultData={handleResetDefaultData}
        onPreviewVersion={(ver) => {
          setVersionKey(ver);
          setIsPreviewMode(true);
          setShowAdmin(false);
          setTutorialDone(true);
          telemetry.startSession(ver, shuffleSeed, true);
        }}
        onExitAdmin={() => setShowAdmin(false)}
      />
    );
  }

  if (storeData.storeConfig.dataCollectionOpen === false && !isPreviewMode) {
    return (
      <div style={centerScreenStyle}>
        <div>
          <h2>Study Data Collection Is Currently Closed</h2>
          <p style={{ color: '#94a3b8' }}>Thank you for your interest. This study is no longer accepting new visits.</p>
          <button onClick={() => setShowAdmin(true)} style={adminFloatingBtn}>
            Open Admin Control Panel
          </button>
        </div>
      </div>
    );
  }

  if (screenTooSmall) {
    return (
      <div style={centerScreenStyle}>
        <div>
          <h2>Please Use a Laptop or Desktop Computer</h2>
          <p style={{ color: '#94a3b8', maxWidth: '400px' }}>
            This 3D store simulator requires a larger screen (at least 1280 × 720 recommended).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* Top-Center Floating Admin & Preview Banner */}
      <div
        style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        {isPreviewMode && (
          <span
            style={{
              background: '#f59e0b',
              color: '#0f172a',
              fontWeight: 'bold',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px'
            }}
          >
            PREVIEW MODE (No Data Saved)
          </span>
        )}
        <button onClick={() => setShowAdmin(true)} style={adminFloatingBtn}>
          ⚙ Admin Control Panel
        </button>
      </div>

      <StoreScene
        layoutData={storeData}
        versionKey={versionKey}
        shuffleSeed={shuffleSeed}
        cameraTarget={cameraTarget}
        inspectingProduct={inspectingProduct}
        onInspect={(prod) => setInspectingProduct(prod)}
      />

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
          instruction={storeData.versions[versionKey].instruction}
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

const centerScreenStyle = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f172a',
  color: '#f8fafc',
  fontFamily: 'system-ui, sans-serif',
  padding: '24px',
  textAlign: 'center'
};

const adminFloatingBtn = {
  background: '#1e293b',
  color: '#38bdf8',
  border: '1px solid #38bdf8',
  borderRadius: '8px',
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
};