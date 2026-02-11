/**
 * PreTestValidator - Aggregates all pre-test validations
 *
 * Runs all validation checks before testing begins:
 * - Credential verification (test users can login)
 * - Codebase sync (local matches deployed)
 * - Spec validity (references valid code)
 * - Deployment match (URL matches expected environment)
 * - Compliance check (role separation for HIPAA/SOX)
 */

import DeploymentDetector from './DeploymentDetector';
import DatabaseProbe from './DatabaseProbe';
import ComplianceAnalyzer, { SEVERITY } from './ComplianceAnalyzer';
import TestPlanGenerator from './TestPlanGenerator';

class PreTestValidator {
  constructor(options = {}) {
    this.repoAnalyzer = options.repoAnalyzer || null;
    this.deploymentDetector = new DeploymentDetector(this.repoAnalyzer);
    this.databaseProbe = new DatabaseProbe();
    this.complianceAnalyzer = new ComplianceAnalyzer(this.repoAnalyzer, this.databaseProbe);
    this.testPlanGenerator = new TestPlanGenerator(this.repoAnalyzer);

    // Configuration
    this.testCredentials = options.testCredentials || null;
    this.checkpointMappings = options.checkpointMappings || null;

    // Set up services with config
    if (this.testCredentials) {
      this.complianceAnalyzer.setCredentialsConfig(this.testCredentials);
    }
    if (this.checkpointMappings) {
      this.testPlanGenerator.setCheckpointMappings(
        this.checkpointMappings.mappings || this.checkpointMappings
      );
    }
  }

  /**
   * Run all validations before testing
   * @param {string} targetUrl - Target application URL
   * @param {string} specId - Spec identifier to test
   * @param {Object} spec - Spec content (optional)
   * @returns {Promise<Object>} Validation results
   */
  async runAllValidations(targetUrl, specId, spec = null) {
    const results = {
      timestamp: new Date().toISOString(),
      targetUrl,
      specId,
      passed: true,
      canProceed: true,
      warnings: [],
      errors: [],
      details: {
        credentialMatch: null,
        codebaseSync: null,
        specValidity: null,
        deploymentMatch: null,
        compliance: null
      }
    };

    // Run validations in parallel where possible
    const [
      deploymentResult,
      credentialResult,
      complianceResult
    ] = await Promise.all([
      this._validateDeployment(targetUrl),
      this._validateCredentials(targetUrl),
      this._validateCompliance(spec) // Pass spec for feature-aware compliance
    ]);

    results.details.deploymentMatch = deploymentResult;
    results.details.credentialMatch = credentialResult;
    results.details.compliance = complianceResult;

    // Check for codebase sync if we have repo analyzer
    if (this.repoAnalyzer) {
      results.details.codebaseSync = await this._validateCodebaseSync(deploymentResult);
    }

    // Validate spec if provided
    if (specId || spec) {
      results.details.specValidity = await this._validateSpec(specId, spec);
    }

    // Aggregate results
    this._aggregateResults(results);

    return results;
  }

  /**
   * Quick validation (faster, fewer checks)
   * @param {string} targetUrl - Target application URL
   * @returns {Promise<Object>} Quick validation result
   */
  async quickValidation(targetUrl) {
    const results = {
      timestamp: new Date().toISOString(),
      targetUrl,
      passed: true,
      canProceed: true,
      warnings: [],
      errors: []
    };

    // Get API URL - prioritize user-provided apiUrl over config
    let apiUrl = this.testCredentials?.userApiUrl || null;

    // If no user-provided apiUrl, try to get from environments config
    if (!apiUrl && this.testCredentials?.environments) {
      for (const [envName, envConfig] of Object.entries(this.testCredentials.environments)) {
        if (envConfig.baseUrl === targetUrl || targetUrl.includes(envConfig.baseUrl?.replace(/^https?:\/\//, ''))) {
          apiUrl = envConfig.apiUrl;
          break;
        }
      }
      if (!apiUrl && !targetUrl.includes('localhost')) {
        apiUrl = this.testCredentials.environments.production?.apiUrl;
      }
    }

    // Just check health and one credential
    try {
      const health = await this.databaseProbe.checkHealth(apiUrl || targetUrl);
      if (!health.healthy) {
        results.passed = false;
        results.errors.push({
          type: 'HEALTH_CHECK_FAILED',
          message: `Target application at ${targetUrl} is not accessible`,
          details: health
        });
      }
    } catch (error) {
      results.passed = false;
      results.errors.push({
        type: 'HEALTH_CHECK_ERROR',
        message: error.message
      });
    }

    results.canProceed = results.passed;
    return results;
  }

  /**
   * Validate only compliance (can be run separately)
   * @param {Object} spec - Optional spec for feature-aware checking
   * @returns {Promise<Object>} Compliance result
   */
  async validateComplianceOnly(spec = null) {
    return await this._validateCompliance(spec);
  }

  /**
   * Validate only credentials (can be run separately)
   * @param {string} targetUrl - Target application URL
   * @returns {Promise<Object>} Credential result
   */
  async validateCredentialsOnly(targetUrl) {
    return await this._validateCredentials(targetUrl);
  }

  // Private validation methods

  async _validateDeployment(targetUrl) {
    const result = {
      valid: true,
      message: null,
      details: null
    };

    try {
      const envInfo = await this.deploymentDetector.identifyEnvironment(targetUrl);
      result.details = envInfo;

      if (envInfo.platform === 'unknown') {
        result.message = 'Could not identify deployment platform';
        // Not an error, just informational
      } else {
        result.message = `Detected ${envInfo.platform} (${envInfo.environment})`;
      }

      // Check accessibility
      const accessible = await this.deploymentDetector.checkAccessibility(targetUrl);
      if (!accessible.accessible) {
        result.valid = false;
        result.message = `Target URL not accessible: ${accessible.error}`;
      }
    } catch (error) {
      result.valid = false;
      result.message = error.message;
    }

    return result;
  }

  async _validateCredentials(targetUrl) {
    const result = {
      valid: true,
      message: null,
      available: [],
      unavailable: [],
      details: null,
      authType: null,
      securityFindings: []
    };

    if (!this.testCredentials?.users) {
      result.message = 'No test credentials configured';
      return result;
    }

    try {
      // Convert credentials config to array format
      const testUsers = Object.entries(this.testCredentials.users).map(([key, user]) => ({
        ...user,
        role: key,
        subdomain: this.testCredentials.defaultSubdomain
      }));

      // Get API URL - prioritize user-provided apiUrl over config
      let apiUrl = this.testCredentials.userApiUrl || null;

      // If no user-provided apiUrl, try to get from environments config
      if (!apiUrl && this.testCredentials.environments) {
        // First try to find matching environment by baseUrl
        for (const [envName, envConfig] of Object.entries(this.testCredentials.environments)) {
          if (envConfig.baseUrl === targetUrl || targetUrl.includes(envConfig.baseUrl?.replace(/^https?:\/\//, ''))) {
            apiUrl = envConfig.apiUrl;
            break;
          }
        }
        // If no match found and production has apiUrl, use it as fallback for non-localhost
        if (!apiUrl && !targetUrl.includes('localhost')) {
          apiUrl = this.testCredentials.environments.production?.apiUrl;
        }
      }

      const probeResult = await this.databaseProbe.probeAvailableRoles(targetUrl, testUsers, apiUrl);
      result.details = probeResult;
      result.available = probeResult.available;
      result.unavailable = probeResult.unavailable;

      if (probeResult.summary.working === 0) {
        // No login endpoints found - likely OAuth-only app
        const noEndpointFound = probeResult.unavailable?.every(u =>
          u.error === 'Could not find login endpoint'
        );

        if (noEndpointFound) {
          result.valid = true; // Not a failure - just a different auth type
          result.authType = 'oauth';
          result.message = 'OAuth/SSO authentication detected';
          result.securityFindings.push({
            type: 'THIRD_PARTY_AUTH',
            severity: 'info',
            title: 'Third-Party Authentication Provider',
            description: 'Application uses OAuth/SSO for authentication. Security is delegated to the identity provider.',
            requiresAcceptance: true,
            acceptanceRequired: ['Product Owner', 'Security Officer'],
            preCutoverItem: true
          });
        } else {
          result.valid = false;
          result.authType = 'password';
          result.message = 'No test users could authenticate';
          result.securityFindings.push({
            type: 'CREDENTIAL_FAILURE',
            severity: 'warning',
            title: 'Test Credential Validation Failed',
            description: 'Could not validate test user credentials. Verify credentials are correct and login endpoint is accessible.',
            requiresAcceptance: true,
            acceptanceRequired: ['Product Owner'],
            preCutoverItem: true
          });
        }
      } else if (probeResult.summary.failed > 0) {
        result.authType = 'password';
        result.message = `${probeResult.summary.working}/${probeResult.summary.total} test users available`;
      } else {
        result.authType = 'password';
        result.message = 'All test users authenticated successfully';

        // Check for role-based security constraints
        const roles = result.available.map(u => u.role);
        const hasMultipleRoles = new Set(roles).size > 1;

        if (hasMultipleRoles) {
          result.securityFindings.push({
            type: 'ROLE_BASED_ACCESS',
            severity: 'info',
            title: 'Role-Based Access Control Detected',
            description: `Application implements role-based security with roles: ${[...new Set(roles)].join(', ')}. Functional constraints should be verified per role.`,
            requiresAcceptance: true,
            acceptanceRequired: ['Product Owner', 'Security Officer'],
            preCutoverItem: true
          });
        }
      }
    } catch (error) {
      result.valid = false;
      result.message = error.message;
    }

    return result;
  }

  async _validateCompliance(spec = null) {
    const result = {
      valid: true,
      passed: true,
      haltTesting: false,
      message: null,
      report: null,
      skippedDueToSpec: false
    };

    try {
      // Pass spec for feature-aware compliance checking
      const report = await this.complianceAnalyzer.generateComplianceReport(spec);
      result.report = report;
      result.passed = report.passed;
      result.haltTesting = report.haltTesting;
      result.skippedDueToSpec = report.skippedDueToSpec || false;

      if (report.skippedDueToSpec) {
        // Compliance check was skipped because feature doesn't touch sensitive domains
        result.valid = true;
        result.passed = true;
        result.message = report.skipReason || 'Compliance check not required for this feature';
      } else if (report.haltTesting) {
        result.valid = false;
        result.message = report.haltReason;
      } else if (!report.passed) {
        result.message = `${report.summary.criticalCount} critical, ${report.summary.warningCount} warnings`;
      } else {
        result.message = 'Compliance check passed';
      }
    } catch (error) {
      result.valid = false;
      result.message = error.message;
    }

    return result;
  }

  async _validateCodebaseSync(deploymentResult) {
    const result = {
      valid: true,
      synced: null,
      message: null,
      details: null
    };

    if (!this.repoAnalyzer) {
      result.message = 'Repo analyzer not available';
      return result;
    }

    try {
      const repoInfo = await this.repoAnalyzer.getCurrentBranch();
      const recentCommits = await this.repoAnalyzer.getRecentCommits(null, 5);

      result.details = {
        branch: repoInfo?.defaultBranch || null,
        latestCommit: recentCommits?.[0] || null,
        deploymentBranch: deploymentResult?.details?.branch
      };

      // Skip branch mismatch check for localhost - localhost runs local code
      const isLocal = deploymentResult?.details?.isLocal ||
                      deploymentResult?.details?.hostname?.includes('localhost') ||
                      deploymentResult?.details?.hostname?.includes('127.0.0.1');

      if (isLocal) {
        result.synced = true;
        result.message = `Testing localhost (runs local code from ${repoInfo?.defaultBranch || 'current branch'})`;
      } else if (deploymentResult?.details?.branch) {
        // Only check branch match for deployed URLs
        if (deploymentResult.details.branch === repoInfo?.defaultBranch) {
          result.synced = true;
          result.message = `Deployment branch matches (${repoInfo.defaultBranch})`;
        } else {
          result.synced = false;
          result.message = `Branch mismatch: deployed=${deploymentResult.details.branch}, repo=${repoInfo.defaultBranch}`;
        }
      } else {
        result.synced = null;
        result.message = 'Could not determine deployment branch';
      }
    } catch (error) {
      result.valid = false;
      result.message = error.message;
    }

    return result;
  }

  async _validateSpec(specId, spec) {
    const result = {
      valid: true,
      message: null,
      details: null
    };

    try {
      // Check if spec has actual checkpoint array (from spec file) or just a count (from FeatureSelector)
      const hasCheckpointArray = spec?.checkpoints && Array.isArray(spec.checkpoints);

      if (spec && hasCheckpointArray) {
        // Full validation with checkpoint array
        const validation = await this.testPlanGenerator.validateSpec(specId, spec);
        result.details = validation;
        result.valid = validation.valid;

        if (!validation.valid) {
          result.message = `Spec validation failed: ${validation.errors.length} errors`;
        } else if (validation.warnings.length > 0) {
          result.message = `Spec valid with ${validation.warnings.length} warnings`;
        } else {
          result.message = 'Spec validation passed';
        }
      } else {
        // Spec only has count, just check if spec file exists
        // Pass spec metadata so specExists can recognize known specs
        const exists = await this.testPlanGenerator.specExists(specId, spec);
        result.valid = exists;
        if (exists) {
          result.message = spec?.checkpoints
            ? `Spec found (${spec.checkpoints} checkpoints)`
            : 'Spec found';
        } else {
          result.message = 'Spec file not found';
        }
      }
    } catch (error) {
      result.valid = false;
      result.message = error.message;
    }

    return result;
  }

  _aggregateResults(results) {
    const { details } = results;

    // Check for critical failures
    if (details.compliance?.haltTesting) {
      results.passed = false;
      results.canProceed = false;
      results.errors.push({
        type: 'COMPLIANCE_HALT',
        message: details.compliance.message,
        severity: SEVERITY.CRITICAL
      });
    }

    if (!details.deploymentMatch?.valid) {
      results.passed = false;
      results.errors.push({
        type: 'DEPLOYMENT_INVALID',
        message: details.deploymentMatch?.message || 'Deployment validation failed'
      });
    }

    if (!details.credentialMatch?.valid && details.credentialMatch) {
      results.passed = false;
      results.errors.push({
        type: 'CREDENTIALS_INVALID',
        message: details.credentialMatch.message
      });
    }

    // Add warnings
    if (details.codebaseSync?.synced === false) {
      results.warnings.push({
        type: 'CODEBASE_MISMATCH',
        message: details.codebaseSync.message
      });
    }

    if (!details.specValidity?.valid && details.specValidity) {
      results.warnings.push({
        type: 'SPEC_INVALID',
        message: details.specValidity.message
      });
    }

    if (details.compliance?.report?.summary?.warningCount > 0 && !details.compliance?.skippedDueToSpec) {
      results.warnings.push({
        type: 'COMPLIANCE_WARNINGS',
        message: `${details.compliance.report.summary.warningCount} compliance warnings`
      });
    }

    if (details.credentialMatch?.unavailable?.length > 0) {
      results.warnings.push({
        type: 'SOME_CREDENTIALS_FAILED',
        message: `${details.credentialMatch.unavailable.length} test users unavailable`
      });
    }

    // Determine if testing can proceed
    // Only compliance halt prevents proceeding
    if (results.canProceed) {
      results.canProceed = !details.compliance?.haltTesting;
    }

    // Update overall passed status
    if (results.errors.length > 0) {
      results.passed = false;
    }
  }
}

export default PreTestValidator;
