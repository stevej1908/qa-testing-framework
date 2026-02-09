// PreFlightInterview - Collaborative pre-flight interview interface
import React, { useState, useEffect } from 'react';
import { useTestingContext } from './TestingFrameworkProvider';

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '4px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280'
  },
  questionCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px'
  },
  questionNumber: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600'
  },
  questionCategory: {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  questionText: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical'
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  checkboxLabelSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  stepsList: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fff'
  },
  stepNumber: {
    color: '#6b7280',
    fontWeight: '600',
    width: '24px'
  },
  stepInput: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px'
  },
  addStepButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f9fafb',
    border: 'none',
    color: '#3b82f6',
    fontSize: '14px',
    cursor: 'pointer'
  },
  answered: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  required: {
    color: '#ef4444'
  },
  ambiguityAlert: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px'
  },
  ambiguityTitle: {
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '8px'
  },
  ambiguityText: {
    fontSize: '14px',
    color: '#78350f'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px'
  },
  completeButton: {
    padding: '12px 24px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  completeButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  progressInfo: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '16px'
  }
};

export const PreFlightInterview = () => {
  const {
    preFlight,
    startPreFlight,
    answerPreFlightQuestion,
    completePreFlight,
    session,
    managers
  } = useTestingContext();

  const [answers, setAnswers] = useState({});
  const [steps, setSteps] = useState([{ action: '', expected: '' }]);

  useEffect(() => {
    if (session && !preFlight) {
      startPreFlight(session.featureName);
    }
  }, [session, preFlight, startPreFlight]);

  const questions = managers.preFlightManager.questions || [];

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    answerPreFlightQuestion(questionId, value);
  };

  const handleMultiSelect = (questionId, option, checked) => {
    const current = answers[questionId] || [];
    let updated;
    if (checked) {
      updated = [...current, option];
    } else {
      updated = current.filter(o => o !== option);
    }
    handleAnswer(questionId, updated);
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);

    // Update the workflow answer
    const workflowQuestion = questions.find(q => q.category === 'workflow');
    if (workflowQuestion) {
      handleAnswer(workflowQuestion.id, newSteps.filter(s => s.action.trim()));
    }
  };

  const addStep = () => {
    setSteps([...steps, { action: '', expected: '' }]);
  };

  const removeStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  const isComplete = () => {
    return questions
      .filter(q => q.required)
      .every(q => {
        const answer = answers[q.id];
        if (Array.isArray(answer)) return answer.length > 0;
        if (typeof answer === 'string') return answer.trim() !== '';
        return !!answer;
      });
  };

  const handleComplete = async () => {
    try {
      await completePreFlight();
    } catch (error) {
      alert('Error completing pre-flight: ' + error.message);
    }
  };

  const answeredCount = questions.filter(q => {
    const answer = answers[q.id];
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'string') return answer.trim() !== '';
    return !!answer;
  }).length;

  const renderQuestionInput = (question) => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            style={styles.textarea}
            placeholder="Enter your answer..."
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
          />
        );

      case 'multi-select':
        return (
          <div style={styles.checkboxGroup}>
            {question.options?.map((option, i) => {
              const isSelected = (answers[question.id] || []).includes(option);
              return (
                <label
                  key={i}
                  style={{
                    ...styles.checkboxLabel,
                    ...(isSelected ? styles.checkboxLabelSelected : {})
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleMultiSelect(question.id, option, e.target.checked)}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        );

      case 'steps':
        return (
          <div style={styles.stepsList}>
            {steps.map((step, index) => (
              <div key={index} style={styles.stepItem}>
                <span style={styles.stepNumber}>{index + 1}.</span>
                <input
                  style={styles.stepInput}
                  placeholder="User action..."
                  value={step.action}
                  onChange={(e) => handleStepChange(index, 'action', e.target.value)}
                />
                <input
                  style={styles.stepInput}
                  placeholder="Expected result..."
                  value={step.expected}
                  onChange={(e) => handleStepChange(index, 'expected', e.target.value)}
                />
                {steps.length > 1 && (
                  <button
                    onClick={() => removeStep(index)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button style={styles.addStepButton} onClick={addStep}>
              + Add Step
            </button>
          </div>
        );

      case 'list':
        return (
          <textarea
            style={styles.textarea}
            placeholder="Enter items, one per line..."
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
          />
        );

      default:
        return (
          <input
            style={styles.input}
            placeholder="Enter your answer..."
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
          />
        );
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Pre-Flight Interview</h2>
        <p style={styles.subtitle}>
          Let's clarify the requirements before implementation
        </p>
      </div>

      <div style={styles.progressInfo}>
        Answered {answeredCount} of {questions.length} questions
        {questions.filter(q => q.required).length > 0 && (
          <span> ({questions.filter(q => q.required).length} required)</span>
        )}
      </div>

      {questions.map((question, index) => {
        const isAnswered = (() => {
          const answer = answers[question.id];
          if (Array.isArray(answer)) return answer.length > 0;
          if (typeof answer === 'string') return answer.trim() !== '';
          return !!answer;
        })();

        return (
          <div
            key={question.id}
            style={{
              ...styles.questionCard,
              ...(isAnswered ? styles.answered : {})
            }}
          >
            <div style={styles.questionHeader}>
              <div style={styles.questionNumber}>{index + 1}</div>
              <span style={styles.questionCategory}>{question.category}</span>
              {question.required && <span style={styles.required}>*</span>}
            </div>
            <div style={styles.questionText}>{question.question}</div>
            {renderQuestionInput(question)}
          </div>
        );
      })}

      <div style={styles.buttonRow}>
        <button
          style={{
            ...styles.completeButton,
            ...(isComplete() ? {} : styles.completeButtonDisabled)
          }}
          onClick={handleComplete}
          disabled={!isComplete()}
        >
          Complete Pre-Flight & Start Testing
        </button>
      </div>
    </div>
  );
};

export default PreFlightInterview;
