/**
 * Context Menu Controller
 * M3 Expressive animated transition for adding context (meal, insulin, activity, med)
 */

class ContextMenuController {
  constructor() {
    this.isOpen = false;
    this.isAnimating = false;

    // DOM elements (scope to home screen only)
    const homeScreen = document.querySelector('[data-screen="home"]');
    this.addBtn = homeScreen ? homeScreen.querySelector('.add-context-btn') : null;
    this.plusIcon = this.addBtn ? this.addBtn.querySelector('.plus-icon') : null;
    this.contextMenu = document.querySelector('.context-menu');
    this.contextBtns = document.querySelectorAll('.context-btn');
    this.graph = document.querySelector('.glucose-graph');
    this.blob = null; // Will be set after blob is created

    // Spring instances for coordinated animation
    // Button position: 10 → 104 (center minus half button width: 126 - 22 = 104)
    this.buttonPositionSpring = new Spring({
      stiffness: 300,
      damping: 22,
      mass: 0.8,
      initialValue: 10,
      onUpdate: (value) => this.updateButtonPosition(value)
    });

    // Icon rotation handled by CSS transition (simpler, more reliable)

    // Graph offset: 0 → 280px (slides right and fully out of view)
    this.graphOffsetSpring = new Spring({
      stiffness: 250,
      damping: 20,
      mass: 1.0,
      initialValue: 0,
      onUpdate: (value) => this.updateGraphOffset(value)
    });

    // Menu button springs (for staggered animation)
    this.menuButtonSprings = [];
    this.contextBtns.forEach((btn, index) => {
      const spring = new Spring({
        stiffness: 400,
        damping: 28,
        mass: 0.5,
        initialValue: 0,
        onUpdate: (value) => this.updateMenuButton(btn, value)
      });
      this.menuButtonSprings.push(spring);
    });

    // Button background: gray (0) → black (1)
    this.buttonBgSpring = new Spring({
      stiffness: 300,
      damping: 25,
      mass: 0.8,
      initialValue: 0,
      onUpdate: (value) => this.updateButtonBackground(value)
    });

    this.init();
  }

  init() {
    if (!this.addBtn) return;

    // Override the default click handler
    this.addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Context button handlers
    this.contextBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleContextAction(action);
      });
    });

    // Get blob reference after it's created
    setTimeout(() => {
      this.blob = document.querySelector('.glucose-blob');
    }, 200);
  }

  toggle() {
    if (this.isAnimating) return;

    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (this.isOpen || this.isAnimating) return;

    this.isAnimating = true;
    this.isOpen = true;

    // Add open class for pointer events
    this.contextMenu.classList.add('open');

    // Animate button to center
    this.buttonPositionSpring.setTarget(104);

    // Rotate icon to X (45°) via CSS
    if (this.plusIcon) this.plusIcon.classList.add('rotated');

    // Fade button background to black
    this.buttonBgSpring.setTarget(1);

    // Slide graph to the right (fully out of view)
    this.graphOffsetSpring.setTarget(280);

    // Staggered animation for menu buttons
    const staggerDelay = 40; // ms between each button
    this.contextBtns.forEach((btn, index) => {
      setTimeout(() => {
        this.menuButtonSprings[index].setTarget(1);
      }, index * staggerDelay);
    });

    // Animation complete
    setTimeout(() => {
      this.isAnimating = false;
    }, 400);
  }

  close() {
    if (!this.isOpen || this.isAnimating) return;

    this.isAnimating = true;
    this.isOpen = false;

    // Animate button back to left
    this.buttonPositionSpring.setTarget(10);

    // Rotate icon back to +
    if (this.plusIcon) this.plusIcon.classList.remove('rotated');

    // Fade button background back to gray
    this.buttonBgSpring.setTarget(0);

    // Slide graph back
    this.graphOffsetSpring.setTarget(0);

    // Reverse staggered animation for menu buttons
    const staggerDelay = 30;
    const reversedButtons = [...this.contextBtns].reverse();
    reversedButtons.forEach((btn, index) => {
      const originalIndex = this.contextBtns.length - 1 - index;
      setTimeout(() => {
        this.menuButtonSprings[originalIndex].setTarget(0);
      }, index * staggerDelay);
    });

    // Animation complete
    setTimeout(() => {
      this.contextMenu.classList.remove('open');
      this.isAnimating = false;
    }, 400);
  }

  updateButtonPosition(x) {
    if (!this.addBtn) return;
    this.addBtn.style.left = `${x}px`;
  }


  updateGraphOffset(offset) {
    // Apply offset to graph SVG content
    if (this.graph) {
      const svg = this.graph.querySelector('.graph-svg');
      if (svg) {
        svg.style.transform = `translateX(${offset}px)`;
      }
    }

    // Also offset the blob if visible
    if (this.blob && !this.blob.classList.contains('fade-out')) {
      // Blob uses translate(-50%, -50%), so we need to adjust
      const currentTransform = this.blob.style.transform || 'translate(-50%, -50%)';
      if (offset > 0) {
        this.blob.style.transform = `translate(calc(-50% + ${offset}px), -50%)`;
      } else {
        this.blob.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  updateMenuButton(btn, progress) {
    // progress: 0 = hidden, 1 = visible
    btn.style.opacity = progress;
    btn.style.transform = `scale(${0.8 + progress * 0.2})`;
  }

  updateButtonBackground(progress) {
    if (!this.addBtn) return;
    // Interpolate from gray (#2C2C2C / rgb 44,44,44) to black (#000000)
    const gray = 44;
    const value = Math.round(gray * (1 - progress));
    this.addBtn.style.backgroundColor = `rgb(${value}, ${value}, ${value})`;
  }

  handleContextAction(action) {
    console.log(`Context action: ${action}`);

    // Find the clicked button and add active state (transparent background)
    const clickedBtn = this.contextMenu.querySelector(`[data-action="${action}"]`);
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    }

    // Emit event for app to handle
    const event = new CustomEvent('contextMenuAction', {
      detail: { action }
    });
    document.dispatchEvent(event);
  }

  /**
   * Reset menu state without animation (call after new screen is visible)
   */
  resetState() {
    this.isOpen = false;
    this.isAnimating = false;

    // Reset button states
    this.contextBtns.forEach((btn) => {
      btn.style.opacity = '0';
      btn.style.transform = 'scale(0.8)';
      btn.classList.remove('active');
    });

    // Reset button position and rotation
    this.addBtn.style.left = '10px';
    this.addBtn.style.backgroundColor = '';
    if (this.plusIcon) this.plusIcon.classList.remove('rotated');

    // Reset springs to initial values
    this.buttonPositionSpring.setValue(10);
    this.buttonBgSpring.setValue(0);
    this.menuButtonSprings.forEach(s => s.setValue(0));
    this.graphOffsetSpring.setValue(0);

    // Reset graph/blob transforms
    if (this.graph) {
      const svg = this.graph.querySelector('.graph-svg');
      if (svg) svg.style.transform = '';
    }
    if (this.blob) {
      this.blob.style.transform = 'translate(-50%, -50%)';
    }

    // Remove open class
    this.contextMenu.classList.remove('open');
  }

  /**
   * Check if menu is currently open
   */
  isMenuOpen() {
    return this.isOpen;
  }
}

// Export for use in app.js
window.ContextMenuController = ContextMenuController;
