# TF Spec: Front Desk Patient Intake

## Feature ID: front-desk-intake
## Version: 1.0
## Last Updated: 2026-02-07

---

## Overview

Complete workflow for front desk staff handling new patient phone calls. This flow enables quick patient onboarding with provisional appointment scheduling, automated eligibility verification, and patient self-service registration completion.

**Primary User:** Front Desk Staff
**Trigger:** New patient calls to schedule an appointment

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Front Desk user logged in
- [ ] Payer eligibility API configured and accessible
- [ ] Email service configured
- [ ] SMS service configured (for patient communications)
- [ ] At least one provider with availability

### Test Data
- [ ] Test insurance with known eligibility response
- [ ] Test insurance for OON scenario
- [ ] Test provider with open schedule slots

---

## Workflow Phases

### Phase 1: Initial Call & Data Collection
Front desk receives call from new patient wanting to schedule.

### Phase 2: Eligibility Verification
Real-time automated check against payer API.

### Phase 3: Out-of-Network Handling (Conditional)
If patient is OON, calculate estimate and collect payment authorization.

### Phase 4: Provisional Appointment
Create soft hold on appointment slot.

### Phase 5: Registration Email
Send patient link to complete registration with required forms.

### Phase 6: Patient Self-Service
Patient completes registration at their convenience (progress saved).

### Phase 7: Monitoring & Reminders
Automated reminder sequence with escalation.

### Phase 8: Discrepancy Resolution
Handle data conflicts between front desk and patient entries.

### Phase 9: Confirmation or Cancellation
Convert provisional to confirmed, or auto-cancel if incomplete.

---

## Checkpoints

### front-desk-intake-1: Initial Patient Data Collection
**Description:** Front desk collects basic patient information during call
**Steps:**
1. Login as front desk
2. Click "New Patient Call" or equivalent quick-add
3. Enter patient first name, last name
4. Enter date of birth
5. Enter phone number
6. Enter email address
7. Enter insurance information (payer, member ID, group number)
**Expected:**
- All fields accept valid input
- Phone/email validation works
- Insurance payer dropdown populated
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`
- `src/components/frontdesk/QuickPatientIntake.jsx` (to be created)

### front-desk-intake-2: Real-Time Eligibility Check
**Description:** System automatically verifies insurance eligibility via payer API
**Steps:**
1. After entering insurance info, click "Verify Eligibility"
2. System queries payer API in real-time
3. Results display within 5-10 seconds
**Expected:**
- Loading indicator during API call
- Clear display of: coverage status, in-network/OON, effective dates
- If in-network: show covered benefits summary
- If OON: trigger OON workflow (checkpoint 3)
- If inactive/not found: show clear error with options
**Code References:**
- `src/services/eligibilityService.js`
- `server/routes/eligibility.js`
- `src/components/frontdesk/EligibilityResult.jsx` (to be created)

### front-desk-intake-3: Out-of-Network Estimate & Payment Auth
**Description:** Handle OON patients with cost estimate and credit card authorization
**Precondition:** Eligibility check returned OON status
**Steps:**
1. System displays OON benefits (deductible, coinsurance %, OON max)
2. System auto-calculates estimated patient responsibility
3. Display estimate WITH disclaimer ("actual may vary")
4. Front desk reads estimate to patient
5. If patient agrees: enter credit card for auth hold
6. System places authorization hold (not a charge)
7. Confirm auth successful before proceeding
**Expected:**
- Estimate calculation uses: visit fee schedule + OON benefits
- Disclaimer text clearly visible
- Credit card form is PCI-compliant
- Auth hold amount matches estimate
- System will auto-re-authorize if auth expires before appointment
**Business Rules:**
- Auth hold only, not stored card, not deposit
- If appointment > 30 days out, system auto-re-auths periodically
**Code References:**
- `src/components/frontdesk/OONEstimate.jsx` (to be created)
- `src/components/frontdesk/PaymentAuthForm.jsx` (to be created)
- `server/routes/payments.js`

### front-desk-intake-4: Provisional Appointment Scheduling
**Description:** Create soft hold on appointment time slot
**Steps:**
1. Select provider from available list
2. Select appointment type (determines duration and forms)
3. Select date/time from provider availability
4. Create provisional appointment hold
**Expected:**
- Only available slots shown
- Provisional hold prevents double-booking
- Appointment marked as "Provisional - Pending Registration"
- Hold persists until 3 days before appointment date
**Business Rules:**
- Provisional hold expires 3 days before appointment if registration incomplete
- Expired holds auto-release the time slot
**Code References:**
- `src/components/frontdesk/AppointmentScheduler.jsx`
- `server/routes/appointments.js`

### front-desk-intake-5: Send Registration Email
**Description:** Send patient email with link to complete registration
**Steps:**
1. Review collected information
2. Click "Send Registration Link"
3. System determines required forms based on:
   - Appointment type
   - Provider/practice configuration
   - Insurance requirements
4. Email sent with unique registration link
**Expected:**
- Email contains: practice name, appointment date/time, link, instructions
- Link is unique and secure (token-based)
- Forms list determined dynamically
- Confirmation shown to front desk
**Code References:**
- `src/hooks/useAddPatientForm.js:handleSaveAndEmailLink`
- `server/routes/patients.js:create-temporary`
- `server/services/emailService.js`
- `server/services/formSelectionService.js` (to be created)

### front-desk-intake-6: Patient Self-Service Registration
**Description:** Patient clicks email link and completes registration
**Actor:** Patient (not front desk)
**Steps:**
1. Patient clicks link in email
2. Registration portal opens with pre-filled data from front desk
3. Patient reviews/edits demographics
4. Patient completes additional required fields
5. Patient fills required intake forms
6. Patient submits registration
**Expected:**
- Pre-filled data from front desk call is editable
- Progress auto-saves - patient can close and resume later
- Required forms clearly indicated
- Progress indicator shows completion status
- Submit only enabled when all required items complete
**Business Rules:**
- Save progress enabled - patient can resume from same link
- Link remains valid until 3 days before appointment
**Code References:**
- `src/components/patient/PatientRegistrationPortal.jsx`
- `server/routes/patientPortal.js`

### front-desk-intake-7: Automated Reminder - Day 5
**Description:** System sends first reminder 5 days before appointment
**Trigger:** Automated job, 5 days before provisional appointment
**Precondition:** Patient has not completed registration
**Steps:**
1. System identifies incomplete registrations with appointments in 5 days
2. Send reminder via patient's preferred communication method
3. Log reminder sent
**Expected:**
- Reminder sent via: phone (automated call), email, or text based on preference
- Message includes: appointment date/time, link to complete registration
- Reminder logged in patient record
**Code References:**
- `server/jobs/registrationReminders.js` (to be created)
- `server/services/communicationService.js` (to be created)

### front-desk-intake-8: Automated Reminder - Day 3 (Final Warning)
**Description:** System sends final warning 3 days before appointment
**Trigger:** Automated job, 3 days before provisional appointment (2 days after first reminder)
**Precondition:** Patient still has not completed registration
**Steps:**
1. System identifies still-incomplete registrations
2. Send final warning via preferred communication method
3. Message clearly states: "Appointment will be cancelled at close of business if registration not completed"
4. Log warning sent
**Expected:**
- Escalated urgency in message tone
- Clear cancellation deadline stated
- Reminder logged in patient record
**Code References:**
- `server/jobs/registrationReminders.js`

### front-desk-intake-9: Discrepancy Detection
**Description:** System detects differences between front desk data and patient-entered data
**Trigger:** Patient completes registration with different data than front desk entered
**Steps:**
1. Patient submits registration
2. System compares: DOB, address, insurance info, emergency contact
3. If discrepancies found, flag for review
4. If discrepancy affects coverage (insurance info changed), escalate
**Expected:**
- Discrepancies logged with both values shown
- Coverage-affecting changes trigger immediate alert to staff
- Discrepancy must be resolved by 3 days before appointment
**Business Rules:**
- If discrepancy affects coverage: contact patient immediately
- Unresolved discrepancies at day -3: appointment rescheduled
**Code References:**
- `server/services/discrepancyService.js` (to be created)
- `src/components/admin/DiscrepancyReview.jsx` (to be created)

### front-desk-intake-10: Discrepancy Resolution
**Description:** Staff resolves data conflicts
**Precondition:** Discrepancy flagged in checkpoint 9
**Steps:**
1. Staff views discrepancy report
2. Both values displayed (front desk vs patient)
3. Staff contacts patient if needed
4. Staff selects authoritative value or merges
5. If insurance changed, re-run eligibility
6. Mark discrepancy resolved
**Expected:**
- Audit trail of resolution
- If re-verification needed, repeat eligibility check
- Resolution must happen before 3-day deadline
**Code References:**
- `src/components/admin/DiscrepancyReview.jsx`

### front-desk-intake-11: Auto-Cancellation (Failure Path)
**Description:** System auto-cancels appointment if registration not completed by deadline
**Trigger:** Automated job, close of business on day -3
**Precondition:** Registration still incomplete after both reminders
**Steps:**
1. System identifies incomplete registrations past deadline
2. Cancel provisional appointment
3. Release time slot for other patients
4. Release credit card auth hold if applicable
5. Send cancellation notification to patient
6. Log cancellation reason
**Expected:**
- Appointment status changed to "Cancelled - Registration Incomplete"
- Time slot available for rebooking
- Auth hold released (not charged)
- Patient notified of cancellation
- Audit trail complete
**Code References:**
- `server/jobs/provisionalCleanup.js` (to be created)

### front-desk-intake-12: Successful Confirmation
**Description:** Registration complete, provisional converts to confirmed
**Trigger:** Patient completes registration before deadline
**Precondition:** All required fields and forms completed, no unresolved discrepancies
**Steps:**
1. System detects registration complete
2. Verify no unresolved discrepancies
3. Convert provisional appointment to confirmed
4. Send confirmation to patient
5. Add patient to provider's schedule
**Expected:**
- Appointment status: "Confirmed"
- Patient status: "Active" (no longer temporary)
- Confirmation sent via preferred communication method
- Appointment visible on provider schedule
**Code References:**
- `server/services/appointmentService.js`

---

## Acceptance Criteria

### Core Flow
- [ ] Front desk can collect basic patient info during phone call
- [ ] Real-time eligibility verification works within 10 seconds
- [ ] OON patients see estimated cost with disclaimer
- [ ] Credit card auth hold can be captured (not charged)
- [ ] Provisional appointments prevent double-booking
- [ ] Registration email sent with correct forms

### Patient Self-Service
- [ ] Registration link works and shows pre-filled data
- [ ] Patient can edit data entered by front desk
- [ ] Progress saves automatically - can resume later
- [ ] Required forms determined by apt type + provider + insurance

### Automation
- [ ] Day -5 reminder sent via preferred communication method
- [ ] Day -3 final warning sent with cancellation notice
- [ ] Auto-cancel at COB day -3 if incomplete
- [ ] Auth hold released on cancellation

### Discrepancy Handling
- [ ] System detects data differences
- [ ] Coverage-affecting changes escalated immediately
- [ ] Staff can review and resolve discrepancies
- [ ] Unresolved discrepancies block confirmation

---

## Data Model

### Provisional Appointment
| Field | Type | Description |
|-------|------|-------------|
| status | enum | provisional, confirmed, cancelled |
| provisional_expires | datetime | 3 days before apt, COB |
| registration_complete | boolean | Has patient finished registration |
| auth_hold_id | string | Payment gateway auth reference |
| auth_expires | datetime | When to re-authorize |

### Patient Registration Progress
| Field | Type | Description |
|-------|------|-------------|
| demographics_complete | boolean | Basic info filled |
| insurance_complete | boolean | Insurance info filled |
| forms_complete | boolean | All required forms signed |
| last_saved | datetime | Auto-save timestamp |

### Discrepancy Record
| Field | Type | Description |
|-------|------|-------------|
| field_name | string | Which field differs |
| front_desk_value | string | Original value |
| patient_value | string | Patient-entered value |
| affects_coverage | boolean | Does this impact insurance |
| resolved | boolean | Has staff resolved |
| resolution_note | string | How it was resolved |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/eligibility/verify | POST | Real-time eligibility check |
| /api/patients/quick-intake | POST | Create temporary patient from call |
| /api/appointments/provisional | POST | Create provisional hold |
| /api/payments/auth-hold | POST | Create CC auth hold |
| /api/payments/release-auth | POST | Release auth hold |
| /api/registration/:token | GET | Get registration portal data |
| /api/registration/:token | PUT | Save registration progress |
| /api/registration/:token/complete | POST | Submit completed registration |
| /api/discrepancies | GET | List pending discrepancies |
| /api/discrepancies/:id/resolve | POST | Resolve a discrepancy |

---

## Integration Points

### External Services
- **Payer Eligibility API**: Real-time benefits verification
- **Payment Gateway**: Auth holds, re-authorization, release
- **Email Service**: Registration links, reminders, confirmations
- **SMS Service**: Text reminders (if preferred)
- **Phone Service**: Automated call reminders (if preferred)

### Internal Services
- **Form Selection Service**: Determines required forms based on apt type, provider, insurance
- **Communication Service**: Routes messages via patient's preferred channel
- **Discrepancy Service**: Detects and tracks data conflicts
- **Reminder Job**: Scheduled task for day -5 and day -3 reminders
- **Cleanup Job**: Scheduled task for COB day -3 cancellations

---

## Notes

- This workflow replaces the simpler `patient-mgmt-5` checkpoint which only covered basic email link sending
- The provisional appointment model ensures slots aren't lost to incomplete registrations
- Auto-re-authorization handles appointments scheduled far in advance
- Patient preference for communication channel respects their choice while ensuring delivery
