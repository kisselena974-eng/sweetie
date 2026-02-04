/**
 * Insulin Input Controller
 * Handles the insulin logging flow with M3 Expressive animations
 */

class InsulinInputController {
  constructor() {
    this.screen = document.querySelector('[data-screen="insulin-input"]');
    this.confirmScreen = document.querySelector('[data-screen="insulin-confirm"]');
    this.homeScreen = document.querySelector('[data-screen="home"]');

    // State
    this.selectedType = 'brzi'; // 'brzi' or 'dnevni'
    this.selectedUnits = 10;
    this.minUnits = 1;
    this.maxUnits = 50;

    // Elements
    this.tabs = null;
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

    this.tabs = this.screen.querySelectorAll('.insulin-tab');
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

    // Tab selection
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.selectType(tab.dataset.type));
    });

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
      item.textContent = i.toString().padStart(2, '0');
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
      // Center item is largest, items scale down towards edges
      const scale = Math.max(0.6, 1 - absDistance * 0.15);

      // Opacity based on distance
      const opacity = Math.max(0.15, 1 - absDistance * 0.3);

      // Font size interpolation
      const baseFontSize = 36;
      const minFontSize = 16;
      const fontSize = Math.max(minFontSize, baseFontSize - absDistance * 8);

      // Apply transforms with CSS transitions for smooth interpolation
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

    // Track touch count for precision mode
    this.touchCount = 0;
    this.lastTwoFingerY = 0;

    // Touch events - simple one finger drag
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

    // Update units based on drag distance (40px per unit for controlled feel)
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

  selectType(type) {
    this.selectedType = type;

    this.tabs.forEach(tab => {
      if (tab.dataset.type === type) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  /**
   * Show the insulin input screen with animation
   */
  show() {
    if (!this.screen) return;

    // Hide clock
    const fixedTime = document.querySelector('.fixed-time');
    const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
    if (fixedTime) fixedTime.style.opacity = '0';
    if (fixedTimeKnockout) fixedTimeKnockout.style.opacity = '0';

    // Reset to defaults
    this.selectedUnits = 10;
    this.selectedType = 'brzi';
    this.selectType('brzi');

    // Set initial position without animation
    this.updatePickerDisplay(false);

    // Animate in
    this.screen.classList.add('active');
  }

  /**
   * Hide the insulin input screen
   */
  hide() {
    if (!this.screen) return;
    this.screen.classList.remove('active');
  }

  /**
   * Confirm the insulin entry and show confirmation
   * Uses the real glucose blob instead of a transition blob for seamless animation
   */
  confirm() {
    // Resetiraj home ekran na početno stanje (sakrij graf, prikaži blob)
    if (window.resetToHomeView) {
      window.resetToHomeView();
    }

    const units = this.selectedUnits;
    const type = this.selectedType;
    const typeLabel = type === 'brzi' ? 'brzog' : 'dnevnog';

    // Get glucose blob instance
    const blobInstance = window.glucoseBlob;

    // Get elements
    const inputContent = this.screen.querySelector('.insulin-input-content');
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
    if (homeBlob) homeBlob.style.opacity = '1'; // Blob is visible from start

    // Show home screen behind insulin screen
    if (this.homeScreen) {
      this.homeScreen.classList.add('active');
    }

    // Create checkmark overlay on the real blob
    const checkmarkOverlay = this.createCheckmarkOverlay();
    if (homeBlob) {
      homeBlob.appendChild(checkmarkOverlay);
    }

    // Create confirmation text overlay
    const confirmTextOverlay = this.createConfirmTextOverlay(units, type);
    this.homeScreen.appendChild(confirmTextOverlay);

    // Hide confirm button
    this.confirmBtn.style.opacity = '0';

    // Fade out insulin input content
    requestAnimationFrame(() => {
      if (inputContent) {
        inputContent.style.transition = 'opacity 0.5s ease-out';
        inputContent.style.opacity = '0';
      }
      // Fade out insulin screen background
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

    // At 2500ms: fade out confirmation text, fade in nav elements and clock
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

      // Fade in clock together with other elements
      const fixedTime = document.querySelector('.fixed-time');
      const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
      if (fixedTime) {
        fixedTime.style.transition = 'opacity 0.6s ease-out';
        fixedTime.style.opacity = '1';
      }
      if (fixedTimeKnockout) {
        fixedTimeKnockout.style.transition = 'opacity 0.6s ease-out';
        fixedTimeKnockout.style.opacity = '1';
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

      // Reset clock styles
      const fixedTime = document.querySelector('.fixed-time');
      const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
      if (fixedTime) {
        fixedTime.style.transition = '';
        fixedTime.style.opacity = '';
      }
      if (fixedTimeKnockout) {
        fixedTimeKnockout.style.transition = '';
        fixedTimeKnockout.style.opacity = '';
      }

      // Unlock glucose blob from center - smooth ease out
      if (blobInstance && blobInstance.unlockFromCenter) {
        blobInstance.unlockFromCenter();
      }

      // Log the entry
      console.log(`Insulin logged: ${units} jedinica ${typeLabel}`);

      // Dispatch event
      document.dispatchEvent(new CustomEvent('insulinLogged', {
        detail: { units, type }
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
  createConfirmTextOverlay(units, type) {
    const typeLabel = type === 'brzi' ? 'brzog' : 'dnevnog';

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
    arcPath.setAttribute('id', 'confirmTextArc');
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
    textPath.setAttribute('href', '#confirmTextArc');
    textPath.setAttribute('startOffset', '50%');
    textPath.setAttribute('text-anchor', 'middle');
    textPath.textContent = `${units} jedinica ${typeLabel}`;

    text.appendChild(textPath);
    textSvg.appendChild(text);

    return textSvg;
  }

  updateConfirmationText(units, typeLabel) {
    if (!this.confirmScreen) return;

    const textPath = this.confirmScreen.querySelector('.confirm-text textPath');
    if (textPath) {
      textPath.innerHTML = `<tspan class="confirm-amount">${units} jedinica</tspan> <tspan class="confirm-type">${typeLabel}</tspan>`;
    }
  }

  showConfirmation() {
    if (!this.confirmScreen) return;
    this.confirmScreen.classList.add('active');
  }

  hideConfirmation() {
    if (!this.confirmScreen) return;

    const confirmBlob = this.confirmScreen.querySelector('.confirm-blob');
    const confirmText = this.confirmScreen.querySelector('.confirm-text');
    const checkmark = confirmBlob?.querySelector('svg');

    // Get glucose color from the home screen
    const glucoseTextEl = document.querySelector('.nav-glucose');
    const glucoseColor = glucoseTextEl ? getComputedStyle(glucoseTextEl).fill : '#7ED321';

    // Fade text and checkmark
    if (confirmText) {
      confirmText.style.transition = 'opacity 0.5s ease-out';
      confirmText.style.opacity = '0';
    }
    if (checkmark) {
      checkmark.style.transition = 'opacity 0.5s ease-out';
      checkmark.style.opacity = '0';
    }

    // Transition blob color from white to glucose color
    if (confirmBlob) {
      confirmBlob.style.transition = 'background-color 0.6s ease-out';
      confirmBlob.style.backgroundColor = glucoseColor;
    }

    // After color transition, switch to home screen
    setTimeout(() => {
      this.confirmScreen.classList.remove('active');

      // Show home screen
      if (this.homeScreen) {
        this.homeScreen.classList.add('active');
      }

      // Reset confirm blob for next time
      setTimeout(() => {
        if (confirmBlob) {
          confirmBlob.style.transition = '';
          confirmBlob.style.backgroundColor = '';
        }
        if (confirmText) {
          confirmText.style.transition = '';
          confirmText.style.opacity = '1';
        }
        if (checkmark) {
          checkmark.style.transition = '';
          checkmark.style.opacity = '1';
        }
      }, 100);

      // Dispatch event that insulin was logged
      document.dispatchEvent(new CustomEvent('insulinLogged', {
        detail: {
          units: this.selectedUnits,
          type: this.selectedType
        }
      }));
    }, 600);
  }
}

// Export
window.InsulinInputController = InsulinInputController;
