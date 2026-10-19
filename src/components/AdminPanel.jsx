import React, { useState } from 'react';
import { telemetry } from '../utils/telemetry.jsx';

export default function AdminPanel({
  storeData,
  onSaveStoreData,
  onResetDefaultData,
  onPreviewVersion,
  onExitAdmin
}) {
  const [role, setRole] = useState(null); // 'admin' | 'viewer'
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('progress'); // 'progress' | 'products' | 'versions' | 'links'
  const [selectedVersion, setSelectedVersion] = useState('B');
  const [batchCount, setBatchCount] = useState(5);
  const [redirectUrl, setRedirectUrl] = useState(storeData.storeConfig.redirectUrl || '');
  const [visits, setVisits] = useState(() => telemetry.getStoredVisits());

  const isReadOnly = role === 'viewer';

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setRole('admin');
      setLoginError('');
    } else if (passwordInput === 'view123') {
      setRole('viewer');
      setLoginError('');
    } else {
      setLoginError('Invalid password. Use "admin123" (Full Admin) or "view123" (View-Only).');
    }
  };

  // Login Screen (Page 9: Password-protected with at least two roles)
  if (!role) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, maxWidth: '420px', margin: '80px auto', textAlign: 'center' }}>
          <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>PHASE 4 CONTROL PANEL</div>
          <h2 style={{ margin: '8px 0 6px' }}>Team Admin Login</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '18px' }}>
            Enter <code>admin123</code> for <strong>Full Admin</strong> or <code>view123</code> for <strong>View-Only</strong> role.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="password"
              placeholder="Enter password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={inputStyle}
            />
            {loginError && <div style={{ color: '#f87171', fontSize: '12px' }}>{loginError}</div>}
            <button type="submit" style={primaryBtn}>Log In to Control Panel</button>
            <button type="button" onClick={onExitAdmin} style={secondaryBtn}>
              ← Back to 3D Store
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Update a product field
  const handleProductChange = (idx, field, value) => {
    if (isReadOnly) return;
    const updated = [...storeData.products];
    updated[idx] = { ...updated[idx], [field]: value };
    onSaveStoreData({ ...storeData, products: updated });
  };

  const handleAddProduct = () => {
    if (isReadOnly) return;
    const newProd = {
      id: `ITEM-NEW-${storeData.products.length + 1}`,
      brand: 'New Brand',
      title: 'New Product',
      subtitle: 'Standard Variant',
      size: '250g Cup',
      shape: 'cup',
      price: 9.99,
      target: false,
      color: '#0f766e',
      shelf: 2,
      slot: 1,
      facings: 2,
      backInfo: 'Nutrition & ingredients panel text.'
    };
    onSaveStoreData({ ...storeData, products: [...storeData.products, newProd] });
  };

  // CSV Upload for Product List (Page 9 requirement)
  const handleCSVUpload = (e) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = String(evt.target.result).trim().split('\n');
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim());
      const parsed = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => {
          row[h] = cols[i];
        });
        return {
          id: row.id || 'SKU-01',
          brand: row.brand || 'Brand',
          title: row.title || 'Product',
          subtitle: row.subtitle || 'Flavour',
          size: row.size || '150g',
          shape: row.shape || 'cup',
          price: Number(row.price) || 10.0,
          target: String(row.target).toLowerCase() === 'yes' || String(row.target).toLowerCase() === 'true',
          color: row.color || '#1e3a8a',
          shelf: Number(row.shelf) || 2,
          slot: Number(row.slot) || 1,
          facings: Number(row.facings) || 2,
          backInfo: row.backInfo || 'Standard package details.'
        };
      });
      onSaveStoreData({ ...storeData, products: parsed });
    };
    reader.readAsText(file);
  };

  // Update Version settings
  const ver = storeData.versions[selectedVersion];
  const handleVersionField = (field, value) => {
    if (isReadOnly) return;
    onSaveStoreData({
      ...storeData,
      versions: {
        ...storeData.versions,
        [selectedVersion]: {
          ...ver,
          [field]: value
        }
      }
    });
  };

  const toggleFixedShelf = (shelfNum) => {
    if (isReadOnly) return;
    const current = storeData.storeConfig.fixedShelves || [];
    const next = current.includes(shelfNum)
      ? current.filter((s) => s !== shelfNum)
      : [...current, shelfNum];
    onSaveStoreData({
      ...storeData,
      storeConfig: { ...storeData.storeConfig, fixedShelves: next }
    });
  };

  const toggleDataCollection = () => {
    if (isReadOnly) return;
    const current = storeData.storeConfig.dataCollectionOpen !== false;
    onSaveStoreData({
      ...storeData,
      storeConfig: { ...storeData.storeConfig, dataCollectionOpen: !current }
    });
  };

  const baseUrl = window.location.origin + window.location.pathname;
  const activeVisits = visits.filter((v) => !v.isTest);
  const countByVersion = activeVisits.reduce((acc, v) => {
    acc[v.version] = (acc[v.version] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={pageStyle}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>
            STORE SIMULATOR ADMIN • ROLE: {role === 'admin' ? 'FULL ADMIN' : 'VIEW-ONLY'}
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: '24px' }}>Research Control Panel</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onPreviewVersion(selectedVersion)}
            style={{ ...primaryBtn, background: '#0ea5e9' }}
          >
            Preview Version {selectedVersion} (No Data Saved)
          </button>
          <button onClick={onExitAdmin} style={secondaryBtn}>
            Exit to Live Store
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        {[
          { id: 'progress', label: '1. Study Progress & Data Export' },
          { id: 'products', label: '2. Product List & CSV Upload' },
          { id: 'versions', label: '3. Versions, Hints & Shelves' },
          { id: 'links', label: '4. User Links & Redirect Setup' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? '#0284c7' : '#1e293b',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: activeTab === t.id ? 'bold' : 'normal',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: STUDY PROGRESS & DATA EXPORT */}
      {activeTab === 'progress' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Data Collection Status & Visit Metrics</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Monitor participant visits across versions, exclude internal test runs, and export clean CSV/JSON files.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  background: storeData.storeConfig.dataCollectionOpen !== false ? '#065f46' : '#7f1d1d',
                  color: '#fff'
                }}
              >
                Data Collection: {storeData.storeConfig.dataCollectionOpen !== false ? 'OPEN' : 'CLOSED'}
              </span>
              {!isReadOnly && (
                <button onClick={toggleDataCollection} style={secondaryBtn}>
                  {storeData.storeConfig.dataCollectionOpen !== false ? 'Pause Collection' : 'Open Collection'}
                </button>
              )}
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={kpiBox}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Valid Visits Started</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold' }}>{activeVisits.length}</div>
            </div>
            <div style={kpiBox}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Finished (Checked Out)</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4ade80' }}>
                {activeVisits.filter((v) => v.status === 'finished').length}
              </div>
            </div>
            <div style={kpiBox}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Dropped Out / In Progress</div>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#facc15' }}>
                {activeVisits.filter((v) => v.status !== 'finished').length}
              </div>
            </div>
            <div style={kpiBox}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Balance (Ver A / Ver B)</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8' }}>
                {countByVersion['A'] || 0} / {countByVersion['B'] || 0}
              </div>
            </div>
          </div>

          {/* Multi-User Export Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <button onClick={() => telemetry.downloadAllSummariesCSV()} style={primaryBtn}>
              Download All Users Summary (CSV)
            </button>
            <button onClick={() => telemetry.downloadAllActionsCSV()} style={primaryBtn}>
              Download All Action Logs (CSV)
            </button>
            <button onClick={() => telemetry.downloadAllViewingJSON()} style={primaryBtn}>
              Download All Viewing Records (JSON)
            </button>
          </div>

          {/* Recorded Visits Table */}
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Version</th>
                <th style={thStyle}>Shuffle Seed</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Target Bought?</th>
                <th style={thStyle}>Total Time (ms)</th>
                <th style={thStyle}>Test Visit? (Exclude)</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    No recorded shopper visits yet. Complete a shopping trip in the store to see it appear here.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr key={v.visitId} style={{ borderTop: '1px solid #334155', opacity: v.isTest ? 0.5 : 1 }}>
                    <td style={tdStyle}><strong>{v.user}</strong></td>
                    <td style={tdStyle}>Version {v.version}</td>
                    <td style={tdStyle}>{v.shuffleSeed}</td>
                    <td style={tdStyle}>
                      <span style={{ color: v.status === 'finished' ? '#4ade80' : '#facc15' }}>
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>{v.summary?.chose_target_product || 'no'}</td>
                    <td style={tdStyle}>{v.summary?.total_shopping_time_ms || 0} ms</td>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={Boolean(v.isTest)}
                        disabled={isReadOnly}
                        onChange={() => {
                          const updated = telemetry.toggleTestVisit(v.visitId);
                          setVisits([...updated]);
                        }}
                      />{' '}
                      Leave out of export
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: PRODUCT LIST & CSV UPLOAD */}
      {activeTab === 'products' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Product Catalog & Shelf Grid Placement</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Edit SKU details, shelf row (1=Bottom, 2=Middle, 3=Top), slot column, facings, or upload a CSV spreadsheet.
              </p>
            </div>
            {!isReadOnly && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ ...secondaryBtn, cursor: 'pointer' }}>
                  Upload Product CSV
                  <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                </label>
                <button onClick={handleAddProduct} style={primaryBtn}>+ Add Product</button>
                <button onClick={onResetDefaultData} style={secondaryBtn}>Reset Defaults</button>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: '#0f172a', textAlign: 'left' }}>
                  <th style={thStyle}>Product ID</th>
                  <th style={thStyle}>Brand</th>
                  <th style={thStyle}>Title / Flavour</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Price ($)</th>
                  <th style={thStyle}>Shelf Row</th>
                  <th style={thStyle}>Slot Col</th>
                  <th style={thStyle}>Facings</th>
                  <th style={thStyle}>Target?</th>
                  <th style={thStyle}>Color</th>
                </tr>
              </thead>
              <tbody>
                {storeData.products.map((p, idx) => (
                  <tr key={p.id + idx} style={{ borderTop: '1px solid #334155' }}>
                    <td style={tdStyle}>
                      <input
                        value={p.id}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'id', e.target.value)}
                        style={{ ...cellInput, width: '135px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={p.brand}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'brand', e.target.value)}
                        style={{ ...cellInput, width: '110px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={p.title}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'title', e.target.value)}
                        style={{ ...cellInput, width: '125px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={p.size}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'size', e.target.value)}
                        style={{ ...cellInput, width: '110px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        step="0.01"
                        value={p.price}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'price', Number(e.target.value))}
                        style={{ ...cellInput, width: '65px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={p.shelf}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'shelf', Number(e.target.value))}
                        style={{ ...cellInput, width: '50px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={p.slot}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'slot', Number(e.target.value))}
                        style={{ ...cellInput, width: '50px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        value={p.facings}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'facings', Number(e.target.value))}
                        style={{ ...cellInput, width: '50px' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={Boolean(p.target)}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'target', e.target.checked)}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="color"
                        value={p.color}
                        disabled={isReadOnly}
                        onChange={(e) => handleProductChange(idx, 'color', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VERSIONS, HINTS & FIXED/SHUFFLED SHELVES */}
      {activeTab === 'versions' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
            <label style={{ fontWeight: 'bold' }}>Editing Study Version:</label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              style={{ ...inputStyle, width: '280px' }}
            >
              <option value="A">Version A (Baseline / No Hints)</option>
              <option value="B">Version B (Shelf Talker & Tag Hints)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Shopping Task Instruction Text</label>
              <input
                value={ver.instruction}
                disabled={isReadOnly}
                onChange={(e) => handleVersionField('instruction', e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Shelf Talker Message Text</label>
              <input
                value={ver.shelfTalkerText}
                disabled={isReadOnly}
                onChange={(e) => handleVersionField('shelfTalkerText', e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(ver.showShelfTalker)}
                  disabled={isReadOnly}
                  onChange={(e) => handleVersionField('showShelfTalker', e.target.checked)}
                />{' '}
                Show Clipped Shelf Talker Card on Shelf
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={Boolean(ver.highlightTargetTags)}
                  disabled={isReadOnly}
                  onChange={(e) => handleVersionField('highlightTargetTags', e.target.checked)}
                />{' '}
                Highlight Price Tags on Target Products (Yellow Border)
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={ver.soundEnabled !== false}
                  disabled={isReadOnly}
                  onChange={(e) => handleVersionField('soundEnabled', e.target.checked)}
                />{' '}
                Enable Background Store Sound & Cart Feedback Audio
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={ver.polishEffects !== false}
                  disabled={isReadOnly}
                  onChange={(e) => handleVersionField('polishEffects', e.target.checked)}
                />{' '}
                Enable Visual Polish Effects (Cooler Lighting Glow)
              </label>
            </div>

            <div>
              <label style={labelStyle}>Fixed vs. Shuffled Shelves (Page 9 Shuffling Rule)</label>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }}>
                Checked shelves stay in a fixed order for every user; unchecked shelves shuffle using the user's random seed.
              </p>
              {[1, 2, 3].map((sNum) => (
                <div key={sNum} style={{ marginBottom: '6px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={(storeData.storeConfig.fixedShelves || []).includes(sNum)}
                      disabled={isReadOnly}
                      onChange={() => toggleFixedShelf(sNum)}
                    />{' '}
                    Shelf Row {sNum} ({sNum === 2 ? 'Middle Eye-Level' : sNum === 3 ? 'Top' : 'Bottom'}):{' '}
                    <strong>
                      {(storeData.storeConfig.fixedShelves || []).includes(sNum) ? 'FIXED' : 'SHUFFLED'}
                    </strong>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER LINKS & QUESTIONNAIRE REDIRECT */}
      {activeTab === 'links' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Participant Link Generator & Post-Checkout Redirect</h3>
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Post-Shopping Questionnaire Redirect URL (Optional, Page 2 Step 9)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="https://your-survey.com/form?uid="
                value={redirectUrl}
                disabled={isReadOnly}
                onChange={(e) => setRedirectUrl(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              {!isReadOnly && (
                <button
                  onClick={() =>
                    onSaveStoreData({
                      ...storeData,
                      storeConfig: { ...storeData.storeConfig, redirectUrl }
                    })
                  }
                  style={primaryBtn}
                >
                  Save Redirect URL
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Generate Participant Links:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              style={{ ...inputStyle, width: '70px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: batchCount }).map((_, i) => {
              const uid = `U${1001 + i}`;
              const balancedVer = i % 2 === 0 ? 'A' : 'B';
              const seed = 1040 + i;
              const link = `${baseUrl}?id=${uid}&version=${balancedVer}&seed=${seed}`;
              return (
                <div
                  key={uid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0f172a',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  <code>{link}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(link)}
                    style={{ ...secondaryBtn, padding: '4px 10px', fontSize: '12px' }}
                  >
                    Copy Link
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#0f172a',
  color: '#f8fafc',
  fontFamily: 'system-ui, sans-serif',
  padding: '24px',
  boxSizing: 'border-box',
  overflowY: 'auto'
};

const cardStyle = {
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '12px',
  padding: '20px'
};

const kpiBox = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '14px'
};

const inputStyle = {
  background: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '14px'
};

const cellInput = {
  background: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '4px 6px',
  fontSize: '12px'
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '6px',
  fontWeight: 'bold'
};

const primaryBtn = {
  background: '#0284c7',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const secondaryBtn = {
  background: '#334155',
  color: '#f8fafc',
  border: '1px solid #475569',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px'
};

const thStyle = {
  padding: '10px 8px',
  color: '#94a3b8',
  fontWeight: 'bold',
  borderBottom: '1px solid #334155'
};

const tdStyle = {
  padding: '8px'
};