// useTestingFramework - Main React hook for the testing framework
import { useState, useEffect, useCallback, useRef } from 'react';
import { TestRunner } from '../core/TestRunner';
import { CheckpointManager } from '../core/CheckpointManager';
import { FeedbackCollector } from '../core/FeedbackCollector';
import { PreFlightManager } from '../core/PreFlightManager';
import { ScreenshotCapture } from '../core/ScreenshotCapture';
import { SessionManager } from '../core/SessionManager';

export const useTestingFramework = (config = {}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [blockers, setBlockers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [session, setSession] = useState(null);
  const [preFlight, setPreFlight] = useState(null);

  // Initialize managers
  const testRunner = useRef(new TestRunner(config));
  const checkpointManager = useRef(new CheckpointManager());
  const feedbackCollector = useRef(new FeedbackCollector());
  const preFlightManager = useRef(new PreFlightManager(config));
  const screenshotCapture = useRef(new ScreenshotCapture(config));
  const sessionManager = useRef(new SessionManager(config));

  // Set up event listeners
  useEffect(() => {
    const runner = testRunner.current;

    runner.on('sessionStarted', (session) => {
      setSession(session);
      setStatus('pre-flight');
      setIsActive(true);
    });

    runner.on('preFlightCompleted', (preFlight) => {
      setPreFlight(preFlight);
      setStatus('testing');
    });

    runner.on('checkpointReady', (checkpoint) => {
      setCurrentCheckpoint(checkpoint);
      updateProgress();
    });

    runner.on('checkpointApproved', () => {
      updateProgress();
    });

    runner.on('checkpointRejected', () => {
      setFeedback([...feedbackCollector.current.feedback]);
      updateProgress();
    });

    runner.on('sessionBlocked', (blockers) => {
      setBlockers(blockers);
      setStatus('blocked');
    });

    runner.on('blockersResolved', () => {
      setBlockers([]);
      setStatus('testing');
    });

    runner.on('sessionCompleted', (session) => {
      setSession(session);
      setStatus('completed');
    });

    runner.on('sessionRestarted', () => {
      setFeedback([]);
      setBlockers([]);
      setStatus('testing');
      updateProgress();
    });

    // Load existing sessions
    sessionManager.current.initialize();

    return () => {
      // Cleanup listeners if needed
    };
  }, []);

  const updateProgress = useCallback(() => {
    const summary = testRunner.current.getSessionSummary();
    if (summary) {
      setProgress(summary.progress);
    }
  }, []);

  // Start a new test session
  const startSession = useCallback(async (featureName, options = {}) => {
    const session = await testRunner.current.startSession(featureName, options);
    sessionManager.current.createSession(featureName, options);
    return session;
  }, []);

  // Start pre-flight
  const startPreFlight = useCallback((featureRequest) => {
    return preFlightManager.current.startPreFlight(featureRequest);
  }, []);

  // Answer pre-flight question
  const answerPreFlightQuestion = useCallback((questionId, answer) => {
    return preFlightManager.current.answerQuestion(questionId, answer);
  }, []);

  // Complete pre-flight
  const completePreFlight = useCallback(async () => {
    if (!preFlightManager.current.isComplete()) {
      throw new Error('Pre-flight is not complete');
    }

    const approved = preFlightManager.current.approve();
    await testRunner.current.completePreFlight(approved);
    return approved;
  }, []);

  // Approve current checkpoint
  const approveCheckpoint = useCallback(async (notes = null) => {
    // Capture screenshot on approval
    const screenshot = await screenshotCapture.current.captureViewport({
      checkpointId: currentCheckpoint?.id,
      label: currentCheckpoint?.action,
      phase: 'after'
    });

    return testRunner.current.approveCheckpoint(notes, screenshot);
  }, [currentCheckpoint]);

  // Reject current checkpoint
  const rejectCheckpoint = useCallback(async (feedbackData) => {
    const validation = feedbackCollector.current.validateFeedback(feedbackData);
    if (!validation.valid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    const feedback = feedbackCollector.current.createFeedback({
      ...feedbackData,
      checkpointId: currentCheckpoint?.id
    });

    return testRunner.current.rejectCheckpoint(feedback);
  }, [currentCheckpoint]);

  // Resolve blockers
  const resolveBlockers = useCallback(async () => {
    return testRunner.current.resolveBlockers();
  }, []);

  // Restart session
  const restartSession = useCallback(async (resetData = false) => {
    feedbackCollector.current.clear();
    return testRunner.current.restartSession(resetData);
  }, []);

  // Save progress
  const saveProgress = useCallback(async (notes = '') => {
    const savePoint = await testRunner.current.saveSession(notes);
    sessionManager.current.saveProgress(notes);
    return savePoint;
  }, []);

  // Get detected fields from current page
  const getPageFields = useCallback(() => {
    const elements = document.querySelectorAll('input, select, textarea, button, [role="button"]');
    return checkpointManager.current.detectPageFields(Array.from(elements));
  }, []);

  // Get feedback form structure
  const getFeedbackFormStructure = useCallback(() => {
    const fields = getPageFields();
    return feedbackCollector.current.getFormStructure(fields);
  }, [getPageFields]);

  // Check if quick mode is eligible
  const isQuickModeEligible = useCallback((description) => {
    return preFlightManager.current.isQuickModeEligible(description);
  }, []);

  // Get all sessions
  const getAllSessions = useCallback(() => {
    return sessionManager.current.getAllSessions();
  }, []);

  // Load existing session
  const loadSession = useCallback((sessionId) => {
    const session = sessionManager.current.loadSession(sessionId);
    if (session) {
      setSession(session);
      setStatus(session.status);
      setIsActive(true);
    }
    return session;
  }, []);

  // Get resume summary
  const getResumeSummary = useCallback((sessionId) => {
    return sessionManager.current.generateResumeSummary(sessionId);
  }, []);

  // Prepare handoff
  const prepareHandoff = useCallback((notes = '') => {
    if (!session) return null;
    return sessionManager.current.prepareHandoff(session.id, notes);
  }, [session]);

  // End session
  const endSession = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    setSession(null);
    setCurrentCheckpoint(null);
    setProgress({ current: 0, total: 0, percentage: 0 });
    setBlockers([]);
    setFeedback([]);
    setPreFlight(null);
  }, []);

  return {
    // State
    isActive,
    status,
    currentCheckpoint,
    progress,
    blockers,
    feedback,
    session,
    preFlight,

    // Actions
    startSession,
    startPreFlight,
    answerPreFlightQuestion,
    completePreFlight,
    approveCheckpoint,
    rejectCheckpoint,
    resolveBlockers,
    restartSession,
    saveProgress,
    endSession,

    // Utilities
    getPageFields,
    getFeedbackFormStructure,
    isQuickModeEligible,
    getAllSessions,
    loadSession,
    getResumeSummary,
    prepareHandoff,

    // Managers (for advanced usage)
    managers: {
      testRunner: testRunner.current,
      checkpointManager: checkpointManager.current,
      feedbackCollector: feedbackCollector.current,
      preFlightManager: preFlightManager.current,
      screenshotCapture: screenshotCapture.current,
      sessionManager: sessionManager.current
    }
  };
};

export default useTestingFramework;
