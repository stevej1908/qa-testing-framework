// FeedbackCollector - Collects and structures feedback from testers
import { v4 as uuidv4 } from 'uuid';

export class FeedbackCollector {
  constructor() {
    this.feedback = [];
    this.categories = ['ui', 'logic', 'data', 'workflow', 'performance', 'accessibility', 'other'];
    this.priorities = ['blocker', 'nice-to-have'];
  }

  // Create structured feedback
  createFeedback(data) {
    const feedback = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      checkpointId: data.checkpointId || null,
      field: data.field || null,
      fieldPath: data.fieldPath || null,
      issue: data.issue || '',
      expected: data.expected || '',
      priority: data.priority || 'nice-to-have',
      category: data.category || 'other',
      screenshot: data.screenshot || null,
      status: 'open', // open, in-progress, resolved, wont-fix
      resolution: null,
      resolvedAt: null
    };

    this.feedback.push(feedback);
    return feedback;
  }

  // Get feedback form structure
  getFormStructure(availableFields = []) {
    return {
      fields: [
        {
          name: 'field',
          label: 'Field/Element',
          type: 'select-or-input',
          options: availableFields.map(f => ({ value: f.name, label: f.label || f.name })),
          placeholder: 'Select or type field name',
          required: false
        },
        {
          name: 'issue',
          label: "What's Wrong",
          type: 'textarea',
          placeholder: 'Describe the issue...',
          required: true
        },
        {
          name: 'expected',
          label: 'Expected Behavior',
          type: 'textarea',
          placeholder: 'What should happen instead...',
          required: true
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'radio',
          options: [
            { value: 'blocker', label: 'Blocker', description: 'Cannot proceed until fixed' },
            { value: 'nice-to-have', label: 'Nice-to-have', description: 'Log for later, continue testing' }
          ],
          required: true,
          default: 'nice-to-have'
        },
        {
          name: 'category',
          label: 'Category',
          type: 'select',
          options: this.categories.map(c => ({ value: c, label: this.formatCategory(c) })),
          required: false,
          default: 'other'
        }
      ]
    };
  }

  // Format category for display
  formatCategory(category) {
    const labels = {
      ui: 'UI/Visual',
      logic: 'Logic/Behavior',
      data: 'Data/Validation',
      workflow: 'Workflow/Navigation',
      performance: 'Performance',
      accessibility: 'Accessibility',
      other: 'Other'
    };
    return labels[category] || category;
  }

  // Validate feedback data
  validateFeedback(data) {
    const errors = [];

    if (!data.issue || data.issue.trim() === '') {
      errors.push({ field: 'issue', message: 'Issue description is required' });
    }

    if (!data.expected || data.expected.trim() === '') {
      errors.push({ field: 'expected', message: 'Expected behavior is required' });
    }

    if (!this.priorities.includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority level' });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get feedback by checkpoint
  getFeedbackByCheckpoint(checkpointId) {
    return this.feedback.filter(f => f.checkpointId === checkpointId);
  }

  // Get feedback by priority
  getFeedbackByPriority(priority) {
    return this.feedback.filter(f => f.priority === priority);
  }

  // Get all blockers
  getBlockers() {
    return this.getFeedbackByPriority('blocker');
  }

  // Get unresolved feedback
  getUnresolved() {
    return this.feedback.filter(f => f.status === 'open' || f.status === 'in-progress');
  }

  // Resolve feedback
  resolveFeedback(id, resolution) {
    const item = this.feedback.find(f => f.id === id);
    if (item) {
      item.status = 'resolved';
      item.resolution = resolution;
      item.resolvedAt = new Date().toISOString();
    }
    return item;
  }

  // Mark feedback as won't fix
  markWontFix(id, reason) {
    const item = this.feedback.find(f => f.id === id);
    if (item) {
      item.status = 'wont-fix';
      item.resolution = reason;
      item.resolvedAt = new Date().toISOString();
    }
    return item;
  }

  // Get feedback summary
  getSummary() {
    return {
      total: this.feedback.length,
      blockers: this.getBlockers().length,
      niceToHave: this.getFeedbackByPriority('nice-to-have').length,
      open: this.feedback.filter(f => f.status === 'open').length,
      resolved: this.feedback.filter(f => f.status === 'resolved').length,
      byCategory: this.categories.reduce((acc, cat) => {
        acc[cat] = this.feedback.filter(f => f.category === cat).length;
        return acc;
      }, {})
    };
  }

  // Export feedback
  exportFeedback() {
    return {
      exportedAt: new Date().toISOString(),
      summary: this.getSummary(),
      items: this.feedback
    };
  }

  // Clear all feedback
  clear() {
    this.feedback = [];
  }
}

export default FeedbackCollector;
