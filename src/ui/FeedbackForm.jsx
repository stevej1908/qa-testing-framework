// FeedbackForm - Structured feedback form for rejected checkpoints
import React, { useState } from 'react';

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#fef2f2',
    padding: '12px 16px',
    borderBottom: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  headerIcon: {
    fontSize: '20px'
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#991b1b'
  },
  body: {
    padding: '16px'
  },
  checkpointInfo: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px'
  },
  required: {
    color: '#ef4444',
    marginLeft: '2px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff'
  },
  selectWithInput: {
    display: 'flex',
    gap: '8px'
  },
  radioGroup: {
    display: 'flex',
    gap: '16px'
  },
  radioOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    flex: 1,
    transition: 'all 0.2s'
  },
  radioOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  radioOptionBlocker: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  radioInput: {
    marginTop: '2px'
  },
  radioLabel: {
    fontWeight: '600',
    fontSize: '14px'
  },
  radioDescription: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  error: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px'
  }
};

export const FeedbackForm = ({
  checkpoint,
  formStructure,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    field: '',
    customField: '',
    issue: '',
    expected: '',
    priority: 'nice-to-have',
    category: 'other'
  });
  const [errors, setErrors] = useState({});
  const [useCustomField, setUseCustomField] = useState(false);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.issue.trim()) {
      newErrors.issue = 'Issue description is required';
    }

    if (!formData.expected.trim()) {
      newErrors.expected = 'Expected behavior is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      field: useCustomField ? formData.customField : formData.field,
      issue: formData.issue,
      expected: formData.expected,
      priority: formData.priority,
      category: formData.category,
      checkpointId: checkpoint?.id,
      checkpointIndex: checkpoint?.index
    });
  };

  const fieldOptions = formStructure?.fields?.find(f => f.name === 'field')?.options || [];

  return (
    <form style={styles.container} onSubmit={handleSubmit}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>⚠️</span>
        <span style={styles.headerText}>Report Issue - Checkpoint {checkpoint?.index}</span>
      </div>

      {/* Body */}
      <div style={styles.body}>
        {/* Checkpoint Info */}
        <div style={styles.checkpointInfo}>
          <strong>Action:</strong> {checkpoint?.action}
        </div>

        {/* Field Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Field/Element</label>
          <div style={styles.selectWithInput}>
            <select
              style={{ ...styles.select, flex: 2 }}
              value={useCustomField ? '__custom__' : formData.field}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setUseCustomField(true);
                } else {
                  setUseCustomField(false);
                  handleChange('field', e.target.value);
                }
              }}
            >
              <option value="">Select field...</option>
              {fieldOptions.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
              <option value="__custom__">Enter custom...</option>
            </select>
            {useCustomField && (
              <input
                style={{ ...styles.input, flex: 1 }}
                type="text"
                placeholder="Enter field name..."
                value={formData.customField}
                onChange={(e) => handleChange('customField', e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Issue Description */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            What's Wrong<span style={styles.required}>*</span>
          </label>
          <textarea
            style={styles.textarea}
            placeholder="Describe the issue..."
            value={formData.issue}
            onChange={(e) => handleChange('issue', e.target.value)}
          />
          {errors.issue && <div style={styles.error}>{errors.issue}</div>}
        </div>

        {/* Expected Behavior */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Expected Behavior<span style={styles.required}>*</span>
          </label>
          <textarea
            style={styles.textarea}
            placeholder="What should happen instead..."
            value={formData.expected}
            onChange={(e) => handleChange('expected', e.target.value)}
          />
          {errors.expected && <div style={styles.error}>{errors.expected}</div>}
        </div>

        {/* Priority */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Priority<span style={styles.required}>*</span>
          </label>
          <div style={styles.radioGroup}>
            <label
              style={{
                ...styles.radioOption,
                ...(formData.priority === 'blocker' ? styles.radioOptionBlocker : {})
              }}
            >
              <input
                type="radio"
                name="priority"
                value="blocker"
                checked={formData.priority === 'blocker'}
                onChange={(e) => handleChange('priority', e.target.value)}
                style={styles.radioInput}
              />
              <div>
                <div style={styles.radioLabel}>🚫 Blocker</div>
                <div style={styles.radioDescription}>
                  Cannot proceed until fixed
                </div>
              </div>
            </label>
            <label
              style={{
                ...styles.radioOption,
                ...(formData.priority === 'nice-to-have' ? styles.radioOptionSelected : {})
              }}
            >
              <input
                type="radio"
                name="priority"
                value="nice-to-have"
                checked={formData.priority === 'nice-to-have'}
                onChange={(e) => handleChange('priority', e.target.value)}
                style={styles.radioInput}
              />
              <div>
                <div style={styles.radioLabel}>📝 Nice-to-have</div>
                <div style={styles.radioDescription}>
                  Log for later, continue testing
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Category */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Category</label>
          <select
            style={styles.select}
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="ui">UI/Visual</option>
            <option value="logic">Logic/Behavior</option>
            <option value="data">Data/Validation</option>
            <option value="workflow">Workflow/Navigation</option>
            <option value="performance">Performance</option>
            <option value="accessibility">Accessibility</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={styles.buttonRow}>
          <button type="button" style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" style={styles.submitButton}>
            Submit Feedback
          </button>
        </div>
      </div>
    </form>
  );
};

export default FeedbackForm;
