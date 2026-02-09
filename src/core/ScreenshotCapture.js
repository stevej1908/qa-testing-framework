// ScreenshotCapture - Captures and manages screenshots during testing
import { v4 as uuidv4 } from 'uuid';

export class ScreenshotCapture {
  constructor(config = {}) {
    this.config = config;
    this.screenshots = [];
    this.captureMethod = config.captureMethod || 'html2canvas';
  }

  // Capture screenshot of current viewport
  async captureViewport(options = {}) {
    const screenshot = {
      id: uuidv4(),
      type: 'viewport',
      capturedAt: new Date().toISOString(),
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      label: options.label || null,
      checkpointId: options.checkpointId || null,
      phase: options.phase || 'after', // 'before' or 'after'
      data: null
    };

    try {
      if (this.captureMethod === 'html2canvas' && window.html2canvas) {
        const canvas = await window.html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          scrollY: -window.scrollY
        });
        screenshot.data = canvas.toDataURL('image/png');
      } else {
        // Fallback: create a placeholder indicating capture is needed
        screenshot.data = await this.createPlaceholder('Viewport capture pending');
      }

      screenshot.success = true;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      screenshot.success = false;
      screenshot.error = error.message;
    }

    this.screenshots.push(screenshot);
    return screenshot;
  }

  // Capture screenshot of specific element
  async captureElement(selector, options = {}) {
    const element = document.querySelector(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const screenshot = {
      id: uuidv4(),
      type: 'element',
      selector,
      capturedAt: new Date().toISOString(),
      url: window.location.href,
      bounds: element.getBoundingClientRect(),
      label: options.label || null,
      checkpointId: options.checkpointId || null,
      phase: options.phase || 'after',
      data: null
    };

    try {
      if (this.captureMethod === 'html2canvas' && window.html2canvas) {
        const canvas = await window.html2canvas(element, {
          useCORS: true,
          allowTaint: true
        });
        screenshot.data = canvas.toDataURL('image/png');
      } else {
        screenshot.data = await this.createPlaceholder(`Element: ${selector}`);
      }

      screenshot.success = true;
    } catch (error) {
      console.error('Element screenshot failed:', error);
      screenshot.success = false;
      screenshot.error = error.message;
    }

    this.screenshots.push(screenshot);
    return screenshot;
  }

  // Create placeholder image
  async createPlaceholder(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 200);

    // Border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 398, 198);

    // Text
    ctx.fillStyle = '#666';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 200, 100);
    ctx.fillText(new Date().toLocaleString(), 200, 120);

    return canvas.toDataURL('image/png');
  }

  // Capture before/after pair
  async captureBeforeAfter(options = {}) {
    const before = await this.captureViewport({
      ...options,
      phase: 'before',
      label: options.label ? `${options.label} (Before)` : 'Before'
    });

    return {
      before,
      captureAfter: async () => {
        const after = await this.captureViewport({
          ...options,
          phase: 'after',
          label: options.label ? `${options.label} (After)` : 'After'
        });

        return {
          before,
          after,
          checkpointId: options.checkpointId,
          capturedAt: new Date().toISOString()
        };
      }
    };
  }

  // Get screenshots for checkpoint
  getScreenshotsForCheckpoint(checkpointId) {
    return this.screenshots.filter(s => s.checkpointId === checkpointId);
  }

  // Get all successful screenshots
  getSuccessfulScreenshots() {
    return this.screenshots.filter(s => s.success);
  }

  // Save screenshots to storage
  async saveToStorage(storageKey = 'test-screenshots') {
    const data = {
      savedAt: new Date().toISOString(),
      count: this.screenshots.length,
      screenshots: this.screenshots
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save screenshots:', error);
      return false;
    }
  }

  // Load screenshots from storage
  loadFromStorage(storageKey = 'test-screenshots') {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      if (data && data.screenshots) {
        this.screenshots = data.screenshots;
        return data;
      }
    } catch (error) {
      console.error('Failed to load screenshots:', error);
    }
    return null;
  }

  // Export screenshots as ZIP (browser-side)
  async exportAsZip() {
    // This would require a library like JSZip
    // For now, return data that can be processed
    return {
      exportedAt: new Date().toISOString(),
      format: 'json',
      screenshots: this.screenshots.map(s => ({
        id: s.id,
        label: s.label,
        phase: s.phase,
        checkpointId: s.checkpointId,
        data: s.data
      }))
    };
  }

  // Clear all screenshots
  clear() {
    this.screenshots = [];
  }

  // Get screenshot by ID
  getScreenshot(id) {
    return this.screenshots.find(s => s.id === id);
  }

  // Delete screenshot
  deleteScreenshot(id) {
    const index = this.screenshots.findIndex(s => s.id === id);
    if (index > -1) {
      this.screenshots.splice(index, 1);
      return true;
    }
    return false;
  }
}

export default ScreenshotCapture;
