import { access, readFile } from 'node:fs/promises';
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

test('uses the supplied speaker photos and Yandex map', async () => {
  assert.ok(html.includes('Глеб спикер.jpg'));
  assert.ok(html.includes('assets/roman-speaker.webp'));
  assert.ok(!html.includes('Роман спикер.jpg'));
  await access(new URL('../assets/roman-speaker.webp', import.meta.url));
  assert.match(html, /yandex\.ru\/map-widget/);
});

test('includes responsive and accessibility states', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /--color-accent:/);
});

test('opens the mobile navigation when the data-open attribute is present', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.site-nav\[data-open\]\s*\{/);
});

test('keeps registration calls to action restrained', () => {
  assert.equal(html.match(/js-timepad/g)?.length, 3);
});

test('does not use generic promotional filler', () => {
  for (const phrase of [
    'Честный разговор',
    'Без продаж со сцены',
    'Насыщенная программа',
    'живые кейсы',
    'Полная программа',
    'Больше,',
  ]) {
    assert.ok(!html.includes(phrase), `generic phrase remains: ${phrase}`);
  }
});

test('keeps supporting copy concise and links to the official Timepad policy', () => {
  for (const phrase of [
    'Оплата и билет — на стороне Timepad',
    'Опыт спикеров',
    'Глеб строит обучение для аналитиков',
    'Продажи откроются после публикации события',
    'Сайт площадки',
    'Персональные данные обрабатывает Timepad',
  ]) {
    assert.ok(!html.includes(phrase), `obsolete copy remains: ${phrase}`);
  }

  assert.match(html, /Наши\s*<br>\s*спикеры/);
  assert.ok(html.includes('https://timepad.ru/upload/docs/TimePad_PD_Polices.pdf'));

  const benefits = html.slice(html.indexOf('<div class="benefit-strip"'), html.indexOf('</section>', html.indexOf('<div class="benefit-strip"')));
  assert.ok(benefits.includes('Открытый микрофон'));
  assert.ok(!benefits.includes('Кофе-брейк'));
});

test('prioritizes event topics and removes secondary sales details', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf('<section class="section speakers-section"'));
  const priceCard = html.slice(html.indexOf('<aside class="price-card"'), html.indexOf('</aside>', html.indexOf('<aside class="price-card"')));
  const benefits = html.slice(html.indexOf('<div class="benefit-strip"'), html.indexOf('</section>', html.indexOf('<div class="benefit-strip"')));

  assert.ok(hero.includes('Что меняет AI'));
  assert.ok(!hero.includes('Три доклада'));
  assert.ok(!hero.includes('2 000 ₽'));
  assert.ok(!html.includes('Преподаватели —'));
  assert.ok(!priceCard.includes('<ul>'));
  assert.ok(!benefits.includes('Три доклада'));
  assert.ok(!html.includes('timeline-break'));
  assert.doesNotMatch(css, /\.timeline-break/);
});

test('gives the registration heading enough space and contains the map grid', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.registration-layout\s*\{[\s\S]*?grid-template-columns:\s*minmax\(380px,/);
  assert.match(css, /\.venue-layout\s*>\s*\*\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(css, /\.price-card h3\s*\{[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /\.hero-backdrop\s*\{[\s\S]*?transform:\s*scale\(1\.16\);/);
});
