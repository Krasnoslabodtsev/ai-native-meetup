import test from 'node:test';
import assert from 'node:assert/strict';
import { extractTimepadEventId, getRegistrationMode } from '../script.js';

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
