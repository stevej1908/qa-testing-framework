// PreFlightManager - Manages the collaborative pre-flight process
import { v4 as uuidv4 } from 'uuid';

export class PreFlightManager {
  constructor(config = {}) {
    this.config = config;
    this.currentPreFlight = null;
    this.questions = [];
    this.answers = [];
    this.ambiguities = [];
  }

  // Start a new pre-flight session
  startPreFlight(featureRequest) {
    this.currentPreFlight = {
      id: uuidv4(),
      startedAt: new Date().toISOString(),
      featureRequest: featureRequest,
      status: 'in-progress',
      questions: [],
      answers: [],
      ambiguities: [],
      summary: null,
      steps: [],
      approved: false
    };

    // Generate initial questions based on the request
    this.generateQuestions(featureRequest);

    return this.currentPreFlight;
  }

  // Generate questions based on feature request
  generateQuestions(featureRequest) {
    const questions = [];

    // Standard clarifying questions
    questions.push({
      id: uuidv4(),
      category: 'scope',
      question: 'What is the primary goal of this feature?',
      type: 'text',
      required: true,
      answered: false
    });

    questions.push({
      id: uuidv4(),
      category: 'users',
      question: 'Who will use this feature (which user roles)?',
      type: 'multi-select',
      options: ['Patient', 'Provider', 'Front Desk', 'Admin', 'Billing Staff'],
      required: true,
      answered: false
    });

    questions.push({
      id: uuidv4(),
      category: 'workflow',
      question: 'What are the main steps a user will take?',
      type: 'steps',
      required: true,
      answered: false
    });

    questions.push({
      id: uuidv4(),
      category: 'data',
      question: 'What data needs to be captured or displayed?',
      type: 'list',
      required: true,
      answered: false
    });

    questions.push({
      id: uuidv4(),
      category: 'validation',
      question: 'Are there any special validation rules or constraints?',
      type: 'text',
      required: false,
      answered: false
    });

    questions.push({
      id: uuidv4(),
      category: 'integration',
      question: 'Does this feature integrate with existing functionality?',
      type: 'text',
      required: false,
      answered: false
    });

    this.questions = questions;
    this.currentPreFlight.questions = questions;

    return questions;
  }

  // Check if this is a quick mode eligible change
  isQuickModeEligible(changeDescription) {
    const quickModePatterns = [
      /typo/i,
      /spelling/i,
      /copy change/i,
      /text change/i,
      /styling/i,
      /css/i,
      /color/i,
      /font/i,
      /spacing/i,
      /margin/i,
      /padding/i
    ];

    return quickModePatterns.some(pattern => pattern.test(changeDescription));
  }

  // Answer a question
  answerQuestion(questionId, answer) {
    const question = this.questions.find(q => q.id === questionId);
    if (question) {
      question.answered = true;
      question.answer = answer;
      question.answeredAt = new Date().toISOString();

      this.answers.push({
        questionId,
        category: question.category,
        question: question.question,
        answer,
        answeredAt: question.answeredAt
      });

      this.currentPreFlight.answers = this.answers;
    }
    return question;
  }

  // Flag an ambiguity
  flagAmbiguity(description, options = []) {
    const ambiguity = {
      id: uuidv4(),
      description,
      options,
      status: 'unresolved',
      resolution: null,
      flaggedAt: new Date().toISOString()
    };

    this.ambiguities.push(ambiguity);
    this.currentPreFlight.ambiguities = this.ambiguities;

    return ambiguity;
  }

  // Resolve an ambiguity
  resolveAmbiguity(ambiguityId, resolution) {
    const ambiguity = this.ambiguities.find(a => a.id === ambiguityId);
    if (ambiguity) {
      ambiguity.status = 'resolved';
      ambiguity.resolution = resolution;
      ambiguity.resolvedAt = new Date().toISOString();
    }
    return ambiguity;
  }

  // Check if pre-flight is complete
  isComplete() {
    const requiredAnswered = this.questions
      .filter(q => q.required)
      .every(q => q.answered);

    const ambiguitiesResolved = this.ambiguities
      .every(a => a.status === 'resolved');

    return requiredAnswered && ambiguitiesResolved;
  }

  // Get unanswered questions
  getUnansweredQuestions() {
    return this.questions.filter(q => !q.answered);
  }

  // Get unresolved ambiguities
  getUnresolvedAmbiguities() {
    return this.ambiguities.filter(a => a.status === 'unresolved');
  }

  // Generate summary from answers
  generateSummary() {
    const summary = {
      featureRequest: this.currentPreFlight.featureRequest,
      generatedAt: new Date().toISOString(),
      scope: this.getAnswerByCategory('scope'),
      users: this.getAnswerByCategory('users'),
      workflow: this.getAnswerByCategory('workflow'),
      data: this.getAnswerByCategory('data'),
      validation: this.getAnswerByCategory('validation'),
      integration: this.getAnswerByCategory('integration'),
      ambiguityResolutions: this.ambiguities.map(a => ({
        issue: a.description,
        resolution: a.resolution
      }))
    };

    this.currentPreFlight.summary = summary;
    return summary;
  }

  // Get answer by category
  getAnswerByCategory(category) {
    const answer = this.answers.find(a => a.category === category);
    return answer ? answer.answer : null;
  }

  // Generate test steps from workflow answer
  generateTestSteps() {
    const workflowAnswer = this.getAnswerByCategory('workflow');
    const steps = [];

    if (workflowAnswer && Array.isArray(workflowAnswer)) {
      workflowAnswer.forEach((step, index) => {
        steps.push({
          index: index + 1,
          action: step.action || step,
          expectedResult: step.expected || `Step ${index + 1} completes successfully`,
          element: step.element || null
        });
      });
    }

    this.currentPreFlight.steps = steps;
    return steps;
  }

  // Approve the pre-flight
  approve() {
    if (!this.isComplete()) {
      throw new Error('Cannot approve incomplete pre-flight. Answer all required questions and resolve ambiguities.');
    }

    this.generateSummary();
    this.generateTestSteps();

    this.currentPreFlight.approved = true;
    this.currentPreFlight.approvedAt = new Date().toISOString();
    this.currentPreFlight.status = 'approved';

    return this.currentPreFlight;
  }

  // Export pre-flight data
  exportPreFlight() {
    return {
      ...this.currentPreFlight,
      exportedAt: new Date().toISOString()
    };
  }

  // Load pre-flight from data
  loadPreFlight(data) {
    this.currentPreFlight = data;
    this.questions = data.questions || [];
    this.answers = data.answers || [];
    this.ambiguities = data.ambiguities || [];
    return this.currentPreFlight;
  }
}

export default PreFlightManager;
