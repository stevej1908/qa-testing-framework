/**
 * TestArtifactStore - Persistent storage for test artifacts using IndexedDB
 *
 * Stores:
 * - Screenshots (base64 images)
 * - Test results
 * - Session metadata
 */

const DB_NAME = 'TFArtifacts';
const DB_VERSION = 1;

// Store names
const STORES = {
  SCREENSHOTS: 'screenshots',
  RESULTS: 'results',
  SESSIONS: 'sessions'
};

let dbInstance = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Screenshots store
      if (!db.objectStoreNames.contains(STORES.SCREENSHOTS)) {
        const screenshotStore = db.createObjectStore(STORES.SCREENSHOTS, { keyPath: 'id' });
        screenshotStore.createIndex('sessionId', 'sessionId', { unique: false });
        screenshotStore.createIndex('checkpointId', 'checkpointId', { unique: false });
        screenshotStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Results store
      if (!db.objectStoreNames.contains(STORES.RESULTS)) {
        const resultsStore = db.createObjectStore(STORES.RESULTS, { keyPath: 'id' });
        resultsStore.createIndex('sessionId', 'sessionId', { unique: false });
        resultsStore.createIndex('checkpointId', 'checkpointId', { unique: false });
      }

      // Sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionsStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
        sessionsStore.createIndex('specId', 'specId', { unique: false });
        sessionsStore.createIndex('status', 'status', { unique: false });
        sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generate a unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Screenshot Operations ============

/**
 * Save a screenshot
 * @param {Object} screenshot - Screenshot data
 * @param {string} screenshot.sessionId - Session ID
 * @param {string} screenshot.checkpointId - Checkpoint ID
 * @param {string} screenshot.dataUrl - Base64 image data URL
 * @param {string} screenshot.label - Optional label
 * @returns {Promise<string>} Screenshot ID
 */
export async function saveScreenshot(screenshot) {
  const db = await initDB();

  const record = {
    id: generateId(),
    sessionId: screenshot.sessionId,
    checkpointId: screenshot.checkpointId,
    dataUrl: screenshot.dataUrl,
    label: screenshot.label || '',
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCREENSHOTS, 'readwrite');
    const store = tx.objectStore(STORES.SCREENSHOTS);
    const request = store.add(record);

    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get screenshots for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Screenshots
 */
export async function getScreenshotsBySession(sessionId) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCREENSHOTS, 'readonly');
    const store = tx.objectStore(STORES.SCREENSHOTS);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single screenshot by ID
 * @param {string} id - Screenshot ID
 * @returns {Promise<Object>} Screenshot
 */
export async function getScreenshot(id) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCREENSHOTS, 'readonly');
    const store = tx.objectStore(STORES.SCREENSHOTS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete screenshots for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<number>} Number of deleted screenshots
 */
export async function deleteScreenshotsBySession(sessionId) {
  const screenshots = await getScreenshotsBySession(sessionId);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCREENSHOTS, 'readwrite');
    const store = tx.objectStore(STORES.SCREENSHOTS);

    let deleted = 0;
    screenshots.forEach(s => {
      store.delete(s.id);
      deleted++;
    });

    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

// ============ Result Operations ============

/**
 * Save a checkpoint result
 * @param {Object} result - Result data
 * @returns {Promise<string>} Result ID
 */
export async function saveResult(result) {
  const db = await initDB();

  const record = {
    id: generateId(),
    sessionId: result.sessionId,
    checkpointId: result.checkpointId,
    status: result.status, // 'passed' | 'failed' | 'skipped'
    feedback: result.feedback || null,
    githubIssue: result.githubIssue || null,
    screenshotId: result.screenshotId || null,
    timestamp: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RESULTS, 'readwrite');
    const store = tx.objectStore(STORES.RESULTS);
    const request = store.add(record);

    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get results for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Results
 */
export async function getResultsBySession(sessionId) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RESULTS, 'readonly');
    const store = tx.objectStore(STORES.RESULTS);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete results for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<number>} Number of deleted results
 */
export async function deleteResultsBySession(sessionId) {
  const results = await getResultsBySession(sessionId);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RESULTS, 'readwrite');
    const store = tx.objectStore(STORES.RESULTS);

    let deleted = 0;
    results.forEach(r => {
      store.delete(r.id);
      deleted++;
    });

    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

// ============ Session Operations ============

/**
 * Create a new session
 * @param {Object} session - Session data
 * @returns {Promise<string>} Session ID
 */
export async function createSession(session) {
  const db = await initDB();

  const record = {
    id: generateId(),
    specId: session.specId,
    specName: session.specName,
    targetUrl: session.targetUrl,
    status: 'active', // 'active' | 'paused' | 'completed'
    currentCheckpointIndex: 0,
    totalCheckpoints: session.totalCheckpoints || 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    githubIssues: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.add(record);

    request.onsuccess = () => resolve(record.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a session by ID
 * @param {string} id - Session ID
 * @returns {Promise<Object>} Session
 */
export async function getSession(id) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update a session
 * @param {string} id - Session ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateSession(id, updates) {
  const db = await initDB();
  const session = await getSession(id);

  if (!session) {
    throw new Error(`Session not found: ${id}`);
  }

  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.put(updated);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all sessions (optionally filtered)
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} Sessions
 */
export async function getSessions(options = {}) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      let sessions = request.result;

      // Filter by status
      if (options.status) {
        sessions = sessions.filter(s => s.status === options.status);
      }

      // Filter by specId
      if (options.specId) {
        sessions = sessions.filter(s => s.specId === options.specId);
      }

      // Sort by most recent
      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Limit results
      if (options.limit) {
        sessions = sessions.slice(0, options.limit);
      }

      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get resumable sessions (active or paused)
 * @returns {Promise<Array>} Resumable sessions
 */
export async function getResumableSessions() {
  const sessions = await getSessions();
  return sessions.filter(s => s.status === 'active' || s.status === 'paused');
}

/**
 * Delete a session and all its artifacts
 * @param {string} id - Session ID
 * @returns {Promise<void>}
 */
export async function deleteSession(id) {
  // Delete related data first
  await deleteScreenshotsBySession(id);
  await deleteResultsBySession(id);

  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up old completed sessions
 * @param {number} maxAgeDays - Max age in days (default 30)
 * @returns {Promise<number>} Number of deleted sessions
 */
export async function cleanupOldSessions(maxAgeDays = 30) {
  const sessions = await getSessions({ status: 'completed' });
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  let deleted = 0;
  for (const session of sessions) {
    if (new Date(session.updatedAt) < cutoff) {
      await deleteSession(session.id);
      deleted++;
    }
  }

  return deleted;
}

// ============ Export Storage Stats ============

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
export async function getStorageStats() {
  const db = await initDB();

  const getCount = (storeName) => {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  };

  const [screenshots, results, sessions] = await Promise.all([
    getCount(STORES.SCREENSHOTS),
    getCount(STORES.RESULTS),
    getCount(STORES.SESSIONS)
  ]);

  return {
    screenshots,
    results,
    sessions,
    totalRecords: screenshots + results + sessions
  };
}

export default {
  // Screenshots
  saveScreenshot,
  getScreenshot,
  getScreenshotsBySession,
  deleteScreenshotsBySession,

  // Results
  saveResult,
  getResultsBySession,
  deleteResultsBySession,

  // Sessions
  createSession,
  getSession,
  updateSession,
  getSessions,
  getResumableSessions,
  deleteSession,
  cleanupOldSessions,

  // Utils
  getStorageStats
};
