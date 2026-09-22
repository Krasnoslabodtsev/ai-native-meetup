import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function getTagContent(tagName, attributeName, attributeValue) {
  const escapedValue = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = html.match(
    new RegExp(`<${tagName}\\b(?=[^>]*\\b${attributeName}=["']${escapedValue}["'])[^>]*>`, 'i'),
  )?.[0];

  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1];
}

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

test('exposes an absolute social preview and indexable canonical page', async () => {
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  const coverUrl = 'https://ai-native-meetup.ru/assets/timepad-cover-1920x1080.png';
  const cover = await readFile(new URL('../assets/timepad-cover-1920x1080.png', import.meta.url));

  assert.equal(canonical, 'https://ai-native-meetup.ru/');
  assert.equal(getTagContent('meta', 'property', 'og:url'), canonical);
  assert.equal(getTagContent('meta', 'property', 'og:image'), coverUrl);
  assert.equal(getTagContent('meta', 'property', 'og:image:width'), '1920');
  assert.equal(getTagContent('meta', 'property', 'og:image:height'), '1080');
  assert.equal(getTagContent('meta', 'name', 'twitter:card'), 'summary_large_image');
  assert.equal(getTagContent('meta', 'name', 'twitter:image'), coverUrl);
  assert.match(getTagContent('meta', 'name', 'robots') ?? '', /index,\s*follow/);
  assert.match(getTagContent('meta', 'name', 'robots') ?? '', /max-image-preview:large/);
  assert.equal(cover.readUInt32BE(16), 1920);
  assert.equal(cover.readUInt32BE(20), 1080);
});

test('describes the public event consistently to search crawlers', async () => {
  const canonical = 'https://ai-native-meetup.ru/';
  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
  const event = jsonLdBlocks.find((item) => item['@type'] === 'Event');
  const [robots, sitemap] = await Promise.all([
    readFile(new URL('../robots.txt', import.meta.url), 'utf8').catch(() => ''),
    readFile(new URL('../sitemap.xml', import.meta.url), 'utf8').catch(() => ''),
  ]);

  assert.ok(event);
  assert.equal(event.name, 'AI-native Meetup Moscow');
  assert.equal(event.startDate, '2026-11-07T12:30:00+03:00');
  assert.equal(event.endDate, '2026-11-07T17:20:00+03:00');
  assert.equal(event.location?.name, 'Photoplay');
  assert.equal(event.location?.address?.streetAddress, 'Каланчевская улица, 17, 1-й подъезд, 6-й этаж');
  assert.equal(event.offers?.url, 'https://ai-v-dele.timepad.ru/event/4211218/');
  assert.equal(event.offers?.price, 2000);
  assert.equal(event.offers?.priceCurrency, 'RUB');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, new RegExp(`^Sitemap: ${canonical}sitemap\\.xml$`, 'm'));
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
});

test('keeps local image references inside assets', async () => {
  const imageSources = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map((match) => match[1]);

  assert.ok(imageSources.length > 0);
  for (const source of imageSources) {
    assert.match(source, /^assets\//);
    await access(new URL(`../${source}`, import.meta.url));
  }
});

test('uses the Yandex map', () => {
  assert.match(html, /yandex\.ru\/map-widget/);
});

test('includes responsive and accessibility states', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media\s*\(max-width:/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /--color-accent:/);
});

test('versions the site stylesheet so popup chrome is refreshed', () => {
  assert.match(html, /href=["']styles\.css\?v=3["']/);
});

test('preloads the CSS hero image used for largest contentful paint', () => {
  assert.match(
    html,
    /<link\s+rel=["']preload["']\s+as=["']image["']\s+href=["']assets\/hero-moscow\.webp["'][^>]*fetchpriority=["']high["']/,
  );
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

test('shows only the personal site for Gleb while keeping Roman\'s Stepik link', () => {
  const glebCard = html.slice(html.indexOf('alt="Глеб Учитель"'), html.indexOf('</article>', html.indexOf('alt="Глеб Учитель"')));
  const romanCard = html.slice(html.indexOf('alt="Роман Краснослабодцев"'), html.indexOf('</article>', html.indexOf('alt="Роман Краснослабодцев"')));

  assert.ok(glebCard.includes('https://glebteach.ru/'));
  assert.ok(!glebCard.includes('stepik.org'));
  assert.ok(romanCard.includes('https://stepik.org/users/484739266/teach'));
});

test('prioritizes event topics and removes secondary sales details', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf('<section class="section speakers-section"'));
  const priceCard = html.slice(html.indexOf('<aside class="price-card"'), html.indexOf('</aside>', html.indexOf('<aside class="price-card"')));
  const benefits = html.slice(html.indexOf('<div class="benefit-strip"'), html.indexOf('</section>', html.indexOf('<div class="benefit-strip"')));

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
