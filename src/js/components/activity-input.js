/**
 * Activity Input Controller
 * Handles activity logging with voice-like interface and AI suggestions
 */

class ActivityInputController {
  constructor() {
    this.screen = document.querySelector('[data-screen="activity-input"]');
    this.homeScreen = document.querySelector('[data-screen="home"]');

    if (!this.screen) return;

    // Elements
    this.content = this.screen.querySelector('.activity-input-content');
    this.mic = this.screen.querySelector('.activity-mic');
    this.prompt = this.screen.querySelector('.activity-prompt');
    this.speechEl = this.screen.querySelector('.activity-speech');
    this.confirmBtn = this.screen.querySelector('.activity-confirm-btn');
    this.answerEl = this.screen.querySelector('.activity-answer');
    this.answerMain = this.screen.querySelector('.activity-answer-main');
    this.answerDetail = this.screen.querySelector('.activity-answer-detail');
    this.favoritesBtn = this.screen.querySelector('.activity-favorites-btn');
    this.favoritesOverlay = this.screen.querySelector('.activity-favorites');
    this.favBtns = this.screen.querySelectorAll('.activity-fav-btn');

    // State
    this.isListening = false;
    this.isFavoritesOpen = false;
    this.isAnswerVisible = false;
    this.wordTimers = [];
    this.currentActivity = null;
    this.currentAnswer = null;

    // Activity data with AI responses - Croatian
    this.activityDataHR = [
      {
        speech: 'Idem trčati pola sata.',
        answer: { main: 'Smanji inzulin za {30%.}', detail: '30 min trčanja troši oko 150 kcal. Ponesi glukozu za svaki slučaj.' }
      },
      {
        speech: 'Planiram sat vremena bicikla.',
        answer: { main: 'Smanji inzulin za {40%.}', detail: 'Duži kardio značajno troši glukozu. Provjeri šećer svakih 30 min.' }
      },
      {
        speech: 'Idem u teretanu dizati utege.',
        answer: { main: 'Smanji inzulin za {20%.}', detail: 'Utezi manje snizuju šećer od kardija. Pazi na odgođeni pad 2-3h nakon.' }
      },
      {
        speech: 'Planiram duži pješački izlet.',
        answer: { main: 'Smanji inzulin za {35%.}', detail: 'Višesatna šetnja troši puno glukoze. Ponesi užinu i glukozu.' }
      },
      {
        speech: 'Imam trening plivanja.',
        answer: { main: 'Smanji inzulin za {35%.}', detail: 'Plivanje je intenzivan kardio. Provjeri šećer prije i nakon.' }
      }
    ];

    // Activity data with AI responses - English
    this.activityDataEN = [
      {
        speech: 'I\'m going for a 30-minute run.',
        answer: { main: 'Reduce insulin by {30%.}', detail: '30 min running burns about 150 kcal. Bring glucose just in case.' }
      },
      {
        speech: 'I\'m planning an hour of cycling.',
        answer: { main: 'Reduce insulin by {40%.}', detail: 'Longer cardio significantly uses glucose. Check sugar every 30 min.' }
      },
      {
        speech: 'I\'m going to the gym to lift weights.',
        answer: { main: 'Reduce insulin by {20%.}', detail: 'Weights lower sugar less than cardio. Watch for delayed drop 2-3h after.' }
      },
      {
        speech: 'I\'m planning a long hike.',
        answer: { main: 'Reduce insulin by {35%.}', detail: 'Multi-hour walking uses a lot of glucose. Bring snacks and glucose.' }
      },
      {
        speech: 'I have swimming practice.',
        answer: { main: 'Reduce insulin by {35%.}', detail: 'Swimming is intense cardio. Check sugar before and after.' }
      }
    ];

    // Favorite activities with direct answers - Croatian
    this.favoriteActivitiesHR = [
      { name: 'Trčanje', answer: { main: 'Smanji inzulin za {30%.}', detail: '30 min trčanja prosječno snižava šećer za 2-3. Ponesi glukozu.' } },
      { name: 'Bicikl', answer: { main: 'Smanji inzulin za {35%.}', detail: 'Bicikliranje troši puno energije. Provjeri šećer svakih 30 min.' } },
      { name: 'Šetnja', answer: { main: 'Smanji inzulin za {15%.}', detail: 'Lagana šetnja blago snižava šećer. Za dužu šetnju ponesi užinu.' } }
    ];

    // Favorite activities with direct answers - English
    this.favoriteActivitiesEN = [
      { name: 'Running', answer: { main: 'Reduce insulin by {30%.}', detail: '30 min running lowers sugar by 2-3 on average. Bring glucose.' } },
      { name: 'Cycling', answer: { main: 'Reduce insulin by {35%.}', detail: 'Cycling uses a lot of energy. Check sugar every 30 min.' } },
      { name: 'Walking', answer: { main: 'Reduce insulin by {15%.}', detail: 'Light walking slightly lowers sugar. For longer walks bring a snack.' } }
    ];

    // Set active data based on language
    this.activityData = this.getActivityData();
    this.favoriteActivities = this.getFavoriteActivities();

    this.init();
  }

  getActivityData() {
    const lang = localStorage.getItem('sweetie-lang') || 'en';
    return lang === 'hr' ? this.activityDataHR : this.activityDataEN;
  }

  getFavoriteActivities() {
    const lang = localStorage.getItem('sweetie-lang') || 'en';
    return lang === 'hr' ? this.favoriteActivitiesHR : this.favoriteActivitiesEN;
  }

  init() {
    // Prevent swipes
    this.screen.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    this.screen.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: false });
    this.screen.addEventListener('touchend', (e) => e.stopPropagation(), { passive: false });

    // Mic click starts listening
    if (this.mic) {
      this.mic.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      this.mic.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.isListening && !this.isFavoritesOpen) {
          this.startListening();
        }
      });
    }

    // Favorites button (heart)
    if (this.favoritesBtn) {
      this.favoritesBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      this.favoritesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorites();
      });
    }

    // Favorite activity buttons
    this.favBtns.forEach((btn, index) => {
      btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectFavorite(index);
      });
    });

    // Confirm button
    if (this.confirmBtn) {
      this.confirmBtn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      this.confirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isAnswerVisible) {
          this.logActivityAndReturn();
        } else {
          this.showAnswer();
        }
      });
    }
  }

  show() {
    if (!this.screen) return;

    // Refresh data for current language
    this.activityData = this.getActivityData();
    this.favoriteActivities = this.getFavoriteActivities();

    // Update favorite button labels
    this.favBtns.forEach((btn, index) => {
      if (this.favoriteActivities[index]) {
        btn.textContent = this.favoriteActivities[index].name;
      }
    });

    // Hide clock
    const fixedTime = document.querySelector('.fixed-time');
    const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
    if (fixedTime) fixedTime.style.opacity = '0';
    if (fixedTimeKnockout) fixedTimeKnockout.style.opacity = '0';

    // Reset state
    this.reset();

    // Update mic color to match current glucose
    if (window.glucoseBlob && this.mic) {
      this.mic.style.color = window.glucoseBlob.getColor();
    }

    // Show screen
    this.screen.classList.add('active');
  }

  hide() {
    if (!this.screen) return;
    this.screen.classList.remove('active');

    // Show clock
    const fixedTime = document.querySelector('.fixed-time');
    const fixedTimeKnockout = document.querySelector('.fixed-time-knockout');
    if (fixedTime) fixedTime.style.opacity = '';
    if (fixedTimeKnockout) fixedTimeKnockout.style.opacity = '';
  }

  reset() {
    this.isListening = false;
    this.isFavoritesOpen = false;
    this.isAnswerVisible = false;
    this.wordTimers.forEach(t => clearTimeout(t));
    this.wordTimers = [];
    this.currentActivity = null;
    this.currentAnswer = null;

    // Reset UI
    this.content.classList.remove('listening');
    this.content.style.display = '';
    this.speechEl.textContent = '';
    this.confirmBtn.classList.remove('visible');
    this.answerEl.classList.remove('visible');
    if (this.favoritesOverlay) this.favoritesOverlay.classList.remove('open');
    if (this.favoritesBtn) this.favoritesBtn.style.display = '';
  }

  toggleFavorites() {
    this.isFavoritesOpen = !this.isFavoritesOpen;

    if (this.isFavoritesOpen) {
      // Hide mic content, show favorites
      this.content.style.display = 'none';
      this.favoritesOverlay.classList.add('open');
      this.favoritesBtn.style.backgroundColor = '#000';
    } else {
      // Show mic content, hide favorites
      this.content.style.display = '';
      this.favoritesOverlay.classList.remove('open');
      this.favoritesBtn.style.backgroundColor = '';
    }
  }

  selectFavorite(index) {
    const favorite = this.favoriteActivities[index];
    if (!favorite) return;

    // Close favorites
    this.isFavoritesOpen = false;
    this.favoritesOverlay.classList.remove('open');
    this.favoritesBtn.style.backgroundColor = '';

    // Set answer and show it directly
    this.currentAnswer = favorite.answer;
    this.showAnswer();
  }

  getRandomActivity() {
    const index = Math.floor(Math.random() * this.activityData.length);
    this.currentActivity = this.activityData[index];
    this.currentAnswer = this.currentActivity.answer;
    return this.currentActivity.speech;
  }

  startListening() {
    if (this.isListening) return;
    this.isListening = true;

    // Hide favorites button during listening
    if (this.favoritesBtn) this.favoritesBtn.style.display = 'none';

    this.content.classList.add('listening');
    this.speechEl.textContent = '';

    // Animate words
    const words = this.getRandomActivity().split(' ');

    words.forEach((word, i) => {
      const timer = setTimeout(() => {
        const span = document.createElement('span');
        span.textContent = (i === 0 ? '' : ' ') + word;
        span.style.opacity = '0';
        span.style.transition = 'opacity 0.4s ease';
        this.speechEl.appendChild(span);
        span.offsetHeight;
        span.style.opacity = '1';
      }, i * 300);
      this.wordTimers.push(timer);
    });

    // Show confirm after words
    const confirmTimer = setTimeout(() => {
      this.confirmBtn.classList.add('visible');
    }, words.length * 300 + 400);
    this.wordTimers.push(confirmTimer);
  }

  showAnswer() {
    if (!this.currentAnswer) return;

    // Hide listening state
    this.wordTimers.forEach(t => clearTimeout(t));
    this.wordTimers = [];
    this.content.classList.remove('listening');
    this.content.style.display = 'none';
    this.speechEl.textContent = '';

    // Build answer with accent spans
    const mainHtml = this.currentAnswer.main.replace(
      /\{(.+?)\}/g,
      '<span class="accent">$1</span>'
    );
    this.answerMain.innerHTML = mainHtml;
    this.answerDetail.textContent = this.currentAnswer.detail;

    // Set accent color
    const accentColor = window.glucoseBlob ? window.glucoseBlob.getColor() : '';
    this.answerMain.querySelectorAll('.accent').forEach(el => {
      el.style.color = accentColor;
    });

    // Show answer and confirm button
    this.answerEl.classList.add('visible');
    this.isAnswerVisible = true;
    this.confirmBtn.classList.add('visible');
  }

  logActivityAndReturn() {
    // Add marker to graph
    if (window.graphSlider) {
      window.graphSlider.addContextMarker('activity');
    }

    // Get glucose blob
    const blobInstance = window.glucoseBlob;

    // Get home elements
    const navCircle = this.homeScreen.querySelector('.nav-circle');
    const homeBlob = this.homeScreen.querySelector('.glucose-blob');
    const addContextBtn = this.homeScreen.querySelector('.add-context-btn');

    // Reset home screen
    if (window.resetToHomeView) {
      window.resetToHomeView();
    }

    // Lock blob to center
    if (blobInstance && blobInstance.lockToCenter) {
      blobInstance.lockToCenter();
    }

    // Prepare home screen
    if (navCircle) navCircle.style.opacity = '0';
    if (addContextBtn) addContextBtn.style.opacity = '0';
    if (homeBlob) homeBlob.style.opacity = '1';

    // Show home behind activity screen
    if (this.homeScreen) {
      this.homeScreen.classList.add('active');
    }

    // Create checkmark on blob
    const checkmark = this.createCheckmarkOverlay();
    if (homeBlob) homeBlob.appendChild(checkmark);

    // Fade out activity screen
    this.screen.style.transition = 'opacity 0.5s ease-out';
    this.screen.style.opacity = '0';

    // Show checkmark
    setTimeout(() => {
      checkmark.style.transition = 'opacity 0.3s ease-out';
      checkmark.style.opacity = '1';
    }, 300);

    // Fade out checkmark
    setTimeout(() => {
      checkmark.style.transition = 'opacity 0.5s ease-out';
      checkmark.style.opacity = '0';
    }, 900);

    // Fade in nav and clock
    setTimeout(() => {
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
    }, 1200);

    // Final cleanup
    setTimeout(() => {
      this.hide();

      if (checkmark.parentNode) checkmark.remove();

      this.screen.style.transition = '';
      this.screen.style.opacity = '';
      if (navCircle) {
        navCircle.style.transition = '';
        navCircle.style.opacity = '';
      }
      if (addContextBtn) {
        addContextBtn.style.transition = '';
        addContextBtn.style.opacity = '';
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

      // Unlock blob
      if (blobInstance && blobInstance.unlockFromCenter) {
        blobInstance.unlockFromCenter();
      }

      // Dispatch event
      document.dispatchEvent(new CustomEvent('activityLogged', {
        detail: { activity: this.currentActivity?.speech }
      }));
    }, 1800);
  }

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
}

// Export for use
window.ActivityInputController = ActivityInputController;
