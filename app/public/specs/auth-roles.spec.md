# TF Spec: Role-Based Access Control

## Feature ID: auth-roles
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

Role-based access control (RBAC) ensuring users can only access features appropriate for their role.

---

## Roles Defined

| Role | Access Level | Primary Features |
|------|--------------|------------------|
| admin | Full system | All features, user management, settings |
| provider | Clinical | Patient care, sessions, prescriptions |
| front_desk | Operations | Check-in, scheduling, intake |
| billing | Financial | Claims, payments, reports |
| patient | Portal | Own records, forms, messages |

---

## Pre-Flight Requirements

### Environment
- [ ] Server running with authentication enabled
- [ ] Test users for each role created

---

## Checkpoints

### auth-roles-1: Admin Access - Dashboard
**Description:** Admin can access admin dashboard
**Steps:**
1. Login as admin
2. Verify admin dashboard loads
**Expected:**
- Admin dashboard displays
- Admin-only navigation items visible
**Code References:**
- `src/components/admin/AdminDashboard.jsx`
- `src/context/AuthContext.jsx:isAdmin`

### auth-roles-2: Admin Access - User Management
**Description:** Admin can manage users
**Steps:**
1. Login as admin
2. Navigate to user management
**Expected:**
- User list is displayed
- Add/Edit/Delete user options available
**Code References:**
- `src/components/admin/UserManagement.jsx`

### auth-roles-3: Admin Access - Provider Management
**Description:** Admin can manage providers
**Steps:**
1. Login as admin
2. Navigate to provider management
**Expected:**
- Provider list displayed
- Can add/edit providers
**Code References:**
- `src/components/admin/ProviderManagement.jsx`

### auth-roles-4: Provider Access - Dashboard
**Description:** Provider can access provider dashboard
**Steps:**
1. Login as provider
2. Verify provider dashboard loads
**Expected:**
- Provider dashboard displays
- Patient list visible
- Session management available
**Code References:**
- `src/components/provider/ProviderDashboard.jsx`

### auth-roles-5: Provider Access - Patients
**Description:** Provider can view and manage assigned patients
**Steps:**
1. Login as provider
2. View patient list
**Expected:**
- Assigned patients visible
- Can start sessions with patients
**Code References:**
- `src/components/provider/ProviderDashboard.jsx`

### auth-roles-6: Provider Access - Sessions
**Description:** Provider can create and manage sessions
**Steps:**
1. Login as provider
2. Start new session
**Expected:**
- Session form opens
- Can select patient, CPT codes, diagnoses
**Code References:**
- `src/components/provider/ServiceEntry.jsx`

### auth-roles-7: Front Desk Access - Dashboard
**Description:** Front desk can access front desk dashboard
**Steps:**
1. Login as front desk user
2. Verify front desk dashboard loads
**Expected:**
- Front desk dashboard displays
- Check-in, waiting room visible
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### auth-roles-8: Front Desk Access - Check-In
**Description:** Front desk can check in patients
**Steps:**
1. Login as front desk
2. Check in a patient
**Expected:**
- Patient moves to waiting room
- Status updates
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### auth-roles-9: Front Desk Access - Denied Admin
**Description:** Front desk cannot access admin settings
**Steps:**
1. Login as front desk
2. Attempt to navigate to /admin/settings
**Expected:**
- Access denied or redirected
- Admin features not accessible
**Code References:**
- `src/App.js:ProtectedRoute`

### auth-roles-10: Provider Access - Denied Admin
**Description:** Provider cannot access admin user management
**Steps:**
1. Login as provider
2. Attempt to navigate to /admin/users
**Expected:**
- Access denied or redirected
**Code References:**
- `src/App.js:ProtectedRoute`

### auth-roles-11: Billing Access - Claims
**Description:** Billing user can access claims management
**Steps:**
1. Login as billing user
2. Navigate to claims/billing
**Expected:**
- Claims list visible
- Can create/submit claims
**Code References:**
- `src/components/billing/BillingDashboard.jsx`

---

## Acceptance Criteria

- [ ] Each role can access appropriate dashboard
- [ ] Admin can access all features
- [ ] Provider can only access clinical features
- [ ] Front desk can only access operational features
- [ ] Billing can only access financial features
- [ ] Unauthorized access attempts are blocked
- [ ] Role is determined from JWT token

---

## Permission Matrix

| Feature | Admin | Provider | Front Desk | Billing |
|---------|-------|----------|------------|---------|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Provider Management | ✅ | ❌ | ❌ | ❌ |
| Patient List | ✅ | ✅ | ✅ | ✅ |
| Add Patient | ✅ | ❌ | ✅ | ❌ |
| Sessions/Notes | ✅ | ✅ | ❌ | ❌ |
| Check-In | ✅ | ❌ | ✅ | ❌ |
| Claims | ✅ | ❌ | ❌ | ✅ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Insurance Config | ✅ | ❌ | ❌ | ✅ |
