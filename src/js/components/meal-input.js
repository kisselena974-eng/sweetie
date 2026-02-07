/**
 * Meal Input Controller
 * Handles meal logging with voice-like interface and AI suggestions
 */

class MealInputController {
  constructor() {
    this.screen = document.querySelector('[data-screen="meal-input"]');
    this.homeScreen = document.querySelector('[data-screen="home"]');

    if (!this.screen) return;

    // Elements
    this.content = this.screen.querySelector('.meal-input-content');
    this.mic = this.screen.querySelector('.meal-mic');
    this.prompt = this.screen.querySelector('.meal-prompt');
    this.speechEl = this.screen.querySelector('.meal-speech');
    this.options = this.screen.querySelector('.meal-options');
    this.optionBtns = this.screen.querySelectorAll('.meal-option-btn');
    this.confirmBtn = this.screen.querySelector('.meal-confirm-btn');
    this.answerEl = this.screen.querySelector('.meal-answer');
    this.answerMain = this.screen.querySelector('.meal-answer-main');
    this.answerDetail = this.screen.querySelector('.meal-answer-detail');
    this.favoritesBtn = this.screen.querySelector('.meal-favorites-btn');
    this.favoritesOverlay = this.screen.querySelector('.meal-favorites');
    this.favBtns = this.screen.querySelectorAll('.meal-fav-btn');

    // State
    this.isListening = false;
    this.isFavoritesOpen = false;
    this.wordTimers = [];
    this.currentMeal = null;
    this.currentAnswer = null;
    this.selectedOption = null;

    // Meal data with AI responses
    this.mealData = [
      {
        speech: 'Pojela sam pizzu i popila sok.',
        options: ['Kolika pizza?', 'Kakav sok?'],
        optionReplies: ['Srednja, oko 300g.', 'Sok od jabuke, 250ml.'],
        answer: { main: 'Za to treba {14 jedinica.}', detail: 'Pizza ~70g UH, sok ~25g UH. Daj 10 sad, 4 za 45 min zbog masti.' },
        optionAnswers: [
          { main: 'Za srednju pizzu treba {12 jedinica.}', detail: '300g pizze je oko 70g UH. Preporučam split dozu zbog sira i tijesta.' },
          { main: 'Sok dodaje {3 jedinice.}', detail: '250ml soka od jabuke ima oko 28g brzih UH. Daj ih odmah.' }
        ]
      },
      {
        speech: 'Imam sendvič i čips.',
        options: ['Kakav sendvič?', 'Koliko čipsa?'],
        optionReplies: ['Sa šunkom i sirom.', 'Mala vrećica, 40g.'],
        answer: { main: 'Preporučam {8 jedinica.}', detail: 'Sendvič ~35g UH, čips ~20g UH. Mast usporava apsorpciju.' },
        optionAnswers: [
          { main: 'Sendvič sa šunkom treba {5 jedinica.}', detail: 'Dvije kriške kruha ~30g UH. Šunka i sir nemaju značajnih UH.' },
          { main: 'Čips dodaje {3 jedinice.}', detail: '40g čipsa ima oko 22g UH plus mast koja usporava apsorpciju.' }
        ]
      },
      {
        speech: 'Pojela sam tjesteninu s umakom.',
        options: ['Koliko tjestenine?', 'Kakav umak?'],
        optionReplies: ['Pun tanjur, oko 250g.', 'Bolognese s mesom.'],
        answer: { main: 'Za to daj {12 jedinica.}', detail: 'Srednji tanjur tjestenine je oko 60g UH. Umak dodaje još malo.' },
        optionAnswers: [
          { main: 'Za 250g tjestenine treba {14 jedinica.}', detail: 'To je oko 70g UH. Daj inzulin 10-15 min prije jela.' },
          { main: 'Bolognese ne mijenja puno dozu.', detail: 'Meso usporava apsorpciju. Razmisli o split dozi - 8 sad, 6 za 30 min.' }
        ]
      },
      {
        speech: 'Jedem palačinke s nutellom.',
        options: ['Koliko palačinki?', 'Koliko nutelle?'],
        optionReplies: ['Tri palačinke.', 'Debeli sloj, puno.'],
        answer: { main: 'Trebat će ti {10 jedinica.}', detail: 'Palačinke + nutella = brzi šećeri. Daj inzulin 15 min prije.' },
        optionAnswers: [
          { main: 'Za 3 palačinke daj {8 jedinica.}', detail: 'Svaka palačinka oko 15g UH. Bez nutelle to je 45g UH.' },
          { main: 'Puno nutelle dodaje {4 jedinice.}', detail: 'Debeli sloj je oko 40g = 22g UH. Kombinacija brzo diže šećer.' }
        ]
      },
      {
        speech: 'Pojela sam burger i pomfrit.',
        options: ['Kakav burger?', 'Koliko pomfrita?'],
        optionReplies: ['Big Mac.', 'Velika porcija.'],
        answer: { main: 'Za to treba {16 jedinica.}', detail: 'Burger ~45g UH, pomfrit ~50g UH. Split doza zbog masti.' },
        optionAnswers: [
          { main: 'Big Mac treba {7 jedinica.}', detail: 'Pecivo i umaci imaju oko 45g UH. Meso i sir usporavaju.' },
          { main: 'Velika porcija pomfrita dodaje {10 jedinica.}', detail: 'Oko 65g UH. Daj split - 6 sad, 4 za 45 min.' }
        ]
      },
      {
        speech: 'Imam žitarice s mlijekom.',
        options: ['Koje žitarice?', 'Koliko mlijeka?'],
        optionReplies: ['Corn flakes.', 'Puna zdjela, 200ml.'],
        answer: { main: 'Preporučam {6 jedinica.}', detail: 'Žitarice su brzi UH. Daj inzulin 15 min prije.' },
        optionAnswers: [
          { main: 'Corn flakes trebaju {5 jedinica.}', detail: 'Porcija od 40g ima oko 35g UH. Visok GI - brzo diže šećer.' },
          { main: 'Mlijeko dodaje {1 jedinicu.}', detail: '200ml mlijeka ima oko 10g UH. Proteini malo usporavaju.' }
        ]
      },
      {
        speech: 'Jedem salatu s piletinom.',
        options: ['Ima li dresing?', 'Ima li kruh uz?'],
        optionReplies: ['Da, french dressing.', 'Da, dva komada.'],
        answer: { main: 'Samo {2 jedinice} ili ništa.', detail: 'Salata i piletina imaju minimalno UH. Ovisi o dodacima.' },
        optionAnswers: [
          { main: 'Dresing dodaje {1 jedinicu.}', detail: 'French dressing ima oko 8g UH po žlici. Nije puno.' },
          { main: 'Kruh dodaje {3 jedinice.}', detail: 'Dva komada kruha su oko 30g UH. Daj inzulin za to.' }
        ]
      },
      {
        speech: 'Imam croissant i kavu.',
        options: ['Kakav croissant?', 'Kava s čim?'],
        optionReplies: ['S čokoladom.', 'S mlijekom i šećerom.'],
        answer: { main: 'Za to daj {5 jedinica.}', detail: 'Croissant ~25g UH. Kava ovisi o dodacima.' },
        optionAnswers: [
          { main: 'Čokoladni croissant treba {6 jedinica.}', detail: 'Tijesto + čokolada = oko 40g UH. Daj 15 min prije.' },
          { main: 'Kava s mlijekom i šećerom dodaje {2 jedinice.}', detail: 'Šećer + mlijeko oko 15g UH. Bez šećera samo 0.5 jed.' }
        ]
      },
      {
        speech: 'Pojela sam ribu s povrćem.',
        options: ['Kakva priprema?', 'Koje povrće?'],
        optionReplies: ['Pohana riba.', 'Grilovano povrće.'],
        answer: { main: 'Treba ti {3 jedinice.}', detail: 'Riba i povrće imaju malo UH. Priprema može dodati.' },
        optionAnswers: [
          { main: 'Pohana riba treba {5 jedinica.}', detail: 'Pohanje dodaje oko 25g UH. Grilovana bi bila 0-1 jed.' },
          { main: 'Grilovano povrće ne treba inzulin.', detail: 'Minimalno UH. Ako ima krumpira, dodaj 2-3 jedinice.' }
        ]
      },
      {
        speech: 'Jedem sladoled.',
        options: ['Koliko kuglica?', 'Kakav sladoled?'],
        optionReplies: ['Tri kuglice.', 'Čokolada i vanilija.'],
        answer: { main: 'Za sladoled daj {6 jedinica.}', detail: 'Mast usporava apsorpciju. Razmisli o split dozi.' },
        optionAnswers: [
          { main: 'Tri kuglice trebaju {7 jedinica.}', detail: 'Oko 45g UH. Split doza - 4 sad, 3 za 30 min.' },
          { main: 'Čokolada ima više UH od vanilije.', detail: 'Ali razlika je mala. Ostani na 6-7 jedinica.' }
        ]
      }
    ];

    // Favorite meals with direct answers (no options)
    this.favoriteMeals = [
      { name: 'Tost', answer: { main: 'Za tost treba {3 jedinice.}', detail: 'Dva komada tosta su oko 30g UH. Daj inzulin 10 min prije.' } },
      { name: 'Rižoto', answer: { main: 'Za rižoto daj {10 jedinica.}', detail: 'Srednja porcija rižota je oko 55g UH. Riža ima srednji GI.' } },
      { name: 'Pahuljice', answer: { main: 'Preporučam {5 jedinica.}', detail: 'Zobene pahuljice s mlijekom oko 40g UH. Daj 15 min prije.' } },
      { name: 'Kajgana', answer: { main: 'Samo {1 jedinica} ili ništa.', detail: 'Jaja imaju minimalno UH. Ako ima kruha uz, dodaj 2-3 jed.' } },
      { name: 'Salata', answer: { main: 'Bez inzulina ili {1 jedinica.}', detail: 'Salata ima minimalno UH. Ovisi o dresingu i dodacima.' } }
    ];

    this.init();
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

    // Favorite meal buttons
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
          this.logMealAndReturn();
        } else {
          this.showAnswer();
        }
      });
    }

    // Option buttons
    this.optionBtns.forEach((btn, index) => {
      btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectOption(index);
      });
    });
  }

  show() {
    if (!this.screen) return;

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
    this.currentMeal = null;
    this.currentAnswer = null;
    this.selectedOption = null;

    // Reset UI
    this.content.classList.remove('listening');
    this.content.style.display = '';
    this.speechEl.textContent = '';
    this.confirmBtn.classList.remove('visible');
    this.options.classList.remove('open');
    this.answerEl.classList.remove('visible');
    if (this.favoritesOverlay) this.favoritesOverlay.classList.remove('open');
  }

  toggleFavorites() {
    this.isFavoritesOpen = !this.isFavoritesOpen;

    if (this.isFavoritesOpen) {
      // Hide mic content, show favorites
      this.content.style.display = 'none';
      this.favoritesOverlay.classList.add('open');
      // Change heart button to X (rotate)
      this.favoritesBtn.style.backgroundColor = '#000';
    } else {
      // Show mic content, hide favorites
      this.content.style.display = '';
      this.favoritesOverlay.classList.remove('open');
      this.favoritesBtn.style.backgroundColor = '';
    }
  }

  selectFavorite(index) {
    const favorite = this.favoriteMeals[index];
    if (!favorite) return;

    // Close favorites
    this.isFavoritesOpen = false;
    this.favoritesOverlay.classList.remove('open');
    this.favoritesBtn.style.backgroundColor = '';

    // Set answer and show it directly
    this.currentAnswer = favorite.answer;
    this.showAnswer();
  }

  getRandomMeal() {
    const index = Math.floor(Math.random() * this.mealData.length);
    this.currentMeal = this.mealData[index];
    this.currentAnswer = this.currentMeal.answer;

    // Update option buttons
    this.optionBtns.forEach((btn, i) => {
      if (i < this.currentMeal.options.length) {
        btn.textContent = this.currentMeal.options[i];
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    return this.currentMeal.speech;
  }

  startListening() {
    if (this.isListening) return;
    this.isListening = true;

    this.content.classList.add('listening');
    this.speechEl.textContent = '';

    // Animate words
    const words = this.getRandomMeal().split(' ');

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

  selectOption(index) {
    if (!this.currentMeal) return;

    this.selectedOption = index;
    this.currentAnswer = this.currentMeal.optionAnswers[index];

    // Close options menu
    this.options.classList.remove('open');

    // Show reply animation
    this.wordTimers.forEach(t => clearTimeout(t));
    this.wordTimers = [];
    this.speechEl.textContent = '';

    this.content.style.display = '';
    this.content.classList.add('listening');
    this.confirmBtn.classList.remove('visible');

    const reply = this.currentMeal.optionReplies[index];
    const words = reply.split(' ');

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
    this.options.classList.remove('open');

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

  logMealAndReturn() {
    // Add marker to graph
    if (window.graphSlider) {
      window.graphSlider.addContextMarker('meal');
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

    // Show home behind meal screen
    if (this.homeScreen) {
      this.homeScreen.classList.add('active');
    }

    // Create checkmark on blob
    const checkmark = this.createCheckmarkOverlay();
    if (homeBlob) homeBlob.appendChild(checkmark);

    // Fade out meal screen
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
      document.dispatchEvent(new CustomEvent('mealLogged', {
        detail: { meal: this.currentMeal?.speech }
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

window.MealInputController = MealInputController;
