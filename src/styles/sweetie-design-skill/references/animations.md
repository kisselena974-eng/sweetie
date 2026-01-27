# Animacije i Motion

Material 3 Expressive motion system za Sweetie.

## Osnovno Pravilo

**KORISTI SPRING ANIMACIJE, NE DURATION-BASED.**

M3 Expressive koristi fiziku (springs) umjesto fiksnih trajanja.

## Easing Funkcije

### Spatial (za poziciju, veličinu, rotaciju)
```css
--motion-spatial: cubic-bezier(0.2, 0.0, 0.0, 1.0);
```
- **Može imati overshoot** (bounce efekt)
- Koristi za: `transform`, `width`, `height`, `left`, `top`

### Effects (za boju, opacity)
```css
--motion-effects: cubic-bezier(0.3, 0.0, 0.0, 1.0);
```
- **BEZ overshoot**
- Koristi za: `background-color`, `color`, `opacity`, `border-color`

## Trajanja (30% kraće od mobile)

| Token | Wear OS | Mobile | Korištenje |
|-------|---------|--------|------------|
| `--duration-short` | 140ms | 200ms | Mali elementi (switch, checkbox) |
| `--duration-medium` | 210ms | 300ms | Srednji elementi (button, card) |
| `--duration-long` | 350ms | 500ms | Puni ekran (page transition) |

## Spring Parametri (za JS animacije)

```javascript
const SPRINGS = {
  // Expressive - više bounce-a (default)
  expressive: {
    stiffness: 300,
    damping: 20,
    mass: 1
  },
  
  // Standard - manje bounce-a
  standard: {
    stiffness: 400,
    damping: 30,
    mass: 1
  },
  
  // Fast - za male elemente
  fast: {
    stiffness: 500,
    damping: 25,
    mass: 0.8
  },
  
  // Slow - za page transitions
  slow: {
    stiffness: 200,
    damping: 20,
    mass: 1.2
  }
};
```

## Primjeri Animacija

### Button Press
```css
.button {
  transition: 
    transform var(--duration-short) var(--motion-spatial),
    background-color var(--duration-short) var(--motion-effects);
}

.button:active {
  transform: scale(0.95);
}
```

### Page Transition
```css
.page-enter {
  opacity: 0;
  transform: translateX(100%);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: 
    opacity var(--duration-medium) var(--motion-effects),
    transform var(--duration-medium) var(--motion-spatial);
}

.page-exit-active {
  opacity: 0;
  transform: translateX(-30%);
  transition: 
    opacity var(--duration-medium) var(--motion-effects),
    transform var(--duration-medium) var(--motion-spatial);
}
```

### Scroll Item Transform
```css
/* Elementi se smanjuju blizu rubova ekrana */
.scroll-item {
  transition: 
    transform var(--duration-short) var(--motion-spatial),
    opacity var(--duration-short) var(--motion-effects);
}

/* Dinamički postavi scale i opacity prema poziciji */
```

```javascript
function updateScrollItemTransforms(scrollY) {
  const items = document.querySelectorAll('.scroll-item');
  const centerY = 126; // Centar ekrana
  
  items.forEach(item => {
    const rect = item.getBoundingClientRect();
    const itemCenterY = rect.top + rect.height / 2;
    const distanceFromCenter = Math.abs(itemCenterY - centerY);
    const maxDistance = 100;
    
    const scale = Math.max(0.7, 1 - (distanceFromCenter / maxDistance) * 0.3);
    const opacity = Math.max(0.5, 1 - (distanceFromCenter / maxDistance) * 0.5);
    
    item.style.transform = `scale(${scale})`;
    item.style.opacity = opacity;
  });
}
```

### Glucose Blob Float
```css
@keyframes float {
  0%, 100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(10px, -15px);
  }
  50% {
    transform: translate(-5px, 10px);
  }
  75% {
    transform: translate(-15px, -5px);
  }
}

.glucose-blob {
  animation: float 8s ease-in-out infinite;
}
```

### Shape Morphing
```css
/* Krug → Squircle na hover */
.morphing-button {
  border-radius: 50%;
  transition: border-radius var(--duration-medium) var(--motion-spatial);
}

.morphing-button:hover {
  border-radius: 30%;
}
```

### Color Transition (Glucose)
```css
.glucose-value {
  transition: color var(--duration-medium) var(--motion-effects);
}

/* Klase za stanja */
.glucose-value.safe { color: var(--glucose-safe); }
.glucose-value.warning { color: var(--glucose-warning); }
.glucose-value.danger { color: var(--glucose-danger); }
```

### Trend Arrow Rotation
```css
.trend-arrow {
  transition: transform var(--duration-short) var(--motion-spatial);
}

/* Kutevi prema trendu */
.trend-arrow.rising-fast { transform: rotate(-45deg); }
.trend-arrow.rising { transform: rotate(-22deg); }
.trend-arrow.stable { transform: rotate(0deg); }
.trend-arrow.falling { transform: rotate(22deg); }
.trend-arrow.falling-fast { transform: rotate(45deg); }
```

## Reduced Motion

Uvijek poštuj korisničke postavke:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Swipe Gesture Animation

```javascript
function handleSwipe(direction, velocity) {
  const page = document.querySelector('.screen.active');
  const duration = Math.max(100, 300 - velocity * 50); // Brži swipe = kraća animacija
  
  if (direction === 'left') {
    page.style.transition = `transform ${duration}ms var(--motion-spatial)`;
    page.style.transform = 'translateX(-100%)';
  }
}
```

## Performance Tips

1. **Koristi `transform` i `opacity`** - GPU accelerated
2. **Izbjegavaj animacije na `width`, `height`, `margin`** - triggera layout
3. **Koristi `will-change` štedljivo** - samo za elemente koji će se animirati
4. **Grupiraj animacije** - manje reflow-a

```css
.animated-element {
  will-change: transform, opacity;
}
```
