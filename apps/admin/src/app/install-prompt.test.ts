import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0';

function stubBrowser({ userAgent = ANDROID, standalone = false } = {}) {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints: 5 });
  vi.stubGlobal('matchMedia', () => ({ matches: standalone }));
}

function fakeOffer(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  return Object.assign(event, {
    prompt: vi.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  });
}

/** A fresh module per test: the offer it holds is the whole app's. */
async function load() {
  vi.resetModules();
  return import('./install-prompt');
}

describe('useInstallPrompt', () => {
  let target: EventTarget;

  beforeEach(() => {
    target = new EventTarget();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('holds back the browser offer and installs on request', async () => {
    stubBrowser();
    const { listenForInstallPrompt, useInstallPrompt } = await load();
    listenForInstallPrompt(target as Window);
    const { option, install } = useInstallPrompt();
    expect(option.value).toBe('none');

    const offer = fakeOffer('accepted');
    target.dispatchEvent(offer);
    expect(offer.defaultPrevented).toBe(true);
    expect(option.value).toBe('prompt');

    await install();
    expect(offer.prompt).toHaveBeenCalledOnce();
    expect(option.value).toBe('none');
  });

  it('uses each offer once, even when declined', async () => {
    stubBrowser();
    const { listenForInstallPrompt, useInstallPrompt } = await load();
    listenForInstallPrompt(target as Window);
    const { option, install } = useInstallPrompt();
    target.dispatchEvent(fakeOffer('dismissed'));
    await install();
    expect(option.value).toBe('none');
  });

  it('points an iPhone to the Share menu', async () => {
    stubBrowser({ userAgent: IPHONE });
    const { useInstallPrompt } = await load();
    expect(useInstallPrompt().option.value).toBe('share-menu');
  });

  it('offers nothing once opened as the installed app', async () => {
    stubBrowser({ userAgent: IPHONE, standalone: true });
    const { useInstallPrompt } = await load();
    expect(useInstallPrompt().option.value).toBe('none');
  });
});
