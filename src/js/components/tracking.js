/**
 * Tracking Clock Controller
 * Handles insulin tracking and sensor status display with analog clock metaphor
 */

class TrackingController {
  constructor() {
    this.screen = document.querySelector('[data-screen="tracking"]');
    if (!this.screen) return;

    // Elements
    this.infoBtn = this.screen.querySelector('.tracking-info-btn');
    this.clock = this.screen.querySelector('.tracking-clock');
    this.hand = this.screen.querySelector('.tracking-hand');
    this.labels = this.screen.querySelector('.tracking-labels');
    this.tooltips = this.screen.querySelector('.tracking-tooltips');
    this.tooltipInsulin = this.screen.querySelector('.tracking-tooltip-insulin');
    this.tooltipSensor = this.screen.querySelector('.tracking-tooltip-sensor');
    this.trailsGroup = this.screen.querySelector('.tracking-trails');
    this.dotsGroup = this.screen.querySelector('.tracking-dots');
    this.alertsGroup = this.screen.querySelector('.tracking-alerts');
    this.sensorTicksGroup = this.screen.querySelector('.tracking-sensor-ticks');
    this.sensorLabel = this.screen.querySelector('.tracking-label-senzor textPath');
    this.brziLabel = this.screen.querySelector('.tracking-label-brzi');
    this.sporiLabel = this.screen.querySelector('.tracking-label-spori');
    this.connectorBrzi = this.screen.querySelector('.tracking-connector-brzi');
    this.connectorSpori = this.screen.querySelector('.tracking-connector-spori');
    this.trackingNav = this.screen.querySelector('.tracking-nav');
    this.trackingGlucoseText = this.screen.querySelector('.tracking-glucose-text');
    this.trackingGlucoseArrow = this.screen.querySelector('.tracking-glucose-arrow');

    // Constants
    this.CENTER = 126;
    this.OUTER_RADIUS = 69;
    this.MIDDLE_RADIUS = 46;
    this.INNER_RADIUS = 23;
    this.DOT_RADIUS = 3;

    // State
    this.isInfoMode = false; // Info OFF by default

    // Constants
    this.FAST_INSULIN_DURATION_HOURS = 6; // Fast insulin dots disappear after 6 hours
    this.SLOW_INSULIN_DURATION_HOURS = 24; // Slow insulin dots disappear after 24 hours

    // Mock data for prototype
    const now = new Date();
    const eightHoursLater = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const tenHoursLater = new Date(now.getTime() + 10 * 60 * 60 * 1000);

    this.trackingData = {
      fastInsulin: [
        { timestamp: eightHoursLater.getTime(), durationHours: 4 }
      ],
      slowInsulin: {
        timestamp: tenHoursLater.getTime(),
        durationHours: 20
      },
      sensorDaysRemaining: 5,
      currentGlucose: 6.5, // Current glucose value
      alerts: {
        insulinReminder: false,
        sensorWarning: false,
        highGlucose: false
      }
    };

    this.init();
  }

  init() {
    // Info button toggle
    if (this.infoBtn) {
      this.infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleInfoMode();
      });
    }

    // Generate sensor ticks
    this.generateSensorTicks();

    // Long-press on sensor ticks to demo expiring sensor (1 day remaining)
    this.setupSensorLongPress();

    // Cleanup expired insulin doses
    this.cleanupExpiredFastInsulin();
    this.cleanupExpiredSlowInsulin();

    // Initial render
    this.render();

    // Update clock hand and check for expired doses every minute
    this.updateClockHand();
    setInterval(() => {
      this.updateClockHand();
      this.cleanupExpiredFastInsulin();
      this.cleanupExpiredSlowInsulin();
    }, 60000);

    // Sync glucose display with current value
    this.syncGlucoseDisplay();
  }

  /**
   * Sync tracking screen glucose with home screen glucose
   */
  syncGlucoseDisplay() {
    const homeGlucose = document.querySelector('.nav-circle-base .nav-glucose textPath');
    const homeArrow = document.querySelector('.nav-circle-base .nav-arrow');

    if (homeGlucose && this.trackingGlucoseText) {
      const textPath = this.trackingGlucoseText.querySelector('textPath');
      if (textPath) {
        textPath.textContent = homeGlucose.textContent;
      }
    }

    // Sync color
    const color = window.glucoseBlob ? window.glucoseBlob.getColor() : '#7ED321';
    if (this.trackingGlucoseText) {
      this.trackingGlucoseText.style.fill = color;
    }
    const arrowPath = this.trackingGlucoseArrow ? this.trackingGlucoseArrow.querySelector('path') : null;
    if (arrowPath) {
      arrowPath.style.fill = color;
      arrowPath.style.stroke = color;
    }

    // Sync arrow transform
    if (homeArrow && this.trackingGlucoseArrow) {
      this.trackingGlucoseArrow.setAttribute('transform', homeArrow.getAttribute('transform'));
    }
  }

  toggleInfoMode() {
    this.isInfoMode = !this.isInfoMode;

    if (this.isInfoMode) {
      this.infoBtn.classList.add('active');
      this.labels.classList.add('visible');

      // Hide glucose display when info is shown
      if (this.trackingNav) this.trackingNav.style.opacity = '0';

      // Show insulin tooltip if reminder is active
      if (this.trackingData.alerts.insulinReminder) {
        this.tooltipInsulin.classList.add('visible');
      }
      // Note: sensor tooltip not shown - info is displayed in arc label instead
    } else {
      this.infoBtn.classList.remove('active');
      this.labels.classList.remove('visible');
      this.tooltipInsulin.classList.remove('visible');
      this.tooltipSensor.classList.remove('visible');

      // Show glucose display when info is hidden
      if (this.trackingNav) this.trackingNav.style.opacity = '1';

      // Sync glucose in case it changed
      this.syncGlucoseDisplay();
    }
  }

  /**
   * Create a timestamp for today at the specified time
   */
  createTimestamp(hours, minutes) {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.getTime();
  }

  /**
   * Get time string from timestamp
   */
  getTimeFromTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Remove fast insulin doses older than 6 hours
   */
  cleanupExpiredFastInsulin() {
    const now = Date.now();
    const maxAge = this.FAST_INSULIN_DURATION_HOURS * 60 * 60 * 1000; // 6 hours in ms

    const before = this.trackingData.fastInsulin.length;
    this.trackingData.fastInsulin = this.trackingData.fastInsulin.filter(dose => {
      const age = now - dose.timestamp;
      return age < maxAge;
    });

    // Re-render if any doses were removed
    if (this.trackingData.fastInsulin.length !== before) {
      this.render();
    }
  }

  /**
   * Remove slow insulin if older than 24 hours
   */
  cleanupExpiredSlowInsulin() {
    if (!this.trackingData.slowInsulin || !this.trackingData.slowInsulin.timestamp) return;

    const now = Date.now();
    const maxAge = this.SLOW_INSULIN_DURATION_HOURS * 60 * 60 * 1000; // 24 hours in ms
    const age = now - this.trackingData.slowInsulin.timestamp;

    if (age >= maxAge) {
      this.trackingData.slowInsulin = null;
      this.render();
    }
  }

  timeToAngle(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    // 12:00 = 0°, 3:00 = 90°, 6:00 = 180°, 9:00 = 270°
    const totalMinutes = (hours % 12) * 60 + minutes;
    return (totalMinutes / 720) * 360; // 720 minutes = 12 hours
  }

  polarToCartesian(angle, radius) {
    // Convert angle (0° = 12 o'clock) to radians, adjusted for SVG coordinate system
    const radian = (angle - 90) * (Math.PI / 180);
    return {
      x: this.CENTER + radius * Math.cos(radian),
      y: this.CENTER + radius * Math.sin(radian)
    };
  }

  updateClockHand() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const angle = this.timeToAngle(`${hours}:${minutes}`);

    // Calculate end point of hand (ends at outer circle)
    const handLength = this.OUTER_RADIUS;
    const end = this.polarToCartesian(angle, handLength);

    this.hand.setAttribute('x2', end.x);
    this.hand.setAttribute('y2', end.y);
  }

  generateSensorTicks() {
    // Clear existing
    this.sensorTicksGroup.innerHTML = '';

    // 14 small arc dashes for 14 days, arranged along the circle
    const tickCount = 14;
    const gapAngle = 16; // Gap between ticks in degrees (larger = more visible gaps)
    const totalGaps = tickCount * gapAngle;
    const totalArcAngle = 360 - totalGaps;
    const tickAngle = totalArcAngle / tickCount; // Angle span for each tick arc

    for (let i = 0; i < tickCount; i++) {
      // Calculate start and end angles for this arc segment
      const startAngle = i * (tickAngle + gapAngle);
      const endAngle = startAngle + tickAngle;

      // Create arc path
      const startPoint = this.polarToCartesian(startAngle, this.INNER_RADIUS);
      const endPoint = this.polarToCartesian(endAngle, this.INNER_RADIUS);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${startPoint.x} ${startPoint.y} A ${this.INNER_RADIUS} ${this.INNER_RADIUS} 0 0 1 ${endPoint.x} ${endPoint.y}`;
      path.setAttribute('d', d);
      path.setAttribute('class', 'tracking-sensor-tick');
      path.dataset.day = i;

      this.sensorTicksGroup.appendChild(path);
    }

    this.updateSensorTicks();
  }

  updateSensorTicks() {
    const ticks = this.sensorTicksGroup.querySelectorAll('.tracking-sensor-tick');
    const daysRemaining = this.trackingData.sensorDaysRemaining;
    const daysUsed = 14 - daysRemaining;

    // Tick #8 is around 205° (just left of bottom) - next to sensor alert
    const bottomTickIndex = 8;

    ticks.forEach((tick, i) => {
      tick.classList.remove('expired', 'warning');

      if (daysRemaining === 1) {
        // Special case: 1 day remaining - all expired except bottom tick which is red
        if (i === bottomTickIndex) {
          tick.classList.add('warning');
        } else {
          tick.classList.add('expired');
        }
      } else if (i < daysUsed) {
        // Days already used - dark/expired
        tick.classList.add('expired');
      }
      // Otherwise stays white (default)
    });

    // Update alert state
    this.trackingData.alerts.sensorWarning = daysRemaining <= 1;
  }

  /**
   * Setup long-press on sensor ticks to demo expiring sensor
   */
  setupSensorLongPress() {
    let longPressTimer = null;
    let originalDays = this.trackingData.sensorDaysRemaining;

    // Create invisible hit area circle for easier touch
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('cx', this.CENTER);
    hitArea.setAttribute('cy', this.CENTER);
    hitArea.setAttribute('r', this.INNER_RADIUS + 10); // Larger than inner circle
    hitArea.setAttribute('fill', 'transparent');
    hitArea.setAttribute('stroke', 'transparent');
    hitArea.setAttribute('stroke-width', '20'); // Wide stroke for bigger hit area
    hitArea.style.cursor = 'pointer';
    this.sensorTicksGroup.insertBefore(hitArea, this.sensorTicksGroup.firstChild);

    const startPress = (e) => {
      e.preventDefault();
      originalDays = this.trackingData.sensorDaysRemaining;

      longPressTimer = setTimeout(() => {
        // Toggle between 1 day and original days
        if (this.trackingData.sensorDaysRemaining === 1) {
          this.setSensorDays(originalDays !== 1 ? originalDays : 5);
        } else {
          this.setSensorDays(1);
        }
      }, 500); // 500ms long press
    };

    const cancelPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    // Add listeners to the hit area
    hitArea.addEventListener('mousedown', startPress);
    hitArea.addEventListener('mouseup', cancelPress);
    hitArea.addEventListener('mouseleave', cancelPress);
    hitArea.addEventListener('touchstart', startPress, { passive: false });
    hitArea.addEventListener('touchend', cancelPress);
    hitArea.addEventListener('touchcancel', cancelPress);
  }

  createDot(x, y, className = '') {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', this.DOT_RADIUS);
    circle.setAttribute('class', `tracking-dose-dot ${className}`);
    return circle;
  }

  createTrail(startAngle, durationHours, radius, id) {
    // Calculate end angle based on duration (1 hour = 30 degrees for 12-hour clock)
    const endAngle = startAngle + (durationHours / 12) * 360;

    // Create arc path
    const startPoint = this.polarToCartesian(startAngle, radius);
    const endPoint = this.polarToCartesian(endAngle, radius);

    // For arcs > 180 degrees, we need the large arc flag
    const arcSpan = endAngle - startAngle;
    const largeArc = arcSpan > 180 ? 1 : 0;

    const d = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;

    // Create gradient that follows the arc (using stroke opacity trick)
    const gradientId = `trail-gradient-${id}`;
    let defs = this.clock.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.clock.insertBefore(defs, this.clock.firstChild);
    }

    // Remove existing gradient with same id
    const existingGradient = defs.querySelector(`#${gradientId}`);
    if (existingGradient) existingGradient.remove();

    // Create a linear gradient from start to end
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', startPoint.x);
    gradient.setAttribute('y1', startPoint.y);
    gradient.setAttribute('x2', endPoint.x);
    gradient.setAttribute('y2', endPoint.y);

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#ffffff');
    stop1.setAttribute('stop-opacity', '1');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#ffffff');
    stop2.setAttribute('stop-opacity', '0');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'tracking-trail');
    path.setAttribute('stroke', `url(#${gradientId})`);

    return path;
  }

  createAlert(x, y, type) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'tracking-alert');
    g.dataset.type = type;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 7);
    circle.setAttribute('class', 'tracking-alert-circle');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('class', 'tracking-alert-text');
    text.textContent = '!';

    g.appendChild(circle);
    g.appendChild(text);

    return g;
  }

  render() {
    // Clear dynamic elements
    this.trailsGroup.innerHTML = '';
    this.dotsGroup.innerHTML = '';
    this.alertsGroup.innerHTML = '';

    // Render fast insulin doses
    this.trackingData.fastInsulin.forEach((dose, i) => {
      const timeStr = dose.timestamp ? this.getTimeFromTimestamp(dose.timestamp) : dose.time;
      const angle = this.timeToAngle(timeStr);
      const pos = this.polarToCartesian(angle, this.OUTER_RADIUS);

      // Trail
      const trail = this.createTrail(angle, dose.durationHours, this.OUTER_RADIUS, `fast-${i}`);
      this.trailsGroup.appendChild(trail);

      // Dot
      const dot = this.createDot(pos.x, pos.y, 'fast-insulin');
      this.dotsGroup.appendChild(dot);
    });

    // Render slow insulin dose
    if (this.trackingData.slowInsulin) {
      const timeStr = this.trackingData.slowInsulin.timestamp
        ? this.getTimeFromTimestamp(this.trackingData.slowInsulin.timestamp)
        : this.trackingData.slowInsulin.time;
      const angle = this.timeToAngle(timeStr);
      const pos = this.polarToCartesian(angle, this.MIDDLE_RADIUS);

      // Trail (longer for slow insulin)
      const trail = this.createTrail(angle, this.trackingData.slowInsulin.durationHours, this.MIDDLE_RADIUS, 'slow-0');
      this.trailsGroup.appendChild(trail);

      // Dot
      const dot = this.createDot(pos.x, pos.y, 'slow-insulin');
      this.dotsGroup.appendChild(dot);
    }

    // Render alerts
    if (this.trackingData.alerts.insulinReminder) {
      // Position alert near middle circle, on the right side
      const alertPos = this.polarToCartesian(135, this.MIDDLE_RADIUS - 15);
      const alert = this.createAlert(alertPos.x, alertPos.y, 'insulin');
      this.alertsGroup.appendChild(alert);
    }

    if (this.trackingData.alerts.sensorWarning || this.trackingData.sensorDaysRemaining <= 1) {
      // Position alert at bottom center of inner circle (180°)
      const alertPos = this.polarToCartesian(180, this.INNER_RADIUS);
      const alert = this.createAlert(alertPos.x, alertPos.y, 'sensor');
      this.alertsGroup.appendChild(alert);
    }
  }

  // Public methods to update data

  /**
   * Add a fast insulin dose (will auto-expire after 6 hours)
   */
  addFastInsulin(durationHours = 4) {
    this.trackingData.fastInsulin.push({
      timestamp: Date.now(),
      durationHours
    });
    this.render();
  }

  /**
   * Add a slow insulin dose (will auto-expire after 24 hours)
   */
  addSlowInsulin(durationHours = 20) {
    this.trackingData.slowInsulin = {
      timestamp: Date.now(),
      durationHours
    };
    this.render();
  }

  setFastInsulin(doses) {
    this.trackingData.fastInsulin = doses;
    this.render();
  }

  setSlowInsulin(dose) {
    this.trackingData.slowInsulin = dose;
    this.render();
  }

  setSensorDays(days) {
    this.trackingData.sensorDaysRemaining = days;
    this.updateSensorTicks();
    this.render();

    // Update labels and connectors based on days remaining
    if (days <= 1) {
      // Show only sensor warning label and center connector
      if (this.sensorLabel) {
        const lang = localStorage.getItem('sweetie-lang') || 'en';
        this.sensorLabel.textContent = lang === 'hr' ? 'senzor ističe za 1 dan' : 'sensor expires in 1 day';
      }
      if (this.brziLabel) this.brziLabel.style.opacity = '0';
      if (this.sporiLabel) this.sporiLabel.style.opacity = '0';
      if (this.connectorBrzi) this.connectorBrzi.style.opacity = '0';
      if (this.connectorSpori) this.connectorSpori.style.opacity = '0';
    } else {
      // Show all labels and connectors
      if (this.sensorLabel) {
        const lang = localStorage.getItem('sweetie-lang') || 'en';
        this.sensorLabel.textContent = lang === 'hr' ? 'trajanje senzora' : 'sensor duration';
      }
      if (this.brziLabel) this.brziLabel.style.opacity = '';
      if (this.sporiLabel) this.sporiLabel.style.opacity = '';
      if (this.connectorBrzi) this.connectorBrzi.style.opacity = '';
      if (this.connectorSpori) this.connectorSpori.style.opacity = '';
    }

    // Hide tooltip - info is now shown in the label
    if (this.tooltipSensor) {
      this.tooltipSensor.classList.remove('visible');
    }
  }

  setInsulinReminder(active) {
    this.trackingData.alerts.insulinReminder = active;
    this.render();
  }

  /**
   * Update current glucose value (shows alert if > 10)
   */
  setGlucose(value) {
    this.trackingData.currentGlucose = value;
    this.render();
  }
}

// Export
window.TrackingController = TrackingController;
