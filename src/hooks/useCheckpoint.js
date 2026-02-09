// useCheckpoint - Hook for managing individual checkpoints
import { useState, useCallback } from 'react';

export const useCheckpoint = (checkpointManager) => {
  const [currentCheckpoint, setCurrentCheckpoint] = useState(null);
  const [checkpointHistory, setCheckpointHistory] = useState([]);

  const createCheckpoint = useCallback((action, expectedResult, options = {}) => {
    const checkpoint = checkpointManager.createCheckpoint(action, expectedResult, options);
    setCurrentCheckpoint(checkpoint);
    return checkpoint;
  }, [checkpointManager]);

  const approveCheckpoint = useCallback((notes = null) => {
    if (currentCheckpoint) {
      const updated = checkpointManager.updateCheckpointStatus(
        currentCheckpoint.id,
        'passed',
        { notes }
      );
      setCheckpointHistory(prev => [...prev, updated]);
      setCurrentCheckpoint(null);
      return updated;
    }
    return null;
  }, [currentCheckpoint, checkpointManager]);

  const rejectCheckpoint = useCallback((feedback) => {
    if (currentCheckpoint) {
      const updated = checkpointManager.updateCheckpointStatus(
        currentCheckpoint.id,
        'failed',
        { feedback }
      );
      setCheckpointHistory(prev => [...prev, updated]);
      setCurrentCheckpoint(null);
      return updated;
    }
    return null;
  }, [currentCheckpoint, checkpointManager]);

  const skipCheckpoint = useCallback(() => {
    if (currentCheckpoint) {
      const updated = checkpointManager.updateCheckpointStatus(
        currentCheckpoint.id,
        'skipped'
      );
      setCheckpointHistory(prev => [...prev, updated]);
      setCurrentCheckpoint(null);
      return updated;
    }
    return null;
  }, [currentCheckpoint, checkpointManager]);

  const getStatistics = useCallback(() => {
    return checkpointManager.getStatistics();
  }, [checkpointManager]);

  return {
    currentCheckpoint,
    checkpointHistory,
    createCheckpoint,
    approveCheckpoint,
    rejectCheckpoint,
    skipCheckpoint,
    getStatistics
  };
};

export default useCheckpoint;
