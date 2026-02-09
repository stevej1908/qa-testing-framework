import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useTFContext } from '../App';
import { loadSpec } from '../utils/SpecLoader';
import {
  startSession,
  recordCheckpointResult,
  pauseSession,
  resumeSession,
  completeSession as completeSessionStorage
} from '../storage/SessionPersistence';
import {
  downloadHTMLDoc,
  downloadMarkdownDoc,
  downloadJSONDoc
} from '../integrations/DocumentationGenerator';
import { saveScreenshot } from '../storage/TestArtifactStore';
import playwrightClient, { getStepsForCheckpoint, hasAutomation } from '../services/PlaywrightClient';

const TestingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { config, updateConfig, createBlockerIssue } = useTFContext();
  const [checkpoints, setCheckpoints] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({
    field: '',
    description: '',
    expected: '',
    workaround: '',
    priority: 'blocker'
  });
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issueResult, setIssueResult] = useState(null);

  // Session persistence state
  const [sessionId, setSessionId] = useState(null);
  const [isPausing, setIsPausing] = useState(false);
  const sessionInitialized = useRef(false);

  // Screenshot state
  const targetSectionRef = useRef(null);
  const [currentScreenshot, setCurrentScreenshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef(null);

  // Playwright automation state
  const [playwrightStatus, setPlaywrightStatus] = useState({ connected: false });
  const [isRunningStep, setIsRunningStep] = useState(false);
  const [stepResult, setStepResult] = useState(null);
  const [stepScreenshots, setStepScreenshots] = useState([]); // All screenshots from sequence
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0); // Gallery navigation

  // Redirect if no config
  useEffect(() => {
    if (!config.targetUrl || !config.selectedSpec) {
      navigate('/');
    }
  }, [config, navigate]);

  // Load spec checkpoints and initialize/resume session
  useEffect(() => {
    const loadCheckpoints = async () => {
      if (config.selectedSpec && !sessionInitialized.current) {
        sessionInitialized.current = true;
        setLoading(true);

        const spec = await loadSpec(config.selectedSpec.id);
        const loadedCheckpoints = spec.checkpoints || [];
        setCheckpoints(loadedCheckpoints);

        // Check if resuming an existing session
        const resumeId = searchParams.get('resume');
        if (resumeId) {
          try {
            const resumed = await resumeSession(resumeId);
            setSessionId(resumeId);
            setCurrentIndex(resumed.resumeFromIndex);
            // Convert stored results to component format
            const convertedResults = resumed.results.map(r => ({
              checkpoint: loadedCheckpoints.find(cp => cp.id === r.checkpointId) || { id: r.checkpointId },
              status: r.status,
              feedback: r.feedback,
              githubIssue: r.githubIssue,
              timestamp: r.timestamp
            }));
            setResults(convertedResults);
          } catch (err) {
            console.error('Failed to resume session:', err);
            // Start fresh if resume fails
            await initNewSession(loadedCheckpoints);
          }
        } else {
          // Start a new session
          await initNewSession(loadedCheckpoints);
        }

        setLoading(false);
      }
    };

    const initNewSession = async (loadedCheckpoints) => {
      try {
        const session = await startSession({
          specId: config.selectedSpec.id,
          specName: config.selectedSpec.name,
          targetUrl: config.targetUrl,
          totalCheckpoints: loadedCheckpoints.length
        });
        setSessionId(session.id);
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    };

    loadCheckpoints();
  }, [config.selectedSpec, config.targetUrl, searchParams]);

  // Check Playwright service status periodically
  useEffect(() => {
    const checkPlaywright = async () => {
      const status = await playwrightClient.checkStatus();
      setPlaywrightStatus(status);
    };

    checkPlaywright();
    const interval = setInterval(checkPlaywright, 5000);
    return () => clearInterval(interval);
  }, []);

  // Define currentCheckpoint early so it can be used in callbacks
  const currentCheckpoint = checkpoints[currentIndex];

  // Handle running automation step
  const handleRunStep = useCallback(async () => {
    if (!currentCheckpoint) return;

    setIsRunningStep(true);
    setStepResult(null);

    // Get the steps for this checkpoint
    const steps = getStepsForCheckpoint(currentCheckpoint.id);

    if (!steps) {
      // No automation available - try to find matching steps by checkpoint pattern
      // This is a fallback for checkpoints not explicitly mapped
      setStepResult({
        success: false,
        error: `No automation defined for checkpoint: ${currentCheckpoint.id}`
      });
      setIsRunningStep(false);
      return;
    }

    // Execute the sequence of steps with the target URL from config
    // Pass workaround credentials if active (from compliance workaround)
    const result = await playwrightClient.executeSequence(steps, config.targetUrl, {
      credentialOverride: config.workaroundCredentials || null
    });

    console.log('[TF] Playwright result:', result);

    // Collect screenshots from results regardless of success/failure
    // This ensures screenshots are shown even when there are errors
    const resultsArray = result.results || [];
    const screenshots = resultsArray
      .filter(r => r.screenshot)
      .map(r => ({
        stepId: r.stepId,
        screenshot: `data:image/png;base64,${r.screenshot}`,
        success: r.success,
        message: r.message || r.stepId
      }));

    console.log('[TF] Screenshots collected:', screenshots.length);

    // Always set screenshots if we have any
    if (screenshots.length > 0) {
      setStepScreenshots(screenshots);
      setCurrentScreenshotIndex(screenshots.length - 1);
      setCurrentScreenshot(screenshots[screenshots.length - 1].screenshot);
    }

    if (result.error) {
      setStepResult({ success: false, error: result.error });
      setIsRunningStep(false);
      return;
    }

    const allPassed = resultsArray.every(r => r.success);
    const lastResult = resultsArray[resultsArray.length - 1];

    setStepResult({
      success: allPassed,
      message: allPassed
        ? 'All steps completed successfully'
        : `Failed at step: ${lastResult?.stepId}`,
      details: resultsArray
    });

    // Auto-record passed tests
    if (allPassed) {
      // Use the last screenshot from the automation
      const lastScreenshot = lastResult?.screenshot
        ? `data:image/png;base64,${lastResult.screenshot}`
        : null;

      // Save screenshot to storage
      if (lastScreenshot && sessionId) {
        try {
          await saveScreenshot({
            sessionId,
            checkpointId: currentCheckpoint.id,
            dataUrl: lastScreenshot,
            label: `${currentCheckpoint.id}: ${currentCheckpoint.action}`
          });
        } catch (err) {
          console.error('Failed to save screenshot:', err);
        }
      }

      // Record pass
      const passResult = {
        checkpoint: currentCheckpoint,
        status: 'passed',
        screenshot: lastScreenshot,
        timestamp: new Date().toISOString(),
        automated: true
      };
      setResults(prev => [...prev, passResult]);

      // Persist to storage
      if (sessionId) {
        try {
          await recordCheckpointResult(sessionId, currentCheckpoint, 'passed');
        } catch (err) {
          console.error('Failed to record result:', err);
        }
      }

      // Move to next checkpoint or complete
      // Keep screenshots visible - they'll be replaced when next automation runs
      setIsRunningStep(false);
      if (currentIndex < checkpoints.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setStepResult(null);
        // Don't clear screenshots - keep last result visible
      } else {
        // Last checkpoint - complete session
        if (sessionId) {
          try {
            await completeSessionStorage(sessionId);
          } catch (err) {
            console.error('Failed to complete session:', err);
          }
        }
        setCompleted(true);
      }
      return;
    }

    setIsRunningStep(false);
  }, [currentCheckpoint, sessionId, currentIndex, checkpoints.length, config.targetUrl, config.workaroundCredentials]);

  const progress = checkpoints.length > 0
    ? Math.round((currentIndex / checkpoints.length) * 100)
    : 0;

  // Capture screenshot of the target section
  const captureScreenshot = useCallback(async () => {
    if (!targetSectionRef.current) return null;

    setIsCapturing(true);
    try {
      const canvas = await html2canvas(targetSectionRef.current, {
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const dataUrl = canvas.toDataURL('image/png');
      setCurrentScreenshot(dataUrl);
      setIsCapturing(false);
      return dataUrl;
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setIsCapturing(false);
      return null;
    }
  }, []);

  // Handle file upload for manual screenshot
  const handleScreenshotUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCurrentScreenshot(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Clear the current screenshot
  const clearScreenshot = useCallback(() => {
    setCurrentScreenshot(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleYes = async () => {
    // Capture screenshot if not already captured
    let screenshotData = currentScreenshot;
    if (!screenshotData) {
      screenshotData = await captureScreenshot();
    }

    // Save screenshot to storage
    if (sessionId && screenshotData) {
      try {
        await saveScreenshot({
          sessionId,
          checkpointId: currentCheckpoint.id,
          dataUrl: screenshotData,
          label: `${currentCheckpoint.id} - ${currentCheckpoint.action}`
        });
      } catch (err) {
        console.error('Failed to save screenshot:', err);
      }
    }

    // Record pass
    const result = {
      checkpoint: currentCheckpoint,
      status: 'passed',
      screenshot: screenshotData,
      timestamp: new Date().toISOString()
    };
    setResults(prev => [...prev, result]);

    // Persist to storage
    if (sessionId) {
      try {
        await recordCheckpointResult(sessionId, currentCheckpoint, 'passed');
      } catch (err) {
        console.error('Failed to record result:', err);
      }
    }

    // Clear screenshot and move to next
    clearScreenshot();
    if (currentIndex < checkpoints.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      await handleComplete();
    }
  };

  // Complete session
  const handleComplete = async () => {
    if (sessionId) {
      try {
        await completeSessionStorage(sessionId);
      } catch (err) {
        console.error('Failed to complete session:', err);
      }
    }
    setCompleted(true);
  };

  const handleNo = () => {
    // Auto-fill feedback from Playwright results if available
    if (stepResult && !stepResult.success) {
      const failedStep = Array.isArray(stepResult.details)
        ? stepResult.details.find(d => !d.success)
        : null;
      setFeedback(prev => ({
        ...prev,
        field: failedStep?.stepId || 'Automation step',
        description: `Playwright automation failed at step: ${failedStep?.stepId || 'unknown'}\n\nError: ${failedStep?.error || stepResult.error || 'Unknown error'}\n\nExpected: ${currentCheckpoint?.expectedResult || 'See checkpoint description'}`,
        expected: currentCheckpoint?.expectedResult || '',
        priority: 'blocker'
      }));
    }
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    const feedbackData = { ...feedback };

    // Capture screenshot if not already captured
    let screenshotData = currentScreenshot;
    if (!screenshotData) {
      screenshotData = await captureScreenshot();
    }

    // Save screenshot to storage
    if (sessionId && screenshotData) {
      try {
        await saveScreenshot({
          sessionId,
          checkpointId: currentCheckpoint.id,
          dataUrl: screenshotData,
          label: `${currentCheckpoint.id} - FAILED - ${currentCheckpoint.action}`
        });
      } catch (err) {
        console.error('Failed to save screenshot:', err);
      }
    }

    // Create GitHub issue if connected (for both blockers and nice-to-have)
    let githubIssue = null;
    if (config.github?.connected) {
      setCreatingIssue(true);
      const issueData = {
        severity: feedback.priority,
        description: feedback.description,
        stepsToReproduce: `Field/Element: ${feedback.field}`,
        expectedResult: feedback.expected || null,
        workaround: feedback.workaround || null
      };

      // Pass all step screenshots if available, otherwise just the current one
      const screenshotsToSend = stepScreenshots.length > 0
        ? stepScreenshots
        : (screenshotData ? [{ stepId: 'manual', screenshot: screenshotData }] : []);

      const result = await createBlockerIssue(issueData, currentCheckpoint, screenshotsToSend);

      if (result.success) {
        githubIssue = result.issue;
        setIssueResult({ success: true, issue: result.issue });
      } else {
        setIssueResult({ success: false, error: result.error });
      }
      setCreatingIssue(false);
    }

    // Record failure with feedback
    const githubIssueData = githubIssue ? {
      number: githubIssue.number,
      url: githubIssue.html_url
    } : null;

    setResults(prev => [...prev, {
      checkpoint: currentCheckpoint,
      status: 'failed',
      feedback: feedbackData,
      screenshot: screenshotData,
      githubIssue: githubIssueData,
      timestamp: new Date().toISOString()
    }]);

    // Persist to storage
    if (sessionId) {
      try {
        await recordCheckpointResult(
          sessionId,
          currentCheckpoint,
          'failed',
          feedbackData,
          githubIssueData
        );
      } catch (err) {
        console.error('Failed to record result:', err);
      }
    }

    // Reset feedback form
    setFeedback({
      field: '',
      description: '',
      expected: '',
      workaround: '',
      priority: 'blocker'
    });
    setShowFeedback(false);
    clearScreenshot();

    // Clear issue result after a delay
    if (githubIssue) {
      setTimeout(() => setIssueResult(null), 5000);
    }

    // If blocker, stay on this checkpoint
    // If nice-to-have, move to next
    if (feedbackData.priority === 'nice-to-have') {
      if (currentIndex < checkpoints.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        await handleComplete();
      }
    }
  };

  const handleResolveBlocker = async () => {
    // Clear step result to re-test the same checkpoint
    setStepResult(null);
    setStepScreenshots([]);
    clearScreenshot();
    // Stay on current checkpoint for re-testing
  };

  const handleSkipBlocker = async () => {
    // Skip this checkpoint and move to next
    setStepResult(null);
    setStepScreenshots([]);
    clearScreenshot();

    if (currentIndex < checkpoints.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      await handleComplete();
    }
  };

  const handleFixWithClaude = async () => {
    // Get the blocker details from the last result (with safety checks)
    const blockerFeedback = lastResult?.feedback || {};
    const checkpoint = currentCheckpoint || {};

    // Safely format arrays
    const codeRefs = Array.isArray(checkpoint.codeReferences)
      ? checkpoint.codeReferences.map(ref => `- \`${ref}\``).join('\n')
      : 'None specified';
    const steps = Array.isArray(checkpoint.steps)
      ? checkpoint.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
      : 'See checkpoint steps';

    // Build a Claude prompt with the blocker context
    const claudePrompt = `## Testing Framework Blocker - Fix Request

**Feature:** ${config.selectedSpec?.name || 'Unknown'}
**Checkpoint:** ${checkpoint.id || 'Unknown'} - ${checkpoint.title || checkpoint.description || 'No description'}
**Target URL:** ${config.targetUrl || 'Not specified'}

### Issue Description
${blockerFeedback.notes || 'No description provided'}

### Expected Behavior
${checkpoint.expected || 'See checkpoint description'}

### Code References
${codeRefs}

### Steps to Reproduce
${steps}

---
Please help fix this blocker. Check the code references above and identify what might be causing the issue.`;

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(claudePrompt);
      alert('Blocker details copied to clipboard!\n\nPaste this into Claude Code or Claude.ai to get help fixing the issue.');
    } catch (err) {
      // Fallback: show in console
      console.log('=== COPY THIS TO CLAUDE ===\n', claudePrompt);
      alert('Could not copy to clipboard. Check the browser console for the prompt to copy manually.');
    }
  };

  // Pause session for later resumption
  const handlePauseSession = async () => {
    if (!sessionId) return;

    setIsPausing(true);
    try {
      await pauseSession(sessionId, currentIndex);
      navigate('/?paused=true');
    } catch (err) {
      console.error('Failed to pause session:', err);
      setIsPausing(false);
    }
  };

  const handleEndSession = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading checkpoints...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <SummaryView
        results={results}
        spec={config.selectedSpec}
        onClose={handleEndSession}
        githubIssues={config.github?.issues || []}
        sessionId={sessionId}
      />
    );
  }

  const lastResult = results[results.length - 1];
  // Only show blocked state if the blocker is for the CURRENT checkpoint
  const isBlocked = lastResult?.status === 'failed'
    && lastResult?.feedback?.priority === 'blocker'
    && lastResult?.checkpoint?.id === currentCheckpoint?.id;

  return (
    <div style={styles.container}>
      {/* Target App Frame or Playwright Screenshot Gallery */}
      <div ref={targetSectionRef} style={styles.targetSection}>
        {stepScreenshots.length > 0 ? (
          <div style={styles.playwrightScreenshot}>
            <div style={styles.screenshotBadge}>
              <span>Step {currentScreenshotIndex + 1} of {stepScreenshots.length}: {stepScreenshots[currentScreenshotIndex]?.stepId}</span>
              <div style={styles.galleryNav}>
                <button
                  onClick={() => setCurrentScreenshotIndex(i => Math.max(0, i - 1))}
                  style={styles.navButton}
                  disabled={currentScreenshotIndex === 0}
                  title="Previous step"
                >
                  ◀
                </button>
                <button
                  onClick={() => setCurrentScreenshotIndex(i => Math.min(stepScreenshots.length - 1, i + 1))}
                  style={styles.navButton}
                  disabled={currentScreenshotIndex === stepScreenshots.length - 1}
                  title="Next step"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => { setStepScreenshots([]); setCurrentScreenshot(null); }}
                style={styles.showLiveButton}
                title="Show live app"
              >
                Show Live
              </button>
            </div>
            <img
              src={stepScreenshots[currentScreenshotIndex]?.screenshot}
              alt={`Step: ${stepScreenshots[currentScreenshotIndex]?.stepId}`}
              style={styles.screenshotImage}
            />
            {/* Step indicator dots */}
            <div style={styles.stepDots}>
              {stepScreenshots.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentScreenshotIndex(idx)}
                  style={{
                    ...styles.stepDot,
                    backgroundColor: idx === currentScreenshotIndex ? '#a855f7' : 'rgba(255,255,255,0.5)'
                  }}
                  title={s.stepId}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.noScreenshot}>
            <div style={styles.noScreenshotContent}>
              <div style={styles.playwrightIcon}>🎭</div>
              <h3 style={styles.noScreenshotTitle}>Playwright Automation</h3>
              <p style={styles.noScreenshotText}>
                Click <strong>"Run Step"</strong> to execute the checkpoint.<br/>
                Screenshots will appear here as each step completes.
              </p>
              {config.targetUrl && (
                <a
                  href={config.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.openAppLink}
                >
                  Open {config.targetUrl} in new tab ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        {/* Status Bar */}
        <div style={styles.statusBar}>
          {/* Progress Bar */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <span style={styles.progressText}>
              {currentIndex + 1} of {checkpoints.length} ({progress}%)
            </span>
          </div>

          {/* GitHub Status */}
          {config.github?.connected && (
            <div style={styles.githubStatus}>
              <span style={styles.githubDot} />
              GitHub Connected
              {config.github.issues.length > 0 && (
                <span style={styles.issueCount}>
                  {config.github.issues.length} issue{config.github.issues.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* Workaround Active Indicator */}
          {config.workaroundActive && (
            <div style={styles.workaroundIndicator}>
              <span style={styles.workaroundDot} />
              Workaround Active
              <span style={styles.workaroundHint}>
                (Using {config.workaroundCredentials} credentials)
              </span>
            </div>
          )}

          {/* Pause Button */}
          <button
            onClick={handlePauseSession}
            style={styles.pauseButton}
            disabled={isPausing}
            title="Pause and resume later"
          >
            {isPausing ? 'Pausing...' : 'Pause'}
          </button>
        </div>

        {/* Issue Creation Result */}
        {issueResult && (
          <div style={issueResult.success ? styles.issueSuccess : styles.issueError}>
            {issueResult.success ? (
              <>
                GitHub issue created:{' '}
                <a
                  href={issueResult.issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.issueLink}
                >
                  #{issueResult.issue.number}
                </a>
              </>
            ) : (
              <>Failed to create issue: {issueResult.error}</>
            )}
          </div>
        )}

        {/* Screenshot Section */}
        <div style={styles.screenshotSection}>
          <div style={styles.screenshotControls}>
            <span style={styles.screenshotLabel}>Screenshot:</span>
            <button
              onClick={captureScreenshot}
              style={styles.captureButton}
              disabled={isCapturing}
            >
              {isCapturing ? 'Capturing...' : 'Capture'}
            </button>
            <span style={styles.orText}>or</span>
            <label style={styles.uploadLabel}>
              Upload
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshotUpload}
                style={styles.fileInput}
              />
            </label>
            {currentScreenshot && (
              <button onClick={clearScreenshot} style={styles.clearButton}>
                Clear
              </button>
            )}
          </div>
          {currentScreenshot && (
            <div style={styles.screenshotPreview}>
              <img
                src={currentScreenshot}
                alt="Screenshot preview"
                style={styles.previewImage}
              />
              <span style={styles.previewCheck}>Screenshot ready</span>
            </div>
          )}
        </div>

        {/* Checkpoint Display */}
        {currentCheckpoint && !showFeedback && (
          <div style={styles.checkpointCard}>
            <div style={styles.checkpointHeader}>
              <span style={styles.checkpointId}>{currentCheckpoint.id}</span>
              <span style={styles.checkpointTitle}>{currentCheckpoint.action}</span>
            </div>

            {currentCheckpoint.steps && currentCheckpoint.steps.length > 0 && (
              <div style={styles.stepsSection}>
                <strong>Steps:</strong>
                <ol style={styles.stepsList}>
                  {currentCheckpoint.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div style={styles.expectedSection}>
              <strong>Expected Result:</strong>
              <p style={styles.expectedText}>{currentCheckpoint.expectedResult}</p>
            </div>

            {/* Playwright Status & Step Result */}
            {playwrightStatus.connected && (
              <div style={styles.playwrightStatus}>
                <span style={styles.playwrightDot} />
                Playwright Connected
                {hasAutomation(currentCheckpoint?.id) && (
                  <span style={styles.automationBadge}>Automation Available</span>
                )}
              </div>
            )}

            {stepResult && (
              <div style={stepResult.success ? styles.stepSuccess : styles.stepError}>
                {stepResult.success ? '✓ ' : '✗ '}
                {stepResult.message || stepResult.error}
              </div>
            )}

            {isBlocked ? (
              <div style={styles.blockerNotice}>
                <p>Blocker issue logged. You can re-test after fixing, or skip to continue testing.</p>
                <div style={styles.blockerButtons}>
                  <button onClick={handleResolveBlocker} style={styles.resolveButton}>
                    Re-test Checkpoint
                  </button>
                  <button onClick={handleSkipBlocker} style={styles.skipButton}>
                    Skip & Continue
                  </button>
                  <button onClick={handleFixWithClaude} style={styles.fixWithClaudeButton}>
                    Fix with Claude
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.buttonRow}>
                {playwrightStatus.connected && hasAutomation(currentCheckpoint?.id) && (
                  <button
                    onClick={handleRunStep}
                    style={styles.runButton}
                    disabled={isRunningStep}
                  >
                    {isRunningStep ? '▶ Running...' : '▶ RUN'}
                  </button>
                )}
                <button onClick={handleYes} style={styles.yesButton}>
                  YES - Approved
                </button>
                <button onClick={handleNo} style={styles.noButton}>
                  NO - Issue Found
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback Form */}
        {showFeedback && (
          <div style={styles.feedbackCard}>
            <h3 style={styles.feedbackTitle}>Report Issue</h3>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>What element/field has the issue?</label>
              <input
                type="text"
                value={feedback.field}
                onChange={(e) => setFeedback(prev => ({ ...prev, field: e.target.value }))}
                placeholder="e.g., Submit button, Email field"
                style={styles.formInput}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>What's wrong?</label>
              <textarea
                value={feedback.description}
                onChange={(e) => setFeedback(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the issue..."
                style={styles.formTextarea}
                rows={3}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>What should happen instead?</label>
              <textarea
                value={feedback.expected}
                onChange={(e) => setFeedback(prev => ({ ...prev, expected: e.target.value }))}
                placeholder="Describe expected behavior..."
                style={styles.formTextarea}
                rows={2}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Workaround (optional)</label>
              <textarea
                value={feedback.workaround || ''}
                onChange={(e) => setFeedback(prev => ({ ...prev, workaround: e.target.value }))}
                placeholder="Is there a way to work around this issue?"
                style={styles.formTextarea}
                rows={2}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Priority</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="priority"
                    value="blocker"
                    checked={feedback.priority === 'blocker'}
                    onChange={(e) => setFeedback(prev => ({ ...prev, priority: e.target.value }))}
                  />
                  <span>Blocker (must fix to continue)</span>
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="priority"
                    value="nice-to-have"
                    checked={feedback.priority === 'nice-to-have'}
                    onChange={(e) => setFeedback(prev => ({ ...prev, priority: e.target.value }))}
                  />
                  <span>Nice-to-have (log and continue)</span>
                </label>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={() => setShowFeedback(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                style={styles.submitButton}
                disabled={!feedback.description || creatingIssue}
              >
                {creatingIssue ? 'Creating Issue...' : (
                  config.github?.connected && feedback.priority === 'blocker'
                    ? 'Submit & Create Issue'
                    : 'Submit Feedback'
                )}
              </button>
            </div>
            {config.github?.connected && feedback.priority === 'blocker' && (
              <p style={styles.githubNote}>
                A GitHub issue will be created automatically
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Summary View Component
const SummaryView = ({ results, spec, onClose, githubIssues = [], sessionId }) => {
  const [exporting, setExporting] = useState(null);

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const blockers = results.filter(r => r.feedback?.priority === 'blocker').length;
  const issuesCreated = results.filter(r => r.githubIssue).length;

  const handleExport = async (format) => {
    if (!sessionId) {
      alert('Session not available for export');
      return;
    }

    setExporting(format);
    try {
      const options = { title: `${spec.name} Training Guide` };
      if (format === 'html') {
        await downloadHTMLDoc(sessionId, options);
      } else if (format === 'markdown') {
        await downloadMarkdownDoc(sessionId, options);
      } else if (format === 'json') {
        await downloadJSONDoc(sessionId, options);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
    setExporting(null);
  };

  return (
    <div style={styles.summaryContainer}>
      <div style={styles.summaryCard}>
        <h2 style={styles.summaryTitle}>Test Session Complete</h2>
        <p style={styles.summarySpec}>{spec.name} ({spec.id})</p>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statNumber}>{results.length}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={{ ...styles.statBox, backgroundColor: '#dcfce7' }}>
            <span style={{ ...styles.statNumber, color: '#16a34a' }}>{passed}</span>
            <span style={styles.statLabel}>Passed</span>
          </div>
          <div style={{ ...styles.statBox, backgroundColor: '#fef2f2' }}>
            <span style={{ ...styles.statNumber, color: '#dc2626' }}>{failed}</span>
            <span style={styles.statLabel}>Failed</span>
          </div>
          <div style={{ ...styles.statBox, backgroundColor: '#fef9c3' }}>
            <span style={{ ...styles.statNumber, color: '#ca8a04' }}>{blockers}</span>
            <span style={styles.statLabel}>Blockers</span>
          </div>
        </div>

        {failed > 0 && (
          <div style={styles.issuesSection}>
            <h3 style={styles.issuesTitle}>Issues Found</h3>
            {results.filter(r => r.status === 'failed').map((result, i) => (
              <div key={i} style={styles.issueItem}>
                <div style={styles.issueHeader}>
                  <span style={styles.issueCheckpoint}>{result.checkpoint.id}</span>
                  <div style={styles.issueHeaderRight}>
                    {result.githubIssue && (
                      <a
                        href={result.githubIssue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.githubIssueBadge}
                      >
                        #{result.githubIssue.number}
                      </a>
                    )}
                    <span style={{
                      ...styles.issuePriority,
                      backgroundColor: result.feedback.priority === 'blocker' ? '#fecaca' : '#fef9c3'
                    }}>
                      {result.feedback.priority}
                    </span>
                  </div>
                </div>
                <p style={styles.issueDesc}>{result.feedback.description}</p>
                {result.feedback.expected && (
                  <p style={styles.issueExpected}>
                    <strong>Expected:</strong> {result.feedback.expected}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {issuesCreated > 0 && (
          <div style={styles.githubSummary}>
            {issuesCreated} GitHub issue{issuesCreated !== 1 ? 's' : ''} created
          </div>
        )}

        {/* Export Section */}
        {sessionId && passed > 0 && (
          <div style={styles.exportSection}>
            <h4 style={styles.exportTitle}>Export Training Documentation</h4>
            <div style={styles.exportButtons}>
              <button
                onClick={() => handleExport('html')}
                style={styles.exportButton}
                disabled={exporting !== null}
              >
                {exporting === 'html' ? 'Exporting...' : 'HTML'}
              </button>
              <button
                onClick={() => handleExport('markdown')}
                style={styles.exportButton}
                disabled={exporting !== null}
              >
                {exporting === 'markdown' ? 'Exporting...' : 'Markdown'}
              </button>
              <button
                onClick={() => handleExport('json')}
                style={styles.exportButton}
                disabled={exporting !== null}
              >
                {exporting === 'json' ? 'Exporting...' : 'JSON'}
              </button>
            </div>
            <p style={styles.exportHint}>
              Generate training guides from passed checkpoints
            </p>
          </div>
        )}

        <button onClick={onClose} style={styles.closeButton}>
          Close Session
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  targetSection: {
    flex: 1,
    minHeight: '50%',
    padding: '16px',
    paddingBottom: '8px'
  },
  playwrightScreenshot: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb'
  },
  screenshotBadge: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  showLiveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  galleryNav: {
    display: 'flex',
    gap: '4px'
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    opacity: 1
  },
  stepDots: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    zIndex: 10
  },
  stepDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.8)',
    cursor: 'pointer',
    padding: 0
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  noScreenshot: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    color: '#e2e8f0'
  },
  noScreenshotContent: {
    textAlign: 'center',
    padding: '40px'
  },
  playwrightIcon: {
    fontSize: '64px',
    marginBottom: '16px'
  },
  noScreenshotTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#f1f5f9'
  },
  noScreenshotText: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6'
  },
  openAppLink: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500'
  },
  controlPanel: {
    height: '40%',
    minHeight: '300px',
    backgroundColor: '#fff',
    borderTop: '2px solid #e5e7eb',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1
  },
  githubStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    padding: '4px 12px',
    borderRadius: '12px'
  },
  githubDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#16a34a',
    borderRadius: '50%'
  },
  issueCount: {
    marginLeft: '4px',
    backgroundColor: '#166534',
    color: 'white',
    padding: '1px 6px',
    borderRadius: '8px',
    fontSize: '10px'
  },
  workaroundIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '4px 12px',
    borderRadius: '12px',
    border: '1px solid #fbbf24'
  },
  workaroundDot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#f59e0b',
    borderRadius: '50%'
  },
  workaroundHint: {
    marginLeft: '4px',
    fontSize: '10px',
    color: '#92400e'
  },
  issueSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px'
  },
  issueError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '14px'
  },
  issueLink: {
    color: '#166534',
    fontWeight: '600',
    textDecoration: 'underline'
  },
  githubNote: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center'
  },
  screenshotSection: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  screenshotControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  screenshotLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151'
  },
  captureButton: {
    padding: '6px 14px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  orText: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  uploadLabel: {
    padding: '6px 14px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  fileInput: {
    display: 'none'
  },
  clearButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  screenshotPreview: {
    marginTop: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  previewImage: {
    width: '120px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  previewCheck: {
    fontSize: '12px',
    color: '#16a34a',
    fontWeight: '500'
  },
  pauseButton: {
    padding: '6px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1e40af',
    transition: 'width 0.3s ease'
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    minWidth: '100px',
    textAlign: 'right'
  },
  checkpointCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  checkpointHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  checkpointId: {
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  checkpointTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  stepsSection: {
    marginBottom: '12px'
  },
  stepsList: {
    margin: '8px 0 0 20px',
    fontSize: '14px',
    color: '#4b5563'
  },
  expectedSection: {
    marginBottom: '16px'
  },
  expectedText: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: '#4b5563'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  yesButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  noButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  runButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  playwrightStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '12px'
  },
  playwrightDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#7c3aed',
    borderRadius: '50%'
  },
  automationBadge: {
    marginLeft: 'auto',
    backgroundColor: '#7c3aed',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '600'
  },
  stepSuccess: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  stepError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '14px'
  },
  blockerNotice: {
    backgroundColor: '#fef2f2',
    padding: '16px',
    borderRadius: '6px',
    textAlign: 'center'
  },
  blockerButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '12px'
  },
  resolveButton: {
    padding: '10px 20px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  skipButton: {
    padding: '10px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  fixWithClaudeButton: {
    padding: '10px 20px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  feedbackCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  feedbackTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  formTextarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical'
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  summaryContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '24px',
    backgroundColor: '#f3f4f6'
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  summaryTitle: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center'
  },
  summarySpec: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '24px'
  },
  statsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px'
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '28px',
    fontWeight: '700'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  issuesSection: {
    marginBottom: '24px'
  },
  issuesTitle: {
    fontSize: '16px',
    marginBottom: '12px'
  },
  issueItem: {
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '8px',
    border: '1px solid #e5e7eb'
  },
  issueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  issueHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  issueCheckpoint: {
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  issuePriority: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  githubIssueBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: '#1f2937',
    color: 'white',
    textDecoration: 'none'
  },
  githubSummary: {
    backgroundColor: '#f0f9ff',
    color: '#0369a1',
    padding: '12px 16px',
    borderRadius: '6px',
    textAlign: 'center',
    fontSize: '14px',
    marginBottom: '16px'
  },
  exportSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #e5e7eb'
  },
  exportTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  exportButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  exportButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  exportHint: {
    margin: 0,
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center'
  },
  issueDesc: {
    margin: '0 0 4px 0',
    fontSize: '14px'
  },
  issueExpected: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280'
  },
  closeButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default TestingPage;
