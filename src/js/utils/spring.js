/**
 * Spring Physics Animation
 * Material 3 Expressive spring-based animations
 */

class Spring {
  constructor(options = {}) {
    // M3 Expressive defaults
    this.stiffness = options.stiffness || 300;
    this.damping = options.damping || 20;
    this.mass = options.mass || 1;

    this.value = options.initialValue || 0;
    this.target = options.initialValue || 0;
    this.velocity = 0;

    this.onUpdate = options.onUpdate || null;
    this.onComplete = options.onComplete || null;

    this.animationId = null;
    this.lastTime = null;
    this.threshold = 0.001; // Stop when close enough
  }

  /**
   * Set target value and start animating
   */
  setTarget(target) {
    this.target = target;

    // Don't start animation if already at target and not moving
    if (Math.abs(this.value - target) < this.threshold && Math.abs(this.velocity) < this.threshold) {
      return;
    }

    if (!this.animationId) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  /**
   * Set value immediately without animation
   */
  setValue(value) {
    this.value = value;
    this.target = value;
    this.velocity = 0;
    if (this.onUpdate) {
      this.onUpdate(this.value);
    }
  }

  /**
   * Main animation loop using spring physics
   */
  animate() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.064); // Cap at ~15fps minimum
    this.lastTime = now;

    // Spring force: F = -k * x - d * v
    const displacement = this.value - this.target;
    const springForce = -this.stiffness * displacement;
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;

    // Check if animation is complete
    const isComplete =
      Math.abs(this.velocity) < this.threshold &&
      Math.abs(displacement) < this.threshold;

    if (this.onUpdate) {
      this.onUpdate(this.value);
    }

    if (isComplete) {
      this.value = this.target;
      this.velocity = 0;
      this.animationId = null;
      if (this.onComplete) {
        this.onComplete();
      }
    } else {
      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Check if currently animating
   */
  isAnimating() {
    return this.animationId !== null;
  }
}

/**
 * Spring presets based on M3 Expressive guidelines
 */
const SpringPresets = {
  // Expressive - more bounce (default for interactions)
  expressive: { stiffness: 300, damping: 20, mass: 1 },

  // Standard - less bounce
  standard: { stiffness: 400, damping: 30, mass: 1 },

  // Fast - for small elements
  fast: { stiffness: 500, damping: 25, mass: 0.8 },

  // Slow - for page transitions
  slow: { stiffness: 200, damping: 20, mass: 1.2 },

  // Squish - for press feedback (quick, bouncy)
  squish: { stiffness: 600, damping: 15, mass: 0.5 }
};

/**
 * Animate a blob squish effect using spring physics
 * M3 Expressive style: quick compression, bouncy release with overshoot
 * Returns a promise that resolves when animation completes
 */
function animateBlobSquish(element, onComplete) {
  if (!element) return Promise.resolve();

  let callbackFired = false;
  let hasReachedTarget = false;

  return new Promise((resolve) => {
    const spring = new Spring({
      stiffness: 200,
      damping: 14,
      mass: 0.8,
      initialValue: 1,
      onUpdate: (value) => {
        // Organic squish: compress Y more, expand X
        const scaleY = value;
        const scaleX = 1 + (1 - value) * 0.4;
        element.style.transform = `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`;

        // Fire callback at impact point
        if (!callbackFired && value <= 0.78) {
          callbackFired = true;
          if (onComplete) onComplete();
        }

        // Bounce back after reaching compression
        if (!hasReachedTarget && value <= 0.72) {
          hasReachedTarget = true;
          spring.target = 1;
        }
      },
      onComplete: () => {
        element.style.transform = 'translate(-50%, -50%) scale(1, 1)';
        resolve();
      }
    });

    // Deeper squish - to 70%
    spring.setTarget(0.70);
  });
}

// Export for use in other modules
window.Spring = Spring;
window.SpringPresets = SpringPresets;
window.animateBlobSquish = animateBlobSquish;
