import React, { useRef, useState, useEffect } from 'react';

/**
 * TargetFrame - Renders the target application in an iframe
 *
 * Note: Due to browser security (same-origin policy), we cannot directly
 * access the iframe content for cross-origin URLs. Screenshots will need
 * to be captured via other means (browser extension, manual upload, etc.)
 */
const TargetFrame = ({ url, onLoad, onError }) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [url]);

  const handleLoad = () => {
    setLoading(false);
    if (onLoad) {
      onLoad(iframeRef.current);
    }
  };

  const handleError = (e) => {
    setLoading(false);
    const errorMsg = 'Failed to load target application. This may be due to X-Frame-Options or CSP restrictions.';
    setError(errorMsg);
    if (onError) {
      onError(errorMsg);
    }
  };

  if (!url) {
    return (
      <div style={styles.placeholder}>
        <p>No target URL specified</p>
        <p style={styles.hint}>Go to Setup to enter a target application URL</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner}></div>
          <p>Loading target application...</p>
        </div>
      )}
      {error && (
        <div style={styles.errorOverlay}>
          <p style={styles.errorText}>{error}</p>
          <p style={styles.errorHint}>
            If the target app blocks iframes, you can open it in a new tab
            and manually verify checkpoints.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.openLink}
          >
            Open in new tab
          </a>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        style={{
          ...styles.iframe,
          display: error ? 'none' : 'block'
        }}
        title="Target Application"
        onLoad={handleLoad}
        onError={handleError}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none'
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    color: '#6b7280'
  },
  hint: {
    fontSize: '14px',
    marginTop: '8px'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 10
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    padding: '24px',
    textAlign: 'center'
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '500',
    marginBottom: '8px'
  },
  errorHint: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '16px',
    maxWidth: '400px'
  },
  openLink: {
    color: '#1e40af',
    textDecoration: 'none',
    padding: '8px 16px',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
    fontWeight: '500'
  }
};

// Add keyframe animation via style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default TargetFrame;
