---
name: sweetie-design-system
description: Material 3 Expressive design system for Sweetie Wear OS smartwatch app. Use this skill when working on ANY Sweetie component, page, animation, styling, or layout. Triggers include creating UI components, implementing animations, setting colors, typography, spacing, shapes, or any visual/interaction design work for the Sweetie diabetes management watch app.
---

# Sweetie Design System

Ovaj skill definira Material 3 Expressive smjernice za Sweetie Wear OS aplikaciju za dijabetičare.

## Ključna Pravila (UVIJEK slijedi)

### 1. Embrace Round
- Svi elementi moraju poštovati **kružni oblik** sata (252×252px)
- Gumbi na dnu koriste **edge-hugging** oblik (zakrivljeni donji rub)
- Arc text za vrijeme (vrh) i vrijednosti (dno)

### 2. Pozadina je UVIJEK Crna
```css
background: #000000;  /* Obavezno za OLED */
```

### 3. Touch Targets
```css
min-width: 48px;
min-height: 48px;
```

### 4. Spring Animacije (ne duration-based)
```css
/* Spatial (position, size) */
transition: transform 210ms cubic-bezier(0.2, 0.0, 0.0, 1.0);

/* Effects (color, opacity) - bez overshoot */
transition: opacity 210ms cubic-bezier(0.3, 0.0, 0.0, 1.0);
```

### 5. Margine kao Postoci
```css
margin: 5.2%;  /* Vanjske margine */
padding: 4%;   /* Unutarnje margine */
```

## Quick Reference

### Boje
| Token | Vrijednost | Korištenje |
|-------|-----------|------------|
| `--color-background` | #000000 | Pozadina (uvijek) |
| `--color-primary` | #7ED321 | Akcije, glukoza safe |
| `--color-warning` | #FFD700 | Upozorenje |
| `--color-error` | #FF4444 | Greška, danger |
| `--color-surface` | #1C1C1E | Kartice |
| `--color-on-surface` | #E6E1E5 | Tekst na surface |

### Glukoza Boje
| Stanje | Boja | Raspon (mmol/L) |
|--------|------|-----------------|
| Safe | #7ED321 | 4.5 - 9.0 |
| Warning | #FFD700 | 4.0-4.5 ili 9.0-10.0 |
| Danger | #FF4444 | <4.0 ili >10.0 |

### Tipografija (Roboto Flex)
| Token | Size/Weight | Korištenje |
|-------|-------------|------------|
| Numeral Large | 50px/500 | Glavna glukoza |
| Display Large | 40px/400 | Hero info |
| Title Large | 22px/500 | Naslovi |
| Label Large | 16px/500 | Gumbi |
| Body Medium | 14px/400 | Tekst |
| Arc Medium | 12px/500 | Vrijeme, curved labels |

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
```

### Shapes
```css
--shape-small: 8px;
--shape-medium: 12px;
--shape-large: 16px;
--shape-full: 9999px;  /* Pill/circle */
```

## Detaljne Reference

Za detaljne specifikacije, konzultiraj:
- **[references/tokens.md](references/tokens.md)** - Sve CSS varijable i tokeni
- **[references/components.md](references/components.md)** - Komponente s primjerima koda
- **[references/animations.md](references/animations.md)** - Motion system i spring parametri

## Layout Pattern (3-Slot)

```
┌────────────────────────┐
│      ╭─ TIME ─╮        │  ← Arc text
│     ╱          ╲   •   │  ← Page dots
│    │  [TITLE]   │  •   │
│    │            │  ◉   │
│    │   MAIN     │      │
│    │  CONTENT   │      │
│    │            │      │
│     ╲ [ACTION] ╱       │  ← Edge-hugging btn
│      ╰────────╯        │
└────────────────────────┘
```

## Checklist za Svaku Komponentu

- [ ] Crna pozadina
- [ ] Touch target ≥48px
- [ ] Spring animacija
- [ ] Boje iz tokena
- [ ] Font iz type scale
- [ ] Postotne margine
- [ ] Embraces round form
