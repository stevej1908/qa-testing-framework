/**
 * SpecLoader - Loads and parses feature specs
 *
 * Fetches spec files from the Playwright service which reads from
 * testing-framework/specs/ (single source of truth)
 */

import { parseSpecMarkdown, validateSpec } from './SpecParser';

// Cache for loaded specs
const specCache = new Map();

// Playwright service URL (where specs are served from)
const PLAYWRIGHT_SERVICE_URL = 'http://localhost:3002';

// Available specs metadata (from testing-framework/specs/INDEX.md)
const SPEC_METADATA = [
  { id: 'auth-login', name: 'Authentication', file: 'auth-login.spec.md' },
  { id: 'auth-roles', name: 'Role-Based Access', file: 'auth-roles.spec.md' },
  { id: 'patient-mgmt', name: 'Patient Management', file: 'patient-mgmt.spec.md' },
  { id: 'provider-mgmt', name: 'Provider Management', file: 'provider-mgmt.spec.md' },
  { id: 'session-docs', name: 'Session Documentation', file: 'session-docs.spec.md' },
  { id: 'billing-claims', name: 'Billing & Claims', file: 'billing-claims.spec.md' },
  { id: 'front-desk-ops', name: 'Front Desk Operations', file: 'front-desk-ops.spec.md' },
  { id: 'appointments', name: 'Scheduling', file: 'appointments.spec.md' },
  { id: 'prescriptions', name: 'Prescriptions & RTM', file: 'prescriptions.spec.md' },
  { id: 'insurance', name: 'Insurance Management', file: 'insurance.spec.md' },
  { id: 'patient-portal', name: 'Patient Portal', file: 'patient-portal.spec.md' },
  { id: 'mobile', name: 'Mobile Support', file: 'mobile.spec.md' },
  { id: 'admin-config', name: 'Admin Configuration', file: 'admin-config.spec.md' },
  { id: 'intake-forms', name: 'Intake Forms', file: 'intake-forms.spec.md' },
  { id: 'practice-setup', name: 'Practice Setup', file: 'practice-setup.spec.md' }
];

/**
 * Load a spec by ID - fetches from Playwright service which reads source files
 * @param {string} specId - The spec ID (e.g., 'auth-login')
 * @returns {Promise<Object>} The spec object with checkpoints
 */
export async function loadSpec(specId) {
  // Check cache first
  if (specCache.has(specId)) {
    return specCache.get(specId);
  }

  // Find spec metadata
  const metadata = SPEC_METADATA.find(s => s.id === specId);
  if (!metadata) {
    throw new Error(`Spec not found: ${specId}`);
  }

  try {
    // Fetch from Playwright service (reads from testing-framework/specs/)
    const response = await fetch(`${PLAYWRIGHT_SERVICE_URL}/api/specs/${specId}`);

    if (!response.ok) {
      // If server not running or spec not found, try public folder fallback
      console.warn(`Playwright service unavailable, trying public folder fallback`);
      return await loadSpecFromPublic(specId, metadata);
    }

    const markdown = await response.text();

    // Parse the markdown
    const spec = parseSpecMarkdown(markdown);

    // Validate the parsed spec
    const validation = validateSpec(spec);
    if (!validation.isValid) {
      console.warn(`Spec ${specId} has validation warnings:`, validation.errors);
    }

    // Cache the result
    specCache.set(specId, spec);

    return spec;
  } catch (error) {
    console.error(`Error loading spec ${specId} from service:`, error);
    // Fall back to public folder, then inline spec
    try {
      return await loadSpecFromPublic(specId, metadata);
    } catch {
      return getFallbackSpec(specId);
    }
  }
}

/**
 * Fallback: Load spec from public folder (for when Playwright service is not running)
 */
async function loadSpecFromPublic(specId, metadata) {
  const response = await fetch(`/specs/${metadata.file}`);
  if (!response.ok) {
    throw new Error(`Failed to load spec file: ${response.status}`);
  }

  const markdown = await response.text();
  const spec = parseSpecMarkdown(markdown);

  const validation = validateSpec(spec);
  if (!validation.isValid) {
    console.warn(`Spec ${specId} has validation warnings:`, validation.errors);
  }

  specCache.set(specId, spec);
  return spec;
}

/**
 * Get list of all available specs
 * @returns {Array} Array of spec summaries
 */
export function getAvailableSpecs() {
  return SPEC_METADATA.map(meta => ({
    id: meta.id,
    name: meta.name,
    file: meta.file
  }));
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
  const results = await Promise.allSettled(
    SPEC_METADATA.map(meta => loadSpec(meta.id))
  );

  const loaded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return { loaded, failed, total: SPEC_METADATA.length };
}

/**
 * Fallback specs for when file loading fails
 */
function getFallbackSpec(specId) {
  const FALLBACK_SPECS = {
    'auth-login': {
      id: 'auth-login',
      name: 'Authentication - Login',
      version: '1.0',
      checkpoints: [
        {
          id: 'CP-001',
          action: 'Login Page Display',
          description: 'Login page renders correctly with all required elements',
          steps: ['Navigate to application root (/)', 'Verify login form is visible'],
          expectedResult: 'Email input field visible; Password input field visible; Submit button visible',
          expectedItems: ['Email input field visible', 'Password input field visible', 'Submit button visible']
        },
        {
          id: 'CP-002',
          action: 'Valid Admin Login',
          description: 'Admin user can login with valid credentials',
          steps: ['Enter valid admin email', 'Enter valid admin password', 'Click submit button'],
          expectedResult: 'User is redirected to admin dashboard; Auth token is stored',
          expectedItems: ['User is redirected to admin dashboard', 'Auth token is stored in localStorage']
        },
        {
          id: 'CP-003',
          action: 'Valid Provider Login',
          description: 'Provider user can login and access provider dashboard',
          steps: ['Enter valid provider email', 'Enter valid provider password', 'Click submit button'],
          expectedResult: 'User is redirected to provider dashboard; Provider-specific features are accessible',
          expectedItems: ['User is redirected to provider dashboard', 'Provider-specific features are accessible']
        },
        {
          id: 'CP-004',
          action: 'Valid Front Desk Login',
          description: 'Front desk user can login and access front desk dashboard',
          steps: ['Enter valid front desk email', 'Enter valid front desk password', 'Click submit button'],
          expectedResult: 'User is redirected to front desk dashboard',
          expectedItems: ['User is redirected to front desk dashboard', 'Front desk features are accessible']
        },
        {
          id: 'CP-005',
          action: 'Invalid Credentials',
          description: 'Login fails with invalid credentials',
          steps: ['Enter invalid email or password', 'Click submit button'],
          expectedResult: 'Error message is displayed; User remains on login page',
          expectedItems: ['Error message is displayed', 'User remains on login page', 'No auth token is stored']
        },
        {
          id: 'CP-006',
          action: 'Empty Fields Validation',
          description: 'Login form validates required fields',
          steps: ['Leave email and/or password empty', 'Click submit button'],
          expectedResult: 'Form validation prevents submission; Validation error message shown',
          expectedItems: ['Form validation prevents submission', 'Validation error message shown']
        },
        {
          id: 'CP-007',
          action: 'Session Persistence',
          description: 'User session persists across page refreshes',
          steps: ['Login successfully', 'Refresh the page'],
          expectedResult: 'User remains logged in; Dashboard is displayed',
          expectedItems: ['User remains logged in', 'Dashboard is displayed', 'Auth token is still valid']
        },
        {
          id: 'CP-008',
          action: 'Logout',
          description: 'User can logout and session is cleared',
          steps: ['Login successfully', 'Click logout button'],
          expectedResult: 'User is redirected to login page; Auth token is removed',
          expectedItems: ['User is redirected to login page', 'Auth token is removed', 'User context is cleared']
        },
        {
          id: 'CP-009',
          action: 'Session Timeout',
          description: 'Expired sessions are handled gracefully',
          steps: ['Login successfully', 'Wait for token expiration', 'Attempt protected action'],
          expectedResult: 'User is redirected to login; Appropriate message shown',
          expectedItems: ['User is redirected to login', 'Appropriate message shown']
        }
      ]
    }
  };

  if (FALLBACK_SPECS[specId]) {
    return FALLBACK_SPECS[specId];
  }

  // Generic fallback
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

export default { loadSpec, getAvailableSpecs, clearSpecCache, preloadAllSpecs };
