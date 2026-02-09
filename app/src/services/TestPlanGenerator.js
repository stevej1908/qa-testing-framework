/**
 * TestPlanGenerator - Validates test specs and mappings against code
 *
 * Ensures test specifications reference existing code components
 * and checkpoint mappings are valid for the current codebase.
 */

class TestPlanGenerator {
  constructor(repoAnalyzer = null) {
    this.repoAnalyzer = repoAnalyzer;
    this.checkpointMappings = null;
    this.specsCache = new Map();
  }

  /**
   * Load checkpoint mappings from config
   * @param {Object} mappings - Checkpoint to steps mapping
   */
  setCheckpointMappings(mappings) {
    this.checkpointMappings = mappings;
  }

  /**
   * Validate a test spec against the current codebase
   * @param {string} specId - Spec identifier
   * @param {Object} spec - Spec content with checkpoints
   * @returns {Promise<Object>} Validation result
   */
  async validateSpec(specId, spec) {
    const validation = {
      specId,
      valid: true,
      errors: [],
      warnings: [],
      checkpoints: {
        total: 0,
        valid: 0,
        stale: 0,
        unmapped: 0
      }
    };

    if (!spec || !spec.checkpoints) {
      validation.valid = false;
      validation.errors.push({
        type: 'INVALID_SPEC',
        message: 'Spec is missing or has no checkpoints'
      });
      return validation;
    }

    validation.checkpoints.total = spec.checkpoints.length;

    for (const checkpoint of spec.checkpoints) {
      const checkpointValidation = await this._validateCheckpoint(checkpoint, specId);

      if (checkpointValidation.valid) {
        validation.checkpoints.valid++;
      } else {
        if (checkpointValidation.stale) {
          validation.checkpoints.stale++;
          validation.warnings.push({
            type: 'STALE_CHECKPOINT',
            checkpointId: checkpoint.id,
            message: checkpointValidation.message
          });
        } else if (checkpointValidation.unmapped) {
          validation.checkpoints.unmapped++;
          validation.warnings.push({
            type: 'UNMAPPED_CHECKPOINT',
            checkpointId: checkpoint.id,
            message: `Checkpoint ${checkpoint.id} has no automation mapping`
          });
        } else {
          validation.errors.push({
            type: 'INVALID_CHECKPOINT',
            checkpointId: checkpoint.id,
            message: checkpointValidation.message
          });
        }
      }
    }

    // Spec is invalid if there are critical errors
    if (validation.errors.length > 0) {
      validation.valid = false;
    }

    // Warning if more than 30% of checkpoints are stale or unmapped
    const problemRatio = (validation.checkpoints.stale + validation.checkpoints.unmapped) /
                         validation.checkpoints.total;
    if (problemRatio > 0.3) {
      validation.warnings.push({
        type: 'HIGH_STALE_RATIO',
        message: `${Math.round(problemRatio * 100)}% of checkpoints may be stale or unmapped`
      });
    }

    return validation;
  }

  /**
   * Find stale checkpoints that reference removed features
   * @param {string} specId - Spec identifier
   * @param {Object} spec - Spec content
   * @returns {Promise<Array>} Array of stale checkpoint details
   */
  async findStaleCheckpoints(specId, spec) {
    const staleCheckpoints = [];

    if (!spec || !spec.checkpoints) {
      return staleCheckpoints;
    }

    for (const checkpoint of spec.checkpoints) {
      const validation = await this._validateCheckpoint(checkpoint, specId);
      if (validation.stale) {
        staleCheckpoints.push({
          id: checkpoint.id,
          action: checkpoint.action,
          reason: validation.message,
          referencedFiles: validation.referencedFiles || [],
          suggestedAction: this._suggestStaleAction(checkpoint, validation)
        });
      }
    }

    return staleCheckpoints;
  }

  /**
   * Validate checkpoint mappings against current code
   * @returns {Promise<Object>} Mapping validation results
   */
  async validateCheckpointMappings() {
    const validation = {
      valid: true,
      mappings: {
        total: 0,
        valid: 0,
        invalid: 0
      },
      issues: []
    };

    if (!this.checkpointMappings) {
      validation.valid = false;
      validation.issues.push({
        type: 'NO_MAPPINGS',
        message: 'No checkpoint mappings loaded'
      });
      return validation;
    }

    for (const [checkpointId, mapping] of Object.entries(this.checkpointMappings)) {
      validation.mappings.total++;

      const mappingValidation = await this._validateMapping(checkpointId, mapping);

      if (mappingValidation.valid) {
        validation.mappings.valid++;
      } else {
        validation.mappings.invalid++;
        validation.issues.push({
          checkpointId,
          ...mappingValidation
        });
      }
    }

    if (validation.mappings.invalid > 0) {
      validation.valid = false;
    }

    return validation;
  }

  /**
   * Generate a test plan for a spec
   * @param {string} specId - Spec identifier
   * @param {Object} spec - Spec content
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated test plan
   */
  async generateTestPlan(specId, spec, options = {}) {
    const plan = {
      specId,
      generatedAt: new Date().toISOString(),
      checkpoints: [],
      totalSteps: 0,
      automatedSteps: 0,
      manualSteps: 0,
      estimatedDuration: 0,
      prerequisites: [],
      warnings: []
    };

    if (!spec || !spec.checkpoints) {
      return plan;
    }

    // Collect prerequisites from all checkpoints
    const loginRequired = spec.checkpoints.some(cp =>
      cp.action?.toLowerCase().includes('login') ||
      cp.id?.toLowerCase().includes('login')
    );

    if (loginRequired) {
      plan.prerequisites.push({
        type: 'authentication',
        description: 'Valid test user credentials required'
      });
    }

    // Process each checkpoint
    for (const checkpoint of spec.checkpoints) {
      const checkpointPlan = this._planCheckpoint(checkpoint);
      plan.checkpoints.push(checkpointPlan);
      plan.totalSteps += checkpointPlan.steps.length;
      plan.automatedSteps += checkpointPlan.automatedSteps;
      plan.manualSteps += checkpointPlan.manualSteps;

      // Estimate 30 seconds per automated step, 60 seconds per manual step
      plan.estimatedDuration += checkpointPlan.automatedSteps * 30 +
                               checkpointPlan.manualSteps * 60;

      if (checkpointPlan.warnings.length > 0) {
        plan.warnings.push(...checkpointPlan.warnings.map(w => ({
          ...w,
          checkpointId: checkpoint.id
        })));
      }
    }

    return plan;
  }

  /**
   * Check if a spec exists and can be loaded
   * @param {string} specId - Spec identifier
   * @param {Object} specMeta - Optional spec metadata from FeatureSelector
   * @returns {Promise<boolean>} True if spec exists
   */
  async specExists(specId, specMeta = null) {
    // If we have spec metadata from FeatureSelector, it exists in the known specs list
    if (specMeta && specMeta.id && specMeta.name) {
      return true;
    }

    // Check cache
    if (this.specsCache.has(specId)) {
      return true;
    }

    // Known spec IDs from FeatureSelector (fallback when GitHub not connected)
    const knownSpecIds = [
      'auth-login', 'auth-roles', 'patient-mgmt', 'provider-mgmt',
      'session-docs', 'billing-claims', 'front-desk-ops', 'appointments',
      'prescriptions', 'insurance', 'patient-portal', 'mobile',
      'admin-config', 'intake-forms', 'practice-setup'
    ];

    if (knownSpecIds.includes(specId)) {
      return true;
    }

    // Check via repo analyzer if available (for dynamic/custom specs)
    if (this.repoAnalyzer) {
      try {
        const specPaths = [
          `testing-framework/specs/${specId}.spec.md`,
          `testing-framework/app/public/specs/${specId}.spec.md`,
          `specs/${specId}.spec.md`
        ];

        for (const path of specPaths) {
          try {
            await this.repoAnalyzer.getFileContent(path);
            return true;
          } catch {
            // Try next path
          }
        }
      } catch {
        // Fall through
      }
    }

    return false;
  }

  // Private methods

  async _validateCheckpoint(checkpoint, specId) {
    const result = {
      valid: true,
      stale: false,
      unmapped: false,
      message: null,
      referencedFiles: []
    };

    // Check if checkpoint has required fields
    if (!checkpoint.id) {
      result.valid = false;
      result.message = 'Checkpoint missing ID';
      return result;
    }

    // Check if checkpoint has mapping
    if (this.checkpointMappings) {
      const mapping = this.checkpointMappings[checkpoint.id];
      if (!mapping) {
        result.unmapped = true;
        // Unmapped is not invalid, just informational
      }
    }

    // Check for stale references using repo analyzer
    if (this.repoAnalyzer && Array.isArray(checkpoint.references)) {
      for (const ref of checkpoint.references) {
        try {
          await this.repoAnalyzer.getFileContent(ref);
          result.referencedFiles.push({ path: ref, exists: true });
        } catch {
          result.referencedFiles.push({ path: ref, exists: false });
          result.stale = true;
          result.message = `Referenced file not found: ${ref}`;
        }
      }
    }

    // Check for common stale patterns in checkpoint content
    const stalePatterns = [
      { pattern: /TODO|FIXME|DEPRECATED/i, message: 'Checkpoint may contain stale markers' },
      { pattern: /removed|deleted|obsolete/i, message: 'Checkpoint may reference removed feature' }
    ];

    const content = `${checkpoint.action || ''} ${checkpoint.description || ''}`;
    for (const { pattern, message } of stalePatterns) {
      if (pattern.test(content)) {
        result.stale = true;
        result.message = message;
        break;
      }
    }

    return result;
  }

  async _validateMapping(checkpointId, mapping) {
    const result = {
      valid: true,
      message: null,
      steps: []
    };

    if (!Array.isArray(mapping)) {
      result.valid = false;
      result.message = 'Mapping must be an array of steps';
      return result;
    }

    if (mapping.length === 0) {
      result.valid = false;
      result.message = 'Mapping has no steps';
      return result;
    }

    for (const step of mapping) {
      if (!step.stepId) {
        result.valid = false;
        result.message = 'Step missing stepId';
        return result;
      }

      result.steps.push({
        stepId: step.stepId,
        hasParams: !!step.params
      });
    }

    return result;
  }

  _planCheckpoint(checkpoint) {
    const plan = {
      id: checkpoint.id,
      action: checkpoint.action,
      description: checkpoint.description,
      steps: [],
      automatedSteps: 0,
      manualSteps: 0,
      warnings: []
    };

    // Get mapping if available
    const mapping = this.checkpointMappings?.[checkpoint.id];

    if (mapping && Array.isArray(mapping)) {
      for (const step of mapping) {
        plan.steps.push({
          type: 'automated',
          stepId: step.stepId,
          params: step.params
        });
        plan.automatedSteps++;
      }
    } else {
      // No mapping - this is a manual checkpoint
      plan.steps.push({
        type: 'manual',
        description: checkpoint.action || checkpoint.description
      });
      plan.manualSteps++;
      plan.warnings.push({
        type: 'NO_AUTOMATION',
        message: 'This checkpoint requires manual verification'
      });
    }

    // Check for expected items that need verification
    if (checkpoint.expectedItems && checkpoint.expectedItems.length > 0) {
      plan.steps.push({
        type: 'verification',
        items: checkpoint.expectedItems
      });
    }

    return plan;
  }

  _suggestStaleAction(checkpoint, validation) {
    if (validation.referencedFiles?.some(f => !f.exists)) {
      return 'Update checkpoint references to current file paths';
    }

    if (validation.message?.includes('removed')) {
      return 'Consider removing this checkpoint or updating for new implementation';
    }

    return 'Review checkpoint for accuracy against current codebase';
  }
}

export default TestPlanGenerator;
