// CheckpointControls - Yes/No controls for each checkpoint
import React from 'react';

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb'
  },
  stepInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  stepNumber: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600'
  },
  stepLabel: {
    fontSize: '12px',
    color: '#6b7280'
  },
  body: {
    padding: '16px'
  },
  actionText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '8px'
  },
  expectedResult: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px'
  },
  expectedLabel: {
    fontSize: '11px',
    color: '#166534',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: '4px'
  },
  expectedText: {
    fontSize: '14px',
    color: '#15803d'
  },
  notesSection: {
    marginBottom: '16px'
  },
  notesLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  notesInput: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '60px'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px'
  },
  approveButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  rejectButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  elementInfo: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#6b7280'
  }
};

export const CheckpointControls = ({
  checkpoint,
  onApprove,
  onReject,
  approvalNotes,
  onNotesChange
}) => {
  if (!checkpoint) {
    return (
      <div style={styles.container}>
        <div style={styles.body}>
          <p style={{ color: '#6b7280' }}>No checkpoint active</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.stepInfo}>
          <div style={styles.stepNumber}>{checkpoint.index}</div>
          <span style={styles.stepLabel}>
            Checkpoint {checkpoint.index}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Current Action */}
        <div style={styles.actionText}>
          {checkpoint.action}
        </div>

        {/* Element info if available */}
        {checkpoint.element && (
          <div style={styles.elementInfo}>
            <strong>Element:</strong> {checkpoint.element}
          </div>
        )}

        {/* Expected Result */}
        <div style={styles.expectedResult}>
          <div style={styles.expectedLabel}>Expected Result</div>
          <div style={styles.expectedText}>
            {checkpoint.expectedResult}
          </div>
        </div>

        {/* Optional Notes */}
        <div style={styles.notesSection}>
          <div style={styles.notesLabel}>
            Optional Notes (for approved checkpoints)
          </div>
          <textarea
            style={styles.notesInput}
            value={approvalNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add any notes about this step..."
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonRow}>
          <button
            style={styles.approveButton}
            onClick={onApprove}
            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            ✓ YES - Approved
          </button>
          <button
            style={styles.rejectButton}
            onClick={onReject}
            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
          >
            ✕ NO - Issue Found
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckpointControls;
