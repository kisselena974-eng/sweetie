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
    { q: 'Koliko da inzulina uzmem? Pojeo sam srednju pizzu i sok od jabuke.', ans: { main: '{12 jedinica} je optimalno.', detail: 'Vidim da ti je šećer 7.8 i stabilan. Prošli put s pizzom si dao 14 i bio prenizak.' }, ctx: [
      { q: 'Planiraš li neku aktivnost?', reply: 'Idem prošetati za pola sata.', ans: { main: '{10 jedinica} je dovoljno.', detail: 'Šetnja će pomoći s apsorpcijom. Smanjujem dozu jer ćeš potrošiti dio glukoze.' } },
      { q: 'Je li pizza bila masna?', reply: 'Da, dosta sira i ulja.', ans: { main: '{12 jedinica} ali split doza.', detail: 'Masna pizza usporava apsorpciju. Daj 7 sad i 5 za 45 min da pokriješ kasni porast.' } }
    ] },
    { q: 'Zašto mi šećer stalno raste poslije doručka?', ans: { main: 'Zadnja 3 doručka šećer ti skoči za 5+.', detail: 'Vidim da uzimaš inzulin sa jelom — probaj 15 min ranije za bolji učinak.' }, ctx: [
      { q: 'Što obično jedeš za doručak?', reply: 'Žitarice s mlijekom i bananu.', ans: { main: 'To je oko 70g brzih UH.', detail: 'Žitarice + banana + mlijeko su brzi šećeri. Zamijeni jajima i avokadom — tvoj šećer poslije je stabilniji s proteinima.' } }
    ] },
    { q: 'Mogu li pojesti komad torte ako si dam inzulin?', ans: { main: 'Da, uz {8 jedinica} unaprijed.', detail: 'Šećer ti je trenutno 6.2, imaš prostora. Daj 15 min prije prvog zalogaja.' }, ctx: [
      { q: 'Koliko torte planiraš?', reply: 'Oko 150 grama.', ans: { main: 'Za 150g treba {10 jedinica.}', detail: 'To je oko 55g UH. Šećer ti je 6.2 pa imaš prostora, ali daj inzulin 15 min ranije.' } },
      { q: 'Kakva je torta?', reply: 'Čokoladna s ganacheom.', ans: { main: 'Za čokoladnu daj {9 jedinica.}', detail: 'Ganache ima puno masti — usporava apsorpciju. Razmisli o split dozi za bolju kontrolu.' } }
    ] },
    { q: 'Koliko jedinica za tanjur tjestenine s umakom?', ans: { main: 'Preporučam {10 jedinica.}', detail: 'Srednji tanjur je oko 60g UH. Tvoj šećer je stabilan pa je dobar trenutak.' }, ctx: [
      { q: 'Koliko tjestenine planiraš?', reply: 'Oko 200 grama kuhane.', ans: { main: 'Za 200g treba {12 jedinica.}', detail: '200g kuhane tjestenine je oko 56g UH plus umak. Daj inzulin 10 min prije.' } }
    ] },
    { q: 'Šećer mi je visok, što da napravim?', ans: { main: 'Daj korekciju od {3 jedinice.}', detail: 'Vidim da ti je 13.4 i polako raste. Zadnja korekcija je bila prije 4 sata.' }, ctx: [
      { q: 'Imaš li simptome?', reply: 'Malo me boli glava.', ans: { main: 'Daj {3 jedinice} i pij vodu.', detail: 'Glavobolja može biti od visokog šećera. Pij 2-3 čaše vode u sljedećih sat vremena.' } },
      { q: 'Jesi li nešto jeo nedavno?', reply: 'Sendvič prije sat vremena.', ans: { main: 'Daj još {2 jedinice} korekcije.', detail: 'Vidim da si za sendvič dao 6 jedinica — izgleda da je trebalo više. Dodaj korekciju.' } }
    ] },
    { q: 'Je li normalno da mi šećer padne nakon trčanja?', ans: { main: 'Da, potpuno normalno.', detail: 'Vidim da ti šećer pada prosječno za 3.5 mmol/L nakon aktivnosti. Smanji cjelodnevni inzulin prije treninga.' }, ctx: [
      { q: 'Planiraš li još trenirati?', reply: 'Da, sutra ujutro opet.', ans: { main: 'Smanji sutra cjelodnevni inzulin za {40%} sat prije.', detail: 'Prema tvojoj povijesti, šećer ti pada za 3-4 nakon trčanja. Smanji cjelodnevni inzulin i pojedi 15g UH prije.' } }
    ] },
    { q: 'Koliko inzulina za dva peciva i čašu mlijeka?', ans: { main: 'Za to ti treba {7 jedinica.}', detail: 'Dva peciva ~40g UH, mlijeko ~12g. Šećer ti je sad 6.8 — dobar trenutak.' }, ctx: [
      { q: 'Jesu li peciva integralna?', reply: 'Ne, obična bijela.', ans: { main: 'Za bijela peciva daj {8 jedinica.}', detail: 'Bijela peciva imaju viši GI. Daj inzulin 15 min prije jer šećer brže raste.' } },
      { q: 'Planiraš li još nešto jesti?', reply: 'Možda malo sira.', ans: { main: 'Ostani na {7 jedinica.}', detail: 'Sir nema značajnih UH, ali usporava apsorpciju. Ne treba dodatni inzulin.' } }
    ] },
    { q: 'Šećer mi je nizak, što da pojedem?', ans: { main: 'Pojedi 15g brzih UH odmah.', detail: 'Vidim da ti je 3.8 i pada. Sok, tablete glukoze ili 3-4 bombona — provjeri za 15 min.' }, ctx: [
      { q: 'Što imaš pri ruci?', reply: 'Imam sok od jabuke.', ans: { main: 'Popij pola čaše soka odmah.', detail: 'To je oko 15g brzih UH. S obzirom da ti je 3.8, to bi trebalo biti dovoljno. Provjeri za 15 min.' } }
    ] },
    { q: 'Zašto mi je šećer visok ako nisam ništa jeo?', ans: { main: 'Vidim da nemaš unosa već 6 sati.', detail: 'Moguć je stres ili dawn fenomen. Tvoj cjelodnevni inzulin možda nije dovoljan za ovo doba dana.' }, ctx: [
      { q: 'Jesi li pod stresom?', reply: 'Da, imam deadline na poslu.', ans: { main: 'Stres ti diže šećer.', detail: 'Kortizol potiče jetru da otpusti glukozu. Daj malu korekciju od {2 jedinice} i probaj se opustiti.' } },
      { q: 'Je li ovo čest obrazac?', reply: 'Da, zadnjih par dana.', ans: { main: 'Trebalo bi ti povećati cjelodnevni inzulin.', detail: 'Vidim da ti šećer raste u ovo doba već 3 dana. Povećaj cjelodnevni inzulin za {15%} od 14-18h.' } }
    ] },
    { q: 'Hoće li mi kava podići šećer ujutro?', ans: { main: 'Crna kava minimalno utječe.', detail: 'Ali vidim da ti šećer nakon kave obično skoči za 1.5 — piješ li je s nečim?' }, ctx: [
      { q: 'Piješ li je s nečim?', reply: 'S mlijekom i žlicom šećera.', ans: { main: 'Mlijeko i šećer dodaju {2 jedinice.}', detail: 'To je oko 15g UH. Tvoja povijest pokazuje skok od 1.5 nakon kave — ovo je razlog.' } }
    ] },
    { q: 'Mogu li jesti voće a da mi šećer ne skače?', ans: { main: 'Da, ali ovisi o vrsti.', detail: 'Prema tvojoj povijesti, bobičasto voće ti ne diže šećer značajno, a banana da.' }, ctx: [
      { q: 'Koje voće planiraš?', reply: 'Jagode, oko 200g.', ans: { main: '200g jagoda je sigurno.', detail: 'To je samo 14g UH. Prema tvojoj povijesti, jagode ti minimalno utječu na šećer.' } },
      { q: 'Planiraš li ga jesti samo?', reply: 'S jogurtom i medom.', ans: { main: 'Za med dodaj {2 jedinice.}', detail: 'Voće je OK, ali žlica meda ima 17g UH. Jogurt bez šećera ne zahtijeva dodatni inzulin.' } }
    ] },
    { q: 'Planiram ići na trening, trebam li smanjiti inzulin?', ans: { main: 'Smanji cjelodnevni inzulin za {30%.}', detail: 'Vidim da ti šećer prosječno padne 2.8 nakon treninga. Smanji 30 min prije.' }, ctx: [
      { q: 'Kakav trening planiraš?', reply: 'Dizanje utega, sat vremena.', ans: { main: 'Smanji cjelodnevni inzulin za {20%.}', detail: 'Utezi manje snizuju šećer od kardia. Tvoja povijest pokazuje pad od 1.5 nakon utega.' } },
      { q: 'Koliko dugo planiraš?', reply: 'Sat i pol kardia.', ans: { main: 'Smanji cjelodnevni inzulin za {40%.}', detail: '90 min kardia značajno troši glukozu. Ponesi tablete glukoze i provjeri šećer svakih 30 min.' } }
    ] },
    { q: 'Trebam li nešto pojesti prije spavanja?', ans: { main: 'Da, pojedi lagani obrok.', detail: 'Šećer ti je 4.8 i lagano pada. Proteini + masti drže šećer stabilnim preko noći.' }, ctx: [
      { q: 'Što imaš za pojesti?', reply: 'Kreker i kikiriki maslac.', ans: { main: 'Savršen izbor.', detail: 'Kreker daje brze UH da te podigne, kikiriki maslac usporava i drži stabilnim do jutra.' } }
    ] },
    { q: 'Koliko inzulina za kebab i pomfrit?', ans: { main: 'Trebat će ti {14 jedinica.}', detail: 'Kebab tortilla ~50g UH, pomfrit ~40g. Masna hrana pa preporučam split dozu.' }, ctx: [
      { q: 'Koliko pomfrita?', reply: 'Veliku porciju, oko 250g.', ans: { main: 'Za to treba {17 jedinica.}', detail: '250g pomfrita je ~65g UH. Plus kebab ukupno ~115g UH. Split doza — 10 sad, 7 za 45 min.' } }
    ] },
    { q: 'Što da radim, šećer mi naglo pada?', ans: { main: 'Pojedi 15g šećera odmah.', detail: 'Vidim pad od 2.1 u zadnjih 30 min. Brzo reagiraj — sok ili tablete glukoze.' }, ctx: [
      { q: 'Imaš li glukagon pri ruci?', reply: 'Da, u torbi.', ans: { main: 'Drži ga blizu sebe.', detail: 'Za sada pojedi 20g brzih UH jer pad je brz. Ako se ne stabilizira za 15 min, koristi glukagon.' } }
    ] },
    { q: 'Je li bolje dati inzulin prije ili poslije jela?', ans: { main: '15 minuta prije jela.', detail: 'Tvoja povijest pokazuje da pre-bolus od 15 min daje najbolje rezultate.' }, ctx: [
      { q: 'A kad mi je šećer nizak?', reply: 'Sad mi je 4.5.', ans: { main: 'Kod 4.5 daj inzulin s jelom.', detail: 'Ne čekaj 15 min jer bi mogao pasti prenisko. Pojedi i daj inzulin istovremeno.' } }
    ] },
    { q: 'Zašto mi šećer raste tijekom noći?', ans: { main: 'To je dawn fenomen.', detail: 'Vidim porast od prosječno 2.3 između 4-7h zadnji tjedan dana.' }, ctx: [
      { q: 'Može li se to riješiti?', reply: 'Da, kako?', ans: { main: 'Povećaj cjelodnevni inzulin od 3h za {20%.}', detail: 'Tvoj porast počinje oko 4h. Postavi povećani cjelodnevni inzulin od 3:00 da preduhitri dawn fenomen.' } }
    ] },
    { q: 'Koliko ugljikohidrata ima u banani?', ans: { main: 'Srednja banana ima 27g UH.', detail: 'Prema tvojoj povijesti, banana ti podiže šećer za oko 3.0 bez inzulina.' }, ctx: [
      { q: 'Trebam li inzulin za nju?', reply: 'Da, koliko?', ans: { main: 'Daj {2 jedinice} za bananu.', detail: 'S obzirom na tvoj omjer (1 jedinica = 12g UH), 2 jedinice su točno za 27g.' } }
    ] },
    { q: 'Mogu li piti sok od naranče?', ans: { main: 'Da, ali pazi na količinu.', detail: 'Šećer ti je trenutno 5.4 i stabilan. Čaša soka ima ~25g brzih UH.' }, ctx: [
      { q: 'Koliko soka planiraš?', reply: 'Malu čašu, 150ml.', ans: { main: '150ml je sigurno bez inzulina.', detail: 'To je oko 15g UH. S obzirom da ti je šećer 5.4, podignut će ga na oko 7 — sasvim OK.' } },
      { q: 'Želiš li ga uz obrok?', reply: 'Da, uz doručak.', ans: { main: 'Dodaj {2 jedinice} na dozu za doručak.', detail: 'Sok uz obrok brže diže šećer. Dodaj ga u izračun UH za doručak.' } }
    ] },
    { q: 'Pojeo sam sladoled, koliko da si dam inzulina?', ans: { main: 'Za to daj {6 jedinica.}', detail: 'Dvije kuglice su oko 30g UH. Mast usporava apsorpciju pa daj split dozu.' }, ctx: [
      { q: 'Koliko si točno pojeo?', reply: 'Tri kuglice, oko 180g.', ans: { main: 'Za 180g treba {9 jedinica.}', detail: 'To je oko 45g UH. Daj 5 sad i 4 za 30 min jer mast usporava apsorpciju.' } },
      { q: 'Kakav sladoled?', reply: 'Domaći, s puno čokolade.', ans: { main: 'Za čokoladni daj {7 jedinica.}', detail: 'Domaći čokoladni ima više masti i šećera. Split doza je obavezna za bolju kontrolu.' } }
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
