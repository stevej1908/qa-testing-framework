# TF Spec: Practice Setup

## Feature ID: practice-setup
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Practice/customer setup wizard including initial configuration, module selection, and setup completion tracking.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with database access
- [ ] Admin or Support user logged in
- [ ] New practice/customer to configure

---

## Checkpoints

### practice-setup-1: Setup Wizard Access
**Description:** Setup wizard accessible
**Steps:**
1. Login as admin
2. Navigate to Practice Setup
**Expected:**
- Wizard interface displayed
- Progress indicator visible
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-2: Progress Tracking
**Description:** Setup progress is tracked
**Steps:**
1. View setup wizard
2. Check progress indicator
**Expected:**
- Shows percentage complete
- Lists completed/pending steps
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-3: Practice Information Step
**Description:** Practice info can be entered
**Steps:**
1. Start setup wizard
2. Enter practice name
3. Enter Tax ID
4. Enter NPI
5. Proceed
**Expected:**
- Info saved
- Advances to next step
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-4: Address Configuration
**Description:** Practice address can be set
**Steps:**
1. Navigate to Address step
2. Enter street, city, state, zip
3. Save
**Expected:**
- Address saved
- Used for billing
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-5: Billing Configuration
**Description:** Billing model can be configured
**Steps:**
1. Navigate to Billing step
2. Select billing model
3. Configure clearinghouse
4. Save
**Expected:**
- Billing settings saved
- Clearinghouse configured
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-6: Module Selection
**Description:** Practice modules can be selected
**Steps:**
1. Navigate to Modules step
2. Select enabled modules
3. Save
**Expected:**
- Modules enabled/disabled
- Affects feature availability
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-7: Provider Setup
**Description:** Initial provider can be added
**Steps:**
1. Navigate to Providers step
2. Add at least one provider
**Expected:**
- Provider created
- Can proceed to next step
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-8: Insurance Plan Setup
**Description:** Insurance plans can be configured
**Steps:**
1. Navigate to Insurance step
2. Add accepted insurance plans
**Expected:**
- Plans added
- Ready for patient intake
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-9: Complete Setup
**Description:** Setup can be completed
**Steps:**
1. Complete all required steps
2. Click "Complete Setup" or "Finish"
**Expected:**
- Setup marked complete
- Dashboard accessible
**Code References:**
- `src/components/admin/PracticeSetupWizard.jsx`

### practice-setup-10: Customer Setup (Support)
**Description:** Support can create new customer
**Steps:**
1. Navigate to Customer Setup
2. Enter practice name, subdomain
3. Enter admin email
4. Select modules
5. Create
**Expected:**
- New practice created
- Admin account created
- Welcome email sent
**Code References:**
- `src/components/admin/CustomerSetup.jsx`

### practice-setup-11: Subdomain Validation
**Description:** Subdomain is validated
**Steps:**
1. Enter subdomain
2. Check availability
**Expected:**
- Shows available/unavailable
- Prevents duplicates
**Code References:**
- `src/components/admin/CustomerSetup.jsx`

### practice-setup-12: Email Instructions
**Description:** Setup email can be downloaded
**Steps:**
1. Complete customer setup
2. Download email instructions
**Expected:**
- Email template downloaded
- Contains login info
**Code References:**
- `src/components/admin/customer/EmailInstructionsStep.jsx`

---

## Acceptance Criteria

- [ ] Setup wizard accessible
- [ ] Progress tracked correctly
- [ ] Practice info can be entered
- [ ] Address configuration works
- [ ] Billing model selectable
- [ ] Modules can be selected
- [ ] Providers can be added
- [ ] Insurance plans configurable
- [ ] Setup can be completed
- [ ] Customer setup works (support)

---

## Setup Steps

| Step | Name | Required | Description |
|------|------|----------|-------------|
| 1 | Practice Info | ✅ | Name, Tax ID, NPI |
| 2 | Address | ✅ | Physical address |
| 3 | Billing | ✅ | Billing model, clearinghouse |
| 4 | Modules | ❌ | Feature selection |
| 5 | Providers | ✅ | At least one |
| 6 | Insurance | ✅ | At least one plan |
| 7 | Review | ✅ | Confirmation |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/practice/setup | GET | Get setup status |
| /api/practice/setup | POST | Save setup step |
| /api/practice/setup/complete | POST | Complete setup |
| /api/customers | POST | Create customer |
| /api/customers/check-subdomain | GET | Check availability |
| /api/practices | GET | List practices |
