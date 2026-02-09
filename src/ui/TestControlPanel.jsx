// TestControlPanel - Main control panel for the testing framework
import React, { useState } from 'react';
import { useTestingContext } from './TestingFrameworkProvider';
import CheckpointControls from './CheckpointControls';
import FeedbackForm from './FeedbackForm';
import ProgressIndicator from './ProgressIndicator';
import PreFlightInterview from './PreFlightInterview';

const styles = {
  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600'
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  headerButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  content: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  mainContent: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto'
  },
  sidebar: {
    width: '280px',
    borderLeft: '1px solid #e5e7eb',
    padding: '16px',
    overflowY: 'auto',
    backgroundColor: '#f9fafb'
  },
  blockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  blockedMessage: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center',
    maxWidth: '400px'
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pre-flight': return '#f59e0b';
    case 'testing': return '#10b981';
    case 'blocked': return '#ef4444';
    case 'completed': return '#3b82f6';
    case 'paused': return '#6b7280';
    default: return '#6b7280';
  }
};

export const TestControlPanel = ({ onMinimize }) => {
  const {
    status,
    session,
    currentCheckpoint,
    progress,
    blockers,
    feedback,
    preFlight,
    approveCheckpoint,
    rejectCheckpoint,
    resolveBlockers,
    restartSession,
    saveProgress,
    endSession,
    getFeedbackFormStructure
  } = useTestingContext();

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleApprove = async () => {
    try {
      await approveCheckpoint(approvalNotes || null);
      setApprovalNotes('');
    } catch (error) {
      alert('Error approving checkpoint: ' + error.message);
    }
  };

  const handleReject = () => {
    setShowFeedbackForm(true);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      await rejectCheckpoint(feedbackData);
      setShowFeedbackForm(false);
    } catch (error) {
      alert('Error submitting feedback: ' + error.message);
    }
  };

  const handleSave = async () => {
    try {
      await saveProgress(saveNotes);
      setSaveNotes('');
      setShowSaveDialog(false);
      alert('Progress saved successfully!');
    } catch (error) {
      alert('Error saving progress: ' + error.message);
    }
  };

  const handleRestart = async () => {
    if (window.confirm('Restart testing from the beginning?')) {
      const resetData = window.confirm('Also reset test data?');
      await restartSession(resetData);
    }
  };

  const handleResolveBlockers = async () => {
    if (window.confirm('Have you resolved all blockers?')) {
      await resolveBlockers();
    }
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span>🧪</span>
          <h3 style={styles.title}>
            {session?.featureName || 'Testing Framework'}
          </h3>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: getStatusColor(status)
            }}
          >
            {status.toUpperCase()}
          </span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.headerButton} onClick={() => setShowSaveDialog(true)}>
            💾 Save
          </button>
          <button style={styles.headerButton} onClick={handleRestart}>
            🔄 Restart
          </button>
          <button style={styles.headerButton} onClick={onMinimize}>
            ⬇ Minimize
          </button>
          <button style={styles.headerButton} onClick={endSession}>
            ✕ End
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Main content area */}
        <div style={styles.mainContent}>
          {status === 'pre-flight' && (
            <PreFlightInterview />
          )}

          {status === 'testing' && currentCheckpoint && !showFeedbackForm && (
            <CheckpointControls
              checkpoint={currentCheckpoint}
              onApprove={handleApprove}
              onReject={handleReject}
              approvalNotes={approvalNotes}
              onNotesChange={setApprovalNotes}
            />
          )}

          {showFeedbackForm && (
            <FeedbackForm
              checkpoint={currentCheckpoint}
              formStructure={getFeedbackFormStructure()}
              onSubmit={handleFeedbackSubmit}
              onCancel={() => setShowFeedbackForm(false)}
            />
          )}

          {status === 'blocked' && (
            <div style={styles.blockedMessage}>
              <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>
                ⚠️ Testing Blocked
              </h3>
              <p style={{ marginBottom: '16px' }}>
                {blockers.length} blocker(s) must be resolved before continuing.
              </p>
              <ul style={{ textAlign: 'left', marginBottom: '16px' }}>
                {blockers.map((b, i) => (
                  <li key={i} style={{ marginBottom: '8px' }}>
                    <strong>Checkpoint {b.feedback.checkpointIndex}:</strong>{' '}
                    {b.feedback.issue}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleResolveBlockers}
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Blockers Resolved - Continue Testing
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <h3 style={{ color: '#10b981', marginBottom: '16px' }}>
                ✅ Testing Complete
              </h3>
              <p>All checkpoints have been reviewed.</p>
              {session?.summary && (
                <div style={{ marginTop: '16px', textAlign: 'left', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                  <p><strong>Passed:</strong> {session.summary.passed}</p>
                  <p><strong>Failed:</strong> {session.summary.failed}</p>
                  <p><strong>Blockers:</strong> {session.summary.blockers}</p>
                  <p><strong>Nice-to-have:</strong> {session.summary.niceToHave}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar with progress */}
        <div style={styles.sidebar}>
          <ProgressIndicator
            current={progress.current}
            total={progress.total}
            percentage={progress.percentage}
            feedback={feedback}
          />
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '8px',
            width: '400px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Save Progress</h3>
            <textarea
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              placeholder="Add notes about where you left off..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                marginBottom: '16px'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestControlPanel;
