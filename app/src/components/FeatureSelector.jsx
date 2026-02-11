import React, { useState, useEffect, useCallback } from 'react';
import { getSessions } from '../storage/TestArtifactStore';
import { useTFContext } from '../App';
import {
  getAvailableSpecs,
  checkSpecsStatus,
  generateSpecsForRepo,
  checkForSpecUpdates
} from '../utils/SpecLoader';
import specManager from '../services/SpecManager';

const FeatureSelector = ({ onSelect, selectedSpec }) => {
  const { config, repoAnalyzer } = useTFContext();
  const [filter, setFilter] = useState('');
  const [specs, setSpecs] = useState([]);
  const [filteredSpecs, setFilteredSpecs] = useState([]);
  const [latestResults, setLatestResults] = useState({});
  const [specsStatus, setSpecsStatus] = useState({ hasSpecs: false, reason: 'loading' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [error, setError] = useState(null);

  // Load specs when component mounts or GitHub connection changes
  useEffect(() => {
    const loadSpecs = () => {
      const status = checkSpecsStatus();
      setSpecsStatus(status);

      if (status.hasSpecs) {
        const availableSpecs = getAvailableSpecs();
        // Add checkpoint count from full specs
        const specsWithCounts = availableSpecs.map(s => {
          const fullSpec = specManager.getSpec(config.github?.repo, s.id);
          return {
            ...s,
            checkpoints: fullSpec?.checkpoints?.length || 0,
            dataDomains: fullSpec?.dataDomains || [],
            requiredRole: fullSpec?.requiredRole || 'any'
          };
        });
        setSpecs(specsWithCounts);
        setFilteredSpecs(specsWithCounts);
      } else {
        setSpecs([]);
        setFilteredSpecs([]);
      }
    };

    loadSpecs();
  }, [config.github?.connected, config.github?.repo]);

  // Check for updates when we have specs and repo analysis
  useEffect(() => {
    if (specsStatus.hasSpecs && config.repoAnalysis?.data?.recentCommits) {
      const status = checkForSpecUpdates(config.repoAnalysis.data.recentCommits);
      setUpdateStatus(status);
    }
  }, [specsStatus.hasSpecs, config.repoAnalysis?.data]);

  // Load latest test results for each spec
  useEffect(() => {
    const loadLatestResults = async () => {
      if (specs.length === 0) return;

      try {
        const sessions = await getSessions({ status: 'completed' });
        const results = {};

        for (const spec of specs) {
          const specSessions = sessions
            .filter(s => s.specId === spec.id && s.status === 'completed')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

          if (specSessions.length > 0) {
            const latest = specSessions[0];
            results[spec.id] = {
              passed: latest.passed,
              failed: latest.failed,
              total: latest.passed + latest.failed,
              date: latest.updatedAt,
              status: latest.failed === 0 ? 'passed' : 'failed'
            };
          }
        }

        setLatestResults(results);
      } catch (err) {
        console.error('Failed to load latest results:', err);
      }
    };

    loadLatestResults();
  }, [specs]);

  // Filter specs
  useEffect(() => {
    if (filter) {
      setFilteredSpecs(
        specs.filter(spec =>
          spec.name.toLowerCase().includes(filter.toLowerCase()) ||
          spec.id.toLowerCase().includes(filter.toLowerCase())
        )
      );
    } else {
      setFilteredSpecs(specs);
    }
  }, [filter, specs]);

  // Detect app type from repo name
  const detectAppType = useCallback(() => {
    const repoName = (config.github?.repo || '').toLowerCase();
    // Healthcare/medical app patterns
    const healthcarePatterns = [
      'health', 'medical', 'patient', 'clinic', 'behavioral',
      'catch-me-bill', 'ehr', 'emr', 'practice', 'therapy'
    ];
    if (healthcarePatterns.some(pattern => repoName.includes(pattern))) {
      return 'healthcare';
    }
    // Property management patterns
    const propertyPatterns = ['property', 'rental', 'tenant', 'landlord', 'real-estate'];
    if (propertyPatterns.some(pattern => repoName.includes(pattern))) {
      return 'property-management';
    }
    return 'project-management';
  }, [config.github?.repo]);

  // Generate specs for the current repo
  const handleGenerateSpecs = useCallback(async () => {
    if (!repoAnalyzer) {
      setError('GitHub must be connected to generate specs');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const appType = detectAppType();
      const result = await generateSpecsForRepo(repoAnalyzer, appType);

      // Reload specs
      const availableSpecs = getAvailableSpecs();
      const specsWithCounts = availableSpecs.map(s => {
        const fullSpec = specManager.getSpec(config.github?.repo, s.id);
        return {
          ...s,
          checkpoints: fullSpec?.checkpoints?.length || 0,
          dataDomains: fullSpec?.dataDomains || [],
          requiredRole: fullSpec?.requiredRole || 'any'
        };
      });

      setSpecs(specsWithCounts);
      setFilteredSpecs(specsWithCounts);
      setSpecsStatus({ hasSpecs: true, specCount: result.specCount });
    } catch (err) {
      setError(`Failed to generate specs: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [repoAnalyzer, config.github?.repo, detectAppType]);

  // Update specs with latest changes
  const handleUpdateSpecs = useCallback(async () => {
    if (!repoAnalyzer) return;

    setIsGenerating(true);
    setError(null);

    try {
      const appType = detectAppType();
      await generateSpecsForRepo(repoAnalyzer, appType);

      // Reload specs
      const availableSpecs = getAvailableSpecs();
      const specsWithCounts = availableSpecs.map(s => {
        const fullSpec = specManager.getSpec(config.github?.repo, s.id);
        return {
          ...s,
          checkpoints: fullSpec?.checkpoints?.length || 0
        };
      });

      setSpecs(specsWithCounts);
      setFilteredSpecs(specsWithCounts);
      setUpdateStatus(null);
    } catch (err) {
      setError(`Failed to update specs: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [repoAnalyzer, config.github?.repo, detectAppType]);

  const totalCheckpoints = specs.reduce((sum, spec) => sum + (spec.checkpoints || 0), 0);

  // No GitHub connected
  if (!config.github?.connected) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Select Feature to Test</h3>
        </div>
        <div style={styles.noSpecsMessage}>
          <div style={styles.noSpecsIcon}>🔗</div>
          <h4 style={styles.noSpecsTitle}>Connect GitHub to Load Specs</h4>
          <p style={styles.noSpecsDescription}>
            Connect your GitHub repository in the sidebar to load or generate test specifications for your application.
          </p>
        </div>
      </div>
    );
  }

  // No specs exist for this repo
  if (!specsStatus.hasSpecs) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Select Feature to Test</h3>
        </div>
        <div style={styles.noSpecsMessage}>
          <div style={styles.noSpecsIcon}>📋</div>
          <h4 style={styles.noSpecsTitle}>No Specs Found for This Repository</h4>
          <p style={styles.noSpecsDescription}>
            Generate test specifications based on your project structure. The framework will create specs for common features like authentication, projects, tasks, and more.
          </p>
          {error && <div style={styles.error}>{error}</div>}
          <button
            onClick={handleGenerateSpecs}
            style={styles.generateButton}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span style={styles.spinner}></span>
                Generating Specs...
              </>
            ) : (
              <>Generate Specs for {config.github?.repo?.split('/').pop() || 'this app'}</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Specs exist - show the list
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Select Feature to Test</h3>
        <span style={styles.summary}>
          {specs.length} specs, {totalCheckpoints} checkpoints
        </span>
      </div>

      {/* Update notification */}
      {updateStatus?.needsUpdate && (
        <div style={styles.updateNotice}>
          <span>
            {updateStatus.commitCount} new commit{updateStatus.commitCount !== 1 ? 's' : ''} since last spec update
          </span>
          <button
            onClick={handleUpdateSpecs}
            style={styles.updateButton}
            disabled={isGenerating}
          >
            {isGenerating ? 'Updating...' : 'Update Specs'}
          </button>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      <input
        type="text"
        placeholder="Filter specs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={styles.filterInput}
      />

      <div style={styles.specList}>
        {filteredSpecs.map(spec => {
          const result = latestResults[spec.id];
          return (
            <div
              key={spec.id}
              style={{
                ...styles.specItem,
                ...(selectedSpec?.id === spec.id ? styles.specItemSelected : {})
              }}
              onClick={() => onSelect(spec)}
            >
              <div style={styles.specInfo}>
                <span style={styles.specName}>{spec.name}</span>
                <span style={styles.specId}>{spec.id}</span>
              </div>
              <div style={styles.specRight}>
                {result ? (
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: result.status === 'passed' ? '#dcfce7' : '#fef2f2',
                    color: result.status === 'passed' ? '#16a34a' : '#dc2626'
                  }}>
                    {result.status === 'passed'
                      ? '✓ PASSED'
                      : `✗ ${result.failed} failed`}
                  </span>
                ) : (
                  <span style={styles.notTested}>Not tested</span>
                )}
                <span style={styles.checkpointCount}>
                  {spec.checkpoints} checkpoints
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSpecs.length === 0 && filter && (
        <div style={styles.noResults}>
          No specs match "{filter}"
        </div>
      )}

      {/* Regenerate button and metadata */}
      <div style={styles.specsFooter}>
        <button
          onClick={handleGenerateSpecs}
          style={styles.regenerateButton}
          disabled={isGenerating}
        >
          {isGenerating ? 'Regenerating...' : 'Regenerate Specs'}
        </button>
        {specsStatus.lastUpdated && (
          <span style={styles.specsMetaText}>
            Last updated: {new Date(specsStatus.lastUpdated).toLocaleDateString()}
          </span>
        )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  summary: {
    fontSize: '12px',
    color: '#6b7280'
  },
  filterInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  specList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  specItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  specItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#1e40af'
  },
  specInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  specName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  specId: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  specRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  notTested: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  checkpointCount: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  noResults: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280'
  },
  noSpecsMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db'
  },
  noSpecsIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  noSpecsTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  noSpecsDescription: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#6b7280',
    maxWidth: '400px',
    lineHeight: '1.5'
  },
  generateButton: {
    padding: '12px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  updateNotice: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px',
    color: '#92400e'
  },
  updateButton: {
    padding: '6px 12px',
    backgroundColor: '#92400e',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '12px',
    fontSize: '13px'
  },
  specsMeta: {
    marginTop: '12px',
    padding: '8px 0',
    borderTop: '1px solid #e5e7eb',
    fontSize: '11px',
    color: '#9ca3af',
    textAlign: 'center'
  },
  specsFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  regenerateButton: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  specsMetaText: {
    fontSize: '11px',
    color: '#9ca3af'
  }
};

export default FeatureSelector;
