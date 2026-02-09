# TF Spec: Intake Forms

## Feature ID: intake-forms
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Patient intake form management including form creation, submission, queue processing, and completion tracking.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin or Front Desk user logged in
- [ ] Intake form templates configured

---

## Checkpoints

### intake-forms-1: Forms Management View
**Description:** Forms management accessible
**Steps:**
1. Login as admin
2. Navigate to Forms Management
**Expected:**
- Forms list displayed
- Shows submission status
**Code References:**
- `src/components/admin/FormsManagement.jsx`

### intake-forms-2: Forms Summary Cards
**Description:** Summary statistics displayed
**Steps:**
1. View forms management
2. Check summary cards
**Expected:**
- Total forms count
- Completed count
- Pending count
**Code References:**
- `src/components/admin/forms/FormsSummaryCards.jsx`

### intake-forms-3: Filter Forms by Status
**Description:** Forms can be filtered
**Steps:**
1. View forms list
2. Select status filter
**Expected:**
- Filters by pending/completed/expired
**Code References:**
- `src/components/admin/FormsManagement.jsx`

### intake-forms-4: View Form Details
**Description:** Form submission details viewable
**Steps:**
1. Click on form entry
2. View full details
**Expected:**
- Patient info shown
- Form responses visible
- Timestamps displayed
**Code References:**
- `src/components/admin/forms/FormDetailsModal.jsx`

### intake-forms-5: Intake Queue Display
**Description:** Intake queue shows pending patients
**Steps:**
1. Navigate to intake queue
2. View pending list
**Expected:**
- Patients with pending forms shown
- Shows registration status
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### intake-forms-6: Process Intake
**Description:** Intake can be processed
**Steps:**
1. Select patient from queue
2. Click Process
3. Review information
4. Mark complete
**Expected:**
- Intake reviewed
- Status updated
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### intake-forms-7: Patient Registration Link
**Description:** Registration link works
**Steps:**
1. Create temporary patient with email
2. Patient receives link
3. Click link
**Expected:**
- Registration form opens
- Patient info pre-filled
**Code References:**
- `server/routes/patients.js:create-temporary`

### intake-forms-8: Intake Form Completion
**Description:** Patient can complete intake
**Steps:**
1. Open registration link
2. Fill personal info
3. Fill insurance info
4. Upload documents
5. Submit
**Expected:**
- Form saved
- Patient record updated
- Practice notified
**Code References:**
- `src/components/patient/IntakeFormWizard.jsx`

### intake-forms-9: Insurance Card Upload
**Description:** Insurance cards can be uploaded
**Steps:**
1. During intake
2. Upload front card image
3. Upload back card image
**Expected:**
- Images saved
- Attached to patient record
**Code References:**
- `src/components/patient/IntakeFormWizard.jsx`

### intake-forms-10: Signature Capture
**Description:** Digital signature can be captured
**Steps:**
1. During intake
2. Sign consent forms
3. Submit
**Expected:**
- Signature saved
- Timestamp recorded
**Code References:**
- `src/components/patient/IntakeFormWizard.jsx`

### intake-forms-11: Mark Intake Complete
**Description:** Admin can mark intake complete
**Steps:**
1. View completed form
2. Click "Mark Complete"
**Expected:**
- Status changes
- Patient marked as registered
**Code References:**
- `src/components/admin/FormsManagement.jsx`

---

## Acceptance Criteria

- [ ] Forms management displays correctly
- [ ] Summary cards show accurate counts
- [ ] Filtering works
- [ ] Form details viewable
- [ ] Intake queue accessible
- [ ] Registration link works
- [ ] Patients can complete forms
- [ ] Document upload works
- [ ] Signature capture works
- [ ] Intake can be marked complete

---

## Form Workflow States

| State | Description | Next Action |
|-------|-------------|-------------|
| pending | Link sent | Patient completes |
| in_progress | Partially filled | Patient continues |
| submitted | Patient submitted | Staff reviews |
| complete | Processed | - |
| expired | Link expired | Resend link |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/forms | GET | List forms |
| /api/forms/:id | GET | Get form details |
| /api/forms/:id/complete | POST | Mark complete |
| /api/intake/queue | GET | Intake queue |
| /api/intake/:id/process | POST | Process intake |
| /api/patient-registration | GET | Get registration form |
| /api/patient-registration | POST | Submit registration |
