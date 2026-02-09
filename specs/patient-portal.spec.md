# TF Spec: Patient Portal

## Feature ID: patient-portal
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Patient-facing portal for registration, form completion, messaging, and appointment viewing.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Patient portal enabled
- [ ] Test patient account exists
- [ ] Intake forms configured

---

## Checkpoints

### patient-portal-1: Portal Login Page
**Description:** Portal login page displays
**Steps:**
1. Navigate to /patient-portal
2. View login form
**Expected:**
- Email/password fields visible
- Login button visible
- Registration link visible
**Code References:**
- `src/components/patient/PatientPortalLogin.jsx`

### patient-portal-2: Patient Registration
**Description:** New patient can register
**Steps:**
1. Click "Register" or "Create Account"
2. Enter email, password
3. Enter name and DOB
4. Submit
**Expected:**
- Account created
- Verification email sent (if configured)
**Code References:**
- `src/components/patient/PatientRegistration.jsx`

### patient-portal-3: Patient Login
**Description:** Patient can login
**Steps:**
1. Enter valid credentials
2. Click login
**Expected:**
- Redirected to portal dashboard
- Patient name displayed
**Code References:**
- `src/components/patient/PatientPortalLogin.jsx`
- `server/routes/patientPortal.js`

### patient-portal-4: Portal Dashboard
**Description:** Portal dashboard displays
**Steps:**
1. Login as patient
2. View dashboard
**Expected:**
- Welcome message
- Navigation to forms, messages, appointments
**Code References:**
- `src/components/patient/PatientPortalDashboard.jsx`

### patient-portal-5: View Intake Forms
**Description:** Intake forms accessible
**Steps:**
1. Navigate to Forms section
2. View available forms
**Expected:**
- Pending forms listed
- Completed forms shown separately
**Code References:**
- `src/components/patient/PatientForms.jsx`

### patient-portal-6: Complete Intake Form
**Description:** Patient can complete intake form
**Steps:**
1. Select pending form
2. Fill all sections
3. Submit
**Expected:**
- Form saved
- Status updates to complete
- Practice notified
**Code References:**
- `src/components/patient/IntakeFormWizard.jsx`

### patient-portal-7: View Appointments
**Description:** Patient can view appointments
**Steps:**
1. Navigate to Appointments
2. View scheduled appointments
**Expected:**
- Upcoming appointments shown
- Date, time, provider visible
**Code References:**
- `src/components/patient/PatientAppointments.jsx`

### patient-portal-8: Send Message
**Description:** Patient can message provider
**Steps:**
1. Navigate to Messages
2. Compose new message
3. Send
**Expected:**
- Message sent
- Appears in inbox
**Code References:**
- `src/components/patient/PatientMessages.jsx`

### patient-portal-9: View Messages
**Description:** Patient can view messages
**Steps:**
1. Navigate to Messages
2. View inbox
**Expected:**
- Received messages shown
- Can read full message
**Code References:**
- `src/components/patient/PatientMessages.jsx`

### patient-portal-10: Update Profile
**Description:** Patient can update profile
**Steps:**
1. Navigate to Profile
2. Update phone/email
3. Save
**Expected:**
- Changes saved
- Confirmation shown
**Code References:**
- `src/components/patient/PatientProfile.jsx`

### patient-portal-11: Submit Insurance
**Description:** Patient can submit insurance info
**Steps:**
1. Navigate to Insurance
2. Enter policy details
3. Upload card images (optional)
4. Submit
**Expected:**
- Insurance saved
- Pending verification
**Code References:**
- `src/components/patient/PatientInsurance.jsx`

### patient-portal-12: Request Prescription Update
**Description:** Patient can request prescription
**Steps:**
1. Navigate to Prescriptions
2. Click "Request Update"
3. Enter details
4. Submit
**Expected:**
- Request sent to provider
- Pending approval
**Code References:**
- `src/components/patient/PrescriptionUpdate.jsx`

---

## Acceptance Criteria

- [ ] Portal login works
- [ ] Patient registration works
- [ ] Dashboard displays correctly
- [ ] Intake forms can be completed
- [ ] Appointments are viewable
- [ ] Messaging works
- [ ] Profile can be updated
- [ ] Insurance can be submitted

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/patient-portal/login | POST | Patient login |
| /api/patient-portal/register | POST | Registration |
| /api/patient-portal/profile | GET | Get profile |
| /api/patient-portal/profile | PUT | Update profile |
| /api/patient-portal/forms | GET | List forms |
| /api/patient-portal/forms/:id | POST | Submit form |
| /api/patient-portal/messages | GET | List messages |
| /api/patient-portal/messages | POST | Send message |
| /api/patient-portal/appointments | GET | List appointments |
| /api/patient-portal/insurance | POST | Submit insurance |
