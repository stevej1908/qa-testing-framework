# TF Spec: Insurance Management

## Feature ID: insurance
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Insurance plan management, patient policy verification, and payer configuration.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin user logged in
- [ ] Clearinghouse configured (for verification)

---

## Checkpoints

### insurance-1: Insurance Plans List
**Description:** Insurance plans list displays
**Steps:**
1. Login as admin
2. Navigate to insurance management
**Expected:**
- Plans list visible
- Shows name, payer ID, type
**Code References:**
- `src/components/admin/InsuranceManagement.jsx`

### insurance-2: Add Insurance Plan
**Description:** New insurance plan can be added
**Steps:**
1. Click "Add Plan"
2. Enter plan name
3. Enter payer ID
4. Select plan type
5. Save
**Expected:**
- Plan created
- Appears in list
**Code References:**
- `src/components/admin/InsuranceManagement.jsx`
- `src/components/admin/insurance/InsurancePlanForm.jsx`

### insurance-3: Edit Insurance Plan
**Description:** Existing plan can be edited
**Steps:**
1. Find plan in list
2. Click Edit
3. Modify fields
4. Save
**Expected:**
- Changes saved
- List updates
**Code References:**
- `src/components/admin/InsuranceManagement.jsx`

### insurance-4: Search Insurance Plans
**Description:** Plans can be searched
**Steps:**
1. Enter search term
2. Observe results
**Expected:**
- Filters by name or payer ID
**Code References:**
- `src/components/admin/InsuranceManagement.jsx`

### insurance-5: Patient Insurance Verification List
**Description:** Patient policies needing verification shown
**Steps:**
1. Navigate to insurance verification
2. View pending list
**Expected:**
- Pending policies displayed
- Patient name, insurance, status shown
**Code References:**
- `src/components/admin/PatientInsuranceVerification.jsx`

### insurance-6: Filter by Verification Status
**Description:** Policies can be filtered
**Steps:**
1. View verification list
2. Select status filter
**Expected:**
- Filters by pending/verified/inactive
**Code References:**
- `src/components/admin/insurance/PolicyFilters.jsx`

### insurance-7: Verify Patient Insurance
**Description:** Policy can be verified
**Steps:**
1. Select pending policy
2. Click "Verify"
3. Enter verification details
4. Confirm eligibility
5. Save
**Expected:**
- Policy marked as verified
- Verification date recorded
**Code References:**
- `src/components/admin/insurance/VerificationModal.jsx`
- `src/hooks/useInsuranceVerification.js`

### insurance-8: Enter Verification Details
**Description:** Verification details can be entered
**Steps:**
1. Open verification modal
2. Enter effective date
3. Enter copay amount
4. Enter deductible
5. Enter out-of-pocket max
6. Add notes
**Expected:**
- All fields saved
- Details attached to policy
**Code References:**
- `src/components/admin/insurance/VerificationModal.jsx`

### insurance-9: Reject Policy
**Description:** Policy can be marked as rejected
**Steps:**
1. Select pending policy
2. Click "Verify"
3. Click "Reject / Unable to Verify"
**Expected:**
- Policy marked inactive
- Reason recorded
**Code References:**
- `src/hooks/useInsuranceVerification.js`

### insurance-10: View Policy Details
**Description:** Full policy details viewable
**Steps:**
1. Click on policy
2. View details
**Expected:**
- Policy number, group number
- Effective dates
- Cardholder information
- Card images (if uploaded)
**Code References:**
- `src/components/admin/insurance/PolicyCard.jsx`

---

## Acceptance Criteria

- [ ] Insurance plans can be added/edited
- [ ] Plans list with search works
- [ ] Patient policies display correctly
- [ ] Policies can be verified with details
- [ ] Policies can be rejected
- [ ] Filter by status works
- [ ] Verification details saved

---

## Data Model

### Insurance Plan
| Field | Type | Required |
|-------|------|----------|
| name | string | ✅ |
| payerId | string | ✅ |
| planType | string | ✅ |
| claimFilingIndicator | string | ✅ |
| address | object | ❌ |
| phone | string | ❌ |

### Patient Policy
| Field | Type | Required |
|-------|------|----------|
| patientId | int | ✅ |
| insurancePlanId | int | ✅ |
| policyNumber | string | ✅ |
| groupNumber | string | ❌ |
| effectiveDate | date | ❌ |
| terminationDate | date | ❌ |
| copayAmount | decimal | ❌ |
| deductibleAmount | decimal | ❌ |
| outOfPocketMax | decimal | ❌ |
| verified | boolean | ✅ |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/insurance/plans | GET | List plans |
| /api/insurance/plans | POST | Create plan |
| /api/insurance/plans/:id | PUT | Update plan |
| /api/insurance/patient-policies | GET | List policies |
| /api/insurance/patient-policies/:id/verify | PUT | Verify |
| /api/insurance/patient-policies/:id/reject | PUT | Reject |
