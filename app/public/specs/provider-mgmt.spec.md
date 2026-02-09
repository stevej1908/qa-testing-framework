# TF Spec: Provider Management

## Feature ID: provider-mgmt
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Provider/clinician management including credentials, NPI, licensing, and billing configuration.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin user logged in
- [ ] Clearinghouse configuration available

---

## Checkpoints

### provider-mgmt-1: Provider List Display
**Description:** Provider list displays all providers
**Steps:**
1. Login as admin
2. Navigate to provider management
**Expected:**
- Provider list/table visible
- Shows name, credentials, NPI, status
**Code References:**
- `src/components/admin/ProviderManagement.jsx`

### provider-mgmt-2: Add Provider Button
**Description:** Add provider button opens form
**Steps:**
1. View provider list
2. Click "Add Provider" button
**Expected:**
- Add provider modal/form opens
- Two-step form visible
**Code References:**
- `src/components/admin/AddProviderForm.jsx`

### provider-mgmt-3: Create Provider - Step 1 Personal Info
**Description:** First step collects personal information
**Steps:**
1. Open add provider form
2. Fill first name, last name, credentials
3. Fill email, phone
4. Fill license number and state
5. Fill address
6. Click Next
**Expected:**
- Form advances to step 2
- Step 1 data retained
**Code References:**
- `src/components/admin/provider/ProviderPersonalInfoStep.jsx`

### provider-mgmt-4: Create Provider - Step 2 Billing Config
**Description:** Second step collects billing configuration
**Steps:**
1. Complete step 1
2. Enter NPI (10 digits)
3. Configure billing settings
4. Enter Tax ID (if independent)
5. Submit form
**Expected:**
- Provider is created
- Provider appears in list
**Code References:**
- `src/components/admin/provider/ProviderBillingConfigStep.jsx`

### provider-mgmt-5: NPI Validation
**Description:** NPI must be 10 digits
**Steps:**
1. Enter NPI with less than 10 digits
2. Attempt to proceed/submit
**Expected:**
- Validation error shown
- Cannot proceed until valid NPI
**Code References:**
- `src/components/admin/AddProviderForm.jsx`

### provider-mgmt-6: Edit Provider
**Description:** Existing provider can be edited
**Steps:**
1. Find provider in list
2. Click Edit button
3. Modify fields
4. Save changes
**Expected:**
- Edit form opens with current data
- Changes are saved
- List updates
**Code References:**
- `src/components/admin/EditProviderForm.jsx`

### provider-mgmt-7: Provider Credentials Display
**Description:** Provider credentials shown correctly
**Steps:**
1. View provider list
2. Check credentials column
**Expected:**
- Shows credentials (MD, PhD, LCSW, etc.)
- License state displayed
**Code References:**
- `src/components/admin/ProviderManagement.jsx`

### provider-mgmt-8: Provider Search
**Description:** Providers can be searched
**Steps:**
1. Enter search term
2. Observe filtered results
**Expected:**
- Filters by name, NPI, or credentials
**Code References:**
- `src/components/admin/ProviderManagement.jsx`

### provider-mgmt-9: Configure SFTP Credentials (Independent)
**Description:** Independent providers can configure SFTP
**Steps:**
1. Edit provider
2. Navigate to billing configuration
3. Enter SFTP username and password
**Expected:**
- SFTP fields visible for independent model
- Credentials saved securely
**Code References:**
- `src/components/admin/provider/ProviderBillingConfigStep.jsx`

### provider-mgmt-10: Provider Service Settings
**Description:** Provider service settings can be configured
**Steps:**
1. Edit provider
2. Configure service locations
3. Set default CPT codes
**Expected:**
- Service settings saved
- Available when starting sessions
**Code References:**
- `src/components/admin/provider/ProviderPersonalInfoStep.jsx`

---

## Acceptance Criteria

- [ ] Providers can be created with required fields
- [ ] NPI is validated (10 digits)
- [ ] Credentials are stored correctly
- [ ] Billing configuration supports both models
- [ ] SFTP credentials are secure
- [ ] Providers can be edited
- [ ] Search works correctly

---

## Data Model

### Provider Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| firstName | string | ✅ | Non-empty |
| lastName | string | ✅ | Non-empty |
| credentials | string | ✅ | Valid credential type |
| npi | string | ✅ | 10 digits |
| email | string | ✅ | Valid email |
| phone | string | ❌ | Valid phone format |
| licenseNumber | string | ✅ | Non-empty |
| licenseState | string | ✅ | Valid state code |
| address | object | ❌ | Street, city, state, zip |
| providerType | string | ✅ | therapist/psychiatrist/etc |
| taxId | string | ❌ | Required for independent |
| sftpUsername | string | ❌ | For independent billing |
| sftpPassword | string | ❌ | For independent billing |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/providers | GET | List providers |
| /api/providers | POST | Create provider |
| /api/providers/:id | GET | Get provider |
| /api/providers/:id | PUT | Update provider |
| /api/providers/:id | DELETE | Deactivate provider |
