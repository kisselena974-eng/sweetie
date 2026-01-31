/**
 * Med (Honey) Input Controller
 * Handles the honey logging flow with M3 Expressive animations
 * Similar to insulin input but with single-digit numbers (1-9)
 */

class MedInputController {
  constructor() {
    this.screen = document.querySelector('[data-screen="med-input"]');
    this.homeScreen = document.querySelector('[data-screen="home"]');

    // State
    this.selectedUnits = 1;
    this.minUnits = 1;
    this.maxUnits = 9;

    // Elements
    this.pickerItems = null;
    this.confirmBtn = null;

    // Touch/drag state
    this.isDragging = false;
    this.startY = 0;
    this.currentOffset = 0;

    // Spring for smooth scrolling
    this.scrollSpring = null;

    this.init();
  }

  init() {
    if (!this.screen) return;

    this.pickerItems = this.screen.querySelector('.picker-items');
    this.confirmBtn = this.screen.querySelector('.confirm-btn');

    // Prevent page swipes when on this screen
    this.screen.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    this.screen.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
    this.screen.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });
    this.screen.addEventListener('mousedown', (e) => e.stopPropagation());
    this.screen.addEventListener('mousemove', (e) => e.stopPropagation());
    this.screen.addEventListener('mouseup', (e) => e.stopPropagation());

    // Create scroll spring (M3 Expressive - fluid with slight overshoot)
    this.scrollSpring = new Spring({
      stiffness: 100,
      damping: 26,
      mass: 1,
      initialValue: 0,
      onUpdate: (value) => {
        if (this.pickerItems) {
          this.pickerItems.style.transform = `translateY(${value}px)`;
        }
      }
    });

    // Generate picker numbers
    this.generatePickerItems();

    // Confirm button
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('click', () => this.confirm());
    }

    // Picker drag/scroll
    this.setupPickerInteraction();
  }

  generatePickerItems() {
    if (!this.pickerItems) return;

    this.pickerItems.innerHTML = '';

    for (let i = this.minUnits; i <= this.maxUnits; i++) {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.dataset.value = i;
      // Single digit numbers, no padding
      item.textContent = i.toString();
      this.pickerItems.appendChild(item);
    }

    this.updatePickerDisplay();
  }

  updatePickerDisplay(animate = true) {
    const items = this.pickerItems.querySelectorAll('.picker-item');
    const selectedIndex = this.selectedUnits - this.minUnits;
    const itemHeight = 32;
    const containerCenter = 80; // Half of 160px container

    items.forEach((item, index) => {
      const distance = index - selectedIndex;
      const absDistance = Math.abs(distance);

      // M3 Expressive: Scale based on distance from center
      const scale = Math.max(0.6, 1 - absDistance * 0.15);

      // Opacity based on distance
      const opacity = Math.max(0.15, 1 - absDistance * 0.3);

      // Font size interpolation
      const baseFontSize = 36;
      const minFontSize = 16;
      const fontSize = Math.max(minFontSize, baseFontSize - absDistance * 8);

      // Apply transforms
      item.style.transform = `scale(${scale})`;
      item.style.opacity = opacity;
      item.style.fontSize = `${fontSize}px`;
      item.style.fontWeight = absDistance === 0 ? '500' : '400';
    });

    // Center the selected item
    const offset = -(selectedIndex * itemHeight) + containerCenter - (itemHeight / 2);

    // Use spring animation for smooth scrolling
    if (this.scrollSpring && animate) {
      this.scrollSpring.setTarget(offset);
    } else {
      if (this.scrollSpring) this.scrollSpring.setValue(offset);
      this.pickerItems.style.transform = `translateY(${offset}px)`;
    }
  }

  setupPickerInteraction() {
    const picker = this.screen.querySelector('.number-picker');
    if (!picker) return;

    // Touch events
    picker.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.startY = e.touches[0].clientY;
      }
    });

    picker.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (this.isDragging && e.touches.length === 1) {
        const y = e.touches[0].clientY;
        const delta = this.startY - y;

        // 25px drag for one unit change
        if (Math.abs(delta) >= 25) {
          if (delta > 0) {
            this.incrementUnits(1);
          } else {
            this.incrementUnits(-1);
          }
          this.startY = y;
        }
      }
    });

    picker.addEventListener('touchend', (e) => {
      this.isDragging = false;
    });

    // Mouse events
    picker.addEventListener('mousedown', (e) => this.handleDragStart(e.clientY));
    picker.addEventListener('mousemove', (e) => {
      if (this.isDragging) this.handleDragMove(e.clientY);
    });
    picker.addEventListener('mouseup', () => this.handleDragEnd());
    picker.addEventListener('mouseleave', () => this.handleDragEnd());

    // Wheel event
    picker.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        this.incrementUnits(1);
      } else {
        this.incrementUnits(-1);
      }
    });
  }

  handleDragStart(y) {
    this.isDragging = true;
    this.startY = y;
    this.currentOffset = 0;
  }

  handleDragMove(y) {
    if (!this.isDragging) return;

    const delta = this.startY - y;

    // 40px per unit for controlled feel
    if (Math.abs(delta) >= 40) {
      if (delta > 0) {
        this.incrementUnits(1);
      } else {
        this.incrementUnits(-1);
      }
      this.startY = y;
    }
  }

  handleDragEnd() {
    this.isDragging = false;
    this.currentOffset = 0;
  }

  incrementUnits(delta) {
    const newValue = this.selectedUnits + delta;
    if (newValue >= this.minUnits && newValue <= this.maxUnits) {
      this.selectedUnits = newValue;
      this.updatePickerDisplay();
    }
  }

  /**
   * Show the med input screen with animation
   */
  show() {
    if (!this.screen) return;

    // Hide clock
    const fixedTime = document.querySelector('.fixed-time');
    const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
    if (fixedTime) fixedTime.style.opacity = '0';
    if (fixedTimeKnockout) fixedTimeKnockout.style.opacity = '0';

    // Reset to defaults
    this.selectedUnits = 1;

    // Set initial position without animation
    this.updatePickerDisplay(false);

    // Animate in
    this.screen.classList.add('active');
  }

  /**
   * Hide the med input screen
   */
  hide() {
    if (!this.screen) return;
    this.screen.classList.remove('active');
  }

  /**
   * Get the label for honey units (Croatian grammar)
   * 1 = "med", 2+ = "meda"
   */
  getMedLabel(units) {
    if (units === 1) {
      return 'med';
    }
    return `${units} meda`;
  }

  /**
   * Confirm the med entry and show confirmation
   * Same animation as insulin confirmation
   */
  confirm() {
    // Reset home screen to initial state (hide graph, show blob)
    if (window.resetToHomeView) {
      window.resetToHomeView();
    }

    const units = this.selectedUnits;
    const label = this.getMedLabel(units);

    // Get glucose blob instance
    const blobInstance = window.glucoseBlob;

    // Get elements
    const inputContent = this.screen.querySelector('.med-input-content');
    const navCircle = this.homeScreen.querySelector('.nav-circle');
    const homeBlob = this.homeScreen.querySelector('.glucose-blob');
    const addContextBtn = this.homeScreen.querySelector('.add-context-btn');

    // Lock glucose blob to center
    if (blobInstance && blobInstance.lockToCenter) {
      blobInstance.lockToCenter();
    }

    // Prepare home screen - hide nav elements, show blob
    if (navCircle) navCircle.style.opacity = '0';
    if (addContextBtn) addContextBtn.style.opacity = '0';
    if (homeBlob) homeBlob.style.opacity = '1';

    // Show home screen behind med screen
    if (this.homeScreen) {
      this.homeScreen.classList.add('active');
    }

    // Create checkmark overlay on the real blob
    const checkmarkOverlay = this.createCheckmarkOverlay();
    if (homeBlob) {
      homeBlob.appendChild(checkmarkOverlay);
    }

    // Create confirmation text overlay
    const confirmTextOverlay = this.createConfirmTextOverlay(units);
    this.homeScreen.appendChild(confirmTextOverlay);

    // Hide confirm button
    this.confirmBtn.style.opacity = '0';

    // Fade out med input content
    requestAnimationFrame(() => {
      if (inputContent) {
        inputContent.style.transition = 'opacity 0.5s ease-out';
        inputContent.style.opacity = '0';
      }
      // Fade out med screen background
      this.screen.style.transition = 'opacity 0.5s ease-out';
      this.screen.style.opacity = '0';
    });

    // At 500ms: show checkmark and confirmation text
    setTimeout(() => {
      checkmarkOverlay.style.transition = 'opacity 0.3s ease-out';
      checkmarkOverlay.style.opacity = '1';
      confirmTextOverlay.style.opacity = '1';
    }, 500);

    // At 1100ms: fade out checkmark
    setTimeout(() => {
      checkmarkOverlay.style.transition = 'opacity 0.5s ease-out';
      checkmarkOverlay.style.opacity = '0';
    }, 1100);

    // At 2500ms: fade out confirmation text, fade in nav elements
    setTimeout(() => {
      confirmTextOverlay.style.transition = 'opacity 0.5s ease-out';
      confirmTextOverlay.style.opacity = '0';

      if (navCircle) {
        navCircle.style.transition = 'opacity 0.6s ease-out';
        navCircle.style.opacity = '1';
      }
      if (addContextBtn) {
        addContextBtn.style.transition = 'opacity 0.6s ease-out';
        addContextBtn.style.opacity = '1';
      }
    }, 2500);

    // Final cleanup at 3200ms
    setTimeout(() => {
      this.hide();

      // Remove overlays
      if (checkmarkOverlay.parentNode) checkmarkOverlay.remove();
      if (confirmTextOverlay.parentNode) confirmTextOverlay.remove();

      // Reset all styles
      this.screen.style.transition = '';
      this.screen.style.opacity = '';
      this.confirmBtn.style.opacity = '';
      if (inputContent) {
        inputContent.style.transition = '';
        inputContent.style.opacity = '';
      }
      if (navCircle) {
        navCircle.style.transition = '';
        navCircle.style.opacity = '';
      }
      if (addContextBtn) {
        addContextBtn.style.transition = '';
        addContextBtn.style.opacity = '';
      }
      if (homeBlob) {
        homeBlob.style.transition = '';
        homeBlob.style.opacity = '';
      }

      // Show clock again
      const fixedTime = document.querySelector('.fixed-time');
      const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
      if (fixedTime) fixedTime.style.opacity = '';
      if (fixedTimeKnockout) fixedTimeKnockout.style.opacity = '';

      // Unlock glucose blob from center
      if (blobInstance && blobInstance.unlockFromCenter) {
        blobInstance.unlockFromCenter();
      }

      // Log the entry
      console.log(`Med logged: ${label}`);

      // Dispatch event
      document.dispatchEvent(new CustomEvent('medLogged', {
        detail: { units }
      }));
    }, 3200);
  }

  /**
   * Create checkmark SVG overlay for the blob
   */
  createCheckmarkOverlay() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      pointer-events: none;
    `;

    const checkmark = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    checkmark.setAttribute('d', 'M 38 50 L 46 58 L 62 42');
    checkmark.setAttribute('stroke', '#000000');
    checkmark.setAttribute('stroke-width', '4');
    checkmark.setAttribute('stroke-linecap', 'round');
    checkmark.setAttribute('stroke-linejoin', 'round');
    checkmark.setAttribute('fill', 'none');
    svg.appendChild(checkmark);

    return svg;
  }

  /**
   * Create confirmation text overlay
   */
  createConfirmTextOverlay(units) {
    const label = this.getMedLabel(units);

    const textSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    textSvg.setAttribute('viewBox', '0 0 252 252');
    textSvg.setAttribute('width', '252');
    textSvg.setAttribute('height', '252');
    textSvg.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.3s ease-out;
      pointer-events: none;
      z-index: 10;
    `;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const arcPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arcPath.setAttribute('id', 'medConfirmTextArc');
    arcPath.setAttribute('d', 'M 42.2,161.5 A 91,91 0 0,0 209.8,161.5');
    arcPath.setAttribute('fill', 'none');
    defs.appendChild(arcPath);
    textSvg.appendChild(defs);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-family', 'Roboto Flex, sans-serif');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-weight', '400');
    text.setAttribute('letter-spacing', '1');

    const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
    textPath.setAttribute('href', '#medConfirmTextArc');
    textPath.setAttribute('startOffset', '50%');
    textPath.setAttribute('text-anchor', 'middle');
    textPath.textContent = label;

    text.appendChild(textPath);
    textSvg.appendChild(text);

    return textSvg;
  }
}

// Export
window.MedInputController = MedInputController;
