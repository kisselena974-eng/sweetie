# Komponente

Gotovi kod primjeri za Sweetie komponente.

## Edge-Hugging Button

Gumb koji "grli" donji rub kružnog ekrana.

```html
<button class="edge-hugging-btn">
  <span class="btn-icon"><!-- SVG --></span>
  <span class="btn-label">Label</span>
</button>
```

```css
.edge-hugging-btn {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  
  min-width: 120px;
  height: 52px;
  padding: 0 24px;
  
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  cursor: pointer;
  
  /* Zaobljeni vrh, zakrivljeno dno */
  border-radius: 26px 26px 40px 40px;
  
  font: var(--type-label-large);
  
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  transition: 
    transform var(--duration-short) var(--motion-spatial),
    background-color var(--duration-short) var(--motion-effects);
}

.edge-hugging-btn:active {
  transform: translateX(-50%) scale(0.96);
}

.edge-hugging-btn:hover {
  background: var(--color-primary-container);
}
```

## Arc Text (SVG)

Zakrivljeni tekst na vrhu i dnu ekrana.

```html
<svg viewBox="0 0 252 252" class="arc-text-container">
  <defs>
    <!-- Gornji luk (10h do 2h) -->
    <path id="arcTop" 
          d="M 30,70 A 111,111 0 0,1 222,70" 
          fill="none"/>
    <!-- Donji luk (8h do 4h) -->
    <path id="arcBottom" 
          d="M 30,182 A 111,111 0 0,0 222,182" 
          fill="none"/>
  </defs>
  
  <!-- Vrijeme na vrhu -->
  <text class="arc-time">
    <textPath href="#arcTop" startOffset="50%" text-anchor="middle">
      09:30
    </textPath>
  </text>
  
  <!-- Vrijednost na dnu -->
  <text class="arc-value">
    <textPath href="#arcBottom" startOffset="50%" text-anchor="middle">
      6,5
    </textPath>
  </text>
</svg>
```

```css
.arc-text-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.arc-time {
  font: var(--type-arc-medium);
  fill: var(--color-on-surface-variant);
  letter-spacing: 0.02em;
}

.arc-value {
  font: var(--type-numeral-medium);
  fill: var(--color-primary);
  font-variant-numeric: tabular-nums;
}
```

## Page Indicators (Dots)

Vertikalni indikatori stranica na desnoj strani.

```html
<div class="page-indicators">
  <span class="page-dot active"></span>
  <span class="page-dot"></span>
  <span class="page-dot"></span>
</div>
```

```css
.page-indicators {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-outline);
  
  transition: 
    background-color var(--duration-short) var(--motion-effects),
    transform var(--duration-short) var(--motion-spatial);
}

.page-dot.active {
  background: var(--color-primary);
  transform: scale(1.2);
}
```

## Glucose Display

Centralni prikaz glukoze s blob animacijom.

```html
<div class="glucose-display">
  <div class="glucose-blob"></div>
  <div class="glucose-content">
    <span class="glucose-value">6,5</span>
    <span class="glucose-unit">mmol/L</span>
  </div>
  <div class="glucose-trend">
    <!-- Trend arrow SVG -->
  </div>
</div>
```

```css
.glucose-display {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.glucose-value {
  font: var(--type-numeral-large);
  font-variant-numeric: tabular-nums;
  color: var(--glucose-safe);
  transition: color var(--duration-medium) var(--motion-effects);
}

.glucose-unit {
  font: var(--type-body-small);
  color: var(--color-on-surface-variant);
  margin-top: var(--spacing-xs);
}

.glucose-trend {
  width: 24px;
  height: 24px;
  margin-top: var(--spacing-sm);
  transition: transform var(--duration-short) var(--motion-spatial);
}
```

## Context Button (FAB)

Floating action button za dodavanje konteksta.

```html
<button class="context-btn" aria-label="Add context">
  <svg><!-- Plus icon --></svg>
</button>
```

```css
.context-btn {
  position: absolute;
  bottom: 16px;
  left: 16px;
  
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  transition: 
    background-color var(--duration-short) var(--motion-effects),
    transform var(--duration-short) var(--motion-spatial);
}

.context-btn:active {
  background: var(--color-surface-container-high);
  transform: scale(0.92);
}

.context-btn svg {
  width: 24px;
  height: 24px;
}
```

## Card

Kartica za sadržaj.

```html
<div class="card">
  <div class="card-content">
    <!-- Content -->
  </div>
</div>
```

```css
.card {
  background: var(--color-surface-container);
  border-radius: var(--shape-large);
  padding: var(--spacing-lg);
  
  transition: 
    transform var(--duration-short) var(--motion-spatial),
    background-color var(--duration-short) var(--motion-effects);
}

.card:active {
  transform: scale(0.98);
  background: var(--color-surface-container-high);
}
```

## Circular Progress

Kružni progress indikator.

```html
<svg class="circular-progress" viewBox="0 0 100 100">
  <circle class="track" cx="50" cy="50" r="45"/>
  <circle class="progress" cx="50" cy="50" r="45"/>
</svg>
```

```css
.circular-progress {
  --progress: 0.65;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.circular-progress .track {
  fill: none;
  stroke: var(--color-surface-container);
  stroke-width: 8;
}

.circular-progress .progress {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283; /* 2 * PI * 45 */
  stroke-dashoffset: calc(283 * (1 - var(--progress)));
  transition: stroke-dashoffset var(--duration-medium) var(--motion-spatial);
}
```

## Screen Container

Wrapper za svaku stranicu.

```html
<div class="screen" data-screen="home">
  <!-- Screen content -->
</div>
```

```css
.screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--color-background);
  overflow: hidden;
  
  /* Animations */
  opacity: 0;
  transform: translateX(100%);
  transition: 
    opacity var(--duration-medium) var(--motion-effects),
    transform var(--duration-medium) var(--motion-spatial);
}

.screen.active {
  opacity: 1;
  transform: translateX(0);
}

.screen.exit {
  transform: translateX(-100%);
}
```

## Watch Container

Glavni container koji simulira sat.

```html
<div class="watch-container">
  <div class="watch-display">
    <!-- Screens go here -->
  </div>
</div>
```

```css
.watch-container {
  width: 252px;
  height: 252px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-background);
  position: relative;
}

.watch-display {
  width: 100%;
  height: 100%;
  position: relative;
}
```
