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

    // Spring instances for + button and graph (not menu buttons - CSS handles those)
    this.buttonPositionSpring = new Spring({
      stiffness: 300,
      damping: 22,
      mass: 0.8,
      initialValue: 10,
      onUpdate: (value) => this.updateButtonPosition(value)
    });

    this.graphOffsetSpring = new Spring({
      stiffness: 250,
      damping: 20,
      mass: 1.0,
      initialValue: 0,
      onUpdate: (value) => this.updateGraphOffset(value)
    });

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

    // Stop all touch events from bubbling to display (prevents swipe/drag interference)
    this.addBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    this.addBtn.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    this.addBtn.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });

    // Override the default click handler
    this.addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Context button handlers
    this.contextBtns.forEach(btn => {
      btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      btn.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
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

    // Hide knockout text (blob is not visible when menu is open)
    const timeKnockout = document.querySelector('.fixed-time-knockout');
    const navKnockout = document.querySelector('.nav-circle-knockout');
    if (timeKnockout) timeKnockout.style.opacity = '0';
    if (navKnockout) navKnockout.style.opacity = '0';

    // Clear any inline styles on context buttons (let CSS take over)
    this.contextBtns.forEach(btn => {
      btn.style.opacity = '';
      btn.style.transform = '';
    });

    // Add open class - CSS transitions handle button show/hide with stagger
    this.contextMenu.classList.add('open');

    // Animate + button to center
    this.buttonPositionSpring.setTarget(104);

    // Rotate icon to X (45°) via CSS
    if (this.plusIcon) this.plusIcon.classList.add('rotated');

    // Fade button background to black
    this.buttonBgSpring.setTarget(1);

    // Slide graph to the right (fully out of view)
    this.graphOffsetSpring.setTarget(280);

    // Animation complete
    setTimeout(() => {
      this.isAnimating = false;
    }, 400);
  }

  close() {
    if (!this.isOpen || this.isAnimating) return;

    this.isAnimating = true;
    this.isOpen = false;

    // Show knockout text again (blob will be visible)
    const timeKnockout = document.querySelector('.fixed-time-knockout');
    const navKnockout = document.querySelector('.nav-circle-knockout');
    if (timeKnockout) timeKnockout.style.opacity = '';
    if (navKnockout) navKnockout.style.opacity = '';

    // Remove open class - CSS transitions handle button hide with reverse stagger
    this.contextMenu.classList.remove('open');

    // Animate + button back to left
    this.buttonPositionSpring.setTarget(10);

    // Rotate icon back to +
    if (this.plusIcon) this.plusIcon.classList.remove('rotated');

    // Fade button background back to gray
    this.buttonBgSpring.setTarget(0);

    // Slide graph back
    this.graphOffsetSpring.setTarget(0);

    // Animation complete
    setTimeout(() => {
      this.isAnimating = false;
    }, 400);
  }

  updateButtonPosition(x) {
    if (!this.addBtn) return;
    this.addBtn.style.left = `${x}px`;
  }

  updateGraphOffset(offset) {
    if (this.graph) {
      const svg = this.graph.querySelector('.graph-svg');
      if (svg) {
        svg.style.transform = `translateX(${offset}px)`;
      }
    }

    if (this.blob && !this.blob.classList.contains('fade-out')) {
      if (offset > 0) {
        this.blob.style.transform = `translate(calc(-50% + ${offset}px), -50%)`;
      } else {
        this.blob.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  updateButtonBackground(progress) {
    if (!this.addBtn) return;
    const gray = 44;
    const value = Math.round(gray * (1 - progress));
    this.addBtn.style.backgroundColor = `rgb(${value}, ${value}, ${value})`;
  }

  handleContextAction(action) {
    console.log(`Context action: ${action}`);

    const clickedBtn = this.contextMenu.querySelector(`[data-action="${action}"]`);
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    }

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

    // Reset context buttons (clear inline styles, let CSS defaults apply)
    this.contextBtns.forEach((btn) => {
      btn.style.opacity = '';
      btn.style.transform = '';
      btn.classList.remove('active');
    });

    // Reset + button position and rotation
    this.addBtn.style.left = '10px';
    this.addBtn.style.backgroundColor = '';
    if (this.plusIcon) this.plusIcon.classList.remove('rotated');

    // Reset springs
    this.buttonPositionSpring.setValue(10);
    this.buttonBgSpring.setValue(0);
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

  isMenuOpen() {
    return this.isOpen;
  }
}

window.ContextMenuController = ContextMenuController;
