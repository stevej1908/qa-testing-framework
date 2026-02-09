# TF Spec: Admin Configuration

## Feature ID: admin-config
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Administrative configuration including user management, clearinghouse settings, clinical settings, and system configuration.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin user logged in

---

## Checkpoints

### admin-config-1: Admin Settings Access
**Description:** Admin can access settings
**Steps:**
1. Login as admin
2. Navigate to Settings
**Expected:**
- Settings menu accessible
- Configuration options visible
**Code References:**
- `src/components/admin/AdminDashboard.jsx`

### admin-config-2: User Management List
**Description:** User list displays
**Steps:**
1. Navigate to User Management
2. View user list
**Expected:**
- All users displayed
- Shows name, email, role, status
**Code References:**
- `src/components/admin/UserManagement.jsx`

### admin-config-3: Add User
**Description:** New user can be added
**Steps:**
1. Click "Add User"
2. Enter email, name
3. Select role
4. Save
**Expected:**
- User created
- Invitation sent (if configured)
**Code References:**
- `src/components/admin/UserManagement.jsx`

### admin-config-4: Edit User Role
**Description:** User role can be changed
**Steps:**
1. Find user
2. Click Edit
3. Change role
4. Save
**Expected:**
- Role updated
- Permissions change
**Code References:**
- `src/components/admin/UserManagement.jsx`

### admin-config-5: Clearinghouse Configuration
**Description:** Clearinghouse can be configured
**Steps:**
1. Navigate to Clearinghouse Config
2. View/edit settings
**Expected:**
- Provider selection available
- Connection settings visible
**Code References:**
- `src/components/admin/ClearinghouseConfig.jsx`

### admin-config-6: Office Ally Configuration
**Description:** Office Ally settings work
**Steps:**
1. Navigate to Office Ally Config
2. View tabs: Billing Model, Connection, Payers
**Expected:**
- All tabs accessible
- Settings can be modified
**Code References:**
- `src/components/admin/OfficeAllyConfig.jsx`

### admin-config-7: Billing Model Selection
**Description:** Billing model can be selected
**Steps:**
1. Open Office Ally Config
2. Select Billing Model tab
3. Choose Group or Independent
4. Save
**Expected:**
- Model saved
- Affects claim submission
**Code References:**
- `src/components/admin/officeally/BillingModelTab.jsx`

### admin-config-8: Connection Settings
**Description:** SFTP connection can be configured
**Steps:**
1. Open Connection Settings tab
2. Enter submitter ID, name
3. Enter SFTP credentials
4. Test connection
**Expected:**
- Settings saved
- Test shows success/failure
**Code References:**
- `src/components/admin/officeally/ConnectionSettingsTab.jsx`

### admin-config-9: Payer ID Mapping
**Description:** Payer IDs can be mapped
**Steps:**
1. Open Payer ID Mapping tab
2. Add new payer mapping
3. Enter payer name, Office Ally ID
4. Save
**Expected:**
- Mapping saved
- Available for claims
**Code References:**
- `src/components/admin/officeally/PayerMappingTab.jsx`

### admin-config-10: Clinical Settings
**Description:** Clinical settings accessible
**Steps:**
1. Navigate to Clinical Settings
2. View CPT codes, diagnoses
**Expected:**
- CPT codes configurable
- Diagnosis codes available
**Code References:**
- `src/components/admin/ClinicalSettings.jsx`

### admin-config-11: Practice Feature Manager
**Description:** Practice features can be managed
**Steps:**
1. Navigate to Practice Features
2. Select practice
3. Enable/disable features
**Expected:**
- Features toggle on/off
- Billing adjusts accordingly
**Code References:**
- `src/components/admin/PracticeFeatureManager.jsx`

### admin-config-12: EDI Reports Configuration
**Description:** EDI reports accessible
**Steps:**
1. Navigate to EDI Reports
2. View 999, 277CA, rejected claims
**Expected:**
- Reports display
- Can view details
**Code References:**
- `src/components/admin/EDIReports.jsx`

---

## Acceptance Criteria

- [ ] Settings accessible to admin only
- [ ] Users can be managed
- [ ] Clearinghouse configurable
- [ ] Office Ally settings work
- [ ] Connection test works
- [ ] Payer mapping works
- [ ] Clinical settings accessible
- [ ] Features can be enabled/disabled

---

## Configuration Areas

| Area | Description | Access |
|------|-------------|--------|
| User Management | Manage users and roles | Admin |
| Clearinghouse | EDI provider settings | Admin |
| Office Ally | Specific OA settings | Admin |
| Clinical Settings | CPT/Diagnosis codes | Admin |
| Practice Features | Feature enablement | Support |
| EDI Reports | View EDI transactions | Admin |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/users | GET/POST | List/create users |
| /api/users/:id | PUT/DELETE | Update/delete user |
| /api/clearinghouse/config | GET/POST | Get/set config |
| /api/clearinghouse/test-connection | POST | Test SFTP |
| /api/clearinghouse/payer-ids | GET/POST | Payer mappings |
| /api/practice-features/:id | GET/POST | Feature management |
