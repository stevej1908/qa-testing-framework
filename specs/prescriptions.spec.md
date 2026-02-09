# TF Spec: Prescriptions & RTM

## Feature ID: prescriptions
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Prescription management including RTM (Remote Therapeutic Monitoring) device authorization, approval workflow, and billing integration.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Provider user logged in
- [ ] Patients exist with appropriate diagnoses
- [ ] RTM device types configured

---

## Checkpoints

### prescriptions-1: Prescription Queue View
**Description:** Provider can view prescription requests
**Steps:**
1. Login as provider
2. Navigate to prescriptions
**Expected:**
- Prescription list/queue visible
- Shows patient, type, status
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`

### prescriptions-2: View Pending Requests
**Description:** Pending RTM requests are visible
**Steps:**
1. View prescription queue
2. Filter by pending status
**Expected:**
- Pending requests shown
- Patient details visible
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`

### prescriptions-3: Review Request Details
**Description:** Request details can be reviewed
**Steps:**
1. Click on pending request
2. View full details
**Expected:**
- Patient information shown
- Device type visible
- Clinical justification shown
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`

### prescriptions-4: Approve Request
**Description:** Provider can approve request
**Steps:**
1. View pending request
2. Add approval notes
3. Click Approve
**Expected:**
- Request status changes to Approved
- Patient notified (if applicable)
- Ready for device issuance
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`
- `server/routes/prescriptions.js`

### prescriptions-5: Deny Request
**Description:** Provider can deny request with reason
**Steps:**
1. View pending request
2. Enter denial reason
3. Click Deny
**Expected:**
- Request status changes to Denied
- Reason recorded
- Patient notified
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`

### prescriptions-6: Create RTM Authorization
**Description:** New RTM authorization can be created
**Steps:**
1. Click "New RTM Authorization"
2. Select patient
3. Select device type
4. Enter clinical notes
5. Submit
**Expected:**
- Authorization created
- Pending provider approval
**Code References:**
- `src/components/provider/PatientPrescriptionRequests.jsx`

### prescriptions-7: Device Assignment
**Description:** Device can be assigned to patient
**Steps:**
1. View approved authorization
2. Enter device serial/IMEI
3. Confirm assignment
**Expected:**
- Device linked to patient
- Tracking begins
**Code References:**
- `server/routes/prescriptions.js`

### prescriptions-8: RTM Billing Integration
**Description:** RTM services generate billable entries
**Steps:**
1. Patient submits RTM data
2. System tracks transmission days
3. View billable services
**Expected:**
- 16+ days generates billing code
- CPT codes: 98975, 98976, 98977, 98980, 98981
**Code References:**
- `server/routes/rtmBilling.js`

### prescriptions-9: Transmission Day Tracking
**Description:** Transmission days are tracked
**Steps:**
1. View patient RTM status
2. Check transmission count
**Expected:**
- Shows days in current period
- Alerts for billing threshold
**Code References:**
- `server/services/rtmTrackingService.js`

### prescriptions-10: Patient Portal Request
**Description:** Patient can request prescription update
**Steps:**
1. Login to patient portal
2. Submit prescription request
**Expected:**
- Request created
- Provider notified
**Code References:**
- `src/components/patient/PrescriptionUpdate.jsx`

---

## Acceptance Criteria

- [ ] Prescription queue displays correctly
- [ ] Pending requests can be reviewed
- [ ] Requests can be approved with notes
- [ ] Requests can be denied with reason
- [ ] New RTM authorizations can be created
- [ ] Devices can be assigned
- [ ] Transmission days are tracked
- [ ] Billing integration works correctly

---

## RTM Billing Codes

| CPT Code | Description | Requirement |
|----------|-------------|-------------|
| 98975 | RTM initial setup | Once per episode |
| 98976 | RTM device supply | Monthly |
| 98977 | RTM data transmission | 16+ days/month |
| 98980 | RTM treatment management | 20 min/month |
| 98981 | RTM treatment management | Each additional 20 min |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/prescriptions | GET | List prescriptions |
| /api/prescriptions | POST | Create prescription |
| /api/prescriptions/:id | GET | Get prescription |
| /api/prescriptions/:id/approve | POST | Approve |
| /api/prescriptions/:id/deny | POST | Deny |
| /api/rtm/authorize | POST | RTM authorization |
| /api/rtm/transmission-days | GET | Get transmission count |
