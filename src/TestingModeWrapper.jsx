// TestingModeWrapper - Wrap your application with this for testing mode
import React, { useState, useEffect } from 'react';
import { TestingFrameworkProvider } from './ui/TestingFrameworkProvider';
import { SplitScreenLayout } from './ui/SplitScreenLayout';

// Default configuration
const defaultConfig = {
  captureMethod: 'html2canvas',
  storageKey: 'testing-framework-sessions'
};

/**
 * TestingModeWrapper - Wrap your application to enable testing mode
 *
 * Usage:
 *
 * import TestingModeWrapper from './testing-framework/src/TestingModeWrapper';
 *
 * function App() {
 *   return (
 *     <TestingModeWrapper enabled={isTestingMode}>
 *       <YourApp />
 *     </TestingModeWrapper>
 *   );
 * }
 *
 * Or activate via URL parameter: ?testing=true
 */
export const TestingModeWrapper = ({
  children,
  enabled = false,
  config = {},
  onSessionComplete = null
}) => {
  const [isTestingMode, setIsTestingMode] = useState(enabled);

  // Check URL for testing parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const testingParam = urlParams.get('testing');
    if (testingParam === 'true') {
      setIsTestingMode(true);
    }
  }, []);

  // Keyboard shortcut to toggle testing mode (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        setIsTestingMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mergedConfig = { ...defaultConfig, ...config };

  if (!isTestingMode) {
    return children;
  }

  return (
    <TestingFrameworkProvider config={mergedConfig}>
      <SplitScreenLayout>
        {children}
      </SplitScreenLayout>
    </TestingFrameworkProvider>
  );
};

export default TestingModeWrapper;
