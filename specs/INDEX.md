# TF Specs Index

## Overview

This directory previously contained static test specifications. The Testing Framework now uses **dynamic app-specific specs**.

## How Specs Work Now

1. **Connect GitHub** - Link your repository in the TF Portal
2. **Generate Specs** - Click "Generate Specs" to create specs for your app
3. **Specs Are Stored** - Specs are saved in browser localStorage per-repository
4. **Auto-Update** - When code changes are detected, you can update specs

## Spec Types

The framework generates specs based on your application type:

### Project Management Apps
- Authentication (login, logout, sessions)
- Projects (CRUD operations)
- Tasks (create, assign, status changes)
- Team Management (members, roles)
- Dashboard (overview, quick actions)
- Search & Filter
- Notifications
- User Settings

### Other App Types
Additional templates can be added for:
- Healthcare/Practice Management
- Property Management
- E-commerce
- Custom applications

## Spec Structure

Each generated spec contains:
- **Feature ID & Name** - Unique identifier
- **Checkpoints** - Detailed test cases with:
  - Description
  - Steps to execute
  - Expected results

## Storage

Specs are stored in:
- `localStorage` under key `tf_app_specs`
- Organized by repository (e.g., `owner-repo`)
- Include last update timestamp and commit SHA

## Exporting Specs

To export specs for backup or sharing:
1. Open browser DevTools (F12)
2. Go to Application > Local Storage
3. Find `tf_app_specs` key
4. Copy the JSON value

## Adding Custom Specs

To add custom specs for your app type, modify:
`app/src/services/SpecManager.js` - Add new template in `getSpecsTemplate()`
