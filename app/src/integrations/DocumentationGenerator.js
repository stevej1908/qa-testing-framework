/**
 * DocumentationGenerator - Generates training documentation from test sessions
 *
 * Creates formatted training guides from passed checkpoints, including:
 * - Step-by-step instructions
 * - Screenshots
 * - Expected behaviors
 * - Tips and notes
 */

import { getSession, getResultsBySession, getScreenshotsBySession } from '../storage/TestArtifactStore';
import { loadSpec } from '../utils/SpecLoader';

/**
 * Generate a complete training document from a session
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated documentation
 */
export async function generateTrainingDoc(sessionId, options = {}) {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const results = await getResultsBySession(sessionId);
  const screenshots = await getScreenshotsBySession(sessionId);

  // Load the spec to get full checkpoint details
  let spec = null;
  let checkpointMap = new Map();
  try {
    spec = await loadSpec(session.specId);
    if (spec && spec.checkpoints) {
      spec.checkpoints.forEach(cp => {
        checkpointMap.set(cp.id, cp);
      });
    }
  } catch (err) {
    console.warn('Could not load spec for documentation:', err);
  }

  // Build screenshot lookup map
  const screenshotMap = new Map();
  screenshots.forEach(s => {
    screenshotMap.set(s.checkpointId, s);
  });

  // Filter to passed checkpoints for training docs
  const passedResults = options.includeAll
    ? results
    : results.filter(r => r.status === 'passed');

  const doc = {
    metadata: {
      title: options.title || `${session.specName} Training Guide`,
      generatedAt: new Date().toISOString(),
      sessionId: session.id,
      specId: session.specId,
      specName: session.specName,
      targetUrl: session.targetUrl,
      totalCheckpoints: results.length,
      passedCheckpoints: results.filter(r => r.status === 'passed').length,
      version: '1.0'
    },
    sections: [],
    summary: {
      passed: session.passed,
      failed: session.failed,
      skipped: session.skipped,
      passRate: results.length > 0
        ? Math.round((session.passed / results.length) * 100)
        : 0
    }
  };

  // Group checkpoints into sections based on ID prefix or sequential order
  let currentSection = null;
  let sectionIndex = 0;

  for (const result of passedResults) {
    // Get full checkpoint details from spec
    const fullCheckpoint = checkpointMap.get(result.checkpointId) || {};
    const screenshot = screenshotMap.get(result.checkpointId);

    // Create section item with full checkpoint details
    const item = {
      id: result.checkpointId,
      title: fullCheckpoint.action || `Checkpoint ${result.checkpointId}`,
      description: fullCheckpoint.description || '',
      steps: fullCheckpoint.steps || [],
      expectedResult: fullCheckpoint.expectedResult || '',
      screenshot: screenshot ? {
        id: screenshot.id,
        dataUrl: screenshot.dataUrl,
        label: screenshot.label
      } : null,
      status: result.status,
      timestamp: result.timestamp
    };

    // Simple section grouping - every 3-5 checkpoints or based on ID pattern
    if (!currentSection || currentSection.items.length >= 5) {
      sectionIndex++;
      currentSection = {
        id: `section-${sectionIndex}`,
        title: `Section ${sectionIndex}`,
        items: []
      };
      doc.sections.push(currentSection);
    }

    currentSection.items.push(item);
  }

  return doc;
}

/**
 * Generate HTML training document
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 * @returns {Promise<string>} HTML document string
 */
export async function generateHTMLDoc(sessionId, options = {}) {
  const doc = await generateTrainingDoc(sessionId, options);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.metadata.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1f2937;
      background: #f9fafb;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }
    .header h1 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .header .meta {
      color: #6b7280;
      font-size: 14px;
    }
    .summary {
      display: flex;
      gap: 20px;
      justify-content: center;
      margin-bottom: 40px;
    }
    .summary-item {
      background: white;
      padding: 20px 30px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-item .number {
      font-size: 32px;
      font-weight: 700;
      color: #1e40af;
    }
    .summary-item .label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .section {
      background: white;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .section-header {
      background: #1e40af;
      color: white;
      padding: 15px 20px;
      font-size: 18px;
      font-weight: 600;
    }
    .checkpoint {
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .checkpoint:last-child {
      border-bottom: none;
    }
    .checkpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
    }
    .checkpoint-id {
      background: #e5e7eb;
      padding: 4px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
    }
    .checkpoint-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    .checkpoint-description {
      color: #4b5563;
      margin-bottom: 15px;
    }
    .steps {
      background: #f9fafb;
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .steps h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #374151;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
      color: #4b5563;
    }
    .expected {
      background: #dcfce7;
      padding: 12px 16px;
      border-radius: 6px;
      border-left: 4px solid #16a34a;
    }
    .expected h4 {
      margin: 0 0 5px 0;
      font-size: 12px;
      color: #166534;
      text-transform: uppercase;
    }
    .expected p {
      margin: 0;
      color: #166534;
    }
    .screenshot {
      margin-top: 15px;
      text-align: center;
    }
    .screenshot img {
      max-width: 100%;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .screenshot-label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 12px;
    }
    @media print {
      body { background: white; }
      .section { box-shadow: none; border: 1px solid #e5e7eb; }
      .summary-item { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(doc.metadata.title)}</h1>
    <div class="meta">
      Generated on ${new Date(doc.metadata.generatedAt).toLocaleDateString()}
      | ${doc.metadata.specName}
    </div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="number">${doc.metadata.totalCheckpoints}</div>
      <div class="label">Total Steps</div>
    </div>
    <div class="summary-item">
      <div class="number">${doc.metadata.passedCheckpoints}</div>
      <div class="label">Verified</div>
    </div>
    <div class="summary-item">
      <div class="number">${doc.summary.passRate}%</div>
      <div class="label">Pass Rate</div>
    </div>
  </div>

  ${doc.sections.map((section, sIdx) => `
  <div class="section">
    <div class="section-header">${escapeHtml(section.title)}</div>
    ${section.items.map(item => `
    <div class="checkpoint">
      <div class="checkpoint-header">
        <span class="checkpoint-id">${escapeHtml(item.id)}</span>
        <span class="checkpoint-title">${escapeHtml(item.title)}</span>
      </div>
      ${item.description ? `<div class="checkpoint-description">${escapeHtml(item.description)}</div>` : ''}
      ${item.steps && item.steps.length > 0 ? `
      <div class="steps">
        <h4>Steps:</h4>
        <ol>
          ${item.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      </div>
      ` : ''}
      ${item.expectedResult ? `
      <div class="expected">
        <h4>Expected Result</h4>
        <p>${escapeHtml(item.expectedResult)}</p>
      </div>
      ` : ''}
      ${item.screenshot ? `
      <div class="screenshot">
        <img src="${item.screenshot.dataUrl}" alt="${escapeHtml(item.screenshot.label || item.title)}" />
        <div class="screenshot-label">${escapeHtml(item.screenshot.label || `Screenshot for ${item.id}`)}</div>
      </div>
      ` : ''}
    </div>
    `).join('')}
  </div>
  `).join('')}

  <div class="footer">
    Generated by Testing Framework | Session: ${doc.metadata.sessionId}
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate Markdown training document
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 * @returns {Promise<string>} Markdown document string
 */
export async function generateMarkdownDoc(sessionId, options = {}) {
  const doc = await generateTrainingDoc(sessionId, options);

  let md = `# ${doc.metadata.title}\n\n`;
  md += `> Generated on ${new Date(doc.metadata.generatedAt).toLocaleDateString()}\n`;
  md += `> Spec: ${doc.metadata.specName}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Steps | ${doc.metadata.totalCheckpoints} |\n`;
  md += `| Verified | ${doc.metadata.passedCheckpoints} |\n`;
  md += `| Pass Rate | ${doc.summary.passRate}% |\n\n`;

  md += `---\n\n`;

  for (const section of doc.sections) {
    md += `## ${section.title}\n\n`;

    for (const item of section.items) {
      md += `### ${item.id}: ${item.title}\n\n`;

      if (item.description) {
        md += `${item.description}\n\n`;
      }

      if (item.steps && item.steps.length > 0) {
        md += `**Steps:**\n\n`;
        item.steps.forEach((step, i) => {
          md += `${i + 1}. ${step}\n`;
        });
        md += `\n`;
      }

      if (item.expectedResult) {
        md += `**Expected Result:**\n\n`;
        md += `> ${item.expectedResult}\n\n`;
      }

      if (item.screenshot) {
        md += `**Screenshot:**\n\n`;
        md += `![${item.screenshot.label || item.title}](${item.screenshot.dataUrl})\n\n`;
      }

      md += `---\n\n`;
    }
  }

  md += `\n*Generated by Testing Framework*\n`;

  return md;
}

/**
 * Generate JSON export of documentation
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 * @returns {Promise<string>} JSON string
 */
export async function generateJSONDoc(sessionId, options = {}) {
  const doc = await generateTrainingDoc(sessionId, options);
  return JSON.stringify(doc, null, 2);
}

/**
 * Download documentation as a file
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download HTML documentation
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 */
export async function downloadHTMLDoc(sessionId, options = {}) {
  const html = await generateHTMLDoc(sessionId, options);
  const filename = options.filename || `training-guide-${sessionId}.html`;
  downloadFile(html, filename, 'text/html');
}

/**
 * Download Markdown documentation
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 */
export async function downloadMarkdownDoc(sessionId, options = {}) {
  const md = await generateMarkdownDoc(sessionId, options);
  const filename = options.filename || `training-guide-${sessionId}.md`;
  downloadFile(md, filename, 'text/markdown');
}

/**
 * Download JSON documentation
 * @param {string} sessionId - Session ID
 * @param {Object} options - Generation options
 */
export async function downloadJSONDoc(sessionId, options = {}) {
  const json = await generateJSONDoc(sessionId, options);
  const filename = options.filename || `training-guide-${sessionId}.json`;
  downloadFile(json, filename, 'application/json');
}

// Helper function to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  generateTrainingDoc,
  generateHTMLDoc,
  generateMarkdownDoc,
  generateJSONDoc,
  downloadHTMLDoc,
  downloadMarkdownDoc,
  downloadJSONDoc,
  downloadFile
};
