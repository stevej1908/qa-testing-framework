/**
 * SpecLoader - Loads and parses feature specs dynamically
 *
 * Now supports:
 * - App-specific specs via SpecManager
 * - Dynamic spec detection based on connected GitHub repo
 * - Fallback to generic specs when no app-specific specs exist
 */

import { parseSpecMarkdown, validateSpec } from './SpecParser';
import specManager from '../services/SpecManager';

// Cache for loaded specs
const specCache = new Map();

// Playwright service URL
const PLAYWRIGHT_SERVICE_URL = 'http://localhost:3002';

// Current app context (set when GitHub is connected)
let currentRepo = null;

/**
 * Set the current app context
 * @param {string} repo - GitHub repo in format "owner/repo"
 */
export function setCurrentRepo(repo) {
  currentRepo = repo;
  specCache.clear(); // Clear SpecLoader cache when switching apps
  specManager.refreshCache(); // Reload SpecManager from localStorage to catch any external changes
}

/**
 * Get the current app context
 * @returns {string|null} Current repo
 */
export function getCurrentRepo() {
  return currentRepo;
}

/**
 * Load a spec by ID
 * @param {string} specId - The spec ID (e.g., 'auth-login')
 * @returns {Promise<Object>} The spec object with checkpoints
 */
export async function loadSpec(specId) {
  // Check cache first
  const cacheKey = `${currentRepo || 'default'}_${specId}`;
  if (specCache.has(cacheKey)) {
    return specCache.get(cacheKey);
  }

  // If we have a current repo, try to load from SpecManager first
  if (currentRepo) {
    const appSpec = specManager.getSpec(currentRepo, specId);
    if (appSpec) {
      specCache.set(cacheKey, appSpec);
      return appSpec;
    }
  }

  // Try to load from Playwright service
  try {
    const response = await fetch(`${PLAYWRIGHT_SERVICE_URL}/api/specs/${specId}`);

    if (response.ok) {
      const markdown = await response.text();
      const spec = parseSpecMarkdown(markdown);

      const validation = validateSpec(spec);
      if (!validation.isValid) {
        console.warn(`Spec ${specId} has validation warnings:`, validation.errors);
      }

      specCache.set(cacheKey, spec);
      return spec;
    }
  } catch (error) {
    console.warn(`Could not load spec ${specId} from Playwright service:`, error.message);
  }

  // Return fallback spec
  return getFallbackSpec(specId);
}

/**
 * Get list of all available specs for current app
 * @returns {Array} Array of spec summaries
 */
export function getAvailableSpecs() {
  // If we have a current repo with specs, use those
  if (currentRepo) {
    const appSpecs = specManager.getSpecs(currentRepo);
    if (appSpecs && appSpecs.length > 0) {
      return appSpecs.map(s => ({
        id: s.id,
        name: s.name,
        file: s.file || `${s.id}.spec.md`
      }));
    }
  }

  // Return empty array if no specs (user needs to generate them)
  return [];
}

/**
 * Check if specs exist for the current repo
 * @returns {Object} Status object
 */
export function checkSpecsStatus() {
  if (!currentRepo) {
    return { hasSpecs: false, reason: 'no_repo_connected' };
  }

  const status = specManager.hasSpecs(currentRepo);
  return {
    hasSpecs: status.exists,
    specCount: status.specCount,
    lastUpdated: status.lastUpdated,
    reason: status.exists ? 'specs_found' : 'no_specs_for_repo'
  };
}

/**
 * Generate specs for the current repo
 * @param {Object} repoAnalyzer - GitHubRepoAnalyzer instance
 * @param {string} appType - Type of app
 * @returns {Promise<Object>} Generated specs info
 */
export async function generateSpecsForRepo(repoAnalyzer, appType = 'project-management') {
  if (!currentRepo) {
    throw new Error('No repository connected');
  }

  const generated = await specManager.generateSpecs(repoAnalyzer, appType);

  // Get the latest commit SHA for versioning
  let lastCommitSha = null;
  try {
    const commits = await repoAnalyzer.getRecentCommits(null, 1);
    if (commits && commits.length > 0) {
      lastCommitSha = commits[0].sha;
    }
  } catch (error) {
    console.warn('Could not get latest commit SHA:', error.message);
  }

  // Save the generated specs
  specManager.saveSpecs(currentRepo, generated.specs, generated.fullSpecs, lastCommitSha);

  // Clear cache to load new specs
  specCache.clear();

  return {
    specCount: generated.specs.length,
    specs: generated.specs,
    lastCommitSha
  };
}

/**
 * Check if specs need updating based on recent code changes
 * @param {Array} recentCommits - Recent commits from GitHub
 * @returns {Object} Update status
 */
export function checkForSpecUpdates(recentCommits) {
  if (!currentRepo) {
    return { needsUpdate: false, reason: 'no_repo' };
  }

  return specManager.checkForUpdates(currentRepo, recentCommits);
}

/**
 * Update specs with new information
 * @param {Object} repoAnalyzer - GitHubRepoAnalyzer instance
 * @param {Object} updateInfo - Information about what to update
 * @returns {Promise<Object>} Update result
 */
export async function updateSpecs(repoAnalyzer, updateInfo) {
  if (!currentRepo) {
    throw new Error('No repository connected');
  }

  // For now, regenerate all specs
  // In the future, this could do incremental updates based on changed files
  return generateSpecsForRepo(repoAnalyzer, updateInfo.appType || 'project-management');
}

/**
 * Clear the spec cache
 */
export function clearSpecCache() {
  specCache.clear();
}

/**
 * Preload all specs into cache
 */
export async function preloadAllSpecs() {
  const specs = getAvailableSpecs();

  const results = await Promise.allSettled(
    specs.map(meta => loadSpec(meta.id))
  );

  const loaded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { loaded, failed, total: specs.length };
}

/**
 * Fallback specs for when nothing else is available
 */
function getFallbackSpec(specId) {
  // Generic fallback structure
  return {
    id: specId,
    name: specId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    version: '0.1',
    checkpoints: [
      {
        id: 'CP-001',
        action: 'Feature Access',
        description: 'Feature page loads correctly',
        steps: ['Login with appropriate role', 'Navigate to feature'],
        expectedResult: 'Feature page displays without errors',
        expectedItems: ['Feature page displays without errors']
      }
    ]
  };
}

export default {
  loadSpec,
  getAvailableSpecs,
  clearSpecCache,
  preloadAllSpecs,
  setCurrentRepo,
  getCurrentRepo,
  checkSpecsStatus,
  generateSpecsForRepo,
  checkForSpecUpdates,
  updateSpecs
};
