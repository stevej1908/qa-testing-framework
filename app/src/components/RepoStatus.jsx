/**
 * RepoStatus - Display repository information and analysis status
 *
 * Shows current branch, recent commits, and deployment configuration
 * detected from the connected GitHub repository.
 */

import React from 'react';

const RepoStatus = ({ repoAnalysis, isLoading, error, onRefresh }) => {
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Repository Status</h3>
        </div>
        <div style={styles.errorBox}>
          <span style={styles.errorIcon}>!</span>
          <span>{error}</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} style={styles.refreshButton}>
            Retry Analysis
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Repository Status</h3>
        </div>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <span>Analyzing repository...</span>
        </div>
      </div>
    );
  }

  if (!repoAnalysis) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Repository Status</h3>
        </div>
        <div style={styles.emptyBox}>
          <span style={styles.emptyIcon}>?</span>
          <span>Connect to GitHub to see repository analysis</span>
        </div>
      </div>
    );
  }

  const { branch, recentCommits, deploymentConfig, userSchema } = repoAnalysis;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Repository Status</h3>
        {onRefresh && (
          <button onClick={onRefresh} style={styles.refreshIconButton} title="Refresh">
            Refresh
          </button>
        )}
      </div>

      {/* Branch Info */}
      {branch && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>Branch</span>
            <span style={styles.branchName}>{branch.defaultBranch}</span>
          </div>
          <div style={styles.repoInfo}>
            <span style={styles.repoName}>{branch.fullName}</span>
            {branch.private && <span style={styles.privateBadge}>Private</span>}
          </div>
        </div>
      )}

      {/* Recent Commits */}
      {recentCommits && recentCommits.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>Recent Commits</span>
            <span style={styles.commitCount}>{recentCommits.length}</span>
          </div>
          <div style={styles.commitList}>
            {recentCommits.slice(0, 3).map((commit, index) => (
              <div key={commit.sha} style={styles.commitItem}>
                <div style={styles.commitHeader}>
                  <span style={styles.commitSha}>{commit.shortSha}</span>
                  <span style={styles.commitDate}>
                    {formatRelativeDate(commit.date)}
                  </span>
                </div>
                <div style={styles.commitMessage}>
                  {truncateMessage(commit.message, 60)}
                </div>
                <div style={styles.commitAuthor}>by {commit.author}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Config */}
      {deploymentConfig && deploymentConfig.detected.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>Deployments</span>
          </div>
          <div style={styles.deploymentList}>
            {deploymentConfig.detected.map(platform => (
              <span key={platform} style={styles.platformBadge}>
                {getPlatformDisplay(platform)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* User Schema Summary */}
      {userSchema && userSchema.tables.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>Schema Analysis</span>
          </div>
          <div style={styles.schemaStats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{userSchema.tables.length}</span>
              <span style={styles.statLabel}>Tables</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{userSchema.roles.length}</span>
              <span style={styles.statLabel}>Roles</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>
                {Object.keys(userSchema.dataDomains).filter(
                  d => userSchema.dataDomains[d].length > 0
                ).length}
              </span>
              <span style={styles.statLabel}>Domains</span>
            </div>
          </div>
          {userSchema.roles.length > 0 && (
            <div style={styles.rolesList}>
              {userSchema.roles.slice(0, 5).map(role => (
                <span key={role} style={styles.roleBadge}>{role}</span>
              ))}
              {userSchema.roles.length > 5 && (
                <span style={styles.moreCount}>+{userSchema.roles.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis Errors */}
      {repoAnalysis.errors && repoAnalysis.errors.length > 0 && (
        <div style={styles.warningSection}>
          <div style={styles.warningHeader}>
            <span style={styles.warningIcon}>!</span>
            <span>Analysis Warnings</span>
          </div>
          <ul style={styles.warningList}>
            {repoAnalysis.errors.map((err, index) => (
              <li key={index} style={styles.warningItem}>
                {err.step}: {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={styles.timestamp}>
        Last analyzed: {formatRelativeDate(repoAnalysis.timestamp)}
      </div>
    </div>
  );
};

// Helper functions
function formatRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function truncateMessage(message, maxLength) {
  const firstLine = message.split('\n')[0];
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.substring(0, maxLength - 3) + '...';
}

function getPlatformDisplay(platform) {
  const displays = {
    render: 'Render',
    vercel: 'Vercel',
    netlify: 'Netlify',
    docker: 'Docker',
    fly: 'Fly.io',
    railway: 'Railway',
    'github-actions': 'GitHub Actions'
  };
  return displays[platform] || platform;
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  refreshIconButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#6b7280',
    cursor: 'pointer'
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '13px'
  },
  errorIcon: {
    width: '20px',
    height: '20px',
    backgroundColor: '#dc2626',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    color: '#6b7280',
    fontSize: '13px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    color: '#6b7280',
    fontSize: '13px'
  },
  emptyIcon: {
    width: '20px',
    height: '20px',
    backgroundColor: '#d1d5db',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  refreshButton: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  section: {
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #f3f4f6'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  sectionIcon: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  branchName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  repoInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  repoName: {
    fontSize: '13px',
    color: '#6b7280'
  },
  privateBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px'
  },
  commitCount: {
    fontSize: '12px',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    padding: '1px 6px',
    borderRadius: '10px'
  },
  commitList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  commitItem: {
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  commitHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  commitSha: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  commitDate: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  commitMessage: {
    fontSize: '13px',
    color: '#1f2937',
    marginBottom: '2px'
  },
  commitAuthor: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  deploymentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  platformBadge: {
    fontSize: '12px',
    padding: '4px 10px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontWeight: '500'
  },
  schemaStats: {
    display: 'flex',
    gap: '16px',
    marginBottom: '8px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },
  statLabel: {
    fontSize: '11px',
    color: '#6b7280'
  },
  rolesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px'
  },
  roleBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '4px'
  },
  moreCount: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  warningSection: {
    backgroundColor: '#fffbeb',
    padding: '10px',
    borderRadius: '6px',
    marginBottom: '12px'
  },
  warningHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#92400e'
  },
  warningIcon: {
    color: '#f59e0b'
  },
  warningList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#78350f'
  },
  warningItem: {
    marginBottom: '4px'
  },
  timestamp: {
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'right'
  }
};

export default RepoStatus;
