# TF Spec: Scheduling / Appointments

## Feature ID: appointments
## Version: 1.1
## Last Updated: 2026-01-30

---

## Overview

Appointment scheduling system implemented as part of the Front Desk operations. Includes daily schedule viewing, patient check-in, and waiting room management. **Note:** Create/reschedule/cancel UI not yet built (API exists).

---

## Implementation Status

| Feature | API | UI | Status |
|---------|-----|-----|--------|
| View daily schedule | ✅ | ✅ | **COMPLETE** |
| Filter by date | ✅ | ✅ | **COMPLETE** |
| Patient check-in | ✅ | ✅ | **COMPLETE** |
| Waiting room view | ✅ | ✅ | **COMPLETE** |
| Create appointment | ✅ | ✅ | **COMPLETE** |
| Reschedule appointment | ✅ | ✅ | **COMPLETE** |
| Cancel appointment | ✅ | ✅ | **COMPLETE** |
| Check availability | ✅ | ✅ | **COMPLETE** |
| Recurring appointments | ✅ | ✅ | **COMPLETE** |

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Front Desk user logged in
- [ ] Providers configured in system
- [ ] Patients exist with appointments

---

## Checkpoints - IMPLEMENTED FEATURES

### appointments-1: Schedule View ✅
**Description:** Daily schedule view displays in Front Desk Dashboard
**Steps:**
1. Login as Front Desk user
2. Click "Front Desk" portal
3. View "Today's Schedule" tab (default)
**Expected:**
- Schedule tab shows list of appointments
- Each appointment shows: time, patient name, provider, type, duration, status
- "Check In" button visible for scheduled/confirmed appointments
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx` (lines 209-301)
- `server/routes/frontDesk.js` - daily-schedule endpoint

### appointments-2: Date Navigation ✅
**Description:** Can view schedules for different dates
**Steps:**
1. View schedule
2. Click date picker
3. Select different date
**Expected:**
- Schedule updates to show selected date
- Header shows formatted date
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx` (lines 221-226)

### appointments-3: Patient Check-In ✅
**Description:** Front desk can check in patients
**Steps:**
1. View schedule with appointments
2. Find patient with "scheduled" or "confirmed" status
3. Click "Check In" button
**Expected:**
- Confirmation message shown
- Patient moves to waiting room
- Status updates to "checked_in"
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx` (handleCheckIn, lines 50-68)
- `server/routes/frontDesk.js` - check-in endpoint

### appointments-4: Waiting Room View ✅
**Description:** Waiting room shows checked-in patients
**Steps:**
1. Click "Waiting Room" tab
2. View checked-in patients
**Expected:**
- Shows patients currently checked in
- Displays: name, provider, appointment time, check-in time
- Auto-refreshes every 30 seconds
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx` (lines 303-351)
- `server/routes/frontDesk.js` - waiting-room endpoint

### appointments-5: Summary Cards ✅
**Description:** Dashboard shows appointment counts
**Steps:**
1. View Front Desk Dashboard
**Expected:**
- "Today's Appointments" card shows count
- "In Waiting Room" card shows count
- "Pending Intake" card shows count
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx` (lines 108-150)

---

## Checkpoints - NOT YET IMPLEMENTED (API ONLY)

### appointments-6: Create Appointment ❌ UI MISSING
**Description:** Create new appointment via UI
**Steps:**
1. Click "New Appointment" button
2. Select patient
3. Select provider
4. Set date and time
5. Save
**Expected:**
- Form opens for appointment creation
- Appointment created and appears on schedule
**Status:** API exists (`POST /api/appointments`) but no UI form
**Code References:**
- `server/routes/appointments.js` (lines 25-91) - API only

### appointments-7: Reschedule Appointment ❌ UI MISSING
**Description:** Reschedule existing appointment
**Steps:**
1. Click on appointment
2. Click "Reschedule"
3. Select new date/time
4. Confirm
**Expected:**
- Conflict check performed
- Appointment moved to new time
**Status:** API exists (`PUT /api/appointments/:id`) but no UI
**Code References:**
- `server/routes/appointments.js` (lines 195-254) - API only

### appointments-8: Cancel Appointment ❌ UI MISSING
**Description:** Cancel appointment with reason
**Steps:**
1. Click on appointment
2. Click "Cancel"
3. Enter reason
4. Confirm
**Expected:**
- Appointment cancelled
- Slot freed
**Status:** API exists (`DELETE /api/appointments/:id`) but no UI
**Code References:**
- `server/routes/appointments.js` (lines 259-288) - API only

### appointments-9: Conflict Detection ❌ UI MISSING
**Description:** System prevents double-booking
**Steps:**
1. Try to book overlapping appointment
**Expected:**
- Warning shown
- Cannot save conflicting appointment
**Status:** API has conflict detection but no UI to trigger it
**Code References:**
- `server/routes/appointments.js` (lines 42-52) - conflict check in API

### appointments-10: Provider Availability ❌ UI MISSING
**Description:** View available time slots
**Steps:**
1. Select provider
2. Select date
3. View available slots
**Expected:**
- Shows available time slots
**Status:** API exists (`GET /provider/:id/availability`) but no UI
**Code References:**
- `server/routes/appointments.js` (lines 332-352) - API only

### appointments-11: Recurring Appointments ✅
**Description:** Create recurring appointment series
**Steps:**
1. Open New Appointment form
2. Check "Make this a recurring appointment"
3. Select recurrence pattern (Daily, Weekly, Biweekly, Monthly)
4. Select end date
5. Optionally check "Skip weekends"
6. Fill other fields and save
**Expected:**
- Multiple appointments created for the series
- Success message shows count of appointments created
- All appointments linked by series_id
- Cancel modal shows options for single/series cancellation
**Code References:**
- `src/components/frontdesk/AppointmentForm.jsx` (recurrence UI)
- `src/components/frontdesk/CancelAppointmentModal.jsx` (series cancellation)
- `server/routes/appointments.js` (API with generate_recurring_appointments)
- `server/migrations/1738300000000_add_recurring_appointments.sql` (schema)

---

## Acceptance Criteria

### Implemented ✅
- [x] Daily schedule displays correctly in Front Desk Dashboard
- [x] Date navigation works
- [x] Check-in workflow functional
- [x] Waiting room shows checked-in patients
- [x] Auto-refresh every 30 seconds

### Also Implemented ✅
- [x] Appointments can be created via UI
- [x] Appointments can be rescheduled via UI
- [x] Appointments can be cancelled via UI
- [x] Conflicts detected and shown in UI
- [x] Recurring appointments (daily, weekly, biweekly, monthly)
- [x] Series cancellation (single, this+future, all)

---

## Data Model

### appointments table
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| patient_id | int | ✅ | FK to patients |
| provider_id | int | ✅ | FK to providers |
| practice_id | int | ✅ | FK to practices |
| appointment_date | date | ✅ | |
| appointment_time | time | ✅ | |
| duration_minutes | int | ✅ | Default 50 |
| appointment_type | string | ✅ | initial, follow-up, etc. |
| status | string | ✅ | scheduled/confirmed/checked_in/completed/cancelled/no_show |
| cancellation_reason | string | ❌ | If cancelled |

---

## API Endpoints

| Endpoint | Method | Description | Has UI? |
|----------|--------|-------------|---------|
| /api/front-desk/daily-schedule | GET | Get day's appointments | ✅ |
| /api/front-desk/waiting-room | GET | Get checked-in patients | ✅ |
| /api/front-desk/check-in/:id | POST | Check in patient | ✅ |
| /api/appointments | GET | List appointments | ❌ |
| /api/appointments | POST | Create appointment | ❌ |
| /api/appointments/:id | PUT | Update/reschedule | ❌ |
| /api/appointments/:id | DELETE | Cancel appointment | ❌ |
| /api/appointments/provider/:id/availability | GET | Check availability | ❌ |

---

## Recommendation

To complete the appointment scheduling feature, build these UI components:

1. **AppointmentForm.jsx** - Modal/form for creating/editing appointments
   - Patient selector
   - Provider selector
   - Date/time picker
   - Duration selector
   - Appointment type dropdown
   - Conflict warning display

2. **Add to FrontDeskDashboard.jsx:**
   - "New Appointment" button in schedule tab
   - Edit/Reschedule button on each appointment
   - Cancel button with reason dialog

These components would use the existing API endpoints that are already fully functional.
