/**
 * SessionPersistence - High-level session management for pause/resume functionality
 *
 * Uses TestArtifactStore for underlying storage operations.
 */

import {
  createSession,
  getSession,
  updateSession,
  getSessions,
  getResumableSessions,
  deleteSession,
  saveResult,
  getResultsBySession,
  saveScreenshot,
  getScreenshotsBySession,
  getStorageStats
} from './TestArtifactStore';

/**
 * Start a new testing session
 * @param {Object} config - Session configuration
 * @param {string} config.specId - Spec ID
 * @param {string} config.specName - Spec display name
 * @param {string} config.targetUrl - Target application URL
 * @param {number} config.totalCheckpoints - Total number of checkpoints
 * @returns {Promise<Object>} Session object with id
 */
export async function startSession(config) {
  const sessionId = await createSession({
    specId: config.specId,
    specName: config.specName,
    targetUrl: config.targetUrl,
    totalCheckpoints: config.totalCheckpoints
  });

  const session = await getSession(sessionId);
  return session;
}

/**
 * Record a checkpoint result
 * @param {string} sessionId - Session ID
 * @param {Object} checkpoint - Checkpoint object
 * @param {string} status - 'passed' | 'failed' | 'skipped'
 * @param {Object} feedback - Feedback data (for failed)
 * @param {Object} githubIssue - GitHub issue info (if created)
 * @param {string} screenshotDataUrl - Screenshot data URL (optional)
 * @returns {Promise<void>}
 */
export async function recordCheckpointResult(sessionId, checkpoint, status, feedback = null, githubIssue = null, screenshotDataUrl = null) {
  // Save screenshot if provided
  let screenshotId = null;
  if (screenshotDataUrl) {
    screenshotId = await saveScreenshot({
      sessionId,
      checkpointId: checkpoint.id,
      dataUrl: screenshotDataUrl,
      label: `${checkpoint.id}: ${checkpoint.action}`
    });
  }

  // Save result
  await saveResult({
    sessionId,
    checkpointId: checkpoint.id,
    status,
    feedback,
    githubIssue,
    screenshotId
  });

  // Update session stats
  const session = await getSession(sessionId);
  const updates = {
    currentCheckpointIndex: session.currentCheckpointIndex + 1
  };

  if (status === 'passed') {
    updates.passed = session.passed + 1;
  } else if (status === 'failed') {
    updates.failed = session.failed + 1;
    if (githubIssue) {
      updates.githubIssues = [...session.githubIssues, githubIssue];
    }
  } else if (status === 'skipped') {
    updates.skipped = session.skipped + 1;
  }

  await updateSession(sessionId, updates);
}

/**
 * Pause a session (mark for later resumption)
 * @param {string} sessionId - Session ID
 * @param {number} currentIndex - Current checkpoint index
 * @returns {Promise<void>}
 */
export async function pauseSession(sessionId, currentIndex) {
  await updateSession(sessionId, {
    status: 'paused',
    currentCheckpointIndex: currentIndex
  });
}

/**
 * Resume a paused session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session state for resumption
 */
export async function resumeSession(sessionId) {
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Get existing results
  const results = await getResultsBySession(sessionId);

  // Mark as active
  await updateSession(sessionId, { status: 'active' });

  return {
    session: await getSession(sessionId),
    results,
    resumeFromIndex: session.currentCheckpointIndex
  };
}

/**
 * Complete a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Final session summary
 */
export async function completeSession(sessionId) {
  await updateSession(sessionId, { status: 'completed' });

  const session = await getSession(sessionId);
  const results = await getResultsBySession(sessionId);
  const screenshots = await getScreenshotsBySession(sessionId);

  return {
    session,
    results,
    screenshots,
    summary: {
      total: results.length,
      passed: session.passed,
      failed: session.failed,
      skipped: session.skipped,
      passRate: results.length > 0 ? Math.round((session.passed / results.length) * 100) : 0,
      githubIssues: session.githubIssues
    }
  };
}

/**
 * Get all resumable sessions with summary info
 * @returns {Promise<Array>} Array of session summaries
 */
export async function getResumableSessionsList() {
  const sessions = await getResumableSessions();

  return sessions.map(session => ({
    id: session.id,
    specId: session.specId,
    specName: session.specName,
    targetUrl: session.targetUrl,
    status: session.status,
    progress: {
      current: session.currentCheckpointIndex,
      total: session.totalCheckpoints,
      percentage: session.totalCheckpoints > 0
        ? Math.round((session.currentCheckpointIndex / session.totalCheckpoints) * 100)
        : 0
    },
    stats: {
      passed: session.passed,
      failed: session.failed,
      skipped: session.skipped
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    age: getRelativeTime(session.updatedAt)
  }));
}

/**
 * Get recent completed sessions
 * @param {number} limit - Max number of sessions
 * @returns {Promise<Array>} Array of session summaries
 */
export async function getRecentCompletedSessions(limit = 10) {
  const sessions = await getSessions({ status: 'completed', limit });

  return sessions.map(session => ({
    id: session.id,
    specId: session.specId,
    specName: session.specName,
    targetUrl: session.targetUrl,
    stats: {
      passed: session.passed,
      failed: session.failed,
      skipped: session.skipped,
      total: session.passed + session.failed + session.skipped
    },
    passRate: (session.passed + session.failed + session.skipped) > 0
      ? Math.round((session.passed / (session.passed + session.failed + session.skipped)) * 100)
      : 0,
    githubIssues: session.githubIssues,
    completedAt: session.updatedAt,
    age: getRelativeTime(session.updatedAt)
  }));
}

/**
 * Abandon a session (delete without completing)
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function abandonSession(sessionId) {
  await deleteSession(sessionId);
}

/**
 * Get session export data (for download/sharing)
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Exportable session data
 */
export async function exportSession(sessionId) {
  const session = await getSession(sessionId);
  const results = await getResultsBySession(sessionId);
  const screenshots = await getScreenshotsBySession(sessionId);

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    session: {
      id: session.id,
      specId: session.specId,
      specName: session.specName,
      targetUrl: session.targetUrl,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    },
    stats: {
      passed: session.passed,
      failed: session.failed,
      skipped: session.skipped,
      total: session.passed + session.failed + session.skipped
    },
    results: results.map(r => ({
      checkpointId: r.checkpointId,
      status: r.status,
      feedback: r.feedback,
      githubIssue: r.githubIssue,
      timestamp: r.timestamp
    })),
    screenshots: screenshots.map(s => ({
      checkpointId: s.checkpointId,
      label: s.label,
      dataUrl: s.dataUrl,
      timestamp: s.timestamp
    }))
  };
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
export async function getStats() {
  return await getStorageStats();
}

// Helper function for relative time
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default {
  startSession,
  recordCheckpointResult,
  pauseSession,
  resumeSession,
  completeSession,
  getResumableSessionsList,
  getRecentCompletedSessions,
  abandonSession,
  exportSession,
  getStats
};
