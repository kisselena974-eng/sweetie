/**
 * Graph Slider Component
 * Handles the interactive time slider on the glucose graph
 */

class GraphSlider {
  constructor() {
    this.svg = null;
    this.sliderLine = null;
    this.sliderHitbox = null;
    this.sliderDot = null;
    this.timeLabel = null;
    this.graphPathBad = null;
    this.graphPathGood = null;

    // Graph boundaries
    this.minX = 28; // Middle of left button (x=10 + width/2) - slider can't go further left
    this.maxX = 206; // End of graph (now position)
    this.currentX = this.maxX;
    this.targetX = this.maxX;

    // Spring animation for smooth dot movement
    this.dotSpring = null;
    this.animationId = null;

    // Glucose boundaries (y coordinates)
    this.upperBoundaryY = 96;  // glucose = 10
    this.lowerBoundaryY = 156; // glucose = 4

    // Y range for glucose mapping
    this.minY = 50;   // top of graph area (high glucose ~15)
    this.maxY = 190;  // bottom of graph area (low glucose ~2)

    // Glucose range
    this.minGlucose = 2;
    this.maxGlucose = 15;

    // Store original path data
    this.originalPathData = null;

    // Dragging state
    this.isDragging = false;

    // Pan state for history reveal
    this.panOffset = 0;
    this.maxPanOffset = 200; // How far user can pan to reveal history
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartOffset = 0;

    // Current graph position (in graph coordinates, not viewport)
    this.currentGraphX = this.maxX; // Start at "now"

    // Combined path data (history + main)
    this.combinedPathData = null;

    // Context markers (meal, insulin, activity, med)
    this.contextMarkers = [];

    this.init();
  }

  init() {
    this.svg = document.querySelector('.graph-svg');
    this.sliderLine = document.querySelector('.graph-now-line');
    this.sliderHitbox = document.querySelector('.graph-slider-hitbox');
    this.sliderDot = document.querySelector('.graph-now-dot');
    this.timeLabel = document.querySelector('.graph-now-text');
    this.timeLine1 = document.querySelector('.graph-time-line1');
    this.timeLine2 = document.querySelector('.graph-time-line2');
    this.timeBg = document.querySelector('.graph-time-bg');
    this.graphLineBase = document.querySelector('.graph-line-base');
    this.graphLineHighlight = document.querySelector('.graph-line-highlight');
    this.segmentClipRect = document.querySelector('.segment-clip-rect');
    this.panGroup = document.querySelector('.graph-pan-group');
    this.historyLine = document.querySelector('.graph-line-history');
    this.markersGroup = document.querySelector('.graph-context-markers');

    // Default Y position for time label (below lower boundary)
    this.defaultTimeLabelY = 172;

    if (!this.svg || !this.sliderLine || !this.sliderDot) {
      console.warn('Graph slider elements not found');
      return;
    }

    // Store original path for reference
    this.originalPathData = this.graphLineBase?.getAttribute('d');

    // Sample the combined path to get Y values for any X
    this.samplePath();

    // Generate history path (needs pathSamples to connect properly)
    this.generateHistoryPath();

    // Sample history path and create combined samples
    this.sampleHistoryPath();

    // Find boundary crossing points
    this.findBoundaryCrossings();

    // Make slider interactive
    this.setupDragEvents();

    // Setup pan events for history reveal
    this.setupPanEvents();

    // Initialize spring for smooth dot animation
    this.initDotSpring();

    // Initialize colors for current position (immediate, no animation)
    this.updateSliderPosition(this.currentX, true);
  }

  /**
   * Initialize spring animation for dot movement along curve
   */
  initDotSpring() {
    if (window.Spring && window.SpringPresets) {
      this.dotSpring = new Spring({
        ...SpringPresets.fast,
        initialValue: this.currentX,
        onUpdate: (x) => {
          this.renderDotAtX(x);
        }
      });
    }
  }

  /**
   * Render the dot and related elements at a specific X position (in graph coordinates)
   * Slider is now inside pan group, so coordinates are graph coordinates
   */
  renderDotAtX(x) {
    // Clamp X to graph coordinate range (where we have samples)
    const minGraphX = this.allSamples && this.allSamples.length > 0 ? this.allSamples[0].x : 0;
    const maxGraphX = this.allSamples && this.allSamples.length > 0 ? this.allSamples[this.allSamples.length - 1].x : this.maxX;

    // Also respect the slider visual bounds (can't go past left button area in viewport)
    // When panned, minX in viewport becomes minX - panOffset in graph coords
    const effectiveMinX = this.minX - this.panOffset;
    const effectiveMaxX = this.maxX - this.panOffset;

    let graphX = Math.max(Math.max(minGraphX, effectiveMinX), Math.min(Math.min(maxGraphX, effectiveMaxX), x));

    this.currentX = graphX + this.panOffset; // Store viewport position for compatibility
    this.currentGraphX = graphX;

    // Get Y position on the curve using graph coordinates
    const y = this.getYForX(graphX);

    // Calculate line bounds based on graph position (adjusted for pan)
    // lineBounds calculation uses viewport position for avoiding UI elements
    const viewportX = graphX + this.panOffset;
    const lineBounds = this.getLineBoundsForX(viewportX);

    // Update slider line position (in graph coordinates since inside pan group)
    this.sliderLine.setAttribute('x1', graphX);
    this.sliderLine.setAttribute('x2', graphX);
    this.sliderLine.setAttribute('y1', lineBounds.y1);
    this.sliderLine.setAttribute('y2', lineBounds.y2);

    // Update hitbox position
    if (this.sliderHitbox) {
      this.sliderHitbox.setAttribute('x1', graphX);
      this.sliderHitbox.setAttribute('x2', graphX);
      this.sliderHitbox.setAttribute('y1', lineBounds.y1);
      this.sliderHitbox.setAttribute('y2', lineBounds.y2);
    }

    // Update dot position (in graph coordinates)
    this.sliderDot.setAttribute('cx', graphX);
    this.sliderDot.setAttribute('cy', y);

    // Update time label (in graph coordinates)
    this.updateTimeLabel(graphX, y, graphX);

    // Calculate glucose and update colors
    const glucose = this.yToGlucose(y);
    const isLow = y > this.lowerBoundaryY;
    const isHigh = y < this.upperBoundaryY;
    const isDanger = isLow || isHigh;

    // At "now" position (graphX at maxX), let app.js handle all accent colors
    // This ensures all colors (text, graph, arrow) transition together with CSS
    const isAtNow = Math.abs(graphX - this.maxX) < 5;
    if (!isAtNow) {
      // Only update colors when viewing historical positions
      // Use graphX for segment lookup (segments are in graph coordinates)
      this.updateColors(graphX, y, isDanger, isLow);
    } else {
      // Still update clip-path at "now" position for proper segment display
      this.updateClipPath(graphX, y);
    }

    // Update context markers color based on position (grey when not at "now")
    if (this.contextMarkers.length > 0) {
      const wasAtNow = this._wasAtNow !== undefined ? this._wasAtNow : true;
      if (wasAtNow !== isAtNow) {
        this.renderContextMarkers();
      }
      this._wasAtNow = isAtNow;
    }

    this.updateGlucoseDisplay(glucose, isDanger);
  }

  /**
   * Update time label position and text
   * @param {number} x - Viewport X position
   * @param {number} y - Y position
   * @param {number} graphX - Graph coordinate X (for time calculation)
   */
  updateTimeLabel(x, y, graphX) {
    // Use graphX for time calculation (how far back in history)
    const fuzzyTime = this.getFuzzyTime(graphX);
    if (this.timeLine1 && this.timeLine2) {
      this.timeLine1.textContent = fuzzyTime.line1;
      this.timeLine2.textContent = fuzzyTime.line2;
      this.timeLine1.setAttribute('x', x);
      this.timeLine2.setAttribute('x', x);
    }

    // Position time label - sample nearby graph coordinates
    const safeMargin = 8;
    let maxY = y;
    const minGraphX = this.allSamples ? this.allSamples[0].x : 0;
    const maxGraphX = this.allSamples ? this.allSamples[this.allSamples.length - 1].x : this.maxX;
    for (let sampleGX = Math.max(graphX - 25, minGraphX); sampleGX <= Math.min(graphX + 25, maxGraphX); sampleGX += 3) {
      const sampleY = this.getYForX(sampleGX);
      if (sampleY > maxY) maxY = sampleY;
    }

    const minTextY = maxY + safeMargin;
    let textY = this.defaultTimeLabelY;
    if (minTextY > this.defaultTimeLabelY - 5) {
      textY = minTextY + 5;
    }
    textY = Math.min(textY, 210);

    this.timeLabel.setAttribute('y', textY);
    this.timeLabel.setAttribute('x', x);

    // Update background rect (tight fit around text)
    if (this.timeBg) {
      let bgWidth, bgHeight, bgYOffset;

      if (fuzzyTime.line2) {
        bgWidth = 36;
        bgHeight = 24;
        bgYOffset = 8;
      } else if (fuzzyTime.line1 === 'now' || fuzzyTime.line1 === 'sada') {
        bgWidth = 26;
        bgHeight = 14;
        bgYOffset = 10;
      } else if (fuzzyTime.line1 === 'just now' || fuzzyTime.line1 === 'upravo') {
        bgWidth = 40;
        bgHeight = 14;
        bgYOffset = 10;
      } else {
        bgWidth = 52;
        bgHeight = 14;
        bgYOffset = 10;
      }

      this.timeBg.setAttribute('x', x - bgWidth / 2);
      this.timeBg.setAttribute('y', textY - bgYOffset);
      this.timeBg.setAttribute('width', bgWidth);
      this.timeBg.setAttribute('height', bgHeight);
    }
  }

  /**
   * Animate dot to target X position using spring physics (in graph coordinates)
   */
  animateToX(targetX) {
    // Clamp to graph coordinate range
    const minGraphX = this.allSamples && this.allSamples.length > 0 ? this.allSamples[0].x : 0;
    const maxGraphX = this.allSamples && this.allSamples.length > 0 ? this.allSamples[this.allSamples.length - 1].x : this.maxX;

    // Also respect viewport bounds (adjusted for pan)
    const effectiveMinX = this.minX - this.panOffset;
    const effectiveMaxX = this.maxX - this.panOffset;

    targetX = Math.max(Math.max(minGraphX, effectiveMinX), Math.min(Math.min(maxGraphX, effectiveMaxX), targetX));
    this.targetX = targetX;

    if (this.dotSpring) {
      this.dotSpring.setTarget(targetX);
    } else {
      // Fallback: direct update without spring
      this.renderDotAtX(targetX);
    }
  }

  /**
   * Sample the path to create a lookup table of Y values for X positions
   */
  samplePath() {
    this.pathSamples = [];

    // Create a temporary path element
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', this.originalPathData);
    this.svg.appendChild(tempPath);

    const pathLength = tempPath.getTotalLength();
    const numSamples = 200;

    for (let i = 0; i <= numSamples; i++) {
      const point = tempPath.getPointAtLength((i / numSamples) * pathLength);
      this.pathSamples.push({ x: point.x, y: point.y });
    }

    // Sort by X for easier lookup
    this.pathSamples.sort((a, b) => a.x - b.x);

    // Remove temp path
    tempPath.remove();
  }

  /**
   * Sample the combined path (history + main) for Y lookups
   */
  sampleHistoryPath() {
    if (!this.combinedPathData) return;

    this.allSamples = [];

    // Create a temporary path element with combined data
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', this.combinedPathData);
    this.svg.appendChild(tempPath);

    const pathLength = tempPath.getTotalLength();
    const numSamples = 300; // More samples for combined path

    for (let i = 0; i <= numSamples; i++) {
      const point = tempPath.getPointAtLength((i / numSamples) * pathLength);
      this.allSamples.push({ x: point.x, y: point.y });
    }

    // Sort by X
    this.allSamples.sort((a, b) => a.x - b.x);

    // Remove temp path
    tempPath.remove();
  }

  /**
   * Find X coordinates where the graph crosses boundary lines
   * Includes warning zone boundaries - uses combined samples (history + main)
   */
  findBoundaryCrossings() {
    this.boundaryCrossings = [];

    // Use combined samples if available
    const samples = this.allSamples && this.allSamples.length > 0
      ? this.allSamples
      : this.pathSamples;

    // All boundary Y values
    const boundaries = [
      { y: 96, name: 'danger-high' },    // glucose = 10
      { y: 106, name: 'warning-high' },  // glucose = 9
      { y: 151, name: 'warning-low' },   // glucose = 4.5
      { y: 156, name: 'danger-low' }     // glucose = 4
    ];

    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];

      for (const boundary of boundaries) {
        if ((prev.y < boundary.y && curr.y >= boundary.y) ||
            (prev.y >= boundary.y && curr.y < boundary.y)) {
          const t = (boundary.y - prev.y) / (curr.y - prev.y);
          const crossX = prev.x + t * (curr.x - prev.x);
          this.boundaryCrossings.push({ x: crossX, y: boundary.y, boundary: boundary.name });
        }
      }
    }

    // Sort by X position
    this.boundaryCrossings.sort((a, b) => a.x - b.x);

    // Build segments array
    this.buildSegments();
  }

  /**
   * Build segments between boundary crossings
   * Uses the full graph range (including history)
   */
  buildSegments() {
    this.segments = [];

    // Start from the beginning of the combined graph (history start)
    const graphStartX = this.allSamples && this.allSamples.length > 0
      ? this.allSamples[0].x
      : this.minX;
    const graphEndX = this.allSamples && this.allSamples.length > 0
      ? this.allSamples[this.allSamples.length - 1].x
      : this.maxX;

    let lastX = graphStartX;

    for (const crossing of this.boundaryCrossings) {
      // Determine zone type based on the Y at midpoint
      const midX = (lastX + crossing.x) / 2;
      let midY = this.getYForX(midX);

      const zone = this.getZoneNameForY(midY);

      this.segments.push({
        startX: lastX,
        endX: crossing.x,
        zone: zone
      });

      lastX = crossing.x;
    }

    // Add final segment
    const midX = (lastX + graphEndX) / 2;
    let midY = this.getYForX(midX);
    const zone = this.getZoneNameForY(midY);

    this.segments.push({
      startX: lastX,
      endX: graphEndX,
      zone: zone
    });
  }

  /**
   * Get zone type for a Y coordinate
   */
  getZoneForY(y) {
    if (y < this.upperBoundaryY) return 'high';  // Above upper boundary (high glucose)
    if (y > this.lowerBoundaryY) return 'low';   // Below lower boundary (low glucose)
    return 'good';  // Between boundaries
  }

  /**
   * Get color for a Y coordinate with smooth transitions
   * Blending: 9.5-10 (y 96-101) and 4.0-4.5 (y 151-156)
   *
   * Y coordinates:
   * - y <= 96: Danger high (glucose >= 10)
   * - y 96-101: Blend yellow→red (glucose 9.5-10)
   * - y 101-106: Warning high, pure yellow (glucose 9-9.5)
   * - y 106-151: Safe (glucose 4.5-9)
   * - y 151-156: Blend yellow→red (glucose 4-4.5)
   * - y >= 156: Danger low (glucose <= 4)
   */
  getColorForY(y) {
    const COLORS = {
      safe: '#7ED321',
      warning: '#FFD700',
      danger: '#FF4444'
    };

    // Y boundaries for zones
    const DANGER_HIGH_Y = 96;    // glucose = 10
    const BLEND_HIGH_Y = 101;    // glucose = 9.5
    const WARNING_HIGH_Y = 106;  // glucose = 9
    const WARNING_LOW_Y = 151;   // glucose = 4.5
    const DANGER_LOW_Y = 156;    // glucose = 4

    // Danger zones (pure red)
    if (y <= DANGER_HIGH_Y || y >= DANGER_LOW_Y) {
      return COLORS.danger;
    }

    // Safe zone (pure green)
    if (y >= WARNING_HIGH_Y && y <= WARNING_LOW_Y) {
      return COLORS.safe;
    }

    // High warning zone (y 96-106, glucose 9-10)
    if (y > DANGER_HIGH_Y && y < WARNING_HIGH_Y) {
      if (y <= BLEND_HIGH_Y) {
        // Blend yellow to red (y 96-101, glucose 9.5-10)
        const t = (BLEND_HIGH_Y - y) / 5;
        return this.blendColors(COLORS.warning, COLORS.danger, t);
      }
      // Pure yellow (y 101-106, glucose 9-9.5)
      return COLORS.warning;
    }

    // Low warning zone (y 151-156, glucose 4-4.5) - blend throughout
    if (y > WARNING_LOW_Y && y < DANGER_LOW_Y) {
      // Blend yellow to red (as y increases / glucose decreases)
      const t = (y - WARNING_LOW_Y) / 5;
      return this.blendColors(COLORS.warning, COLORS.danger, t);
    }

    return COLORS.safe;
  }

  /**
   * Blend two hex colors
   * @param {string} color1 - First hex color
   * @param {string} color2 - Second hex color
   * @param {number} t - Blend factor (0 = color1, 1 = color2)
   */
  blendColors(color1, color2, t) {
    // Parse hex colors
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    // Return hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Get zone name for color (for segment clipping)
   */
  getZoneNameForY(y) {
    const DANGER_HIGH_Y = 96;
    const WARNING_HIGH_Y = 106;
    const WARNING_LOW_Y = 151;
    const DANGER_LOW_Y = 156;

    if (y < DANGER_HIGH_Y) return 'danger-high';
    if (y <= WARNING_HIGH_Y) return 'warning-high';
    if (y < WARNING_LOW_Y) return 'safe';
    if (y <= DANGER_LOW_Y) return 'warning-low';
    return 'danger-low';
  }

  /**
   * Get the segment that contains a given X position
   */
  getSegmentForX(x) {
    for (const segment of this.segments) {
      if (x >= segment.startX && x <= segment.endX) {
        return segment;
      }
    }
    return this.segments[this.segments.length - 1]; // Default to last segment
  }

  /**
   * Get Y value on the path for a given X (in graph coordinates)
   * Uses combined samples (history + main) when available
   */
  getYForX(x) {
    // Use combined samples if available, otherwise just main path
    const samples = this.allSamples && this.allSamples.length > 0
      ? this.allSamples
      : this.pathSamples;

    // Find the two samples that bracket this X
    let lower = samples[0];
    let upper = samples[samples.length - 1];

    for (let i = 0; i < samples.length - 1; i++) {
      if (samples[i].x <= x && samples[i + 1].x >= x) {
        lower = samples[i];
        upper = samples[i + 1];
        break;
      }
    }

    // Linear interpolation
    if (upper.x === lower.x) return lower.y;
    const t = (x - lower.x) / (upper.x - lower.x);
    return lower.y + t * (upper.y - lower.y);
  }

  /**
   * Convert Y coordinate to glucose value
   * Calibrated so y=96 → glucose=10 and y=156 → glucose=4
   */
  yToGlucose(y) {
    // Linear mapping based on boundary lines
    // Upper boundary: y=96 → glucose=10
    // Lower boundary: y=156 → glucose=4
    // Rate: (10-4)/(156-96) = 6/60 = 0.1 glucose per pixel
    const glucosePerPixel = 6 / 60; // 0.1
    return 10 - (y - this.upperBoundaryY) * glucosePerPixel;
  }

  /**
   * Get fuzzy time text based on slider position (in graph coordinates)
   * Returns object with line1 and line2 - uses two lines only for longer text
   * Graph extends from -200 (oldest history) to 206 (now)
   */
  getFuzzyTime(graphX) {
    // Calculate distance from "now" position (206)
    // Total range is -200 to 206 = 406 units representing ~12 hours
    const distanceFromNow = this.maxX - graphX;
    const minutesAgo = (distanceFromNow / 406) * 720; // 720 minutes = 12 hours

    const lang = localStorage.getItem('sweetie-lang') || 'en';

    if (lang === 'hr') {
      // Croatian fuzzy time
      if (minutesAgo < 1) return { line1: 'sada', line2: '' };
      if (minutesAgo < 5) return { line1: 'upravo', line2: '' };
      if (minutesAgo < 30) return { line1: 'par min', line2: 'prije' };
      if (minutesAgo < 60) return { line1: 'prije 30 min', line2: '' };
      if (minutesAgo < 120) return { line1: 'prije 1 h', line2: '' };
      if (minutesAgo < 180) return { line1: 'prije 2 h', line2: '' };
      if (minutesAgo < 240) return { line1: 'prije 3 h', line2: '' };
      if (minutesAgo < 300) return { line1: 'prije 4 h', line2: '' };
      if (minutesAgo < 360) return { line1: 'prije 5 h', line2: '' };
      if (minutesAgo < 420) return { line1: 'prije 6 h', line2: '' };
      if (minutesAgo < 480) return { line1: 'prije 7 h', line2: '' };
      if (minutesAgo < 540) return { line1: 'prije 8 h', line2: '' };
      if (minutesAgo < 600) return { line1: 'prije 9 h', line2: '' };
      if (minutesAgo < 660) return { line1: 'prije 10 h', line2: '' };
      if (minutesAgo < 720) return { line1: 'prije 11 h', line2: '' };
      return { line1: 'prije 12 h', line2: '' };
    } else {
      // English fuzzy time
      if (minutesAgo < 1) return { line1: 'now', line2: '' };
      if (minutesAgo < 5) return { line1: 'just now', line2: '' };
      if (minutesAgo < 30) return { line1: 'few min', line2: 'ago' };
      if (minutesAgo < 60) return { line1: '30 min ago', line2: '' };
      if (minutesAgo < 120) return { line1: '1 h ago', line2: '' };
      if (minutesAgo < 180) return { line1: '2 h ago', line2: '' };
      if (minutesAgo < 240) return { line1: '3 h ago', line2: '' };
      if (minutesAgo < 300) return { line1: '4 h ago', line2: '' };
      if (minutesAgo < 360) return { line1: '5 h ago', line2: '' };
      if (minutesAgo < 420) return { line1: '6 h ago', line2: '' };
      if (minutesAgo < 480) return { line1: '7 h ago', line2: '' };
      if (minutesAgo < 540) return { line1: '8 h ago', line2: '' };
      if (minutesAgo < 600) return { line1: '9 h ago', line2: '' };
      if (minutesAgo < 660) return { line1: '10 h ago', line2: '' };
      if (minutesAgo < 720) return { line1: '11 h ago', line2: '' };
      return { line1: '12 h ago', line2: '' };
    }
  }

  /**
   * Calculate the Y bounds for the dashed line based on X position
   * Line goes edge-to-edge by default, but smoothly avoids obstacles:
   * - Time display at top (follows curved arc)
   * - Glucose value at bottom (follows curved arc)
   * Transition starts only when line reaches the element
   */
  getLineBoundsForX(x) {
    const centerX = 126;
    const centerY = 126;
    const arcRadius = 111; // Nav circle radius (where time and glucose sit)

    let y1 = 0;   // Default: top edge of screen
    let y2 = 252; // Default: bottom edge of screen

    // Smooth interpolation function (ease in-out)
    const smoothstep = (t) => t * t * (3 - 2 * t);

    const transitionWidth = 8; // Very small transition - starts right at the element
    const margin = 12; // Small breathing room from text

    // === TOP: Time text area (more margin at center) ===
    const timeMinX = 105;
    const timeMaxX = 147;

    if (x >= timeMinX - transitionWidth && x <= timeMaxX + transitionWidth) {
      const dx = x - centerX;
      if (Math.abs(dx) < arcRadius) {
        const arcY = centerY - Math.sqrt(arcRadius * arcRadius - dx * dx);

        // More margin when closer to center (where numbers are)
        const distFromCenter = Math.abs(x - centerX);
        const maxDist = (timeMaxX - timeMinX) / 2;
        const centerFactor = 1 - Math.min(distFromCenter / maxDist, 1);
        const dynamicMargin = margin + centerFactor * 12; // Extra margin at center

        const targetY1 = arcY + dynamicMargin;

        if (x < timeMinX) {
          // Quick smooth transition in
          const t = (x - (timeMinX - transitionWidth)) / transitionWidth;
          y1 = smoothstep(t) * targetY1;
        } else if (x > timeMaxX) {
          // Quick smooth transition out
          const t = ((timeMaxX + transitionWidth) - x) / transitionWidth;
          y1 = smoothstep(t) * targetY1;
        } else {
          // In the avoidance zone - follow the arc with dynamic margin
          y1 = targetY1;
        }
      }
    }

    // === BOTTOM: Glucose value area (narrow zone, more margin at center) ===
    const glucoseMinX = 115;
    const glucoseMaxX = 158;

    if (x >= glucoseMinX - transitionWidth && x <= glucoseMaxX + transitionWidth) {
      const dx = x - centerX;
      if (Math.abs(dx) < arcRadius) {
        const arcY = centerY + Math.sqrt(arcRadius * arcRadius - dx * dx);

        // More margin when closer to center (where numbers are)
        const distFromCenter = Math.abs(x - centerX);
        const maxDist = (glucoseMaxX - glucoseMinX) / 2;
        const centerFactor = 1 - Math.min(distFromCenter / maxDist, 1);
        const dynamicMargin = margin + 3 + centerFactor * 15; // +3px base to avoid arrow

        const targetY2 = arcY - dynamicMargin;

        if (x < glucoseMinX) {
          // Quick smooth transition in
          const t = (x - (glucoseMinX - transitionWidth)) / transitionWidth;
          y2 = 252 - smoothstep(t) * (252 - targetY2);
        } else if (x > glucoseMaxX) {
          // Quick smooth transition out
          const t = ((glucoseMaxX + transitionWidth) - x) / transitionWidth;
          y2 = 252 - smoothstep(t) * (252 - targetY2);
        } else {
          // In the avoidance zone - follow the arc with dynamic margin
          y2 = targetY2;
        }
      }
    }

    return { y1, y2 };
  }

  /**
   * Update slider position and all related elements
   * @param {number} x - Target X position
   * @param {boolean} immediate - If true, skip animation (used during drag)
   */
  updateSliderPosition(x, immediate = false) {
    if (immediate || !this.dotSpring) {
      // Direct render without animation (during drag or if spring not available)
      this.renderDotAtX(x);
    } else {
      // Animate to position using spring physics
      this.animateToX(x);
    }
  }

  /**
   * Update only the clip-path (without changing colors)
   * Used at "now" position where colors are handled by app.js
   */
  updateClipPath(x, y) {
    const currentSegment = this.getSegmentForX(x);

    // Zone boundaries for clip
    const DANGER_HIGH_Y = 96;
    const WARNING_HIGH_Y = 106;
    const WARNING_LOW_Y = 151;
    const DANGER_LOW_Y = 156;

    let clipY, clipHeight;
    if (y < DANGER_HIGH_Y) {
      clipY = 0; clipHeight = DANGER_HIGH_Y;
    } else if (y < WARNING_HIGH_Y) {
      clipY = DANGER_HIGH_Y; clipHeight = WARNING_HIGH_Y - DANGER_HIGH_Y;
    } else if (y < WARNING_LOW_Y) {
      clipY = WARNING_HIGH_Y; clipHeight = WARNING_LOW_Y - WARNING_HIGH_Y;
    } else if (y < DANGER_LOW_Y) {
      clipY = WARNING_LOW_Y; clipHeight = DANGER_LOW_Y - WARNING_LOW_Y;
    } else {
      clipY = DANGER_LOW_Y; clipHeight = 252 - DANGER_LOW_Y;
    }

    if (this.segmentClipRect && currentSegment) {
      const startX = Math.floor(currentSegment.startX) - 2;
      const endX = Math.ceil(currentSegment.endX) + 3;
      this.segmentClipRect.setAttribute('x', startX);
      this.segmentClipRect.setAttribute('y', clipY);
      this.segmentClipRect.setAttribute('width', endX - startX);
      this.segmentClipRect.setAttribute('height', clipHeight);
    }
  }

  /**
   * Update colors with a specific color (used when at "now" position to match blob)
   */
  updateColorsWithColor(x, y, color) {
    // Update slider elements with provided color
    this.sliderDot.style.fill = color;
    this.sliderLine.style.stroke = color;
    this.timeLabel.style.fill = color;

    // Update highlight color
    if (this.graphLineHighlight) {
      this.graphLineHighlight.style.stroke = color;
    }

    // Still need to update clip-path based on position
    const currentSegment = this.getSegmentForX(x);

    // Zone boundaries for clip
    const DANGER_HIGH_Y = 96;
    const WARNING_HIGH_Y = 106;
    const WARNING_LOW_Y = 151;
    const DANGER_LOW_Y = 156;

    let clipY, clipHeight;
    if (y < DANGER_HIGH_Y) {
      clipY = 0; clipHeight = DANGER_HIGH_Y;
    } else if (y < WARNING_HIGH_Y) {
      clipY = DANGER_HIGH_Y; clipHeight = WARNING_HIGH_Y - DANGER_HIGH_Y;
    } else if (y < WARNING_LOW_Y) {
      clipY = WARNING_HIGH_Y; clipHeight = WARNING_LOW_Y - WARNING_HIGH_Y;
    } else if (y < DANGER_LOW_Y) {
      clipY = WARNING_LOW_Y; clipHeight = DANGER_LOW_Y - WARNING_LOW_Y;
    } else {
      clipY = DANGER_LOW_Y; clipHeight = 252 - DANGER_LOW_Y;
    }

    if (this.segmentClipRect && currentSegment) {
      const startX = Math.floor(currentSegment.startX) - 2;
      const endX = Math.ceil(currentSegment.endX) + 3;
      this.segmentClipRect.setAttribute('x', startX);
      this.segmentClipRect.setAttribute('y', clipY);
      this.segmentClipRect.setAttribute('width', endX - startX);
      this.segmentClipRect.setAttribute('height', clipHeight);
    }
  }

  /**
   * Update colors based on slider position
   * Each zone (safe/warning/danger) has its own color, clip shows only current zone segment
   */
  updateColors(x, y, isDanger, isLow) {
    // Zone boundaries
    const DANGER_HIGH_Y = 96;    // glucose = 10
    const WARNING_HIGH_Y = 106;  // glucose = 9
    const WARNING_LOW_Y = 151;   // glucose = 4.5
    const DANGER_LOW_Y = 156;    // glucose = 4

    // Get blended color based on Y position (matches blob's color logic)
    const segmentColor = this.getColorForY(y);

    // Determine clip zone based on Y position
    let clipY, clipHeight;

    if (y < DANGER_HIGH_Y) {
      // Danger high zone (glucose > 10)
      clipY = 0;
      clipHeight = DANGER_HIGH_Y;
    } else if (y < WARNING_HIGH_Y) {
      // Warning high zone (glucose 9-10)
      clipY = DANGER_HIGH_Y;
      clipHeight = WARNING_HIGH_Y - DANGER_HIGH_Y;
    } else if (y < WARNING_LOW_Y) {
      // Safe zone (glucose 4.5-9)
      clipY = WARNING_HIGH_Y;
      clipHeight = WARNING_LOW_Y - WARNING_HIGH_Y;
    } else if (y < DANGER_LOW_Y) {
      // Warning low zone (glucose 4-4.5)
      clipY = WARNING_LOW_Y;
      clipHeight = DANGER_LOW_Y - WARNING_LOW_Y;
    } else {
      // Danger low zone (glucose < 4)
      clipY = DANGER_LOW_Y;
      clipHeight = 252 - DANGER_LOW_Y;
    }

    // Get current segment (X boundaries)
    const currentSegment = this.getSegmentForX(x);

    // Update slider elements with zone color
    this.sliderDot.style.fill = segmentColor;
    this.sliderLine.style.stroke = segmentColor;
    this.timeLabel.style.fill = segmentColor;

    // Update highlight color
    if (this.graphLineHighlight) {
      this.graphLineHighlight.style.stroke = segmentColor;
    }

    // Update clip-path: X from segment, Y from zone
    if (this.segmentClipRect && currentSegment) {
      const startX = Math.floor(currentSegment.startX) - 2;
      const endX = Math.ceil(currentSegment.endX) + 3;
      this.segmentClipRect.setAttribute('x', startX);
      this.segmentClipRect.setAttribute('y', clipY);
      this.segmentClipRect.setAttribute('width', endX - startX);
      this.segmentClipRect.setAttribute('height', clipHeight);
    }
  }

  /**
   * Calculate the slope (derivative) of the graph at a given X position (graph coordinates)
   * Returns one of 5 discrete angles: 0°, 45°, 90°, 135°, 180°
   * - 0° = pointing straight up (rising fast)
   * - 45° = pointing up-right (rising)
   * - 90° = pointing right (stable)
   * - 135° = pointing down-right (falling)
   * - 180° = pointing down (falling fast)
   */
  getSlopeAngleAtX(graphX) {
    // Sample points before and after current position to calculate slope
    const delta = 8; // Sample distance
    const minGraphX = this.allSamples ? this.allSamples[0].x : 0;
    const maxGraphX = this.allSamples ? this.allSamples[this.allSamples.length - 1].x : this.maxX;
    const x1 = Math.max(minGraphX, graphX - delta);
    const x2 = Math.min(maxGraphX, graphX + delta);

    const y1 = this.getYForX(x1);
    const y2 = this.getYForX(x2);

    // Calculate slope (rise over run)
    // Note: In SVG, Y increases downward, so positive slope = falling glucose
    const slope = (y2 - y1) / (x2 - x1);

    // Map slope to one of 5 discrete trend angles
    // Thresholds based on typical graph slopes
    // slope < -0.8 → rising fast (0°)
    // slope -0.8 to -0.2 → rising (45°)
    // slope -0.2 to 0.2 → stable (90°)
    // slope 0.2 to 0.8 → falling (135°)
    // slope > 0.8 → falling fast (180°)

    const TREND_ANGLES = [0, 45, 90, 135, 180];

    if (slope < -0.8) return TREND_ANGLES[0];      // Rising fast
    if (slope < -0.2) return TREND_ANGLES[1];      // Rising
    if (slope < 0.2) return TREND_ANGLES[2];       // Stable
    if (slope < 0.8) return TREND_ANGLES[3];       // Falling
    return TREND_ANGLES[4];                         // Falling fast
  }

  /**
   * Get trend index (0-4) from angle
   */
  getTrendIndexFromAngle(angle) {
    const TREND_ANGLES = [0, 45, 90, 135, 180];
    return TREND_ANGLES.indexOf(angle);
  }

  /**
   * Get color for glucose value with smooth blending at thresholds
   * Blending happens: 9.5-10 (yellow→red) and 4.0-4.5 (yellow→red)
   */
  getColorForGlucose(glucose) {
    const COLORS = {
      SAFE: '#7ED321',
      WARNING: '#FFD700',
      DANGER: '#FF4444'
    };

    // Danger zones (pure red)
    if (glucose <= 4.0 || glucose >= 10.0) {
      return COLORS.DANGER;
    }

    // Safe zone (pure green)
    if (glucose >= 4.5 && glucose <= 9.0) {
      return COLORS.SAFE;
    }

    // High warning zone (9.0 - 10.0)
    if (glucose > 9.0 && glucose < 10.0) {
      if (glucose >= 9.5) {
        // Blend from yellow to red (9.5 to 10)
        const t = (glucose - 9.5) / 0.5;
        return this.blendColors(COLORS.WARNING, COLORS.DANGER, t);
      }
      // Pure yellow (9.0 to 9.5)
      return COLORS.WARNING;
    }

    // Low warning zone (4.0 - 4.5) - blend throughout
    if (glucose > 4.0 && glucose < 4.5) {
      // Blend from yellow (at 4.5) to red (at 4.0)
      const t = (4.5 - glucose) / 0.5;
      return this.blendColors(COLORS.WARNING, COLORS.DANGER, t);
    }

    return COLORS.SAFE;
  }

  /**
   * Update the glucose value display at the bottom
   */
  updateGlucoseDisplay(glucose, isDanger) {
    const glucoseText = document.querySelector('.nav-circle-base .nav-glucose textPath');
    const glucoseArrow = document.querySelector('.nav-circle-base .nav-arrow path');
    const glucoseTextElement = document.querySelector('.nav-circle-base .nav-glucose');
    const arrow = document.querySelector('.nav-circle-base .nav-arrow');

    // Use blended colors for glucose text and arrow (matches blob)
    const color = this.getColorForGlucose(glucose);

    if (glucoseTextElement) {
      glucoseTextElement.style.fill = color;
    }

    if (glucoseArrow) {
      glucoseArrow.style.fill = color;
      glucoseArrow.style.stroke = color;
    }

    const displayValue = glucose.toFixed(1).replace('.', ',');

    if (glucoseText) {
      glucoseText.textContent = displayValue;
    }

    // Calculate trend angle from graph slope at current position (use graph coordinates)
    const trendAngle = this.getSlopeAngleAtX(this.currentGraphX !== undefined ? this.currentGraphX : this.currentX);

    // Update arrow position and rotation based on text width and graph slope
    if (glucoseTextElement && arrow) {
      const textBBox = glucoseTextElement.getBBox();
      const gap = 2;
      const arrowX = textBBox.x + textBBox.width + gap;
      const arrowY = textBBox.y + (textBBox.height / 2) - 8;

      // Arrow icon points straight up (0°), rotate by trend angle
      // Center of rotation is at the center of the 13x13 arrow (6.5, 6.5)
      arrow.setAttribute('transform', `translate(${arrowX}, ${arrowY}) rotate(${trendAngle.toFixed(1)}, 6.5, 6.5)`);
    }

    // Update the blob trend direction and debug button if graph is visible
    if (window.Sweetie && typeof window.Sweetie.updateTrendFromAngle === 'function') {
      window.Sweetie.updateTrendFromAngle(trendAngle);
    }
  }

  /**
   * Generate a random graph path that ends at a specific Y value
   * @param {number} endY - The Y coordinate at the end (current glucose)
   * @param {number} trendAngle - Optional trend angle (0, 45, 90, 135, 180) to determine end slope
   */
  generateRandomPath(endY, trendAngle = null) {
    const endX = 206;
    const startX = 0;

    // Calculate target slope at end based on trend angle
    // trendAngle: 0=rising fast, 45=rising, 90=stable, 135=falling, 180=falling fast
    let endSlope = 0;
    if (trendAngle !== null) {
      const slopeMap = {
        0: -1.2,    // Rising fast
        45: -0.5,   // Rising
        90: 0,      // Stable
        135: 0.5,   // Falling
        180: 1.2    // Falling fast
      };
      endSlope = slopeMap[trendAngle] || 0;
    }

    // Start Y is completely random within safe display range
    // This ensures variety - graph doesn't just follow end value
    const startY = 70 + Math.random() * 100; // Random between 70-170 (covers all zones)

    // Generate 4-5 control points
    const numPoints = 4 + Math.floor(Math.random() * 2);
    const points = [{x: startX, y: startY}];

    // Middle points are random - independent of end value
    for (let i = 1; i < numPoints; i++) {
      const progress = i / numPoints;
      const x = startX + progress * (endX - startX);

      let y;
      if (progress < 0.7) {
        // First 70% of graph: completely random, creates variety
        y = 60 + Math.random() * 130; // Random between 60-190
      } else {
        // Last 30%: transition toward end point with correct slope
        const remainingX = endX - x;
        const slopeBias = endSlope * remainingX * 0.5;
        y = endY + slopeBias + (Math.random() - 0.5) * 25;
      }

      // Clamp to visible bounds
      points.push({x, y: Math.max(50, Math.min(200, y))});
    }

    // Add end point (this is the only fixed point based on glucose value)
    points.push({x: endX, y: endY});

    // Build smooth bezier path
    let path = `M${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Calculate control points for smooth curve
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C${cp1x.toFixed(0)},${cp1y.toFixed(0)} ${cp2x.toFixed(0)},${cp2y.toFixed(0)} ${p2.x.toFixed(0)},${p2.y.toFixed(0)}`;
    }

    return path;
  }

  /**
   * Update the graph path and re-initialize
   */
  updateGraphPath(newPath) {
    // Update both base and highlight paths
    if (this.graphLineBase) {
      this.graphLineBase.setAttribute('d', newPath);
    }
    if (this.graphLineHighlight) {
      this.graphLineHighlight.setAttribute('d', newPath);
    }

    // Store new path and re-sample
    this.originalPathData = newPath;
    this.samplePath();

    // Regenerate history path to connect with new main path
    this.generateHistoryPath();
    this.sampleHistoryPath();

    this.findBoundaryCrossings();

    // Reset spring to current position
    if (this.dotSpring) {
      this.dotSpring.setValue(this.currentX);
    }

    // Update slider position to refresh colors/segments (immediate, no animation)
    this.updateSliderPosition(this.currentX, true);
  }

  /**
   * Convert glucose value to Y coordinate
   */
  glucoseToY(glucose) {
    // Linear mapping based on boundary lines
    // Upper boundary: y=96 → glucose=10
    // Lower boundary: y=156 → glucose=4
    const glucosePerPixel = 6 / 60; // 0.1
    return this.upperBoundaryY + (10 - glucose) / glucosePerPixel;
  }

  /**
   * Setup drag events for the slider
   */
  setupDragEvents() {
    const handleStart = (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.sliderDot.style.cursor = 'grabbing';

      // Stop any ongoing spring animation during drag
      if (this.dotSpring) {
        this.dotSpring.stop();
      }
    };

    const handleMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault(); // Prevent page scroll on mobile

      const svgRect = this.svg.getBoundingClientRect();
      const clientX = e.clientX || e.touches?.[0]?.clientX;

      // Convert screen coordinates to SVG viewport coordinates
      const svgX = ((clientX - svgRect.left) / svgRect.width) * 252;

      // Convert viewport to graph coordinates (slider is in pan group)
      const graphX = svgX - this.panOffset;

      // Immediate update during drag for responsive feel
      this.updateSliderPosition(graphX, true);
    };

    const handleEnd = () => {
      this.isDragging = false;
      this.sliderDot.style.cursor = 'grab';
    };

    // Make dot and line draggable
    this.sliderDot.style.cursor = 'grab';
    this.sliderDot.style.pointerEvents = 'auto';
    this.sliderLine.style.pointerEvents = 'none'; // Use hitbox instead

    if (this.sliderHitbox) {
      this.sliderHitbox.style.cursor = 'grab';
      this.sliderHitbox.style.pointerEvents = 'auto';
    }

    // Mouse events
    this.sliderDot.addEventListener('mousedown', handleStart);
    if (this.sliderHitbox) {
      this.sliderHitbox.addEventListener('mousedown', handleStart);
    }
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    this.sliderDot.addEventListener('touchstart', handleStart, { passive: false });
    if (this.sliderHitbox) {
      this.sliderHitbox.addEventListener('touchstart', handleStart, { passive: false });
    }
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    // Click anywhere on graph - animate to that position
    this.svg.addEventListener('click', (e) => {
      if (e.target === this.sliderDot || e.target === this.sliderLine || e.target === this.sliderHitbox) return;
      if (this.isDragging) return;
      // Don't animate if user just finished panning
      if (this.panMoved) {
        this.panMoved = false;
        return;
      }

      const svgRect = this.svg.getBoundingClientRect();
      const svgX = ((e.clientX - svgRect.left) / svgRect.width) * 252;

      // Convert viewport to graph coordinates
      const graphX = svgX - this.panOffset;

      // Animate to clicked position with spring physics
      this.updateSliderPosition(graphX, false);
    });
  }

  /**
   * Generate combined path with history + main graph as ONE continuous smooth path
   * Uses Catmull-Rom spline converted to Bezier for guaranteed smoothness
   */
  generateHistoryPath() {
    if (!this.originalPathData) return;

    // Get the starting point and direction of the main graph
    const mainStartY = this.pathSamples && this.pathSamples.length > 0
      ? this.pathSamples[0].y
      : 72;

    // Sample a few points from the main path to understand its initial direction
    const mainSecondY = this.pathSamples && this.pathSamples.length > 5
      ? this.pathSamples[5].y
      : mainStartY;

    // Generate history points that will smoothly connect
    const historyPoints = [];

    // Start point (far left)
    historyPoints.push({ x: -200, y: 80 + Math.random() * 80 });

    // Intermediate points with natural flow
    historyPoints.push({ x: -160, y: 60 + Math.random() * 100 });
    historyPoints.push({ x: -120, y: 70 + Math.random() * 90 });
    historyPoints.push({ x: -80, y: 60 + Math.random() * 100 });
    historyPoints.push({ x: -40, y: 50 + Math.random() * 80 });

    // Approach point - starts transitioning to main graph's Y
    const approachY = mainStartY + (Math.random() - 0.5) * 30;
    historyPoints.push({ x: -20, y: approachY });

    // Junction point - exactly matches main graph start
    historyPoints.push({ x: 0, y: mainStartY });

    // Now sample points from the main graph to include in our spline
    const mainPoints = [];
    if (this.pathSamples && this.pathSamples.length > 0) {
      // Take every few samples from main path
      for (let i = 0; i < this.pathSamples.length; i += Math.floor(this.pathSamples.length / 8)) {
        mainPoints.push({ x: this.pathSamples[i].x, y: this.pathSamples[i].y });
      }
      // Always include the last point
      const lastSample = this.pathSamples[this.pathSamples.length - 1];
      if (mainPoints[mainPoints.length - 1].x !== lastSample.x) {
        mainPoints.push(lastSample);
      }
    }

    // Combine all points (skip junction duplicate)
    const allPoints = [...historyPoints, ...mainPoints.slice(1)];

    // Generate smooth Catmull-Rom spline through all points
    this.combinedPathData = this.catmullRomToBezier(allPoints);

    // Update the base line with combined path
    if (this.graphLineBase) {
      this.graphLineBase.setAttribute('d', this.combinedPathData);
    }
    if (this.graphLineHighlight) {
      this.graphLineHighlight.setAttribute('d', this.combinedPathData);
    }

    // Hide the separate history line
    if (this.historyLine) {
      this.historyLine.setAttribute('d', '');
    }
  }

  /**
   * Convert a series of points to a smooth Catmull-Rom spline (as Bezier curves)
   * This guarantees C1 continuity (smooth tangents) at all points
   */
  catmullRomToBezier(points) {
    if (points.length < 2) return '';

    let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Catmull-Rom to Bezier conversion
      // Tension factor (0.5 = standard Catmull-Rom)
      const tension = 0.5;

      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }

    return path;
  }

  /**
   * Setup pan events for revealing history when dragging right
   */
  setupPanEvents() {
    if (!this.panGroup || !this.svg) return;

    // Track if a meaningful pan occurred (to prevent click after pan)
    this.panMoved = false;

    const handlePanStart = (e) => {
      // Don't start pan if dragging the slider dot
      if (e.target === this.sliderDot || e.target === this.sliderHitbox) return;
      // Don't start pan if slider is being dragged
      if (this.isDragging) return;

      this.isPanning = true;
      this.panMoved = false;
      const clientX = e.clientX || e.touches?.[0]?.clientX;
      this.panStartX = clientX;
      this.panStartOffset = this.panOffset;

      // Disable transition during drag for immediate feedback
      if (this.panGroup) {
        this.panGroup.style.transition = 'none';
      }
    };

    const handlePanMove = (e) => {
      if (!this.isPanning) return;

      const clientX = e.clientX || e.touches?.[0]?.clientX;
      const deltaX = clientX - this.panStartX;

      // Mark as moved if dragged more than 5px
      if (Math.abs(deltaX) > 5) {
        this.panMoved = true;
      }

      // Calculate new pan offset (dragging right = positive offset = reveal history)
      let newOffset = this.panStartOffset + deltaX;

      // Clamp to valid range
      newOffset = Math.max(0, Math.min(this.maxPanOffset, newOffset));

      this.panOffset = newOffset;
      this.updatePanPosition();
    };

    const handlePanEnd = () => {
      if (!this.isPanning) return;
      this.isPanning = false;

      // Re-enable transition for animations
      if (this.panGroup) {
        this.panGroup.style.transition = '';
      }

      // Snap back if pulled less than 30% of max
      if (this.panOffset < this.maxPanOffset * 0.3) {
        this.animatePanTo(0);
      }
    };

    // Add events to svg background
    this.svg.addEventListener('mousedown', handlePanStart);
    this.svg.addEventListener('touchstart', handlePanStart, { passive: true });

    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('touchmove', handlePanMove, { passive: true });

    document.addEventListener('mouseup', handlePanEnd);
    document.addEventListener('touchend', handlePanEnd);
  }

  /**
   * Update the pan group position
   * Slider elements are now inside the pan group, so they move automatically
   */
  updatePanPosition() {
    if (this.panGroup) {
      this.panGroup.style.transform = `translateX(${this.panOffset}px)`;
    }
  }

  /**
   * Animate pan to target offset using CSS M3 expressive motion
   */
  animatePanTo(targetOffset) {
    // Let CSS transition handle the animation with M3 spatial easing
    this.panOffset = targetOffset;
    this.updatePanPosition();
  }

  /**
   * Reset pan position
   */
  resetPan() {
    this.panOffset = 0;
    this.isPanning = false;
    this.updatePanPosition();
  }

  /**
   * Reset slider to "now" position and restore default colors
   */
  reset() {
    // Stop any ongoing animation
    if (this.dotSpring) {
      this.dotSpring.stop();
      this.dotSpring.setValue(this.maxX);
    }

    // Reset pan position
    this.resetPan();

    // Reset position immediately (no animation)
    this.currentX = this.maxX;
    this.currentGraphX = this.maxX;
    this.targetX = this.maxX;
    this.renderDotAtX(this.maxX);

    // Reset colors to CSS defaults
    this.sliderDot.style.fill = '';
    this.sliderLine.style.stroke = '';
    this.timeLabel.style.fill = '';

    // Reset highlight
    if (this.graphLineHighlight) {
      this.graphLineHighlight.style.stroke = '';
    }

    // Reset clip based on current position's zone
    if (this.segmentClipRect && this.segments && this.segments.length > 0) {
      const lastSegment = this.segments[this.segments.length - 1];
      const y = this.getYForX(this.maxX);

      const startX = Math.floor(lastSegment.startX) - 2;
      const endX = Math.ceil(lastSegment.endX) + 3;

      // Determine clip Y based on zone
      const DANGER_HIGH_Y = 96;
      const WARNING_HIGH_Y = 106;
      const WARNING_LOW_Y = 151;
      const DANGER_LOW_Y = 156;

      let clipY, clipHeight;
      if (y < DANGER_HIGH_Y) {
        clipY = 0; clipHeight = DANGER_HIGH_Y;
      } else if (y < WARNING_HIGH_Y) {
        clipY = DANGER_HIGH_Y; clipHeight = WARNING_HIGH_Y - DANGER_HIGH_Y;
      } else if (y < WARNING_LOW_Y) {
        clipY = WARNING_HIGH_Y; clipHeight = WARNING_LOW_Y - WARNING_HIGH_Y;
      } else if (y < DANGER_LOW_Y) {
        clipY = WARNING_LOW_Y; clipHeight = DANGER_LOW_Y - WARNING_LOW_Y;
      } else {
        clipY = DANGER_LOW_Y; clipHeight = 252 - DANGER_LOW_Y;
      }

      this.segmentClipRect.setAttribute('x', startX);
      this.segmentClipRect.setAttribute('y', clipY);
      this.segmentClipRect.setAttribute('width', endX - startX);
      this.segmentClipRect.setAttribute('height', clipHeight);
    }
  }

  /**
   * Add a context marker to the graph at the current "now" position
   * @param {string} type - 'meal', 'insulin', 'activity', or 'med'
   * @param {number} value - Optional value (units for insulin/med)
   */
  addContextMarker(type, value = 1) {
    const x = this.maxX; // Current "now" position
    const y = this.getYForX(x);

    this.contextMarkers.push({
      type,
      value,
      x,
      y,
      timestamp: Date.now()
    });

    this.renderContextMarkers();
  }

  /**
   * Render all context markers on the graph
   */
  renderContextMarkers() {
    if (!this.markersGroup) return;

    // Clear existing markers
    this.markersGroup.innerHTML = '';

    // Check if slider is at "now" position
    const isAtNow = Math.abs(this.currentGraphX - this.maxX) < 5;

    // Use accent color when at "now", grey when viewing history
    const greyColor = '#8E8E93';
    const accentColor = isAtNow
      ? (window.glucoseBlob ? window.glucoseBlob.getColor() : '#7ED321')
      : greyColor;

    // Inline SVG paths for each icon type
    const iconSvgs = {
      meal: `<svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.5 2.5V5.3125" stroke="${accentColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M4.6875 7.5V13.125" stroke="${accentColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12.1875 9.84375H8.90625C8.90625 9.84375 8.90625 3.75 12.1875 2.34375V13.125" stroke="${accentColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2.46875 2L2 4.8125C2 5.4341 2.24693 6.03024 2.68647 6.46978C3.12601 6.90932 3.72215 7.15625 4.34375 7.15625C4.96535 7.15625 5.56149 6.90932 6.00103 6.46978C6.44057 6.03024 6.6875 5.4341 6.6875 4.8125L6.21875 2" stroke="${accentColor}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      insulin: `<svg width="12" height="12" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.8639 2.92166L10.0783 0.136056C10.0352 0.0929212 9.984 0.0587044 9.92764 0.0353598C9.87128 0.0120153 9.81087 0 9.74987 0C9.68887 0 9.62846 0.0120153 9.5721 0.0353598C9.51575 0.0587044 9.46454 0.0929212 9.4214 0.136056C9.37827 0.179192 9.34405 0.2304 9.32071 0.286759C9.29736 0.343118 9.28534 0.403523 9.28534 0.464525C9.28534 0.525528 9.29736 0.585933 9.32071 0.642292C9.34405 0.69865 9.37827 0.749859 9.4214 0.792994L10.4863 1.85733L8.82134 3.52231L6.82847 1.52886C6.74135 1.44174 6.6232 1.3928 6.5 1.3928C6.3768 1.3928 6.25865 1.44174 6.17153 1.52886C6.08441 1.61597 6.03547 1.73413 6.03547 1.85733C6.03547 1.98053 6.08441 2.09868 6.17153 2.1858L6.54004 2.55373L1.66524 7.42853C1.57864 7.51444 1.50998 7.61671 1.46326 7.72939C1.41653 7.84207 1.39267 7.96291 1.39306 8.08489V10.9506L0.136056 12.207C0.0929212 12.2501 0.0587044 12.3013 0.0353598 12.3577C0.0120153 12.4141 0 12.4745 0 12.5355C0 12.5965 0.0120153 12.6569 0.0353598 12.7132C0.0587044 12.7696 0.0929212 12.8208 0.136056 12.8639C0.223172 12.9511 0.341326 13 0.464525 13C0.525528 13 0.585933 12.988 0.642292 12.9646C0.69865 12.9413 0.749859 12.9071 0.792994 12.8639L2.04942 11.6069H4.91511C5.03709 11.6073 5.15793 11.5835 5.27061 11.5367C5.38329 11.49 5.48555 11.4214 5.57146 11.3348L10.4463 6.45996L10.8142 6.82847C10.8573 6.8716 10.9085 6.90582 10.9649 6.92916C11.0213 6.95251 11.0817 6.96452 11.1427 6.96452C11.2037 6.96452 11.2641 6.95251 11.3204 6.92916C11.3768 6.90582 11.428 6.8716 11.4711 6.82847C11.5143 6.78533 11.5485 6.73412 11.5718 6.67777C11.5952 6.62141 11.6072 6.561 11.6072 6.5C11.6072 6.439 11.5952 6.37859 11.5718 6.32223C11.5485 6.26587 11.5143 6.21466 11.4711 6.17153L9.47769 4.17866L11.1427 2.51368L12.207 3.5786C12.2941 3.66571 12.4123 3.71465 12.5355 3.71465C12.6587 3.71465 12.7768 3.66571 12.8639 3.5786C12.9511 3.49148 13 3.37333 13 3.25013C13 3.12693 12.9511 3.00877 12.8639 2.92166ZM4.91511 10.6784H2.32159V8.08489L3.3662 7.04029L4.54659 8.22127C4.58973 8.26441 4.64094 8.29862 4.6973 8.32197C4.75366 8.34531 4.81406 8.35733 4.87506 8.35733C4.93607 8.35733 4.99647 8.34531 5.05283 8.32197C5.10919 8.29862 5.1604 8.26441 5.20353 8.22127C5.24667 8.17814 5.28089 8.12693 5.30423 8.07057C5.32757 8.01421 5.33959 7.9538 5.33959 7.8928C5.33959 7.8318 5.32757 7.77139 5.30423 7.71503C5.28089 7.65868 5.24667 7.60747 5.20353 7.56433L4.02255 6.38393L4.759 5.64749L5.9394 6.82847C6.02651 6.91558 6.14467 6.96452 6.26787 6.96452C6.39107 6.96452 6.50922 6.91558 6.59633 6.82847C6.68345 6.74135 6.73239 6.6232 6.73239 6.5C6.73239 6.3768 6.68345 6.25865 6.59633 6.17153L5.41535 4.99113L7.1964 3.21009L9.78991 5.8036L4.91511 10.6784Z" fill="${accentColor}"/>
      </svg>`,
      activity: `<svg width="12" height="12" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 10C20.6569 10 22 8.65685 22 7C22 5.34315 20.6569 4 19 4C17.3431 4 16 5.34315 16 7C16 8.65685 17.3431 10 19 10Z" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 13.2C7 13.2 11 9.99125 17 14.075C23.3088 18.3625 27 16.6813 27 16.6813" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.83 20.145C16.0587 20.625 22 22.5 22 29" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16.805 13.9388C16.0463 16.905 12.3512 25.835 4 25" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      med: `<svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.7735 5.97268C14.2888 5.49838 13.8086 5.02113 13.3254 4.54389C12.8571 4.08284 12.3917 3.61885 11.9205 3.16076C11.7489 2.99431 11.5372 2.9619 11.3179 3.04144C11.0868 3.1254 10.9451 3.29627 10.9153 3.54079C10.8914 3.73669 10.9466 3.92965 10.9704 4.12409C11.0346 4.64699 11.1062 5.1699 11.1777 5.69281C11.1867 5.75762 11.1598 5.74289 11.1226 5.72669C11.0346 5.68986 10.9496 5.64715 10.8601 5.61769C10.259 5.41884 9.64906 5.39085 9.03311 5.54846C8.53647 5.67513 8.08756 5.89903 7.71769 6.25549C7.28519 6.67382 6.85268 7.09362 6.43509 7.5252C5.56411 8.42372 5.35383 9.47543 5.71922 10.6523C5.75501 10.7687 5.80572 10.8806 5.85046 10.9941C5.83107 11.0073 5.81318 11 5.79528 10.997C5.31654 10.9263 4.83929 10.8556 4.36055 10.7864C4.11746 10.751 3.87585 10.7039 3.63126 10.6818C3.34789 10.6553 3.08839 10.8394 3.01979 11.109C2.95864 11.3476 3.04365 11.5361 3.21367 11.7026C3.80725 12.2844 4.39933 12.8662 4.99142 13.4481C5.44629 13.8958 5.90117 14.3451 6.35605 14.7929C6.45597 14.8916 6.56783 14.9667 6.71547 14.9932C7.04209 15.0492 7.38064 14.7502 7.34186 14.4246C7.30905 14.1389 7.26878 13.8546 7.22852 13.5703C7.16289 13.1137 7.09429 12.6556 7.02867 12.199C7.02569 12.1754 7.00331 12.143 7.03016 12.1268C7.05402 12.1121 7.07938 12.1386 7.10175 12.1489C7.49398 12.3374 7.90859 12.4229 8.34259 12.4288C8.60806 12.4332 8.86905 12.3963 9.12707 12.336C9.59387 12.227 10.0159 12.0296 10.3605 11.6967C10.8332 11.2401 11.3015 10.779 11.7609 10.3091C12.3187 9.73762 12.6035 9.04679 12.6259 8.2558C12.6363 7.88755 12.5692 7.52814 12.438 7.18199C12.3738 7.01113 12.2918 6.8491 12.1993 6.68413C12.2172 6.68265 12.2277 6.67823 12.2366 6.67971C12.6706 6.74452 13.1031 6.80933 13.5371 6.87267C13.8086 6.91244 14.08 6.95663 14.3529 6.98756C14.6557 7.02144 14.9212 6.83142 14.9853 6.54861C15.039 6.30999 14.9405 6.12881 14.775 5.96678L14.7735 5.97268ZM10.951 9.74204C10.5767 10.1029 10.2143 10.4771 9.83548 10.8335C9.31498 11.3225 8.69605 11.517 7.98615 11.3844C7.45223 11.2842 7.03314 11.0117 6.7632 10.5374C6.59914 10.2502 6.54247 9.93647 6.54247 9.66544C6.54993 9.09392 6.71249 8.63435 7.07639 8.25727C7.37616 7.94794 7.68936 7.6504 7.99659 7.34844C8.09353 7.2527 8.19196 7.15843 8.2889 7.06121C8.61701 6.72832 9.02565 6.55303 9.48053 6.47349C9.92049 6.3969 10.3411 6.45581 10.7303 6.67382C11.3045 6.9964 11.5983 7.49427 11.6117 8.14238C11.6237 8.76398 11.4089 9.30014 10.9525 9.74056L10.951 9.74204Z" fill="${accentColor}"/>
      </svg>`
    };

    // Get current glucose Y position (markers follow current glucose level)
    const currentGlucoseY = this.getYForX(this.maxX);
    const minMarginY = 55; // Top margin - can't go above (clock area)
    const maxMarginY = 170; // Bottom margin - can't go below (now area)
    const badgeSize = 20;
    const minGap = 15; // Minimum gap between markers
    const firstMarkerGap = 40; // First marker 40px from glucose point
    const glucoseGap = 15; // Gap from glucose point for zones

    const markerCount = this.contextMarkers.length;

    // Calculate available space above and below glucose point (never cross glucose point)
    const aboveZoneTop = minMarginY;
    const aboveZoneBottom = currentGlucoseY - glucoseGap - badgeSize;
    const belowZoneTop = currentGlucoseY + glucoseGap;
    const belowZoneBottom = maxMarginY - badgeSize;

    const spaceAbove = Math.max(0, aboveZoneBottom - aboveZoneTop);
    const spaceBelow = Math.max(0, belowZoneBottom - belowZoneTop);

    // Calculate how many markers fit in each zone
    const maxMarkersAbove = spaceAbove > 0 ? Math.floor(spaceAbove / (badgeSize + minGap)) + 1 : 0;
    const maxMarkersBelow = spaceBelow > 0 ? Math.floor(spaceBelow / (badgeSize + minGap)) + 1 : 0;

    // Distribute markers between zones
    let markersAbove = Math.min(Math.ceil(markerCount / 2), maxMarkersAbove);
    let markersBelow = Math.min(markerCount - markersAbove, maxMarkersBelow);

    // If we couldn't fit all below, try to add more above
    if (markersAbove + markersBelow < markerCount) {
      markersAbove = Math.min(markerCount - markersBelow, maxMarkersAbove);
    }

    // Calculate Y positions for all markers
    const markerPositions = [];

    // Position markers above (from glucose going up)
    // First marker is 30px above, subsequent markers are 15px apart
    for (let i = 0; i < markersAbove; i++) {
      let y;
      if (i === 0) {
        y = currentGlucoseY - firstMarkerGap - badgeSize;
      } else {
        y = markerPositions[i - 1] - minGap - badgeSize;
      }
      markerPositions.push(Math.max(minMarginY, y));
    }

    // Position markers below (from glucose going down)
    for (let i = 0; i < markersBelow; i++) {
      let y;
      if (markersAbove === 0 && i === 0) {
        // First marker overall, but below
        y = currentGlucoseY + firstMarkerGap;
      } else {
        y = belowZoneTop + (i * (badgeSize + minGap));
      }
      markerPositions.push(Math.min(maxMarginY - badgeSize, y));
    }

    this.contextMarkers.forEach((marker, index) => {
      // Determine badge size based on whether we show a number
      const showNumber = (marker.type === 'insulin' || marker.type === 'med') && marker.value > 1;
      const badgeWidth = showNumber ? 36 : badgeSize;
      const badgeHeight = badgeSize;

      // Use pre-calculated position
      const markerY = markerPositions[index] || minMarginY;

      // Draw connecting line from graph point to marker
      const graphPointY = marker.y; // Y position on graph where marker was added
      const badgeCenterY = markerY + badgeHeight / 2;

      // Always draw the line (grey when not at now, accent when at now)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', marker.x);
      line.setAttribute('y1', graphPointY);
      line.setAttribute('x2', marker.x);
      line.setAttribute('y2', markerY < graphPointY ? markerY + badgeHeight : markerY);
      line.setAttribute('stroke', isAtNow ? accentColor : greyColor);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '3,3');
      this.markersGroup.appendChild(line);

      // Create foreignObject to embed HTML
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');

      fo.setAttribute('x', marker.x - badgeWidth / 2);
      fo.setAttribute('y', markerY);
      fo.setAttribute('width', badgeWidth);
      fo.setAttribute('height', badgeHeight);

      // Create the badge HTML with inline SVG
      const badge = document.createElement('div');
      badge.className = showNumber ? 'graph-context-badge with-value' : 'graph-context-badge';
      badge.innerHTML = `
        ${iconSvgs[marker.type]}
        ${showNumber ? `<span class="graph-context-value" style="color: ${accentColor}">${marker.value}</span>` : ''}
      `;

      fo.appendChild(badge);
      this.markersGroup.appendChild(fo);
    });
  }

  /**
   * Clear all context markers
   */
  clearContextMarkers() {
    this.contextMarkers = [];
    if (this.markersGroup) {
      this.markersGroup.innerHTML = '';
    }
  }
}

// Initialize when DOM is ready and graph is visible
let graphSlider = null;

function initGraphSlider() {
  if (!graphSlider) {
    graphSlider = new GraphSlider();
    window.graphSlider = graphSlider; // Expose globally
  }
  return graphSlider;
}

// Export for use in app.js
window.initGraphSlider = initGraphSlider;
