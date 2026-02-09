// CheckpointManager - Manages checkpoint definitions and state
import { v4 as uuidv4 } from 'uuid';

export class CheckpointManager {
  constructor() {
    this.checkpoints = [];
    this.templates = new Map();
  }

  // Create checkpoint from action description
  createCheckpoint(action, expectedResult, options = {}) {
    return {
      id: uuidv4(),
      action,
      expectedResult,
      element: options.element || null,
      fields: options.fields || [],
      status: 'pending',
      category: options.category || 'general',
      screenshot: {
        before: null,
        after: null
      },
      timing: {
        startedAt: null,
        completedAt: null
      },
      metadata: options.metadata || {}
    };
  }

  // Generate checkpoints from feature definition
  generateFromFeature(featureDefinition) {
    const checkpoints = [];

    // Parse user flows
    if (featureDefinition.userFlows) {
      featureDefinition.userFlows.forEach(flow => {
        flow.steps.forEach((step, index) => {
          checkpoints.push(this.createCheckpoint(
            step.action,
            step.expected,
            {
              element: step.element,
              fields: step.fields,
              category: flow.name,
              metadata: {
                flowName: flow.name,
                stepIndex: index + 1,
                role: flow.role
              }
            }
          ));
        });
      });
    }

    this.checkpoints = checkpoints;
    return checkpoints;
  }

  // Auto-detect fields on current page (for UI integration)
  detectPageFields(pageElements) {
    const fields = [];

    pageElements.forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        fields.push({
          name: el.name || el.id || el.placeholder,
          type: el.type || el.tagName.toLowerCase(),
          label: this.findLabelFor(el),
          required: el.required || false,
          value: el.value || null
        });
      }
      if (el.tagName === 'BUTTON' || (el.tagName === 'A' && el.role === 'button')) {
        fields.push({
          name: el.textContent?.trim() || el.id,
          type: 'button',
          label: el.textContent?.trim(),
          action: el.onclick ? 'click' : 'navigate'
        });
      }
    });

    return fields;
  }

  // Find label for form element
  findLabelFor(element) {
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent?.trim();
    }
    // Check parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent?.trim();

    return element.placeholder || element.name || null;
  }

  // Get checkpoint by ID
  getCheckpoint(id) {
    return this.checkpoints.find(cp => cp.id === id);
  }

  // Update checkpoint status
  updateCheckpointStatus(id, status, data = {}) {
    const checkpoint = this.getCheckpoint(id);
    if (checkpoint) {
      checkpoint.status = status;
      checkpoint.timing.completedAt = new Date().toISOString();
      Object.assign(checkpoint, data);
    }
    return checkpoint;
  }

  // Get checkpoints by status
  getCheckpointsByStatus(status) {
    return this.checkpoints.filter(cp => cp.status === status);
  }

  // Get checkpoint statistics
  getStatistics() {
    return {
      total: this.checkpoints.length,
      pending: this.getCheckpointsByStatus('pending').length,
      passed: this.getCheckpointsByStatus('passed').length,
      failed: this.getCheckpointsByStatus('failed').length,
      skipped: this.getCheckpointsByStatus('skipped').length
    };
  }

  // Save checkpoint template for reuse
  saveTemplate(name, checkpoints) {
    this.templates.set(name, checkpoints.map(cp => ({
      action: cp.action,
      expectedResult: cp.expectedResult,
      element: cp.element,
      fields: cp.fields,
      category: cp.category
    })));
  }

  // Load checkpoint template
  loadTemplate(name) {
    const template = this.templates.get(name);
    if (template) {
      return template.map(t => this.createCheckpoint(t.action, t.expectedResult, t));
    }
    return null;
  }

  // Export checkpoints as JSON
  exportCheckpoints() {
    return JSON.stringify(this.checkpoints, null, 2);
  }

  // Import checkpoints from JSON
  importCheckpoints(json) {
    try {
      this.checkpoints = JSON.parse(json);
      return true;
    } catch (e) {
      console.error('Failed to import checkpoints:', e);
      return false;
    }
  }
}

export default CheckpointManager;
