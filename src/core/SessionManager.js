// SessionManager - Manages test session persistence and state
import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  constructor(config = {}) {
    this.config = config;
    this.storageKey = config.storageKey || 'testing-framework-sessions';
    this.sessions = [];
    this.currentSession = null;
  }

  // Initialize and load existing sessions
  async initialize() {
    await this.loadSessions();
    return this.sessions;
  }

  // Create a new session
  createSession(featureName, options = {}) {
    const session = {
      id: uuidv4(),
      featureName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'created', // created, pre-flight, testing, paused, completed, blocked
      preFlight: null,
      checkpoints: [],
      feedback: [],
      screenshots: [],
      savePoints: [],
      notes: [],
      metadata: {
        githubIssue: options.githubIssue || null,
        assignedTo: options.assignedTo || null,
        environment: options.environment || 'dev',
        version: options.version || '1.0.0'
      },
      handoff: null,
      summary: null
    };

    this.sessions.push(session);
    this.currentSession = session;
    this.saveSessions();

    return session;
  }

  // Update current session
  updateSession(updates) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    Object.assign(this.currentSession, updates, {
      updatedAt: new Date().toISOString()
    });

    this.saveSessions();
    return this.currentSession;
  }

  // Save progress with notes
  saveProgress(notes = '') {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const savePoint = {
      id: uuidv4(),
      savedAt: new Date().toISOString(),
      notes,
      status: this.currentSession.status,
      checkpointProgress: this.currentSession.checkpoints.length,
      snapshot: {
        checkpoints: [...this.currentSession.checkpoints],
        feedback: [...this.currentSession.feedback]
      }
    };

    this.currentSession.savePoints.push(savePoint);
    this.currentSession.updatedAt = new Date().toISOString();
    this.saveSessions();

    return savePoint;
  }

  // Load session by ID
  loadSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      this.currentSession = session;
    }
    return session;
  }

  // Get session summary for resume
  getSessionSummary(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    return {
      id: session.id,
      featureName: session.featureName,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      progress: {
        checkpointsCompleted: session.checkpoints.length,
        feedbackItems: session.feedback.length,
        savePoints: session.savePoints.length
      },
      lastSavePoint: session.savePoints[session.savePoints.length - 1] || null,
      lastNotes: session.notes[session.notes.length - 1] || null
    };
  }

  // Generate session summary text for resume
  generateResumeSummary(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const summary = [];
    summary.push(`Feature: ${session.featureName}`);
    summary.push(`Status: ${session.status}`);
    summary.push(`Started: ${new Date(session.createdAt).toLocaleString()}`);
    summary.push(`Last Updated: ${new Date(session.updatedAt).toLocaleString()}`);
    summary.push('');
    summary.push('Progress:');
    summary.push(`  - Checkpoints completed: ${session.checkpoints.length}`);
    summary.push(`  - Feedback items: ${session.feedback.length}`);
    summary.push(`  - Blockers: ${session.feedback.filter(f => f.priority === 'blocker').length}`);
    summary.push('');

    if (session.savePoints.length > 0) {
      const lastSave = session.savePoints[session.savePoints.length - 1];
      summary.push('Last save point:');
      summary.push(`  - Saved: ${new Date(lastSave.savedAt).toLocaleString()}`);
      if (lastSave.notes) {
        summary.push(`  - Notes: ${lastSave.notes}`);
      }
    }

    return summary.join('\n');
  }

  // Prepare handoff package
  prepareHandoff(sessionId, handoffNotes = '') {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    const handoff = {
      id: uuidv4(),
      sessionId,
      preparedAt: new Date().toISOString(),
      preparedBy: this.config.currentUser || 'unknown',
      notes: handoffNotes,
      package: {
        featureName: session.featureName,
        originalRequest: session.preFlight?.featureRequest,
        preFlight: session.preFlight,
        checkpoints: session.checkpoints,
        feedback: session.feedback,
        screenshots: session.screenshots,
        status: session.status,
        recommendedNextSteps: this.generateNextSteps(session)
      }
    };

    session.handoff = handoff;
    this.saveSessions();

    return handoff;
  }

  // Generate recommended next steps
  generateNextSteps(session) {
    const steps = [];

    const unresolvedBlockers = session.feedback.filter(
      f => f.priority === 'blocker' && f.status !== 'resolved'
    );

    if (unresolvedBlockers.length > 0) {
      steps.push({
        priority: 'high',
        action: `Resolve ${unresolvedBlockers.length} blocker(s)`,
        details: unresolvedBlockers.map(b => b.issue)
      });
    }

    if (session.status === 'paused') {
      steps.push({
        priority: 'medium',
        action: 'Resume testing from checkpoint ' + (session.checkpoints.length + 1)
      });
    }

    const niceToHave = session.feedback.filter(
      f => f.priority === 'nice-to-have' && f.status === 'open'
    );

    if (niceToHave.length > 0) {
      steps.push({
        priority: 'low',
        action: `Review ${niceToHave.length} nice-to-have item(s)`,
        details: niceToHave.map(n => n.issue)
      });
    }

    return steps;
  }

  // Get all sessions
  getAllSessions() {
    return this.sessions.map(s => this.getSessionSummary(s.id));
  }

  // Get sessions by status
  getSessionsByStatus(status) {
    return this.sessions.filter(s => s.status === status);
  }

  // Delete session
  deleteSession(sessionId) {
    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index > -1) {
      this.sessions.splice(index, 1);
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      this.saveSessions();
      return true;
    }
    return false;
  }

  // Save sessions to storage
  saveSessions() {
    try {
      const data = {
        savedAt: new Date().toISOString(),
        sessions: this.sessions
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save sessions:', error);
      return false;
    }
  }

  // Load sessions from storage
  async loadSessions() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data && data.sessions) {
        this.sessions = data.sessions;
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      this.sessions = [];
    }
    return this.sessions;
  }

  // Export session
  exportSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return null;

    return {
      exportedAt: new Date().toISOString(),
      session
    };
  }

  // Import session
  importSession(sessionData) {
    if (sessionData.session) {
      const session = {
        ...sessionData.session,
        id: uuidv4(), // New ID to avoid conflicts
        importedAt: new Date().toISOString(),
        importedFrom: sessionData.session.id
      };
      this.sessions.push(session);
      this.saveSessions();
      return session;
    }
    return null;
  }
}

export default SessionManager;
