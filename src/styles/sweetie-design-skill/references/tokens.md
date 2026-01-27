# Design Tokens

Sve CSS varijable za Sweetie projekt.

## Boje

```css
:root {
  /* Pozadina - UVIJEK CRNA */
  --color-background: #000000;
  --color-surface: #1C1C1E;
  --color-surface-container: #2C2C2E;
  --color-surface-container-high: #3A3A3C;
  
  /* Primary (Sweetie brand - zelena) */
  --color-primary: #7ED321;
  --color-primary-container: #1B3D0A;
  --color-on-primary: #000000;
  --color-on-primary-container: #98F442;
  
  /* Secondary */
  --color-secondary: #A8C7FA;
  --color-secondary-container: #004A77;
  --color-on-secondary: #003355;
  
  /* Tertiary */
  --color-tertiary: #FFB4A9;
  --color-tertiary-container: #5C1A13;
  
  /* Semantic */
  --color-error: #FF4444;
  --color-error-container: #93000A;
  --color-warning: #FFD700;
  --color-warning-container: #4D3D00;
  --color-success: #7ED321;
  
  /* Tekst */
  --color-on-background: #E6E1E5;
  --color-on-surface: #E6E1E5;
  --color-on-surface-variant: #CAC4CF;
  --color-outline: #938F99;
  --color-outline-variant: #49454F;
  
  /* Glukoza specifično */
  --glucose-safe: #7ED321;
  --glucose-warning: #FFD700;
  --glucose-danger: #FF4444;
}
```

## Tipografija

```css
:root {
  /* Font family */
  --font-family: 'Roboto Flex', sans-serif;
  
  /* Display */
  --type-display-large: 500 40px/44px var(--font-family);
  --type-display-medium: 400 34px/40px var(--font-family);
  --type-display-small: 400 30px/36px var(--font-family);
  
  /* Title */
  --type-title-large: 500 22px/28px var(--font-family);
  --type-title-medium: 500 18px/24px var(--font-family);
  --type-title-small: 500 14px/20px var(--font-family);
  
  /* Label */
  --type-label-large: 500 16px/20px var(--font-family);
  --type-label-medium: 500 14px/18px var(--font-family);
  --type-label-small: 500 12px/16px var(--font-family);
  
  /* Body */
  --type-body-large: 400 16px/22px var(--font-family);
  --type-body-medium: 400 14px/20px var(--font-family);
  --type-body-small: 400 12px/16px var(--font-family);
  
  /* Numeral */
  --type-numeral-large: 500 50px/56px var(--font-family);
  --type-numeral-medium: 500 34px/40px var(--font-family);
  --type-numeral-small: 500 24px/28px var(--font-family);
  
  /* Arc */
  --type-arc-medium: 500 12px/16px var(--font-family);
  --type-arc-small: 500 10px/14px var(--font-family);
}
```

## Spacing

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
}
```

## Shapes

```css
:root {
  --shape-none: 0px;
  --shape-extra-small: 4px;
  --shape-small: 8px;
  --shape-medium: 12px;
  --shape-large: 16px;
  --shape-extra-large: 24px;
  --shape-full: 9999px;
}
```

## Margins

```css
:root {
  /* Postotne - za vanjske margine */
  --margin-outer: 5.2%;
  --margin-inner: 4%;
  --margin-content: 6.3%;
}
```

## Touch Targets

```css
:root {
  --touch-target-min: 48px;
  --touch-target-comfortable: 52px;
  --button-height-standard: 52px;
  --button-height-compact: 40px;
}
```

## Motion

```css
:root {
  /* Easing */
  --motion-spatial: cubic-bezier(0.2, 0.0, 0.0, 1.0);
  --motion-effects: cubic-bezier(0.3, 0.0, 0.0, 1.0);
  
  /* Durations (30% kraće od mobile) */
  --duration-short: 140ms;
  --duration-medium: 210ms;
  --duration-long: 350ms;
}
```

## Glukoza Pragovi

```javascript
const GLUCOSE_CONFIG = {
  thresholds: {
    DANGER_LOW: 4.0,
    WARNING_LOW: 4.5,
    SAFE_LOW: 4.5,
    SAFE_HIGH: 9.0,
    WARNING_HIGH: 9.0,
    DANGER_HIGH: 10.0
  },
  display: {
    MIN_VALUE: 2.0,
    MAX_VALUE: 15.0,
    MIN_SCALE: 0.5,
    MAX_SCALE: 1.3
  }
};
```

## Screen Dimensions

```css
:root {
  --watch-size: 252px;
  --watch-center: 126px;
  --watch-radius: 126px;
  
  /* Breakpoint za veće ekrane */
  --breakpoint-large: 225px;
}
```
