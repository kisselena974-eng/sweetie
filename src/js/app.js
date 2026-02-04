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

  const newIndex = screens.indexOf(screenName);

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
      updateGlucoseTextColor(color); // Graph elements

      // Update glucose text and arrow to match blob
      const glucoseText = document.querySelector('.nav-circle-base .nav-glucose');
      const arrow = document.querySelector('.nav-circle-base .nav-arrow path');
      if (glucoseText) glucoseText.style.fill = color;
      if (arrow) {
        arrow.style.fill = color;
        arrow.style.stroke = color;
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

  const speechData = [
    { q: 'Koliko da inzulina uzmem? Pojeo sam srednju pizzu i sok od jabuke.', ans: { main: '{12 jedinica} je optimalno.', detail: 'Prošli put poslije pizze si uzeo 14 i bio je prenizak.' }, ctx: [
      { q: 'Koliko je prošlo od obroka?', reply: 'Oko 2 sata.', ans: { main: '{10 jedinica} je dovoljno.', detail: 'Nakon 2 sata pizza je već djelomično apsorbirana, treba manje inzulina.' } },
      { q: 'Neka aktivnost ubrzo nakon?', reply: 'Ne, mirujem.', ans: { main: '{12 jedinica} je optimalno.', detail: 'Bez aktivnosti treba puna doza. Prošli put s pizzom si uzeo 14 i bio prenizak.' } }
    ] },
    { q: 'Zašto mi šećer stalno raste poslije doručka?', ans: { main: 'Vjerojatno previše ugljikohidrata ujutro.', detail: 'Probaj zamijeniti žitarice jajima ili avokadnom — proteini usporavaju apsorpciju.' }, ctx: [
      { q: 'Što obično jedeš za doručak?', reply: 'Žitarice s mlijekom.', ans: { main: 'Žitarice su problem.', detail: 'Imaju puno brzih UH. Zamijeni ih jajima ili yogurtom s orasima — šećer će biti stabilniji.' } }
    ] },
    { q: 'Mogu li pojesti komad torte ako si dam inzulin?', ans: { main: 'Da, uz {8 jedinica} unaprijed.', detail: 'Čokoladna torta ima oko 45g UH po komadu. Daj inzulin 15 min prije.' }, ctx: [
      { q: 'Koliki je komad?', reply: 'Veliki komad.', ans: { main: 'Za veliki komad treba {11 jedinica.}', detail: 'Veliki komad torte ima oko 65g UH. Daj inzulin 20 min prije.' } },
      { q: 'Kakva je torta?', reply: 'Čokoladna.', ans: { main: 'Za čokoladnu daj {9 jedinica.}', detail: 'Čokoladna torta ima više masti koja usporava apsorpciju. Razmisli o split dozi.' } }
    ] },
    { q: 'Koliko jedinica za tanjur tjestenine s umakom?', ans: { main: 'Preporučam {10 jedinica.}', detail: 'Srednji tanjur tjestenine ima oko 60g UH. Umak dodaje još 5-10g.' }, ctx: [
      { q: 'Koliko je velik tanjur?', reply: 'Pun tanjur.', ans: { main: 'Za pun tanjur treba {13 jedinica.}', detail: 'Pun tanjur ima oko 80g UH. Daj split dozu — pola prije, pola za 30 min.' } }
    ] },
    { q: 'Šećer mi je visok već dva sata, što da napravim?', ans: { main: 'Daj korekciju od {3 jedinice.}', detail: 'Ako za sat ne padne, provjeri ketone i pij dosta vode.' }, ctx: [
      { q: 'Jesi li dao korekciju?', reply: 'Jesam, prije sat vremena.', ans: { main: 'Pričekaj još 30 minuta.', detail: 'Korekcija treba do 2 sata da potpuno djeluje. Pij vodu i izbjegavaj hranu.' } },
      { q: 'Što si pojeo prije?', reply: 'Pizzu s puno sira.', ans: { main: 'Daj dodatnih {2 jedinice.}', detail: 'Masna hrana usporava apsorpciju i produžuje rast šećera. Ukupno ti treba 5 jedinica.' } }
    ] },
    { q: 'Je li normalno da mi šećer padne nakon trčanja?', ans: { main: 'Da, to je normalno.', detail: 'Mišići troše glukozu tijekom vježbanja. Pojedi nešto prije ili smanji bazal.' }, ctx: [
      { q: 'Koliko dugo si trčao?', reply: 'Sat vremena.', ans: { main: 'Za sat trčanja smanji bazal {50%.}', detail: 'Duže trčanje troši više glukoze. Smanji bazal 30 min prije i pojedi 15g UH.' } }
    ] },
    { q: 'Koliko inzulina za dva peciva i čašu mlijeka?', ans: { main: 'Za to ti treba {7 jedinica.}', detail: 'Dva peciva su oko 40g UH, čaša mlijeka dodaje još 12g.' }, ctx: [
      { q: 'Kakvo je mlijeko?', reply: 'Obično, puno masno.', ans: { main: 'Za to ti treba {7 jedinica.}', detail: 'Punomasno mlijeko ima isti šećer kao obično. 40g UH peciva + 12g mlijeka.' } },
      { q: 'Kakva su peciva?', reply: 'Bijela, iz pekare.', ans: { main: 'Za bijela peciva treba {8 jedinica.}', detail: 'Bijela peciva imaju viši GI od integralnih — šećer brže raste. Daj inzulin 15 min prije.' } }
    ] },
    { q: 'Šećer mi je nizak, što da pojedem da ga brzo podignem?', ans: { main: 'Pojedi 15g brzih ugljikohidrata.', detail: 'Sok od jabuke, tablete glukoze ili 3-4 bombona. Provjeri za 15 min.' }, ctx: [
      { q: 'Što imaš blizu slatkoga?', reply: 'Sok od jabuke.', ans: { main: 'Popij pola čaše soka.', detail: 'To je oko 15g brzih UH — podignut će šećer za 10 minuta. Provjeri nakon 15 min.' } }
    ] },
    { q: 'Zašto mi je šećer visok ako nisam ništa jeo?', ans: { main: 'Stres podiže šećer.', detail: 'Kortizol i adrenalin potiču jetru da otpusti glukozu. Probaj se opustiti.' }, ctx: [
      { q: 'Jesi li pod stresom?', reply: 'Da, imam ispit.', ans: { main: 'Stres od ispita diže šećer.', detail: 'Kortizol potiče jetru na otpuštanje glukoze. Probaj duboko disanje ili kratku šetnju.' } },
      { q: 'Kad si zadnje jeo?', reply: 'Prije 5 sati.', ans: { main: 'Možda ti bazal nije dovoljan.', detail: 'Ako ne jedeš 5 sati a šećer raste, bazalna doza je preniska. Konzultiraj doktora.' } }
    ] },
    { q: 'Hoće li mi kava podići šećer ujutro?', ans: { main: 'Kava sama minimalno utječe.', detail: 'Ali mlijeko i šećer dodaju UH. Crna kava je sigurna opcija.' }, ctx: [
      { q: 'Piješ li s mlijekom?', reply: 'Da, s mlijekom i šećerom.', ans: { main: 'Mlijeko i šećer dodaju {2 jedinice.}', detail: 'Sama kava ne utječe, ali mlijeko + šećer su oko 15g UH. Daj malu dozu uz kavu.' } }
    ] },
    { q: 'Mogu li jesti voće bez da mi šećer skače?', ans: { main: 'Da, uz prave količine.', detail: 'Bobičasto voće ima najmanji utjecaj. Izbjegavaj grožđe i banane u većim količinama.' }, ctx: [
      { q: 'Koje voće?', reply: 'Jagode i borovnice.', ans: { main: 'Odličan izbor!', detail: 'Bobičasto voće ima nizak GI. Šalica jagoda ima samo 11g UH — sigurno za šećer.' } },
      { q: 'Koliko komada?', reply: 'Jednu bananu.', ans: { main: 'Jedna banana je OK uz {2 jedinice.}', detail: 'Srednja banana ima 27g UH. S malom dozom inzulina neće previše dići šećer.' } }
    ] },
    { q: 'Planiram ići na trening, trebam li smanjiti inzulin?', ans: { main: 'Smanji bazal za {30%.}', detail: 'Za sat vremena kardia, smanji 30 min prije. Ponesi brze UH za svaki slučaj.' }, ctx: [
      { q: 'Kakav trening?', reply: 'Dizanje utega.', ans: { main: 'Smanji bazal za {20%.}', detail: 'Utezi dižu šećer kratkoročno ali troše glukozu nakon. Smanji bazal i prati šećer 2h poslije.' } },
      { q: 'Koliko dugo?', reply: 'Oko sat i pol.', ans: { main: 'Smanji bazal za {40%.}', detail: 'Za 90 min treninga treba veće smanjenje. Ponesi tablete glukoze za svaki slučaj.' } }
    ] },
    { q: 'Šećer mi je 4.2, trebam li nešto pojesti prije spavanja?', ans: { main: 'Da, pojedi lagani obrok.', detail: 'Kreker s kikiriki maslacem — proteini i masti drže šećer stabilnim preko noći.' }, ctx: [
      { q: 'Imaš li aktivan inzulin?', reply: 'Da, dao sam prije sat.', ans: { main: 'Pojedi 20g ugljikohidrata odmah.', detail: 'Aktivan inzulin će dodatno sniziti šećer. Pojedi kreker + mlijeko i provjeri za 30 min.' } }
    ] },
    { q: 'Koliko inzulina za kebab i pomfrit?', ans: { main: 'Trebat će ti {14 jedinica.}', detail: 'Kebab tortilla je ~50g UH, pomfrit dodaje još 40g. Daj split dozu.' }, ctx: [
      { q: 'Koja veličina porcije?', reply: 'Veliki meni.', ans: { main: 'Za veliki meni treba {17 jedinica.}', detail: 'Veliki kebab + veliki pomfrit su oko 110g UH. Obavezno split doza — pola sad, pola za 45 min.' } }
    ] },
    { q: 'Što da radim kad mi šećer naglo padne?', ans: { main: 'Odmah pojedi 15g šećera.', detail: 'Ako padne ispod 3.0, koristi glukagon. Nemoj čekati — reagiraj odmah.' }, ctx: [
      { q: 'Imaš li glukagon?', reply: 'Da, imam.', ans: { main: 'Drži ga pri ruci.', detail: 'Ako padne ispod 3.0 ili se ne osjećaš dobro, koristi glukagon. Za sada pojedi 15g brzih UH.' } },
      { q: 'Koliko brzo pada?', reply: 'Jako brzo, strelica dolje.', ans: { main: 'Pojedi 20g šećera odmah.', detail: 'Brzi pad zahtijeva više. Sok + bombone. Ako ne stane za 15 min, koristi glukagon.' } }
    ] },
    { q: 'Je li bolje dati inzulin prije ili poslije jela?', ans: { main: '15 minuta prije jela.', detail: 'To daje inzulinu vremena da počne djelovati kad hrana digne šećer.' }, ctx: [
      { q: 'Koji tip inzulina?', reply: 'Brzi, Novorapid.', ans: { main: '15 minuta prije jela.', detail: 'Novorapid počne djelovati za 10-15 min. Daj ga neposredno prije obroka za najbolji učinak.' } }
    ] },
    { q: 'Zašto mi šećer raste tijekom noći?', ans: { main: 'To je dawn fenomen.', detail: 'Tijelo otpušta hormone između 4-8h. Probaj povećati bazal za to vrijeme.' }, ctx: [
      { q: 'U koliko sati počne rasti?', reply: 'Oko 5 ujutro.', ans: { main: 'Povećaj bazal od 4h za {20%.}', detail: 'Dawn fenomen tipično počinje oko 4-5h. Postavi povećani bazal od 4:00 do 8:00.' } }
    ] },
    { q: 'Koliko ugljikohidrata ima u banani?', ans: { main: 'Srednja banana ima 27g UH.', detail: 'Mala banana oko 20g, velika do 35g. Kombinacija s proteinima usporava apsorpciju.' }, ctx: [
      { q: 'Koliko je velika?', reply: 'Velika banana.', ans: { main: 'Velika banana ima oko 35g UH.', detail: 'Za veliku bananu daj {3 jedinice.} Kombinacija s kikiriki maslacem usporava apsorpciju.' } }
    ] },
    { q: 'Mogu li piti sok od naranče kad imam nizak šećer?', ans: { main: 'Da, to je odličan izbor.', detail: 'Čaša soka ima ~25g brzih UH. Podignut će šećer za 10-15 min.' }, ctx: [
      { q: 'Koliko je nizak?', reply: 'Šećer je 3.2.', ans: { main: 'Popij punu čašu soka odmah.', detail: 'Kod 3.2 treba brza reakcija. Puna čaša soka ima 25g UH. Provjeri za 15 min.' } },
      { q: 'Koliko ima šećera?', reply: '100% narančin sok.', ans: { main: 'Popij pola čaše.', detail: '100% sok ima oko 25g UH po čaši. Pola čaše je dovoljno za umjeren pad.' } }
    ] },
    { q: 'Pojeo sam sladoled, koliko da si dam inzulina?', ans: { main: 'Za to daj {6 jedinica.}', detail: 'Dvije kuglice su oko 30g UH. Mast usporava apsorpciju pa daj split dozu.' }, ctx: [
      { q: 'Koja vrsta sladoleda?', reply: 'Čokoladni.', ans: { main: 'Za čokoladni daj {7 jedinica.}', detail: 'Čokoladni sladoled ima više šećera i masti. Split doza — pola sad, pola za 30 min.' } },
      { q: 'Koliko kuglica?', reply: 'Tri kuglice.', ans: { main: 'Za tri kuglice treba {9 jedinica.}', detail: 'Tri kuglice su oko 45g UH. Mast usporava, daj split dozu za bolju kontrolu.' } }
    ] },
  ];
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
    let index;
    do {
      index = Math.floor(Math.random() * speechData.length);
    } while (index === lastQuestionIndex);
    lastQuestionIndex = index;
    currentCtx = speechData[index].ctx;
    currentAnswer = speechData[index].ans;
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

    return speechData[index].q;
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

  // Touch events (mobile)
  mic.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    startListening();
  }, { passive: true });

  // Click (desktop) — toggle on/off
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
  const debugPanel = document.querySelector('.debug-panel');
  const toggleBtn = document.querySelector('.debug-toggle');
  const slider = document.getElementById('glucose-slider');
  const valueDisplay = document.querySelector('.glucose-value');

  if (!toggleBtn || !slider) return;

  // Toggle panel visibility
  toggleBtn.addEventListener('click', () => {
    debugPanel.classList.toggle('open');
  });

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
      case 'activity':
        console.log(`${action} input - coming soon`);
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

    // Update assistant arrow position
    updateAssistantArrowPosition();
  }, 100);
});
