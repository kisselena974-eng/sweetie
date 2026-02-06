# Page 3: Insulin & Sensor Tracking Screen — Implementation Spec

## Overview

This is the third page (screen) of the Sweetie smartwatch app, accessed by swiping right from the home screen. It displays **insulin tracking** and **sensor status** using an analog clock metaphor with three concentric circles. The display is 252×252px, black background, centered at (126, 126).

Reference images are provided in `/mnt/user-data/uploads/home3-31.png` through `home3-36.png`.

---

## Layout Structure

The screen has these layers, from outside in:

### 1. Time Display (top, curved along the navigation arc)
- Same as other pages — current time displayed on the top arc of the nav circle.

### 2. Page Dots (right side)
- Three dots on the right edge, same as other pages. The **third dot** (bottom) is active/white on this screen.

### 3. Info Button (left side)
- A circular button with an "**i**" icon, positioned on the left edge.
- **Toggle behavior**: tap to turn info mode ON/OFF.
- **OFF state**: the "i" text is white, no background (or very subtle).
- **ON state**: the button gets a gray/dark circular background, "i" remains visible.
- When info is ON, descriptive text labels appear next to each element explaining what it represents (e.g., "brzi" = fast insulin, "spori" = slow insulin, "trajanje senzora" = sensor duration). See image `home3-31.png` for the info-ON state with labels.
- When info is OFF, labels disappear. See image `home3-32.png`.

### 4. Three Concentric Circles + Clock Hand (main content area)

All three circles share the **same center point** (126, 126) and have **equal spacing** between their radii. For example, if the spacing is 28px:
- **Outer circle** (fast insulin): radius ≈ 95px
- **Middle circle** (slow insulin): radius ≈ 67px  
- **Inner circle** (sensor): radius ≈ 39px

The circles are thin strokes (~1px), color: rgba(255, 255, 255, 0.3) — subtle gray.

### 5. Clock Hand
- A straight white line from the **center dot** (126, 126) extending outward past the outer circle.
- It rotates like an **analog clock hour hand**: 12:00 = pointing straight up (0°), 3:00 = pointing right (90°), 6:00 = pointing down (180°), 9:00 = pointing left (270°).
- The angle is: `(hours % 12 + minutes / 60) * 30` degrees, where 0° = 12 o'clock.
- The **center dot** is a white filled circle (~6px diameter) at the exact center.

---

## Circle Details

### A. Outer Circle — Fast-Acting Insulin ("brzi inzulin")

This circle tracks **fast-acting insulin** doses.

- When a fast insulin dose is logged, a **white dot** (~6px diameter, same size as all other dots) appears on the outer circle at the **clock position corresponding to the time the dose was taken**.
  - Example: dose taken at 12:00 → dot at the top (12 o'clock position). Dose at 3:00 → dot at the right (3 o'clock).
- **Duration trail**: From the dot, a **white line/arc follows the circle path clockwise**, representing how long the insulin is still active in the body. Fast insulin lasts approximately **3-5 hours**.
  - The trail starts fully opaque white at the dot and **fades to transparent** along its length (gradient fade).
  - As time passes, the trail gets shorter (the faded end recedes toward the dot) until it disappears entirely when the insulin is no longer active.
- Multiple doses can be shown simultaneously as separate dots with their own trails.

### B. Middle Circle — Long-Acting Insulin ("spori inzulin")

This circle tracks **long-acting (basal) insulin**.

- Same dot mechanic as the outer circle: a **white dot** appears at the clock position when the dose was taken.
- Long-acting insulin lasts much longer (~**10-24 hours** depending on the person), so the **fading trail is much longer** and fades more slowly.
- It is taken roughly every 10-24 hours (varies per person).

### C. Inner Circle — Sensor Duration ("trajanje senzora")

This is **not** a smooth circle. Instead, it consists of **14 small dashes/ticks** arranged in a circle, representing the 14-day lifespan of a CGM sensor.

- Each tick represents **1 day** of sensor life.
- The ticks are evenly spaced around the circle (360° / 14 ≈ 25.7° apart).
- **Color logic**:
  - Days remaining > 1: ticks are **white**
  - Last day (1 day remaining): that tick is **red** (#FF4444) as a warning
  - Days already expired/used: ticks are **dark/invisible** (same as background or very faint)
- Example: New sensor (day 1) → all 14 ticks white. Sensor on day 10 → 4 ticks white, 10 ticks dark. Sensor on last day → 1 tick red, 13 ticks dark.

---

## Alert System — Red Warning Dot

A **red circle with a white exclamation mark** ("!") appears in specific alert situations:

1. **Insulin reminder**: When it's time to take long-acting insulin (e.g., overdue). The red dot appears near the middle circle / clock hand area. When info mode is ON, a tooltip label appears: "uzeti cjelodnevni inzulin" (take daily insulin). See images `home3-33.png` and `home3-34.png`.

2. **Sensor expiry warning**: When the sensor has only 1 day left. The red dot appears near the inner circle area. When info mode is ON, a tooltip: "senzor ističe za 1 dan" (sensor expires in 1 day). See images `home3-35.png` and `home3-36.png`.

The red alert dot is approximately 14-16px diameter, red fill (#FF4444 or similar), with a small white "!" in the center. A thin **dotted line** connects the alert dot to its tooltip text when info mode is active.

---

## Info Mode Labels (when info button is toggled ON)

From image `home3-31.png`, the labels are:
- **"brzi"** — points to the outer circle (fast insulin) — positioned bottom-left area
- **"spori"** — points to the middle circle (slow insulin) — positioned bottom-right area  
- **"trajanje senzora"** — points to the inner dashed circle — positioned bottom-center

Each label has a thin **dotted leader line** connecting it to the element it describes. Text is white, small font size (~10-11px), font: Roboto Flex.

---

## Interaction Summary

| Element | Action | Result |
|---------|--------|--------|
| Info button ("i") | Tap | Toggle info labels ON/OFF |
| Info ON | — | Show "brzi", "spori", "trajanje senzora" labels with dotted lines; show alert tooltips if alerts are active |
| Info OFF | — | Hide all labels and tooltips |

---

## Data Model (for prototype/demo)

For the prototype, use mock data that can be configured:

```javascript
const trackingData = {
  // Fast insulin doses: array of { time: "HH:MM", durationHours: 4 }
  fastInsulin: [
    { time: "08:30", durationHours: 4 },
    { time: "12:00", durationHours: 4 }
  ],
  
  // Long-acting insulin: { time: "HH:MM", durationHours: 22 }
  slowInsulin: {
    time: "22:00",
    durationHours: 22
  },
  
  // Sensor: days remaining out of 14
  sensorDaysRemaining: 5,
  
  // Alerts
  alerts: {
    insulinReminder: false,  // true = show red dot for insulin
    sensorWarning: true      // auto-calculated from sensorDaysRemaining <= 1
  }
};
```

---

## Visual Style Notes

- **Background**: #000000 (pure black)
- **Circle strokes**: ~1px, rgba(255, 255, 255, 0.25-0.3)
- **Dots**: white (#FFFFFF), ~6px diameter, all same size
- **Clock hand**: white line, ~1.5-2px width, extends from center past outer circle
- **Center dot**: white, ~6px diameter
- **Sensor ticks**: small dashes (~6-8px long), ~1.5px stroke
- **Red alert**: #FF4444 or similar red, ~14px circle with white "!" 
- **Font**: Roboto Flex, white
- **Info labels**: ~10-11px, white, with dotted leader lines (~1px, white, dotted)
- **All elements are SVG** for crisp rendering at watch resolution

---

## File Structure Suggestion

Create the tracking screen as a component similar to how `blob.js` handles the glucose blob:
- `js/components/tracking.js` — main tracking clock component class
- The screen markup goes inside `<div class="screen" data-screen="tracking">` in `index.html`
- CSS can go in `styles/tracking.css` or within the main stylesheet
