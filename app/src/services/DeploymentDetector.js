/**
 * DeploymentDetector - Identifies deployment environment from target URL
 *
 * Detects the deployment platform and environment (dev/staging/prod)
 * from the target URL, matching against known deployment configurations.
 */

class DeploymentDetector {
  constructor(repoAnalyzer = null) {
    this.repoAnalyzer = repoAnalyzer;

    // Known deployment URL patterns
    this.platformPatterns = {
      render: [
        { pattern: /\.onrender\.com$/i, extract: this._extractRenderEnv.bind(this) }
      ],
      vercel: [
        { pattern: /\.vercel\.app$/i, extract: this._extractVercelEnv.bind(this) },
        { pattern: /\.vercel\.com$/i, extract: this._extractVercelEnv.bind(this) }
      ],
      netlify: [
        { pattern: /\.netlify\.app$/i, extract: this._extractNetlifyEnv.bind(this) }
      ],
      heroku: [
        { pattern: /\.herokuapp\.com$/i, extract: this._extractHerokuEnv.bind(this) }
      ],
      railway: [
        { pattern: /\.railway\.app$/i, extract: this._extractRailwayEnv.bind(this) }
      ],
      fly: [
        { pattern: /\.fly\.dev$/i, extract: this._extractFlyEnv.bind(this) }
      ],
      local: [
        { pattern: /^localhost(:\d+)?$/i, extract: this._extractLocalEnv.bind(this) },
        { pattern: /^127\.0\.0\.1(:\d+)?$/i, extract: this._extractLocalEnv.bind(this) },
        { pattern: /^192\.168\.\d+\.\d+(:\d+)?$/i, extract: this._extractLocalEnv.bind(this) },
        { pattern: /^10\.\d+\.\d+\.\d+(:\d+)?$/i, extract: this._extractLocalEnv.bind(this) }
      ]
    };
  }

  /**
   * Identify the environment from a target URL
   * @param {string} targetUrl - The URL to identify
   * @returns {Promise<Object>} Environment identification result
   */
  async identifyEnvironment(targetUrl) {
    try {
      const url = new URL(targetUrl);
      const hostname = url.hostname;
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');

      // Detect platform
      const platformResult = this.detectPlatform(hostname);

      // Get deployment config from repo if available
      let deploymentConfig = null;
      if (this.repoAnalyzer) {
        try {
          deploymentConfig = await this.repoAnalyzer.detectDeploymentConfig();
        } catch {
          // Repo analyzer not configured or failed
        }
      }

      // Match URL to known services from deployment config
      const serviceMatch = this._matchToDeploymentConfig(hostname, deploymentConfig);

      return {
        targetUrl,
        hostname,
        port,
        protocol: url.protocol,
        platform: platformResult.platform,
        environment: platformResult.environment || 'unknown',
        branch: platformResult.branch || serviceMatch?.branch || null,
        serviceName: serviceMatch?.serviceName || null,
        dbRef: serviceMatch?.dbRef || null,
        isLocal: platformResult.platform === 'local',
        confidence: this._calculateConfidence(platformResult, serviceMatch),
        details: {
          ...platformResult.details,
          serviceMatch
        }
      };
    } catch (error) {
      throw new Error(`Failed to identify environment: ${error.message}`);
    }
  }

  /**
   * Detect the platform from a hostname
   * @param {string} hostname - The hostname to detect
   * @returns {Object} Platform detection result
   */
  detectPlatform(hostname) {
    for (const [platform, patterns] of Object.entries(this.platformPatterns)) {
      for (const { pattern, extract } of patterns) {
        if (pattern.test(hostname)) {
          const extracted = extract(hostname);
          return {
            platform,
            ...extracted
          };
        }
      }
    }

    return {
      platform: 'unknown',
      environment: 'unknown',
      details: {}
    };
  }

  /**
   * Check if target URL is accessible
   * @param {string} targetUrl - URL to check
   * @returns {Promise<Object>} Accessibility result
   */
  async checkAccessibility(targetUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        accessible: true,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.name === 'AbortError' ? 'Request timeout' : error.message
      };
    }
  }

  // Platform-specific extraction methods

  _extractRenderEnv(hostname) {
    // Render URLs: app-name-env.onrender.com or app-name.onrender.com
    const match = hostname.match(/^(.+?)(?:-(dev|staging|prod|production))?\.onrender\.com$/i);

    if (match) {
      const appName = match[1];
      const envSuffix = match[2];

      // Detect environment from app name or suffix
      let environment = envSuffix || 'production';
      if (!envSuffix) {
        if (appName.includes('-dev')) environment = 'development';
        else if (appName.includes('-staging')) environment = 'staging';
        else if (appName.includes('-test')) environment = 'test';
      }

      // Detect branch from environment
      let branch = null;
      if (environment === 'development' || environment === 'dev') {
        branch = 'develop';
      } else if (environment === 'production') {
        branch = 'master';
      }

      return {
        environment,
        branch,
        details: {
          appName,
          envSuffix
        }
      };
    }

    return { environment: 'unknown', details: {} };
  }

  _extractVercelEnv(hostname) {
    // Vercel URLs: project-name.vercel.app or project-git-branch-team.vercel.app
    const parts = hostname.replace(/\.vercel\.(app|com)$/i, '').split('-');

    let environment = 'production';
    let branch = null;

    if (parts.includes('preview')) {
      environment = 'preview';
    } else if (parts.includes('git')) {
      environment = 'preview';
      const gitIndex = parts.indexOf('git');
      if (gitIndex < parts.length - 1) {
        branch = parts[gitIndex + 1];
      }
    }

    return {
      environment,
      branch,
      details: {
        projectName: parts[0]
      }
    };
  }

  _extractNetlifyEnv(hostname) {
    // Netlify URLs: site-name.netlify.app or deploy-preview-123--site-name.netlify.app
    const match = hostname.match(/^(?:deploy-preview-(\d+)--)?(.+?)\.netlify\.app$/i);

    if (match) {
      const prNumber = match[1];
      const siteName = match[2];

      return {
        environment: prNumber ? 'preview' : 'production',
        branch: prNumber ? `PR-${prNumber}` : 'main',
        details: {
          siteName,
          prNumber: prNumber ? parseInt(prNumber, 10) : null
        }
      };
    }

    return { environment: 'unknown', details: {} };
  }

  _extractHerokuEnv(hostname) {
    // Heroku URLs: app-name.herokuapp.com
    const appName = hostname.replace(/\.herokuapp\.com$/i, '');

    let environment = 'production';
    if (appName.includes('-dev') || appName.includes('-development')) {
      environment = 'development';
    } else if (appName.includes('-staging') || appName.includes('-stage')) {
      environment = 'staging';
    } else if (appName.includes('-test')) {
      environment = 'test';
    }

    return {
      environment,
      branch: environment === 'production' ? 'master' : environment === 'development' ? 'develop' : null,
      details: {
        appName
      }
    };
  }

  _extractRailwayEnv(hostname) {
    // Railway URLs: project-name.railway.app
    const projectName = hostname.replace(/\.railway\.app$/i, '');

    let environment = 'production';
    if (projectName.includes('-dev')) environment = 'development';
    else if (projectName.includes('-staging')) environment = 'staging';

    return {
      environment,
      details: {
        projectName
      }
    };
  }

  _extractFlyEnv(hostname) {
    // Fly.io URLs: app-name.fly.dev
    const appName = hostname.replace(/\.fly\.dev$/i, '');

    let environment = 'production';
    if (appName.includes('-dev')) environment = 'development';
    else if (appName.includes('-staging')) environment = 'staging';

    return {
      environment,
      details: {
        appName
      }
    };
  }

  _extractLocalEnv(hostname) {
    return {
      environment: 'local',
      branch: null, // Will be determined from local git
      details: {
        hostname,
        isLocalhost: hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1')
      }
    };
  }

  _matchToDeploymentConfig(hostname, deploymentConfig) {
    if (!deploymentConfig || !deploymentConfig.configs) {
      return null;
    }

    // Check Render config
    if (deploymentConfig.configs.render) {
      const renderConfig = deploymentConfig.configs.render.parsed;
      if (renderConfig && renderConfig.services) {
        // Try to match hostname to service
        for (const [serviceName, config] of Object.entries(renderConfig.services || {})) {
          if (config.url && hostname.includes(serviceName.toLowerCase())) {
            return {
              serviceName,
              branch: config.branch || 'master',
              dbRef: config.database || null
            };
          }
        }
      }
    }

    // Check Vercel config
    if (deploymentConfig.configs.vercel) {
      const vercelConfig = deploymentConfig.configs.vercel.parsed;
      if (vercelConfig) {
        return {
          serviceName: vercelConfig.name || null,
          branch: vercelConfig.git?.deploymentBranch || 'main'
        };
      }
    }

    return null;
  }

  _calculateConfidence(platformResult, serviceMatch) {
    let confidence = 0;

    // Platform detected
    if (platformResult.platform !== 'unknown') {
      confidence += 40;
    }

    // Environment detected
    if (platformResult.environment !== 'unknown') {
      confidence += 20;
    }

    // Branch detected
    if (platformResult.branch) {
      confidence += 15;
    }

    // Service matched from deployment config
    if (serviceMatch) {
      confidence += 25;
    }

    return Math.min(confidence, 100);
  }
}

export default DeploymentDetector;
