/**
 * GitHubRepoAnalyzer - Analyzes GitHub repository structure and content
 *
 * Fetches and analyzes repository structure, commits, deployment configs,
 * and user schema from database migrations.
 */

class GitHubRepoAnalyzer {
  constructor(githubClient) {
    if (!githubClient) {
      throw new Error('GitHubRepoAnalyzer requires a GitHubIntegration client');
    }
    this.github = githubClient;
    this.cache = {
      structure: null,
      deploymentConfig: null,
      userSchema: null,
      recentCommits: null
    };
  }

  /**
   * Get the repository file/directory structure
   * @param {string} path - Path within repo (default: root)
   * @returns {Promise<Object>} Directory listing with type, name, path, sha
   */
  async getRepoStructure(path = '') {
    try {
      const contents = await this.github.getContents(path);
      return {
        path,
        items: Array.isArray(contents) ? contents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type, // 'file' or 'dir'
          size: item.size,
          sha: item.sha
        })) : [contents]
      };
    } catch (error) {
      throw new Error(`Failed to get repo structure at ${path}: ${error.message}`);
    }
  }

  /**
   * Get recent commits since a given date
   * @param {string} since - ISO date string (default: 7 days ago)
   * @param {number} perPage - Number of commits to fetch
   * @returns {Promise<Array>} Array of commit objects
   */
  async getRecentCommits(since = null, perPage = 20) {
    if (!since) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      since = sevenDaysAgo.toISOString();
    }

    try {
      const commits = await this.github.getCommits({ since, perPage });
      this.cache.recentCommits = commits;
      return commits.map(commit => ({
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        url: commit.html_url
      }));
    } catch (error) {
      throw new Error(`Failed to get commits: ${error.message}`);
    }
  }

  /**
   * Get content of a specific file
   * @param {string} path - File path within repo
   * @returns {Promise<string>} File content (decoded from base64)
   */
  async getFileContent(path) {
    try {
      const content = await this.github.getContents(path);
      if (content.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }
      // GitHub returns base64 encoded content
      return atob(content.content.replace(/\n/g, ''));
    } catch (error) {
      throw new Error(`Failed to get file ${path}: ${error.message}`);
    }
  }

  /**
   * Detect deployment configuration files in the repo
   * Looks for: render.yaml, vercel.json, netlify.toml, docker-compose.yml
   * @returns {Promise<Object>} Detected deployment config
   */
  async detectDeploymentConfig() {
    const deploymentFiles = [
      { file: 'render.yaml', platform: 'render' },
      { file: 'vercel.json', platform: 'vercel' },
      { file: 'netlify.toml', platform: 'netlify' },
      { file: 'docker-compose.yml', platform: 'docker' },
      { file: 'docker-compose.yaml', platform: 'docker' },
      { file: 'fly.toml', platform: 'fly' },
      { file: 'railway.json', platform: 'railway' },
      { file: '.github/workflows/deploy.yml', platform: 'github-actions' }
    ];

    const result = {
      detected: [],
      configs: {}
    };

    for (const { file, platform } of deploymentFiles) {
      try {
        const content = await this.getFileContent(file);
        result.detected.push(platform);
        result.configs[platform] = {
          file,
          content,
          parsed: this._parseConfig(content, file)
        };
      } catch {
        // File not found, skip
      }
    }

    this.cache.deploymentConfig = result;
    return result;
  }

  /**
   * Parse user schema from database migrations
   * Looks for user roles, permissions, and table relationships
   * @returns {Promise<Object>} Parsed user schema
   */
  async parseUserSchema() {
    const schema = {
      tables: [],
      roles: [],
      permissions: [],
      dataDomains: {}
    };

    // Look for migration files
    const migrationPaths = [
      'server/migrations',
      'migrations',
      'db/migrations',
      'database/migrations'
    ];

    for (const migrationPath of migrationPaths) {
      try {
        const { items } = await this.getRepoStructure(migrationPath);
        const sqlFiles = items.filter(item =>
          item.type === 'file' && item.name.endsWith('.sql')
        );

        for (const file of sqlFiles) {
          try {
            const content = await this.getFileContent(file.path);
            const parsed = this._parseMigration(content);
            schema.tables.push(...parsed.tables);
            schema.roles.push(...parsed.roles);
          } catch {
            // Skip files we can't read
          }
        }
        break; // Found migrations directory
      } catch {
        // Try next path
      }
    }

    // Look for route files to find role references
    const routePaths = [
      'server/routes',
      'routes',
      'api/routes',
      'src/routes'
    ];

    for (const routePath of routePaths) {
      try {
        const { items } = await this.getRepoStructure(routePath);
        const jsFiles = items.filter(item =>
          item.type === 'file' && (item.name.endsWith('.js') || item.name.endsWith('.ts'))
        );

        for (const file of jsFiles) {
          try {
            const content = await this.getFileContent(file.path);
            const parsed = this._parseRouteFile(content);
            schema.permissions.push(...parsed.permissions);
          } catch {
            // Skip files we can't read
          }
        }
        break;
      } catch {
        // Try next path
      }
    }

    // Categorize tables into data domains
    schema.dataDomains = this._categorizeDataDomains(schema.tables);

    this.cache.userSchema = schema;
    return schema;
  }

  /**
   * Get current branch information
   * @returns {Promise<Object>} Branch info
   */
  async getCurrentBranch() {
    try {
      const repoInfo = await this.github.testConnection();
      return {
        defaultBranch: repoInfo.default_branch,
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        private: repoInfo.private,
        updatedAt: repoInfo.updated_at
      };
    } catch (error) {
      throw new Error(`Failed to get branch info: ${error.message}`);
    }
  }

  /**
   * Perform full repository analysis
   * @returns {Promise<Object>} Complete analysis results
   */
  async analyzeRepo() {
    const analysis = {
      timestamp: new Date().toISOString(),
      branch: null,
      recentCommits: [],
      deploymentConfig: null,
      userSchema: null,
      errors: []
    };

    // Get branch info
    try {
      analysis.branch = await this.getCurrentBranch();
    } catch (error) {
      analysis.errors.push({ step: 'branch', error: error.message });
    }

    // Get recent commits
    try {
      analysis.recentCommits = await this.getRecentCommits();
    } catch (error) {
      analysis.errors.push({ step: 'commits', error: error.message });
    }

    // Detect deployment config
    try {
      analysis.deploymentConfig = await this.detectDeploymentConfig();
    } catch (error) {
      analysis.errors.push({ step: 'deploymentConfig', error: error.message });
    }

    // Parse user schema
    try {
      analysis.userSchema = await this.parseUserSchema();
    } catch (error) {
      analysis.errors.push({ step: 'userSchema', error: error.message });
    }

    return analysis;
  }

  // Private helper methods

  _parseConfig(content, filename) {
    try {
      if (filename.endsWith('.json')) {
        return JSON.parse(content);
      } else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        // Basic YAML parsing for common patterns
        return this._parseBasicYaml(content);
      } else if (filename.endsWith('.toml')) {
        // Basic TOML parsing
        return this._parseBasicToml(content);
      }
    } catch {
      return null;
    }
    return null;
  }

  _parseBasicYaml(content) {
    // Very basic YAML parser for simple structures
    const result = {};
    const lines = content.split('\n');
    let currentKey = null;
    let currentIndent = 0;

    for (const line of lines) {
      if (line.trim().startsWith('#') || !line.trim()) continue;

      const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (match) {
        const indent = match[1].length;
        const key = match[2];
        const value = match[3].trim();

        if (indent === 0) {
          currentKey = key;
          result[key] = value || {};
        } else if (currentKey && value) {
          if (typeof result[currentKey] === 'object') {
            result[currentKey][key] = value;
          }
        }
      }
    }
    return result;
  }

  _parseBasicToml(content) {
    const result = {};
    const lines = content.split('\n');
    let currentSection = null;

    for (const line of lines) {
      if (line.trim().startsWith('#') || !line.trim()) continue;

      const sectionMatch = line.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        result[currentSection] = {};
        continue;
      }

      const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1];
        let value = kvMatch[2].trim();
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');

        if (currentSection) {
          result[currentSection][key] = value;
        } else {
          result[key] = value;
        }
      }
    }
    return result;
  }

  _parseMigration(content) {
    const result = {
      tables: [],
      roles: []
    };

    // Find CREATE TABLE statements
    const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?/gi);
    for (const match of tableMatches) {
      result.tables.push(match[1]);
    }

    // Find role-related columns (is_admin, is_provider, role, etc.)
    const rolePatterns = [
      /is_admin\s+BOOLEAN/gi,
      /is_provider\s+BOOLEAN/gi,
      /is_front_desk\s+BOOLEAN/gi,
      /is_billing\s+BOOLEAN/gi,
      /is_support\s+BOOLEAN/gi,
      /role\s+VARCHAR/gi,
      /user_role\s+VARCHAR/gi
    ];

    for (const pattern of rolePatterns) {
      if (pattern.test(content)) {
        const roleName = pattern.source.split('\\s')[0].replace(/\\/g, '');
        result.roles.push(roleName);
      }
    }

    // Look for role enum or type definitions
    const enumMatch = content.match(/CREATE\s+TYPE\s+user_role\s+AS\s+ENUM\s*\(([^)]+)\)/i);
    if (enumMatch) {
      const enumValues = enumMatch[1].match(/'([^']+)'/g);
      if (enumValues) {
        result.roles.push(...enumValues.map(v => v.replace(/'/g, '')));
      }
    }

    return result;
  }

  _parseRouteFile(content) {
    const result = {
      permissions: []
    };

    // Find requireRole middleware patterns
    const roleChecks = content.matchAll(/requireRole\s*\(\s*\[?([^\])]+)\]?\s*\)/g);
    for (const match of roleChecks) {
      const roles = match[1].split(',').map(r => r.trim().replace(/['"`]/g, ''));
      result.permissions.push(...roles);
    }

    // Find checkRole patterns
    const checkPatterns = content.matchAll(/checkRole\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of checkPatterns) {
      result.permissions.push(match[1]);
    }

    // Find authorization middleware patterns
    const authPatterns = content.matchAll(/req\.user\.(is_\w+)\s*(===|!==|&&|\|\|)/g);
    for (const match of authPatterns) {
      result.permissions.push(match[1]);
    }

    return result;
  }

  _categorizeDataDomains(tables) {
    const domains = {
      patient_records: [],
      financial_data: [],
      admin_functions: [],
      clinical_data: [],
      scheduling: [],
      other: []
    };

    const domainPatterns = {
      patient_records: /patient|session_note|medical|prescription|diagnosis|treatment|consent/i,
      financial_data: /claim|payment|billing|invoice|insurance|edi|remittance|transaction/i,
      admin_functions: /user|practice|setting|config|audit|log|permission|role/i,
      clinical_data: /provider|service|session|assessment|treatment_plan|note/i,
      scheduling: /appointment|schedule|availability|slot|calendar/i
    };

    for (const table of tables) {
      let categorized = false;
      for (const [domain, pattern] of Object.entries(domainPatterns)) {
        if (pattern.test(table)) {
          domains[domain].push(table);
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        domains.other.push(table);
      }
    }

    return domains;
  }
}

export default GitHubRepoAnalyzer;
