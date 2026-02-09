// TestingFrameworkProvider - Context provider for the testing framework
import React, { createContext, useContext } from 'react';
import { useTestingFramework } from '../hooks/useTestingFramework';

const TestingFrameworkContext = createContext(null);

export const useTestingContext = () => {
  const context = useContext(TestingFrameworkContext);
  if (!context) {
    throw new Error('useTestingContext must be used within TestingFrameworkProvider');
  }
  return context;
};

export const TestingFrameworkProvider = ({ children, config = {} }) => {
  const framework = useTestingFramework(config);

  return (
    <TestingFrameworkContext.Provider value={framework}>
      {children}
    </TestingFrameworkContext.Provider>
  );
};

export default TestingFrameworkProvider;
