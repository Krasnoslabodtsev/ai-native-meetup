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

function styleAiNativeTimepadForm() {
  const placeholders = {
    'input[name$="[mail]"]': 'example@mail.ru',
    'input[name$="[surname]"]': 'Иванов',
    'input[name$="[name]"]': 'Иван',
  };

  Object.entries(placeholders).forEach(([selector, placeholder]) => {
    this.$$(selector).attr('placeholder', placeholder);
  });
}

function isTimepadWidgetReady() {
  try {
    return Boolean(window.TWF2?.getWidget?.()?.isReady);
  } catch {
    return false;
  }
}

function openTimepadWhenReady(link, showToast) {
  if (link.dataset.timepadPending === 'true') return;

  link.dataset.timepadPending = 'true';
  showToast('Открываем форму регистрации…');
  let attempts = 0;

  const retry = () => {
    if (isTimepadWidgetReady()) {
      delete link.dataset.timepadPending;
      link.click();
      return;
    }

    attempts += 1;
    if (attempts >= 100) {
      delete link.dataset.timepadPending;
      window.location.assign(TIMEPAD_EVENT_URL);
      return;
    }

    window.setTimeout(retry, 50);
  };

  retry();
}

function loadTimepadWidget(eventId, showToast) {
  if (document.querySelector('[data-timepad-widget-v2="event_register"]')) return;

  window.styleAiNativeTimepadForm = styleAiNativeTimepadForm;
  const config = {
    event: { id: eventId },
    hidePreloading: false,
    display: 'popup',
    popup: {
      triggerSelector: '.js-timepad',
      width: 860,
      padding: 0,
      autoShrink: true,
      minViewport: 320,
      tintColor: 'rgba(13, 16, 34, 0.9)',
      outerClose: false,
      closeColor: '#30365d',
      closeCss: {
        top: '26px',
        right: '28px',
        height: '32px',
        fontSize: '40px',
        fontWeight: '300',
        lineHeight: '28px',
        opacity: '0.82',
      },
      addCss: {
        boxSizing: 'border-box',
        border: '1px solid rgba(229, 231, 243, 0.9)',
        borderRadius: '20px',
        boxShadow: '0 32px 100px rgba(6, 9, 24, 0.42)',
        overflow: 'hidden',
        transition: 'none',
      },
    },
    loadCSS: [new URL('timepad-widget.css?v=7', document.baseURI).href],
    bindEvents: { postRepaint: 'styleAiNativeTimepadForm' },
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
    link.addEventListener('click', (event) => {
      if (isTimepadWidgetReady()) return;

      event.preventDefault();
      openTimepadWhenReady(link, showToast);
    });
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
