import React, { useState, createContext, useContext, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import SetupPage from './pages/SetupPage';
import TestingPage from './pages/TestingPage';
import DemoPage from './pages/DemoPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { GitHubIntegration } from './integrations/GitHubIntegration';
import GitHubRepoAnalyzer from './services/GitHubRepoAnalyzer';
import { setCurrentRepo } from './utils/SpecLoader';

// Global state context for TF
const TFContext = createContext(null);

export const useTFContext = () => {
  const context = useContext(TFContext);
  if (!context) {
    throw new Error('useTFContext must be used within TFProvider');
  }
  return context;
};

// Main App component
function App() {
  const [config, setConfig] = useState({
    targetUrl: '',
    selectedSpec: null,
    session: null,
    checkpoints: [],
    currentCheckpointIndex: 0,
    feedback: [],
    screenshots: [],
    // GitHub Integration config
    github: {
      enabled: false,
      token: localStorage.getItem('tf_github_token') || '',
      repo: localStorage.getItem('tf_github_repo') || '',
      connected: false,
      issues: [] // Track created issues
    },
    // Repository Analysis state
    repoAnalysis: {
      data: null,
      isLoading: false,
      error: null,
      lastAnalyzed: null
    }
  });

  // GitHub integration instance
  const [githubClient, setGithubClient] = useState(null);

  // Repository analyzer instance
  const [repoAnalyzer, setRepoAnalyzer] = useState(null);

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Initialize GitHub client
  const initGitHub = useCallback(async (token, repo) => {
    try {
      const client = new GitHubIntegration(token, repo);
      await client.testConnection();

      // Save to localStorage for persistence
      localStorage.setItem('tf_github_token', token);
      localStorage.setItem('tf_github_repo', repo);

      setGithubClient(client);

      // Create repo analyzer instance
      const analyzer = new GitHubRepoAnalyzer(client);
      setRepoAnalyzer(analyzer);

      // Set the current repo for spec loading
      setCurrentRepo(repo);

      setConfig(prev => ({
        ...prev,
        github: {
          ...prev.github,
          enabled: true,
          token,
          repo,
          connected: true
        }
      }));

      return { success: true, analyzer };
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        github: {
          ...prev.github,
          connected: false
        }
      }));
      return { success: false, error: error.message };
    }
  }, []);

  // Analyze repository
  const analyzeRepository = useCallback(async () => {
    if (!repoAnalyzer) {
      return { success: false, error: 'GitHub not connected' };
    }

    // Set loading state
    setConfig(prev => ({
      ...prev,
      repoAnalysis: {
        ...prev.repoAnalysis,
        isLoading: true,
        error: null
      }
    }));

    try {
      const analysis = await repoAnalyzer.analyzeRepo();

      setConfig(prev => ({
        ...prev,
        repoAnalysis: {
          data: analysis,
          isLoading: false,
          error: null,
          lastAnalyzed: new Date().toISOString()
        }
      }));

      return { success: true, analysis };
    } catch (error) {
      setConfig(prev => ({
        ...prev,
        repoAnalysis: {
          ...prev.repoAnalysis,
          isLoading: false,
          error: error.message
        }
      }));
      return { success: false, error: error.message };
    }
  }, [repoAnalyzer]);

  // Create a blocker issue
  const createBlockerIssue = useCallback(async (blocker, checkpoint, screenshots = null) => {
    if (!githubClient) {
      return { success: false, error: 'GitHub not connected' };
    }

    try {
      const issue = await githubClient.createBlockerIssue(
        blocker,
        { ...checkpoint, specId: config.selectedSpec?.id },
        screenshots,
        {
          id: config.session?.id,
          specId: config.selectedSpec?.id,
          targetUrl: config.targetUrl
        }
      );

      // Track the created issue
      setConfig(prev => ({
        ...prev,
        github: {
          ...prev.github,
          issues: [...prev.github.issues, {
            number: issue.number,
            url: issue.html_url,
            title: issue.title,
            checkpointId: checkpoint.id,
            createdAt: new Date().toISOString()
          }]
        }
      }));

      return { success: true, issue };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [githubClient, config.selectedSpec, config.session, config.targetUrl]);

  // Disconnect GitHub
  const disconnectGitHub = useCallback(() => {
    localStorage.removeItem('tf_github_token');
    localStorage.removeItem('tf_github_repo');
    setGithubClient(null);
    setRepoAnalyzer(null);
    setCurrentRepo(null); // Clear current repo for spec loading
    setConfig(prev => ({
      ...prev,
      github: {
        enabled: false,
        token: '',
        repo: '',
        connected: false,
        issues: []
      },
      repoAnalysis: {
        data: null,
        isLoading: false,
        error: null,
        lastAnalyzed: null
      }
    }));
  }, []);

  // Auto-initialize GitHub client on startup if credentials are saved
  React.useEffect(() => {
    const savedToken = localStorage.getItem('tf_github_token');
    const savedRepo = localStorage.getItem('tf_github_repo');

    if (savedToken && savedRepo && !githubClient) {
      // Initialize GitHub client with saved credentials
      initGitHub(savedToken, savedRepo).catch(err => {
        console.error('Failed to auto-connect GitHub:', err);
      });
    }
  }, []); // Run once on mount

  // Header component with navigation
  const Header = () => {
    const location = useLocation();
    const isTestingPage = location.pathname === '/testing';
    const isDemoPage = location.pathname === '/demo';

    // Hide nav on testing and demo pages
    if (isTestingPage || isDemoPage) {
      return (
        <header style={styles.header}>
          <h1 style={styles.title}>Testing Framework</h1>
          <span style={styles.version}>v1.0.0</span>
        </header>
      );
    }

    return (
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Testing Framework</h1>
          <nav style={styles.nav}>
            <Link
              to="/"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/' ? styles.navLinkActive : {})
              }}
            >
              Setup
            </Link>
            <Link
              to="/analytics"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/analytics' ? styles.navLinkActive : {})
              }}
            >
              Analytics
            </Link>
            <Link
              to="/demo"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/demo' ? styles.navLinkActive : {})
              }}
            >
              Demo
            </Link>
          </nav>
        </div>
        <span style={styles.version}>v1.0.0</span>
      </header>
    );
  };

  return (
    <TFContext.Provider value={{
        config,
        updateConfig,
        initGitHub,
        createBlockerIssue,
        disconnectGitHub,
        githubClient,
        repoAnalyzer,
        analyzeRepository
      }}>
      <div style={styles.container}>
        <Header />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<SetupPage />} />
            <Route path="/testing" element={<TestingPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
    </TFContext.Provider>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f3f4f6'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0
  },
  nav: {
    display: 'flex',
    gap: '4px'
  },
  navLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  navLinkActive: {
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.15)'
  },
  version: {
    fontSize: '12px',
    opacity: 0.8
  },
  main: {
    flex: 1,
    overflow: 'hidden'
  }
};

export default App;
