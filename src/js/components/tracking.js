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

    // Constants
    this.CENTER = 126;
    this.OUTER_RADIUS = 95;
    this.MIDDLE_RADIUS = 67;
    this.INNER_RADIUS = 39;
    this.DOT_RADIUS = 3;

    // State
    this.isInfoMode = false;

    // Mock data (matching design images)
    this.trackingData = {
      fastInsulin: [
        { time: '11:30', durationHours: 4 },
        { time: '08:00', durationHours: 4 }
      ],
      slowInsulin: {
        time: '19:30',
        durationHours: 20
      },
      sensorDaysRemaining: 5,
      alerts: {
        insulinReminder: false,
        sensorWarning: false
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

    // Initial render
    this.render();

    // Update clock hand every minute
    this.updateClockHand();
    setInterval(() => this.updateClockHand(), 60000);
  }

  toggleInfoMode() {
    this.isInfoMode = !this.isInfoMode;

    if (this.isInfoMode) {
      this.infoBtn.classList.add('active');
      this.labels.classList.add('visible');

      // Show relevant tooltips based on alerts
      if (this.trackingData.alerts.insulinReminder) {
        this.tooltipInsulin.classList.add('visible');
      }
      if (this.trackingData.alerts.sensorWarning || this.trackingData.sensorDaysRemaining <= 1) {
        this.tooltipSensor.classList.add('visible');
      }
    } else {
      this.infoBtn.classList.remove('active');
      this.labels.classList.remove('visible');
      this.tooltipInsulin.classList.remove('visible');
      this.tooltipSensor.classList.remove('visible');
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

    // Calculate end point of hand (extends past outer circle)
    const handLength = this.OUTER_RADIUS + 10;
    const end = this.polarToCartesian(angle, handLength);

    this.hand.setAttribute('x2', end.x);
    this.hand.setAttribute('y2', end.y);
  }

  generateSensorTicks() {
    // Clear existing
    this.sensorTicksGroup.innerHTML = '';

    // 14 ticks for 14 days, arranged in a circle
    const tickCount = 14;
    const tickLength = 6;
    const angleStep = 360 / tickCount;

    for (let i = 0; i < tickCount; i++) {
      // Start from top (12 o'clock) and go clockwise
      const angle = i * angleStep;
      const innerPoint = this.polarToCartesian(angle, this.INNER_RADIUS - tickLength / 2);
      const outerPoint = this.polarToCartesian(angle, this.INNER_RADIUS + tickLength / 2);

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', innerPoint.x);
      line.setAttribute('y1', innerPoint.y);
      line.setAttribute('x2', outerPoint.x);
      line.setAttribute('y2', outerPoint.y);
      line.setAttribute('class', 'tracking-sensor-tick');
      line.dataset.day = i;

      this.sensorTicksGroup.appendChild(line);
    }

    this.updateSensorTicks();
  }

  updateSensorTicks() {
    const ticks = this.sensorTicksGroup.querySelectorAll('.tracking-sensor-tick');
    const daysRemaining = this.trackingData.sensorDaysRemaining;
    const daysUsed = 14 - daysRemaining;

    ticks.forEach((tick, i) => {
      tick.classList.remove('expired', 'warning');

      if (i < daysUsed) {
        // Days already used - dark/expired
        tick.classList.add('expired');
      } else if (i === daysUsed && daysRemaining === 1) {
        // Last day - red warning
        tick.classList.add('warning');
      }
      // Otherwise stays white (default)
    });

    // Update alert state
    this.trackingData.alerts.sensorWarning = daysRemaining <= 1;
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
      const angle = this.timeToAngle(dose.time);
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
      const angle = this.timeToAngle(this.trackingData.slowInsulin.time);
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
      // Position alert near inner circle
      const alertPos = this.polarToCartesian(200, this.INNER_RADIUS + 5);
      const alert = this.createAlert(alertPos.x, alertPos.y, 'sensor');
      this.alertsGroup.appendChild(alert);
    }
  }

  // Public methods to update data
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
  }

  setInsulinReminder(active) {
    this.trackingData.alerts.insulinReminder = active;
    this.render();
  }
}

// Export
window.TrackingController = TrackingController;
