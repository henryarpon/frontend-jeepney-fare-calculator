import { TestBed } from '@angular/core/testing';

import { themeStorageKey, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let systemPrefersDark: boolean;

  beforeEach(() => {
    systemPrefersDark = false;
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    // jsdom has no matchMedia, so stand in for the device's colour-scheme setting.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' && systemPrefersDark,
      addEventListener: () => undefined,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createService(): ThemeService {
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return service;
  }

  it('follows the device when nothing has been chosen', () => {
    systemPrefersDark = true;

    const service = createService();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('starts light when the device has no dark preference', () => {
    const service = createService();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('switches theme and remembers the choice on this device', () => {
    const service = createService();

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(themeStorageKey)).toBe('dark');
  });

  it('uses the remembered choice over the device setting', () => {
    systemPrefersDark = true;
    localStorage.setItem(themeStorageKey, 'light');

    const service = createService();

    expect(service.theme()).toBe('light');
  });

  it('ignores a stored value that is not a theme', () => {
    systemPrefersDark = true;
    localStorage.setItem(themeStorageKey, 'purple');

    const service = createService();

    expect(service.theme()).toBe('dark');
  });

  it('still switches when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = createService();

    service.toggle();
    TestBed.tick();

    expect(service.theme()).toBe('dark');
  });
});
