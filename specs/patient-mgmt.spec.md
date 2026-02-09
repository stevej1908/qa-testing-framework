# TF Spec: Patient Management

## Feature ID: patient-mgmt
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Patient record management including creation, editing, search, and status management.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin or Front Desk user logged in
- [ ] At least one insurance plan configured

---

## Checkpoints

### patient-mgmt-1: Patient List Display
**Description:** Patient list displays with all patients
**Steps:**
1. Login as admin
2. Navigate to admin dashboard
**Expected:**
- Patient list/table visible
- Shows patient name, DOB, insurance
**Code References:**
- `src/components/admin/AdminDashboard.jsx`
- `src/components/admin/dashboard/PatientTable.jsx`

### patient-mgmt-2: Add Patient Button
**Description:** Add patient button opens form
**Steps:**
1. View patient list
2. Click "Add Patient" button
**Expected:**
- Add patient modal/form opens
- Required fields visible
**Code References:**
- `src/components/admin/AddPatientForm.jsx`

### patient-mgmt-3: Create Patient - Required Fields
**Description:** Patient can be created with required fields
**Steps:**
1. Open add patient form
2. Fill first name, last name, DOB, gender, phone
3. Fill address fields
4. Fill emergency contact
5. Select insurance and enter member ID
6. Verify insurance
7. Submit form
**Expected:**
- Patient is created
- Patient appears in list
- Account number generated
**Code References:**
- `src/components/admin/AddPatientForm.jsx`
- `src/hooks/useAddPatientForm.js`
- `server/routes/patients.js`

### patient-mgmt-4: Create Patient - Insurance Verification
**Description:** Insurance must be verified before adding patient
**Steps:**
1. Open add patient form
2. Fill required fields
3. Attempt to submit without verification
**Expected:**
- Submit button disabled or shows warning
- "Verify Insurance" required first
**Code References:**
- `src/components/admin/AddPatientForm.jsx`
- `src/services/insuranceVerificationService.js`

### patient-mgmt-5: [MOVED] Front Desk Quick Intake
**Description:** This workflow has been moved to a dedicated spec.
**See:** `front-desk-intake.spec.md`

The front desk quick intake workflow (collecting basic info during a phone call,
verifying insurance, creating provisional appointments, and sending registration
links) is a complete separate user journey with its own checkpoints, automation
requirements, and business rules.

**Reason for move:** The original checkpoint was too simplistic for the actual
business requirements which include:
- Real-time eligibility verification
- Out-of-network estimate calculation
- Credit card authorization holds
- Provisional appointment scheduling
- Automated reminder sequences (day -5, day -3)
- Discrepancy detection and resolution
- Auto-cancellation at deadline

### patient-mgmt-6: Edit Patient
**Description:** Existing patient can be edited
**Steps:**
1. Find patient in list
2. Click Edit button
3. Modify fields
4. Save changes
**Expected:**
- Edit form opens with current data
- Changes are saved
- List updates
**Code References:**
- `src/components/admin/EditPatientForm.jsx`

### patient-mgmt-7: Search Patients
**Description:** Patients can be searched by name
**Steps:**
1. Enter search term in search box
2. Observe filtered results
**Expected:**
- Patient list filters to matches
- Search is case-insensitive
**Code References:**
- `src/context/PatientContext.jsx`

### patient-mgmt-8: Filter by Status
**Description:** Patients can be filtered by status
**Steps:**
1. Select status filter (Active/Inactive/Temporary)
2. Observe filtered results
**Expected:**
- List shows only matching patients
**Code References:**
- `src/components/admin/dashboard/PatientFilters.jsx`

### patient-mgmt-9: Filter by Registration Status
**Description:** Patients can be filtered by registration status
**Steps:**
1. Select registration status filter
2. Observe filtered results
**Expected:**
- Shows pending, link_sent, in_progress, or complete
**Code References:**
- `src/components/admin/dashboard/PatientFilters.jsx`

### patient-mgmt-10: Patient Detail View
**Description:** Can view full patient details
**Steps:**
1. Click on patient row or view button
2. Review patient information
**Expected:**
- All patient fields displayed
- Insurance details shown
- Contact information visible
**Code References:**
- `src/components/admin/EditPatientForm.jsx`

---

## Acceptance Criteria

- [ ] Patients can be created with all required fields
- [ ] Insurance verification is required for full registration
- [ ] Temporary patients can be created with email link
- [ ] Patients can be edited
- [ ] Search filters work correctly
- [ ] Status filters work correctly
- [ ] Patient data persists across sessions

---

## Data Model

### Patient Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| firstName | string | ✅ | Non-empty |
| lastName | string | ✅ | Non-empty |
| dob | date | ✅ | Valid date, past |
| gender | string | ✅ | Male/Female/Non-binary |
| phone | string | ✅ | Valid phone format |
| email | string | ❌ | Valid email format |
| address | object | ✅ | Street, city, state, zip |
| emergencyContact | string | ✅ | Non-empty |
| emergencyPhone | string | ✅ | Valid phone format |
| insurancePlanId | int | ✅ | Valid plan reference |
| memberNumber | string | ✅ | Non-empty |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/patients | GET | List patients |
| /api/patients | POST | Create patient |
| /api/patients/:id | GET | Get patient |
| /api/patients/:id | PUT | Update patient |
| /api/patients/create-temporary | POST | Create temp patient |
