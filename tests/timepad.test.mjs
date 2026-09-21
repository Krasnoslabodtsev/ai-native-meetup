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
  let queuedCallback;
  let registrationClickHandler;
  let replayedClicks = 0;
  const links = [{
    href: '',
    dataset: {},
    addEventListener(type, handler) {
      if (type === 'click') registrationClickHandler = handler;
    },
    click() {
      replayedClicks += 1;
    },
  }];
  let widgetScript;

  globalThis.window = {
    clearTimeout() {},
    setTimeout(callback) {
      queuedCallback = callback;
    },
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
      'https://example.github.io/ai-native-meetup/timepad-widget.css?v=7',
    ]);
    assert.equal(config.hidePreloading, false);
    assert.equal(config.popup.width, 860);
    assert.equal(config.popup.padding, 0);
    assert.equal(config.popup.margins, undefined);
    assert.equal(config.popup.outerClose, false);
    assert.equal(config.popup.tintColor, 'rgba(13, 16, 34, 0.9)');
    assert.equal(config.popup.closeCss.top, '26px');
    assert.equal(config.popup.closeCss.right, '28px');
    assert.equal(config.popup.addCss.boxSizing, 'border-box');
    assert.equal(config.popup.addCss.transition, 'none');
    assert.deepEqual(config.bindEvents, { postRepaint: 'styleAiNativeTimepadForm' });

    const placeholders = {};
    window.styleAiNativeTimepadForm.call({
      $$(selector) {
        return {
          attr(name, value) {
            placeholders[selector] = { name, value };
          },
        };
      },
    });
    assert.deepEqual(placeholders, {
      'input[name$="[mail]"]': { name: 'placeholder', value: 'example@mail.ru' },
      'input[name$="[surname]"]': { name: 'placeholder', value: 'Иванов' },
      'input[name$="[name]"]': { name: 'placeholder', value: 'Иван' },
    });

    let prevented = false;
    registrationClickHandler({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(replayedClicks, 0);

    window.TWF2 = { getWidget: () => ({ isReady: true }) };
    queuedCallback();
    assert.equal(replayedClicks, 1);

    await assert.doesNotReject(access(new URL('../timepad-widget.css', import.meta.url)));
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
