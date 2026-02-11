# QA Testing Framework (TF)

A standalone interactive testing application for validating web applications with Playwright automation and GitHub issue integration. Supports **any application** with dynamic spec generation.

## Features

- **Dynamic Spec Generation** - Auto-generate test specs based on your app type
- **App-Specific Specs** - Each GitHub repo gets its own spec set
- **Interactive Testing UI** - Walk through checkpoints with YES/NO approval
- **Playwright Automation** - Automated browser testing with step-by-step screenshots
- **GitHub Integration** - Auto-create issues for blockers and enhancements
- **Change Detection** - Detects code changes and prompts to update specs
- **Screenshot Gallery** - View all automation steps with navigation
- **Session Persistence** - Pause and resume testing sessions
- **Documentation Export** - Generate training docs from passed checkpoints

## Architecture

```
qa-testing-framework/
├── app/                      # TF React application (port 3001)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SetupPage.jsx      # Configure target URL, select spec
│   │   │   ├── TestingPage.jsx    # Main testing interface
│   │   │   ├── AnalyticsPage.jsx  # Test insights dashboard
│   │   │   └── DemoPage.jsx       # Stakeholder demo mode
│   │   ├── services/
│   │   │   ├── PlaywrightClient.js # Playwright service client
│   │   │   └── SpecManager.js      # App-specific spec management
│   │   ├── integrations/
│   │   │   └── GitHubIntegration.js # GitHub issue creation
│   │   └── App.jsx
│   ├── server/
│   │   └── playwright-service.js  # Playwright HTTP API (port 3002)
│   └── public/
├── specs/                    # Spec documentation
└── src/                      # Core TF library
```

## Quick Start

### Start All Services

Double-click `Start-TF.bat` or run:
```bash
cd qa-testing-framework
./Start-TF.bat
```

This starts:
- **TF Portal**: http://localhost:3001
- **Playwright Service**: http://localhost:3002

### Manual Start

1. Start the TF app:
   ```bash
   cd qa-testing-framework/app
   npm start
   ```

2. Start the Playwright service:
   ```bash
   cd qa-testing-framework/app/server
   node playwright-service.js
   ```

## Usage

### First Time Setup

1. Open http://localhost:3001
2. **Connect GitHub** - Enter your GitHub token and repository (owner/repo)
3. **Generate Specs** - Click "Generate Specs" to create test specifications for your app
4. Specs are saved and will be available for future sessions

### Testing Workflow

1. Enter your target application URL (e.g., http://localhost:3000)
2. Select a test spec from the generated list
3. Click "Start Testing"
4. For each checkpoint:
   - Click **RUN** to execute Playwright automation
   - Review the screenshots (use ◀ ▶ to navigate steps)
   - Click **YES - Approved** or **NO - Issue Found**
5. If reporting an issue:
   - Fill in the feedback form
   - Select priority (Blocker or Nice-to-have)
   - Submit to create GitHub issue with screenshots

### Updating Specs

When code changes are detected in your repository:
1. The framework will show an "Update Specs" notification
2. Click to regenerate specs with the latest changes
3. Specs track the last commit SHA to detect changes

## Supported App Types

The framework generates specs based on your application type:

### Project Management Apps
| Spec | Feature | Checkpoints |
|------|---------|-------------|
| auth-login | Authentication | 4 |
| projects | Project Management | 5 |
| tasks | Task Management | 6 |
| team | Team Management | 4 |
| dashboard | Dashboard | 4 |
| search | Search & Filter | 3 |
| notifications | Notifications | 3 |
| settings | User Settings | 4 |

**Total: 8 specs, 33 checkpoints**

### Adding Custom App Types

Edit `app/src/services/SpecManager.js` to add templates for new app types.

## GitHub Integration

Issues are created with appropriate labels:

**Blockers:**
- Labels: `tf-feedback`, `priority:critical`, `bug`
- Title: `🚫 BUG [CP-xxx] ...`

**Enhancements:**
- Labels: `tf-feedback`, `priority:low`, `enhancement`, `future-release`
- Title: `💡 ENHANCEMENT [CP-xxx] ...`

Screenshots from all automation steps are attached as expandable comments.

## Playwright Service API

- `GET /status` - Check service status
- `GET /steps` - List available automation steps
- `POST /execute` - Execute single step
- `POST /execute-sequence` - Execute multiple steps
- `POST /close` - Close browser

## Development

### Adding New Automation Steps

Edit `app/server/playwright-service.js` to add new steps:

```javascript
'my-new-step': async () => {
  await page.click('button.my-button');
  return { message: 'Clicked my button' };
},
```

Then map checkpoints to steps in `app/src/services/PlaywrightClient.js`:

```javascript
'CP-NEW': [{ stepId: 'goto-login' }, { stepId: 'my-new-step' }],
```

### Adding New App Type Templates

Edit `app/src/services/SpecManager.js` and add a new method:

```javascript
getMyAppTypeSpecs(analysis) {
  return [
    {
      id: 'feature-id',
      name: 'Feature Name',
      file: 'feature.spec.md',
      version: '1.0',
      checkpoints: [
        {
          id: 'feature-1',
          action: 'Action Name',
          description: 'What this tests',
          steps: ['Step 1', 'Step 2'],
          expectedResult: 'Expected outcome',
          expectedItems: ['Item 1', 'Item 2']
        }
      ]
    }
  ];
}
```

Then register it in `getSpecsTemplate()`.

## Spec Storage

Specs are stored in browser `localStorage`:
- Key: `tf_app_specs`
- Organized by repository (e.g., `owner-repo`)
- Includes last update timestamp and commit SHA

To export/backup specs:
1. Open browser DevTools (F12)
2. Go to Application > Local Storage
3. Find `tf_app_specs` key
4. Copy the JSON value

## Stopping Services

Run `Stop-TF.bat` to stop all running services.
