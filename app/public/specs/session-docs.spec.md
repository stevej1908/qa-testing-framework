# TF Spec: Session Documentation

## Feature ID: session-docs
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Clinical session documentation including service entry, clinical notes (SOAP/DAP/BIRP), and session completion.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Provider user logged in
- [ ] At least one active patient exists
- [ ] CPT codes and diagnosis codes configured

---

## Checkpoints

### session-docs-1: Start New Session
**Description:** Provider can start a new session
**Steps:**
1. Login as provider
2. Click "New Session" or "Start Session"
**Expected:**
- Session entry form opens
- Patient selection available
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-2: Select Patient
**Description:** Provider selects patient for session
**Steps:**
1. Open session entry
2. Select patient from dropdown
**Expected:**
- Patient name displayed
- Patient details accessible
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-3: Select Service Date
**Description:** Service date can be set
**Steps:**
1. Open session entry
2. Select or enter service date
**Expected:**
- Date picker works
- Date validation (not future)
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-4: Select CPT Code
**Description:** Provider selects CPT code(s)
**Steps:**
1. Open session entry
2. Select CPT code from list
**Expected:**
- CPT codes displayed with descriptions
- 90837, 90834, etc. available
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-5: Enter Diagnosis Codes
**Description:** Provider enters diagnosis codes
**Steps:**
1. Open session entry
2. Enter/select diagnosis code(s)
**Expected:**
- ICD-10 codes searchable
- Multiple codes allowed
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-6: SOAP Notes Entry
**Description:** Provider can enter SOAP format notes
**Steps:**
1. Open session entry
2. Select SOAP format
3. Enter Subjective, Objective, Assessment, Plan
**Expected:**
- Four text areas visible
- Notes saved with session
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-7: DAP Notes Entry
**Description:** Provider can enter DAP format notes
**Steps:**
1. Open session entry
2. Select DAP format
3. Enter Data, Assessment, Plan
**Expected:**
- Three text areas visible
- Notes saved with session
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-8: BIRP Notes Entry
**Description:** Provider can enter BIRP format notes
**Steps:**
1. Open session entry
2. Select BIRP format
3. Enter Behavior, Intervention, Response, Plan
**Expected:**
- Four text areas visible
- Notes saved with session
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-9: Session Duration
**Description:** Session time is tracked
**Steps:**
1. Create session
2. Set start and end time
**Expected:**
- Duration calculated
- Duration matches CPT code requirements
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-10: Save Session
**Description:** Session can be saved
**Steps:**
1. Fill all required fields
2. Click Save
**Expected:**
- Session saved to database
- Success message shown
- Available for billing
**Code References:**
- `src/components/provider/ServiceEntry.jsx`
- `server/routes/services.js`

### session-docs-11: Complete/Lock Session
**Description:** Session can be completed and locked
**Steps:**
1. Open saved session
2. Click Complete/Lock
**Expected:**
- Session marked as complete
- Cannot be edited without unlock
- Ready for claim generation
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### session-docs-12: View Session History
**Description:** Provider can view past sessions
**Steps:**
1. Navigate to session history
2. Filter by patient/date
**Expected:**
- Past sessions listed
- Can view details
**Code References:**
- `src/components/provider/ProviderDashboard.jsx`

---

## Acceptance Criteria

- [ ] Sessions can be created with all required fields
- [ ] Multiple note formats supported (SOAP, DAP, BIRP)
- [ ] CPT codes properly linked to sessions
- [ ] Diagnosis codes properly linked
- [ ] Sessions can be saved and edited
- [ ] Completed sessions are locked
- [ ] Session history is viewable

---

## Data Model

### Session Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| patientId | int | ✅ | Valid patient reference |
| providerId | int | ✅ | Valid provider reference |
| serviceDate | date | ✅ | Not future |
| startTime | time | ✅ | Valid time |
| endTime | time | ✅ | After start time |
| cptCode | string | ✅ | Valid CPT code |
| diagnosisCodes | array | ✅ | At least one |
| noteFormat | string | ✅ | SOAP/DAP/BIRP |
| notes | object | ✅ | Format-specific fields |
| status | string | ✅ | draft/complete/billed |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/services | GET | List services |
| /api/services | POST | Create service |
| /api/services/:id | GET | Get service |
| /api/services/:id | PUT | Update service |
| /api/services/:id/complete | POST | Complete session |
