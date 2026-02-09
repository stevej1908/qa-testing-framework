# TF Spec: Authentication - Login

## Feature ID: auth-login
## Version: 1.0
## Last Updated: 2026-01-30

---

## Overview

User authentication flow including login, logout, password management, and session handling.

---

## Pre-Flight Requirements

### Environment
- [ ] Server running on configured port
- [ ] Database accessible with test users
- [ ] Valid test credentials available

### Test Data
- Admin user: admin@test.com / TestPass123!
- Provider user: provider@test.com / TestPass123!
- Front Desk user: frontdesk@test.com / TestPass123!
- Billing user: billing@test.com / TestPass123!

---

## Checkpoints

### auth-login-1: Login Page Display
**Description:** Login page renders correctly with all required elements
**Steps:**
1. Navigate to application root (/)
2. Verify login form is visible
**Expected:**
- Email input field visible
- Password input field visible
- Submit button visible
- Forgot password link visible (optional)
**Code References:**
- `src/components/auth/Login.jsx`

### auth-login-2: Valid Admin Login
**Description:** Admin user can login with valid credentials
**Steps:**
1. Enter valid admin email
2. Enter valid admin password
3. Click submit button
**Expected:**
- User is redirected to admin dashboard
- Auth token is stored in localStorage
- User context is populated
**Code References:**
- `src/components/auth/Login.jsx`
- `src/context/AuthContext.jsx`
- `server/routes/auth.js`

### auth-login-3: Valid Provider Login
**Description:** Provider user can login and access provider dashboard
**Steps:**
1. Enter valid provider email
2. Enter valid provider password
3. Click submit button
**Expected:**
- User is redirected to provider dashboard
- Provider-specific features are accessible
**Code References:**
- `src/components/provider/ProviderDashboard.jsx`

### auth-login-4: Valid Front Desk Login
**Description:** Front desk user can login and access front desk dashboard
**Steps:**
1. Enter valid front desk email
2. Enter valid front desk password
3. Click submit button
**Expected:**
- User is redirected to front desk dashboard
- Front desk features are accessible
**Code References:**
- `src/components/frontdesk/FrontDeskDashboard.jsx`

### auth-login-5: Invalid Credentials
**Description:** Login fails with invalid credentials
**Steps:**
1. Enter invalid email or password
2. Click submit button
**Expected:**
- Error message is displayed
- User remains on login page
- No auth token is stored
**Code References:**
- `src/components/auth/Login.jsx:handleSubmit`

### auth-login-6: Empty Fields Validation
**Description:** Login form validates required fields
**Steps:**
1. Leave email and/or password empty
2. Click submit button
**Expected:**
- Form validation prevents submission
- Validation error message shown
**Code References:**
- `src/components/auth/Login.jsx`

### auth-login-7: Session Persistence
**Description:** User session persists across page refreshes
**Steps:**
1. Login successfully
2. Refresh the page
**Expected:**
- User remains logged in
- Dashboard is displayed
- Auth token is still valid
**Code References:**
- `src/context/AuthContext.jsx:useEffect`

### auth-login-8: Logout
**Description:** User can logout and session is cleared
**Steps:**
1. Login successfully
2. Click logout button
**Expected:**
- User is redirected to login page
- Auth token is removed
- User context is cleared
**Code References:**
- `src/context/AuthContext.jsx:logout`

### auth-login-9: Session Timeout
**Description:** Expired sessions are handled gracefully
**Steps:**
1. Login successfully
2. Wait for token expiration (or manually expire)
3. Attempt protected action
**Expected:**
- User is redirected to login
- Appropriate message shown
**Code References:**
- `server/middleware/auth.js`

---

## Acceptance Criteria

- [ ] All user roles can login successfully
- [ ] Invalid credentials show appropriate errors
- [ ] Session persists across page refreshes
- [ ] Logout clears all session data
- [ ] Password field is masked
- [ ] Email format is validated

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/login | POST | User login |
| /api/auth/logout | POST | User logout |
| /api/auth/verify | GET | Verify token |
| /api/auth/forgot-password | POST | Password reset |

---

## Error Codes

| Code | Message | Cause |
|------|---------|-------|
| AUTH001 | Invalid credentials | Wrong email/password |
| AUTH002 | Account locked | Too many failed attempts |
| AUTH003 | Token expired | Session timeout |
| AUTH004 | Invalid token | Tampered or invalid token |
