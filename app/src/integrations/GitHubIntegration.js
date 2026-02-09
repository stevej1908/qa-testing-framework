/**
 * GitHubIntegration - Creates and manages GitHub issues for test blockers
 *
 * Usage:
 *   const github = new GitHubIntegration(token, 'owner/repo');
 *   const issue = await github.createBlockerIssue(blocker, checkpoint, screenshot);
 */

const GITHUB_API_BASE = 'https://api.github.com';

export class GitHubIntegration {
  constructor(token, repo) {
    this.token = token;
    this.repo = repo; // format: 'owner/repo'
    this.baseUrl = `${GITHUB_API_BASE}/repos/${repo}`;
  }

  /**
   * Test the GitHub connection and permissions
   * @returns {Promise<Object>} Repository info if successful
   */
  async testConnection() {
    try {
      const response = await fetch(this.baseUrl, {
        headers: this._getHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to connect to GitHub');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`GitHub connection failed: ${error.message}`);
    }
  }

  /**
   * Create a GitHub issue for a blocker
   * @param {Object} blocker - Blocker details from feedback form
   * @param {Object} checkpoint - Current checkpoint info
   * @param {string} screenshotBase64 - Base64 encoded screenshot (optional)
   * @param {Object} session - Test session info
   * @returns {Promise<Object>} Created issue details
   */
  async createBlockerIssue(blocker, checkpoint, screenshots = null, session = {}) {
    const title = this._generateIssueTitle(blocker, checkpoint);
    const body = this._generateIssueBody(blocker, checkpoint, session);
    const labels = this._generateLabels(blocker, checkpoint);

    // Create the issue
    const issue = await this._createIssue(title, body, labels);

    // Add screenshots as comments (supports array of step screenshots or single screenshot)
    if (screenshots) {
      if (Array.isArray(screenshots) && screenshots.length > 0) {
        // Multiple screenshots from automation steps
        await this._addMultipleScreenshotsComment(issue.number, screenshots, checkpoint);
      } else if (typeof screenshots === 'string') {
        // Single base64 screenshot (legacy support)
        await this._addScreenshotComment(issue.number, screenshots, checkpoint);
      }
    }

    return issue;
  }

  /**
   * Update an existing issue with new information
   * @param {number} issueNumber - GitHub issue number
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated issue
   */
  async updateIssue(issueNumber, updates) {
    const response = await fetch(`${this.baseUrl}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: this._getHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to update issue: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Add a comment to an issue
   * @param {number} issueNumber - GitHub issue number
   * @param {string} body - Comment body (markdown)
   * @returns {Promise<Object>} Created comment
   */
  async addComment(issueNumber, body) {
    const response = await fetch(`${this.baseUrl}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to add comment: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Link a test session to an issue by adding a comment
   * @param {string} sessionId - Test session ID
   * @param {number} issueNumber - GitHub issue number
   * @param {Object} sessionData - Session summary data
   * @returns {Promise<Object>} Created comment
   */
  async linkSession(sessionId, issueNumber, sessionData = {}) {
    const body = this._generateSessionLinkComment(sessionId, sessionData);
    return await this.addComment(issueNumber, body);
  }

  /**
   * Close an issue (e.g., when blocker is resolved)
   * @param {number} issueNumber - GitHub issue number
   * @param {string} resolution - Resolution comment
   * @returns {Promise<Object>} Updated issue
   */
  async closeIssue(issueNumber, resolution = null) {
    if (resolution) {
      await this.addComment(issueNumber, `**Resolution:** ${resolution}`);
    }
    return await this.updateIssue(issueNumber, { state: 'closed' });
  }

  /**
   * Get issues created by TF for a specific spec
   * @param {string} specId - Spec ID to filter by
   * @returns {Promise<Array>} Array of issues
   */
  async getIssuesForSpec(specId) {
    const label = `spec:${specId}`;
    const response = await fetch(
      `${this.baseUrl}/issues?labels=${encodeURIComponent(label)}&state=all`,
      { headers: this._getHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch issues: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get a single issue by number
   * @param {number} issueNumber - GitHub issue number
   * @returns {Promise<Object>} Issue details
   */
  async getIssue(issueNumber) {
    const response = await fetch(`${this.baseUrl}/issues/${issueNumber}`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to fetch issue: ${error.message}`);
    }

    return await response.json();
  }

  // === Repository Content APIs (for GitHubRepoAnalyzer) ===

  /**
   * Get contents of a file or directory
   * @param {string} path - Path within repository (empty string for root)
   * @param {string} ref - Branch/commit ref (optional, defaults to default branch)
   * @returns {Promise<Object|Array>} File content or directory listing
   */
  async getContents(path = '', ref = null) {
    let url = `${this.baseUrl}/contents/${path}`;
    if (ref) {
      url += `?ref=${encodeURIComponent(ref)}`;
    }

    const response = await fetch(url, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get contents at ${path}: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get commit history
   * @param {Object} options - Options for filtering commits
   * @param {string} options.since - ISO date string for start date
   * @param {string} options.until - ISO date string for end date
   * @param {string} options.sha - Branch or commit SHA to start from
   * @param {string} options.path - Only commits affecting this file path
   * @param {number} options.perPage - Results per page (max 100)
   * @param {number} options.page - Page number
   * @returns {Promise<Array>} Array of commit objects
   */
  async getCommits(options = {}) {
    const params = new URLSearchParams();
    if (options.since) params.append('since', options.since);
    if (options.until) params.append('until', options.until);
    if (options.sha) params.append('sha', options.sha);
    if (options.path) params.append('path', options.path);
    if (options.perPage) params.append('per_page', options.perPage.toString());
    if (options.page) params.append('page', options.page.toString());

    const url = `${this.baseUrl}/commits?${params.toString()}`;
    const response = await fetch(url, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get commits: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Compare two commits
   * @param {string} base - Base commit SHA or branch
   * @param {string} head - Head commit SHA or branch
   * @returns {Promise<Object>} Comparison result with files changed
   */
  async compareCommits(base, head) {
    const response = await fetch(
      `${this.baseUrl}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      { headers: this._getHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to compare commits: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get a specific commit details
   * @param {string} sha - Commit SHA
   * @returns {Promise<Object>} Commit details including files changed
   */
  async getCommit(sha) {
    const response = await fetch(`${this.baseUrl}/commits/${sha}`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get commit ${sha}: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get repository branches
   * @returns {Promise<Array>} Array of branch objects
   */
  async getBranches() {
    const response = await fetch(`${this.baseUrl}/branches`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get branches: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get a specific branch
   * @param {string} branch - Branch name
   * @returns {Promise<Object>} Branch details including latest commit
   */
  async getBranch(branch) {
    const response = await fetch(
      `${this.baseUrl}/branches/${encodeURIComponent(branch)}`,
      { headers: this._getHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get branch ${branch}: ${error.message}`);
    }

    return await response.json();
  }

  // Private methods

  _getHeaders() {
    return {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async _createIssue(title, body, labels) {
    const response = await fetch(`${this.baseUrl}/issues`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ title, body, labels })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create issue: ${error.message}`);
    }

    return await response.json();
  }

  _generateIssueTitle(blocker, checkpoint) {
    const prefix = blocker.severity === 'blocker' ? '🚫 BUG' :
                   blocker.severity === 'nice-to-have' ? '💡 ENHANCEMENT' : '📝';
    return `${prefix} [${checkpoint.id}] ${checkpoint.action}: ${this._truncate(blocker.description, 60)}`;
  }

  _generateIssueBody(blocker, checkpoint, session) {
    const sections = [];

    // Header
    sections.push(`## Testing Framework Blocker Report\n`);
    sections.push(`**Generated by:** TF Interactive Testing`);
    sections.push(`**Date:** ${new Date().toISOString()}`);
    if (session.id) {
      sections.push(`**Session ID:** ${session.id}`);
    }
    sections.push('');

    // Checkpoint Info
    sections.push(`## Checkpoint Information`);
    sections.push(`| Field | Value |`);
    sections.push(`|-------|-------|`);
    sections.push(`| **ID** | ${checkpoint.id} |`);
    sections.push(`| **Action** | ${checkpoint.action} |`);
    sections.push(`| **Spec** | ${session.specId || 'N/A'} |`);
    sections.push('');

    // Description
    if (checkpoint.description) {
      sections.push(`### Checkpoint Description`);
      sections.push(checkpoint.description);
      sections.push('');
    }

    // Steps to reproduce
    if (checkpoint.steps && checkpoint.steps.length > 0) {
      sections.push(`## Steps to Reproduce`);
      checkpoint.steps.forEach((step, i) => {
        sections.push(`${i + 1}. ${step}`);
      });
      sections.push('');
    }

    // Expected vs Actual
    sections.push(`## Expected vs Actual`);
    sections.push(`### Expected Result`);
    if (checkpoint.expectedItems && checkpoint.expectedItems.length > 0) {
      checkpoint.expectedItems.forEach(item => {
        sections.push(`- [ ] ${item}`);
      });
    } else {
      sections.push(checkpoint.expectedResult || 'Not specified');
    }
    sections.push('');

    sections.push(`### Actual Result (Blocker)`);
    sections.push(`**Severity:** ${blocker.severity || 'Not specified'}`);
    sections.push('');

    // If this came from Playwright automation, format it nicely
    if (blocker.description && blocker.description.includes('Playwright automation failed')) {
      sections.push(`**🤖 Automation Failure:**`);
      sections.push('```');
      sections.push(blocker.description);
      sections.push('```');
    } else {
      sections.push(`**Description:**`);
      sections.push(blocker.description || 'No description provided');
    }
    sections.push('');

    // Additional details
    if (blocker.stepsToReproduce) {
      sections.push(`**Field/Element:**`);
      sections.push(blocker.stepsToReproduce.replace('Field/Element: ', ''));
      sections.push('');
    }

    if (blocker.expectedResult) {
      sections.push(`**Expected Result:**`);
      sections.push(blocker.expectedResult);
      sections.push('');
    }

    if (blocker.workaround) {
      sections.push(`**Workaround:**`);
      sections.push(blocker.workaround);
      sections.push('');
    }

    // Environment
    if (session.targetUrl) {
      sections.push(`## Environment`);
      sections.push(`- **Target URL:** ${session.targetUrl}`);
      sections.push(`- **Browser:** ${navigator.userAgent}`);
      sections.push(`- **Timestamp:** ${new Date().toLocaleString()}`);
      sections.push('');
    }

    // Footer
    sections.push('---');
    sections.push('*This issue was auto-generated by the Testing Framework (TF)*');

    return sections.join('\n');
  }

  _generateLabels(blocker, checkpoint) {
    const labels = ['tf-feedback'];

    // Priority-based labels
    if (blocker.severity === 'blocker') {
      labels.push('priority:critical');
      labels.push('bug');
    } else if (blocker.severity === 'nice-to-have') {
      labels.push('priority:low');
      labels.push('enhancement');
      labels.push('future-release');
    }

    // Spec label (extract from checkpoint ID if available)
    if (checkpoint.specId) {
      labels.push(`spec:${checkpoint.specId}`);
    }

    // Category labels based on checkpoint content
    const action = (checkpoint.action || '').toLowerCase();
    if (action.includes('login') || action.includes('auth')) {
      labels.push('area:authentication');
    } else if (action.includes('patient')) {
      labels.push('area:patient-management');
    } else if (action.includes('appointment') || action.includes('schedul')) {
      labels.push('area:scheduling');
    } else if (action.includes('billing') || action.includes('claim')) {
      labels.push('area:billing');
    }

    return labels;
  }

  async _addScreenshotComment(issueNumber, screenshotBase64, checkpoint) {
    // Note: GitHub doesn't allow direct base64 image uploads in issues
    // We'll add the screenshot as a data URL in a collapsed section
    const body = `
<details>
<summary>📸 Screenshot at ${checkpoint.id}</summary>

![Screenshot](${screenshotBase64})

*Screenshot captured at checkpoint ${checkpoint.id}: ${checkpoint.action}*
</details>
`;
    return await this.addComment(issueNumber, body);
  }

  async _addMultipleScreenshotsComment(issueNumber, screenshots, checkpoint) {
    // Build a comment with all screenshots showing the test flow
    const sections = ['## 📸 Test Screenshots\n'];
    sections.push('The following screenshots show each step of the test:\n');

    screenshots.forEach((shot, index) => {
      const stepLabel = shot.stepId || `Step ${index + 1}`;
      const statusIcon = shot.success !== false ? '✓' : '✗';
      sections.push(`
<details>
<summary>${statusIcon} Step ${index + 1}: ${stepLabel}</summary>

![${stepLabel}](${shot.screenshot})

</details>
`);
    });

    sections.push(`\n*Screenshots captured during checkpoint ${checkpoint.id}: ${checkpoint.action}*`);

    return await this.addComment(issueNumber, sections.join('\n'));
  }

  _generateSessionLinkComment(sessionId, sessionData) {
    const lines = [
      `## 🔗 Test Session Linked`,
      '',
      `**Session ID:** ${sessionId}`,
      `**Linked at:** ${new Date().toISOString()}`,
      ''
    ];

    if (sessionData.specId) {
      lines.push(`**Spec:** ${sessionData.specId}`);
    }
    if (sessionData.progress) {
      lines.push(`**Progress:** ${sessionData.progress.completed}/${sessionData.progress.total} checkpoints`);
    }
    if (sessionData.passed !== undefined) {
      lines.push(`**Passed:** ${sessionData.passed}`);
      lines.push(`**Failed:** ${sessionData.failed}`);
    }

    return lines.join('\n');
  }

  _truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Factory function to create GitHubIntegration instance
 * @param {Object} config - Configuration with token and repo
 * @returns {GitHubIntegration}
 */
export function createGitHubIntegration(config) {
  if (!config.token) {
    throw new Error('GitHub token is required');
  }
  if (!config.repo) {
    throw new Error('GitHub repository (owner/repo) is required');
  }
  return new GitHubIntegration(config.token, config.repo);
}

export default GitHubIntegration;
