import test from 'node:test';
import assert from 'node:assert/strict';
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

test('configures the rounded Timepad popup without an active marketing opt-in', async () => {
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
    await import(`../script.js?native-widget=${Date.now()}`);
    const config = Function(`return ${widgetScript.textContent.trim()}`)();

    assert.equal(config.hidePreloading, false);
    assert.deepEqual(config.popup, {
      triggerSelector: '.js-timepad',
      width: 680,
      autoShrink: true,
      minViewport: 320,
      addCss: {
        borderRadius: '18px',
        overflow: 'hidden',
      },
    });
    assert.deepEqual(config.loadCSS, [
      'https://example.github.io/ai-native-meetup/timepad-layout.css?v=5',
    ]);
    assert.deepEqual(config.bindEvents, { postRepaint: 'refineTimepadForm' });

    const subscription = { checked: true, hidden: false };
    window.refineTimepadForm.call({
      $$(selector) {
        assert.equal(selector, 'input[name="subscribe_digest"]');
        return {
          prop(name, value) {
            assert.equal(name, 'checked');
            subscription.checked = value;
            return this;
          },
          closest(selector) {
            assert.equal(selector, '.b-registration__check');
            return {
              hide() {
                subscription.hidden = true;
              },
            };
          },
        };
      },
    });
    assert.deepEqual(subscription, { checked: false, hidden: true });

    let prevented = false;
    registrationClickHandler({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(replayedClicks, 0);

    window.TWF2 = { getWidget: () => ({ isReady: true }) };
    queuedCallback();
    assert.equal(replayedClicks, 1);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});
