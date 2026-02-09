// SplitScreenLayout - Main layout component with app on top, controls on bottom
import React, { useState } from 'react';
import { useTestingContext } from './TestingFrameworkProvider';
import TestControlPanel from './TestControlPanel';

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 9999,
    backgroundColor: '#f5f5f5'
  },
  appContainer: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
    backgroundColor: '#fff'
  },
  controlsContainer: {
    height: '320px',
    minHeight: '200px',
    maxHeight: '50vh',
    borderTop: '3px solid #3b82f6',
    backgroundColor: '#fff',
    boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column'
  },
  resizeHandle: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    cursor: 'ns-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resizeBar: {
    width: '40px',
    height: '4px',
    backgroundColor: '#9ca3af',
    borderRadius: '2px'
  },
  minimizedBar: {
    height: '48px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    cursor: 'pointer'
  },
  minimizedText: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  expandButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export const SplitScreenLayout = ({ children }) => {
  const { isActive, status, progress, currentCheckpoint } = useTestingContext();
  const [isMinimized, setIsMinimized] = useState(false);
  const [controlsHeight, setControlsHeight] = useState(320);

  // Handle resize
  const handleResizeStart = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = controlsHeight;

    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 200), window.innerHeight * 0.5);
      setControlsHeight(newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isActive) {
    return <>{children}</>;
  }

  if (isMinimized) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.appContainer, height: 'calc(100% - 48px)' }}>
          {children}
        </div>
        <div style={styles.minimizedBar} onClick={() => setIsMinimized(false)}>
          <div style={styles.minimizedText}>
            <span>🧪</span>
            <span>Testing: {status}</span>
            {progress.total > 0 && (
              <span>({progress.current}/{progress.total})</span>
            )}
          </div>
          <button style={styles.expandButton}>
            Expand ↑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Application area */}
      <div style={{ ...styles.appContainer, height: `calc(100% - ${controlsHeight}px)` }}>
        {children}
      </div>

      {/* Controls area */}
      <div style={{ ...styles.controlsContainer, height: `${controlsHeight}px` }}>
        {/* Resize handle */}
        <div style={styles.resizeHandle} onMouseDown={handleResizeStart}>
          <div style={styles.resizeBar} />
        </div>

        {/* Test controls */}
        <TestControlPanel onMinimize={() => setIsMinimized(true)} />
      </div>
    </div>
  );
};

export default SplitScreenLayout;
