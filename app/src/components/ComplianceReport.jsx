/**
 * ComplianceReport - Display compliance analysis findings
 *
 * Shows HIPAA/SOX compliance findings, role-to-domain matrix,
 * and specific remediation recommendations.
 */

import React, { useState } from 'react';
import { SEVERITY, STANDARDS, DATA_DOMAINS } from '../services/ComplianceAnalyzer';

const ComplianceReport = ({ report, onDismiss, onExport }) => {
  const [expandedSections, setExpandedSections] = useState({
    findings: true,
    matrix: false,
    domains: false
  });

  if (!report) {
    return null;
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case SEVERITY.CRITICAL:
        return styles.severityCritical;
      case SEVERITY.WARNING:
        return styles.severityWarning;
      case SEVERITY.INFO:
      default:
        return styles.severityInfo;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case SEVERITY.CRITICAL:
        return '!';
      case SEVERITY.WARNING:
        return '!';
      case SEVERITY.INFO:
      default:
        return 'i';
    }
  };

  const getStandardBadge = (standard) => {
    const colors = {
      [STANDARDS.HIPAA]: { bg: '#fef3c7', color: '#92400e' },
      [STANDARDS.SOX]: { bg: '#fce7f3', color: '#9d174d' },
      [STANDARDS.PCI_DSS]: { bg: '#e0e7ff', color: '#3730a3' },
      [STANDARDS.GENERAL]: { bg: '#e5e7eb', color: '#374151' }
    };
    const style = colors[standard] || colors[STANDARDS.GENERAL];
    return (
      <span
        key={standard}
        style={{
          ...styles.standardBadge,
          backgroundColor: style.bg,
          color: style.color
        }}
      >
        {standard}
      </span>
    );
  };

  const renderStatusHeader = () => {
    const statusStyle = report.haltTesting
      ? styles.statusHalt
      : report.passed
        ? styles.statusPass
        : styles.statusFail;

    return (
      <div style={{ ...styles.statusHeader, ...statusStyle }}>
        <div style={styles.statusIcon}>
          {report.haltTesting ? 'HALT' : report.passed ? 'PASS' : 'ISSUES'}
        </div>
        <div style={styles.statusText}>
          <h2 style={styles.statusTitle}>
            {report.haltTesting
              ? 'Compliance Check Failed - Testing Halted'
              : report.passed
                ? 'Compliance Check Passed'
                : 'Compliance Issues Detected'}
          </h2>
          {report.haltTesting && (
            <p style={styles.haltReason}>{report.haltReason}</p>
          )}
          <div style={styles.statusSummary}>
            {report.summary.criticalCount > 0 && (
              <span style={styles.criticalCount}>
                {report.summary.criticalCount} Critical
              </span>
            )}
            {report.summary.warningCount > 0 && (
              <span style={styles.warningCount}>
                {report.summary.warningCount} Warning
              </span>
            )}
            {report.summary.infoCount > 0 && (
              <span style={styles.infoCount}>
                {report.summary.infoCount} Info
              </span>
            )}
          </div>
        </div>
        <div style={styles.headerActions}>
          {onExport && (
            <button onClick={onExport} style={styles.exportButton}>
              Export Report
            </button>
          )}
          {onDismiss && !report.haltTesting && (
            <button onClick={onDismiss} style={styles.dismissButton}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFindings = () => {
    if (!report.findings || report.findings.length === 0) {
      return (
        <div style={styles.noFindings}>
          No compliance issues detected.
        </div>
      );
    }

    return (
      <div style={styles.findingsList}>
        {report.findings.map((finding, index) => (
          <div
            key={finding.type || index}
            style={{
              ...styles.findingItem,
              borderLeftColor: finding.severity === SEVERITY.CRITICAL
                ? '#dc2626'
                : finding.severity === SEVERITY.WARNING
                  ? '#f59e0b'
                  : '#6b7280'
            }}
          >
            <div style={styles.findingHeader}>
              <div style={styles.findingTitleRow}>
                <span style={{ ...styles.severityBadge, ...getSeverityStyle(finding.severity) }}>
                  {getSeverityIcon(finding.severity)} {finding.severity.toUpperCase()}
                </span>
                <span style={styles.findingName}>{finding.name}</span>
              </div>
              <div style={styles.standardsList}>
                {finding.standards.map(getStandardBadge)}
              </div>
            </div>
            <p style={styles.findingDescription}>{finding.description}</p>
            {finding.affectedRoles && finding.affectedRoles.length > 0 && (
              <div style={styles.affectedRoles}>
                <strong>Affected Roles:</strong>{' '}
                {finding.affectedRoles.join(', ')}
              </div>
            )}
            <div style={styles.recommendation}>
              <strong>Recommendation:</strong> {finding.recommendation}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRoleMatrix = () => {
    const roles = Object.keys(report.roleMatrix || {});
    const domains = Object.keys(DATA_DOMAINS);

    if (roles.length === 0) {
      return <p style={styles.emptyMessage}>No roles detected</p>;
    }

    return (
      <div style={styles.matrixContainer}>
        <table style={styles.matrixTable}>
          <thead>
            <tr>
              <th style={styles.matrixHeader}>Role</th>
              {domains.map(domain => (
                <th key={domain} style={styles.matrixHeader} title={DATA_DOMAINS[domain].name}>
                  {domain.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role}>
                <td style={styles.matrixRoleCell}>{role}</td>
                {domains.map(domain => {
                  const hasAccess = report.roleMatrix[role][domain];
                  const isSensitive = DATA_DOMAINS[domain].sensitive;
                  return (
                    <td
                      key={domain}
                      style={{
                        ...styles.matrixCell,
                        backgroundColor: hasAccess
                          ? isSensitive
                            ? '#fef2f2'
                            : '#dcfce7'
                          : '#f9fafb'
                      }}
                    >
                      {hasAccess ? (
                        <span style={isSensitive ? styles.accessSensitive : styles.accessNormal}>
                          Access
                        </span>
                      ) : (
                        <span style={styles.noAccess}>-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={styles.matrixLegend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#fef2f2' }}></span>
            Sensitive Data Access
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: '#dcfce7' }}></span>
            Normal Data Access
          </span>
        </div>
      </div>
    );
  };

  const renderDataDomains = () => {
    return (
      <div style={styles.domainsList}>
        {Object.entries(report.dataDomains || {}).map(([key, domain]) => (
          <div key={key} style={styles.domainItem}>
            <div style={styles.domainHeader}>
              <span style={styles.domainName}>{domain.name}</span>
              {domain.sensitive && (
                <span style={styles.sensitiveBadge}>Sensitive</span>
              )}
            </div>
            {domain.standards.length > 0 && (
              <div style={styles.domainStandards}>
                {domain.standards.map(getStandardBadge)}
              </div>
            )}
            {domain.detectedTables && domain.detectedTables.length > 0 && (
              <div style={styles.domainTables}>
                <span style={styles.tablesLabel}>Tables:</span>
                {domain.detectedTables.slice(0, 5).map(table => (
                  <span key={table} style={styles.tableBadge}>{table}</span>
                ))}
                {domain.detectedTables.length > 5 && (
                  <span style={styles.moreCount}>
                    +{domain.detectedTables.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {renderStatusHeader()}

      <div style={styles.content}>
        {/* Findings Section */}
        <div style={styles.section}>
          <button
            onClick={() => toggleSection('findings')}
            style={styles.sectionHeader}
          >
            <span>Compliance Findings ({report.findings?.length || 0})</span>
            <span>{expandedSections.findings ? 'Hide' : 'Show'}</span>
          </button>
          {expandedSections.findings && renderFindings()}
        </div>

        {/* Role Matrix Section */}
        <div style={styles.section}>
          <button
            onClick={() => toggleSection('matrix')}
            style={styles.sectionHeader}
          >
            <span>Role-Domain Access Matrix</span>
            <span>{expandedSections.matrix ? 'Hide' : 'Show'}</span>
          </button>
          {expandedSections.matrix && renderRoleMatrix()}
        </div>

        {/* Data Domains Section */}
        <div style={styles.section}>
          <button
            onClick={() => toggleSection('domains')}
            style={styles.sectionHeader}
          >
            <span>Data Domains</span>
            <span>{expandedSections.domains ? 'Hide' : 'Show'}</span>
          </button>
          {expandedSections.domains && renderDataDomains()}
        </div>
      </div>

      <div style={styles.footer}>
        <span style={styles.timestamp}>
          Generated: {new Date(report.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  statusHeader: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px'
  },
  statusHalt: {
    backgroundColor: '#fef2f2',
    borderBottom: '3px solid #dc2626'
  },
  statusPass: {
    backgroundColor: '#f0fdf4',
    borderBottom: '3px solid #16a34a'
  },
  statusFail: {
    backgroundColor: '#fffbeb',
    borderBottom: '3px solid #f59e0b'
  },
  statusIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#1f2937',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '11px'
  },
  statusText: {
    flex: 1
  },
  statusTitle: {
    margin: '0 0 4px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937'
  },
  haltReason: {
    margin: '8px 0',
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: '500'
  },
  statusSummary: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px'
  },
  criticalCount: {
    fontSize: '13px',
    color: '#dc2626',
    fontWeight: '500'
  },
  warningCount: {
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  infoCount: {
    fontSize: '13px',
    color: '#6b7280'
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#1f2937',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  dismissButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  content: {
    padding: '16px 24px'
  },
  section: {
    marginBottom: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  sectionHeader: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  findingsList: {
    padding: '16px'
  },
  noFindings: {
    padding: '24px',
    textAlign: 'center',
    color: '#16a34a',
    fontSize: '14px'
  },
  findingItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    borderLeft: '4px solid',
    marginBottom: '12px'
  },
  findingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  findingTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  severityBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600'
  },
  severityCritical: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  severityWarning: {
    backgroundColor: '#fffbeb',
    color: '#f59e0b'
  },
  severityInfo: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280'
  },
  findingName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937'
  },
  standardsList: {
    display: 'flex',
    gap: '4px'
  },
  standardBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500'
  },
  findingDescription: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.5'
  },
  affectedRoles: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  recommendation: {
    fontSize: '13px',
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    padding: '10px 12px',
    borderRadius: '4px'
  },
  matrixContainer: {
    padding: '16px',
    overflowX: 'auto'
  },
  matrixTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px'
  },
  matrixHeader: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    borderBottom: '2px solid #e5e7eb',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap'
  },
  matrixRoleCell: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    fontWeight: '500',
    color: '#1f2937'
  },
  matrixCell: {
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center'
  },
  accessSensitive: {
    color: '#dc2626',
    fontWeight: '500',
    fontSize: '11px'
  },
  accessNormal: {
    color: '#16a34a',
    fontWeight: '500',
    fontSize: '11px'
  },
  noAccess: {
    color: '#9ca3af'
  },
  matrixLegend: {
    marginTop: '12px',
    display: 'flex',
    gap: '16px',
    fontSize: '11px',
    color: '#6b7280'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    border: '1px solid #e5e7eb'
  },
  domainsList: {
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px'
  },
  domainItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px'
  },
  domainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px'
  },
  domainName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  sensitiveBadge: {
    padding: '2px 6px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500'
  },
  domainStandards: {
    display: 'flex',
    gap: '4px',
    marginBottom: '8px'
  },
  domainTables: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center'
  },
  tablesLabel: {
    fontSize: '11px',
    color: '#6b7280',
    marginRight: '4px'
  },
  tableBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    borderRadius: '4px'
  },
  moreCount: {
    fontSize: '11px',
    color: '#9ca3af'
  },
  emptyMessage: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px'
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  timestamp: {
    fontSize: '11px',
    color: '#9ca3af'
  }
};

export default ComplianceReport;
