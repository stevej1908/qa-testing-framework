/**
 * AnalyticsPage - Dashboard showing test analytics and insights
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyticsSummary, clearPatternData } from '../analytics/PatternTracker';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsSummary();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleClearData = () => {
    if (window.confirm('Clear all analytics data? This cannot be undone.')) {
      clearPatternData();
      loadAnalytics();
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p>Error loading analytics: {error}</p>
        <button onClick={loadAnalytics} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics Dashboard</h1>
          <p style={styles.subtitle}>
            Test patterns and insights across all sessions
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={loadAnalytics} style={styles.refreshButton}>
            Refresh
          </button>
          <button onClick={() => navigate('/')} style={styles.backButton}>
            Back to Setup
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={styles.overviewRow}>
        <div style={styles.overviewCard}>
          <span style={styles.overviewNumber}>{analytics.overview.totalSpecs}</span>
          <span style={styles.overviewLabel}>Specs Tested</span>
        </div>
        <div style={styles.overviewCard}>
          <span style={styles.overviewNumber}>{analytics.overview.totalCheckpoints}</span>
          <span style={styles.overviewLabel}>Checkpoints</span>
        </div>
        <div style={styles.overviewCard}>
          <span style={styles.overviewNumber}>{analytics.trends.summary.totalSessions}</span>
          <span style={styles.overviewLabel}>Sessions (14d)</span>
        </div>
        <div style={{
          ...styles.overviewCard,
          backgroundColor: analytics.trends.summary.avgPassRate >= 80 ? '#dcfce7' :
                          analytics.trends.summary.avgPassRate >= 50 ? '#fef9c3' : '#fef2f2'
        }}>
          <span style={{
            ...styles.overviewNumber,
            color: analytics.trends.summary.avgPassRate >= 80 ? '#16a34a' :
                   analytics.trends.summary.avgPassRate >= 50 ? '#ca8a04' : '#dc2626'
          }}>
            {analytics.trends.summary.avgPassRate}%
          </span>
          <span style={styles.overviewLabel}>Avg Pass Rate</span>
        </div>
      </div>

      {/* Insights Section */}
      {analytics.insights.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Insights & Recommendations</h2>
          <div style={styles.insightsList}>
            {analytics.insights.map((insight, i) => (
              <div
                key={i}
                style={{
                  ...styles.insightCard,
                  borderLeftColor: insight.type === 'warning' ? '#f59e0b' :
                                  insight.type === 'success' ? '#16a34a' : '#3b82f6'
                }}
              >
                <div style={styles.insightHeader}>
                  <span style={{
                    ...styles.insightIcon,
                    backgroundColor: insight.type === 'warning' ? '#fef3c7' :
                                    insight.type === 'success' ? '#dcfce7' : '#dbeafe'
                  }}>
                    {insight.type === 'warning' ? '!' : insight.type === 'success' ? '✓' : 'i'}
                  </span>
                  <span style={styles.insightTitle}>{insight.title}</span>
                  <span style={{
                    ...styles.priorityBadge,
                    backgroundColor: insight.priority === 'high' ? '#fecaca' :
                                    insight.priority === 'medium' ? '#fef9c3' : '#e5e7eb'
                  }}>
                    {insight.priority}
                  </span>
                </div>
                <p style={styles.insightMessage}>{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Problematic Checkpoints */}
      {analytics.problematicCheckpoints.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Frequently Failing Checkpoints</h2>
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span style={{ flex: 1 }}>Checkpoint</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Passes</span>
              <span style={{ width: '80px', textAlign: 'center' }}>Fails</span>
              <span style={{ width: '100px', textAlign: 'center' }}>Fail Rate</span>
            </div>
            {analytics.problematicCheckpoints.map((cp, i) => (
              <div key={i} style={styles.tableRow}>
                <span style={{ flex: 1 }}>
                  <code style={styles.code}>{cp.checkpointId}</code>
                </span>
                <span style={{ width: '80px', textAlign: 'center', color: '#16a34a' }}>
                  {cp.passes}
                </span>
                <span style={{ width: '80px', textAlign: 'center', color: '#dc2626' }}>
                  {cp.fails}
                </span>
                <span style={{ width: '100px', textAlign: 'center' }}>
                  <span style={{
                    ...styles.failRateBadge,
                    backgroundColor: cp.failRate >= 70 ? '#fecaca' :
                                    cp.failRate >= 50 ? '#fef9c3' : '#e5e7eb'
                  }}>
                    {cp.failRate}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spec Performance */}
      {analytics.specPerformance.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Spec Performance</h2>
          <div style={styles.specGrid}>
            {analytics.specPerformance.map((spec, i) => (
              <div key={i} style={styles.specCard}>
                <div style={styles.specHeader}>
                  <span style={styles.specName}>{spec.specName}</span>
                  <span style={{
                    ...styles.passRateBadge,
                    backgroundColor: spec.avgPassRate >= 80 ? '#dcfce7' :
                                    spec.avgPassRate >= 50 ? '#fef9c3' : '#fef2f2',
                    color: spec.avgPassRate >= 80 ? '#16a34a' :
                           spec.avgPassRate >= 50 ? '#ca8a04' : '#dc2626'
                  }}>
                    {spec.avgPassRate}%
                  </span>
                </div>
                <div style={styles.specStats}>
                  <span>{spec.sessions} sessions</span>
                  <span>|</span>
                  <span style={{ color: '#16a34a' }}>{spec.totalPassed} passed</span>
                  <span>|</span>
                  <span style={{ color: '#dc2626' }}>{spec.totalFailed} failed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Issues */}
      {analytics.recentIssues.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Issues</h2>
          <div style={styles.issuesList}>
            {analytics.recentIssues.slice(0, 5).map((issue, i) => (
              <div key={i} style={styles.issueCard}>
                <div style={styles.issueHeader}>
                  <code style={styles.code}>{issue.checkpointId}</code>
                  <span style={{
                    ...styles.priorityBadge,
                    backgroundColor: issue.priority === 'blocker' ? '#fecaca' : '#fef9c3'
                  }}>
                    {issue.priority}
                  </span>
                  {issue.githubIssue && (
                    <a
                      href={issue.githubIssue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.githubLink}
                    >
                      #{issue.githubIssue.number}
                    </a>
                  )}
                </div>
                <p style={styles.issueDescription}>{issue.description}</p>
                <span style={styles.issueTimestamp}>
                  {new Date(issue.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {analytics.overview.totalSpecs === 0 && (
        <div style={styles.emptyState}>
          <h3>No Analytics Data Yet</h3>
          <p>Complete some test sessions to see analytics and insights here.</p>
          <button onClick={() => navigate('/')} style={styles.startButton}>
            Start Testing
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <span>Last updated: {analytics.lastUpdated ? new Date(analytics.lastUpdated).toLocaleString() : 'Never'}</span>
        <button onClick={handleClearData} style={styles.clearButton}>
          Clear Analytics Data
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100%'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '16px'
  },
  retryButton: {
    padding: '10px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px'
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '24px',
    color: '#1f2937'
  },
  subtitle: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  overviewRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  overviewNumber: {
    display: 'block',
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937'
  },
  overviewLabel: {
    fontSize: '13px',
    color: '#6b7280'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  insightsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  insightCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    borderLeft: '4px solid'
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  insightIcon: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600'
  },
  insightTitle: {
    flex: 1,
    fontWeight: '600',
    color: '#1f2937'
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    textTransform: 'uppercase'
  },
  insightMessage: {
    margin: 0,
    color: '#4b5563',
    fontSize: '14px',
    paddingLeft: '34px'
  },
  table: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  tableRow: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    alignItems: 'center',
    fontSize: '14px'
  },
  code: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  failRateBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  specGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  specCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  specHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  specName: {
    fontWeight: '600',
    color: '#1f2937'
  },
  passRateBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  specStats: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280'
  },
  issuesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  issueCard: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  issueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  githubLink: {
    backgroundColor: '#1f2937',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    textDecoration: 'none'
  },
  issueDescription: {
    margin: '0 0 8px 0',
    color: '#4b5563',
    fontSize: '14px'
  },
  issueTimestamp: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  startButton: {
    marginTop: '16px',
    padding: '12px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#9ca3af'
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  }
};

export default AnalyticsPage;
