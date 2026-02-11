/**
 * DatabaseProbe - Verifies database state via API probing
 *
 * Tests the target application's API to verify:
 * - Health status
 * - Test user availability and credentials
 * - Available roles
 */

class DatabaseProbe {
  constructor() {
    this.defaultTimeout = 10000;
  }

  /**
   * Check API health endpoint
   * @param {string} targetUrl - Base URL of the application
   * @returns {Promise<Object>} Health check result
   */
  async checkHealth(targetUrl) {
    const healthEndpoints = [
      '/api/health',
      '/health',
      '/api/status',
      '/status',
      '/api/v1/health',
      '/api'
    ];

    const baseUrl = targetUrl.replace(/\/$/, '');

    for (const endpoint of healthEndpoints) {
      try {
        const response = await this._fetch(`${baseUrl}${endpoint}`, {
          method: 'GET'
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          return {
            healthy: true,
            endpoint,
            status: response.status,
            data
          };
        }
      } catch {
        // Try next endpoint
      }
    }

    // Try a simple GET to the base URL
    try {
      const response = await this._fetch(baseUrl);
      return {
        healthy: response.ok,
        endpoint: '/',
        status: response.status,
        data: null
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Attempt to login as a test user
   * @param {string} targetUrl - Base URL of the application (or API URL if separate)
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} subdomain - Optional subdomain/practice
   * @param {string} apiUrl - Optional separate API URL for authentication
   * @returns {Promise<Object>} Login result
   */
  async loginAsTestUser(targetUrl, email, password, subdomain = null, apiUrl = null) {
    // Use apiUrl if provided, otherwise fall back to targetUrl
    const baseUrl = (apiUrl || targetUrl).replace(/\/$/, '');

    const loginEndpoints = [
      '/api/auth/login',
      '/api/login',
      '/auth/login',
      '/login'
    ];

    for (const endpoint of loginEndpoints) {
      try {
        const response = await this._fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, subdomain })
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data) {
          return {
            success: true,
            endpoint,
            user: data.user || data,
            token: data.token,
            roles: this._extractRoles(data.user || data)
          };
        }

        // If we got a response (even error), this is likely the right endpoint
        if (response.status === 401 || response.status === 400) {
          return {
            success: false,
            endpoint,
            status: response.status,
            error: data?.error || data?.message || 'Invalid credentials',
            credentialIssue: true
          };
        }
      } catch {
        // Try next endpoint
      }
    }

    return {
      success: false,
      error: 'Could not find login endpoint',
      credentialIssue: false
    };
  }

  /**
   * Probe available test users/roles
   * @param {string} targetUrl - Base URL of the application
   * @param {Array<Object>} testUsers - Array of test user credentials to try
   * @param {string} apiUrl - Optional separate API URL for authentication
   * @returns {Promise<Object>} Probe results with available users
   */
  async probeAvailableRoles(targetUrl, testUsers, apiUrl = null) {
    const results = {
      targetUrl,
      apiUrl: apiUrl || targetUrl,
      testedAt: new Date().toISOString(),
      available: [],
      unavailable: [],
      detectedRoles: new Set(),
      summary: {
        total: testUsers.length,
        working: 0,
        failed: 0
      }
    };

    for (const user of testUsers) {
      const loginResult = await this.loginAsTestUser(
        targetUrl,
        user.email,
        user.password,
        user.subdomain,
        apiUrl
      );

      if (loginResult.success) {
        results.available.push({
          email: user.email,
          role: user.role || 'unknown',
          portalButton: user.portalButton,
          detectedRoles: loginResult.roles,
          token: loginResult.token
        });

        // Collect detected roles
        if (loginResult.roles) {
          loginResult.roles.forEach(role => results.detectedRoles.add(role));
        }

        results.summary.working++;
      } else {
        results.unavailable.push({
          email: user.email,
          role: user.role || 'unknown',
          error: loginResult.error,
          credentialIssue: loginResult.credentialIssue
        });
        results.summary.failed++;
      }
    }

    results.detectedRoles = Array.from(results.detectedRoles);

    return results;
  }

  /**
   * Verify specific test data exists
   * @param {string} targetUrl - Base URL of the application
   * @param {string} token - Auth token
   * @param {string} endpoint - API endpoint to check
   * @returns {Promise<Object>} Verification result
   */
  async verifyTestData(targetUrl, token, endpoint) {
    const baseUrl = targetUrl.replace(/\/$/, '');

    try {
      const response = await this._fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          data,
          count: Array.isArray(data) ? data.length : (data.length !== undefined ? data.length : 1)
        };
      }

      return {
        exists: false,
        status: response.status,
        error: 'Not found or unauthorized'
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  /**
   * Run full database probe
   * @param {string} targetUrl - Base URL of the application
   * @param {Array<Object>} testUsers - Test users to probe
   * @param {string} apiUrl - Optional separate API URL for authentication
   * @returns {Promise<Object>} Complete probe result
   */
  async runFullProbe(targetUrl, testUsers, apiUrl = null) {
    const effectiveApiUrl = apiUrl || targetUrl;
    const probe = {
      targetUrl,
      apiUrl: effectiveApiUrl,
      timestamp: new Date().toISOString(),
      health: null,
      users: null,
      testData: {},
      errors: []
    };

    // Health check - check the API URL for health
    try {
      probe.health = await this.checkHealth(effectiveApiUrl);
    } catch (error) {
      probe.errors.push({ step: 'health', error: error.message });
    }

    // Skip user probing if health check failed
    if (!probe.health?.healthy) {
      probe.users = {
        available: [],
        unavailable: testUsers.map(u => ({
          email: u.email,
          role: u.role,
          error: 'Server not healthy'
        })),
        summary: { total: testUsers.length, working: 0, failed: testUsers.length }
      };
      return probe;
    }

    // Probe users
    try {
      probe.users = await this.probeAvailableRoles(targetUrl, testUsers, apiUrl);
    } catch (error) {
      probe.errors.push({ step: 'users', error: error.message });
    }

    // If we have a working user, probe some test data endpoints
    if (probe.users?.available?.length > 0) {
      const adminUser = probe.users.available.find(u =>
        u.role === 'admin' || u.email.includes('admin')
      );

      if (adminUser?.token) {
        const dataEndpoints = [
          { name: 'projects', endpoint: '/api/projects' },
          { name: 'tasks', endpoint: '/api/tasks' },
          { name: 'users', endpoint: '/api/users' }
        ];

        for (const { name, endpoint } of dataEndpoints) {
          try {
            probe.testData[name] = await this.verifyTestData(
              effectiveApiUrl,
              adminUser.token,
              endpoint
            );
          } catch (error) {
            probe.testData[name] = { exists: false, error: error.message };
          }
        }
      }
    }

    return probe;
  }

  // Private helper methods

  _fetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    return fetch(url, {
      ...options,
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
  }

  _extractRoles(user) {
    const roles = [];

    if (!user) return roles;

    // Check common role patterns
    if (user.role) roles.push(user.role);
    if (user.roles && Array.isArray(user.roles)) roles.push(...user.roles);
    if (user.is_admin) roles.push('admin');
    if (user.is_provider) roles.push('provider');
    if (user.is_front_desk) roles.push('front_desk');
    if (user.is_billing) roles.push('billing');
    if (user.is_support) roles.push('support');
    if (user.isFrontDesk) roles.push('front_desk');
    if (user.isAdmin) roles.push('admin');
    if (user.isProvider) roles.push('provider');

    // Extract from available_portals
    if (user.available_portals && Array.isArray(user.available_portals)) {
      user.available_portals.forEach(portal => {
        if (portal?.id) roles.push(portal.id);
      });
    }

    return [...new Set(roles)];
  }
}

export default DatabaseProbe;
