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
