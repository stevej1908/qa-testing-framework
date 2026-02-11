/**
 * SpecManager - Manages app-specific test specifications
 *
 * Features:
 * - Stores specs per app (identified by GitHub repo)
 * - Detects existing specs for a repo
 * - Tracks last update time and code changes
 * - Generates initial specs by analyzing repo structure
 * - Updates specs when code changes are detected
 */

const STORAGE_KEY = 'tf_app_specs';
const PLAYWRIGHT_SERVICE_URL = 'http://localhost:3002';

class SpecManager {
  constructor() {
    this.specsCache = new Map();
    this.loadFromStorage();
  }

  /**
   * Load specs from localStorage
   */
  loadFromStorage() {
    try {
      // Clear existing cache before loading
      this.specsCache.clear();

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([appId, appData]) => {
          this.specsCache.set(appId, appData);
        });
      }
    } catch (error) {
      console.error('Failed to load specs from storage:', error);
    }
  }

  /**
   * Refresh cache from localStorage (call when switching repos or after localStorage changes)
   */
  refreshCache() {
    this.loadFromStorage();
  }

  /**
   * Save specs to localStorage
   */
  saveToStorage() {
    try {
      const data = {};
      this.specsCache.forEach((value, key) => {
        data[key] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save specs to storage:', error);
    }
  }

  /**
   * Generate app ID from GitHub repo
   * @param {string} repo - GitHub repo in format "owner/repo-name"
   * @returns {string} Normalized app ID
   */
  getAppId(repo) {
    return repo.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /**
   * Check if specs exist for an app
   * @param {string} repo - GitHub repo
   * @returns {Object} Status object with exists, lastUpdated, specCount
   */
  hasSpecs(repo) {
    const appId = this.getAppId(repo);
    const appData = this.specsCache.get(appId);

    if (!appData || !appData.specs || appData.specs.length === 0) {
      return { exists: false, lastUpdated: null, specCount: 0 };
    }

    return {
      exists: true,
      lastUpdated: appData.lastUpdated,
      specCount: appData.specs.length,
      lastCommitSha: appData.lastCommitSha,
      appName: appData.appName
    };
  }

  /**
   * Get specs for an app
   * @param {string} repo - GitHub repo
   * @returns {Array} Array of spec metadata
   */
  getSpecs(repo) {
    const appId = this.getAppId(repo);
    const appData = this.specsCache.get(appId);
    return appData?.specs || [];
  }

  /**
   * Get a specific spec by ID
   * @param {string} repo - GitHub repo
   * @param {string} specId - Spec ID
   * @returns {Object|null} Full spec object
   */
  getSpec(repo, specId) {
    const appId = this.getAppId(repo);
    const appData = this.specsCache.get(appId);
    return appData?.fullSpecs?.[specId] || null;
  }

  /**
   * Save specs for an app
   * @param {string} repo - GitHub repo
   * @param {Array} specs - Array of spec metadata
   * @param {Object} fullSpecs - Full spec objects keyed by ID
   * @param {string} lastCommitSha - Last analyzed commit SHA
   */
  saveSpecs(repo, specs, fullSpecs, lastCommitSha = null) {
    const appId = this.getAppId(repo);
    const appName = repo.split('/').pop();

    this.specsCache.set(appId, {
      repo,
      appId,
      appName,
      specs,
      fullSpecs,
      lastUpdated: new Date().toISOString(),
      lastCommitSha
    });

    this.saveToStorage();
  }

  /**
   * Check if specs need updating based on recent commits
   * @param {string} repo - GitHub repo
   * @param {Array} recentCommits - Recent commits from GitHub
   * @returns {Object} Update status with needsUpdate, reason, changedFiles
   */
  checkForUpdates(repo, recentCommits) {
    const appId = this.getAppId(repo);
    const appData = this.specsCache.get(appId);

    if (!appData) {
      return { needsUpdate: true, reason: 'no_specs', changedFiles: [] };
    }

    // If no commits to compare, specs are up to date
    if (!recentCommits || recentCommits.length === 0) {
      return { needsUpdate: false, reason: 'no_changes', changedFiles: [] };
    }

    // Check if any commits are newer than last update
    const lastUpdated = new Date(appData.lastUpdated);
    const newerCommits = recentCommits.filter(c => new Date(c.date) > lastUpdated);

    if (newerCommits.length === 0) {
      return { needsUpdate: false, reason: 'up_to_date', changedFiles: [] };
    }

    // Check if commits affect spec-relevant files
    const relevantPatterns = [
      /src\/components\//,
      /src\/pages\//,
      /src\/routes\//,
      /server\/routes\//,
      /api\//,
      /\.jsx?$/,
      /\.tsx?$/
    ];

    // We would need to fetch changed files per commit for accurate detection
    // For now, assume any code commit might need spec review
    return {
      needsUpdate: true,
      reason: 'new_commits',
      commitCount: newerCommits.length,
      changedFiles: [],
      newerCommits: newerCommits.slice(0, 5) // Return first 5 for display
    };
  }

  /**
   * Generate initial specs by analyzing repo structure
   * @param {Object} repoAnalyzer - GitHubRepoAnalyzer instance
   * @param {string} appType - Type of app (project-management, healthcare, etc.)
   * @returns {Promise<Object>} Generated specs
   */
  async generateSpecs(repoAnalyzer, appType = 'project-management') {
    const analysis = await repoAnalyzer.analyzeRepo();

    // Get specs template based on app type
    const specs = this.getSpecsTemplate(appType, analysis);

    return {
      specs: specs.map(s => ({ id: s.id, name: s.name, file: s.file })),
      fullSpecs: specs.reduce((acc, s) => { acc[s.id] = s; return acc; }, {}),
      analysis
    };
  }

  /**
   * Get specs template based on app type
   * @param {string} appType - Type of application
   * @param {Object} analysis - Repo analysis data
   * @returns {Array} Spec templates
   */
  getSpecsTemplate(appType, analysis) {
    const templates = {
      'project-management': this.getProjectManagementSpecs(analysis),
      'healthcare': this.getBehavioralHealthSpecs(analysis),
      'property-management': this.getPropertyManagementSpecs(analysis)
    };

    return templates[appType] || templates['project-management'];
  }

  /**
   * Generate Project Management app specs
   */
  getProjectManagementSpecs(analysis) {
    return [
      {
        id: 'auth-login',
        name: 'Authentication - Login',
        file: 'auth-login.spec.md',
        version: '1.1',
        checkpoints: [
          {
            id: 'auth-login-1',
            action: 'Login Page Display',
            description: 'Login page renders correctly with all authentication options',
            steps: ['Navigate to application root (/)', 'Verify login options are visible'],
            expectedResult: 'Login page displays with available sign-in methods',
            expectedItems: ['Login page loads without errors', 'Sign-in options are visible', 'Page is styled correctly']
          },
          {
            id: 'auth-login-2',
            action: 'Google OAuth Login',
            description: 'User can sign in using Google account',
            steps: ['Click "Sign in with Google" button', 'Complete Google authentication flow', 'Return to application'],
            expectedResult: 'User is authenticated and redirected to dashboard',
            expectedItems: ['Google sign-in popup/redirect appears', 'User is authenticated after Google flow', 'User is redirected to dashboard', 'User info displayed in header']
          },
          {
            id: 'auth-login-3',
            action: 'Email/Password Login',
            description: 'User can login with email and password (if available)',
            steps: ['Enter valid email', 'Enter valid password', 'Click submit/login button'],
            expectedResult: 'User is redirected to dashboard; Auth token is stored',
            expectedItems: ['User is redirected to dashboard', 'Auth token is stored', 'User info displayed in header']
          },
          {
            id: 'auth-login-4',
            action: 'Invalid Credentials',
            description: 'Login fails with invalid credentials',
            steps: ['Enter invalid email or password', 'Click submit button'],
            expectedResult: 'Error message is displayed; User remains on login page',
            expectedItems: ['Error message is displayed', 'User remains on login page', 'No auth token stored']
          },
          {
            id: 'auth-login-5',
            action: 'Logout',
            description: 'User can logout and session is cleared',
            steps: ['Login successfully (via any method)', 'Click logout button or menu option'],
            expectedResult: 'User is redirected to login page; Session cleared',
            expectedItems: ['User is redirected to login page', 'Auth token is removed', 'Protected routes inaccessible']
          },
          {
            id: 'auth-login-6',
            action: 'Session Persistence',
            description: 'User session persists across page refreshes',
            steps: ['Login successfully', 'Refresh the page'],
            expectedResult: 'User remains logged in after refresh',
            expectedItems: ['User stays on authenticated page', 'User info still displayed', 'No re-login required']
          }
        ]
      },
      {
        id: 'projects',
        name: 'Project Management',
        file: 'projects.spec.md',
        version: '1.0',
        checkpoints: [
          {
            id: 'projects-1',
            action: 'Projects List View',
            description: 'User can view list of projects',
            steps: ['Login as authorized user', 'Navigate to projects page'],
            expectedResult: 'Projects list displays with project cards/rows',
            expectedItems: ['Projects list visible', 'Project names displayed', 'Project status indicators visible']
          },
          {
            id: 'projects-2',
            action: 'Create New Project',
            description: 'User can create a new project',
            steps: ['Click "New Project" button', 'Fill in project name and details', 'Click save/create'],
            expectedResult: 'Project is created and appears in list',
            expectedItems: ['Project creation form displayed', 'Project saved successfully', 'New project appears in list']
          },
          {
            id: 'projects-3',
            action: 'Edit Project',
            description: 'User can edit project details',
            steps: ['Click on project to open', 'Click edit button', 'Modify project details', 'Save changes'],
            expectedResult: 'Project is updated with new information',
            expectedItems: ['Edit form pre-populated', 'Changes saved successfully', 'Updated info displayed']
          },
          {
            id: 'projects-4',
            action: 'Delete Project',
            description: 'User can delete a project',
            steps: ['Open project', 'Click delete button', 'Confirm deletion'],
            expectedResult: 'Project is removed from system',
            expectedItems: ['Confirmation dialog shown', 'Project deleted', 'Project no longer in list']
          },
          {
            id: 'projects-5',
            action: 'Project Details View',
            description: 'User can view full project details',
            steps: ['Click on project from list'],
            expectedResult: 'Project details page shows all information',
            expectedItems: ['Project name and description', 'Task list/count', 'Team members', 'Project status']
          }
        ]
      },
      {
        id: 'tasks',
        name: 'Task Management',
        file: 'tasks.spec.md',
        version: '1.0',
        checkpoints: [
          {
            id: 'tasks-1',
            action: 'Task List View',
            description: 'User can view tasks within a project',
            steps: ['Open a project', 'View tasks section'],
            expectedResult: 'Tasks list displays with status and assignee',
            expectedItems: ['Tasks list visible', 'Task titles displayed', 'Status indicators visible']
          },
          {
            id: 'tasks-2',
            action: 'Create Task',
            description: 'User can create a new task',
            steps: ['Click "Add Task" button', 'Enter task title and details', 'Assign to team member', 'Save task'],
            expectedResult: 'Task is created and appears in project',
            expectedItems: ['Task form displayed', 'Task saved successfully', 'Task appears in list']
          },
          {
            id: 'tasks-3',
            action: 'Update Task Status',
            description: 'User can change task status',
            steps: ['Find task in list', 'Change status (To Do → In Progress → Done)'],
            expectedResult: 'Task status is updated',
            expectedItems: ['Status dropdown/buttons work', 'Status change persists', 'UI reflects new status']
          },
          {
            id: 'tasks-4',
            action: 'Assign Task',
            description: 'User can assign/reassign task to team member',
            steps: ['Open task', 'Click assignee field', 'Select team member'],
            expectedResult: 'Task is assigned to selected user',
            expectedItems: ['Team member list shown', 'Assignment saved', 'Assignee displayed on task']
          },
          {
            id: 'tasks-5',
            action: 'Task Due Date',
            description: 'User can set/modify task due date',
            steps: ['Open task', 'Set due date', 'Save changes'],
            expectedResult: 'Due date is saved and displayed',
            expectedItems: ['Date picker works', 'Due date saved', 'Due date shown on task']
          },
          {
            id: 'tasks-6',
            action: 'Delete Task',
            description: 'User can delete a task',
            steps: ['Open task', 'Click delete', 'Confirm deletion'],
            expectedResult: 'Task is removed',
            expectedItems: ['Confirmation shown', 'Task deleted', 'Task removed from list']
          }
        ]
      },
      {
        id: 'team',
        name: 'Team Management',
        file: 'team.spec.md',
        version: '1.0',
        checkpoints: [
          {
            id: 'team-1',
            action: 'View Team Members',
            description: 'User can view team/organization members',
            steps: ['Navigate to team/members page'],
            expectedResult: 'Team member list displayed',
            expectedItems: ['Member names visible', 'Member roles displayed', 'Member avatars/photos shown']
          },
          {
            id: 'team-2',
            action: 'Invite Team Member',
            description: 'Admin can invite new team members',
            steps: ['Click invite button', 'Enter email address', 'Select role', 'Send invitation'],
            expectedResult: 'Invitation is sent',
            expectedItems: ['Invite form displayed', 'Email validation works', 'Invitation sent confirmation']
          },
          {
            id: 'team-3',
            action: 'Modify Member Role',
            description: 'Admin can change member roles',
            steps: ['Select team member', 'Click role dropdown', 'Select new role', 'Save'],
            expectedResult: 'Member role is updated',
            expectedItems: ['Role options displayed', 'Role change saved', 'New role reflected in UI']
          },
          {
            id: 'team-4',
            action: 'Remove Team Member',
            description: 'Admin can remove team members',
            steps: ['Select team member', 'Click remove button', 'Confirm removal'],
            expectedResult: 'Member is removed from team',
            expectedItems: ['Confirmation dialog shown', 'Member removed', 'Member no longer in list']
          }
        ]
      },
      {
        id: 'dashboard',
        name: 'Dashboard',
        file: 'dashboard.spec.md',
        version: '1.0',
        checkpoints: [
          {
            id: 'dashboard-1',
            action: 'Dashboard Load',
            description: 'Dashboard loads with summary data',
            steps: ['Login and navigate to dashboard'],
            expectedResult: 'Dashboard displays with widgets/cards',
            expectedItems: ['Dashboard loads without errors', 'Summary statistics visible', 'Recent activity shown']
          },
          {
            id: 'dashboard-2',
            action: 'Project Summary',
            description: 'Dashboard shows project overview',
            steps: ['View dashboard project section'],
            expectedResult: 'Project counts and status summary displayed',
            expectedItems: ['Active projects count', 'Project status breakdown', 'Recent projects listed']
          },
          {
            id: 'dashboard-3',
            action: 'Task Summary',
            description: 'Dashboard shows task overview',
            steps: ['View dashboard tasks section'],
            expectedResult: 'Task statistics displayed',
            expectedItems: ['Tasks assigned to user', 'Overdue tasks highlighted', 'Task completion stats']
          },
          {
            id: 'dashboard-4',
            action: 'Quick Actions',
            description: 'Dashboard provides quick action buttons',
            steps: ['Locate quick action buttons on dashboard'],
            expectedResult: 'Quick actions are functional',
            expectedItems: ['New Project button works', 'New Task button works', 'Navigation shortcuts work']
          }
        ]
      }
    ];
  }

  /**
   * Generate Behavioral Health Billing app specs - based on actual codebase analysis
   * Covers: catch-me-bill-test / behavioral health billing application
   */
  getBehavioralHealthSpecs(analysis) {
    return [
      // ============================================
      // AUTHENTICATION & ACCESS CONTROL
      // ============================================
      {
        id: 'auth-multi-role',
        name: 'Authentication - Multi-Role Login',
        file: 'auth-multi-role.spec.md',
        version: '1.0',
        dataDomains: ['authentication', 'access-control'],
        sourceFiles: ['server/routes/auth.js', 'src/components/auth/Login.jsx'],
        checkpoints: [
          {
            id: 'auth-1',
            action: 'Login Page Display',
            description: 'Login page renders with practice subdomain context',
            steps: ['Navigate to practice subdomain (practice.rtm-app.com)', 'Verify login form loads'],
            expectedResult: 'Login page displays with practice branding',
            expectedItems: ['Login form visible', 'Practice name/logo displayed', 'Email and password fields present']
          },
          {
            id: 'auth-2',
            action: 'Admin Login',
            description: 'Practice admin can login with valid credentials',
            steps: ['Enter admin email', 'Enter password', 'Click login'],
            expectedResult: 'Admin redirected to Admin Dashboard',
            expectedItems: ['Login succeeds', 'JWT token stored', 'Admin Dashboard displayed', 'Full navigation available']
          },
          {
            id: 'auth-3',
            action: 'Provider Login',
            description: 'Provider/clinician can login',
            steps: ['Enter provider credentials', 'Click login'],
            expectedResult: 'Provider sees patient-focused dashboard',
            expectedItems: ['Login succeeds', 'Provider dashboard displayed', 'Patient list accessible', 'Session documentation available']
          },
          {
            id: 'auth-4',
            action: 'Front Desk Login',
            description: 'Front desk staff can login',
            steps: ['Enter front desk credentials', 'Click login'],
            expectedResult: 'Front desk dashboard with scheduling view',
            expectedItems: ['Login succeeds', 'Scheduling calendar visible', 'Patient check-in available', 'Limited admin access']
          },
          {
            id: 'auth-5',
            action: 'Billing Admin Login',
            description: 'Billing administrator can login',
            steps: ['Enter billing admin credentials', 'Click login'],
            expectedResult: 'Billing-focused dashboard displayed',
            expectedItems: ['Login succeeds', 'Claims management visible', 'EDI transactions accessible', 'No clinical data access']
          },
          {
            id: 'auth-6',
            action: 'Invalid Credentials',
            description: 'Login fails with wrong password',
            steps: ['Enter valid email', 'Enter wrong password', 'Click login'],
            expectedResult: 'Error message, no authentication',
            expectedItems: ['Error message shown', 'User remains on login', 'No token stored', 'Account not locked after 1 attempt']
          },
          {
            id: 'auth-7',
            action: 'Password Requirements',
            description: 'Password must meet complexity requirements',
            steps: ['Attempt password change with weak password'],
            expectedResult: 'Validation enforces: 12+ chars, uppercase, lowercase, number, special char',
            expectedItems: ['Validation error for short password', 'Validation error for missing uppercase', 'Clear requirements displayed']
          },
          {
            id: 'auth-8',
            action: 'Logout',
            description: 'User can logout and session is cleared',
            steps: ['Click logout button', 'Verify redirect'],
            expectedResult: 'Session terminated, redirected to login',
            expectedItems: ['Token invalidated', 'Redirected to login', 'Protected routes inaccessible']
          }
        ]
      },
      {
        id: 'auth-2fa',
        name: 'Authentication - Two-Factor (2FA)',
        file: 'auth-2fa.spec.md',
        version: '1.0',
        dataDomains: ['authentication', 'security'],
        sourceFiles: ['server/routes/auth.js'],
        checkpoints: [
          {
            id: '2fa-1',
            action: 'Enable 2FA',
            description: 'User can enable TOTP-based 2FA',
            steps: ['Go to security settings', 'Click enable 2FA', 'Scan QR code with authenticator app', 'Enter verification code'],
            expectedResult: '2FA enabled, backup codes generated',
            expectedItems: ['QR code displayed', 'Verification succeeds', 'Backup codes shown (save prompt)', '2FA status shows enabled']
          },
          {
            id: '2fa-2',
            action: '2FA Login Flow',
            description: 'User with 2FA must enter code after password',
            steps: ['Login with email/password', 'Enter TOTP code from authenticator'],
            expectedResult: 'Access granted after valid 2FA code',
            expectedItems: ['2FA prompt after password', 'Valid code grants access', 'Invalid code rejected']
          },
          {
            id: '2fa-3',
            action: 'Backup Code Recovery',
            description: 'User can login with backup code if authenticator unavailable',
            steps: ['Login with email/password', 'Click "Use backup code"', 'Enter backup code'],
            expectedResult: 'Access granted, backup code consumed',
            expectedItems: ['Backup code option available', 'Valid backup code works', 'Code marked as used']
          },
          {
            id: '2fa-4',
            action: 'Disable 2FA',
            description: 'User can disable 2FA with verification',
            steps: ['Go to security settings', 'Click disable 2FA', 'Confirm with password/code'],
            expectedResult: '2FA disabled',
            expectedItems: ['Confirmation required', '2FA removed from account', 'Future logins skip 2FA']
          }
        ]
      },
      {
        id: 'auth-patient-portal',
        name: 'Authentication - Patient Portal',
        file: 'auth-patient-portal.spec.md',
        version: '1.0',
        dataDomains: ['authentication', 'patient-portal'],
        sourceFiles: ['src/components/patient/PatientLogin.jsx', 'src/components/patient/PatientRegister.jsx'],
        checkpoints: [
          {
            id: 'patient-auth-1',
            action: 'Patient Registration',
            description: 'New patient can self-register',
            steps: ['Navigate to patient portal', 'Click register', 'Fill registration form', 'Submit'],
            expectedResult: 'Account created, verification email sent',
            expectedItems: ['Registration form displayed', 'Email validation works', 'Success message shown', 'Verification email sent']
          },
          {
            id: 'patient-auth-2',
            action: 'Email Verification',
            description: 'Patient must verify email before full access',
            steps: ['Check email for verification link', 'Click verification link'],
            expectedResult: 'Email verified, account activated',
            expectedItems: ['Verification link works', 'Account status updated', 'Full portal access granted']
          },
          {
            id: 'patient-auth-3',
            action: 'Patient Login',
            description: 'Verified patient can login',
            steps: ['Enter email', 'Enter password', 'Click login'],
            expectedResult: 'Patient dashboard displayed',
            expectedItems: ['Login succeeds', 'Patient dashboard shown', 'Profile accessible', 'Appointments visible']
          },
          {
            id: 'patient-auth-4',
            action: 'Password Reset',
            description: 'Patient can reset forgotten password',
            steps: ['Click forgot password', 'Enter email', 'Check email for reset link', 'Set new password'],
            expectedResult: 'Password changed, can login with new password',
            expectedItems: ['Reset email sent', 'Reset link works', 'New password accepted', 'Login with new password works']
          }
        ]
      },

      // ============================================
      // PATIENT MANAGEMENT
      // ============================================
      {
        id: 'patient-management',
        name: 'Patient Management',
        file: 'patient-management.spec.md',
        version: '1.0',
        dataDomains: ['patients', 'PHI'],
        requiredRole: 'admin',
        sourceFiles: ['server/routes/patients.js', 'src/components/admin/AddPatientForm.jsx'],
        checkpoints: [
          {
            id: 'patient-1',
            action: 'View Patient Directory',
            description: 'Admin can view all patients',
            steps: ['Login as admin', 'Navigate to Patients'],
            expectedResult: 'Patient list with search and filters',
            expectedItems: ['Patient list displayed', 'Search box available', 'Patient count shown', 'Pagination works']
          },
          {
            id: 'patient-2',
            action: 'Search Patients',
            description: 'Search by name, DOB, or account number',
            steps: ['Enter search term', 'View filtered results'],
            expectedResult: 'Matching patients displayed',
            expectedItems: ['Search filters results', 'Name search works', 'Account number search works', 'Clear search option']
          },
          {
            id: 'patient-3',
            action: 'Add New Patient',
            description: 'Create new patient record',
            steps: ['Click Add Patient', 'Fill demographics', 'Add insurance', 'Save'],
            expectedResult: 'Patient created with account number',
            expectedItems: ['Patient form displayed', 'Required fields validated', 'Account number auto-generated', 'Patient appears in list']
          },
          {
            id: 'patient-4',
            action: 'Edit Patient',
            description: 'Update patient information',
            steps: ['Select patient', 'Click edit', 'Modify fields', 'Save'],
            expectedResult: 'Patient info updated',
            expectedItems: ['Edit form pre-populated', 'Changes saved', 'Audit trail updated', 'Updated info displayed']
          },
          {
            id: 'patient-5',
            action: 'Patient Insurance',
            description: 'Manage patient insurance plans',
            steps: ['Open patient profile', 'Go to Insurance tab', 'Add/edit insurance'],
            expectedResult: 'Insurance linked to patient',
            expectedItems: ['Primary insurance assignable', 'Secondary insurance optional', 'Payer ID captured', 'Member ID stored']
          },
          {
            id: 'patient-6',
            action: 'Deactivate Patient',
            description: 'Deactivate patient record',
            steps: ['Select patient', 'Click deactivate', 'Confirm'],
            expectedResult: 'Patient marked inactive, data preserved',
            expectedItems: ['Confirmation required', 'Status changed to inactive', 'Historical data preserved', 'Patient hidden from active lists']
          }
        ]
      },

      // ============================================
      // APPOINTMENTS & SCHEDULING
      // ============================================
      {
        id: 'appointments',
        name: 'Appointment Scheduling',
        file: 'appointments.spec.md',
        version: '1.0',
        dataDomains: ['scheduling'],
        sourceFiles: ['server/routes/appointments.js', 'src/components/frontdesk/FrontDeskDashboard.jsx'],
        checkpoints: [
          {
            id: 'appt-1',
            action: 'View Schedule',
            description: 'View daily/weekly appointment calendar',
            steps: ['Navigate to scheduling', 'Select date range'],
            expectedResult: 'Calendar shows appointments by provider',
            expectedItems: ['Calendar view displayed', 'Appointments shown', 'Provider columns visible', 'Date navigation works']
          },
          {
            id: 'appt-2',
            action: 'Schedule Appointment',
            description: 'Create new appointment',
            steps: ['Click available slot', 'Select patient', 'Choose appointment type', 'Confirm'],
            expectedResult: 'Appointment created, conflicts detected',
            expectedItems: ['Patient selector works', 'Appointment types listed', 'Conflict warning if overlap', 'Confirmation shown']
          },
          {
            id: 'appt-3',
            action: 'Reschedule Appointment',
            description: 'Move appointment to different time',
            steps: ['Click existing appointment', 'Click reschedule', 'Select new time', 'Save'],
            expectedResult: 'Appointment moved, original slot freed',
            expectedItems: ['Reschedule option available', 'New time selected', 'Old slot available', 'Patient notified (if configured)']
          },
          {
            id: 'appt-4',
            action: 'Cancel Appointment',
            description: 'Cancel scheduled appointment',
            steps: ['Click appointment', 'Click cancel', 'Select reason', 'Confirm'],
            expectedResult: 'Appointment cancelled, slot freed',
            expectedItems: ['Cancel reason required', 'Slot becomes available', 'Cancellation logged', 'Patient notification option']
          },
          {
            id: 'appt-5',
            action: 'Patient Check-In',
            description: 'Check in arrived patient',
            steps: ['Find patient appointment', 'Click check-in', 'Confirm arrival'],
            expectedResult: 'Patient marked as checked in with timestamp',
            expectedItems: ['Check-in button available', 'Arrival time recorded', 'Status updated to checked-in', 'Waiting room list updated']
          },
          {
            id: 'appt-6',
            action: 'View Appointment History',
            description: 'View patient appointment history',
            steps: ['Open patient profile', 'Go to appointments tab'],
            expectedResult: 'Past and future appointments listed',
            expectedItems: ['Past appointments shown', 'Future appointments visible', 'No-shows flagged', 'Cancellation history']
          }
        ]
      },

      // ============================================
      // PATIENT INTAKE
      // ============================================
      {
        id: 'patient-intake',
        name: 'Patient Intake Workflow',
        file: 'patient-intake.spec.md',
        version: '1.0',
        dataDomains: ['intake', 'forms'],
        sourceFiles: ['server/routes/intake.js', 'src/components/frontdesk/PatientIntakeForm.jsx'],
        checkpoints: [
          {
            id: 'intake-1',
            action: 'New Patient Intake Form',
            description: 'Front desk creates intake for new patient',
            steps: ['Click New Intake', 'Fill patient info', 'Assign forms', 'Submit'],
            expectedResult: 'Intake record created, in queue for approval',
            expectedItems: ['Intake form displayed', 'Required fields validated', 'Forms assigned', 'Queue status: pending']
          },
          {
            id: 'intake-2',
            action: 'Medical Team Queue',
            description: 'Medical team views intake queue',
            steps: ['Navigate to intake queue', 'View pending intakes'],
            expectedResult: 'Queue shows patients awaiting approval',
            expectedItems: ['Queue displayed', 'Patient details visible', 'Approve/reject options', 'Priority sorting']
          },
          {
            id: 'intake-3',
            action: 'Approve Intake',
            description: 'Provider approves new patient',
            steps: ['Select intake from queue', 'Review info', 'Click approve'],
            expectedResult: 'Patient activated, registration email sent',
            expectedItems: ['Approval recorded', 'Patient status: active', 'Welcome email sent', 'Portal access granted']
          },
          {
            id: 'intake-4',
            action: 'Track Call Attempts',
            description: 'Track outreach attempts for intake',
            steps: ['Open intake record', 'Log call attempt', 'Add notes'],
            expectedResult: 'Call attempt recorded with outcome',
            expectedItems: ['Call log displayed', 'Outcome options', 'Notes field', 'Attempt count tracked']
          }
        ]
      },

      // ============================================
      // SESSION DOCUMENTATION
      // ============================================
      {
        id: 'session-documentation',
        name: 'Session Documentation',
        file: 'session-documentation.spec.md',
        version: '1.0',
        dataDomains: ['clinical', 'PHI', 'billing'],
        requiredRole: 'provider',
        sourceFiles: ['server/routes/services.js', 'src/components/session/ServiceEntry.jsx'],
        checkpoints: [
          {
            id: 'session-1',
            action: 'Start Session',
            description: 'Provider starts documenting a session',
            steps: ['Select patient from schedule', 'Click start session', 'Session timer begins'],
            expectedResult: 'Session form opens with timer running',
            expectedItems: ['Patient info displayed', 'Timer started', 'Session type selectable', 'Date auto-populated']
          },
          {
            id: 'session-2',
            action: 'Session Timer',
            description: 'Timer tracks session duration',
            steps: ['Start timer', 'Pause if needed', 'Stop at end'],
            expectedResult: 'Accurate duration recorded',
            expectedItems: ['Timer displays elapsed time', 'Pause/resume works', 'Manual entry option', 'Duration saved']
          },
          {
            id: 'session-3',
            action: 'CPT Code Selection',
            description: 'Select appropriate billing code',
            steps: ['Open CPT selector', 'Choose code based on duration', 'Add modifiers if needed'],
            expectedResult: 'CPT code assigned to service',
            expectedItems: ['CPT codes listed (90834, 90837, etc.)', 'Code descriptions shown', 'Modifiers available (95, GT)', 'Units calculated']
          },
          {
            id: 'session-4',
            action: 'ICD-10 Diagnosis',
            description: 'Assign diagnosis codes',
            steps: ['Open diagnosis selector', 'Search ICD-10 codes', 'Select primary and secondary'],
            expectedResult: 'Diagnoses linked to service',
            expectedItems: ['ICD-10 search works', 'Multiple diagnoses supported', 'Primary diagnosis required', 'Code descriptions shown']
          },
          {
            id: 'session-5',
            action: 'Clinical Notes - SOAP',
            description: 'Document session in SOAP format',
            steps: ['Click notes tab', 'Select SOAP format', 'Fill Subjective, Objective, Assessment, Plan'],
            expectedResult: 'SOAP note saved with session',
            expectedItems: ['SOAP sections displayed', 'Text entry works', 'Save/draft option', 'Note linked to service']
          },
          {
            id: 'session-6',
            action: 'Clinical Notes - BIRP',
            description: 'Document session in BIRP format',
            steps: ['Select BIRP format', 'Fill Behavior, Intervention, Response, Plan'],
            expectedResult: 'BIRP note saved',
            expectedItems: ['BIRP sections displayed', 'All fields editable', 'Validation on required fields']
          },
          {
            id: 'session-7',
            action: 'Complete Session',
            description: 'Finalize and save session',
            steps: ['Review all entries', 'Click complete session'],
            expectedResult: 'Session saved, ready for billing',
            expectedItems: ['Validation passes', 'Service created', 'Appears in unbilled list', 'Note finalized']
          },
          {
            id: 'session-8',
            action: 'Group Therapy Session',
            description: 'Document group therapy with multiple patients',
            steps: ['Select group session type', 'Add multiple patients', 'Document shared content', 'Complete'],
            expectedResult: 'Individual service for each patient created',
            expectedItems: ['Multi-patient selection', 'Shared documentation', 'Individual billing records', 'Group CPT codes available']
          }
        ]
      },

      // ============================================
      // BILLING & CLAIMS
      // ============================================
      {
        id: 'billing-claims',
        name: 'Billing & Claims Management',
        file: 'billing-claims.spec.md',
        version: '1.0',
        dataDomains: ['billing', 'financial', 'EDI'],
        requiredRole: 'billing_admin',
        sourceFiles: ['server/routes/claims.js', 'src/components/billing/ClaimManagement.jsx'],
        checkpoints: [
          {
            id: 'billing-1',
            action: 'Billing Dashboard',
            description: 'View billing summary and metrics',
            steps: ['Login as billing admin', 'Navigate to billing dashboard'],
            expectedResult: 'Dashboard shows pending claims, revenue, denials',
            expectedItems: ['Unbilled services count', 'Pending claims', 'Recent payments', 'Denial rate']
          },
          {
            id: 'billing-2',
            action: 'View Unbilled Services',
            description: 'See services ready for billing',
            steps: ['Go to unbilled services', 'Filter by date/provider'],
            expectedResult: 'List of completed sessions not yet billed',
            expectedItems: ['Service list displayed', 'CPT codes shown', 'Patient and provider info', 'Select multiple option']
          },
          {
            id: 'billing-3',
            action: 'Create Claim',
            description: 'Create claim from unbilled services',
            steps: ['Select services', 'Click create claim', 'Verify claim details'],
            expectedResult: 'Claim created with EDI-837 structure',
            expectedItems: ['Services bundled', 'Claim number assigned', 'Claim status: draft', 'Charges calculated']
          },
          {
            id: 'billing-4',
            action: 'Claim Validation',
            description: 'Validate claim before submission',
            steps: ['Open claim', 'Click validate'],
            expectedResult: 'Validation errors/warnings displayed',
            expectedItems: ['Required fields checked', 'NPI validation', 'Diagnosis code validation', 'Errors block submission']
          },
          {
            id: 'billing-5',
            action: 'Submit Claim to Office Ally',
            description: 'Submit validated claim to clearinghouse',
            steps: ['Select claim(s)', 'Click submit', 'Confirm submission'],
            expectedResult: 'Claim submitted, status updated',
            expectedItems: ['Office Ally connection', 'EDI-837 generated', 'Submission confirmation', 'Status: submitted']
          },
          {
            id: 'billing-6',
            action: 'Track Claim Status',
            description: 'Monitor submitted claims',
            steps: ['Go to claims list', 'View claim status'],
            expectedResult: 'Status reflects: draft, submitted, accepted, rejected, paid, denied',
            expectedItems: ['Status column visible', 'Rejection reasons shown', 'Date tracking', 'Resubmit option for rejections']
          },
          {
            id: 'billing-7',
            action: 'CMS-1500 Form',
            description: 'Generate printable CMS-1500',
            steps: ['Open claim', 'Click generate CMS-1500'],
            expectedResult: 'Printable CMS-1500 form displayed',
            expectedItems: ['Form auto-populated', 'All boxes filled correctly', 'Print option', 'PDF download']
          },
          {
            id: 'billing-8',
            action: 'Process 835 ERA',
            description: 'Import electronic remittance advice',
            steps: ['Upload 835 file', 'Process remittance'],
            expectedResult: 'Payments matched to claims',
            expectedItems: ['835 parsed correctly', 'Payments applied', 'Denials flagged', 'Check number tracked']
          }
        ]
      },

      // ============================================
      // RTM (REMOTE THERAPEUTIC MONITORING)
      // ============================================
      {
        id: 'rtm-monitoring',
        name: 'Remote Therapeutic Monitoring',
        file: 'rtm-monitoring.spec.md',
        version: '1.0',
        dataDomains: ['RTM', 'clinical', 'mobile'],
        sourceFiles: ['server/routes/rtm.js', 'src/components/session/RtmReview.jsx'],
        checkpoints: [
          {
            id: 'rtm-1',
            action: 'View Patient RTM Data',
            description: 'Provider reviews patient RTM submissions',
            steps: ['Open patient profile', 'Go to RTM tab', 'View recent entries'],
            expectedResult: 'RTM entries displayed with trends',
            expectedItems: ['Mood ratings shown', 'Incidents listed', 'Daily summaries', 'Date filtering']
          },
          {
            id: 'rtm-2',
            action: 'Mood Rating Analysis',
            description: 'View mood trends over time',
            steps: ['Select date range', 'View mood chart'],
            expectedResult: 'Mood trend visualization',
            expectedItems: ['Mood scale (1-10)', 'Trend line/chart', 'Daily averages', 'Notable changes flagged']
          },
          {
            id: 'rtm-3',
            action: 'Incident Review',
            description: 'Review reported incidents',
            steps: ['Filter by incident type', 'View incident details'],
            expectedResult: 'Incidents categorized and detailed',
            expectedItems: ['15 incident types supported', 'Severity indicated', 'Patient notes visible', 'Timestamp shown']
          },
          {
            id: 'rtm-4',
            action: 'RTM Billing Cycle',
            description: 'Create RTM billing entry',
            steps: ['Review RTM activity', 'Create RTM service', 'Apply RTM CPT codes'],
            expectedResult: 'RTM services billable (99457, 99458, etc.)',
            expectedItems: ['RTM CPT codes available', 'Monthly bundling option', 'Time threshold tracking', 'Service linked to patient']
          },
          {
            id: 'rtm-5',
            action: 'Prescription Validation',
            description: 'Validate RTM prescription for device',
            steps: ['Enter registration code', 'Verify device IMEI'],
            expectedResult: 'Prescription validated, features unlocked',
            expectedItems: ['Registration code check', 'IMEI tracking', 'Feature unlock', 'Prescription active status']
          }
        ]
      },

      // ============================================
      // PATIENT PORTAL
      // ============================================
      {
        id: 'patient-portal',
        name: 'Patient Portal',
        file: 'patient-portal.spec.md',
        version: '1.0',
        dataDomains: ['patient-portal', 'PHI'],
        sourceFiles: ['server/routes/patientPortal.js', 'src/components/patient/PatientDashboard.jsx'],
        checkpoints: [
          {
            id: 'portal-1',
            action: 'Patient Dashboard',
            description: 'Patient views their portal dashboard',
            steps: ['Login as patient', 'View dashboard'],
            expectedResult: 'Dashboard shows appointments, messages, profile',
            expectedItems: ['Upcoming appointments', 'Unread messages', 'Profile summary', 'Quick actions']
          },
          {
            id: 'portal-2',
            action: 'View/Edit Profile',
            description: 'Patient manages profile information',
            steps: ['Go to profile', 'Update contact info', 'Save'],
            expectedResult: 'Profile information updated',
            expectedItems: ['Current info displayed', 'Edit fields available', 'Save confirmation', 'Validation on required fields']
          },
          {
            id: 'portal-3',
            action: 'Manage Insurance',
            description: 'Patient adds/updates insurance',
            steps: ['Go to insurance section', 'Add insurance card', 'Enter member ID'],
            expectedResult: 'Insurance information saved',
            expectedItems: ['Insurance form displayed', 'Card image upload option', 'Member ID field', 'Multiple insurances supported']
          },
          {
            id: 'portal-4',
            action: 'Complete Intake Forms',
            description: 'Patient fills out assigned forms',
            steps: ['View pending forms', 'Complete each form', 'Submit'],
            expectedResult: 'Forms submitted to practice',
            expectedItems: ['Form list displayed', 'Required fields marked', 'Progress indicator', 'Submission confirmation']
          },
          {
            id: 'portal-5',
            action: 'Send Message to Provider',
            description: 'Patient messages their provider',
            steps: ['Go to messages', 'Compose new message', 'Send'],
            expectedResult: 'Message sent, appears in history',
            expectedItems: ['Compose option', 'Provider selection', 'Message sent confirmation', 'Message threading']
          },
          {
            id: 'portal-6',
            action: 'Device Registration',
            description: 'Patient registers SaMD device',
            steps: ['Go to devices', 'Enter device IMEI', 'Submit registration'],
            expectedResult: 'Device registered to patient',
            expectedItems: ['IMEI entry field', 'Device list shown', 'Registration confirmation', 'Device status displayed']
          },
          {
            id: 'portal-7',
            action: 'Submit Mood Rating',
            description: 'Patient submits daily mood',
            steps: ['Go to mood tracking', 'Select rating (1-10)', 'Add notes', 'Submit'],
            expectedResult: 'Mood rating recorded',
            expectedItems: ['Rating scale displayed', 'Notes field', 'Submission confirmation', 'History visible']
          }
        ]
      },

      // ============================================
      // INSURANCE VERIFICATION
      // ============================================
      {
        id: 'insurance-verification',
        name: 'Insurance Verification',
        file: 'insurance-verification.spec.md',
        version: '1.0',
        dataDomains: ['insurance', 'eligibility'],
        sourceFiles: ['server/routes/insurance.js', 'src/components/admin/PatientInsuranceVerification.jsx'],
        checkpoints: [
          {
            id: 'insurance-1',
            action: 'View Insurance Plans',
            description: 'Admin views practice insurance plans',
            steps: ['Navigate to Insurance Management', 'View accepted plans'],
            expectedResult: 'List of accepted insurance plans',
            expectedItems: ['Plan names listed', 'Payer IDs shown', 'Plan types (PPO, HMO)', 'Add/edit options']
          },
          {
            id: 'insurance-2',
            action: 'Add Insurance Plan',
            description: 'Add new accepted insurance plan',
            steps: ['Click add plan', 'Enter payer info', 'Configure details', 'Save'],
            expectedResult: 'New plan added to practice',
            expectedItems: ['Plan form displayed', 'Payer ID required', 'Contact info fields', 'Plan saved']
          },
          {
            id: 'insurance-3',
            action: 'Verify Eligibility',
            description: 'Check patient insurance eligibility',
            steps: ['Select patient', 'Click verify eligibility', 'View results'],
            expectedResult: 'Eligibility status displayed',
            expectedItems: ['Verification initiated', 'Coverage status shown', 'Copay/deductible info', 'Session limits if applicable']
          },
          {
            id: 'insurance-4',
            action: 'Verification History',
            description: 'View past eligibility checks',
            steps: ['Open patient insurance', 'View verification history'],
            expectedResult: 'History of eligibility checks',
            expectedItems: ['Date of verification', 'Result status', 'Coverage details', 'Performed by']
          }
        ]
      },

      // ============================================
      // PROVIDER MANAGEMENT
      // ============================================
      {
        id: 'provider-management',
        name: 'Provider Management',
        file: 'provider-management.spec.md',
        version: '1.0',
        dataDomains: ['providers', 'admin'],
        requiredRole: 'admin',
        sourceFiles: ['server/routes/providers.js', 'src/components/admin/ProviderManagement.jsx'],
        checkpoints: [
          {
            id: 'provider-1',
            action: 'View Providers',
            description: 'Admin views all providers',
            steps: ['Navigate to Provider Management'],
            expectedResult: 'Provider list displayed',
            expectedItems: ['Provider names', 'Credentials/NPI', 'Status', 'Specialties']
          },
          {
            id: 'provider-2',
            action: 'Add Provider',
            description: 'Add new provider to practice',
            steps: ['Click add provider', 'Enter credentials', 'Set NPI', 'Assign taxonomy', 'Save'],
            expectedResult: 'Provider added to practice',
            expectedItems: ['Provider form displayed', 'NPI validation', 'Taxonomy codes', 'Provider saved']
          },
          {
            id: 'provider-3',
            action: 'Edit Provider',
            description: 'Update provider information',
            steps: ['Select provider', 'Edit details', 'Save'],
            expectedResult: 'Provider info updated',
            expectedItems: ['Edit form pre-populated', 'Changes saved', 'Credential history preserved']
          },
          {
            id: 'provider-4',
            action: 'Deactivate Provider',
            description: 'Deactivate provider account',
            steps: ['Select provider', 'Click deactivate', 'Confirm'],
            expectedResult: 'Provider deactivated, historical data preserved',
            expectedItems: ['Confirmation required', 'Status changed', 'No new appointments', 'Past data accessible']
          }
        ]
      },

      // ============================================
      // PRACTICE CONFIGURATION
      // ============================================
      {
        id: 'practice-setup',
        name: 'Practice Setup & Configuration',
        file: 'practice-setup.spec.md',
        version: '1.0',
        dataDomains: ['admin', 'configuration'],
        requiredRole: 'admin',
        sourceFiles: ['src/components/setup/PracticeSetupWizard.jsx', 'server/routes/practices.js'],
        checkpoints: [
          {
            id: 'setup-1',
            action: 'Practice Setup Wizard',
            description: 'New practice completes initial setup',
            steps: ['Start wizard', 'Enter practice info', 'Configure billing', 'Complete'],
            expectedResult: 'Practice configured and ready',
            expectedItems: ['Practice name/address', 'Tax ID', 'NPI', 'Billing provider info']
          },
          {
            id: 'setup-2',
            action: 'Feature Management',
            description: 'Enable/disable practice features',
            steps: ['Go to Feature Manager', 'Toggle features', 'Save'],
            expectedResult: 'Features enabled/disabled',
            expectedItems: ['Clearinghouse options', 'Import solutions', 'Trial periods', 'Billing impact shown']
          },
          {
            id: 'setup-3',
            action: 'User Management',
            description: 'Manage practice users',
            steps: ['Go to Users', 'Add/edit users', 'Assign roles'],
            expectedResult: 'Users configured with appropriate roles',
            expectedItems: ['User list displayed', 'Role assignment', 'Invite option', 'Deactivate option']
          }
        ]
      },

      // ============================================
      // CLEARINGHOUSE INTEGRATION
      // ============================================
      {
        id: 'clearinghouse',
        name: 'Clearinghouse Integration',
        file: 'clearinghouse.spec.md',
        version: '1.0',
        dataDomains: ['billing', 'EDI', 'integration'],
        requiredRole: 'admin',
        sourceFiles: ['server/routes/clearinghouse.js', 'src/components/admin/ClearinghouseConfig.jsx'],
        checkpoints: [
          {
            id: 'ch-1',
            action: 'Configure Clearinghouse',
            description: 'Set up clearinghouse credentials',
            steps: ['Go to Clearinghouse Config', 'Select provider', 'Enter API credentials', 'Test connection'],
            expectedResult: 'Clearinghouse connected',
            expectedItems: ['Provider selection (Office Ally, Stedi, etc.)', 'Credential fields', 'Test connection button', 'Success/failure indicator']
          },
          {
            id: 'ch-2',
            action: 'Test Mode Toggle',
            description: 'Toggle between test and production',
            steps: ['Locate test mode toggle', 'Switch mode'],
            expectedResult: 'Mode changed, claims route accordingly',
            expectedItems: ['Clear test mode indicator', 'Claims flagged as test', 'Production warning when switching']
          },
          {
            id: 'ch-3',
            action: 'View EDI Transactions',
            description: 'View submission history',
            steps: ['Go to EDI Transactions', 'Filter by date'],
            expectedResult: 'Transaction history displayed',
            expectedItems: ['837 submissions', '835 receipts', '277 status reports', '999 acknowledgments']
          }
        ]
      },

      // ============================================
      // UNIMPLEMENTED/FUTURE FEATURES
      // ============================================
      {
        id: 'future-features',
        name: 'Future Features (Not Yet Implemented)',
        file: 'future-features.spec.md',
        version: '1.0',
        dataDomains: ['planning'],
        status: 'not_implemented',
        notes: 'Requirements identified but implementation status unclear',
        checkpoints: [
          {
            id: 'future-1',
            action: 'Advanced Reporting',
            description: 'Custom report generation, revenue analysis',
            status: 'not_implemented',
            expectedItems: ['Custom report builder', 'Revenue by provider', 'Denial analysis', 'Payment trends']
          },
          {
            id: 'future-2',
            action: 'Automated Reminders',
            description: 'Automated billing and appointment reminders',
            status: 'not_implemented',
            expectedItems: ['Payment reminders', 'Appointment reminders', 'Overdue notices']
          },
          {
            id: 'future-3',
            action: 'EHR Import Connectors',
            description: 'Import from SimplePractice, TheraNest, Kareo, etc.',
            status: 'not_implemented',
            expectedItems: ['Data migration wizard', 'Field mapping', 'Validation report']
          },
          {
            id: 'future-4',
            action: 'HIPAA Audit Logging',
            description: 'Comprehensive access and change logging',
            status: 'not_implemented',
            expectedItems: ['Access logs', 'PHI access tracking', 'Change history', 'Audit reports']
          }
        ]
      }
    ];
  }

  /**
   * Generate Property Management app specs (placeholder)
   */
  getPropertyManagementSpecs(analysis) {
    return this.getProjectManagementSpecs(analysis);
  }

  /**
   * Clear all specs for an app
   * @param {string} repo - GitHub repo
   */
  clearSpecs(repo) {
    const appId = this.getAppId(repo);
    this.specsCache.delete(appId);
    this.saveToStorage();
  }

  /**
   * Export specs to files (for persistence outside localStorage)
   * @param {string} repo - GitHub repo
   * @returns {Object} Exportable spec data
   */
  exportSpecs(repo) {
    const appId = this.getAppId(repo);
    return this.specsCache.get(appId) || null;
  }

  /**
   * Import specs from external source
   * @param {Object} specData - Spec data to import
   */
  importSpecs(specData) {
    if (specData && specData.appId) {
      this.specsCache.set(specData.appId, specData);
      this.saveToStorage();
    }
  }
}

// Singleton instance
const specManager = new SpecManager();
export default specManager;
export { SpecManager };
