/**
 * Testing Framework Services
 *
 * Services for GitHub-aware testing with pre-test validation:
 * - GitHubRepoAnalyzer: Analyzes repository structure and content
 * - DeploymentDetector: Identifies deployment environment from URL
 * - DatabaseProbe: Verifies test users via API
 * - ComplianceAnalyzer: Checks role/data separation for HIPAA/SOX
 * - TestPlanGenerator: Validates specs and mappings
 * - PreTestValidator: Aggregates all pre-test validations
 */

export { default as GitHubRepoAnalyzer } from './GitHubRepoAnalyzer';
export { default as DeploymentDetector } from './DeploymentDetector';
export { default as DatabaseProbe } from './DatabaseProbe';
export { default as ComplianceAnalyzer, SEVERITY, STANDARDS, DATA_DOMAINS, COMPLIANCE_RULES } from './ComplianceAnalyzer';
export { default as TestPlanGenerator } from './TestPlanGenerator';
export { default as PreTestValidator } from './PreTestValidator';
export { default as PlaywrightClient, checkpointStepMapping, getStepsForCheckpoint, hasAutomation } from './PlaywrightClient';
