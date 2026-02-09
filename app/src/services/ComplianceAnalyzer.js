/**
 * ComplianceAnalyzer - Analyzes role/data model for compliance (HIPAA, SOX)
 *
 * Detects separation of duties issues, super users with inappropriate
 * cross-domain access, and generates compliance reports with findings.
 */

// Compliance standards
const STANDARDS = {
  HIPAA: 'HIPAA',
  SOX: 'SOX',
  PCI_DSS: 'PCI-DSS',
  GENERAL: 'General Security'
};

// Severity levels
const SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
};

// Data domain definitions
const DATA_DOMAINS = {
  patient_records: {
    name: 'Patient Records (PHI)',
    tables: ['patients', 'session_notes', 'prescriptions', 'diagnoses', 'treatment_plans', 'medical_history', 'patient_documents'],
    sensitive: true,
    standards: [STANDARDS.HIPAA]
  },
  financial_data: {
    name: 'Financial Data',
    tables: ['claims', 'payments', 'billing', 'billing_transactions', 'invoices', 'insurance_payments', 'remittances', 'edi_transactions'],
    sensitive: true,
    standards: [STANDARDS.SOX, STANDARDS.PCI_DSS]
  },
  admin_functions: {
    name: 'Administrative Functions',
    tables: ['users', 'practices', 'settings', 'configurations', 'audit_logs', 'permissions', 'roles'],
    sensitive: true,
    standards: [STANDARDS.GENERAL]
  },
  clinical_data: {
    name: 'Clinical Data',
    tables: ['providers', 'services', 'assessments', 'session_notes', 'treatment_plans'],
    sensitive: true,
    standards: [STANDARDS.HIPAA]
  },
  scheduling: {
    name: 'Scheduling',
    tables: ['appointments', 'availability', 'calendar', 'schedules', 'waitlist'],
    sensitive: false,
    standards: []
  }
};

// Compliance rules
const COMPLIANCE_RULES = [
  {
    id: 'CROSS_DOMAIN_ACCESS',
    name: 'Cross-Domain Access Violation',
    description: 'Single role has access to multiple sensitive data domains',
    check: 'crossDomainAccess',
    severity: SEVERITY.CRITICAL,
    standards: [STANDARDS.HIPAA, STANDARDS.SOX],
    recommendation: 'Separate role into domain-specific roles (e.g., clinical_admin and billing_admin)'
  },
  {
    id: 'SUPER_USER_PHI_FINANCE',
    name: 'Super User with PHI and Financial Access',
    description: 'User has access to both patient records (PHI) and financial data',
    check: 'superUserCrossAccess',
    severity: SEVERITY.CRITICAL,
    standards: [STANDARDS.HIPAA, STANDARDS.SOX],
    recommendation: 'Implement role separation; no single role should access both PHI and financial data'
  },
  {
    id: 'NO_ROLE_SEPARATION',
    name: 'Missing Role Separation',
    description: 'No dedicated roles for different data domains',
    check: 'noRoleSeparation',
    severity: SEVERITY.CRITICAL,
    standards: [STANDARDS.HIPAA, STANDARDS.SOX],
    recommendation: 'Create distinct roles: clinical, billing, admin with separated access'
  },
  {
    id: 'EXCESSIVE_PRIVILEGES',
    name: 'Excessive Privileges',
    description: 'Role has more permissions than needed for its function',
    check: 'excessivePrivileges',
    severity: SEVERITY.WARNING,
    standards: [STANDARDS.GENERAL],
    recommendation: 'Apply principle of least privilege; remove unnecessary permissions'
  },
  {
    id: 'MISSING_AUDIT_TRAIL',
    name: 'Missing Audit Trail',
    description: 'No audit logging detected for sensitive operations',
    check: 'missingAuditTrail',
    severity: SEVERITY.WARNING,
    standards: [STANDARDS.HIPAA, STANDARDS.SOX],
    recommendation: 'Implement comprehensive audit logging for all PHI and financial access'
  }
];

class ComplianceAnalyzer {
  constructor(repoAnalyzer, databaseProbe) {
    this.repoAnalyzer = repoAnalyzer;
    this.databaseProbe = databaseProbe;
    this.credentialsConfig = null;
  }

  /**
   * Load test credentials configuration
   * @param {Object} config - Credentials config object
   */
  setCredentialsConfig(config) {
    this.credentialsConfig = config;
  }

  /**
   * Identify data domains from schema
   * @returns {Promise<Object>} Data domains with tables
   */
  async identifyDataDomains() {
    const domains = {};

    // Initialize domains
    for (const [key, config] of Object.entries(DATA_DOMAINS)) {
      domains[key] = {
        ...config,
        detectedTables: [],
        confidence: 0
      };
    }

    // If we have repo analyzer, use schema analysis
    if (this.repoAnalyzer) {
      try {
        const schema = await this.repoAnalyzer.parseUserSchema();
        if (schema.dataDomains) {
          for (const [domain, tables] of Object.entries(schema.dataDomains)) {
            if (domains[domain]) {
              domains[domain].detectedTables = tables;
              domains[domain].confidence = tables.length > 0 ? 80 : 0;
            }
          }
        }
      } catch {
        // Fall back to config-based detection
      }
    }

    // Use credentials config if available
    if (this.credentialsConfig?.users) {
      for (const user of Object.values(this.credentialsConfig.users)) {
        if (!user) continue;
        if (Array.isArray(user.dataDomains)) {
          for (const domain of user.dataDomains) {
            if (domains[domain]) {
              domains[domain].confidence = Math.max(domains[domain].confidence, 60);
            }
          }
        }
      }
    }

    return domains;
  }

  /**
   * Map roles to data domains they can access
   * @returns {Promise<Object>} Role to domain access mapping
   */
  async mapRolesToDomains() {
    const roleMap = {};

    // Use credentials config if available
    if (this.credentialsConfig?.users) {
      for (const [roleKey, user] of Object.entries(this.credentialsConfig.users)) {
        roleMap[roleKey] = {
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          dataDomains: user.dataDomains || [],
          domainAccess: {}
        };

        // Map to domain access
        for (const domain of user.dataDomains || []) {
          roleMap[roleKey].domainAccess[domain] = true;
        }
      }
    }

    // If we have repo analyzer, enhance with detected permissions
    if (this.repoAnalyzer) {
      try {
        const schema = await this.repoAnalyzer.parseUserSchema();
        if (schema.permissions) {
          // Map detected permissions to roles
          for (const permission of schema.permissions) {
            for (const [roleKey, role] of Object.entries(roleMap)) {
              if (role.permissions.includes(permission)) {
                // Permission already mapped
              } else if (permission.includes(roleKey) || permission.includes(role.role)) {
                role.permissions.push(permission);
              }
            }
          }
        }
      } catch {
        // Use config-based mapping
      }
    }

    return roleMap;
  }

  /**
   * Find roles with cross-domain access
   * @returns {Promise<Array>} Roles with violations
   */
  async findCrossDomainRoles() {
    const roleMap = await this.mapRolesToDomains();
    const violations = [];

    const sensitiveDomains = Object.entries(DATA_DOMAINS)
      .filter(([, config]) => config.sensitive)
      .map(([key]) => key);

    for (const [roleKey, role] of Object.entries(roleMap)) {
      const accessedSensitiveDomains = role.dataDomains.filter(d =>
        sensitiveDomains.includes(d)
      );

      if (accessedSensitiveDomains.length >= 2) {
        // Check for specific PHI + Financial violation
        const hasPhiAccess = accessedSensitiveDomains.includes('patient_records') ||
                            accessedSensitiveDomains.includes('clinical_data');
        const hasFinancialAccess = accessedSensitiveDomains.includes('financial_data');

        violations.push({
          role: roleKey,
          email: role.email,
          accessedDomains: accessedSensitiveDomains,
          count: accessedSensitiveDomains.length,
          phiPlusFinancial: hasPhiAccess && hasFinancialAccess,
          severity: hasPhiAccess && hasFinancialAccess ? SEVERITY.CRITICAL : SEVERITY.WARNING
        });
      }
    }

    return violations;
  }

  /**
   * Flag super users with inappropriate access
   * @returns {Promise<Array>} Flagged super users
   */
  async flagSuperUsers() {
    const roleMap = await this.mapRolesToDomains();
    const superUsers = [];

    for (const [roleKey, role] of Object.entries(roleMap)) {
      const isSuperUser = role.permissions.includes('is_admin') ||
                         role.role === 'admin' ||
                         roleKey === 'admin';

      if (isSuperUser) {
        const hasPhiAccess = role.dataDomains.includes('patient_records') ||
                            role.dataDomains.includes('clinical_data');
        const hasFinancialAccess = role.dataDomains.includes('financial_data');
        const hasAdminAccess = role.dataDomains.includes('admin_functions');

        superUsers.push({
          role: roleKey,
          email: role.email,
          permissions: role.permissions,
          dataDomains: role.dataDomains,
          flags: {
            phiAccess: hasPhiAccess,
            financialAccess: hasFinancialAccess,
            adminAccess: hasAdminAccess,
            crossDomainViolation: hasPhiAccess && hasFinancialAccess
          }
        });
      }
    }

    return superUsers;
  }

  /**
   * Analyze separation of duties compliance
   * @returns {Promise<Object>} Separation of duties analysis
   */
  async analyzeSeparationOfDuties() {
    const analysis = {
      hasSeparation: false,
      dedicatedRoles: [],
      violations: [],
      recommendations: []
    };

    const roleMap = await this.mapRolesToDomains();
    const roles = Object.keys(roleMap);

    // Check for dedicated roles
    const hasClinicalRole = roles.some(r =>
      roleMap[r].dataDomains.includes('patient_records') &&
      !roleMap[r].dataDomains.includes('financial_data')
    );

    const hasBillingRole = roles.some(r =>
      roleMap[r].dataDomains.includes('financial_data') &&
      !roleMap[r].dataDomains.includes('patient_records')
    );

    const hasAdminRole = roles.some(r =>
      roleMap[r].permissions.includes('is_admin')
    );

    if (hasClinicalRole) analysis.dedicatedRoles.push('clinical');
    if (hasBillingRole) analysis.dedicatedRoles.push('billing');
    if (hasAdminRole) analysis.dedicatedRoles.push('admin');

    analysis.hasSeparation = hasClinicalRole && hasBillingRole;

    // Add violations
    const crossDomainViolations = await this.findCrossDomainRoles();
    analysis.violations = crossDomainViolations;

    // Add recommendations
    if (!hasClinicalRole) {
      analysis.recommendations.push('Create a dedicated clinical role with access only to patient records');
    }
    if (!hasBillingRole) {
      analysis.recommendations.push('Create a dedicated billing role with access only to financial data');
    }
    if (crossDomainViolations.some(v => v.phiPlusFinancial)) {
      analysis.recommendations.push('Remove financial access from roles that have PHI access (except audit/reporting)');
    }

    return analysis;
  }

  /**
   * Generate comprehensive compliance report
   * @param {Object} spec - Optional spec to check compliance against (feature-aware)
   * @returns {Promise<Object>} Complete compliance report
   */
  async generateComplianceReport(spec = null) {
    const report = {
      timestamp: new Date().toISOString(),
      passed: true,
      severity: SEVERITY.INFO,
      findings: [],
      dataDomains: {},
      roleMatrix: {},
      summary: {
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0
      },
      haltTesting: false,
      haltReason: null,
      specAware: !!spec,
      specDomains: spec?.dataDomains || [],
      skippedDueToSpec: false
    };

    // If spec has no sensitive data domains, skip compliance check
    if (spec?.dataDomains) {
      const specSensitiveDomains = spec.dataDomains.filter(d =>
        DATA_DOMAINS[d]?.sensitive
      );

      // If the spec doesn't touch any sensitive domains, pass compliance
      if (specSensitiveDomains.length === 0) {
        report.passed = true;
        report.skippedDueToSpec = true;
        report.skipReason = `Feature "${spec.name}" only accesses non-sensitive data domains (${spec.dataDomains.join(', ') || 'none'})`;
        return report;
      }

      // If spec only touches ONE sensitive domain, no cross-domain violation possible
      if (specSensitiveDomains.length === 1) {
        report.passed = true;
        report.skippedDueToSpec = true;
        report.skipReason = `Feature "${spec.name}" only accesses one sensitive domain: ${specSensitiveDomains[0]}`;
        return report;
      }
    }

    // Get data domains
    report.dataDomains = await this.identifyDataDomains();

    // Get role mapping
    const roleMap = await this.mapRolesToDomains();

    // Build role matrix
    for (const [roleKey, role] of Object.entries(roleMap)) {
      report.roleMatrix[roleKey] = {};
      for (const domain of Object.keys(DATA_DOMAINS)) {
        report.roleMatrix[roleKey][domain] = role.dataDomains.includes(domain);
      }
    }

    // Run compliance checks
    for (const rule of COMPLIANCE_RULES) {
      const finding = await this._runComplianceCheck(rule, roleMap);
      if (finding) {
        report.findings.push(finding);

        // Update severity and counts
        if (finding.severity === SEVERITY.CRITICAL) {
          report.summary.criticalCount++;
          report.passed = false;
          report.severity = SEVERITY.CRITICAL;
        } else if (finding.severity === SEVERITY.WARNING) {
          report.summary.warningCount++;
          if (report.severity !== SEVERITY.CRITICAL) {
            report.severity = SEVERITY.WARNING;
          }
        } else {
          report.summary.infoCount++;
        }
      }
    }

    // Determine if testing should halt (now allows workaround)
    const criticalFindings = report.findings.filter(f =>
      f.severity === SEVERITY.CRITICAL
    );

    if (criticalFindings.length > 0) {
      // Check for PHI + Financial cross-access
      const phiFinanceViolation = criticalFindings.find(f =>
        f.type === 'SUPER_USER_PHI_FINANCE' || f.type === 'CROSS_DOMAIN_ACCESS'
      );

      if (phiFinanceViolation) {
        // Don't hard halt - allow workaround but require acknowledgment
        report.haltTesting = false;
        report.requiresAcknowledgment = true;
        report.complianceWarning = `Critical compliance issue: ${phiFinanceViolation.description}. ` +
          'This MUST be resolved before production deployment.';

        // Provide workaround
        report.workaround = {
          available: true,
          description: 'Use super-admin credentials to test system functionality. ' +
            'Security role separation must be implemented before go-live.',
          credentials: 'admin',
          acknowledgmentRequired: true,
          mustLogToGitHub: true
        };
      }
    }

    return report;
  }

  // Private methods

  async _runComplianceCheck(rule, roleMap) {
    switch (rule.check) {
      case 'crossDomainAccess':
        return this._checkCrossDomainAccess(rule, roleMap);

      case 'superUserCrossAccess':
        return this._checkSuperUserCrossAccess(rule, roleMap);

      case 'noRoleSeparation':
        return this._checkNoRoleSeparation(rule, roleMap);

      case 'excessivePrivileges':
        return this._checkExcessivePrivileges(rule, roleMap);

      case 'missingAuditTrail':
        return this._checkMissingAuditTrail(rule, roleMap);

      default:
        return null;
    }
  }

  _checkCrossDomainAccess(rule, roleMap) {
    const violations = [];

    for (const [roleKey, role] of Object.entries(roleMap)) {
      const sensitiveDomains = role.dataDomains.filter(d =>
        DATA_DOMAINS[d]?.sensitive
      );

      if (sensitiveDomains.length >= 2) {
        violations.push({
          role: roleKey,
          domains: sensitiveDomains
        });
      }
    }

    if (violations.length > 0) {
      return {
        type: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        standards: rule.standards,
        recommendation: rule.recommendation,
        affectedRoles: violations.map(v => v.role),
        details: violations
      };
    }

    return null;
  }

  _checkSuperUserCrossAccess(rule, roleMap) {
    const violations = [];

    for (const [roleKey, role] of Object.entries(roleMap)) {
      const isSuperUser = role.permissions.includes('is_admin') ||
                         role.role === 'admin';

      if (isSuperUser) {
        const hasPhiAccess = role.dataDomains.includes('patient_records') ||
                            role.dataDomains.includes('clinical_data');
        const hasFinancialAccess = role.dataDomains.includes('financial_data');

        if (hasPhiAccess && hasFinancialAccess) {
          violations.push({
            role: roleKey,
            email: role.email,
            phiDomains: role.dataDomains.filter(d =>
              d === 'patient_records' || d === 'clinical_data'
            ),
            financialDomains: role.dataDomains.filter(d =>
              d === 'financial_data'
            )
          });
        }
      }
    }

    if (violations.length > 0) {
      return {
        type: rule.id,
        name: rule.name,
        description: `Super user(s) have access to both patient records (PHI) AND financial data. ` +
          `This violates HIPAA and SOX separation of duties requirements.`,
        severity: SEVERITY.CRITICAL,
        standards: rule.standards,
        recommendation: rule.recommendation,
        affectedRoles: violations.map(v => v.role),
        details: violations
      };
    }

    return null;
  }

  _checkNoRoleSeparation(rule, roleMap) {
    const roles = Object.values(roleMap);

    const hasDedicatedClinical = roles.some(r =>
      r.dataDomains.includes('patient_records') &&
      !r.dataDomains.includes('financial_data') &&
      r.role !== 'admin'
    );

    const hasDedicatedBilling = roles.some(r =>
      r.dataDomains.includes('financial_data') &&
      !r.dataDomains.includes('patient_records') &&
      r.role !== 'admin'
    );

    if (!hasDedicatedClinical || !hasDedicatedBilling) {
      return {
        type: rule.id,
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
        standards: rule.standards,
        recommendation: rule.recommendation,
        affectedRoles: Object.keys(roleMap),
        details: {
          hasDedicatedClinical,
          hasDedicatedBilling,
          missingRoles: [
            !hasDedicatedClinical && 'dedicated clinical role',
            !hasDedicatedBilling && 'dedicated billing role'
          ].filter(Boolean)
        }
      };
    }

    return null;
  }

  _checkExcessivePrivileges(rule, roleMap) {
    // This is informational - flag any role with more than 2 domains
    const violations = [];

    for (const [roleKey, role] of Object.entries(roleMap)) {
      if (role.dataDomains.length > 2 && role.role !== 'admin') {
        violations.push({
          role: roleKey,
          domainCount: role.dataDomains.length,
          domains: role.dataDomains
        });
      }
    }

    if (violations.length > 0) {
      return {
        type: rule.id,
        name: rule.name,
        description: rule.description,
        severity: SEVERITY.INFO,
        standards: rule.standards,
        recommendation: rule.recommendation,
        affectedRoles: violations.map(v => v.role),
        details: violations
      };
    }

    return null;
  }

  _checkMissingAuditTrail(rule, roleMap) {
    // Check if audit_logs table was detected
    if (this.repoAnalyzer) {
      // We'd need to check for audit tables in the schema
      // For now, this is informational
    }

    return null;
  }
}

// Export constants for use in components
export { STANDARDS, SEVERITY, DATA_DOMAINS, COMPLIANCE_RULES };
export default ComplianceAnalyzer;
