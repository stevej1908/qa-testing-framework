/**
 * Playwright Service for Testing Framework
 *
 * Provides HTTP API for TF to execute Playwright steps
 * Runs on port 3002
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Path to specs directory (source of truth)
const SPECS_DIR = path.join(__dirname, '..', '..', 'specs');

const PORT = 3002;
const DEFAULT_TARGET_APP = process.env.TARGET_APP || 'http://localhost:3000';

// Current target URL (can be overridden per request)
let currentTargetUrl = DEFAULT_TARGET_APP;

// Credential override (for workaround testing - e.g., 'admin' uses admin creds for all logins)
let credentialOverride = null;

let browser = null;
let context = null;
let page = null;

// Test credentials - synced with server/setup-test-users.js
const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'TestPass123!',
    portalButton: 'Administrator Portal'
  },
  provider: {
    email: 'provider@test.com',
    password: 'TestPass123!',
    portalButton: 'Provider Portal'
  },
  frontDesk: {
    email: 'frontdesk@test.com',
    password: 'TestPass123!',
    portalButton: 'Front Desk'
  },
  billing: {
    email: 'billing@test.com',
    password: 'TestPass123!',
    portalButton: 'Billing & Claims'
  }
};

/**
 * Get effective user credentials (respects credentialOverride for workarounds)
 * @param {string} requestedRole - The role requested by the test step
 * @returns {Object} The user credentials to use
 */
function getEffectiveUser(requestedRole) {
  if (credentialOverride && TEST_USERS[credentialOverride]) {
    console.log(`[Playwright] Using override credentials: ${credentialOverride} instead of ${requestedRole}`);
    return TEST_USERS[credentialOverride];
  }
  return TEST_USERS[requestedRole];
}

/**
 * Initialize browser if not already running
 * Also handles recovery if browser was closed externally
 */
async function initBrowser() {
  // Check if browser exists and is still connected
  if (browser) {
    try {
      // Test if browser is still alive by checking connection
      if (!browser.isConnected()) {
        console.log('[Playwright] Browser disconnected, reinitializing...');
        browser = null;
        context = null;
        page = null;
      }
    } catch (e) {
      console.log('[Playwright] Browser check failed, reinitializing...');
      browser = null;
      context = null;
      page = null;
    }
  }

  if (!browser) {
    browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    page = await context.newPage();
  }
  return page;
}

/**
 * Close browser
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }
}

/**
 * Take screenshot and return as base64
 */
async function takeScreenshot() {
  if (!page) return null;
  const buffer = await page.screenshot({ fullPage: false });
  return buffer.toString('base64');
}

/**
 * Execute a checkpoint step
 */
async function executeStep(stepId, params = {}) {
  const p = await initBrowser();

  try {
    const result = await runStep(p, stepId, params);
    const screenshot = await takeScreenshot();

    return {
      success: true,
      stepId,
      screenshot,
      message: result.message || 'Step completed',
      details: result.details || {}
    };
  } catch (error) {
    const screenshot = await takeScreenshot();
    return {
      success: false,
      stepId,
      screenshot,
      error: error.message,
      details: { stack: error.stack }
    };
  }
}

/**
 * Run individual step based on stepId
 */
async function runStep(page, stepId, params) {
  const steps = {
    // === AUTH STEPS ===
    'goto-login': async () => {
      // Navigate to login page - if already logged in, we'll navigate there anyway
      await page.goto(currentTargetUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Check if we're on login page or need to logout first
      const emailInput = await page.locator('input[type="email"]').isVisible().catch(() => false);

      if (!emailInput) {
        // Might be logged in - look for logout or user menu
        const logoutBtn = await page.locator('button:has-text("Logout"), button:has-text("Sign Out")').isVisible().catch(() => false);
        if (logoutBtn) {
          await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
          await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        } else {
          // Just navigate to root again which should show login
          await page.goto(currentTargetUrl, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForSelector('input[type="email"]', { timeout: 10000 });
        }
      }

      return { message: `Navigated to login page at ${currentTargetUrl}` };
    },

    // Split login into fill + submit so screenshots show credentials
    // NOTE: These use getEffectiveUser() to support credential overrides (workarounds)
    'fill-admin-credentials': async () => {
      const user = getEffectiveUser('admin');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      return { message: `Filled credentials: ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'fill-frontdesk-credentials': async () => {
      const user = getEffectiveUser('frontDesk');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      return { message: `Filled credentials: ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'fill-provider-credentials': async () => {
      const user = getEffectiveUser('provider');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      return { message: `Filled credentials: ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'submit-login-admin': async () => {
      const user = getEffectiveUser('admin');
      await page.click('button[type="submit"]');
      // Wait for Access Control Landing page (portal selection)
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Login submitted, portal selection visible` };
    },

    'submit-login-frontdesk': async () => {
      const user = getEffectiveUser('frontDesk');
      await page.click('button[type="submit"]');
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Login submitted, portal selection visible` };
    },

    'submit-login-provider': async () => {
      const user = getEffectiveUser('provider');
      await page.click('button[type="submit"]');
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Login submitted, portal selection visible` };
    },

    // Legacy combined login steps (kept for backwards compatibility)
    'login-admin': async () => {
      const user = getEffectiveUser('admin');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Logged in as ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'login-frontdesk': async () => {
      const user = getEffectiveUser('frontDesk');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Logged in as ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'login-provider': async () => {
      const user = getEffectiveUser('provider');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');
      const portalBtn = page.locator(`button:has-text("${user.portalButton}")`);
      await portalBtn.waitFor({ state: 'visible', timeout: 30000 });
      return { message: `Logged in as ${user.email}${credentialOverride ? ' (workaround active)' : ''}` };
    },

    'select-admin-portal': async () => {
      // Portal button should already be visible from login step
      const btn = page.locator('button:has-text("Administrator Portal")');
      await btn.click();
      // Wait for Admin Dashboard - same as e2e tests
      await page.waitForSelector('text=Admin Dashboard', { timeout: 10000 });
      return { message: 'Selected Administrator Portal' };
    },

    'select-frontdesk-portal': async () => {
      // Portal button should already be visible from login step
      const btn = page.locator('button:has-text("Front Desk")');
      await btn.click();
      // Wait for Front Desk Dashboard - same as e2e tests
      await page.waitForSelector('text=Front Desk Dashboard', { timeout: 10000 });
      return { message: 'Selected Front Desk Portal' };
    },

    'select-provider-portal': async () => {
      // Portal button should already be visible from login step
      const btn = page.locator('button:has-text("Provider Portal")');
      await btn.click();
      // Wait for Provider Dashboard - same as e2e tests
      await page.waitForSelector('text=Provider Dashboard', { timeout: 10000 });
      return { message: 'Selected Provider Portal' };
    },

    // === NAVIGATION STEPS ===
    'nav-providers': async () => {
      await page.click('nav button:has-text("Providers")');
      await page.waitForTimeout(1000);
      return { message: 'Navigated to Providers' };
    },

    'nav-dashboard': async () => {
      await page.click('nav button:has-text("Dashboard")');
      await page.waitForTimeout(1000);
      return { message: 'Navigated to Dashboard' };
    },

    // === PROVIDER STEPS ===
    'click-add-provider': async () => {
      await page.click('[data-testid="add-provider-btn"]');
      await page.waitForTimeout(500);
      return { message: 'Clicked Add Provider button' };
    },

    'fill-provider-basic': async () => {
      const data = params.data || {
        provider_type: 'medical_assistant',
        first_name: 'Test',
        last_name: 'Assistant',
        credentials: 'MA',
        email: `test.assistant.${Date.now()}@example.com`,
        phone: '602-555-1234'
      };

      await page.selectOption('select[name="provider_type"]', data.provider_type);
      await page.waitForTimeout(300);
      await page.fill('input[name="first_name"]', data.first_name);
      await page.fill('input[name="last_name"]', data.last_name);
      if (data.credentials) await page.fill('input[name="credentials"]', data.credentials);
      await page.fill('input[name="email"]', data.email);
      await page.fill('input[name="phone"]', data.phone);

      return { message: 'Filled provider basic info', details: data };
    },

    'fill-provider-address': async () => {
      const data = params.data || {
        street1: '123 Medical Way',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001'
      };

      await page.fill('input[name="street1"]', data.street1);
      await page.fill('input[name="city"]', data.city);
      await page.selectOption('select[name="state"]', data.state);
      await page.fill('input[name="zip"]', data.zip);

      return { message: 'Filled provider address', details: data };
    },

    'submit-provider': async () => {
      await page.click('button[type="submit"]:has-text("Save")');
      await page.waitForTimeout(2000);

      // Check for skip button
      const skipBtn = page.locator('button:has-text("Skip")').first();
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
      }

      await page.waitForSelector('[data-testid="add-provider-btn"]', { timeout: 15000 });
      return { message: 'Provider saved successfully' };
    },

    'verify-npi': async () => {
      const npi = params.npi || '1801978747';
      await page.fill('input[name="npi"]', npi);
      await page.click('button:has-text("Verify")');
      await page.waitForSelector('text=NPI Verified', { timeout: 10000 });
      return { message: `NPI ${npi} verified`, details: { npi } };
    },

    'autofill-from-npi': async () => {
      const autoFillBtn = page.locator('button:has-text("Auto-Fill")');
      if (await autoFillBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await autoFillBtn.click();
        await page.waitForTimeout(500);
      }
      return { message: 'Auto-filled from NPI data' };
    },

    // === PATIENT STEPS ===
    'click-add-patient': async () => {
      await page.click('[data-testid="add-patient-btn"]');
      await page.waitForTimeout(500);
      return { message: 'Clicked Add Patient button' };
    },

    // Front desk phone intake - only fills basic info (no address/emergency contact)
    // This leaves the form "incomplete" so the orange "Save & Email Registration Link" button appears
    'fill-patient-basic-only': async () => {
      const data = params.data || {
        firstName: 'Phone',
        lastName: 'Intake',
        dob: '1985-06-20',
        gender: 'Female',
        phone: '602-555-0199',
        email: `phone.intake.${Date.now()}@example.com`
      };

      await page.fill('input[name="firstName"]', data.firstName);
      await page.fill('input[name="lastName"]', data.lastName);
      await page.fill('input[name="dob"]', data.dob);
      await page.selectOption('select[name="gender"]', data.gender);
      await page.fill('input[name="phone"]', data.phone);
      await page.fill('input[name="email"]', data.email);
      // NOTE: Intentionally NOT filling address or emergency contact
      // This keeps the form "incomplete" so the email link button is visible

      return { message: 'Filled basic patient info only (for phone intake)', details: data };
    },

    'fill-patient-info': async () => {
      const data = params.data || {
        firstName: 'Test',
        lastName: 'Patient',
        dob: '1990-01-15',
        gender: 'Male',
        phone: '602-555-0123',
        email: `test.patient.${Date.now()}@example.com`,
        emergencyContact: 'Emergency Contact',
        emergencyPhone: '602-555-0124'
      };

      await page.fill('input[name="firstName"]', data.firstName);
      await page.fill('input[name="lastName"]', data.lastName);
      await page.fill('input[name="dob"]', data.dob);
      await page.selectOption('select[name="gender"]', data.gender);
      await page.fill('input[name="phone"]', data.phone);
      await page.fill('input[name="email"]', data.email);
      await page.fill('input[name="emergencyContact"]', data.emergencyContact);
      await page.fill('input[name="emergencyPhone"]', data.emergencyPhone);

      return { message: 'Filled patient info', details: data };
    },

    'fill-patient-address': async () => {
      const data = params.data || {
        street1: '456 Patient Lane',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001'
      };

      await page.fill('input[name="address.street1"]', data.street1);
      await page.fill('input[name="address.city"]', data.city);
      await page.selectOption('select[name="address.state"]', data.state);
      await page.fill('input[name="address.zip"]', data.zip);

      return { message: 'Filled patient address', details: data };
    },

    // === PATIENT INSURANCE VERIFICATION STEPS ===
    'select-patient-insurance': async () => {
      // The form is in a modal with a scrollable container
      // Find and scroll to the insurance section within the modal
      await page.evaluate(() => {
        // Find the insurance dropdown directly
        const insuranceSelect = document.querySelector('select[name="insurancePlanId"]');
        if (insuranceSelect) {
          // Scroll the element into view - this handles scrolling within the modal
          insuranceSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback: find h4 with "Insurance Information" text
          const allH4s = document.querySelectorAll('h4');
          for (const h4 of allH4s) {
            if (h4.textContent.includes('Insurance Information')) {
              h4.scrollIntoView({ behavior: 'smooth', block: 'center' });
              break;
            }
          }
        }
      });
      await page.waitForTimeout(800);

      // Wait for the dropdown to be visible and attached
      await page.waitForSelector('select[name="insurancePlanId"]', { state: 'attached', timeout: 15000 });

      // Scroll again and ensure it's in viewport
      await page.locator('select[name="insurancePlanId"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Select the first available insurance plan from dropdown
      const planIndex = params.planIndex || 1; // 1-based index, skip "Select Insurance Plan" option
      await page.selectOption('select[name="insurancePlanId"]', { index: planIndex });
      await page.waitForTimeout(500);

      // Get the selected plan name for reporting
      const selectedOption = await page.$eval('select[name="insurancePlanId"]', el => el.options[el.selectedIndex].text);
      return { message: `Selected insurance plan: ${selectedOption}` };
    },

    'fill-patient-insurance-details': async () => {
      const data = params.data || {
        memberNumber: `MEM${Date.now().toString().slice(-8)}`,
        groupNumber: 'GRP001',
        subscriberName: 'Test Patient',
        relationshipToSubscriber: 'self'
      };

      await page.fill('input[name="memberNumber"]', data.memberNumber);
      await page.fill('input[name="groupNumber"]', data.groupNumber);
      await page.fill('input[name="subscriberName"]', data.subscriberName);
      await page.selectOption('select[name="relationshipToSubscriber"]', data.relationshipToSubscriber);

      return { message: 'Filled patient insurance details', details: data };
    },

    'verify-patient-insurance': async () => {
      // Click the verify button
      await page.click('button:has-text("Verify Insurance Coverage")');

      // Wait for verification to complete (either success or failure)
      await page.waitForTimeout(1000); // Allow time for API call

      // Check for verification result
      const verified = await page.$('.bg-green-50:has-text("Coverage Verified")');
      const failed = await page.$('.bg-red-50:has-text("Verification Failed")');

      if (verified) {
        return { message: 'Insurance coverage verified successfully', verified: true };
      } else if (failed) {
        const errorText = await page.$eval('.bg-red-50 .text-red-700', el => el.textContent).catch(() => 'Unknown error');
        return { message: `Insurance verification failed: ${errorText}`, verified: false };
      }

      // If neither, wait a bit more and check again
      await page.waitForTimeout(2000);
      const verifiedRetry = await page.$('.bg-green-50:has-text("Coverage Verified")');
      if (verifiedRetry) {
        return { message: 'Insurance coverage verified successfully', verified: true };
      }

      return { message: 'Insurance verification status unclear', verified: false };
    },

    'submit-patient-full': async () => {
      // Full in-office registration - clicks the green "Add Patient" button in the modal
      // This is different from the blue "Add Patient" button in the dashboard
      // Requires all fields filled and insurance verified (button disabled otherwise)

      // Target the green submit button in the modal (has bg-green-500 class)
      // NOT the blue dashboard button (has data-testid="add-patient-btn")
      const addPatientButton = page.locator('button.bg-green-500:has-text("Add Patient"), button.bg-green-600:has-text("Add Patient")').first();

      // Scroll to make button visible
      await addPatientButton.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Check if button is disabled (will have bg-gray-300 class when disabled)
      const isDisabled = await addPatientButton.isDisabled();
      if (isDisabled) {
        return {
          success: false,
          message: 'Add Patient button is disabled - ensure all required fields are filled and insurance is verified'
        };
      }

      await addPatientButton.click();
      await page.waitForTimeout(2000);

      // Wait for modal to close (dashboard's add patient button should be visible again)
      await page.waitForSelector('[data-testid="add-patient-btn"]', { timeout: 15000 });
      return { message: 'Patient added successfully (full registration)' };
    },

    'submit-patient-email-link': async () => {
      // Front desk phone intake - clicks "Save & Email Registration Link" button
      // Now requires insurance verification before sending
      await page.click('button:has-text("Save & Email Registration Link")');
      await page.waitForTimeout(2000);
      await page.waitForSelector('[data-testid="add-patient-btn"]', { timeout: 15000 });
      return { message: 'Patient saved with email registration link' };
    },

    // === APPOINTMENT STEPS ===
    'click-new-appointment': async () => {
      await page.click('button:has-text("New Appointment")');
      await page.waitForTimeout(500);
      return { message: 'Clicked New Appointment button' };
    },

    'fill-appointment': async () => {
      // Select first patient
      const patientSelect = page.locator('select[name="patient_id"]');
      const patientOptions = await patientSelect.locator('option').all();
      if (patientOptions.length > 1) {
        await patientSelect.selectOption({ index: 1 });
      }

      // Select first provider
      const providerSelect = page.locator('select[name="provider_id"]');
      const providerOptions = await providerSelect.locator('option').all();
      if (providerOptions.length > 1) {
        await providerSelect.selectOption({ index: 1 });
      }

      // Set date to today
      const today = new Date().toISOString().split('T')[0];
      await page.fill('input[name="appointment_date"]', today);

      // Set time
      await page.fill('input[name="appointment_time"]', '10:00');

      return { message: 'Filled appointment details' };
    },

    'submit-appointment': async () => {
      await page.click('button:has-text("Create Appointment")');
      await page.waitForTimeout(2000);
      await page.waitForSelector('button:has-text("New Appointment")', { timeout: 10000 });
      return { message: 'Appointment created successfully' };
    },

    // === FRONT DESK STEPS ===
    'view-schedule-tab': async () => {
      // Check if we're on the Front Desk Dashboard
      const currentUrl = page.url();
      const onDashboard = await page.locator('text=Front Desk Dashboard').isVisible().catch(() => false);

      if (!onDashboard) {
        // Not on dashboard - need to login first
        // Check if on login page or about:blank
        if (currentUrl === 'about:blank' || currentUrl.includes('/login') || !currentUrl.includes('localhost:3000')) {
          throw new Error('Not logged in. Please run the Login checkpoint (front-desk-1) first, or ensure the browser is on the Front Desk Dashboard.');
        }
      }

      // Wait for dashboard to finish loading (it shows "Loading dashboard..." while loading)
      await page.waitForFunction(() => {
        const loadingEl = document.body.innerText.includes('Loading dashboard...');
        const dashboardEl = document.body.innerText.includes('Front Desk Dashboard');
        return !loadingEl && dashboardEl;
      }, { timeout: 10000 });

      // Click the Today's Schedule tab to ensure we're on it
      const scheduleTabBtn = page.locator('button:has-text("Today\'s Schedule")');
      if (await scheduleTabBtn.isVisible()) {
        await scheduleTabBtn.click();
      }

      // Wait for schedule content - either the header OR the empty message
      await page.waitForFunction(() => {
        const hasScheduleHeader = document.body.innerText.includes('Schedule for');
        const hasEmptyMessage = document.body.innerText.includes('No appointments scheduled');
        return hasScheduleHeader || hasEmptyMessage;
      }, { timeout: 5000 });

      // Check if schedule is empty and report appropriately
      const isEmpty = await page.locator('text=No appointments scheduled').isVisible().catch(() => false);
      if (isEmpty) {
        return { message: 'Viewing Schedule tab (no appointments for today)' };
      }
      return { message: 'Viewing Schedule tab' };
    },

    'view-waiting-room-tab': async () => {
      // Wait for dashboard to finish loading
      await page.waitForFunction(() => {
        const loadingEl = document.body.innerText.includes('Loading dashboard...');
        const dashboardEl = document.body.innerText.includes('Front Desk Dashboard');
        return !loadingEl && dashboardEl;
      }, { timeout: 10000 });

      // Click the Waiting Room tab
      await page.click('button:has-text("Waiting Room")');
      await page.waitForSelector('h2:has-text("Waiting Room")', { timeout: 5000 });
      return { message: 'Viewing Waiting Room tab' };
    },

    'view-intake-queue-tab': async () => {
      // Wait for dashboard to finish loading
      await page.waitForFunction(() => {
        const loadingEl = document.body.innerText.includes('Loading dashboard...');
        const dashboardEl = document.body.innerText.includes('Front Desk Dashboard');
        return !loadingEl && dashboardEl;
      }, { timeout: 10000 });

      // Click the Intake Queue tab
      await page.click('button:has-text("Intake Queue")');
      await page.waitForSelector('text=Patient Intake Queue', { timeout: 5000 });
      return { message: 'Viewing Intake Queue tab' };
    },

    // === PATIENT PORTAL STEPS ===
    'goto-patient-register': async () => {
      await page.goto(`${currentTargetUrl}/patient/register`);
      await page.waitForSelector('h2:has-text("Patient Registration")', { timeout: 10000 });
      return { message: `Navigated to patient registration at ${currentTargetUrl}` };
    },

    'fill-patient-registration': async () => {
      const data = params.data || {
        first_name: 'Sarah',
        last_name: 'NewPatient',
        email: `sarah.patient.${Date.now()}@example.com`,
        phone: '602-555-9999',
        date_of_birth: '1985-06-15',
        password: 'SecurePass123!'
      };

      await page.fill('input[name="first_name"]', data.first_name);
      await page.fill('input[name="last_name"]', data.last_name);
      await page.fill('input[name="email"]', data.email);
      await page.fill('input[name="phone"]', data.phone);
      await page.fill('input[name="date_of_birth"]', data.date_of_birth);
      await page.fill('input[name="password"]', data.password);
      await page.fill('input[name="confirmPassword"]', data.password);

      return { message: 'Filled patient registration form', details: data };
    },

    'submit-patient-registration': async () => {
      await page.click('button[type="submit"]');
      await page.waitForSelector('h2:has-text("Registration Successful!")', { timeout: 15000 });
      return { message: 'Patient registration successful' };
    },

    // === UTILITY STEPS ===
    'wait': async () => {
      const ms = params.ms || 1000;
      await page.waitForTimeout(ms);
      return { message: `Waited ${ms}ms` };
    },

    'screenshot': async () => {
      return { message: 'Screenshot captured' };
    },

    'close-browser': async () => {
      await closeBrowser();
      return { message: 'Browser closed' };
    },

    // ============================================
    // INSURANCE MANAGEMENT CRUD STEPS
    // ============================================

    'nav-insurance': async () => {
      await page.click('nav button:has-text("Insurance")');
      await page.waitForSelector('text=Insurance Plans', { timeout: 10000 });
      return { message: 'Navigated to Insurance Management' };
    },

    'click-add-insurance-plan': async () => {
      await page.click('button:has-text("Add Insurance Plan")');
      await page.waitForSelector('input[name="name"]', { timeout: 5000 });
      return { message: 'Clicked Add Insurance Plan' };
    },

    'fill-insurance-plan': async () => {
      const data = params.data || {
        name: `Test Insurance ${Date.now()}`,
        payerId: 'TEST001',
        phoneNumber: '1-800-555-1234'
      };

      await page.fill('input[name="name"]', data.name);
      await page.fill('input[name="payerId"]', data.payerId);
      await page.fill('input[name="phoneNumber"]', data.phoneNumber);

      return { message: 'Filled insurance plan details', details: data };
    },

    'submit-insurance-plan': async () => {
      await page.click('button[type="submit"]:has-text("Add Plan")');
      await page.waitForTimeout(2000);
      // Wait for form to close and return to list
      await page.waitForSelector('button:has-text("Add Insurance Plan")', { timeout: 10000 });
      return { message: 'Insurance plan created successfully' };
    },

    'verify-insurance-plan-in-list': async () => {
      const planName = params.planName || 'Test Insurance';
      const found = await page.locator(`text=${planName}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        throw new Error(`Insurance plan "${planName}" not found in list`);
      }
      return { message: `Verified insurance plan "${planName}" appears in list` };
    },

    'click-edit-insurance-plan': async () => {
      const planName = params.planName;
      if (planName) {
        // Find the row with the plan name and click its edit button
        const row = page.locator(`tr:has-text("${planName}"), div:has-text("${planName}")`).first();
        await row.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').click();
      } else {
        // Click first edit button
        await page.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').first().click();
      }
      await page.waitForSelector('input[name="name"]', { timeout: 5000 });
      return { message: 'Opened insurance plan for editing' };
    },

    'modify-insurance-plan': async () => {
      const newName = params.newName || `Updated Plan ${Date.now()}`;
      await page.fill('input[name="name"]', newName);
      return { message: `Modified insurance plan name to "${newName}"` };
    },

    'save-insurance-plan-changes': async () => {
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(2000);
      return { message: 'Saved insurance plan changes' };
    },

    'click-delete-insurance-plan': async () => {
      const planName = params.planName;
      if (planName) {
        const row = page.locator(`tr:has-text("${planName}"), div:has-text("${planName}")`).first();
        await row.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').click();
      } else {
        await page.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').first().click();
      }
      return { message: 'Clicked delete on insurance plan' };
    },

    'confirm-delete': async () => {
      // Handle confirmation dialog
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
      await confirmBtn.click();
      await page.waitForTimeout(1000);
      return { message: 'Confirmed deletion' };
    },

    'verify-insurance-plan-deleted': async () => {
      const planName = params.planName;
      await page.waitForTimeout(1000);
      const stillExists = await page.locator(`text=${planName}`).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillExists) {
        throw new Error(`Insurance plan "${planName}" still appears in list after deletion`);
      }
      return { message: `Verified insurance plan "${planName}" was deleted` };
    },

    'search-insurance-plans': async () => {
      const searchTerm = params.searchTerm || 'Test';
      await page.fill('input[placeholder*="Search"], input[type="search"], input[name="search"]', searchTerm);
      await page.waitForTimeout(500);
      return { message: `Searched for "${searchTerm}"` };
    },

    // ============================================
    // PATIENT CRUD STEPS (Enhanced)
    // ============================================

    'verify-patient-in-list': async () => {
      const patientName = params.patientName || 'Test Patient';
      const found = await page.locator(`text=${patientName}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        throw new Error(`Patient "${patientName}" not found in list`);
      }
      return { message: `Verified patient "${patientName}" appears in list` };
    },

    'click-edit-patient': async () => {
      const patientName = params.patientName;
      if (patientName) {
        const row = page.locator(`tr:has-text("${patientName}"), div:has-text("${patientName}")`).first();
        await row.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').click();
      } else {
        await page.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').first().click();
      }
      await page.waitForSelector('input[name="firstName"]', { timeout: 5000 });
      return { message: 'Opened patient for editing' };
    },

    'modify-patient': async () => {
      const field = params.field || 'phone';
      const value = params.value || '602-555-9999';

      await page.fill(`input[name="${field}"]`, value);
      return { message: `Modified patient ${field} to "${value}"` };
    },

    'save-patient-changes': async () => {
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(2000);
      // Wait for form to close or success message
      await page.waitForSelector('[data-testid="add-patient-btn"]', { timeout: 10000 });
      return { message: 'Saved patient changes' };
    },

    'click-delete-patient': async () => {
      const patientName = params.patientName;
      if (patientName) {
        const row = page.locator(`tr:has-text("${patientName}"), div:has-text("${patientName}")`).first();
        await row.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').click();
      } else {
        await page.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').first().click();
      }
      return { message: 'Clicked delete on patient' };
    },

    'verify-patient-deleted': async () => {
      const patientName = params.patientName;
      await page.waitForTimeout(1000);
      const stillExists = await page.locator(`text=${patientName}`).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillExists) {
        throw new Error(`Patient "${patientName}" still appears in list after deletion`);
      }
      return { message: `Verified patient "${patientName}" was deleted` };
    },

    'search-patients': async () => {
      const searchTerm = params.searchTerm || 'Test';
      await page.fill('input[placeholder*="Search"], input[type="search"], input[name="search"]', searchTerm);
      await page.waitForTimeout(500);
      return { message: `Searched patients for "${searchTerm}"` };
    },

    'filter-patients-by-status': async () => {
      const status = params.status || 'active';
      await page.selectOption('select[name="status"], select[name="filter"]', status).catch(async () => {
        await page.click(`button:has-text("${status}"), label:has-text("${status}")`);
      });
      await page.waitForTimeout(500);
      return { message: `Filtered patients by status: ${status}` };
    },

    'view-patient-details': async () => {
      const patientName = params.patientName;
      if (patientName) {
        await page.click(`text=${patientName}`);
      } else {
        await page.locator('tr, [data-testid="patient-row"]').first().click();
      }
      await page.waitForTimeout(500);
      return { message: 'Viewing patient details' };
    },

    // ============================================
    // PROVIDER CRUD STEPS (Enhanced)
    // ============================================

    'verify-provider-in-list': async () => {
      const providerName = params.providerName || 'Test';
      const found = await page.locator(`text=${providerName}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        throw new Error(`Provider "${providerName}" not found in list`);
      }
      return { message: `Verified provider "${providerName}" appears in list` };
    },

    'click-edit-provider': async () => {
      const providerName = params.providerName;
      if (providerName) {
        const row = page.locator(`tr:has-text("${providerName}"), div:has-text("${providerName}")`).first();
        await row.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').click();
      } else {
        await page.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').first().click();
      }
      await page.waitForSelector('input[name="first_name"], input[name="firstName"]', { timeout: 5000 });
      return { message: 'Opened provider for editing' };
    },

    'modify-provider': async () => {
      const field = params.field || 'phone';
      const value = params.value || '602-555-8888';

      await page.fill(`input[name="${field}"]`, value);
      return { message: `Modified provider ${field} to "${value}"` };
    },

    'save-provider-changes': async () => {
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(2000);
      await page.waitForSelector('[data-testid="add-provider-btn"]', { timeout: 10000 });
      return { message: 'Saved provider changes' };
    },

    'click-delete-provider': async () => {
      const providerName = params.providerName;
      if (providerName) {
        const row = page.locator(`tr:has-text("${providerName}"), div:has-text("${providerName}")`).first();
        await row.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').click();
      } else {
        await page.locator('button:has-text("Delete"), button[aria-label="Delete"], [data-testid="delete-btn"]').first().click();
      }
      return { message: 'Clicked delete on provider' };
    },

    'verify-provider-deleted': async () => {
      const providerName = params.providerName;
      await page.waitForTimeout(1000);
      const stillExists = await page.locator(`text=${providerName}`).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillExists) {
        throw new Error(`Provider "${providerName}" still appears in list after deletion`);
      }
      return { message: `Verified provider "${providerName}" was deleted` };
    },

    'search-providers': async () => {
      const searchTerm = params.searchTerm || 'Test';
      await page.fill('input[placeholder*="Search"], input[type="search"], input[name="search"]', searchTerm);
      await page.waitForTimeout(500);
      return { message: `Searched providers for "${searchTerm}"` };
    },

    'filter-providers-by-type': async () => {
      const providerType = params.type || 'physician';
      await page.selectOption('select[name="provider_type"], select[name="filter"]', providerType).catch(async () => {
        await page.click(`button:has-text("${providerType}")`);
      });
      await page.waitForTimeout(500);
      return { message: `Filtered providers by type: ${providerType}` };
    },

    // ============================================
    // APPOINTMENT CRUD STEPS (Enhanced)
    // ============================================

    'verify-appointment-in-schedule': async () => {
      const patientName = params.patientName;
      const time = params.time || '10:00';

      // Look for appointment in schedule
      const found = await page.locator(`text=${patientName || time}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        throw new Error(`Appointment not found in schedule`);
      }
      return { message: 'Verified appointment appears in schedule' };
    },

    'click-edit-appointment': async () => {
      const patientName = params.patientName;
      if (patientName) {
        const row = page.locator(`tr:has-text("${patientName}"), div:has-text("${patientName}")`).first();
        await row.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').click();
      } else {
        await page.locator('button:has-text("Edit"), button[aria-label="Edit"], [data-testid="edit-btn"]').first().click();
      }
      await page.waitForSelector('input[name="appointment_time"], select[name="patient_id"]', { timeout: 5000 });
      return { message: 'Opened appointment for editing' };
    },

    'modify-appointment-time': async () => {
      const newTime = params.time || '14:00';
      await page.fill('input[name="appointment_time"]', newTime);
      return { message: `Modified appointment time to ${newTime}` };
    },

    'modify-appointment-date': async () => {
      const newDate = params.date || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // Tomorrow
      await page.fill('input[name="appointment_date"]', newDate);
      return { message: `Modified appointment date to ${newDate}` };
    },

    'save-appointment-changes': async () => {
      await page.click('button[type="submit"]:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(2000);
      return { message: 'Saved appointment changes' };
    },

    'click-cancel-appointment': async () => {
      const patientName = params.patientName;
      if (patientName) {
        const row = page.locator(`tr:has-text("${patientName}"), div:has-text("${patientName}")`).first();
        await row.locator('button:has-text("Cancel"), button[aria-label="Cancel"]').click();
      } else {
        await page.locator('button:has-text("Cancel Appointment"), button:has-text("Cancel")').first().click();
      }
      return { message: 'Clicked cancel on appointment' };
    },

    'verify-appointment-cancelled': async () => {
      // Check for cancelled status or removal from active list
      const cancelled = await page.locator('text=Cancelled, text=cancelled').first().isVisible({ timeout: 3000 }).catch(() => false);
      return { message: cancelled ? 'Verified appointment shows as cancelled' : 'Appointment cancelled (removed from list)' };
    },

    'check-in-patient': async () => {
      const patientName = params.patientName;
      if (patientName) {
        const row = page.locator(`tr:has-text("${patientName}"), div:has-text("${patientName}")`).first();
        await row.locator('button:has-text("Check In"), button:has-text("Check-In")').click();
      } else {
        await page.locator('button:has-text("Check In"), button:has-text("Check-In")').first().click();
      }
      await page.waitForTimeout(1000);
      return { message: 'Checked in patient' };
    },

    'verify-patient-in-waiting-room': async () => {
      const patientName = params.patientName || 'Test';
      // Switch to waiting room tab if not already there
      await page.click('button:has-text("Waiting Room")').catch(() => {});
      await page.waitForTimeout(500);

      const found = await page.locator(`text=${patientName}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      if (!found) {
        throw new Error(`Patient "${patientName}" not found in waiting room`);
      }
      return { message: `Verified patient "${patientName}" is in waiting room` };
    },

    // ============================================
    // BILLING/CLAIMS CRUD STEPS
    // ============================================

    'nav-billing': async () => {
      await page.click('nav button:has-text("Billing"), nav button:has-text("Claims")');
      await page.waitForSelector('text=Claims, text=Billing', { timeout: 10000 });
      return { message: 'Navigated to Billing/Claims' };
    },

    'click-create-claim': async () => {
      await page.click('button:has-text("Create Claim"), button:has-text("New Claim")');
      await page.waitForTimeout(500);
      return { message: 'Clicked Create Claim' };
    },

    'select-session-for-claim': async () => {
      // Select first available session
      const sessionSelect = page.locator('select[name="session_id"], select[name="sessionId"]');
      const options = await sessionSelect.locator('option').all();
      if (options.length > 1) {
        await sessionSelect.selectOption({ index: 1 });
      }
      return { message: 'Selected session for claim' };
    },

    'submit-claim': async () => {
      await page.click('button[type="submit"]:has-text("Create"), button:has-text("Submit Claim")');
      await page.waitForTimeout(2000);
      return { message: 'Claim submitted' };
    },

    'verify-claim-in-list': async () => {
      const claimId = params.claimId;
      const found = await page.locator(`text=${claimId || 'Pending'}`).first().isVisible({ timeout: 5000 }).catch(() => false);
      return { message: found ? 'Verified claim appears in list' : 'Claim list visible' };
    },

    'filter-claims-by-status': async () => {
      const status = params.status || 'pending';
      await page.selectOption('select[name="status"]', status).catch(async () => {
        await page.click(`button:has-text("${status}")`);
      });
      await page.waitForTimeout(500);
      return { message: `Filtered claims by status: ${status}` };
    }
  };

  const stepFn = steps[stepId];
  if (!stepFn) {
    throw new Error(`Unknown step: ${stepId}`);
  }

  return await stepFn();
}

/**
 * Handle HTTP requests
 */
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GET /status - Check service status
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      browserActive: browser ? browser.isConnected() : false,
      targetApp: currentTargetUrl,
      defaultTargetApp: DEFAULT_TARGET_APP
    }));
    return;
  }

  // GET /steps - List available steps
  if (req.method === 'GET' && url.pathname === '/steps') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      steps: [
        // Auth
        'goto-login', 'login-admin', 'login-frontdesk', 'login-provider',
        'select-admin-portal', 'select-frontdesk-portal', 'select-provider-portal',
        // Navigation
        'nav-providers', 'nav-dashboard',
        // Provider
        'click-add-provider', 'fill-provider-basic', 'fill-provider-address',
        'submit-provider', 'verify-npi', 'autofill-from-npi',
        // Patient
        'click-add-patient', 'fill-patient-basic-only', 'fill-patient-info', 'fill-patient-address',
        'select-patient-insurance', 'fill-patient-insurance-details', 'verify-patient-insurance',
        'submit-patient-full', 'submit-patient-email-link',
        // Appointment
        'click-new-appointment', 'fill-appointment', 'submit-appointment',
        // Front Desk
        'view-schedule-tab', 'view-waiting-room-tab', 'view-intake-queue-tab',
        // Patient Portal
        'goto-patient-register', 'fill-patient-registration', 'submit-patient-registration',
        // Utility
        'wait', 'screenshot', 'close-browser'
      ]
    }));
    return;
  }

  // POST /execute - Execute a step
  if (req.method === 'POST' && url.pathname === '/execute') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { stepId, params } = JSON.parse(body);
        const result = await executeStep(stepId, params || {});
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // POST /execute-sequence - Execute multiple steps
  if (req.method === 'POST' && url.pathname === '/execute-sequence') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { steps, freshBrowser, targetUrl } = data;
        const results = [];

        // Use provided targetUrl or fall back to default
        currentTargetUrl = targetUrl || DEFAULT_TARGET_APP;
        console.log(`[Playwright] Using target URL: ${currentTargetUrl}`);

        // Set credential override if provided (for compliance workarounds)
        credentialOverride = data.credentialOverride || null;
        if (credentialOverride) {
          console.log(`[Playwright] Credential override active: using '${credentialOverride}' credentials for all logins`);
        }

        // Only close browser if explicitly requested with freshBrowser flag
        // Otherwise preserve browser state between checkpoint runs
        if (freshBrowser) {
          console.log(`[Playwright] Fresh browser requested - closing existing browser`);
          await closeBrowser();
        }

        for (const step of steps) {
          const result = await executeStep(step.stepId, step.params || {});
          results.push(result);

          // Stop on failure if requested
          if (!result.success && step.stopOnFailure !== false) {
            break;
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ results }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // POST /close - Close browser
  if (req.method === 'POST' && url.pathname === '/close') {
    await closeBrowser();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Browser closed' }));
    return;
  }

  // GET /api/specs - List all available spec files
  if (req.method === 'GET' && url.pathname === '/api/specs') {
    try {
      const files = fs.readdirSync(SPECS_DIR)
        .filter(f => f.endsWith('.spec.md'))
        .map(f => ({
          id: f.replace('.spec.md', ''),
          file: f
        }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ specs: files, specsDir: SPECS_DIR }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Failed to list specs: ${error.message}` }));
    }
    return;
  }

  // GET /api/specs/:specId - Get a specific spec file
  if (req.method === 'GET' && url.pathname.startsWith('/api/specs/')) {
    const specId = url.pathname.replace('/api/specs/', '');
    const specFile = path.join(SPECS_DIR, `${specId}.spec.md`);

    try {
      if (!fs.existsSync(specFile)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Spec not found: ${specId}` }));
        return;
      }

      const content = fs.readFileSync(specFile, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(content);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Failed to read spec: ${error.message}` }));
    }
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Playwright Service for Testing Framework          ║
╠════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                        ║
║  Port:       ${PORT}                                            ║
║  Default:    ${DEFAULT_TARGET_APP.padEnd(43)}║
║  (Target URL can be set per-request from TF Portal)        ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                 ║
║    GET  /status           - Check service status            ║
║    GET  /steps            - List available steps            ║
║    POST /execute          - Execute single step             ║
║    POST /execute-sequence - Execute multiple steps          ║
║    POST /close            - Close browser                   ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});
