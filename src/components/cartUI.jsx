import React, { useState } from 'react';
import { telemetry } from '../utils/telemetry.jsx';

export default function CartUI({
  instruction,
  versionKey,
  onVersionChange,
  shuffleSeed,
  onSeedChange,
  cart,
  onRemoveFromCart,
  onMoveCamera,
  onCheckoutComplete,
  isCheckedOut
}) {
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      {/* Top-Left Corner: Persistent Shopping Task & Admin Version/Seed Controls */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '12px 16px',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          maxWidth: '340px',
          zIndex: 20
        }}
      >
        <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Shopping Task (User: {telemetry.userId})
        </div>
        <div style={{ fontSize: '15px', fontWeight: 'bold', margin: '4px 0 10px' }}>{instruction}</div>

        {/* Admin Testing Controls (Switch Version & Shuffle Seed live) */}
        <div
          style={{
            borderTop: '1px solid #334155',
            paddingTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Study Version:</span>
            <select
              value={versionKey}
              onChange={(e) => onVersionChange(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #475569',
                borderRadius: '4px',
                padding: '2px 6px'
              }}
            >
              <option value="A">Version A (No Hints)</option>
              <option value="B">Version B (Shelf Talker + Tags)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Shuffle Seed (Row 1 & 3):</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="number"
                value={shuffleSeed}
                onChange={(e) => onSeedChange(Number(e.target.value))}
                style={{
                  width: '70px',
                  background: '#1e293b',
                  color: '#fff',
                  border: '1px solid #475569',
                  borderRadius: '4px',
                  padding: '2px 6px'
                }}
              />
              <button
                onClick={() => onSeedChange(Math.floor(Math.random() * 9000) + 1000)}
                style={{
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer'
                }}
              >
                Shuffle
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Center: Easy Navigation Controls for Non-Gamers */}
      <div
        style={{
          position: 'fixed',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          color: '#cbd5e1',
          fontSize: '12px',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 20
        }}
      >
        <span>Move / Look:</span>
        <button onClick={() => onMoveCamera(0, 0, -0.35)} style={navBtnStyle}>Step Closer (W)</button>
        <button onClick={() => onMoveCamera(0, 0, 0.35)} style={navBtnStyle}>Step Back (S)</button>
        <button onClick={() => onMoveCamera(-0.3, 0, 0)} style={navBtnStyle}>← Slide Left (A)</button>
        <button onClick={() => onMoveCamera(0.3, 0, 0)} style={navBtnStyle}>Slide Right (D) →</button>
        <button onClick={() => onMoveCamera(0, 0.25, 0)} style={navBtnStyle}>↑ Top Shelf</button>
        <button onClick={() => onMoveCamera(0, -0.25, 0)} style={navBtnStyle}>↓ Bottom Shelf</button>
      </div>

      {/* Top-Right Corner: Shopping Cart & Checkout */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '280px',
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '14px',
          color: '#f8fafc',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong style={{ fontSize: '16px' }}>Shopping Cart ({totalItems})</strong>
          <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>${totalPrice.toFixed(2)}</span>
        </div>

        {cart.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px 0' }}>
            Your cart is empty. Click any book on the shelf to inspect it.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1e293b',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold' }}>
                    {item.title} ×{item.quantity}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    ${(item.price * item.quantity).toFixed(2)} {item.target ? '• Target' : ''}
                  </div>
                </div>
                <button
                  onClick={() => {
                    telemetry.logAction('remove_from_cart', item.slotKey, item.id, item.target);
                    onRemoveFromCart(item.id);
                  }}
                  style={{
                    background: '#7f1d1d',
                    color: '#fecaca',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  remove
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setConfirmingCheckout(true)}
          style={{
            width: '100%',
            marginTop: '12px',
            background: '#10b981',
            color: '#052e16',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Check out
        </button>

        {/* Live Telemetry Counter */}
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
          Recorded Actions: {telemetry.actionLog.length} • Download anytime:
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'center' }}>
            <button onClick={() => telemetry.downloadActionLogCSV()} style={smallExportBtn}>
              Action CSV
            </button>
            <button onClick={() => telemetry.downloadSummaryCSV(cart)} style={smallExportBtn}>
              Summary CSV
            </button>
            <button onClick={() => telemetry.downloadViewingRecordJSON(cart)} style={smallExportBtn}>
              View JSON
            </button>
          </div>
        </div>
      </div>

      {/* "Are you sure?" Checkout Confirmation Modal (Page 7 & 8 requirement) */}
      {confirmingCheckout && !isCheckedOut && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h3 style={{ margin: '0 0 8px' }}>Finish shopping?</h3>
            <p style={{ color: '#cbd5e1', fontSize: '14px', margin: '0 0 18px' }}>
              Your cart has {totalItems} item(s) (${totalPrice.toFixed(2)}). Are you sure you want to check out?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setConfirmingCheckout(false);
                  onCheckoutComplete();
                }}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Check out
              </button>
              <button
                onClick={() => setConfirmingCheckout(false)}
                style={{
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
              >
                Back to shelf
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank-You & Phase 5 Data Download Screen */}
      {isCheckedOut && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, maxWidth: '480px' }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>STUDY COMPLETED</div>
            <h2 style={{ margin: '6px 0 8px' }}>Thank you for shopping!</h2>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '14px' }}>
              Completion Code: <strong>SIM-{telemetry.userId}-{versionKey}</strong>
            </p>
            <div
              style={{
                background: '#0f172a',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#cbd5e1',
                marginBottom: '16px'
              }}
            >
              <div><strong>User ID:</strong> {telemetry.userId} | <strong>Version:</strong> {versionKey}</div>
              <div><strong>Total Actions Logged:</strong> {telemetry.actionLog.length}</div>
              <div><strong>Target Product Chosen:</strong> {cart.some((i) => i.target) ? 'Yes' : 'No'}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => telemetry.downloadActionLogCSV()} style={primaryExportBtn}>
                Download Action Log (CSV)
              </button>
              <button onClick={() => telemetry.downloadSummaryCSV(cart)} style={primaryExportBtn}>
                Download User Summary (CSV)
              </button>
              <button onClick={() => telemetry.downloadViewingRecordJSON(cart)} style={primaryExportBtn}>
                Download Viewing Record (JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const navBtnStyle = {
  background: '#1e293b',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '12px',
  cursor: 'pointer'
};

const smallExportBtn = {
  background: '#1e293b',
  color: '#38bdf8',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '3px 6px',
  fontSize: '11px',
  cursor: 'pointer'
};

const primaryExportBtn = {
  background: '#0284c7',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '10px 14px',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.88)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  fontFamily: 'system-ui, sans-serif'
};

const modalCardStyle = {
  background: '#1e293b',
  border: '1px solid #475569',
  borderRadius: '12px',
  padding: '24px',
  color: '#f8fafc',
  textAlign: 'center',
  maxWidth: '380px'
};