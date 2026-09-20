# AI-native Meetup Moscow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a publication-ready responsive landing page for the 7 November 2026 AI-native meetup with a Yandex map and configurable Timepad checkout.

**Architecture:** A static page uses semantic HTML for content, one CSS file for the full visual system, and one ES module for navigation, notices, and Timepad widget loading. The Timepad event URL is the only future configuration value; the script extracts the numeric event ID and otherwise keeps the site in an explicit “registration opens soon” state.

**Tech Stack:** HTML5, CSS3, browser JavaScript modules, Node.js built-in test runner, official Timepad registration widget, Yandex Maps iframe

**Spec:** `docs/superpowers/specs/2026-09-20-ai-native-meetup-landing-design.md`

## Global Constraints

- No frontend framework, package dependency, bundler, or backend.
- Event date is 7 November 2026; guest arrival is 12:00 and opening is 12:30.
- Ticket price is 2,000 ₽.
- The site does not store personal or payment data.
- All registration controls use the single Timepad event URL configured in `script.js`.
- The page remains readable without JavaScript and supports reduced motion and keyboard navigation.
- Use the supplied speaker images without altering their source files.

---

### Task 1: Semantic Page and Content Contract

**Files:**
- Create: `index.html`
- Create: `assets/brand-mark.svg`
- Create: `assets/hero-moscow.webp`
- Create: `tests/site.test.mjs`

**Interfaces:**
- Consumes: `Глеб спикер.jpg`, `Роман спикер.jpg`, and the approved design spec.
- Produces: section IDs `event`, `speakers`, `program`, `registration`, and `venue`; every ticket control has class `js-timepad`; the page loads `styles.css` and `script.js`.

- [ ] **Step 1: Generate the hero image**

Create `assets/hero-moscow.webp` as a wide, photorealistic but softly atmospheric Moscow panorama: Kremlin and river at pale winter dawn, cool blue-white palette, subtle warm window light, clear negative space on the left for dark text, architecture concentrated in the center and right, no people, no lettering, no logos, 16:9.

- [ ] **Step 2: Write the failing content contract**

```js
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('contains every required section and registration hooks', () => {
  for (const id of ['event', 'speakers', 'program', 'registration', 'venue']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /class=["'][^"']*js-timepad/);
});

test('contains confirmed event facts', () => {
  for (const text of ['7 ноября 2026', '12:30', '2 000 ₽', 'Каланчевская улица, 17']) {
    assert.ok(html.includes(text), `missing: ${text}`);
  }
});

test('uses the supplied speaker photos and Yandex map', () => {
  assert.ok(html.includes('Глеб спикер.jpg'));
  assert.ok(html.includes('Роман спикер.jpg'));
  assert.match(html, /yandex\.ru\/map-widget/);
});
```

- [ ] **Step 3: Run the contract and confirm failure**

Run: `node --test tests/site.test.mjs`

Expected: FAIL because `index.html` does not exist.

- [ ] **Step 4: Build the semantic page**

Create `index.html` with Russian metadata, Open Graph metadata, a skip link, sticky header, hero, speaker cards, complete schedule, benefit strip, registration summary, venue details, Yandex iframe, route link, toast live region, and footer. Use inline SVG icons with `aria-hidden="true"`; give every functional control an accessible name.

The schedule must contain these exact ranges:

```text
12:00 — Сбор гостей
12:30–12:40 — Открытие
12:40–13:30 — Как меняется работа IT-команды в эпоху AI-native
13:30–14:30 — Обзор AI-инструментов: SOTA-модели, harness, агенты, RAG, MCP и Skills
14:30–15:05 — Кофе-брейк
15:05–15:50 — Как не надо делать B2B SaaS: ошибки на примере реального проекта
15:50–16:20 — Разбор задач участников и открытый микрофон
16:20–16:30 — Завершение
16:30–17:20 — Нетворкинг и свободное общение со спикерами
```

- [ ] **Step 5: Run the contract and confirm success**

Run: `node --test tests/site.test.mjs`

Expected: all content contract tests PASS.

- [ ] **Step 6: Commit the semantic page**

```bash
git add index.html assets/brand-mark.svg assets/hero-moscow.webp tests/site.test.mjs
git commit -m "feat: add meetup landing content"
```

---

### Task 2: Responsive Visual System

**Files:**
- Create: `styles.css`
- Modify: `tests/site.test.mjs`

**Interfaces:**
- Consumes: semantic classes and section IDs from `index.html`.
- Produces: desktop, tablet, and mobile layouts; visible keyboard focus; reduced-motion behavior; speaker image crops; extra venue-to-footer spacing.

- [ ] **Step 1: Extend the contract for accessibility CSS**

```js
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

test('includes responsive and accessibility states', () => {
  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /--color-accent:/);
});
```

- [ ] **Step 2: Run the contract and confirm failure**

Run: `node --test tests/site.test.mjs`

Expected: FAIL because `styles.css` does not exist.

- [ ] **Step 3: Implement the visual system**

Define CSS custom properties for palette, spacing, radii, shadows, and content width. Build the desktop layout at a maximum width near 1180px, collapse two-column cards below 900px, and use a single column below 640px. Apply the hero image behind a pale gradient, crop both speaker portraits with `object-fit: cover`, keep the Roman portrait above its damaged lower pixels, and add at least 96px between the venue content and footer on desktop and 64px on mobile.

Use a Cyrillic-capable display/body font with a local fallback, stagger only the initial hero reveal, disable nonessential motion under `prefers-reduced-motion: reduce`, and make all touch targets at least 44px high.

- [ ] **Step 4: Run the contract and confirm success**

Run: `node --test tests/site.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the visual system**

```bash
git add styles.css tests/site.test.mjs
git commit -m "feat: style responsive meetup landing"
```

---

### Task 3: Navigation and Timepad Registration

**Files:**
- Create: `script.js`
- Create: `tests/timepad.test.mjs`

**Interfaces:**
- Consumes: `.js-timepad`, `[data-menu-button]`, `[data-site-nav]`, and `[data-toast]` elements from `index.html`.
- Produces: `extractTimepadEventId(url: string): string`, `getRegistrationMode(url: string): 'live' | 'pending'`, mobile navigation behavior, registration notice behavior, and Timepad widget injection.

- [ ] **Step 1: Write the failing Timepad tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTimepadEventId, getRegistrationMode } from '../script.js';

test('extracts an event id from an organization URL', () => {
  assert.equal(
    extractTimepadEventId('https://example.timepad.ru/event/3216549/'),
    '3216549',
  );
});

test('rejects an empty or malformed event URL', () => {
  assert.equal(extractTimepadEventId(''), '');
  assert.equal(extractTimepadEventId('https://timepad.ru/events/abc/'), '');
  assert.equal(getRegistrationMode(''), 'pending');
});

test('marks a valid event URL live', () => {
  assert.equal(getRegistrationMode('https://org.timepad.ru/event/1234567/'), 'live');
});
```

- [ ] **Step 2: Run the tests and confirm failure**

Run: `node --test tests/timepad.test.mjs`

Expected: FAIL because `script.js` does not exist.

- [ ] **Step 3: Implement the pure Timepad helpers**

```js
export const TIMEPAD_EVENT_URL = '';

export function extractTimepadEventId(url) {
  const match = String(url).trim().match(/^https:\/\/[a-z0-9-]+\.timepad\.ru\/event\/(\d+)\/?(?:[?#].*)?$/i);
  return match?.[1] ?? '';
}

export function getRegistrationMode(url) {
  return extractTimepadEventId(url) ? 'live' : 'pending';
}
```

- [ ] **Step 4: Add browser initialization**

When the URL is empty, intercept `.js-timepad` clicks and display the accessible toast «Регистрация скоро откроется». When it is valid, set each CTA fallback `href` to the Timepad event URL and inject the official loader once with these settings:

```js
{
  event: { id: eventId },
  hidePreloading: true,
  display: 'popup',
  popup: { triggerSelector: '.js-timepad' },
  locale: 'ru',
  utmForward: true,
}
```

Also implement mobile menu open/close state, Escape handling, link-triggered close, and the current year in the footer. Run browser initialization only when `document` exists so Node can import the pure helpers.

- [ ] **Step 5: Run all tests and confirm success**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the interactions**

```bash
git add script.js tests/timepad.test.mjs
git commit -m "feat: integrate Timepad registration"
```

---

### Task 4: Browser Verification and Handoff

**Files:**
- Create: `README.md`
- Modify: `index.html`, `styles.css`, or `script.js` only for defects found during verification.

**Interfaces:**
- Consumes: the complete static site.
- Produces: verified desktop/mobile behavior and one-step Timepad configuration instructions.

- [ ] **Step 1: Add concise operating instructions**

Document these commands and the single configuration edit:

```text
python -m http.server 4173
Open http://localhost:4173/
After creating the Timepad event, paste its full URL into TIMEPAD_EVENT_URL in script.js.
```

- [ ] **Step 2: Run automated checks**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

- [ ] **Step 3: Run a local server and inspect desktop layout**

Run: `python -m http.server 4173`

At 1440×1000, verify the hero, both speaker cards, full schedule, registration summary, working Yandex iframe, route link, enlarged venue-to-footer gap, no console errors, and no horizontal overflow.

- [ ] **Step 4: Inspect mobile layout and keyboard behavior**

At 390×844, verify the menu button, single-column cards, readable schedule, 44px touch targets, Timepad pending notice, keyboard focus order, Escape menu close, and no horizontal overflow.

- [ ] **Step 5: Validate external destinations**

Confirm both Stepik links, `https://glebteach.ru/`, `https://photoplay.ru/`, and the Yandex route link open the intended destinations. Do not submit payment.

- [ ] **Step 6: Commit the verified handoff**

```bash
git add README.md index.html styles.css script.js
git commit -m "docs: add meetup site handoff"
```

