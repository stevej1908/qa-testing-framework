# TF Specs Index

## Overview

This directory contains Testing Framework specifications for all 15 feature areas of the Behavioral Health App.

## Specifications

| ID | Feature Area | File | Checkpoints |
|----|--------------|------|-------------|
| auth-login | Authentication | [auth-login.spec.md](auth-login.spec.md) | 9 |
| auth-roles | Role-Based Access | [auth-roles.spec.md](auth-roles.spec.md) | 11 |
| patient-mgmt | Patient Management | [patient-mgmt.spec.md](patient-mgmt.spec.md) | 10 |
| provider-mgmt | Provider Management | [provider-mgmt.spec.md](provider-mgmt.spec.md) | 10 |
| session-docs | Session Documentation | [session-docs.spec.md](session-docs.spec.md) | 12 |
| billing-claims | Billing & Claims | [billing-claims.spec.md](billing-claims.spec.md) | 12 |
| front-desk-ops | Front Desk Operations | [front-desk-ops.spec.md](front-desk-ops.spec.md) | 10 |
| appointments | Scheduling | [appointments.spec.md](appointments.spec.md) | 11 |
| prescriptions | Prescriptions & RTM | [prescriptions.spec.md](prescriptions.spec.md) | 10 |
| insurance | Insurance Management | [insurance.spec.md](insurance.spec.md) | 10 |
| patient-portal | Patient Portal | [patient-portal.spec.md](patient-portal.spec.md) | 12 |
| mobile | Mobile Support | [mobile.spec.md](mobile.spec.md) | 10 |
| admin-config | Admin Configuration | [admin-config.spec.md](admin-config.spec.md) | 12 |
| intake-forms | Intake Forms | [intake-forms.spec.md](intake-forms.spec.md) | 11 |
| practice-setup | Practice Setup | [practice-setup.spec.md](practice-setup.spec.md) | 12 |

**Total: 15 specs, 152 checkpoints**

## Spec Structure

Each spec file contains:

1. **Feature ID & Version** - Unique identifier and version number
2. **Overview** - Brief description of the feature
3. **Pre-Flight Requirements** - Environment and data prerequisites
4. **Checkpoints** - Detailed test cases with:
   - Description
   - Steps to execute
   - Expected results
   - Code references
5. **Acceptance Criteria** - High-level requirements
6. **Data Model** - Relevant database schemas
7. **API Endpoints** - Related API routes

## Usage

### Manual Testing

Use specs as checklists for manual testing:
1. Review pre-flight requirements
2. Execute each checkpoint
3. Verify expected results
4. Mark acceptance criteria as complete

### Automated Testing

Specs align with E2E tests in `/e2e/tests/`:
- Each spec ID maps to a test directory
- Checkpoints inform test case design
- Code references help locate implementation

### Drift Detection

Specs can be used to detect code changes:
1. Compare spec checkpoints against current implementation
2. Identify changed code references
3. Update tests accordingly

## Mapping to E2E Tests

| Spec ID | E2E Test Directory |
|---------|-------------------|
| auth-login | e2e/tests/auth/ |
| auth-roles | e2e/tests/auth/ |
| patient-mgmt | e2e/tests/patients/ |
| provider-mgmt | e2e/tests/providers/ |
| session-docs | e2e/tests/sessions/ |
| billing-claims | e2e/tests/billing/ |
| front-desk-ops | e2e/tests/front-desk/ |
| appointments | e2e/tests/appointments/ |
| prescriptions | e2e/tests/prescriptions/ |
| insurance | e2e/tests/insurance/ |
| patient-portal | e2e/tests/patient-portal/ |
| admin-config | e2e/tests/admin/ |
| intake-forms | e2e/tests/intake/ |
| practice-setup | e2e/tests/practice-setup/ |
| mobile | (API tests) |

## Maintenance

When updating the application:
1. Review affected specs
2. Update checkpoints as needed
3. Update code references
4. Increment spec version
5. Update corresponding E2E tests
