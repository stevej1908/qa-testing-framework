// ProgressIndicator - Shows testing progress and feedback summary
import React from 'react';

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: '8px'
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    height: '8px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '9999px',
    transition: 'width 0.3s ease'
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6b7280'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px'
  },
  statCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: 1
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px'
  },
  feedbackList: {
    flex: 1,
    overflow: 'auto'
  },
  feedbackItem: {
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    marginBottom: '8px',
    fontSize: '12px'
  },
  feedbackBlocker: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2'
  },
  feedbackNiceToHave: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb'
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  feedbackCheckpoint: {
    fontWeight: '600',
    color: '#374151'
  },
  feedbackPriority: {
    fontSize: '10px',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  feedbackIssue: {
    color: '#6b7280'
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: '#9ca3af',
    fontSize: '12px'
  }
};

export const ProgressIndicator = ({
  current,
  total,
  percentage,
  feedback = []
}) => {
  const blockers = feedback.filter(f => f.priority === 'blocker');
  const niceToHave = feedback.filter(f => f.priority === 'nice-to-have');

  return (
    <div style={styles.container}>
      {/* Progress Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Progress</div>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${percentage || 0}%`
            }}
          />
        </div>
        <div style={styles.progressText}>
          <span>Step {current} of {total}</span>
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Stats Section */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Summary</div>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#10b981' }}>
              {current - feedback.length}
            </div>
            <div style={styles.statLabel}>Passed</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#ef4444' }}>
              {feedback.length}
            </div>
            <div style={styles.statLabel}>Issues</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#dc2626' }}>
              {blockers.length}
            </div>
            <div style={styles.statLabel}>Blockers</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: '#f59e0b' }}>
              {niceToHave.length}
            </div>
            <div style={styles.statLabel}>Nice-to-have</div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Feedback Items</div>
        <div style={styles.feedbackList}>
          {feedback.length === 0 ? (
            <div style={styles.emptyState}>
              No issues reported yet
            </div>
          ) : (
            feedback.map((item, index) => (
              <div
                key={index}
                style={{
                  ...styles.feedbackItem,
                  ...(item.priority === 'blocker' ? styles.feedbackBlocker : styles.feedbackNiceToHave)
                }}
              >
                <div style={styles.feedbackHeader}>
                  <span style={styles.feedbackCheckpoint}>
                    Step {item.checkpointIndex}
                  </span>
                  <span
                    style={{
                      ...styles.feedbackPriority,
                      backgroundColor: item.priority === 'blocker' ? '#fecaca' : '#fde68a',
                      color: item.priority === 'blocker' ? '#991b1b' : '#92400e'
                    }}
                  >
                    {item.priority === 'blocker' ? '🚫 BLOCKER' : '📝 NICE-TO-HAVE'}
                  </span>
                </div>
                <div style={styles.feedbackIssue}>
                  {item.issue.length > 100 ? item.issue.substring(0, 100) + '...' : item.issue}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;
