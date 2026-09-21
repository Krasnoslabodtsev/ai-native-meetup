import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { TIMEPAD_EVENT_URL, extractTimepadEventId, getRegistrationMode } from '../script.js';

test('uses the published meetup for live registration', () => {
  assert.equal(TIMEPAD_EVENT_URL, 'https://ai-v-dele.timepad.ru/event/4211218/');
  assert.equal(getRegistrationMode(TIMEPAD_EVENT_URL), 'live');
});

test('extracts an event id from an organization URL', () => {
  assert.equal(
    extractTimepadEventId('https://example.timepad.ru/event/3216549/'),
    '3216549',
  );
});

test('accepts Timepad links with query parameters', () => {
  assert.equal(
    extractTimepadEventId('https://example.timepad.ru/event/3216549/?utm_source=site'),
    '3216549',
  );
});

test('rejects an empty or malformed event URL', () => {
  assert.equal(extractTimepadEventId(''), '');
  assert.equal(extractTimepadEventId('https://timepad.ru/events/abc/'), '');
  assert.equal(extractTimepadEventId('https://evil.example/event/1234567/'), '');
  assert.equal(getRegistrationMode(''), 'pending');
});

test('marks a valid event URL live', () => {
  assert.equal(getRegistrationMode('https://org.timepad.ru/event/1234567/'), 'live');
});

test('loads the branded stylesheet into the live Timepad popup', async () => {
  const links = [{ href: '', addEventListener() {} }];
  let widgetScript;

  globalThis.window = {
    clearTimeout() {},
    setTimeout() {},
  };
  globalThis.document = {
    baseURI: 'https://example.github.io/ai-native-meetup/',
    documentElement: { dataset: {} },
    head: {
      append(element) {
        widgetScript = element;
      },
    },
    createElement() {
      return {
        dataset: {},
        addEventListener() {},
      };
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      return selector === '.js-timepad' ? links : [];
    },
  };

  try {
    await import(`../script.js?styled-widget=${Date.now()}`);
    const config = Function(`return ${widgetScript.textContent.trim()}`)();

    assert.deepEqual(config.loadCSS, [
      'https://example.github.io/ai-native-meetup/timepad-widget.css',
    ]);
    assert.equal(config.popup.width, 640);
    assert.equal(config.popup.padding, 0);
    assert.equal(config.popup.margins, undefined);
    assert.equal(config.popup.outerClose, false);
    await assert.doesNotReject(access(new URL('../timepad-widget.css', import.meta.url)));
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
