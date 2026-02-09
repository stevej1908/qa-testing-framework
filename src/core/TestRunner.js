// TestRunner - Main orchestrator for the testing framework
import { v4 as uuidv4 } from 'uuid';

export class TestRunner {
  constructor(config = {}) {
    this.config = config;
    this.currentSession = null;
    this.checkpoints = [];
    this.currentCheckpointIndex = -1;
    this.status = 'idle'; // idle, pre-flight, testing, paused, completed, blocked
    this.blockers = [];
    this.listeners = new Map();
  }

  // Initialize a new test session
  async startSession(featureName, options = {}) {
    this.currentSession = {
      id: uuidv4(),
      featureName,
      startedAt: new Date().toISOString(),
      status: 'pre-flight',
      preFlight: null,
      checkpoints: [],
      feedback: [],
      screenshots: [],
      notes: [],
      options
    };

    this.status = 'pre-flight';
    this.emit('sessionStarted', this.currentSession);

    return this.currentSession;
  }

  // Complete pre-flight and move to testing
  async completePreFlight(preFlightData) {
    if (!this.currentSession) {
      throw new Error('No active session. Call startSession first.');
    }

    this.currentSession.preFlight = {
      ...preFlightData,
      completedAt: new Date().toISOString()
    };

    // Generate checkpoints from pre-flight
    this.checkpoints = this.generateCheckpointsFromPreFlight(preFlightData);
    this.currentCheckpointIndex = 0;
    this.status = 'testing';

    this.emit('preFlightCompleted', this.currentSession.preFlight);
    this.emit('checkpointReady', this.getCurrentCheckpoint());

    return this.checkpoints;
  }

  // Generate checkpoints from pre-flight data
  generateCheckpointsFromPreFlight(preFlightData) {
    const checkpoints = [];

    if (preFlightData.steps) {
      preFlightData.steps.forEach((step, index) => {
        checkpoints.push({
          id: uuidv4(),
          index: index + 1,
          action: step.action,
          expectedResult: step.expectedResult,
          element: step.element || null,
          status: 'pending', // pending, passed, failed, skipped
          feedback: null,
          screenshot: null,
          notes: null,
          timestamp: null
        });
      });
    }

    return checkpoints;
  }

  // Get current checkpoint
  getCurrentCheckpoint() {
    if (this.currentCheckpointIndex < 0 || this.currentCheckpointIndex >= this.checkpoints.length) {
      return null;
    }
    return this.checkpoints[this.currentCheckpointIndex];
  }

  // Approve current checkpoint (Yes)
  async approveCheckpoint(notes = null, screenshot = null) {
    const checkpoint = this.getCurrentCheckpoint();
    if (!checkpoint) {
      throw new Error('No current checkpoint');
    }

    if (this.status === 'blocked') {
      throw new Error('Session is blocked. Resolve blockers first.');
    }

    checkpoint.status = 'passed';
    checkpoint.notes = notes;
    checkpoint.screenshot = screenshot;
    checkpoint.timestamp = new Date().toISOString();

    this.currentSession.checkpoints.push({ ...checkpoint });

    this.emit('checkpointApproved', checkpoint);

    // Move to next checkpoint
    this.currentCheckpointIndex++;

    if (this.currentCheckpointIndex >= this.checkpoints.length) {
      await this.completeSession();
    } else {
      this.emit('checkpointReady', this.getCurrentCheckpoint());
    }

    return checkpoint;
  }

  // Reject current checkpoint (No) with feedback
  async rejectCheckpoint(feedback) {
    const checkpoint = this.getCurrentCheckpoint();
    if (!checkpoint) {
      throw new Error('No current checkpoint');
    }

    checkpoint.status = 'failed';
    checkpoint.feedback = feedback;
    checkpoint.timestamp = new Date().toISOString();

    this.currentSession.checkpoints.push({ ...checkpoint });
    this.currentSession.feedback.push({
      checkpointId: checkpoint.id,
      checkpointIndex: checkpoint.index,
      ...feedback
    });

    this.emit('checkpointRejected', checkpoint);

    // Check if blocker
    if (feedback.priority === 'blocker') {
      this.blockers.push({
        checkpointId: checkpoint.id,
        feedback
      });
      this.status = 'blocked';
      this.emit('sessionBlocked', this.blockers);
    } else {
      // Nice-to-have, continue to next checkpoint
      this.currentCheckpointIndex++;

      if (this.currentCheckpointIndex >= this.checkpoints.length) {
        await this.completeSession();
      } else {
        this.emit('checkpointReady', this.getCurrentCheckpoint());
      }
    }

    return checkpoint;
  }

  // Resolve blockers and continue
  async resolveBlockers() {
    if (this.status !== 'blocked') {
      throw new Error('Session is not blocked');
    }

    this.blockers = [];
    this.status = 'testing';

    this.emit('blockersResolved');
    this.emit('checkpointReady', this.getCurrentCheckpoint());
  }

  // Restart testing from beginning
  async restartSession(resetData = false) {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const previousResults = {
      checkpoints: [...this.currentSession.checkpoints],
      feedback: [...this.currentSession.feedback]
    };

    // Reset checkpoints
    this.checkpoints.forEach(cp => {
      cp.status = 'pending';
      cp.feedback = null;
      cp.screenshot = null;
      cp.notes = null;
      cp.timestamp = null;
    });

    this.currentCheckpointIndex = 0;
    this.blockers = [];
    this.status = 'testing';
    this.currentSession.checkpoints = [];
    this.currentSession.feedback = [];

    this.emit('sessionRestarted', { resetData, previousResults });
    this.emit('checkpointReady', this.getCurrentCheckpoint());

    return previousResults;
  }

  // Save session progress
  async saveSession(notes = '') {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const savePoint = {
      id: uuidv4(),
      savedAt: new Date().toISOString(),
      notes,
      currentCheckpointIndex: this.currentCheckpointIndex,
      status: this.status,
      blockers: [...this.blockers]
    };

    this.currentSession.savePoints = this.currentSession.savePoints || [];
    this.currentSession.savePoints.push(savePoint);

    this.emit('sessionSaved', savePoint);

    return savePoint;
  }

  // Complete the session
  async completeSession() {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    this.currentSession.completedAt = new Date().toISOString();
    this.currentSession.status = 'completed';
    this.status = 'completed';

    // Calculate summary
    const summary = {
      totalCheckpoints: this.checkpoints.length,
      passed: this.currentSession.checkpoints.filter(c => c.status === 'passed').length,
      failed: this.currentSession.checkpoints.filter(c => c.status === 'failed').length,
      blockers: this.currentSession.feedback.filter(f => f.priority === 'blocker').length,
      niceToHave: this.currentSession.feedback.filter(f => f.priority === 'nice-to-have').length
    };

    this.currentSession.summary = summary;

    this.emit('sessionCompleted', this.currentSession);

    return this.currentSession;
  }

  // Get session summary
  getSessionSummary() {
    if (!this.currentSession) {
      return null;
    }

    return {
      id: this.currentSession.id,
      featureName: this.currentSession.featureName,
      status: this.status,
      progress: {
        current: this.currentCheckpointIndex + 1,
        total: this.checkpoints.length,
        percentage: Math.round(((this.currentCheckpointIndex + 1) / this.checkpoints.length) * 100)
      },
      checkpoints: this.currentSession.checkpoints,
      feedback: this.currentSession.feedback,
      blockers: this.blockers
    };
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }
}

export default TestRunner;
