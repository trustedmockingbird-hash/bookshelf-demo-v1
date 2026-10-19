// Phase 5 Telemetry Service + Admin Multi-Visit Storage

const VISITS_STORAGE_KEY = 'store_sim_visits_v1';

class TelemetryTracker {
  constructor() {
    this.isPreview = false;
    this.visitId = null;
    this.reset();
    this.setupVisibilityListener();
  }

  reset() {
    const params = new URLSearchParams(window.location.search);
    this.userId = params.get('id') || 'U12345';
    this.version = params.get('version') || 'B';
    this.shuffleSeed = Number(params.get('seed')) || 1042;
    this.startTime = null;
    this.actionLog = [];
    this.viewingSamples = [];
    this.visibilityStats = {};
    this.hoverStartTimes = {};
    this.firstHoveredProduct = null;
    this.firstPickedProduct = null;
    this.firstPickupTimeMs = null;
    this.inspectedProducts = new Set();
    this.changesOfMind = 0;
    this.targetInteractionTimeMs = 0;
    this.inspectStartTime = null;
    this.inspectingTarget = false;
    this.fpsSamples = [];
  }

  setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.startTime) return;
        const state = document.hidden ? 'pause_tab_hidden' : 'resume_tab_visible';
        this.logAction(state, 'browser-tab', 'NONE', false);
      });
    }
  }

  startSession(version, shuffleSeed, isPreview = false) {
    this.reset();
    this.version = version;
    this.shuffleSeed = shuffleSeed;
    this.isPreview = isPreview;
    this.visitId = `${this.userId}_${Date.now()}`;
    this.startTime = performance.now();
    this.logAction('start', 'store-entrance', 'NONE', false);
    this.syncVisitToStorage('started', []);
  }

  getElapsedMs() {
    if (!this.startTime) return 0;
    return Math.round(performance.now() - this.startTime);
  }

  logAction(action, objectPosition, productId = 'NONE', isTarget = false, extra = '') {
    if (!this.startTime && action !== 'error') return;
    const timeMs = this.getElapsedMs();

    if (action === 'hover_start') {
      this.hoverStartTimes[objectPosition] = performance.now();
      if (productId !== 'NONE' && !this.firstHoveredProduct) {
        this.firstHoveredProduct = productId;
      }
      if (!this.visibilityStats[objectPosition]) {
        this.visibilityStats[objectPosition] = { timeOnScreenMs: 0, maxScreenRatio: 0, hovered: true };
      } else {
        this.visibilityStats[objectPosition].hovered = true;
      }
    }

    if (action === 'hover_end') {
      const started = this.hoverStartTimes[objectPosition];
      if (started && isTarget) {
        this.targetInteractionTimeMs += Math.round(performance.now() - started);
      }
      delete this.hoverStartTimes[objectPosition];
    }

    if (action === 'inspect_open') {
      if (!this.firstPickedProduct) {
        this.firstPickedProduct = productId;
        this.firstPickupTimeMs = timeMs;
      }
      this.inspectedProducts.add(productId);
      this.inspectStartTime = performance.now();
      this.inspectingTarget = isTarget;
    }

    if (action === 'put_back' || action === 'add_to_cart') {
      if (this.inspectStartTime && this.inspectingTarget) {
        this.targetInteractionTimeMs += Math.round(performance.now() - this.inspectStartTime);
      }
      this.inspectStartTime = null;
    }

    if (action === 'put_back' || action === 'remove_from_cart') {
      this.changesOfMind += 1;
    }

    this.actionLog.push({
      user: this.userId,
      version: this.version,
      time_ms: timeMs,
      action: extra ? `${action}(${extra})` : action,
      object: objectPosition,
      product: productId,
      target: isTarget ? 'yes' : 'no'
    });
  }

  recordViewingSample(cameraPos, cameraRot, visibleObjects, dtMs, currentFps) {
    if (!this.startTime) return;
    if (currentFps > 0 && currentFps < 250) {
      this.fpsSamples.push(currentFps);
    }

    this.viewingSamples.push({
      t_ms: this.getElapsedMs(),
      pos: [Number(cameraPos.x.toFixed(2)), Number(cameraPos.y.toFixed(2)), Number(cameraPos.z.toFixed(2))],
      rot: [Number(cameraRot.x.toFixed(2)), Number(cameraRot.y.toFixed(2))],
      visibleCount: visibleObjects.length
    });

    visibleObjects.forEach((obj) => {
      if (!this.visibilityStats[obj.key]) {
        this.visibilityStats[obj.key] = {
          productId: obj.productId,
          timeOnScreenMs: 0,
          maxScreenRatio: 0,
          hovered: false
        };
      }
      const stat = this.visibilityStats[obj.key];
      stat.timeOnScreenMs += Math.round(dtMs);
      if (obj.screenRatio > stat.maxScreenRatio) {
        stat.maxScreenRatio = Number(obj.screenRatio.toFixed(4));
      }
    });
  }

  buildSummary(cart) {
    const totalTimeMs = this.getElapsedMs();
    const choseTarget = cart.some((item) => item.target) ? 'yes' : 'no';
    const cartSummary = cart.map((item) => `${item.id}x${item.quantity}`).join('; ') || 'EMPTY';
    const shelfTalkerStat = this.visibilityStats['shelf-talker'] || { timeOnScreenMs: 0, hovered: false };
    const avgFps = this.fpsSamples.length
      ? Math.round(this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length)
      : 60;

    return {
      user: this.userId,
      version: this.version,
      chose_target_product: choseTarget,
      cart_contents: cartSummary,
      total_shopping_time_ms: totalTimeMs,
      time_to_first_pickup_ms: this.firstPickupTimeMs ?? 'NA',
      products_inspected_count: this.inspectedProducts.size,
      products_inspected_list: Array.from(this.inspectedProducts).join('; ') || 'NONE',
      changes_of_mind: this.changesOfMind,
      shelf_talker_seen: shelfTalkerStat.timeOnScreenMs > 0 ? 'yes' : 'no',
      shelf_talker_screen_ms: shelfTalkerStat.timeOnScreenMs,
      shelf_talker_hovered: shelfTalkerStat.hovered ? 'yes' : 'no',
      time_on_target_products_ms: this.targetInteractionTimeMs,
      first_product_hovered: this.firstHoveredProduct || 'NONE',
      first_product_picked_up: this.firstPickedProduct || 'NONE',
      device_info: `${navigator.platform} | ${window.innerWidth}x${window.innerHeight} | ~${avgFps}fps`,
      scene_record: `v=${this.version}|seed=${this.shuffleSeed}|layout=1.0|app=bookshelf-demo-1.0`
    };
  }

  // Save batch to localStorage ( skips saving if Admin is in Preview mode )
  syncVisitToStorage(status = 'started', cart = []) {
    if (this.isPreview || !this.visitId) return;
    try {
      const visits = this.getStoredVisits();
      const record = {
        visitId: this.visitId,
        user: this.userId,
        version: this.version,
        shuffleSeed: this.shuffleSeed,
        status,
        isTest: false,
        summary: this.buildSummary(cart),
        actionLog: this.actionLog,
        visibilityStats: this.visibilityStats
      };
      const idx = visits.findIndex((v) => v.visitId === this.visitId);
      if (idx >= 0) {
        visits[idx] = { ...visits[idx], ...record };
      } else {
        visits.push(record);
      }
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
    } catch (e) {
      console.error('Storage sync warning:', e);
    }
  }

  getStoredVisits() {
    try {
      const raw = localStorage.getItem(VISITS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  toggleTestVisit(visitId) {
    const visits = this.getStoredVisits().map((v) =>
      v.visitId === visitId ? { ...v, isTest: !v.isTest } : v
    );
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
    return visits;
  }

  downloadActionLogCSV() {
    const headers = ['user', 'version', 'time_ms', 'action', 'object', 'product', 'target'];
    const rows = this.actionLog.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    this.triggerDownload([headers.join(','), ...rows].join('\n'), `action_log_${this.userId}.csv`, 'text/csv');
  }

  downloadSummaryCSV(cart) {
    const summary = this.buildSummary(cart);
    const headers = Object.keys(summary);
    const values = headers.map((h) => `"${String(summary[h] ?? '').replace(/"/g, '""')}"`);
    this.triggerDownload([headers.join(','), values.join(',')].join('\n'), `summary_${this.userId}.csv`, 'text/csv');
  }

  downloadViewingRecordJSON(cart) {
    const payload = {
      user: this.userId,
      version: this.version,
      shuffleSeed: this.shuffleSeed,
      summary: this.buildSummary(cart),
      objectVisibilityStats: this.visibilityStats,
      cameraSamples10Hz: this.viewingSamples
    };
    this.triggerDownload(JSON.stringify(payload, null, 2), `viewing_record_${this.userId}.json`, 'application/json');
  }

  // Admin Multi-User Export Functions (excludes visits marked as isTest)
  downloadAllSummariesCSV() {
    const valid = this.getStoredVisits().filter((v) => !v.isTest && v.summary);
    if (valid.length === 0) return this.downloadSummaryCSV([]);
    const headers = Object.keys(valid[0].summary);
    const rows = valid.map((v) =>
      headers.map((h) => `"${String(v.summary[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    this.triggerDownload([headers.join(','), ...rows].join('\n'), 'all_users_summary.csv', 'text/csv');
  }

  downloadAllActionsCSV() {
    const valid = this.getStoredVisits().filter((v) => !v.isTest);
    const allActions = valid.flatMap((v) => v.actionLog || []);
    if (allActions.length === 0) return this.downloadActionLogCSV();
    const headers = ['user', 'version', 'time_ms', 'action', 'object', 'product', 'target'];
    const rows = allActions.map((r) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    this.triggerDownload([headers.join(','), ...rows].join('\n'), 'all_users_actions.csv', 'text/csv');
  }

  downloadAllViewingJSON() {
    const valid = this.getStoredVisits().filter((v) => !v.isTest);
    this.triggerDownload(JSON.stringify(valid, null, 2), 'all_users_viewing_records.json', 'application/json');
  }

  triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const telemetry = new TelemetryTracker();