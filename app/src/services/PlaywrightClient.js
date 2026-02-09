/**
 * PlaywrightClient - Communicates with Playwright Service
 *
 * Used by TF React app to execute browser automation steps
 */

const PLAYWRIGHT_SERVICE_URL = 'http://localhost:3002';

class PlaywrightClient {
  constructor() {
    this.serviceUrl = PLAYWRIGHT_SERVICE_URL;
    this.isConnected = false;
  }

  /**
   * Check if Playwright service is running
   */
  async checkStatus() {
    try {
      const response = await fetch(`${this.serviceUrl}/status`);
      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        return { connected: true, ...data };
      }
      this.isConnected = false;
      return { connected: false, error: 'Service not responding' };
    } catch (error) {
      this.isConnected = false;
      return { connected: false, error: error.message };
    }
  }

  /**
   * Get list of available steps
   */
  async getAvailableSteps() {
    try {
      const response = await fetch(`${this.serviceUrl}/steps`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to get steps');
    } catch (error) {
      console.error('Error getting steps:', error);
      return { steps: [] };
    }
  }

  /**
   * Execute a single step
   */
  async executeStep(stepId, params = {}) {
    try {
      const response = await fetch(`${this.serviceUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, params })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        stepId,
        error: error.message,
        screenshot: null
      };
    }
  }

  /**
   * Execute a sequence of steps
   * @param {Array} steps - Array of step objects with stepId and params
   * @param {string} targetUrl - The target application URL to test against
   * @param {Object} options - Additional options
   * @param {string} options.credentialOverride - Override credentials (e.g., 'admin' to use admin creds for all logins)
   */
  async executeSequence(steps, targetUrl = null, options = {}) {
    try {
      const response = await fetch(`${this.serviceUrl}/execute-sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          targetUrl,
          credentialOverride: options.credentialOverride || null
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    try {
      await fetch(`${this.serviceUrl}/close`, { method: 'POST' });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const playwrightClient = new PlaywrightClient();

export default playwrightClient;

/**
 * Checkpoint to Playwright steps mapping
 *
 * Each checkpoint ID maps to one or more Playwright steps
 * Checkpoint IDs are now unique per spec (e.g., auth-login-1, insurance-3)
 */
export const checkpointStepMapping = {
  // Auth-Login spec checkpoints (auth-login.spec.md)
  'auth-login-1': [{ stepId: 'goto-login' }],  // Login Page Display
  'auth-login-2': [  // Valid Admin Login - split to show credentials
    { stepId: 'goto-login' },
    { stepId: 'fill-admin-credentials' },
    { stepId: 'submit-login-admin' },
    { stepId: 'select-admin-portal' }
  ],
  'auth-login-3': [  // Valid Provider Login - split to show credentials
    { stepId: 'goto-login' },
    { stepId: 'fill-provider-credentials' },
    { stepId: 'submit-login-provider' },
    { stepId: 'select-provider-portal' }
  ],
  'auth-login-4': [  // Valid Front Desk Login - split to show credentials
    { stepId: 'goto-login' },
    { stepId: 'fill-frontdesk-credentials' },
    { stepId: 'submit-login-frontdesk' },
    { stepId: 'select-frontdesk-portal' }
  ],
  'auth-login-5': [{ stepId: 'goto-login' }],  // Invalid Credentials - manual test
  'auth-login-6': [{ stepId: 'goto-login' }],  // Empty Fields Validation - manual test
  'auth-login-7': [{ stepId: 'goto-login' }, { stepId: 'login-admin' }, { stepId: 'select-admin-portal' }],  // Session Persistence
  'auth-login-8': [{ stepId: 'goto-login' }, { stepId: 'login-admin' }, { stepId: 'select-admin-portal' }],  // Logout
  'auth-login-9': [{ stepId: 'goto-login' }],  // Session Timeout - manual test

  // Provider Management checkpoints
  'provider-mgmt-1': [
    { stepId: 'goto-login' },
    { stepId: 'login-admin' },
    { stepId: 'select-admin-portal' },
    { stepId: 'nav-providers' }
  ],
  'provider-mgmt-2': [{ stepId: 'click-add-provider' }],
  'provider-mgmt-3': [
    { stepId: 'fill-provider-basic' },
    { stepId: 'fill-provider-address' }
  ],
  'provider-mgmt-4': [{ stepId: 'submit-provider' }],
  'provider-mgmt-npi-1': [{ stepId: 'verify-npi', params: { npi: '1801978747' } }],
  'provider-mgmt-npi-2': [{ stepId: 'autofill-from-npi' }],

  // Patient Management checkpoints
  'patient-mgmt-1': [
    { stepId: 'goto-login' },
    { stepId: 'login-admin' },
    { stepId: 'select-admin-portal' },
    { stepId: 'nav-dashboard' }
  ],
  'patient-mgmt-2': [{ stepId: 'click-add-patient' }],
  'patient-mgmt-3': [
    { stepId: 'fill-patient-info' },
    { stepId: 'fill-patient-address' },
    { stepId: 'select-patient-insurance' },
    { stepId: 'fill-patient-insurance-details' }
  ],
  'patient-mgmt-4': [
    { stepId: 'verify-patient-insurance' },
    { stepId: 'submit-patient-full' }
  ],

  // Appointment checkpoints
  'appointments-1': [
    { stepId: 'goto-login' },
    { stepId: 'login-frontdesk' },
    { stepId: 'select-frontdesk-portal' }
  ],
  'appointments-2': [{ stepId: 'click-new-appointment' }],
  'appointments-3': [{ stepId: 'fill-appointment' }],
  'appointments-4': [{ stepId: 'submit-appointment' }],

  // Front Desk Operations checkpoints (per front-desk-ops.spec.md)
  'front-desk-1': [
    { stepId: 'goto-login' },
    { stepId: 'login-frontdesk' },
    { stepId: 'select-frontdesk-portal' }
  ],
  'front-desk-2': [{ stepId: 'view-schedule-tab' }],
  'front-desk-3': [{ stepId: 'view-waiting-room-tab' }],
  'front-desk-4': [{ stepId: 'view-intake-queue-tab' }],
  'front-desk-5': [  // Check-In Patient
    { stepId: 'view-schedule-tab' },
    { stepId: 'check-in-patient' }
  ],
  'front-desk-6': [  // Mark Patient Ready (manual test)
    { stepId: 'view-waiting-room-tab' }
  ],
  'front-desk-7': [  // Process Intake (manual test)
    { stepId: 'view-intake-queue-tab' }
  ],
  'front-desk-8': [  // Summary Cards
    { stepId: 'view-schedule-tab' }
  ],
  'front-desk-9': [  // Filter by Status (manual test)
    { stepId: 'view-schedule-tab' }
  ],
  'front-desk-10': [  // Add Walk-In Patient
    { stepId: 'click-add-patient' },
    { stepId: 'fill-patient-info' }
  ],

  // Patient Portal checkpoints
  'patient-portal-1': [{ stepId: 'goto-patient-register' }],
  'patient-portal-2': [{ stepId: 'fill-patient-registration' }],
  'patient-portal-3': [{ stepId: 'submit-patient-registration' }],

  // ============================================
  // INSURANCE MANAGEMENT CHECKPOINTS
  // ============================================
  'insurance-1': [  // Insurance Plans List
    { stepId: 'goto-login' },
    { stepId: 'login-admin' },
    { stepId: 'select-admin-portal' },
    { stepId: 'nav-insurance' }
  ],
  'insurance-2': [  // Add Insurance Plan
    { stepId: 'click-add-insurance-plan' },
    { stepId: 'fill-insurance-plan' },
    { stepId: 'submit-insurance-plan' },
    { stepId: 'verify-insurance-plan-in-list' }
  ],
  'insurance-3': [  // Edit Insurance Plan
    { stepId: 'click-edit-insurance-plan' },
    { stepId: 'modify-insurance-plan' },
    { stepId: 'save-insurance-plan-changes' }
  ],
  'insurance-4': [  // Search Insurance Plans
    { stepId: 'search-insurance-plans' }
  ],
  'insurance-5': [  // Patient Insurance Verification List
    { stepId: 'goto-login' },
    { stepId: 'login-admin' },
    { stepId: 'select-admin-portal' },
    { stepId: 'nav-insurance' }
  ],
  'insurance-6': [  // Filter by Verification Status (manual test)
    { stepId: 'nav-insurance' }
  ],
  'insurance-7': [  // Verify Patient Insurance (manual test)
    { stepId: 'nav-insurance' }
  ],
  'insurance-8': [  // Enter Verification Details (manual test)
    { stepId: 'nav-insurance' }
  ],
  'insurance-9': [  // Reject Policy (manual test)
    { stepId: 'nav-insurance' }
  ],
  'insurance-10': [  // View Policy Details
    { stepId: 'nav-insurance' }
  ],

  // ============================================
  // PATIENT MANAGEMENT CRUD CHECKPOINTS
  // ============================================
  // NOTE: patient-mgmt-5 has been moved to front-desk-intake.spec.md
  // The front desk quick intake workflow is a separate user journey
  // See: testing-framework/specs/front-desk-intake.spec.md
  'patient-mgmt-6': [  // Edit Patient
    { stepId: 'click-edit-patient' },
    { stepId: 'modify-patient', params: { field: 'phone', value: '602-555-9999' } },
    { stepId: 'save-patient-changes' }
  ],
  'patient-mgmt-7': [  // Search Patients
    { stepId: 'search-patients', params: { searchTerm: 'Test' } }
  ],
  'patient-mgmt-8': [  // Filter by Status
    { stepId: 'filter-patients-by-status', params: { status: 'active' } }
  ],
  'patient-mgmt-9': [  // Filter by Registration Status (manual test)
    { stepId: 'nav-dashboard' }
  ],
  'patient-mgmt-10': [  // Patient Detail View
    { stepId: 'view-patient-details' }
  ],

  // ============================================
  // PROVIDER MANAGEMENT CRUD CHECKPOINTS (per provider-mgmt.spec.md)
  // ============================================
  'provider-mgmt-5': [  // NPI Validation (manual test for invalid NPI)
    { stepId: 'click-add-provider' }
  ],
  'provider-mgmt-6': [  // Edit Provider
    { stepId: 'click-edit-provider' },
    { stepId: 'modify-provider', params: { field: 'phone', value: '602-555-8888' } },
    { stepId: 'save-provider-changes' }
  ],
  'provider-mgmt-7': [  // Provider Credentials Display
    { stepId: 'nav-providers' },
    { stepId: 'verify-provider-in-list' }
  ],
  'provider-mgmt-8': [  // Provider Search
    { stepId: 'search-providers', params: { searchTerm: 'Test' } }
  ],
  'provider-mgmt-9': [  // Configure SFTP Credentials (manual test)
    { stepId: 'click-edit-provider' }
  ],
  'provider-mgmt-10': [  // Provider Service Settings (manual test)
    { stepId: 'click-edit-provider' }
  ],

  // ============================================
  // APPOINTMENT CHECKPOINTS (per appointments.spec.md)
  // ============================================
  'appointments-5': [  // Summary Cards
    { stepId: 'view-schedule-tab' }
  ],
  'appointments-6': [  // Create Appointment (new appointment form)
    { stepId: 'click-new-appointment' },
    { stepId: 'fill-appointment' },
    { stepId: 'submit-appointment' },
    { stepId: 'verify-appointment-in-schedule' }
  ],
  'appointments-7': [  // Reschedule Appointment
    { stepId: 'click-edit-appointment' },
    { stepId: 'modify-appointment-time', params: { time: '14:00' } },
    { stepId: 'save-appointment-changes' }
  ],
  'appointments-8': [  // Cancel Appointment
    { stepId: 'click-cancel-appointment' },
    { stepId: 'confirm-delete' },
    { stepId: 'verify-appointment-cancelled' }
  ],
  'appointments-9': [  // Conflict Detection (manual test)
    { stepId: 'click-new-appointment' }
  ],
  'appointments-10': [  // Provider Availability (manual test)
    { stepId: 'view-schedule-tab' }
  ],
  'appointments-11': [  // Recurring Appointments
    { stepId: 'click-new-appointment' },
    { stepId: 'fill-appointment' }
  ],

  // ============================================
  // BILLING/CLAIMS CHECKPOINTS
  // ============================================
  'billing-1': [  // Claims List Display
    { stepId: 'goto-login' },
    { stepId: 'login-admin' },
    { stepId: 'select-admin-portal' },
    { stepId: 'nav-billing' }
  ],
  'billing-2': [  // Create Claim from Session
    { stepId: 'click-create-claim' },
    { stepId: 'select-session-for-claim' }
  ],
  'billing-3': [  // Claim Form - Required Fields (manual verify)
    { stepId: 'click-create-claim' }
  ],
  'billing-4': [  // CMS 1500 Preview (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-5': [  // Generate EDI 837 (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-6': [  // Submit to Clearinghouse (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-7': [  // Claim Status Tracking
    { stepId: 'nav-billing' },
    { stepId: 'verify-claim-in-list' }
  ],
  'billing-8': [  // View 999 Acknowledgments (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-9': [  // View 277CA Status (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-10': [  // Process ERA (835) (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-11': [  // Rejected Claim Handling (manual test)
    { stepId: 'nav-billing' }
  ],
  'billing-12': [  // Claim Search and Filter
    { stepId: 'filter-claims-by-status', params: { status: 'pending' } }
  ],

  // Generic utility
  'screenshot': [{ stepId: 'screenshot' }],
  'close': [{ stepId: 'close-browser' }]
};

/**
 * Get Playwright steps for a checkpoint
 */
export function getStepsForCheckpoint(checkpointId) {
  return checkpointStepMapping[checkpointId] || null;
}

/**
 * Check if a checkpoint has automation available
 */
export function hasAutomation(checkpointId) {
  return !!checkpointStepMapping[checkpointId];
}
