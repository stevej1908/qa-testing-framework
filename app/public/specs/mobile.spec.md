# TF Spec: Mobile Support

## Feature ID: mobile
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Mobile app API support for patient mood tracking, RTM data submission, and mobile authentication.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with mobile API enabled
- [ ] Mobile test account exists
- [ ] RTM device configured (for RTM tests)

---

## Checkpoints

### mobile-1: Mobile Login API
**Description:** Mobile login endpoint works
**Steps:**
1. POST to /api/mobile/login
2. Send email and password
3. Include device info
**Expected:**
- Returns auth token
- Returns user info
**Code References:**
- `server/routes/mobile.js:login`

### mobile-2: Device Registration
**Description:** Device can be registered
**Steps:**
1. Login via mobile
2. Send device IMEI/identifier
**Expected:**
- Device linked to patient
- Returns confirmation
**Code References:**
- `server/routes/mobile.js:register-device`

### mobile-3: Mood Tracking Submit
**Description:** Mood data can be submitted
**Steps:**
1. Authenticate mobile
2. POST mood entry
3. Include mood level, notes, timestamp
**Expected:**
- Entry saved
- Returns success
**Code References:**
- `server/routes/mobile.js:mood-entry`

### mobile-4: Mood History Retrieval
**Description:** Mood history can be retrieved
**Steps:**
1. Authenticate mobile
2. GET mood history
**Expected:**
- Returns mood entries
- Sorted by date
**Code References:**
- `server/routes/mobile.js:mood-history`

### mobile-5: RTM Data Submission
**Description:** RTM readings can be submitted
**Steps:**
1. Authenticate mobile
2. POST RTM data
3. Include device ID, reading, timestamp
**Expected:**
- Data saved
- Transmission day counted
**Code References:**
- `server/routes/mobile.js:rtm-data`

### mobile-6: RTM Device Validation
**Description:** RTM device is validated
**Steps:**
1. Submit RTM data with device ID
2. System validates device assignment
**Expected:**
- Valid device: accepted
- Invalid device: rejected with error
**Code References:**
- `server/routes/mobile.js:rtm-data`

### mobile-7: Patient Info Retrieval
**Description:** Patient info accessible via mobile
**Steps:**
1. Authenticate mobile
2. GET patient profile
**Expected:**
- Returns patient name, DOB
- Returns upcoming appointments
**Code References:**
- `server/routes/mobile.js:profile`

### mobile-8: Appointment List
**Description:** Appointments viewable via mobile
**Steps:**
1. Authenticate mobile
2. GET appointments
**Expected:**
- Returns scheduled appointments
- Includes date, time, provider
**Code References:**
- `server/routes/mobile.js:appointments`

### mobile-9: Token Refresh
**Description:** Auth token can be refreshed
**Steps:**
1. Have valid token
2. POST to refresh endpoint
**Expected:**
- New token returned
- Old token invalidated
**Code References:**
- `server/routes/mobile.js:refresh-token`

### mobile-10: Mobile Logout
**Description:** Mobile logout works
**Steps:**
1. POST to logout
2. Include device info
**Expected:**
- Session ended
- Device session cleared
**Code References:**
- `server/routes/mobile.js:logout`

---

## Acceptance Criteria

- [ ] Mobile login works
- [ ] Device can be registered
- [ ] Mood tracking works
- [ ] RTM data submission works
- [ ] Patient info accessible
- [ ] Token refresh works
- [ ] Logout works

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/mobile/login | POST | Mobile login |
| /api/mobile/logout | POST | Mobile logout |
| /api/mobile/register-device | POST | Register device |
| /api/mobile/mood-entry | POST | Submit mood |
| /api/mobile/mood-history | GET | Get mood history |
| /api/mobile/rtm-data | POST | Submit RTM data |
| /api/mobile/profile | GET | Get patient profile |
| /api/mobile/appointments | GET | Get appointments |
| /api/mobile/refresh-token | POST | Refresh token |

---

## Mobile Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | ✅ | Bearer token |
| X-Device-ID | ✅ | Device identifier |
| X-Device-Type | ❌ | iOS/Android |
| X-App-Version | ❌ | App version |
