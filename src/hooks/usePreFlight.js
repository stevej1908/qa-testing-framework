// usePreFlight - Hook for managing pre-flight interviews
import { useState, useCallback } from 'react';

export const usePreFlight = (preFlightManager) => {
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const startPreFlight = useCallback((featureRequest) => {
    const preFlight = preFlightManager.startPreFlight(featureRequest);
    setQuestions(preFlight.questions || []);
    setIsActive(true);
    setCurrentQuestionIndex(0);
    setIsComplete(false);
    return preFlight;
  }, [preFlightManager]);

  const answerQuestion = useCallback((questionId, answer) => {
    preFlightManager.answerQuestion(questionId, answer);
    setQuestions([...preFlightManager.questions]);

    // Check if complete
    if (preFlightManager.isComplete()) {
      setIsComplete(true);
    }
  }, [preFlightManager]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const flagAmbiguity = useCallback((description, options = []) => {
    return preFlightManager.flagAmbiguity(description, options);
  }, [preFlightManager]);

  const resolveAmbiguity = useCallback((ambiguityId, resolution) => {
    return preFlightManager.resolveAmbiguity(ambiguityId, resolution);
  }, [preFlightManager]);

  const approve = useCallback(() => {
    if (!preFlightManager.isComplete()) {
      throw new Error('Pre-flight is not complete');
    }
    const approved = preFlightManager.approve();
    setIsActive(false);
    return approved;
  }, [preFlightManager]);

  const getCurrentQuestion = useCallback(() => {
    return questions[currentQuestionIndex] || null;
  }, [questions, currentQuestionIndex]);

  const getProgress = useCallback(() => {
    const answered = questions.filter(q => q.answered).length;
    return {
      current: currentQuestionIndex + 1,
      total: questions.length,
      answered,
      percentage: Math.round((answered / questions.length) * 100)
    };
  }, [questions, currentQuestionIndex]);

  return {
    isActive,
    isComplete,
    questions,
    currentQuestionIndex,
    startPreFlight,
    answerQuestion,
    nextQuestion,
    previousQuestion,
    flagAmbiguity,
    resolveAmbiguity,
    approve,
    getCurrentQuestion,
    getProgress
  };
};

export default usePreFlight;
