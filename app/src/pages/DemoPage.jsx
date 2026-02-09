/**
 * DemoPage - Demonstrates TF workflow for stakeholders
 *
 * Shows a simulated testing flow without requiring a real target app.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Demo spec with sample checkpoints
const DEMO_SPEC = {
  id: 'demo-auth',
  name: 'Authentication Demo',
  checkpoints: [
    {
      id: 'DEMO-001',
      action: 'Login Page Display',
      description: 'Verify the login page displays correctly with all required elements.',
      steps: [
        'Navigate to the application root URL',
        'Wait for the page to fully load',
        'Observe the login form elements'
      ],
      expectedResult: 'Email input, password input, and submit button are all visible and properly styled.'
    },
    {
      id: 'DEMO-002',
      action: 'Valid Login Credentials',
      description: 'Test that valid credentials allow successful login.',
      steps: [
        'Enter a valid email address',
        'Enter the correct password',
        'Click the Submit button'
      ],
      expectedResult: 'User is redirected to the dashboard. Welcome message is displayed.'
    },
    {
      id: 'DEMO-003',
      action: 'Invalid Login Handling',
      description: 'Verify that invalid credentials show appropriate error.',
      steps: [
        'Enter an incorrect email or password',
        'Click the Submit button',
        'Observe the error message'
      ],
      expectedResult: 'Error message is displayed. User remains on login page. No sensitive information is revealed.'
    },
    {
      id: 'DEMO-004',
      action: 'Session Persistence',
      description: 'Confirm that user session persists across page refresh.',
      steps: [
        'Login with valid credentials',
        'Refresh the browser page',
        'Check the user state'
      ],
      expectedResult: 'User remains logged in after refresh. Dashboard is still accessible.'
    }
  ]
};

const DemoPage = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentCheckpoint = DEMO_SPEC.checkpoints[currentIndex];
  const progress = Math.round((currentIndex / DEMO_SPEC.checkpoints.length) * 100);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && !showFeedback && !completed) {
      const timer = setTimeout(() => {
        handleDemoPass();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, currentIndex, showFeedback, completed]);

  const handleDemoPass = () => {
    setResults(prev => [...prev, {
      checkpoint: currentCheckpoint,
      status: 'passed',
      timestamp: new Date().toISOString()
    }]);

    if (currentIndex < DEMO_SPEC.checkpoints.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCompleted(true);
      setAutoPlay(false);
    }
  };

  const handleDemoFail = () => {
    setShowFeedback(true);
    setAutoPlay(false);
  };

  const submitDemoFeedback = () => {
    setResults(prev => [...prev, {
      checkpoint: currentCheckpoint,
      status: 'failed',
      feedback: {
        description: 'Sample feedback: Element not displaying correctly',
        priority: 'blocker'
      },
      timestamp: new Date().toISOString()
    }]);
    setShowFeedback(false);
  };

  const resetDemo = () => {
    setCurrentIndex(0);
    setResults([]);
    setShowFeedback(false);
    setCompleted(false);
    setAutoPlay(false);
  };

  if (completed) {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return (
      <div style={styles.container}>
        <div style={styles.completedCard}>
          <h2 style={styles.completedTitle}>Demo Complete!</h2>
          <p style={styles.completedSubtitle}>
            This demonstrates how TF validates application features
          </p>

          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{DEMO_SPEC.checkpoints.length}</span>
              <span style={styles.statLabel}>Checkpoints</span>
            </div>
            <div style={{ ...styles.statBox, backgroundColor: '#dcfce7' }}>
              <span style={{ ...styles.statNumber, color: '#16a34a' }}>{passed}</span>
              <span style={styles.statLabel}>Passed</span>
            </div>
            <div style={{ ...styles.statBox, backgroundColor: '#fef2f2' }}>
              <span style={{ ...styles.statNumber, color: '#dc2626' }}>{failed}</span>
              <span style={styles.statLabel}>Failed</span>
            </div>
          </div>

          <div style={styles.featuresList}>
            <h3 style={styles.featuresTitle}>TF Features Demonstrated:</h3>
            <ul style={styles.features}>
              <li>Checkpoint-based testing workflow</li>
              <li>Step-by-step instructions for testers</li>
              <li>Expected result validation</li>
              <li>Pass/Fail recording with feedback</li>
              <li>Progress tracking</li>
              <li>Session summary and reporting</li>
            </ul>
          </div>

          <div style={styles.buttonRow}>
            <button onClick={resetDemo} style={styles.secondaryButton}>
              Restart Demo
            </button>
            <button onClick={() => navigate('/')} style={styles.primaryButton}>
              Try Real Testing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Demo Header */}
      <div style={styles.demoHeader}>
        <div style={styles.demoBadge}>DEMO MODE</div>
        <p style={styles.demoHint}>
          This is a demonstration of TF's testing workflow. No real application is being tested.
        </p>
      </div>

      {/* Simulated Target App */}
      <div style={styles.mockApp}>
        <div style={styles.mockBrowser}>
          <div style={styles.mockBrowserBar}>
            <div style={styles.mockDots}>
              <span style={{ ...styles.mockDot, backgroundColor: '#ef4444' }} />
              <span style={{ ...styles.mockDot, backgroundColor: '#f59e0b' }} />
              <span style={{ ...styles.mockDot, backgroundColor: '#22c55e' }} />
            </div>
            <div style={styles.mockUrl}>https://demo-app.example.com</div>
          </div>
          <div style={styles.mockContent}>
            <div style={styles.mockLogin}>
              <h2 style={styles.mockTitle}>Demo Application</h2>
              <div style={styles.mockField}>
                <label>Email</label>
                <input type="text" placeholder="user@example.com" style={styles.mockInput} readOnly />
              </div>
              <div style={styles.mockField}>
                <label>Password</label>
                <input type="password" placeholder="••••••••" style={styles.mockInput} readOnly />
              </div>
              <button style={styles.mockButton}>Sign In</button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        {/* Progress */}
        <div style={styles.progressRow}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressText}>
            {currentIndex + 1} of {DEMO_SPEC.checkpoints.length}
          </span>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            style={autoPlay ? styles.autoPlayActive : styles.autoPlayButton}
          >
            {autoPlay ? 'Pause' : 'Auto-Play'}
          </button>
        </div>

        {/* Checkpoint Card */}
        {!showFeedback && currentCheckpoint && (
          <div style={styles.checkpointCard}>
            <div style={styles.checkpointHeader}>
              <span style={styles.checkpointId}>{currentCheckpoint.id}</span>
              <span style={styles.checkpointTitle}>{currentCheckpoint.action}</span>
            </div>

            <p style={styles.description}>{currentCheckpoint.description}</p>

            <div style={styles.stepsBox}>
              <strong>Steps:</strong>
              <ol style={styles.stepsList}>
                {currentCheckpoint.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div style={styles.expectedBox}>
              <strong>Expected:</strong>
              <p>{currentCheckpoint.expectedResult}</p>
            </div>

            <div style={styles.buttonRow}>
              <button onClick={handleDemoPass} style={styles.yesButton}>
                YES - Pass
              </button>
              <button onClick={handleDemoFail} style={styles.noButton}>
                NO - Fail
              </button>
            </div>
          </div>
        )}

        {/* Demo Feedback Form */}
        {showFeedback && (
          <div style={styles.feedbackCard}>
            <h3 style={styles.feedbackTitle}>Report Issue (Demo)</h3>
            <p style={styles.feedbackHint}>
              In real testing, you would describe the issue found here.
              TF can automatically create GitHub issues for blockers.
            </p>
            <div style={styles.buttonRow}>
              <button onClick={() => setShowFeedback(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={submitDemoFeedback} style={styles.submitButton}>
                Submit Demo Feedback
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exit Demo */}
      <button onClick={() => navigate('/')} style={styles.exitButton}>
        Exit Demo
      </button>
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f3f4f6',
    position: 'relative'
  },
  demoHeader: {
    backgroundColor: '#7c3aed',
    color: 'white',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  demoBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  demoHint: {
    margin: 0,
    fontSize: '13px',
    opacity: 0.9
  },
  mockApp: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mockBrowser: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    overflow: 'hidden'
  },
  mockBrowserBar: {
    backgroundColor: '#e5e7eb',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  mockDots: {
    display: 'flex',
    gap: '6px'
  },
  mockDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  mockUrl: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#6b7280'
  },
  mockContent: {
    padding: '40px',
    display: 'flex',
    justifyContent: 'center'
  },
  mockLogin: {
    width: '100%',
    maxWidth: '280px'
  },
  mockTitle: {
    textAlign: 'center',
    marginBottom: '24px',
    color: '#1f2937'
  },
  mockField: {
    marginBottom: '16px'
  },
  mockInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginTop: '4px',
    boxSizing: 'border-box'
  },
  mockButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'default'
  },
  controlPanel: {
    backgroundColor: '#fff',
    borderTop: '2px solid #e5e7eb',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
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
    backgroundColor: '#7c3aed',
    transition: 'width 0.3s'
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280'
  },
  autoPlayButton: {
    padding: '6px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  autoPlayActive: {
    padding: '6px 16px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
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
    marginBottom: '12px'
  },
  checkpointId: {
    backgroundColor: '#7c3aed',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace'
  },
  checkpointTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  description: {
    color: '#4b5563',
    marginBottom: '12px'
  },
  stepsBox: {
    marginBottom: '12px'
  },
  stepsList: {
    margin: '8px 0 0 20px',
    color: '#4b5563'
  },
  expectedBox: {
    backgroundColor: '#dcfce7',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px'
  },
  yesButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  noButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  feedbackCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    border: '1px solid #e5e7eb'
  },
  feedbackTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  feedbackHint: {
    color: '#6b7280',
    marginBottom: '16px'
  },
  cancelButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  exitButton: {
    position: 'absolute',
    top: '60px',
    right: '24px',
    padding: '6px 16px',
    backgroundColor: 'rgba(0,0,0,0.1)',
    color: '#374151',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  completedCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '500px',
    margin: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  completedTitle: {
    margin: '0 0 8px 0',
    color: '#7c3aed'
  },
  completedSubtitle: {
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
  featuresList: {
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px 24px',
    marginBottom: '24px'
  },
  featuresTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#374151'
  },
  features: {
    margin: 0,
    paddingLeft: '20px',
    color: '#4b5563',
    lineHeight: '1.8'
  },
  secondaryButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  primaryButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '500',
    cursor: 'pointer'
  }
};

export default DemoPage;
