export const TIMEPAD_EVENT_URL = 'https://ai-v-dele.timepad.ru/event/4211218/';

export function extractTimepadEventId(url) {
  const match = String(url)
    .trim()
    .match(/^https:\/\/(?:[a-z0-9-]+\.)?timepad\.ru\/event\/(\d+)\/?(?:[?#].*)?$/i);

  return match?.[1] ?? '';
}

export function getRegistrationMode(url) {
  return extractTimepadEventId(url) ? 'live' : 'pending';
}

function initNavigation() {
  const button = document.querySelector('[data-menu-button]');
  const navigation = document.querySelector('[data-site-nav]');

  if (!button || !navigation) return;

  const closeMenu = () => {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Открыть меню');
    navigation.removeAttribute('data-open');
  };

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    button.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
    navigation.toggleAttribute('data-open', !isOpen);
  });

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      button.focus();
    }
  });
}

function createToast() {
  const element = document.querySelector('[data-toast]');
  let timeoutId;

  return (message) => {
    if (!element) return;

    window.clearTimeout(timeoutId);
    element.textContent = message;
    element.hidden = false;
    element.dataset.visible = 'true';

    timeoutId = window.setTimeout(() => {
      element.hidden = true;
      element.removeAttribute('data-visible');
    }, 4200);
  };
}

function loadTimepadWidget(eventId, showToast) {
  if (document.querySelector('[data-timepad-widget-v2="event_register"]')) return;

  const config = {
    event: { id: eventId },
    hidePreloading: true,
    display: 'popup',
    popup: {
      triggerSelector: '.js-timepad',
      width: 640,
      padding: 0,
      autoShrink: true,
      minViewport: 320,
      outerClose: false,
      closeColor: '#10113d',
      addCss: {
        border: '1px solid rgba(95, 82, 255, 0.18)',
        borderRadius: '24px',
        boxShadow: '0 30px 100px rgba(16, 17, 61, 0.28)',
        overflow: 'hidden',
      },
    },
    loadCSS: [new URL('timepad-widget.css', document.baseURI).href],
    locale: 'ru',
    utmForward: true,
  };
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.defer = true;
  script.charset = 'UTF-8';
  script.dataset.timepadWidgetV2 = 'event_register';
  script.src = 'https://timepad.ru/js/tpwf/loader/min/loader.js';
  script.textContent = `(function () { return ${JSON.stringify(config)}; })();`;
  script.addEventListener('error', () => {
    showToast('Не удалось загрузить форму. Откроется страница события на Timepad.');
  });

  document.head.append(script);
}

function initRegistration() {
  const links = document.querySelectorAll('.js-timepad');
  const eventId = extractTimepadEventId(TIMEPAD_EVENT_URL);
  const mode = getRegistrationMode(TIMEPAD_EVENT_URL);
  const showToast = createToast();

  document.documentElement.dataset.registration = mode;

  if (mode === 'pending') {
    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        showToast('Регистрация скоро откроется.');
      });
    });
    return;
  }

  links.forEach((link) => {
    link.href = TIMEPAD_EVENT_URL;
  });
  loadTimepadWidget(eventId, showToast);
}

function initFooterYear() {
  const year = document.querySelector('[data-current-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}

if (typeof document !== 'undefined') {
  initNavigation();
  initRegistration();
  initFooterYear();
}
