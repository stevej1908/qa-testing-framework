# Testing Framework (TF)

A standalone interactive testing application for validating web applications with Playwright automation and GitHub issue integration.

## Features

- **Interactive Testing UI** - Walk through checkpoints with YES/NO approval
- **Playwright Automation** - Automated browser testing with step-by-step screenshots
- **GitHub Integration** - Auto-create issues for blockers and enhancements
- **Screenshot Gallery** - View all automation steps with navigation
- **Session Persistence** - Pause and resume testing sessions
- **Documentation Export** - Generate training docs from passed checkpoints

## Architecture

```
testing-framework/
├── app/                      # TF React application (port 3001)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SetupPage.jsx      # Configure target URL, select spec
│   │   │   ├── TestingPage.jsx    # Main testing interface
│   │   │   ├── AnalyticsPage.jsx  # Test insights dashboard
│   │   │   └── DemoPage.jsx       # Stakeholder demo mode
│   │   ├── services/
│   │   │   └── PlaywrightClient.js # Playwright service client
│   │   ├── integrations/
│   │   │   └── GitHubIntegration.js # GitHub issue creation
│   │   └── App.jsx
│   ├── server/
│   │   └── playwright-service.js  # Playwright HTTP API (port 3002)
│   └── public/
│       └── specs/                 # Test specification files
├── specs/                    # Source spec files (.spec.md)
└── src/                      # Core TF library
```

## Quick Start

### Start All Services

Double-click the desktop shortcut or run:
```bash
cd testing-framework
Start-TF.bat
```

This starts:
- **TF App**: http://localhost:3001
- **Playwright Service**: http://localhost:3002
- **Target App**: http://localhost:3000 (behavioral health app)

### Manual Start

1. Start the target application:
   ```bash
   cd behavioral-health-app
   npm start
   ```

2. Start the TF app:
   ```bash
   cd testing-framework/app
   npm start
   ```

3. Start the Playwright service:
   ```bash
   cd testing-framework/app/server
   node playwright-service.js
   ```

## Usage

1. Open http://localhost:3001
2. Enter target URL (e.g., http://localhost:3000)
3. Select a test spec (e.g., auth-login)
4. Optionally configure GitHub token for issue creation
5. Click "Start Testing"
6. For each checkpoint:
   - Click **RUN** to execute Playwright automation
   - Review the screenshots (use ◀ ▶ to navigate steps)
   - Click **YES - Approved** or **NO - Issue Found**
7. If reporting an issue:
   - Fill in the feedback form
   - Select priority (Blocker or Nice-to-have)
   - Submit to create GitHub issue with screenshots

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | TestPass123! |
| Provider | provider@test.com | TestPass123! |
| Front Desk | frontdesk@test.com | TestPass123! |
| Billing | billing@test.com | TestPass123! |

## GitHub Integration

Issues are created with appropriate labels:

**Blockers:**
- Labels: `tf-feedback`, `priority:critical`, `bug`
- Title: `🚫 BUG [CP-xxx] ...`

**Enhancements:**
- Labels: `tf-feedback`, `priority:low`, `enhancement`, `future-release`
- Title: `💡 ENHANCEMENT [CP-xxx] ...`

Screenshots from all automation steps are attached as expandable comments.

## Available Specs

| Spec ID | Feature | Checkpoints |
|---------|---------|-------------|
| auth-login | Authentication | 9 |
| auth-roles | Role-Based Access | 11 |
| patient-mgmt | Patient Management | 10 |
| provider-mgmt | Provider Management | 10 |
| appointments | Scheduling | 11 |
| front-desk-ops | Front Desk Operations | 10 |
| billing-claims | Billing & Claims | 12 |
| And more... | | |

## Playwright Service API

- `GET /status` - Check service status
- `GET /steps` - List available automation steps
- `POST /execute` - Execute single step
- `POST /execute-sequence` - Execute multiple steps
- `POST /close` - Close browser

## Development

### Adding New Automation Steps

Edit `testing-framework/app/server/playwright-service.js` to add new steps:

```javascript
'my-new-step': async () => {
  await page.click('button.my-button');
  return { message: 'Clicked my button' };
},
```

Then map checkpoints to steps in `testing-framework/app/src/services/PlaywrightClient.js`:

```javascript
'CP-NEW': [{ stepId: 'goto-login' }, { stepId: 'my-new-step' }],
```

### Adding New Specs

Create a new `.spec.md` file in `testing-framework/specs/` following the existing format, then copy to `testing-framework/app/public/specs/`.
