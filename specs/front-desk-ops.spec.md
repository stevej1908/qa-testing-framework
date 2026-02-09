# TF Spec: Front Desk Operations

## Feature ID: front-desk-ops
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Front desk operations including patient check-in, waiting room management, and intake queue processing.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Front desk user logged in
- [ ] Patients and appointments exist

---

## Checkpoints

### front-desk-1: Front Desk Dashboard
**Description:** Front desk dashboard displays correctly
**Steps:**
1. Login as front desk user
2. Verify dashboard loads
**Expected:**
- Dashboard shows summary cards
- Navigation tabs visible
- Today's date displayed
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-2: Daily Schedule View
**Description:** Daily schedule shows today's appointments
**Steps:**
1. View daily schedule tab
2. Check appointment list
**Expected:**
- Today's appointments listed
- Shows time, patient, provider
- Status indicators visible
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-3: Waiting Room View
**Description:** Waiting room shows checked-in patients
**Steps:**
1. Navigate to waiting room tab
2. View patient list
**Expected:**
- Checked-in patients displayed
- Wait time shown
- Ready button visible
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-4: Intake Queue View
**Description:** Intake queue shows pending intakes
**Steps:**
1. Navigate to intake queue tab
2. View pending patients
**Expected:**
- Patients with pending forms shown
- Registration status visible
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-5: Check-In Patient
**Description:** Patient can be checked in
**Steps:**
1. Find patient in schedule
2. Click "Check In" button
**Expected:**
- Patient status changes to "Checked In"
- Patient moves to waiting room
- Check-in time recorded
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-6: Mark Patient Ready
**Description:** Patient can be marked ready for provider
**Steps:**
1. View waiting room
2. Click "Ready" for patient
**Expected:**
- Patient marked as ready
- Provider notified (if applicable)
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-7: Process Intake
**Description:** Intake form can be processed
**Steps:**
1. Select patient from intake queue
2. Click "Process" or "View Intake"
**Expected:**
- Intake form opens
- Patient information visible
- Can mark as complete
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-8: Summary Cards
**Description:** Summary cards show daily metrics
**Steps:**
1. View dashboard
2. Check summary cards
**Expected:**
- Total appointments today
- Checked in count
- Waiting count
- Completed count
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-9: Filter by Status
**Description:** Schedule can be filtered by status
**Steps:**
1. View daily schedule
2. Apply status filter
**Expected:**
- Filters by scheduled/checked-in/completed
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### front-desk-10: Add Walk-In Patient
**Description:** Walk-in patient can be added
**Steps:**
1. Click "Add Patient" or "Walk-In"
2. Enter patient information
**Expected:**
- Add patient form opens
- Patient added to queue
**Code References:**
- `src/components/admin/AddPatientForm.jsx`

---

## Acceptance Criteria

- [ ] Dashboard displays correctly for front desk role
- [ ] Daily schedule shows today's appointments
- [ ] Patients can be checked in
- [ ] Waiting room displays checked-in patients
- [ ] Intake queue shows pending intakes
- [ ] Summary metrics are accurate
- [ ] Status filters work correctly

---

## Workflow States

| State | Description | Actions |
|-------|-------------|---------|
| Scheduled | Appointment booked | Check In |
| Checked In | Patient arrived | Mark Ready |
| Ready | Waiting for provider | Start Session |
| In Session | With provider | Complete |
| Completed | Session finished | Checkout |
| No Show | Did not arrive | Reschedule |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/appointments/today | GET | Today's appointments |
| /api/appointments/:id/check-in | POST | Check in patient |
| /api/appointments/:id/ready | POST | Mark ready |
| /api/intake/queue | GET | Intake queue |
| /api/intake/:id/process | POST | Process intake |
