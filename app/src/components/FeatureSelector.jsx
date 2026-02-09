import React, { useState, useEffect } from 'react';
import { getSessions } from '../storage/TestArtifactStore';

// Available feature specs (from testing-framework/specs/)
// dataDomains: which data domains this feature touches (for compliance checking)
// requiredRole: primary role needed to test this feature
const FEATURE_SPECS = [
  { id: 'auth-login', name: 'Authentication', checkpoints: 9, dataDomains: [], requiredRole: 'any' },
  { id: 'auth-roles', name: 'Role-Based Access', checkpoints: 11, dataDomains: ['admin_functions'], requiredRole: 'admin' },
  { id: 'patient-mgmt', name: 'Patient Management', checkpoints: 10, dataDomains: ['patient_records'], requiredRole: 'admin' },
  { id: 'provider-mgmt', name: 'Provider Management', checkpoints: 10, dataDomains: ['admin_functions'], requiredRole: 'admin' },
  { id: 'session-docs', name: 'Session Documentation', checkpoints: 12, dataDomains: ['patient_records', 'clinical_data'], requiredRole: 'provider' },
  { id: 'billing-claims', name: 'Billing & Claims', checkpoints: 12, dataDomains: ['financial_data'], requiredRole: 'billing' },
  { id: 'front-desk-ops', name: 'Front Desk Operations', checkpoints: 10, dataDomains: ['scheduling'], requiredRole: 'frontDesk' },
  { id: 'appointments', name: 'Scheduling', checkpoints: 11, dataDomains: ['scheduling'], requiredRole: 'frontDesk' },
  { id: 'prescriptions', name: 'Prescriptions & RTM', checkpoints: 10, dataDomains: ['patient_records', 'clinical_data'], requiredRole: 'provider' },
  { id: 'insurance', name: 'Insurance Management', checkpoints: 10, dataDomains: ['financial_data', 'patient_records'], requiredRole: 'admin' },
  { id: 'patient-portal', name: 'Patient Portal', checkpoints: 12, dataDomains: ['patient_records'], requiredRole: 'any' },
  { id: 'mobile', name: 'Mobile Support', checkpoints: 10, dataDomains: [], requiredRole: 'any' },
  { id: 'admin-config', name: 'Admin Configuration', checkpoints: 12, dataDomains: ['admin_functions'], requiredRole: 'admin' },
  { id: 'intake-forms', name: 'Intake Forms', checkpoints: 11, dataDomains: ['patient_records'], requiredRole: 'frontDesk' },
  { id: 'practice-setup', name: 'Practice Setup', checkpoints: 12, dataDomains: ['admin_functions'], requiredRole: 'admin' }
];

const FeatureSelector = ({ onSelect, selectedSpec }) => {
  const [filter, setFilter] = useState('');
  const [filteredSpecs, setFilteredSpecs] = useState(FEATURE_SPECS);
  const [latestResults, setLatestResults] = useState({});

  // Load latest test results for each spec
  useEffect(() => {
    const loadLatestResults = async () => {
      try {
        const sessions = await getSessions({ status: 'completed' });
        const results = {};

        // Find latest completed session for each spec
        for (const spec of FEATURE_SPECS) {
          const specSessions = sessions
            .filter(s => s.specId === spec.id && s.status === 'completed')
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

          if (specSessions.length > 0) {
            const latest = specSessions[0];
            results[spec.id] = {
              passed: latest.passed,
              failed: latest.failed,
              total: latest.passed + latest.failed,
              date: latest.updatedAt,
              status: latest.failed === 0 ? 'passed' : 'failed'
            };
          }
        }

        setLatestResults(results);
      } catch (err) {
        console.error('Failed to load latest results:', err);
      }
    };

    loadLatestResults();
  }, []);

  useEffect(() => {
    if (filter) {
      setFilteredSpecs(
        FEATURE_SPECS.filter(spec =>
          spec.name.toLowerCase().includes(filter.toLowerCase()) ||
          spec.id.toLowerCase().includes(filter.toLowerCase())
        )
      );
    } else {
      setFilteredSpecs(FEATURE_SPECS);
    }
  }, [filter]);

  const totalCheckpoints = FEATURE_SPECS.reduce((sum, spec) => sum + spec.checkpoints, 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Select Feature to Test</h3>
        <span style={styles.summary}>
          {FEATURE_SPECS.length} specs, {totalCheckpoints} checkpoints
        </span>
      </div>

      <input
        type="text"
        placeholder="Filter specs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={styles.filterInput}
      />

      <div style={styles.specList}>
        {filteredSpecs.map(spec => {
          const result = latestResults[spec.id];
          return (
            <div
              key={spec.id}
              style={{
                ...styles.specItem,
                ...(selectedSpec?.id === spec.id ? styles.specItemSelected : {})
              }}
              onClick={() => onSelect(spec)}
            >
              <div style={styles.specInfo}>
                <span style={styles.specName}>{spec.name}</span>
                <span style={styles.specId}>{spec.id}</span>
              </div>
              <div style={styles.specRight}>
                {result ? (
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: result.status === 'passed' ? '#dcfce7' : '#fef2f2',
                    color: result.status === 'passed' ? '#16a34a' : '#dc2626'
                  }}>
                    {result.status === 'passed'
                      ? '✓ PASSED'
                      : `✗ ${result.failed} failed`}
                  </span>
                ) : (
                  <span style={styles.notTested}>Not tested</span>
                )}
                <span style={styles.checkpointCount}>
                  {spec.checkpoints} checkpoints
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSpecs.length === 0 && (
        <div style={styles.noResults}>
          No specs match "{filter}"
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  summary: {
    fontSize: '12px',
    color: '#6b7280'
  },
  filterInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '12px',
    outline: 'none'
  },
  specList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  specItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  specItemSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#1e40af'
  },
  specInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  specName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1f2937'
  },
  specId: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  specRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase'
  },
  notTested: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  checkpointCount: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  noResults: {
    textAlign: 'center',
    padding: '24px',
    color: '#6b7280'
  }
};

export default FeatureSelector;
