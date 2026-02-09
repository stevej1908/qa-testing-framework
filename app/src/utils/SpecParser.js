/**
 * SpecParser - Parses .spec.md markdown files into structured checkpoint objects
 */

/**
 * Parse a complete spec markdown file
 * @param {string} markdown - Raw markdown content
 * @returns {Object} Parsed spec object
 */
export function parseSpecMarkdown(markdown) {
  const spec = {
    id: '',
    name: '',
    version: '',
    lastUpdated: '',
    overview: '',
    preFlightRequirements: {
      environment: [],
      testData: []
    },
    checkpoints: [],
    acceptanceCriteria: [],
    apiEndpoints: [],
    errorCodes: []
  };

  // Extract feature ID
  const idMatch = markdown.match(/## Feature ID:\s*(.+)/);
  if (idMatch) spec.id = idMatch[1].trim();

  // Extract name from title
  const titleMatch = markdown.match(/# TF Spec:\s*(.+)/);
  if (titleMatch) spec.name = titleMatch[1].trim();

  // Extract version
  const versionMatch = markdown.match(/## Version:\s*(.+)/);
  if (versionMatch) spec.version = versionMatch[1].trim();

  // Extract last updated
  const updatedMatch = markdown.match(/## Last Updated:\s*(.+)/);
  if (updatedMatch) spec.lastUpdated = updatedMatch[1].trim();

  // Extract overview
  const overviewMatch = markdown.match(/## Overview\s*\n+([^#]+?)(?=\n---|\n##)/s);
  if (overviewMatch) spec.overview = overviewMatch[1].trim();

  // Extract checkpoints
  spec.checkpoints = parseCheckpoints(markdown);

  // Extract acceptance criteria
  spec.acceptanceCriteria = parseAcceptanceCriteria(markdown);

  // Extract API endpoints
  spec.apiEndpoints = parseApiEndpoints(markdown);

  return spec;
}

/**
 * Parse checkpoints from markdown
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Array of checkpoint objects
 */
function parseCheckpoints(markdown) {
  const checkpoints = [];

  // Find the Checkpoints section
  const checkpointsSection = markdown.match(/## Checkpoints\s*\n([\s\S]*?)(?=\n---|\n## [A-Z])/);
  if (!checkpointsSection) return checkpoints;

  const content = checkpointsSection[1];

  // Split by checkpoint headers - supports both formats:
  // - ### CP-XXX: Title (legacy format)
  // - ### feature-name-N: Title (new format like front-desk-1)
  const cpMatches = content.split(/(?=### [\w-]+:)/);

  for (const cpBlock of cpMatches) {
    if (!cpBlock.trim() || !cpBlock.startsWith('### ')) continue;

    const checkpoint = parseCheckpointBlock(cpBlock);
    if (checkpoint) {
      checkpoints.push(checkpoint);
    }
  }

  return checkpoints;
}

/**
 * Parse a single checkpoint block
 * @param {string} block - Checkpoint markdown block
 * @returns {Object} Checkpoint object
 */
function parseCheckpointBlock(block) {
  // Extract ID and title - supports both formats:
  // - ### CP-XXX: Title (legacy)
  // - ### feature-name-N: Title (new format)
  const headerMatch = block.match(/### ([\w-]+):\s*(.+)/);
  if (!headerMatch) return null;

  const checkpoint = {
    id: headerMatch[1],
    action: headerMatch[2].trim(),
    description: '',
    steps: [],
    expectedResult: '',
    expectedItems: [],
    codeReferences: []
  };

  // Extract description
  const descMatch = block.match(/\*\*Description:\*\*\s*(.+?)(?=\*\*Steps|\*\*Expected|\n###|$)/s);
  if (descMatch) {
    checkpoint.description = descMatch[1].trim();
  }

  // Extract steps
  const stepsMatch = block.match(/\*\*Steps:\*\*\s*\n([\s\S]*?)(?=\*\*Expected|\*\*Code|$)/);
  if (stepsMatch) {
    const stepsContent = stepsMatch[1];
    const stepLines = stepsContent.match(/^\d+\.\s*(.+)$/gm);
    if (stepLines) {
      checkpoint.steps = stepLines.map(line => line.replace(/^\d+\.\s*/, '').trim());
    }
  }

  // Extract expected results
  const expectedMatch = block.match(/\*\*Expected:\*\*\s*\n?([\s\S]*?)(?=\*\*Code|### [\w-]+:|$)/);
  if (expectedMatch) {
    const expectedContent = expectedMatch[1].trim();
    // Get bullet points
    const bulletLines = expectedContent.match(/^-\s*(.+)$/gm);
    if (bulletLines) {
      checkpoint.expectedItems = bulletLines.map(line => line.replace(/^-\s*/, '').trim());
      checkpoint.expectedResult = checkpoint.expectedItems.join('; ');
    } else {
      checkpoint.expectedResult = expectedContent;
    }
  }

  // Extract code references
  const codeMatch = block.match(/\*\*Code References:\*\*\s*\n([\s\S]*?)(?=### [\w-]+:|$)/);
  if (codeMatch) {
    const codeContent = codeMatch[1];
    const codeLines = codeContent.match(/^-\s*`(.+?)`/gm);
    if (codeLines) {
      checkpoint.codeReferences = codeLines.map(line => {
        const match = line.match(/`(.+?)`/);
        return match ? match[1] : '';
      }).filter(Boolean);
    }
  }

  return checkpoint;
}

/**
 * Parse acceptance criteria from markdown
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Array of acceptance criteria strings
 */
function parseAcceptanceCriteria(markdown) {
  const criteria = [];

  const acMatch = markdown.match(/## Acceptance Criteria\s*\n([\s\S]*?)(?=\n---|\n## [A-Z])/);
  if (!acMatch) return criteria;

  const content = acMatch[1];
  const lines = content.match(/^-\s*\[.\]\s*(.+)$/gm);
  if (lines) {
    return lines.map(line => {
      const match = line.match(/^-\s*\[(.)\]\s*(.+)$/);
      return {
        checked: match ? match[1] === 'x' : false,
        text: match ? match[2].trim() : line.replace(/^-\s*\[.\]\s*/, '').trim()
      };
    });
  }

  return criteria;
}

/**
 * Parse API endpoints from markdown table
 * @param {string} markdown - Raw markdown content
 * @returns {Array} Array of endpoint objects
 */
function parseApiEndpoints(markdown) {
  const endpoints = [];

  const apiMatch = markdown.match(/## API Endpoints\s*\n([\s\S]*?)(?=\n---|\n## [A-Z])/);
  if (!apiMatch) return endpoints;

  const content = apiMatch[1];
  const rows = content.match(/^\|[^|]+\|[^|]+\|[^|]+\|$/gm);
  if (!rows) return endpoints;

  // Skip header and separator rows
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 3) {
      endpoints.push({
        endpoint: cells[0],
        method: cells[1],
        description: cells[2]
      });
    }
  }

  return endpoints;
}

/**
 * Validate a parsed spec object
 * @param {Object} spec - Parsed spec object
 * @returns {Object} Validation result with isValid and errors
 */
export function validateSpec(spec) {
  const errors = [];

  if (!spec.id) errors.push('Missing feature ID');
  if (!spec.name) errors.push('Missing feature name');
  if (!spec.checkpoints || spec.checkpoints.length === 0) {
    errors.push('No checkpoints found');
  }

  // Validate each checkpoint
  spec.checkpoints.forEach((cp, index) => {
    if (!cp.id) errors.push(`Checkpoint ${index + 1}: Missing ID`);
    if (!cp.action) errors.push(`Checkpoint ${cp.id || index + 1}: Missing action/title`);
    if (!cp.expectedResult && cp.expectedItems.length === 0) {
      errors.push(`Checkpoint ${cp.id || index + 1}: Missing expected result`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default { parseSpecMarkdown, validateSpec };
