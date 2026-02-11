import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTFContext } from '../App';
import FeatureSelector from '../components/FeatureSelector';
import { getResumableSessionsList, abandonSession } from '../storage/SessionPersistence';
import RepoStatus from '../components/RepoStatus';
import DiscrepancyAlert from '../components/DiscrepancyAlert';
import PreTestValidator from '../services/PreTestValidator';

// Import config files
import testCredentialsConfig from '../config/test-credentials.json';
import checkpointMappingsConfig from '../config/checkpoint-mappings.json';

const SetupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { config, updateConfig, initGitHub, disconnectGitHub, repoAnalyzer, analyzeRepository } = useTFContext();
  const [targetUrl, setTargetUrl] = useState(config.targetUrl || 'http://localhost:3000');
  const [apiUrl, setApiUrl] = useState(config.apiUrl || '');
  const [showApiUrl, setShowApiUrl] = useState(!!config.apiUrl);
  const [selectedSpec, setSelectedSpec] = useState(config.selectedSpec);
  const [error, setError] = useState('');

  // Resumable sessions
  const [resumableSessions, setResumableSessions] = useState([]);
  const [showPausedNotice, setShowPausedNotice] = useState(searchParams.get('paused') === 'true');

  // Pre-test validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showValidationAlert, setShowValidationAlert] = useState(false);

  // Ref to track if repo analysis has been triggered (prevents infinite loop)
  const repoAnalysisTriggered = useRef(false);

  // Load resumable sessions
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await getResumableSessionsList();
        setResumableSessions(sessions);
      } catch (err) {
        console.error('Failed to load resumable sessions:', err);
      }
    };
    loadSessions();
  }, []);

  // Handle resume session
  const handleResumeSession = (session) => {
    // Set the config to match the session
    updateConfig({
      targetUrl: session.targetUrl,
      selectedSpec: { id: session.specId, name: session.specName }
    });
    navigate(`/testing?resume=${session.id}`);
  };

  // Handle abandon session
  const handleAbandonSession = async (sessionId) => {
    try {
      await abandonSession(sessionId);
      setResumableSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to abandon session:', err);
    }
  };

  // GitHub settings
  const [showGitHub, setShowGitHub] = useState(config.github?.connected || false);
  const [githubToken, setGithubToken] = useState(config.github?.token || '');
  const [githubRepo, setGithubRepo] = useState(config.github?.repo || '');
  const [githubStatus, setGithubStatus] = useState(
    config.github?.connected ? 'connected' : 'disconnected'
  );
  const [githubError, setGithubError] = useState('');

  const handleGitHubConnect = async () => {
    if (!githubToken.trim() || !githubRepo.trim()) {
      setGithubError('Token and repository are required');
      return;
    }

    setGithubStatus('connecting');
    setGithubError('');

    const result = await initGitHub(githubToken.trim(), githubRepo.trim());

    if (result.success) {
      setGithubStatus('connected');
    } else {
      setGithubStatus('disconnected');
      setGithubError(result.error);
    }
  };

  const handleGitHubDisconnect = () => {
    disconnectGitHub();
    setGithubStatus('disconnected');
    setGithubToken('');
    setGithubRepo('');
    setGithubError(''); // Clear any previous errors
  };

  // Clear error when toggling GitHub section
  const handleToggleGitHub = () => {
    setShowGitHub(!showGitHub);
    setGithubError(''); // Clear error when expanding/collapsing
  };

  // Run pre-test validation
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setError('');

    try {
      // Merge user-provided apiUrl into testCredentials config
      const credentialsWithApiUrl = {
        ...testCredentialsConfig,
        // Override with user-provided API URL if specified
        userApiUrl: apiUrl.trim() || null
      };

      const validator = new PreTestValidator({
        repoAnalyzer: repoAnalyzer,
        testCredentials: credentialsWithApiUrl,
        checkpointMappings: checkpointMappingsConfig
      });

      const results = await validator.runAllValidations(
        targetUrl.trim(),
        selectedSpec?.id,
        selectedSpec
      );

      setValidationResults(results);
      setShowValidationAlert(true);

      return results;
    } catch (err) {
      setError(`Validation failed: ${err.message}`);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [targetUrl, apiUrl, selectedSpec, repoAnalyzer]);

  // Handle validation continue (with optional workaround credentials)
  const handleValidationContinue = useCallback((workaround = null) => {
    setShowValidationAlert(false);

    // Update context and navigate
    updateConfig({
      targetUrl: targetUrl.trim(),
      apiUrl: apiUrl.trim() || null, // Include API URL if provided
      selectedSpec,
      currentCheckpointIndex: 0,
      feedback: [],
      screenshots: [],
      validationResults, // Store validation results in context
      // If workaround is provided, override credentials for testing
      workaroundCredentials: workaround?.credentials || null,
      workaroundActive: !!workaround?.credentials
    });

    navigate('/testing');
  }, [targetUrl, apiUrl, selectedSpec, validationResults, updateConfig, navigate]);

  // Handle validation cancel
  const handleValidationCancel = () => {
    setShowValidationAlert(false);
    setValidationResults(null);
  };

  // Handle validation retry
  const handleValidationRetry = async () => {
    setShowValidationAlert(false);
    await runValidation();
  };

  // Handle selecting a different feature (when current one has compliance issues)
  const handleSelectDifferentFeature = () => {
    // Track the skipped spec for later
    const skippedSpec = {
      spec: selectedSpec,
      reason: 'compliance',
      skippedAt: new Date().toISOString(),
      findings: validationResults?.details?.compliance?.report?.findings || []
    };

    // Add to skipped specs list in config
    const existingSkipped = config.skippedSpecs || [];
    updateConfig({
      skippedSpecs: [...existingSkipped, skippedSpec]
    });

    // Close alert and clear selection so user can pick another
    setShowValidationAlert(false);
    setValidationResults(null);
    setSelectedSpec(null);
  };

  // Handle log to GitHub and continue
  const handleLogAndContinue = useCallback(async (complianceReport) => {
    const { githubClient } = config.github?.connected ? { githubClient: true } : { githubClient: null };

    // Get the actual GitHub client from context
    const tfContext = document.querySelector('[data-tf-context]')?.__tfContext;

    try {
      // Create a compliance issue using the GitHubIntegration
      const issueTitle = 'Compliance Issue: Role Separation Required';
      const issueBody = `## Pre-Test Compliance Issue

**Detected:** ${new Date().toISOString()}
**Target URL:** ${targetUrl}
**Spec:** ${selectedSpec?.name || selectedSpec?.id || 'N/A'}

### Issue Summary
${complianceReport?.complianceWarning || 'Super user role has access to multiple sensitive data domains.'}

### Findings
${complianceReport?.findings?.map(f => `- **${f.name}** (${f.severity}): ${f.description}`).join('\n') || 'See compliance report for details.'}

### Workaround Used
${complianceReport?.workaround?.description || 'Testing proceeded with super-admin credentials.'}

### Required Action
- [ ] Implement role separation before production deployment
- [ ] Create dedicated clinical role (PHI access only)
- [ ] Create dedicated billing role (financial data only)
- [ ] Remove cross-domain access from admin role

### Compliance Standards
- HIPAA: Protected Health Information (PHI) access
- SOX: Financial data separation

---
*This issue was auto-generated by the Testing Framework compliance check.*`;

      // Try to create the issue if GitHub is connected
      if (config.github?.connected && config.github?.token && config.github?.repo) {
        const { GitHubIntegration } = await import('../integrations/GitHubIntegration');
        const client = new GitHubIntegration(config.github.token, config.github.repo);
        await client._createIssue(issueTitle, issueBody, ['compliance', 'security', 'pre-production']);
        console.log('Compliance issue created in GitHub');
      }

      // Continue to testing with workaround credentials
      handleValidationContinue(complianceReport?.workaround);
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
      // Still allow continuing even if issue creation fails, with workaround
      handleValidationContinue(complianceReport?.workaround);
    }
  }, [config.github, targetUrl, selectedSpec, handleValidationContinue]);

  // Analyze repo after GitHub connects (using ref to prevent infinite loop)
  useEffect(() => {
    // Only trigger once when GitHub connects and we have a repoAnalyzer
    if (githubStatus === 'connected' && repoAnalyzer && !repoAnalysisTriggered.current) {
      repoAnalysisTriggered.current = true;
      analyzeRepository?.();
    }
    // Reset the ref when GitHub disconnects so analysis can run again on reconnect
    if (githubStatus !== 'connected') {
      repoAnalysisTriggered.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubStatus, repoAnalyzer]); // Intentionally omit analyzeRepository to prevent infinite loop

  const handleStartTesting = async () => {
    // Validate inputs
    if (!targetUrl.trim()) {
      setError('Please enter a target URL');
      return;
    }
    if (!selectedSpec) {
      setError('Please select a feature spec to test');
      return;
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch {
      setError('Please enter a valid URL (e.g., http://localhost:3000)');
      return;
    }

    // Run pre-test validation
    await runValidation();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Test Setup</h2>

        {/* Paused Notice */}
        {showPausedNotice && (
          <div style={styles.pausedNotice}>
            Session paused. You can resume it from the list below or start a new test.
            <button
              onClick={() => setShowPausedNotice(false)}
              style={styles.dismissButton}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Resumable Sessions */}
        {resumableSessions.length > 0 && (
          <div style={styles.resumeSection}>
            <h3 style={styles.resumeTitle}>Resume Previous Session</h3>
            <div style={styles.sessionsList}>
              {resumableSessions.map(session => (
                <div key={session.id} style={styles.sessionItem}>
                  <div style={styles.sessionInfo}>
                    <span style={styles.sessionSpec}>{session.specName}</span>
                    <span style={styles.sessionMeta}>
                      {session.progress.current}/{session.progress.total} checkpoints
                      ({session.progress.percentage}%)
                    </span>
                    <span style={styles.sessionAge}>{session.age}</span>
                  </div>
                  <div style={styles.sessionActions}>
                    <button
                      onClick={() => handleResumeSession(session)}
                      style={styles.resumeButton}
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => handleAbandonSession(session.id)}
                      style={styles.abandonButton}
                      title="Delete this session"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.divider}>
              <span>or start a new test</span>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div style={styles.section}>
          <label style={styles.label}>Target Application URL (Frontend)</label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => {
              setTargetUrl(e.target.value);
              setError('');
            }}
            placeholder="http://localhost:3000"
            style={styles.input}
          />
          <p style={styles.hint}>
            Enter the URL of the application you want to test
          </p>

          {/* Optional API URL toggle */}
          {!showApiUrl ? (
            <button
              type="button"
              onClick={() => setShowApiUrl(true)}
              style={styles.advancedToggle}
            >
              + API on different domain?
            </button>
          ) : (
            <div style={styles.apiUrlSection}>
              <div style={styles.apiUrlHeader}>
                <label style={styles.label}>API URL (Optional)</label>
                <button
                  type="button"
                  onClick={() => { setShowApiUrl(false); setApiUrl(''); }}
                  style={styles.removeApiUrl}
                >
                  Remove
                </button>
              </div>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com"
                style={styles.input}
              />
              <p style={styles.hint}>
                Only needed if your API backend is on a different domain than the frontend
              </p>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <FeatureSelector
            selectedSpec={selectedSpec}
            onSelect={(spec) => {
              setSelectedSpec(spec);
              setError('');
            }}
          />
        </div>

        {/* Skipped Specs Notice */}
        {config.skippedSpecs?.length > 0 && (
          <div style={styles.skippedSection}>
            <div style={styles.skippedHeader}>
              <span style={styles.skippedIcon}>!</span>
              <span style={styles.skippedTitle}>
                {config.skippedSpecs.length} feature{config.skippedSpecs.length !== 1 ? 's' : ''} skipped due to compliance issues
              </span>
            </div>
            <ul style={styles.skippedList}>
              {config.skippedSpecs.map((item, i) => (
                <li key={i} style={styles.skippedItem}>
                  <span style={styles.skippedSpecName}>{item.spec?.name || item.spec?.id}</span>
                  <button
                    onClick={() => {
                      setSelectedSpec(item.spec);
                      // Remove from skipped list when re-selected
                      updateConfig({
                        skippedSpecs: config.skippedSpecs.filter((_, idx) => idx !== i)
                      });
                    }}
                    style={styles.retrySkippedButton}
                  >
                    Retry
                  </button>
                </li>
              ))}
            </ul>
            <p style={styles.skippedHint}>
              These features can be tested after fixing the compliance issues, or you can retry them now.
            </p>
          </div>
        )}

        <button
          onClick={handleStartTesting}
          style={styles.startButton}
          disabled={!targetUrl || !selectedSpec || isValidating}
        >
          {isValidating ? (
            <>
              <span style={styles.spinner}></span>
              Validating...
            </>
          ) : (
            <>
              Start Testing
              {selectedSpec && (
                <span style={styles.buttonHint}>
                  ({selectedSpec.checkpoints} checkpoints)
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* GitHub Integration Card */}
      <div style={styles.sideColumn}>
        <div style={styles.githubCard}>
          <div
            style={styles.githubHeader}
            onClick={handleToggleGitHub}
          >
            <h3 style={styles.githubTitle}>
              GitHub Integration
              {githubStatus === 'connected' && (
                <span style={styles.connectedBadge}>Connected</span>
              )}
            </h3>
            <span style={styles.toggleIcon}>{showGitHub ? '-' : '+'}</span>
          </div>

          {showGitHub && (
            <div style={styles.githubContent}>
              {githubStatus === 'connected' ? (
                <div>
                  <p style={styles.githubInfo}>
                    Repository: <strong>{config.github?.repo}</strong>
                  </p>
                  <p style={styles.githubHint}>
                    Blockers will automatically create GitHub issues
                  </p>
                  <button
                    onClick={handleGitHubDisconnect}
                    style={styles.disconnectButton}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div>
                  {githubError && (
                    <div style={styles.githubError}>{githubError}</div>
                  )}

                  <div style={styles.githubField}>
                    <label style={styles.label}>Personal Access Token</label>
                    <input
                      type="password"
                      value={githubToken}
                      onChange={(e) => { setGithubToken(e.target.value); setGithubError(''); }}
                      placeholder="ghp_xxxx..."
                      style={styles.input}
                    />
                    <p style={styles.hint}>
                      Needs repo scope.{' '}
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        Create token
                      </a>
                    </p>
                  </div>

                  <div style={styles.githubField}>
                    <label style={styles.label}>Repository</label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => { setGithubRepo(e.target.value); setGithubError(''); }}
                      placeholder="owner/repo"
                      style={styles.input}
                    />
                    <p style={styles.hint}>Format: owner/repository-name</p>
                  </div>

                  <button
                    onClick={handleGitHubConnect}
                    style={styles.connectButton}
                    disabled={githubStatus === 'connecting'}
                  >
                    {githubStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Repository Status (shows when GitHub is connected) */}
        {githubStatus === 'connected' && (
          <RepoStatus
            repoAnalysis={config.repoAnalysis?.data}
            isLoading={config.repoAnalysis?.isLoading}
            error={config.repoAnalysis?.error}
            onRefresh={analyzeRepository}
          />
        )}

        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>How it works</h3>
          <ol style={styles.infoList}>
            <li>Enter the URL of your target application</li>
            <li>Select a feature spec to test</li>
            <li>Walk through each checkpoint</li>
            <li>Click YES if the checkpoint passes, NO if it fails</li>
            <li>On NO, provide feedback about what went wrong</li>
            <li>Review the summary when complete</li>
          </ol>
        </div>
      </div>

      {/* Validation Alert Modal */}
      {showValidationAlert && validationResults && (
        <DiscrepancyAlert
          validationResults={validationResults}
          onContinue={handleValidationContinue}
          onCancel={handleValidationCancel}
          onRetry={handleValidationRetry}
          onLogAndContinue={handleLogAndContinue}
          onSelectDifferentFeature={handleSelectDifferentFeature}
          githubConnected={config.github?.connected || false}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    height: '100%',
    overflow: 'auto'
  },
  card: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column'
  },
  cardTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937'
  },
  pausedNotice: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  skippedSection: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  skippedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  skippedIcon: {
    width: '20px',
    height: '20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  skippedTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#991b1b'
  },
  skippedList: {
    listStyle: 'none',
    margin: '0 0 12px 0',
    padding: 0
  },
  skippedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '6px',
    border: '1px solid #fecaca'
  },
  skippedSpecName: {
    fontSize: '13px',
    color: '#374151'
  },
  retrySkippedButton: {
    padding: '4px 12px',
    backgroundColor: '#1e40af',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  skippedHint: {
    margin: 0,
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#92400e',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  resumeSection: {
    marginBottom: '24px'
  },
  resumeTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  sessionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb'
  },
  sessionInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  sessionSpec: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  sessionMeta: {
    fontSize: '12px',
    color: '#6b7280'
  },
  sessionAge: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  sessionActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  resumeButton: {
    padding: '6px 16px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  abandonButton: {
    padding: '6px 10px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
    color: '#9ca3af',
    fontSize: '12px'
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  section: {
    marginBottom: '24px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    fontSize: '14px',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280'
  },
  advancedToggle: {
    marginTop: '12px',
    padding: '0',
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none'
  },
  apiUrlSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px dashed #d1d5db'
  },
  apiUrlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  removeApiUrl: {
    padding: '4px 8px',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  startButton: {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: 'auto'
  },
  buttonHint: {
    fontSize: '14px',
    opacity: 0.8
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  sideColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  githubCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  githubHeader: {
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  githubTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  toggleIcon: {
    fontSize: '18px',
    color: '#6b7280'
  },
  connectedBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500'
  },
  githubContent: {
    padding: '16px 20px'
  },
  githubField: {
    marginBottom: '16px'
  },
  githubInfo: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#374151'
  },
  githubHint: {
    margin: '0 0 16px 0',
    fontSize: '12px',
    color: '#6b7280'
  },
  githubError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px'
  },
  connectButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#1f2937',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  disconnectButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none'
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: '8px',
    padding: '24px',
    border: '1px solid #bae6fd'
  },
  infoTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#0369a1'
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#0c4a6e',
    fontSize: '14px',
    lineHeight: '1.8'
  }
};

export default SetupPage;
