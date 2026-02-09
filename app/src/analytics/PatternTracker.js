/**
 * PatternTracker - Analyzes test results to identify patterns and learn from mistakes
 *
 * Features:
 * - Track failure patterns across sessions
 * - Identify frequently failing checkpoints
 * - Analyze blocker trends
 * - Provide insights and recommendations
 */

import { getSessions, getResultsBySession } from '../storage/TestArtifactStore';

// Local storage key for pattern data
const PATTERN_STORAGE_KEY = 'tf_pattern_data';

/**
 * Load pattern data from localStorage
 */
function loadPatternData() {
  try {
    const data = localStorage.getItem(PATTERN_STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultPatternData();
  } catch {
    return getDefaultPatternData();
  }
}

/**
 * Save pattern data to localStorage
 */
function savePatternData(data) {
  try {
    localStorage.setItem(PATTERN_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save pattern data:', err);
  }
}

/**
 * Get default pattern data structure
 */
function getDefaultPatternData() {
  return {
    checkpoints: {}, // checkpointId -> { passes, fails, lastSeen, issues }
    specs: {}, // specId -> { sessions, avgPassRate, lastTested }
    issues: [], // Array of { description, checkpointId, timestamp, resolved }
    trends: {
      dailyStats: {}, // date -> { sessions, passed, failed }
      weeklyPassRate: []
    },
    lastUpdated: null
  };
}

/**
 * Analyze all sessions and update pattern data
 * @returns {Promise<Object>} Updated pattern analysis
 */
export async function analyzePatterns() {
  const sessions = await getSessions();
  const patternData = getDefaultPatternData();

  for (const session of sessions) {
    if (session.status !== 'completed') continue;

    const results = await getResultsBySession(session.id);

    // Update spec stats
    if (!patternData.specs[session.specId]) {
      patternData.specs[session.specId] = {
        specName: session.specName,
        sessions: 0,
        totalPassed: 0,
        totalFailed: 0,
        avgPassRate: 0,
        lastTested: null
      };
    }

    const specStats = patternData.specs[session.specId];
    specStats.sessions++;
    specStats.totalPassed += session.passed;
    specStats.totalFailed += session.failed;
    specStats.avgPassRate = Math.round(
      (specStats.totalPassed / (specStats.totalPassed + specStats.totalFailed)) * 100
    );
    specStats.lastTested = session.updatedAt;

    // Update checkpoint stats
    for (const result of results) {
      const cpId = result.checkpointId;

      if (!patternData.checkpoints[cpId]) {
        patternData.checkpoints[cpId] = {
          specId: session.specId,
          passes: 0,
          fails: 0,
          failRate: 0,
          lastSeen: null,
          recentIssues: []
        };
      }

      const cpStats = patternData.checkpoints[cpId];
      cpStats.lastSeen = result.timestamp;

      if (result.status === 'passed') {
        cpStats.passes++;
      } else if (result.status === 'failed') {
        cpStats.fails++;

        // Track the issue
        if (result.feedback) {
          cpStats.recentIssues.push({
            description: result.feedback.description,
            priority: result.feedback.priority,
            timestamp: result.timestamp
          });
          // Keep only last 5 issues
          if (cpStats.recentIssues.length > 5) {
            cpStats.recentIssues = cpStats.recentIssues.slice(-5);
          }

          // Add to global issues list
          patternData.issues.push({
            checkpointId: cpId,
            specId: session.specId,
            description: result.feedback.description,
            priority: result.feedback.priority,
            timestamp: result.timestamp,
            githubIssue: result.githubIssue
          });
        }
      }

      cpStats.failRate = cpStats.passes + cpStats.fails > 0
        ? Math.round((cpStats.fails / (cpStats.passes + cpStats.fails)) * 100)
        : 0;
    }

    // Update daily stats
    const date = session.updatedAt.split('T')[0];
    if (!patternData.trends.dailyStats[date]) {
      patternData.trends.dailyStats[date] = { sessions: 0, passed: 0, failed: 0 };
    }
    patternData.trends.dailyStats[date].sessions++;
    patternData.trends.dailyStats[date].passed += session.passed;
    patternData.trends.dailyStats[date].failed += session.failed;
  }

  // Keep only last 50 issues
  patternData.issues = patternData.issues.slice(-50);

  patternData.lastUpdated = new Date().toISOString();
  savePatternData(patternData);

  return patternData;
}

/**
 * Get frequently failing checkpoints
 * @param {number} minFailRate - Minimum fail rate to include (default 30%)
 * @param {number} limit - Max number of results
 * @returns {Promise<Array>} Array of problematic checkpoints
 */
export async function getProblematicCheckpoints(minFailRate = 30, limit = 10) {
  const patterns = await analyzePatterns();

  const problematic = Object.entries(patterns.checkpoints)
    .filter(([_, stats]) => stats.failRate >= minFailRate && stats.fails >= 2)
    .map(([id, stats]) => ({
      checkpointId: id,
      ...stats
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, limit);

  return problematic;
}

/**
 * Get spec performance summary
 * @returns {Promise<Array>} Array of spec performance data
 */
export async function getSpecPerformance() {
  const patterns = await analyzePatterns();

  return Object.entries(patterns.specs)
    .map(([id, stats]) => ({
      specId: id,
      ...stats
    }))
    .sort((a, b) => a.avgPassRate - b.avgPassRate);
}

/**
 * Get recent issues/blockers
 * @param {number} limit - Max number of results
 * @returns {Promise<Array>} Recent issues
 */
export async function getRecentIssues(limit = 20) {
  const patterns = await analyzePatterns();

  return patterns.issues
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

/**
 * Get testing trends over time
 * @param {number} days - Number of days to include
 * @returns {Promise<Object>} Trend data
 */
export async function getTrends(days = 14) {
  const patterns = await analyzePatterns();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const dailyData = [];
  const dates = Object.keys(patterns.trends.dailyStats).sort();

  for (const date of dates) {
    if (new Date(date) >= cutoff) {
      const stats = patterns.trends.dailyStats[date];
      dailyData.push({
        date,
        ...stats,
        passRate: stats.passed + stats.failed > 0
          ? Math.round((stats.passed / (stats.passed + stats.failed)) * 100)
          : 0
      });
    }
  }

  // Calculate overall trend
  const recentData = dailyData.slice(-7);
  const olderData = dailyData.slice(-14, -7);

  const recentAvg = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.passRate, 0) / recentData.length
    : 0;
  const olderAvg = olderData.length > 0
    ? olderData.reduce((sum, d) => sum + d.passRate, 0) / olderData.length
    : 0;

  const trendDirection = recentAvg > olderAvg ? 'improving' :
                         recentAvg < olderAvg ? 'declining' : 'stable';

  return {
    dailyData,
    summary: {
      totalSessions: dailyData.reduce((sum, d) => sum + d.sessions, 0),
      totalPassed: dailyData.reduce((sum, d) => sum + d.passed, 0),
      totalFailed: dailyData.reduce((sum, d) => sum + d.failed, 0),
      avgPassRate: Math.round(recentAvg),
      trend: trendDirection,
      trendDelta: Math.round(recentAvg - olderAvg)
    }
  };
}

/**
 * Get insights and recommendations based on patterns
 * @returns {Promise<Array>} Array of insight objects
 */
export async function getInsights() {
  const patterns = await analyzePatterns();
  const insights = [];

  // Check for frequently failing checkpoints
  const problematic = Object.entries(patterns.checkpoints)
    .filter(([_, stats]) => stats.failRate >= 50 && stats.fails >= 3);

  if (problematic.length > 0) {
    insights.push({
      type: 'warning',
      title: 'High Failure Rate Checkpoints',
      message: `${problematic.length} checkpoint(s) fail more than 50% of the time. Consider reviewing these areas.`,
      checkpoints: problematic.map(([id]) => id),
      priority: 'high'
    });
  }

  // Check for specs that haven't been tested recently
  const staleSpecs = Object.entries(patterns.specs)
    .filter(([_, stats]) => {
      if (!stats.lastTested) return true;
      const daysSince = (Date.now() - new Date(stats.lastTested)) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    });

  if (staleSpecs.length > 0) {
    insights.push({
      type: 'info',
      title: 'Specs Need Testing',
      message: `${staleSpecs.length} spec(s) haven't been tested in over a week.`,
      specs: staleSpecs.map(([id, stats]) => ({ id, name: stats.specName })),
      priority: 'medium'
    });
  }

  // Check for improvement trend
  const trends = await getTrends(14);
  if (trends.summary.trend === 'improving' && trends.summary.trendDelta > 10) {
    insights.push({
      type: 'success',
      title: 'Quality Improving',
      message: `Pass rate has improved by ${trends.summary.trendDelta}% over the last week!`,
      priority: 'low'
    });
  } else if (trends.summary.trend === 'declining' && trends.summary.trendDelta < -10) {
    insights.push({
      type: 'warning',
      title: 'Quality Declining',
      message: `Pass rate has dropped by ${Math.abs(trends.summary.trendDelta)}% over the last week.`,
      priority: 'high'
    });
  }

  // Check for unresolved blockers
  const unresolvedBlockers = patterns.issues.filter(
    i => i.priority === 'blocker' && !i.githubIssue
  );

  if (unresolvedBlockers.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Untracked Blockers',
      message: `${unresolvedBlockers.length} blocker(s) don't have GitHub issues. Consider creating issues for tracking.`,
      priority: 'medium'
    });
  }

  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Get a complete analytics summary
 * @returns {Promise<Object>} Complete analytics data
 */
export async function getAnalyticsSummary() {
  const [patterns, problematic, performance, recent, trends, insights] = await Promise.all([
    analyzePatterns(),
    getProblematicCheckpoints(),
    getSpecPerformance(),
    getRecentIssues(10),
    getTrends(14),
    getInsights()
  ]);

  return {
    lastUpdated: patterns.lastUpdated,
    overview: {
      totalSpecs: Object.keys(patterns.specs).length,
      totalCheckpoints: Object.keys(patterns.checkpoints).length,
      totalIssues: patterns.issues.length
    },
    problematicCheckpoints: problematic,
    specPerformance: performance,
    recentIssues: recent,
    trends,
    insights
  };
}

/**
 * Clear all pattern data
 */
export function clearPatternData() {
  localStorage.removeItem(PATTERN_STORAGE_KEY);
}

export default {
  analyzePatterns,
  getProblematicCheckpoints,
  getSpecPerformance,
  getRecentIssues,
  getTrends,
  getInsights,
  getAnalyticsSummary,
  clearPatternData
};
