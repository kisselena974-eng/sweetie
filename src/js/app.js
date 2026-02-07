/**
 * Sweetie - Diabetes Management Smartwatch App
 * Main application logic
 */

const screens = ['home', 'assistant', 'tracking'];
let currentScreenIndex = 0;
let glucoseBlob = null;
let currentTrendAngle = 45; // Will be randomized on init
let contextMenuController = null;
let insulinInputController = null;
let medInputController = null;
let mealInputController = null;
let activityInputController = null;
let trackingController = null;

// Trend angles: 0=up (rising fast), 45=up-right (rising), 90=right (stable), 135=down-right (falling), 180=down (falling fast)
const TREND_ANGLES = [0, 45, 90, 135, 180];
const TREND_ICONS = ['↑', '↗', '→', '↘', '↓'];

// Glucose thresholds and colors
const GLUCOSE_THRESHOLDS = {
  DANGER_LOW: 4.0,
  WARNING_LOW: 4.5,
  WARNING_HIGH: 9.0,
  DANGER_HIGH: 10.0
};

const GLUCOSE_COLORS = {
  SAFE: '#7ED321',
  WARNING: '#FFD700',
  DANGER: '#FF4444'
};

/**
 * Get color for glucose value with smooth transitions
 */
function getColorForGlucose(glucose) {
  if (glucose < GLUCOSE_THRESHOLDS.DANGER_LOW || glucose > GLUCOSE_THRESHOLDS.DANGER_HIGH) {
    return GLUCOSE_COLORS.DANGER;
  }
  if (glucose < GLUCOSE_THRESHOLDS.WARNING_LOW || glucose > GLUCOSE_THRESHOLDS.WARNING_HIGH) {
    return GLUCOSE_COLORS.WARNING;
  }
  return GLUCOSE_COLORS.SAFE;
}

// Swipe detection
let isDragging = false;
let startY = 0;
let currentY = 0;
const SWIPE_THRESHOLD = 50;
let lastTouchTime = 0; // Prevents synthetic mouse events after touch

/**
 * Navigate to a screen by name with animated transitions
 */
function navigateTo(screenName, direction = 'up') {
  const allScreens = document.querySelectorAll('.screen');
  const currentScreen = document.querySelector('.screen.active');
  const targetScreen = document.querySelector(`[data-screen="${screenName}"]`);

  if (!targetScreen || targetScreen === currentScreen) return;

  const currentScreenName = currentScreen ? currentScreen.dataset.screen : null;
  const newIndex = screens.indexOf(screenName);

  // Check if transitioning between pages that have glucose display (home, assistant, tracking)
  const glucoseScreens = ['home', 'assistant', 'tracking'];
  const isGlucoseTransition =
    glucoseScreens.includes(currentScreenName) && glucoseScreens.includes(screenName);

  // Show fixed glucose during transition between home and assistant
  if (isGlucoseTransition) {
    showFixedGlucose();
  }

  // Determine exit direction based on navigation
  if (currentScreen) {
    currentScreen.classList.remove('active');
    currentScreen.classList.add(direction === 'up' ? 'exit-up' : 'exit-down');

    // Clean up exit classes after transition
    setTimeout(() => {
      currentScreen.classList.remove('exit-up', 'exit-down');
    }, 350); // Match --duration-long
  }

  // Set enter direction and activate
  targetScreen.classList.add(direction === 'up' ? 'enter-from-bottom' : 'enter-from-top');

  // Force reflow to ensure the enter class is applied before adding active
  targetScreen.offsetHeight;

  targetScreen.classList.remove('enter-from-bottom', 'enter-from-top');
  targetScreen.classList.add('active');

  currentScreenIndex = newIndex;

  // Hide fixed glucose after transition completes
  if (isGlucoseTransition) {
    setTimeout(() => {
      hideFixedGlucose();
    }, 350); // Match --duration-long
  }

  // Update nav dots
  updateNavDots(newIndex);

  // Show/hide blob knockout layers based on screen
  const timeKnockout = document.querySelector('.fixed-time-knockout');
  const blobKnockout = document.querySelector('.nav-circle-knockout');
  if (screenName === 'home') {
    if (timeKnockout) timeKnockout.style.display = '';
    if (blobKnockout) blobKnockout.style.display = '';
  } else {
    if (timeKnockout) timeKnockout.style.display = 'none';
    if (blobKnockout) blobKnockout.style.display = 'none';
  }

  // Sync assistant glucose display when navigating to it
  if (screenName === 'assistant') {
    const homeGlucose = document.querySelector('.nav-circle-base .nav-glucose textPath');
    const assistantGlucose = document.querySelector('.assistant-glucose-text textPath');
    if (homeGlucose && assistantGlucose) {
      assistantGlucose.textContent = homeGlucose.textContent;
    }
    // Update arrow position after value sync
    setTimeout(() => updateAssistantArrowPosition(), 50);
  }

  // Sync tracking glucose display when navigating to it
  if (screenName === 'tracking' && window.trackingController) {
    window.trackingController.syncGlucoseDisplay();
  }
}

/**
 * Show fixed glucose display during page transitions
 */
function showFixedGlucose() {
  const fixedGlucose = document.querySelector('.fixed-glucose');
  const homeGlucose = document.querySelector('.nav-circle-base .nav-glucose');
  const homeArrow = document.querySelector('.nav-circle-base .nav-arrow');
  const assistantNav = document.querySelector('.assistant-nav');
  const trackingNav = document.querySelector('.tracking-nav');

  if (!fixedGlucose) return;

  // Show fixed glucose and hide screen elements in same frame
  fixedGlucose.classList.add('visible');
  if (homeGlucose) homeGlucose.style.visibility = 'hidden';
  if (homeArrow) homeArrow.style.visibility = 'hidden';
  if (assistantNav) assistantNav.style.visibility = 'hidden';
  if (trackingNav) trackingNav.style.visibility = 'hidden';
}

/**
 * Hide fixed glucose display after page transitions
 */
function hideFixedGlucose() {
  const fixedGlucose = document.querySelector('.fixed-glucose');
  const homeGlucose = document.querySelector('.nav-circle-base .nav-glucose');
  const homeArrow = document.querySelector('.nav-circle-base .nav-arrow');
  const assistantNav = document.querySelector('.assistant-nav');
  const trackingNav = document.querySelector('.tracking-nav');

  if (!fixedGlucose) return;

  // Show screen elements first, then hide fixed glucose
  if (homeGlucose) homeGlucose.style.visibility = '';
  if (homeArrow) homeArrow.style.visibility = '';
  if (assistantNav) assistantNav.style.visibility = '';

  // Only show tracking glucose if info mode is off
  if (trackingNav) {
    const isInfoModeOn = window.trackingController && window.trackingController.isInfoMode;
    if (!isInfoModeOn) {
      trackingNav.style.visibility = '';
    }
  }

  fixedGlucose.classList.remove('visible');
}

/**
 * Update navigation dots to reflect current screen
 */
function updateNavDots(index) {
  // Fixed page dots outside screens
  const pageDots = document.querySelectorAll('.page-dots .page-dot');
  pageDots.forEach((dot, i) => {
    if (i === index) {
      dot.classList.add('active');
      dot.setAttribute('r', '3.5');
    } else {
      dot.classList.remove('active');
      dot.setAttribute('r', '3');
    }
  });
}

/**
 * Navigate to next screen (swipe up)
 */
function nextScreen() {
  if (currentScreenIndex < screens.length - 1) {
    navigateTo(screens[currentScreenIndex + 1], 'up');
  }
}

/**
 * Navigate to previous screen (swipe down)
 */
function prevScreen() {
  if (currentScreenIndex > 0) {
    navigateTo(screens[currentScreenIndex - 1], 'down');
  }
}

/**
 * Handle mouse/touch start
 */
function handleDragStart(e) {
  // Ignore synthetic mouse events fired after touch (300ms delay causes bugs)
  if (Date.now() - lastTouchTime < 500) return;

  // Don't interfere with button clicks
  if (e.target.closest('button') || e.target.closest('.context-btn')) {
    return;
  }
  isDragging = true;
  startY = e.clientY || e.touches?.[0]?.clientY || 0;
  currentY = startY;
}

/**
 * Handle mouse/touch move
 */
function handleDragMove(e) {
  if (!isDragging) return;
  if (Date.now() - lastTouchTime < 500) return;
  currentY = e.clientY || e.touches?.[0]?.clientY || 0;
}

/**
 * Handle mouse/touch end
 */
function handleDragEnd() {
  if (!isDragging) return;
  if (Date.now() - lastTouchTime < 500) { isDragging = false; return; }
  isDragging = false;

  // Don't change page if blob is being dragged
  if (glucoseBlob && glucoseBlob.isDragging) {
    return;
  }

  const deltaY = startY - currentY;

  if (Math.abs(deltaY) >= SWIPE_THRESHOLD) {
    if (deltaY > 0) {
      nextScreen(); // Swipe up
    } else {
      prevScreen(); // Swipe down
    }
  }
}

/**
 * Handle touch start (mobile)
 */
function handleTouchStart(e) {
  lastTouchTime = Date.now();

  // Don't interfere with button clicks
  if (e.target.closest('button') || e.target.closest('.context-btn')) {
    return;
  }
  isDragging = true;
  startY = e.touches[0].clientY;
  currentY = startY;
}

/**
 * Handle touch move (mobile)
 */
function handleTouchMove(e) {
  if (!isDragging) return;
  currentY = e.touches[0].clientY;
}

/**
 * Handle touch end (mobile)
 */
function handleTouchEnd(e) {
  if (!isDragging) return;
  isDragging = false;

  // Don't change page if blob is being dragged
  if (glucoseBlob && glucoseBlob.isDragging) {
    return;
  }

  const deltaY = startY - currentY;

  if (Math.abs(deltaY) >= SWIPE_THRESHOLD) {
    if (deltaY > 0) {
      nextScreen(); // Swipe up
    } else {
      prevScreen(); // Swipe down
    }
  }
}

/**
 * Update all time displays with current time
 */
function updateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeString = `${hours}:${minutes}`;

  // Update fixed time elements (base and knockout)
  const fixedTime = document.querySelector('.fixed-time-text textPath');
  const fixedTimeKnockout = document.querySelector('.fixed-time-text-knockout textPath');

  if (fixedTime) {
    fixedTime.textContent = timeString;
  }
  if (fixedTimeKnockout) {
    fixedTimeKnockout.textContent = timeString;
  }
}

/**
 * Initialize the app
 */
function init() {
  const display = document.querySelector('.watch-display');

  // Mouse events for desktop
  display.addEventListener('mousedown', handleDragStart);
  display.addEventListener('mousemove', handleDragMove);
  display.addEventListener('mouseup', handleDragEnd);
  display.addEventListener('mouseleave', handleDragEnd);

  // Touch events for mobile
  display.addEventListener('touchstart', handleTouchStart, { passive: false });
  display.addEventListener('touchmove', handleTouchMove, { passive: false });
  display.addEventListener('touchend', handleTouchEnd);

  // Prevent text selection while dragging
  display.addEventListener('selectstart', e => e.preventDefault());

  // Initialize time display and update every minute
  updateTime();
  setInterval(updateTime, 1000); // Update every second for accuracy

  console.log('Sweetie app initialized');
}

/**
 * Home screen - Add context button handler and glucose blob
 */
function initHomeScreen() {
  const addContextBtn = document.querySelector('.add-context-btn');
  const homeScreen = document.querySelector('[data-screen="home"]');

  // Context menu is initialized separately via ContextMenuController
  // The controller handles the add-context-btn click events

  // Initialize the glucose blob
  if (homeScreen) {
    // Listen for color changes BEFORE creating blob (so initial event is caught)
    homeScreen.addEventListener('glucoseColorChange', (e) => {
      const color = e.detail.color;
      const glucose = e.detail.glucose;
      updateGlucoseTextColor(color); // Graph elements

      // Set global CSS variable for accent color (used by tracking screen, etc.)
      document.documentElement.style.setProperty('--accent-color', color);

      // Update landing page title color
      document.documentElement.style.setProperty('--landing-accent-color', color);

      // Update glucose text and arrow to match blob
      const glucoseText = document.querySelector('.nav-circle-base .nav-glucose');
      const arrow = document.querySelector('.nav-circle-base .nav-arrow path');
      if (glucoseText) glucoseText.style.fill = color;
      if (arrow) {
        arrow.style.fill = color;
        arrow.style.stroke = color;
      }

      // Update fixed glucose color (for transitions)
      const fixedGlucoseText = document.querySelector('.fixed-glucose-text');
      const fixedGlucoseArrow = document.querySelector('.fixed-glucose-arrow path');
      if (fixedGlucoseText) fixedGlucoseText.style.fill = color;
      if (fixedGlucoseArrow) {
        fixedGlucoseArrow.style.fill = color;
        fixedGlucoseArrow.style.stroke = color;
      }

      // Update tracking screen glucose color
      const trackingGlucoseText = document.querySelector('.tracking-glucose-text');
      const trackingGlucoseArrow = document.querySelector('.tracking-glucose-arrow path');
      if (trackingGlucoseText) trackingGlucoseText.style.fill = color;
      if (trackingGlucoseArrow) {
        trackingGlucoseArrow.style.fill = color;
        trackingGlucoseArrow.style.stroke = color;
      }

      // Update tracking screen with current glucose (for high glucose alert)
      if (window.trackingController && glucose !== undefined) {
        window.trackingController.setGlucose(glucose);
      }

      // Re-render context markers with new accent color
      if (window.graphSlider && window.graphSlider.contextMarkers.length > 0) {
        window.graphSlider.renderContextMarkers();
      }
    });

    // Get initial glucose from the display (parse from text)
    const glucoseText = document.querySelector('.nav-circle-base .nav-glucose textPath');
    const initialGlucose = glucoseText
      ? parseFloat(glucoseText.textContent.replace(',', '.'))
      : 6.5;

    glucoseBlob = new GlucoseBlob(homeScreen, {
      initialGlucose,
      baseSize: 85
    });

    // Expose globally for transitions
    window.glucoseBlob = glucoseBlob;

    // Set initial arrow position and trend
    updateArrowPosition();
    glucoseBlob.setTrendDirection(currentTrendAngle);

    // Make blob clickable to show graph (but not when dragging)
    setTimeout(() => {
      const blobElement = homeScreen.querySelector('.glucose-blob');
      if (blobElement) {
        // Desktop: click event
        blobElement.addEventListener('click', () => {
          if (glucoseBlob && glucoseBlob.wasRecentlyDragged()) {
            return;
          }
          toggleGraphView();
        });

        // Mobile: touchend (because blob's touchstart preventDefault blocks click)
        blobElement.addEventListener('touchend', (e) => {
          if (glucoseBlob && glucoseBlob.wasRecentlyDragged()) {
            return;
          }
          // Only toggle if finger didn't move (tap, not drag)
          if (glucoseBlob && !glucoseBlob.hasMoved) {
            e.preventDefault(); // Prevent synthetic click
            toggleGraphView();
          }
        });
      }
    }, 100);
  }

  // Initialize graph toggle
  initGraphToggle();

  // Initialize assistant mic interaction
  initAssistantMic();

  // Initialize assistant context menu
  initAssistantContext();
}

/**
 * Update graph elements color (follows blob's smooth color)
 */
function updateGlucoseTextColor(color) {
  // Update graph elements to match blob color
  const graphHighlight = document.querySelector('.graph-line-highlight');
  const graphDot = document.querySelector('.graph-now-dot');
  const graphLine = document.querySelector('.graph-now-line');
  const graphText = document.querySelector('.graph-now-text');

  if (graphHighlight) {
    graphHighlight.style.stroke = color;
  }
  if (graphDot) {
    graphDot.style.fill = color;
  }
  if (graphLine) {
    graphLine.style.stroke = color;
  }
  if (graphText) {
    graphText.style.fill = color;
  }

  // Update debug trend arrow color too
  const trendArrowPath = document.querySelector('.trend-arrow-btn path');
  if (trendArrowPath) {
    trendArrowPath.style.fill = color;
  }
}

/**
 * Update glucose value (can be called externally)
 */
function setGlucoseValue(value) {
  if (glucoseBlob) {
    glucoseBlob.setGlucose(value);
  }

  // Format with comma for European style
  const formattedValue = value.toFixed(1).replace('.', ',');

  // Update the displayed value (base layer)
  const glucoseText = document.querySelector('.nav-circle-base .nav-glucose textPath');
  if (glucoseText) {
    glucoseText.textContent = formattedValue;
  }

  // Update knockout layer glucose text (for AAA contrast knockout effect)
  const glucoseTextKnockout = document.querySelector('.nav-circle-knockout .nav-glucose-knockout textPath');
  if (glucoseTextKnockout) {
    glucoseTextKnockout.textContent = formattedValue;
  }

  // Update assistant screen glucose text
  const assistantGlucose = document.querySelector('.assistant-glucose-text textPath');
  if (assistantGlucose) {
    assistantGlucose.textContent = formattedValue;
  }

  // Update fixed glucose text (for transitions)
  const fixedGlucose = document.querySelector('.fixed-glucose-text textPath');
  if (fixedGlucose) {
    fixedGlucose.textContent = formattedValue;
  }

  // Update tracking screen glucose text
  const trackingGlucose = document.querySelector('.tracking-glucose-text textPath');
  if (trackingGlucose) {
    trackingGlucose.textContent = formattedValue;
  }

  // Use blob's color for glucose text and arrow (matches blob exactly)
  const blobColor = glucoseBlob ? glucoseBlob.getColor() : getColorForGlucose(value);
  const glucoseTextElement = document.querySelector('.nav-circle-base .nav-glucose');
  const glucoseArrow = document.querySelector('.nav-circle-base .nav-arrow path');

  if (glucoseTextElement) {
    glucoseTextElement.style.fill = blobColor;
  }
  if (glucoseArrow) {
    glucoseArrow.style.fill = blobColor;
    glucoseArrow.style.stroke = blobColor;
  }

  // Update fixed glucose color (for transitions)
  const fixedGlucoseText = document.querySelector('.fixed-glucose-text');
  const fixedGlucoseArrow = document.querySelector('.fixed-glucose-arrow path');
  if (fixedGlucoseText) {
    fixedGlucoseText.style.fill = blobColor;
  }
  if (fixedGlucoseArrow) {
    fixedGlucoseArrow.style.fill = blobColor;
    fixedGlucoseArrow.style.stroke = blobColor;
  }

  // Update tracking screen glucose color
  const trackingGlucoseText = document.querySelector('.tracking-glucose-text');
  const trackingGlucoseArrow = document.querySelector('.tracking-glucose-arrow path');
  if (trackingGlucoseText) {
    trackingGlucoseText.style.fill = blobColor;
  }
  if (trackingGlucoseArrow) {
    trackingGlucoseArrow.style.fill = blobColor;
    trackingGlucoseArrow.style.stroke = blobColor;
  }

  // Update assistant screen accent color (mic, glucose, arrow)
  const assistantMic = document.querySelector('.assistant-mic');
  const assistantGlucoseText = document.querySelector('.assistant-glucose-text');
  const assistantArrow = document.querySelector('.assistant-arrow path');
  if (assistantMic) {
    assistantMic.style.color = blobColor;
  }
  if (assistantGlucoseText) {
    assistantGlucoseText.style.fill = blobColor;
  }
  if (assistantArrow) {
    assistantArrow.style.fill = blobColor;
    assistantArrow.style.stroke = blobColor;
  }

  // Update answer accent color if visible
  const answerAccents = document.querySelectorAll('.answer-main .accent');
  answerAccents.forEach(el => {
    el.style.color = blobColor;
  });

  // Update arrow position based on text width
  updateArrowPosition();
}

/**
 * Update arrow position to maintain consistent spacing from glucose text
 */
function updateArrowPosition() {
  const glucoseTextElement = document.querySelector('.nav-circle-base .nav-glucose');
  const arrow = document.querySelector('.nav-circle-base .nav-arrow');
  const arrowKnockout = document.querySelector('.nav-circle-knockout .nav-arrow-knockout');

  if (!glucoseTextElement || !arrow) return;

  // Get the bounding box of the glucose text
  const textBBox = glucoseTextElement.getBBox();

  // Arrow should be positioned with consistent gap after text
  // New arrow is 13x13, center at 6.5, so offset Y to align with text
  const gap = 2;
  const arrowX = textBBox.x + textBBox.width + gap;
  const arrowY = textBBox.y + (textBBox.height / 2) - 8;  // Slightly above center

  // Include rotation based on current trend
  // Arrow icon points straight up (0°), rotate by trend angle
  // Rotation center is at the center of the 13x13 arrow
  const arrowCenterX = 6.5;
  const arrowCenterY = 6.5;
  const rotation = currentTrendAngle;
  const transform = `translate(${arrowX}, ${arrowY}) rotate(${rotation}, ${arrowCenterX}, ${arrowCenterY})`;

  arrow.setAttribute('transform', transform);

  // Update knockout layer arrow position to match
  if (arrowKnockout) {
    arrowKnockout.setAttribute('transform', transform);
  }

  // Update fixed glucose arrow position to match
  const fixedArrow = document.querySelector('.fixed-glucose-arrow');
  if (fixedArrow) {
    fixedArrow.setAttribute('transform', transform);
  }

  // Update tracking screen arrow position to match
  const trackingArrow = document.querySelector('.tracking-glucose-arrow');
  if (trackingArrow) {
    trackingArrow.setAttribute('transform', transform);
  }

  // Update assistant screen arrow position to match
  updateAssistantArrowPosition();
}

/**
 * Update assistant screen arrow position to match glucose text
 */
function updateAssistantArrowPosition() {
  const glucoseTextElement = document.querySelector('.assistant-glucose-text');
  const arrow = document.querySelector('.assistant-arrow');

  if (!glucoseTextElement || !arrow) return;

  const textBBox = glucoseTextElement.getBBox();

  const gap = 2;
  const arrowX = textBBox.x + textBBox.width + gap;
  const arrowY = textBBox.y + (textBBox.height / 2) - 8;

  const arrowCenterX = 6.5;
  const arrowCenterY = 6.5;
  const rotation = currentTrendAngle;
  const transform = `translate(${arrowX}, ${arrowY}) rotate(${rotation}, ${arrowCenterX}, ${arrowCenterY})`;

  arrow.setAttribute('transform', transform);
}

/**
 * Set the trend direction and update blob movement
 */
function setTrendDirection(stepIndex) {
  currentTrendAngle = TREND_ANGLES[stepIndex];
  updateArrowPosition();

  // Update blob movement direction
  if (glucoseBlob) {
    glucoseBlob.setTrendDirection(currentTrendAngle);
  }
}

/**
 * Update trend direction from a discrete angle (0, 45, 90, 135, 180)
 * Called by graph slider when slope changes
 */
function updateTrendFromAngle(angle) {
  // Angle is already one of 5 discrete values: 0, 45, 90, 135, 180
  currentTrendAngle = angle;

  // Update blob movement direction
  if (glucoseBlob) {
    glucoseBlob.setTrendDirection(angle);
  }

  // Update debug trend button rotation
  const trendArrowBtn = document.querySelector('.trend-arrow-btn svg');
  if (trendArrowBtn) {
    trendArrowBtn.style.transform = `rotate(${angle}deg)`;
  }

  // Update arrow on the watch display
  updateArrowPosition();
}

// Expose for external use
window.Sweetie = {
  setGlucose: setGlucoseValue,
  setTrend: setTrendDirection,
  updateTrendFromAngle: updateTrendFromAngle,
  generateGraphForTrend: generateGraphForTrend
};

/**
 * Toggle between blob view and graph view
 */
let isGraphVisible = false;
let isAnimating = false;

function toggleGraphView() {
  const graph = document.querySelector('.glucose-graph');
  const blobContainer = document.querySelector('.glucose-blob');

  if (!graph || isAnimating) return;

  isAnimating = true;
  isGraphVisible = !isGraphVisible;

  // Timing constants (match CSS variables)
  const DURATION_SHORT = 140;
  const DURATION_MEDIUM = 210;
  const DURATION_LONG = 350;

  if (isGraphVisible) {
    // Show graph: spring squish blob, then fade to graph
    if (blobContainer) {
      // Use spring physics for expressive squish animation
      if (window.animateBlobSquish) {
        window.animateBlobSquish(blobContainer, () => {
          // After spring squish, begin fade transition
          blobContainer.classList.add('fade-out');
          graph.classList.remove('hidden');

          // Hide knockout text (blob is hidden when graph is visible)
          const timeKnockout = document.querySelector('.fixed-time-knockout');
          if (timeKnockout) timeKnockout.style.opacity = '0';

          requestAnimationFrame(() => {
            graph.classList.add('visible');
          });

          // Hide blob completely after fade
          setTimeout(() => {
            blobContainer.style.display = 'none';
            blobContainer.classList.remove('fade-out');
            isAnimating = false;

            // Initialize graph slider and update trend arrow from graph slope
            if (window.initGraphSlider) {
              const slider = window.initGraphSlider();
              slider.updateSliderPosition(slider.currentX);
            }

            // Ensure graph colors match blob's color (single source of truth)
            if (glucoseBlob) {
              updateGlucoseTextColor(glucoseBlob.getColor());
            }
          }, DURATION_LONG);
        });
      } else {
        // Fallback if spring not loaded
        blobContainer.classList.add('fade-out');
        graph.classList.remove('hidden');

        // Hide knockout text (blob is hidden when graph is visible)
        const timeKnockout = document.querySelector('.fixed-time-knockout');
        if (timeKnockout) timeKnockout.style.opacity = '0';

        requestAnimationFrame(() => {
          graph.classList.add('visible');
        });
        setTimeout(() => {
          blobContainer.style.display = 'none';
          blobContainer.classList.remove('fade-out');
          isAnimating = false;

          // Ensure graph colors match blob's color
          if (glucoseBlob) {
            updateGlucoseTextColor(glucoseBlob.getColor());
          }
        }, DURATION_LONG);
      }
    }
  } else {
    // Show blob: fade out graph, fade in blob
    graph.classList.remove('visible');

    // Restore glucose display to current blob value (don't reset slider position yet)
    if (glucoseBlob) {
      setGlucoseValue(glucoseBlob.glucoseValue);
    }

    setTimeout(() => {
      graph.classList.add('hidden');

      // Show knockout text again (blob will be visible)
      const timeKnockout = document.querySelector('.fixed-time-knockout');
      if (timeKnockout) timeKnockout.style.opacity = '';

      // Reset graph slider while hidden (user won't see it)
      if (window.initGraphSlider) {
        const slider = window.initGraphSlider();
        slider.reset();
      }

      if (blobContainer) {
        blobContainer.style.display = '';
        blobContainer.style.opacity = '0';

        requestAnimationFrame(() => {
          // Use CSS variable for transition
          blobContainer.style.transition = `opacity var(--duration-long, ${DURATION_LONG}ms) var(--motion-effects, cubic-bezier(0.3, 0.0, 0.0, 1.0))`;
          blobContainer.style.opacity = '1';
        });

        setTimeout(() => {
          blobContainer.style.transition = '';
          isAnimating = false;
        }, DURATION_LONG);
      }
    }, DURATION_LONG);
  }
}

/**
 * Reset to home view (hide graph, show blob)
 * Called when returning from other screens like insulin input
 */
function resetToHomeView() {
  const graph = document.querySelector('.glucose-graph');
  const blobContainer = document.querySelector('.glucose-blob');

  // Sakrij graf
  if (graph) {
    graph.classList.remove('visible');
    graph.classList.add('hidden');
  }

  // Prikaži blob
  if (blobContainer) {
    blobContainer.style.display = '';
    blobContainer.classList.remove('fade-out');
  }

  // Resetiraj stanje
  isGraphVisible = false;
  isAnimating = false;

  // Resetiraj graph slider
  if (window.initGraphSlider) {
    const slider = window.initGraphSlider();
    slider.reset();
  }
}

// Izloži globalno
window.resetToHomeView = resetToHomeView;

/**
 * Initialize assistant mic hold-to-talk interaction
 */
function initAssistantMic() {
  const mic = document.querySelector('.assistant-mic');
  const content = document.querySelector('.assistant-content');
  const speechEl = document.querySelector('.assistant-speech');
  const confirmBtn = document.querySelector('.assistant-confirm-btn');
  const assistantNav = document.querySelector('.assistant-nav');
  const addBtn = document.querySelector('.assistant-add-btn');

  if (!mic || !content || !speechEl) return;

  const speechDataHR = [
    { q: 'Koliko da inzulina uzmem? Pojeo sam srednju pizzu i sok od jabuke.', ans: { main: '{12 jedinica} je optimalno.', detail: 'Vidim da ti je šećer 7.8 i stabilan. Prošli put s pizzom si dao 14 i bio prenizak.' }, ctx: [
      { q: 'Planiraš li neku aktivnost?', reply: 'Idem prošetati za pola sata.', ans: { main: '{10 jedinica} je dovoljno.', detail: 'Šetnja će pomoći s apsorpcijom. Smanjujem dozu jer ćeš potrošiti dio glukoze.' } },
      { q: 'Je li pizza bila masna?', reply: 'Da, dosta sira i ulja.', ans: { main: '{12 jedinica} ali split doza.', detail: 'Masna pizza usporava apsorpciju. Daj 7 sad i 5 za 45 min da pokriješ kasni porast.' } }
    ] },
    { q: 'Šećer mi je visok, što da napravim?', ans: { main: 'Daj korekciju od {3 jedinice.}', detail: 'Vidim da ti je 13.4 i polako raste. Zadnja korekcija je bila prije 4 sata.' }, ctx: [
      { q: 'Imaš li simptome?', reply: 'Malo me boli glava.', ans: { main: 'Daj {3 jedinice} i pij vodu.', detail: 'Glavobolja može biti od visokog šećera. Pij 2-3 čaše vode u sljedećih sat vremena.' } }
    ] },
    { q: 'Šećer mi je nizak, što da pojedem?', ans: { main: 'Pojedi 15g brzih UH odmah.', detail: 'Vidim da ti je 3.8 i pada. Sok, tablete glukoze ili 3-4 bombona — provjeri za 15 min.' }, ctx: [
      { q: 'Što imaš pri ruci?', reply: 'Imam sok od jabuke.', ans: { main: 'Popij pola čaše soka odmah.', detail: 'To je oko 15g brzih UH. Provjeri za 15 min.' } }
    ] },
    { q: 'Planiram ići na trening, trebam li smanjiti inzulin?', ans: { main: 'Smanji cjelodnevni inzulin za {30%.}', detail: 'Vidim da ti šećer prosječno padne 2.8 nakon treninga. Smanji 30 min prije.' }, ctx: [
      { q: 'Kakav trening planiraš?', reply: 'Dizanje utega, sat vremena.', ans: { main: 'Smanji za {20%.}', detail: 'Utezi manje snizuju šećer od kardia.' } }
    ] },
    { q: 'Koliko inzulina za kebab i pomfrit?', ans: { main: 'Trebat će ti {14 jedinica.}', detail: 'Kebab tortilla ~50g UH, pomfrit ~40g. Masna hrana pa preporučam split dozu.' }, ctx: [
      { q: 'Koliko pomfrita?', reply: 'Veliku porciju.', ans: { main: 'Za to treba {17 jedinica.}', detail: 'Split doza — 10 sad, 7 za 45 min.' } }
    ] },
  ];

  const speechDataEN = [
    { q: 'How much insulin should I take? I had a medium pizza and apple juice.', ans: { main: '{12 units} is optimal.', detail: 'I see your sugar is 7.8 and stable. Last time with pizza you took 14 and went too low.' }, ctx: [
      { q: 'Planning any activity?', reply: 'Going for a walk in half an hour.', ans: { main: '{10 units} is enough.', detail: 'Walking will help with absorption. Reducing dose since you\'ll burn some glucose.' } },
      { q: 'Was the pizza greasy?', reply: 'Yes, lots of cheese and oil.', ans: { main: '{12 units} but split dose.', detail: 'Greasy pizza slows absorption. Take 7 now and 5 in 45 min to cover late rise.' } }
    ] },
    { q: 'My sugar is high, what should I do?', ans: { main: 'Take a correction of {3 units.}', detail: 'I see it\'s 13.4 and slowly rising. Last correction was 4 hours ago.' }, ctx: [
      { q: 'Any symptoms?', reply: 'A slight headache.', ans: { main: 'Take {3 units} and drink water.', detail: 'Headache can be from high sugar. Drink 2-3 glasses of water in the next hour.' } }
    ] },
    { q: 'My sugar is low, what should I eat?', ans: { main: 'Eat 15g of fast carbs now.', detail: 'I see it\'s 3.8 and dropping. Juice, glucose tablets, or 3-4 candies — check in 15 min.' }, ctx: [
      { q: 'What do you have nearby?', reply: 'I have apple juice.', ans: { main: 'Drink half a glass now.', detail: 'That\'s about 15g of fast carbs. Check again in 15 min.' } }
    ] },
    { q: 'I\'m planning to work out, should I reduce insulin?', ans: { main: 'Reduce basal insulin by {30%.}', detail: 'I see your sugar drops 2.8 on average after training. Reduce 30 min before.' }, ctx: [
      { q: 'What kind of workout?', reply: 'Weight lifting, one hour.', ans: { main: 'Reduce by {20%.}', detail: 'Weights lower sugar less than cardio.' } }
    ] },
    { q: 'How much insulin for kebab and fries?', ans: { main: 'You\'ll need {14 units.}', detail: 'Kebab wrap ~50g carbs, fries ~40g. Fatty food so I recommend split dose.' }, ctx: [
      { q: 'How many fries?', reply: 'A large portion.', ans: { main: 'For that you need {17 units.}', detail: 'Split dose — 10 now, 7 in 45 min.' } }
    ] },
  ];

  function getSpeechData() {
    const lang = localStorage.getItem('sweetie-lang') || 'en';
    return lang === 'hr' ? speechDataHR : speechDataEN;
  }

  let lastQuestionIndex = -1;
  let currentCtx = [];
  let currentAnswer = null;
  let selectedCtxAnswer = null;
  let wordTimers = [];
  let isListening = false;

  const answerEl = document.querySelector('.assistant-answer');
  const answerMain = document.querySelector('.answer-main');
  const answerDetail = document.querySelector('.answer-detail');
  const micBtn = document.querySelector('.assistant-mic-btn');

  function getRandomQuestion() {
    const data = getSpeechData();
    let index;
    do {
      index = Math.floor(Math.random() * data.length);
    } while (index === lastQuestionIndex && data.length > 1);
    lastQuestionIndex = index;
    currentCtx = data[index].ctx;
    currentAnswer = data[index].ans;
    selectedCtxAnswer = null;

    // Update context menu buttons
    const ctxBtns = document.querySelectorAll('.assistant-ctx-btn');
    ctxBtns.forEach((btn, i) => {
      if (i < currentCtx.length) {
        btn.textContent = currentCtx[i].q;
        btn.dataset.ctxIndex = i;
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    return data[index].q;
  }

  function startListening() {
    if (isListening) return;
    isListening = true;

    // Enter listening state
    content.classList.add('listening');
    speechEl.textContent = '';

    // Hide glucose nav
    if (assistantNav) assistantNav.style.opacity = '0';

    // Animate words one by one
    const words = getRandomQuestion().split(' ');
    let currentText = '';

    words.forEach((word, i) => {
      const timer = setTimeout(() => {
        const span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.style.opacity = '0';
        span.style.transition = 'opacity 0.4s ease';
        speechEl.appendChild(span);
        // Trigger reflow then fade in
        span.offsetHeight;
        span.style.opacity = '1';
      }, i * 300);
      wordTimers.push(timer);
    });

    // Show confirm button and + button after all words
    const confirmTimer = setTimeout(() => {
      if (confirmBtn) confirmBtn.classList.add('visible');
      if (addBtn) addBtn.classList.add('visible');
    }, words.length * 300 + 400);
    wordTimers.push(confirmTimer);
  }

  function showCtxReply(ctxIndex) {
    const ctx = currentCtx[ctxIndex];
    if (!ctx) return;

    // Store the context-aware answer for when confirm is pressed
    selectedCtxAnswer = ctx.ans;

    // Clear current speech and timers
    wordTimers.forEach(t => clearTimeout(t));
    wordTimers = [];
    speechEl.textContent = '';

    // Hide answer view if visible (coming from answer screen)
    if (answerEl) answerEl.classList.remove('visible');
    if (micBtn) micBtn.classList.remove('visible');

    // Hide + button and confirm while reply animates
    if (addBtn) addBtn.classList.remove('visible');
    if (confirmBtn) confirmBtn.classList.remove('visible');

    // Make sure we're in listening state
    content.style.display = '';
    content.classList.add('listening');
    if (assistantNav) assistantNav.style.opacity = '0';

    // Animate our reply word by word
    const words = ctx.reply.split(' ');
    words.forEach((word, i) => {
      const timer = setTimeout(() => {
        const span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.style.opacity = '0';
        span.style.transition = 'opacity 0.4s ease';
        speechEl.appendChild(span);
        span.offsetHeight;
        span.style.opacity = '1';
      }, i * 300);
      wordTimers.push(timer);
    });

    // Show confirm button after reply finishes
    const confirmTimer = setTimeout(() => {
      if (confirmBtn) confirmBtn.classList.add('visible');
    }, words.length * 300 + 400);
    wordTimers.push(confirmTimer);
  }

  function showAnswer() {
    const answer = selectedCtxAnswer || currentAnswer;
    if (!answer || !answerEl) return;

    // Hide listening state
    wordTimers.forEach(t => clearTimeout(t));
    wordTimers = [];
    content.classList.remove('listening');
    content.style.display = 'none';
    speechEl.textContent = '';
    if (confirmBtn) confirmBtn.classList.remove('visible');
    if (addBtn) addBtn.classList.remove('visible');

    // Close context menu if open
    const ctxMenu = document.querySelector('.assistant-context-menu');
    if (ctxMenu) ctxMenu.classList.remove('open');

    // Build main text with accent spans for {bracketed} parts
    const mainHtml = answer.main.replace(
      /\{(.+?)\}/g,
      '<span class="accent">$1</span>'
    );
    answerMain.innerHTML = mainHtml;
    if (answerDetail) answerDetail.textContent = answer.detail;

    // Set accent color to match current glucose/blob color
    const accentColor = glucoseBlob ? glucoseBlob.getColor() : '';
    answerMain.querySelectorAll('.accent').forEach(el => {
      el.style.color = accentColor;
    });

    // Show answer and mic button, show glucose nav
    answerEl.classList.add('visible');
    if (micBtn) micBtn.classList.add('visible');
    if (assistantNav) assistantNav.style.opacity = '';

    // Show + button if this is the first answer and there are contextual questions
    if (!selectedCtxAnswer && currentCtx.length > 0) {
      if (addBtn) addBtn.classList.add('visible');
    }
  }

  function resetToInitial() {
    isListening = false;
    selectedCtxAnswer = null;
    wordTimers.forEach(t => clearTimeout(t));
    wordTimers = [];

    // Hide answer
    if (answerEl) answerEl.classList.remove('visible');
    if (micBtn) micBtn.classList.remove('visible');

    // Reset listening/content state
    content.style.display = '';
    content.classList.remove('listening');
    speechEl.textContent = '';
    if (confirmBtn) confirmBtn.classList.remove('visible');
    if (addBtn) {
      addBtn.classList.remove('visible');
      addBtn.style.backgroundColor = '';
      const icon = addBtn.querySelector('.plus-icon');
      if (icon) icon.classList.remove('rotated');
    }
    // Close context menu if open
    const ctxMenu = document.querySelector('.assistant-context-menu');
    if (ctxMenu) ctxMenu.classList.remove('open');
    if (assistantNav) assistantNav.style.opacity = '';
  }

  // Prevent touch from bubbling (no action on touchstart, let click handle it)
  mic.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // Click handles both mobile and desktop
  mic.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isListening) {
      resetToInitial();
    } else {
      startListening();
    }
  });

  // Confirm button shows answer
  if (confirmBtn) {
    confirmBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    confirmBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showAnswer();
    });
  }

  // Handle context question selection
  document.addEventListener('assistantCtxSelected', (e) => {
    showCtxReply(e.detail.ctxIndex);
  });

  // Mic button returns to initial state
  if (micBtn) {
    micBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    micBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetToInitial();
    });
  }
}

/**
 * Initialize assistant context menu (+ button toggle)
 */
function initAssistantContext() {
  const assistantScreen = document.querySelector('[data-screen="assistant"]');
  if (!assistantScreen) return;

  const addBtn = assistantScreen.querySelector('.assistant-add-btn');
  const plusIcon = addBtn ? addBtn.querySelector('.plus-icon') : null;
  const ctxMenu = assistantScreen.querySelector('.assistant-context-menu');
  const ctxBtns = assistantScreen.querySelectorAll('.assistant-ctx-btn');

  if (!addBtn || !ctxMenu) return;

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      ctxMenu.classList.add('open');
      if (plusIcon) plusIcon.classList.add('rotated');
      addBtn.style.backgroundColor = '#000';
    } else {
      ctxMenu.classList.remove('open');
      if (plusIcon) plusIcon.classList.remove('rotated');
      addBtn.style.backgroundColor = '';
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    ctxMenu.classList.remove('open');
    if (plusIcon) plusIcon.classList.remove('rotated');
    addBtn.style.backgroundColor = '';
  }

  // + button toggle
  addBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  addBtn.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  addBtn.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // Context button handlers — trigger context reply flow
  ctxBtns.forEach(btn => {
    btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    btn.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ctxIndex = parseInt(btn.dataset.ctxIndex || btn.dataset.ctx);
      close();
      // Dispatch event so initAssistantMic can handle it
      document.dispatchEvent(new CustomEvent('assistantCtxSelected', { detail: { ctxIndex } }));
    });
  });
}

/**
 * Initialize page dot navigation (tap any dot to go to that page)
 */
function initGraphToggle() {
  const pageDots = document.querySelectorAll('.page-dots .page-dot');

  pageDots.forEach((dot, index) => {
    dot.style.cursor = 'pointer';
    dot.style.pointerEvents = 'auto';

    const handleDotTap = (e) => {
      e.stopPropagation();
      e.preventDefault();

      // First dot on home screen with graph visible: toggle back to blob
      if (index === 0 && currentScreenIndex === 0 && isGraphVisible) {
        toggleGraphView();
        return;
      }

      // Navigate to the screen this dot represents
      if (index !== currentScreenIndex && index < screens.length) {
        const direction = index > currentScreenIndex ? 'up' : 'down';
        navigateTo(screens[index], direction);
      }
    };

    // Touch handler (mobile)
    dot.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleDotTap(e);
    }, { passive: false });

    // Click handler (desktop)
    dot.addEventListener('click', (e) => {
      handleDotTap(e);
    });

    // Prevent touch events from triggering swipe navigation
    dot.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
  });
}

/**
 * Initialize debug slider for glucose testing
 */
function initDebugSlider() {
  const slider = document.getElementById('glucose-slider');
  const valueDisplay = document.querySelector('.glucose-value');

  if (!slider) return;

  // Update glucose on slider change
  slider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    setGlucoseValue(value);
    valueDisplay.textContent = value.toFixed(1).replace('.', ',');

    // Update slider thumb and value display color (includes warning yellow)
    const color = glucoseBlob ? glucoseBlob.getColor() : getColorForGlucose(value);
    slider.style.setProperty('--thumb-color', color);
    valueDisplay.style.color = color;

    // Update thumb color via CSS variable
    document.documentElement.style.setProperty('--slider-thumb-color', color);
  });

  // Generate new graph when slider is released (using current trend)
  const generateGraphForGlucose = () => {
    const graphSlider = window.initGraphSlider ? window.initGraphSlider() : null;
    if (graphSlider && graphSlider.generateRandomPath && graphSlider.glucoseToY) {
      const value = parseFloat(slider.value);
      const targetY = graphSlider.glucoseToY(value);
      // Use current trend angle when generating new graph
      const newPath = graphSlider.generateRandomPath(targetY, currentTrendAngle);
      graphSlider.updateGraphPath(newPath);
    }
  };

  slider.addEventListener('mouseup', generateGraphForGlucose);
  slider.addEventListener('touchend', generateGraphForGlucose);

  // Trend arrow button
  const trendArrowBtn = document.querySelector('.trend-arrow-btn');
  let currentTrendIndex = TREND_ANGLES.indexOf(currentTrendAngle);
  if (currentTrendIndex === -1) currentTrendIndex = 1;

  if (trendArrowBtn) {

    trendArrowBtn.addEventListener('click', () => {
      // Cycle through 5 positions: 0 → 1 → 2 → 3 → 4 → 0
      currentTrendIndex = (currentTrendIndex + 1) % 5;
      setTrendDirection(currentTrendIndex);
      updateTrendArrowButton(trendArrowBtn, currentTrendIndex);

      // Generate new graph with matching trend direction
      generateGraphForTrend(TREND_ANGLES[currentTrendIndex]);
    });
  }
}

/**
 * Generate a new graph that matches the given trend angle
 */
function generateGraphForTrend(trendAngle) {
  const graphSlider = window.initGraphSlider ? window.initGraphSlider() : null;
  const glucoseSlider = document.getElementById('glucose-slider');

  if (graphSlider && graphSlider.generateRandomPath && graphSlider.glucoseToY) {
    // Get current glucose value
    const glucoseValue = glucoseSlider ? parseFloat(glucoseSlider.value) : 6.5;
    const targetY = graphSlider.glucoseToY(glucoseValue);

    // Generate new path with the specified trend
    const newPath = graphSlider.generateRandomPath(targetY, trendAngle);
    graphSlider.updateGraphPath(newPath);
  }
}

/**
 * Update the trend arrow button rotation
 */
function updateTrendArrowButton(btn, index) {
  const svg = btn.querySelector('svg');
  if (svg) {
    svg.style.transform = `rotate(${TREND_ANGLES[index]}deg)`;
  }
}

/**
 * Generate random initial glucose and trend values
 */
function randomizeInitialValues() {
  // Random glucose between 3.5 and 11.0
  const randomGlucose = (Math.random() * 7.5 + 3.5).toFixed(1);
  const formattedGlucose = randomGlucose.replace('.', ',');

  // Random trend angle from TREND_ANGLES
  const randomTrendIndex = Math.floor(Math.random() * TREND_ANGLES.length);
  currentTrendAngle = TREND_ANGLES[randomTrendIndex];

  // Update HTML glucose values
  const glucoseTextBase = document.querySelector('.nav-circle-base .nav-glucose textPath');
  const glucoseTextKnockout = document.querySelector('.nav-circle-knockout .nav-glucose-knockout textPath');
  const assistantGlucoseText = document.querySelector('.assistant-glucose-text textPath');
  if (glucoseTextBase) glucoseTextBase.textContent = formattedGlucose;
  if (glucoseTextKnockout) glucoseTextKnockout.textContent = formattedGlucose;
  if (assistantGlucoseText) assistantGlucoseText.textContent = formattedGlucose;

  // Update debug slider
  const slider = document.getElementById('glucose-slider');
  const valueDisplay = document.querySelector('.glucose-value');
  if (slider) slider.value = randomGlucose;
  if (valueDisplay) valueDisplay.textContent = formattedGlucose;

  // Update debug slider colors
  const color = getColorForGlucose(parseFloat(randomGlucose));
  if (valueDisplay) valueDisplay.style.color = color;
  document.documentElement.style.setProperty('--slider-thumb-color', color);

  // Update trend arrow button rotation
  const trendArrowBtn = document.querySelector('.trend-arrow-btn svg');
  if (trendArrowBtn) {
    trendArrowBtn.style.transform = `rotate(${currentTrendAngle}deg)`;
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  randomizeInitialValues();
  init();
  initHomeScreen();
  initDebugSlider();

  // Initialize context menu controller
  if (window.ContextMenuController) {
    contextMenuController = new ContextMenuController();
  }

  // Initialize insulin input controller
  if (window.InsulinInputController) {
    insulinInputController = new InsulinInputController();
  }

  // Initialize med input controller
  if (window.MedInputController) {
    medInputController = new MedInputController();
  }

  // Initialize meal input controller
  if (window.MealInputController) {
    mealInputController = new MealInputController();
  }

  // Initialize activity input controller
  if (window.ActivityInputController) {
    activityInputController = new ActivityInputController();
  }

  // Initialize tracking controller
  if (window.TrackingController) {
    trackingController = new TrackingController();
    window.trackingController = trackingController;
  }

  // Listen for context menu actions
  document.addEventListener('contextMenuAction', (e) => {
    const action = e.detail.action;
    console.log(`Handling context action: ${action}`);

    // Handle different context actions
    switch (action) {
      case 'insulin':
        // Show insulin input screen immediately (on top of context menu)
        if (insulinInputController) {
          insulinInputController.show();
        }

        // After insulin screen is visible, reset context menu and hide home
        setTimeout(() => {
          const homeScreen = document.querySelector('[data-screen="home"]');
          if (homeScreen) homeScreen.classList.remove('active');

          if (contextMenuController) {
            contextMenuController.resetState();
          }
        }, 300);
        break;

      case 'med':
        // Show med input screen immediately (on top of context menu)
        if (medInputController) {
          medInputController.show();
        }

        // After med screen is visible, reset context menu and hide home
        setTimeout(() => {
          const homeScreen = document.querySelector('[data-screen="home"]');
          if (homeScreen) homeScreen.classList.remove('active');

          if (contextMenuController) {
            contextMenuController.resetState();
          }
        }, 300);
        break;

      case 'meal':
        // Show meal input screen
        if (mealInputController) {
          mealInputController.show();
        }

        // After meal screen is visible, reset context menu and hide home
        setTimeout(() => {
          const homeScreen = document.querySelector('[data-screen="home"]');
          if (homeScreen) homeScreen.classList.remove('active');

          if (contextMenuController) {
            contextMenuController.resetState();
          }
        }, 300);
        break;

      case 'activity':
        // Show activity input screen
        if (activityInputController) {
          activityInputController.show();
        }

        // After activity screen is visible, reset context menu and hide home
        setTimeout(() => {
          const homeScreen = document.querySelector('[data-screen="home"]');
          if (homeScreen) homeScreen.classList.remove('active');

          if (contextMenuController) {
            contextMenuController.resetState();
          }
        }, 300);
        break;
    }
  });

  // Listen for insulin logged event
  document.addEventListener('insulinLogged', (e) => {
    console.log('Insulin logged:', e.detail);
  });

  // Listen for med logged event
  document.addEventListener('medLogged', (e) => {
    console.log('Med logged:', e.detail);
  });

  // Listen for activity logged event
  document.addEventListener('activityLogged', (e) => {
    console.log('Activity logged:', e.detail);
  });

  // Generate initial graph with current random trend
  setTimeout(() => {
    generateGraphForTrend(currentTrendAngle);

    // Update ALL colors to match blob
    if (glucoseBlob) {
      const color = glucoseBlob.getColor();

      // Debug slider
      const valueDisplay = document.querySelector('.glucose-value');
      if (valueDisplay) valueDisplay.style.color = color;
      document.documentElement.style.setProperty('--slider-thumb-color', color);

      // Glucose text and arrow on watch face
      const glucoseText = document.querySelector('.nav-circle-base .nav-glucose');
      const arrow = document.querySelector('.nav-circle-base .nav-arrow path');
      if (glucoseText) glucoseText.style.fill = color;
      if (arrow) {
        arrow.style.fill = color;
        arrow.style.stroke = color;
      }

      // Sync assistant screen accent color (mic, glucose, arrow)
      const assistantMic = document.querySelector('.assistant-mic');
      const assistantGlucoseText = document.querySelector('.assistant-glucose-text');
      const assistantArrow = document.querySelector('.assistant-arrow path');
      if (assistantMic) assistantMic.style.color = color;
      if (assistantGlucoseText) assistantGlucoseText.style.fill = color;
      if (assistantArrow) {
        assistantArrow.style.fill = color;
        assistantArrow.style.stroke = color;
      }
    }

    // Sync assistant glucose value from home screen
    const homeGlucose = document.querySelector('.nav-circle-base .nav-glucose textPath');
    const assistantGlucose = document.querySelector('.assistant-glucose-text textPath');
    if (homeGlucose && assistantGlucose) {
      assistantGlucose.textContent = homeGlucose.textContent;
    }

    // Sync fixed glucose (for transitions)
    const fixedGlucose = document.querySelector('.fixed-glucose-text textPath');
    if (homeGlucose && fixedGlucose) {
      fixedGlucose.textContent = homeGlucose.textContent;
    }

    // Sync tracking glucose
    const trackingGlucose = document.querySelector('.tracking-glucose-text textPath');
    if (homeGlucose && trackingGlucose) {
      trackingGlucose.textContent = homeGlucose.textContent;
    }

    // Sync fixed and tracking glucose color
    if (glucoseBlob) {
      const color = glucoseBlob.getColor();
      const fixedGlucoseText = document.querySelector('.fixed-glucose-text');
      const fixedGlucoseArrow = document.querySelector('.fixed-glucose-arrow path');
      if (fixedGlucoseText) fixedGlucoseText.style.fill = color;
      if (fixedGlucoseArrow) {
        fixedGlucoseArrow.style.fill = color;
        fixedGlucoseArrow.style.stroke = color;
      }

      const trackingGlucoseText = document.querySelector('.tracking-glucose-text');
      const trackingGlucoseArrow = document.querySelector('.tracking-glucose-arrow path');
      if (trackingGlucoseText) trackingGlucoseText.style.fill = color;
      if (trackingGlucoseArrow) {
        trackingGlucoseArrow.style.fill = color;
        trackingGlucoseArrow.style.stroke = color;
      }
    }

    // Update assistant arrow position
    updateAssistantArrowPosition();
  }, 100);
});


// ===========================================
// LANDING PAGE - Language Switching
// ===========================================

let currentLang = 'en';

function setLanguage(lang) {
  currentLang = lang;

  // Update language button states
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Show/hide text based on language
  document.querySelectorAll('[data-lang]').forEach(el => {
    if (el.classList.contains('lang-btn')) return; // Skip buttons
    el.style.display = el.dataset.lang === lang ? '' : 'none';
  });

  // Update tracking SVG labels
  const trackingLabels = {
    hr: { brzi: 'brzi', senzor: 'trajanje senzora', spori: 'dnevni' },
    en: { brzi: 'fast', senzor: 'sensor duration', spori: 'daily' }
  };
  const labels = trackingLabels[lang] || trackingLabels.en;

  const brziLabel = document.querySelector('.tracking-label-brzi textPath');
  const senzorLabel = document.querySelector('.tracking-label-senzor textPath');
  const sporiLabel = document.querySelector('.tracking-label-spori textPath');

  if (brziLabel) brziLabel.textContent = labels.brzi;
  if (senzorLabel) senzorLabel.textContent = labels.senzor;
  if (sporiLabel) sporiLabel.textContent = labels.spori;

  // Store preference (before graph slider update which reads it)
  localStorage.setItem('sweetie-lang', lang);

  // Refresh graph slider fuzzy time if visible
  if (window.graphSlider) {
    const gx = window.graphSlider.currentGraphX;
    const y = window.graphSlider.getYForX(gx);
    window.graphSlider.updateTimeLabel(gx, y, gx);
  }
}

// Initialize language switching
document.addEventListener('DOMContentLoaded', () => {
  // Check for stored preference
  const storedLang = localStorage.getItem('sweetie-lang');
  if (storedLang) {
    setLanguage(storedLang);
  }
  
  // Add click handlers to language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
    });
  });
  
  // About overlay
  const aboutBtn = document.querySelector('.about-btn');
  const aboutOverlay = document.getElementById('aboutOverlay');
  const aboutCloseBtn = document.querySelector('.about-close-btn');

  if (aboutBtn && aboutOverlay) {
    aboutBtn.addEventListener('click', () => {
      aboutOverlay.classList.add('active');
    });

    aboutCloseBtn?.addEventListener('click', () => {
      aboutOverlay.classList.remove('active');
    });

    // Close on click outside content
    aboutOverlay.addEventListener('click', (e) => {
      if (e.target === aboutOverlay) {
        aboutOverlay.classList.remove('active');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && aboutOverlay.classList.contains('active')) {
        aboutOverlay.classList.remove('active');
      }
    });
  }
});
