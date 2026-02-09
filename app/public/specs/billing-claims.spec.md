# TF Spec: Billing & Claims

## Feature ID: billing-claims
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Insurance claim creation, CMS 1500 generation, EDI 837 submission, and claim status tracking.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin or Billing user logged in
- [ ] Completed sessions available for billing
- [ ] Clearinghouse configured
- [ ] Payer IDs configured

---

## Checkpoints

### billing-1: Claims List Display
**Description:** Claims list shows all claims
**Steps:**
1. Login as admin/billing
2. Navigate to claims/billing
**Expected:**
- Claims table visible
- Shows claim ID, patient, status, amount
**Code References:**
- `src/components/billing/ClaimsManagement.jsx`

### billing-2: Create Claim from Session
**Description:** Claim can be created from completed session
**Steps:**
1. Find completed session
2. Click "Create Claim" or "Generate Claim"
**Expected:**
- Claim form opens with session data
- Patient, provider, CPT auto-filled
**Code References:**
- `src/components/billing/ClaimsManagement.jsx`

### billing-3: Claim Form - Required Fields
**Description:** Claim form has all required fields
**Steps:**
1. Open claim creation
2. Verify all required fields visible
**Expected:**
- Patient info, insurance, service date
- CPT code, diagnosis, charge amount
- Provider info, facility info
**Code References:**
- `src/components/billing/ClaimForm.jsx`

### billing-4: CMS 1500 Preview
**Description:** CMS 1500 form can be previewed
**Steps:**
1. Create or view claim
2. Click "Preview CMS 1500"
**Expected:**
- CMS 1500 form displays
- All boxes populated correctly
**Code References:**
- `src/components/billing/CMS1500Preview.jsx`

### billing-5: Generate EDI 837
**Description:** EDI 837 file can be generated
**Steps:**
1. Select claim(s)
2. Click "Generate 837" or "Create Batch"
**Expected:**
- 837 file generated
- File downloadable or sent to clearinghouse
**Code References:**
- `server/services/edi837Generator.js`

### billing-6: Submit to Clearinghouse
**Description:** Claims can be submitted to clearinghouse
**Steps:**
1. Select claim(s)
2. Click "Submit" or "Send to Clearinghouse"
**Expected:**
- Claim submitted via SFTP
- Status updates to "Submitted"
**Code References:**
- `server/services/officeAllyService.js`

### billing-7: Claim Status Tracking
**Description:** Claim status can be tracked
**Steps:**
1. View claim details
2. Check status history
**Expected:**
- Current status displayed
- Status history available
- Updates from 277CA shown
**Code References:**
- `src/components/billing/ClaimsManagement.jsx`

### billing-8: View 999 Acknowledgments
**Description:** EDI 999 responses can be viewed
**Steps:**
1. Navigate to EDI reports
2. View 999 acknowledgments
**Expected:**
- 999 files listed
- Acceptance/rejection shown
**Code References:**
- `src/components/admin/EDIReports.jsx`

### billing-9: View 277CA Status
**Description:** 277CA status updates viewable
**Steps:**
1. Navigate to EDI reports
2. View 277CA reports
**Expected:**
- Claim status updates shown
- Linked to original claims
**Code References:**
- `src/components/admin/EDIReports.jsx`

### billing-10: Process ERA (835)
**Description:** ERA/835 remittance can be processed
**Steps:**
1. Navigate to ERA processing
2. Upload or view 835 file
**Expected:**
- Payment info extracted
- Payments matched to claims
**Code References:**
- `server/services/edi835Parser.js`

### billing-11: Rejected Claim Handling
**Description:** Rejected claims can be corrected
**Steps:**
1. Find rejected claim
2. View rejection reason
3. Correct and resubmit
**Expected:**
- Rejection reason displayed
- Claim can be edited
- Resubmission works
**Code References:**
- `src/components/admin/edi/EDIRejectedClaimsTab.jsx`

### billing-12: Claim Search and Filter
**Description:** Claims can be searched and filtered
**Steps:**
1. Enter search term or select filter
2. View filtered results
**Expected:**
- Filter by status, date, patient
- Search by claim ID or patient
**Code References:**
- `src/components/billing/ClaimsManagement.jsx`

---

## Acceptance Criteria

- [ ] Claims can be created from sessions
- [ ] All CMS 1500 fields populated correctly
- [ ] EDI 837 generates valid files
- [ ] Claims submit to clearinghouse
- [ ] Status updates are tracked
- [ ] 999 acknowledgments viewable
- [ ] 277CA status updates applied
- [ ] ERA/835 payments processed
- [ ] Rejected claims can be corrected

---

## EDI Transaction Types

| Transaction | Direction | Purpose |
|-------------|-----------|---------|
| 837P | Outbound | Professional claim |
| 999 | Inbound | Acknowledgment |
| 277CA | Inbound | Claim status |
| 835 | Inbound | Payment/ERA |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/claims | GET | List claims |
| /api/claims | POST | Create claim |
| /api/claims/:id | GET | Get claim |
| /api/claims/:id | PUT | Update claim |
| /api/claims/:id/submit | POST | Submit claim |
| /api/claims/generate-837 | POST | Generate EDI |
| /api/edi/process-999 | POST | Process 999 |
| /api/edi/process-277ca | POST | Process 277CA |
| /api/edi/process-835 | POST | Process 835 |
